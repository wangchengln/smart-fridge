from fastapi import APIRouter, Depends, HTTPException, status, Path, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List
import json
from datetime import datetime

from ..schemas.recipe import (
    RecipeRecommendCreate, RecipeRecommendResponse,
    RecipeDetailResponse
)
from ..schemas.recipe_chat import (
    RecipeChatRequest,
    RecipeChatResponse,
    RecipeChatStatusResponse,
)
from ..schemas.recommendation import (
    RecommendationResponse, RecommendationItem,
    RecipeSelectionRequest, RecipeSelectionResponse,
    RecommendationStats, AdvancedRecommendationRequest,
    ClearRecommendationCacheResponse, TakeoutRedirectResponse,
)
from ..schemas.recipe_collection import (
    RecipeCookCreate,
    RecipeCookRecordResponse,
    RecipeCollectionResponse,
)
from ..crud.recipe_cook import (
    complete_recipe_collection,
    get_user_collection,
)
from ..crud.recipe_recommendation import get_latest_recommendation_for_recipe
from ..crud.recipe_base import get_recipe_by_id, get_recipes_by_preference
from ..crud.recipe_ingredient_rel import get_recipe_ingredients
from ..utils.fridge_inventory import build_user_ingredient_quantities
from ..crud.ingredient_base import get_ingredient_by_id
from ..crud.user import get_user_by_id
from ..crud.recipe_recommendation import (
    batch_create_recommendations,
    get_user_recommendations, get_recommendations_by_type,
    update_recommendation_selection, delete_expired_recommendations,
    delete_all_user_recommendations,
    get_recommendation_stats, attach_recommendation_ids,
)
from ..services.recommendation_service import recommendation_service
from ..services.takeout_redirect_service import takeout_redirect_service
from ..services.dietary_analysis_service import dietary_analysis_service
from ..services.deepseek_service import deepseek_service, DeepSeekServiceError
from ..schemas.dietary import RecipeDietaryAnalysisResponse
from ..utils.database import get_db

router = APIRouter(prefix="/api/recipe", tags=["菜谱管理"])


def _build_recommendation_db_record(user_id: int, item: dict) -> dict:
    legacy_type = item.get("legacy_recommendation_type") or item["recommendation_type"]
    return {
        "user_id": user_id,
        "recipe_id": item["recipe_id"],
        "recommendation_type": legacy_type,
        "match_score": item["match_score"],
        "existing_ingredients_ratio": item["existing_ingredients_ratio"],
        "missing_ingredients_count": item["missing_ingredients_count"],
        "missing_ingredients_detail": json.dumps(
            item["missing_ingredients_detail"], ensure_ascii=False
        ),
        "cooking_time": item["cooking_time"],
        "recommendation_reason": item["recommendation_reason"],
        "is_selected": False,
        "expires_at": datetime.utcnow().replace(hour=23, minute=59, second=59),
    }


def _persist_and_attach_recommendation_ids(db: Session, user_id: int, items: list):
    if not items:
        return
    created = batch_create_recommendations(
        db,
        [_build_recommendation_db_record(user_id, item) for item in items],
    )
    id_by_recipe = {rec.recipe_id: rec.id for rec in created}
    for item in items:
        item["recommendation_id"] = id_by_recipe.get(item["recipe_id"])


def _enrich_missing_ingredient_names(db: Session, missing_ingredients: list) -> list:
    """补全缺失食材名称"""
    enriched = []
    for item in missing_ingredients:
        row = dict(item)
        ingredient = get_ingredient_by_id(db, row.get("ingredient_id"))
        if ingredient:
            row["name"] = ingredient.name
        enriched.append(row)
    return enriched


def _build_recommendation_item(
    db: Session,
    user_id: int,
    recipe,
    user_ingredients: dict,
    *,
    has_time: bool = True,
    prefer_convenience: bool = False,
    prefer_premade: bool = False,
    prefer_takeout: bool = False,
    dietary_mode: str = "normal",
    family_count: int = 2,
) -> Optional[dict]:
    """计算匹配度、四象限分类并补全成本指标"""
    recipe_requirements = get_recipe_ingredients(db, recipe.id)
    if not recipe_requirements:
        return None

    match_score, existing_ratio, missing_ingredients = (
        recommendation_service.calculate_match_score(
            recipe, user_ingredients, recipe_requirements
        )
    )

    ingredients_for_dietary = []
    for req in recipe_requirements:
        ingredient = get_ingredient_by_id(db, req.ingredient_id)
        ingredients_for_dietary.append({
            "name": ingredient.name if ingredient else f"食材{req.ingredient_id}",
            "required_quantity": float(req.required_quantity),
        })

    base_servings = recipe.serving_size or 2
    match_score = dietary_analysis_service.adjust_match_score_for_mode(
        match_score,
        recipe.taste or "neutral",
        recipe.cooking_time,
        ingredients_for_dietary,
        dietary_mode,
        servings=family_count,
        base_servings=base_servings,
    )

    recommendation_type = recommendation_service.categorize_recommendation(
        len(missing_ingredients),
        existing_ratio,
        recipe.cooking_time,
        has_time=has_time,
        prefer_convenience=prefer_convenience,
        prefer_premade=prefer_premade,
        prefer_takeout=prefer_takeout,
    )

    # 爸妈模式：优先清淡、短时长
    if dietary_mode == "parents" and not prefer_takeout:
        if recipe.taste in ("麻辣",) and recommendation_type == "cook_self":
            match_score = max(0, match_score - 0.05)

    missing_ingredients = _enrich_missing_ingredient_names(db, missing_ingredients)

    recommendation_item = {
        "recipe_id": recipe.id,
        "name": recipe.name,
        "cooking_time": recipe.cooking_time,
        "taste": recipe.taste or "neutral",
        "image_url": recipe.image_url or "",
        "recommendation_type": recommendation_type,
        "prefer_takeout": prefer_takeout,
        "match_score": match_score,
        "existing_ingredients_ratio": existing_ratio,
        "missing_ingredients_count": len(missing_ingredients),
        "covered_ingredients_count": len(recipe_requirements) - len(missing_ingredients),
        "missing_ingredients_detail": missing_ingredients,
        "recommendation_reason": "",
        "purchase_analysis": None,
        "takeout_analysis": None,
        "premade_analysis": None,
        "cost_metrics": None,
    }

    return recommendation_service.enrich_recommendation_item(
        db, user_id, recommendation_item, taste=recipe.taste or "neutral"
    )


def _build_recipe_detail(db: Session, recipe_id: int) -> Optional[dict]:
    """构建菜谱详情数据（供详情接口与 AI 问答复用）"""
    recipe = get_recipe_by_id(db, recipe_id)
    if not recipe:
        return None

    recipe_ingredients = get_recipe_ingredients(db, recipe_id)
    ingredients_with_names = []
    for rel in recipe_ingredients:
        ingredient = get_ingredient_by_id(db, rel.ingredient_id)
        ingredient_name = ingredient.name if ingredient else f"食材{rel.ingredient_id}"
        ingredients_with_names.append({
            "ingredient_id": rel.ingredient_id,
            "name": ingredient_name,
            "required_quantity": float(rel.required_quantity),
            "is_required": rel.is_required,
        })

    steps = (
        [{"step": 1, "description": "准备食材"}, {"step": 2, "description": "开始烹饪"}]
        if not recipe.steps
        else json.loads(recipe.steps)
    )

    return {
        "recipe_id": recipe.id,
        "name": recipe.name,
        "cooking_time": recipe.cooking_time,
        "serving_size": recipe.serving_size or 2,
        "image_url": recipe.image_url or "",
        "steps": steps,
        "ingredients": ingredients_with_names,
    }


@router.get("/chat/status", response_model=RecipeChatStatusResponse)
def get_recipe_chat_status():
    """检查 DeepSeek AI 问答是否已配置（不返回 API Key）"""
    return {
        "configured": deepseek_service.is_configured(),
        "model": deepseek_service.model,
        "provider": "deepseek",
    }


@router.post("/chat", response_model=RecipeChatResponse)
def recipe_ai_chat(
    request: RecipeChatRequest,
    db: Session = Depends(get_db),
):
    """
    菜谱 AI 智能问答 — 接入 DeepSeek 大模型。
    需在 backend/.env 中配置 DEEPSEEK_API_KEY。
    """
    recipe_detail = _build_recipe_detail(db, request.recipe_id)
    if not recipe_detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="菜谱不存在",
        )

    system_prompt = deepseek_service.build_recipe_system_prompt(recipe_detail)
    history = [{"role": item.role, "content": item.content} for item in request.history]

    try:
        answer = deepseek_service.chat(
            system_prompt=system_prompt,
            question=request.question,
            history=history,
        )
    except DeepSeekServiceError as exc:
        status_code = exc.status_code or status.HTTP_502_BAD_GATEWAY
        raise HTTPException(status_code=status_code, detail=str(exc)) from exc

    return {
        "answer": answer,
        "model": deepseek_service.model,
        "recipe_id": recipe_detail["recipe_id"],
        "recipe_name": recipe_detail["name"],
    }


@router.post("/chat/stream")
def recipe_ai_chat_stream(
    request: RecipeChatRequest,
    db: Session = Depends(get_db),
):
    """
    菜谱 AI 智能问答（SSE 流式输出）。
    事件格式：data: {"delta": "..."} 或 {"done": true, ...} 或 {"error": "..."}
    """
    recipe_detail = _build_recipe_detail(db, request.recipe_id)
    if not recipe_detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="菜谱不存在",
        )

    system_prompt = deepseek_service.build_recipe_system_prompt(recipe_detail)
    history = [{"role": item.role, "content": item.content} for item in request.history]

    def event_stream():
        try:
            for delta in deepseek_service.chat_stream(
                system_prompt=system_prompt,
                question=request.question,
                history=history,
            ):
                yield f"data: {json.dumps({'delta': delta}, ensure_ascii=False)}\n\n"

            yield (
                "data: "
                + json.dumps(
                    {
                        "done": True,
                        "model": deepseek_service.model,
                        "recipe_id": recipe_detail["recipe_id"],
                        "recipe_name": recipe_detail["name"],
                    },
                    ensure_ascii=False,
                )
                + "\n\n"
            )
        except DeepSeekServiceError as exc:
            yield f"data: {json.dumps({'error': str(exc)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/recommend", response_model=RecommendationResponse)
def recommend_recipes(
    user_id: int = Query(..., gt=0, description="用户ID"),
    preference: Optional[str] = Query(None, description="口味偏好"),
    max_missing: Optional[int] = Query(None, ge=0, description="最大缺失食材数"),
    refresh: Optional[bool] = Query(False, description="是否刷新推荐"),
    has_time: Optional[bool] = Query(True, description="是否有时间下厨"),
    prefer_convenience: Optional[bool] = Query(False, description="是否倾向省事（闪购/预制）"),
    prefer_premade: Optional[bool] = Query(False, description="是否倾向新鲜预制"),
    prefer_takeout: Optional[bool] = Query(False, description="是否倾向外卖"),
    dietary_mode: Optional[str] = Query(None, description="饮食模式覆盖"),
    db: Session = Depends(get_db)
):
    """
    智能菜谱推荐接口 — 四象限决策模型
    Q1 食材充足 → 仅「自己做」
    Q2/Q3/Q4 食材不足 → 同一批菜谱并行出现在闪购/外卖/预制，供用户自选
    """
    delete_expired_recommendations(db, user_id)

    user = get_user_by_id(db, user_id)
    effective_mode = dietary_mode or (getattr(user, "dietary_mode", None) if user else None) or "normal"
    family_count = user.family_count if user else 2

    # 爸妈/减脂模式默认偏好清淡
    if not preference and effective_mode in ("parents", "fat_loss"):
        preference = "清淡"

    user_ingredients = build_user_ingredient_quantities(db, user_id)

    all_recipes = get_recipes_by_preference(db, taste=preference)
    recommendations = []

    for recipe in all_recipes:
        item = _build_recommendation_item(
            db,
            user_id,
            recipe,
            user_ingredients,
            has_time=has_time,
            prefer_convenience=prefer_convenience,
            prefer_premade=prefer_premade,
            prefer_takeout=prefer_takeout,
            dietary_mode=effective_mode,
            family_count=family_count,
        )
        if not item:
            continue

        if not prefer_takeout and max_missing is not None:
            if item["missing_ingredients_count"] > max_missing:
                continue

        recommendations.append(item)

    prefer_takeout_flag = bool(prefer_takeout)
    sorted_recommendations = recommendation_service.filter_and_sort_recommendations(
        recommendations
    )
    payload = recommendation_service.build_response_payload(
        sorted_recommendations,
        db,
        user_id,
        has_time=has_time if has_time is not None else True,
        prefer_takeout=prefer_takeout_flag,
    )

    all_returned = (
        payload["cook_self_recipes"]
        + payload["flash_purchase_recipes"]
        + payload["takeout_delivery_recipes"]
        + payload["premade_fresh_recipes"]
    )
    if refresh:
        _persist_and_attach_recommendation_ids(db, user_id, all_returned)
    else:
        attach_recommendation_ids(db, user_id, all_returned)

    return {
        **payload,
        "total_count": len(sorted_recommendations),
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.get("/takeout/redirect", response_model=TakeoutRedirectResponse)
def get_takeout_redirect(
    user_id: int = Query(..., gt=0, description="用户ID"),
    preference: Optional[str] = Query(None, description="口味偏好/搜索关键词"),
    recipe_id: Optional[int] = Query(None, gt=0, description="聚焦的菜谱ID"),
    db: Session = Depends(get_db),
):
    """
    前往美团外卖页面数据接口
    基于「不想做」意图，返回跳转链接与外卖同款推荐列表（mock 演示数据）
    """
    user = get_user_by_id(db, user_id)
    effective_preference = preference
    if not effective_preference and user:
        dietary_mode = getattr(user, "dietary_mode", None) or "normal"
        if dietary_mode in ("parents", "fat_loss"):
            effective_preference = "清淡"

    user_ingredients = build_user_ingredient_quantities(db, user_id)

    all_recipes = get_recipes_by_preference(db, taste=effective_preference)
    recommendations = []

    for recipe in all_recipes:
        item = _build_recommendation_item(
            db,
            user_id,
            recipe,
            user_ingredients,
            has_time=False,
            prefer_takeout=True,
            dietary_mode=getattr(user, "dietary_mode", None) if user else "normal",
            family_count=user.family_count if user else 2,
        )
        if not item:
            continue
        recommendations.append(item)

    sorted_recommendations = recommendation_service.sort_takeout_recommendations(
        [r for r in recommendations if r["match_score"] >= 0.1],
        prefer_takeout=True,
    )
    payload = recommendation_service.build_response_payload(
        sorted_recommendations,
        db,
        user_id,
        has_time=False,
        prefer_takeout=True,
    )

    takeout_recipes = payload["takeout_delivery_recipes"]
    focus_recipe_name = None
    if recipe_id:
        matched = next(
            (r for r in takeout_recipes if r.get("recipe_id") == recipe_id),
            None,
        )
        if matched:
            focus_recipe_name = matched.get("name")
        else:
            focus_recipe = get_recipe_by_id(db, recipe_id)
            if focus_recipe:
                focus_item = _build_recommendation_item(
                    db,
                    user_id,
                    focus_recipe,
                    user_ingredients,
                    has_time=False,
                    prefer_takeout=True,
                    dietary_mode=getattr(user, "dietary_mode", None) if user else "normal",
                    family_count=user.family_count if user else 2,
                )
                if focus_item:
                    focus_recipe_name = focus_item.get("name")
                    takeout_recipes = [focus_item] + [
                        r for r in takeout_recipes if r.get("recipe_id") != recipe_id
                    ]

    return takeout_redirect_service.build_takeout_redirect(
        preference=effective_preference,
        takeout_recipes=takeout_recipes,
        focus_recipe_id=recipe_id,
        focus_recipe_name=focus_recipe_name,
    )


@router.post("/advanced-recommend", response_model=RecommendationResponse)
def advanced_recommend_recipes(
    request: AdvancedRecommendationRequest,
    db: Session = Depends(get_db)
):
    """
    高级菜谱推荐接口 - 支持更多筛选条件
    """
    # 获取用户现有食材
    user_ingredients = build_user_ingredient_quantities(db, request.user_id)
    
    # 获取符合条件的菜谱
    all_recipes = get_recipes_by_preference(db, taste=request.preference)
    
    # 根据烹饪时间过滤
    if request.max_cooking_time:
        all_recipes = [r for r in all_recipes if r.cooking_time <= request.max_cooking_time]
    
    recommendations = []

    for recipe in all_recipes:
        item = _build_recommendation_item(
            db,
            request.user_id,
            recipe,
            user_ingredients,
            has_time=request.has_time if request.has_time is not None else True,
            prefer_convenience=request.prefer_convenience or False,
            prefer_premade=request.prefer_premade or False,
            prefer_takeout=request.prefer_takeout or False,
        )
        if not item:
            continue

        if request.min_match_score and item["match_score"] < float(request.min_match_score):
            continue

        normalized_type = recommendation_service.normalize_recommendation_type(
            item["recommendation_type"]
        )
        if request.recommendation_types:
            allowed = {
                recommendation_service.normalize_recommendation_type(t)
                for t in request.recommendation_types
            }
            if normalized_type not in allowed:
                continue

        recommendations.append(item)

    prefer_takeout_flag = bool(request.prefer_takeout)
    min_score = float(request.min_match_score or 0.1)
    if prefer_takeout_flag:
        sorted_recommendations = recommendation_service.sort_takeout_recommendations(
            [r for r in recommendations if r["match_score"] >= min_score],
            prefer_takeout=True,
        )
    else:
        sorted_recommendations = recommendation_service.filter_and_sort_recommendations(
            recommendations,
            min_match_score=min_score,
        )
    sorted_recommendations = sorted_recommendations[: request.limit]
    payload = recommendation_service.build_response_payload(
        sorted_recommendations,
        db,
        request.user_id,
        has_time=request.has_time if request.has_time is not None else True,
        prefer_takeout=prefer_takeout_flag,
    )

    all_returned = (
        payload["cook_self_recipes"]
        + payload["flash_purchase_recipes"]
        + payload["takeout_delivery_recipes"]
        + payload["premade_fresh_recipes"]
    )
    _persist_and_attach_recommendation_ids(db, request.user_id, all_returned)

    return {
        **payload,
        "total_count": len(sorted_recommendations),
        "generated_at": datetime.utcnow().isoformat(),
    }

@router.post("/select", response_model=RecipeSelectionResponse)
def select_recipe(
    selection: RecipeSelectionRequest,
    db: Session = Depends(get_db)
):
    """
    选择菜谱接口：确认选择时同步写入厨艺集卡（完成该菜品的徽章收集）
    """
    updated_recommendation = update_recommendation_selection(
        db, selection.recommendation_id, selection.is_selected
    )

    if not updated_recommendation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="推荐记录不存在",
        )

    response = {
        "recommendation_id": updated_recommendation.id,
        "is_selected": updated_recommendation.is_selected,
        "success": True,
        "message": "已取消选择" if not selection.is_selected else "菜谱选择状态更新成功",
        "recipe_id": updated_recommendation.recipe_id,
        "recipe_name": None,
        "cook_id": None,
        "is_new_badge": None,
        "cook_count": None,
        "badge": None,
    }

    if not selection.is_selected:
        return response

    try:
        collection_result = complete_recipe_collection(
            db,
            user_id=updated_recommendation.user_id,
            recipe_id=updated_recommendation.recipe_id,
            servings=selection.servings or 2,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    response.update(collection_result)
    return response

@router.get("/recommendation-stats/{user_id}", response_model=RecommendationStats)
def get_user_recommendation_stats(
    user_id: int = Path(..., gt=0, description="用户ID"),
    db: Session = Depends(get_db)
):
    """
    获取用户推荐统计信息
    """
    stats = get_recommendation_stats(db, user_id)
    return stats


@router.get("/user/{user_id}/collection", response_model=RecipeCollectionResponse)
def get_recipe_collection(
    user_id: int = Path(..., gt=0, description="用户ID"),
    year: Optional[int] = Query(None, ge=2020, le=2100, description="统计年份"),
    month: Optional[int] = Query(None, ge=1, le=12, description="统计月份"),
    db: Session = Depends(get_db),
):
    """厨艺集卡：徽章列表 + 当月做菜可视化数据"""
    return get_user_collection(db, user_id, year=year, month=month)


@router.post("/{recipe_id}/select", response_model=RecipeSelectionResponse)
def select_recipe_by_id(
    body: RecipeCookCreate,
    recipe_id: int = Path(..., gt=0, description="菜谱ID"),
    db: Session = Depends(get_db),
):
    """
    从菜谱详情选择该菜：写入集卡，并同步标记最近一条推荐记录为已选（若有）
    """
    latest_rec = get_latest_recommendation_for_recipe(db, body.user_id, recipe_id)
    if latest_rec and not latest_rec.is_selected:
        update_recommendation_selection(db, latest_rec.id, True)

    try:
        collection_result = complete_recipe_collection(
            db,
            user_id=body.user_id,
            recipe_id=recipe_id,
            servings=body.servings or 2,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    return {
        "recommendation_id": latest_rec.id if latest_rec else 0,
        "is_selected": True,
        "success": True,
        **collection_result,
    }


@router.post("/{recipe_id}/cook", response_model=RecipeCookRecordResponse)
def record_recipe_cooked(
    body: RecipeCookCreate,
    recipe_id: int = Path(..., gt=0, description="菜谱ID"),
    db: Session = Depends(get_db),
):
    """兼容旧接口：等同于从详情页选择菜谱并完成集卡"""
    try:
        collection_result = complete_recipe_collection(
            db,
            user_id=body.user_id,
            recipe_id=recipe_id,
            servings=body.servings or 2,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    latest_rec = get_latest_recommendation_for_recipe(db, body.user_id, recipe_id)
    if latest_rec and not latest_rec.is_selected:
        update_recommendation_selection(db, latest_rec.id, True)

    return collection_result


@router.get("/{recipe_id}/dietary-analysis", response_model=RecipeDietaryAnalysisResponse)
def get_recipe_dietary_analysis(
    recipe_id: int = Path(..., gt=0, description="菜谱ID"),
    user_id: int = Query(..., gt=0, description="用户ID"),
    servings: int = Query(2, ge=1, le=12, description="用餐人数"),
    dietary_mode: Optional[str] = Query(None, description="饮食模式覆盖"),
    db: Session = Depends(get_db),
):
    """菜谱饮食模式分析 — 减脂卡路里 / 爸妈低钠低糖 / 用药冲突提醒"""
    recipe_detail = _build_recipe_detail(db, recipe_id)
    if not recipe_detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="菜谱不存在",
        )

    user = get_user_by_id(db, user_id)
    effective_mode = dietary_mode or (getattr(user, "dietary_mode", None) if user else None) or "normal"
    on_antihypertensive = bool(getattr(user, "on_antihypertensive", False)) if user else False

    if servings == 2 and user and user.family_count:
        servings = user.family_count

    return dietary_analysis_service.analyze_recipe(
        recipe_detail["ingredients"],
        dietary_mode=effective_mode,
        servings=servings,
        base_servings=recipe_detail.get("serving_size") or 2,
        on_antihypertensive=on_antihypertensive,
    )


@router.get("/{recipe_id}", response_model=RecipeDetailResponse)
def get_recipe_detail(
    recipe_id: int = Path(..., gt=0, description="菜谱ID"),
    db: Session = Depends(get_db)
):
    """菜谱详情接口"""
    recipe_detail = _build_recipe_detail(db, recipe_id)
    if not recipe_detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="菜谱不存在"
        )
    return recipe_detail

@router.delete(
    "/user/{user_id}/recommendations/cache",
    response_model=ClearRecommendationCacheResponse,
)
def clear_user_recommendation_cache(
    user_id: int = Path(..., gt=0, description="用户ID"),
    db: Session = Depends(get_db),
):
    """清除用户推荐缓存（删除全部推荐记录）"""
    deleted_count = delete_all_user_recommendations(db, user_id)
    return {
        "deleted_count": deleted_count,
        "message": f"已清除 {deleted_count} 条推荐缓存记录",
    }


@router.get("/user/{user_id}/recommendations")
def get_user_recommendation_history(
    user_id: int = Path(..., gt=0, description="用户ID"),
    recommendation_type: Optional[str] = Query(None, description="推荐类型过滤"),
    limit: int = Query(20, ge=1, le=100, description="返回数量限制"),
    db: Session = Depends(get_db)
):
    """
    获取用户推荐历史记录
    """
    if recommendation_type:
        recommendations = get_recommendations_by_type(db, user_id, recommendation_type)
    else:
        recommendations = get_user_recommendations(db, user_id, limit)
    
    # 转换推荐记录为响应格式
    recommendation_items = []
    for rec in recommendations[:limit]:
        missing_ingredients = []
        if rec.missing_ingredients_detail:
            try:
                missing_ingredients = json.loads(rec.missing_ingredients_detail)
            except:
                missing_ingredients = []
        
        recipe = get_recipe_by_id(db, rec.recipe_id)
        recommendation_items.append({
            'recommendation_id': rec.id,
            'recipe_id': rec.recipe_id,
            'name': recipe.name if recipe else f'菜谱 #{rec.recipe_id}',
            'image_url': (recipe.image_url or '') if recipe else '',
            'recommendation_type': rec.recommendation_type,
            'match_score': float(rec.match_score),
            'existing_ingredients_ratio': float(rec.existing_ingredients_ratio),
            'missing_ingredients_count': rec.missing_ingredients_count,
            'missing_ingredients_detail': missing_ingredients,
            'recommendation_reason': rec.recommendation_reason,
            'is_selected': rec.is_selected,
            'created_at': rec.created_at.isoformat()
        })
    
    return {
        'recommendations': recommendation_items,
        'total_count': len(recommendation_items)
    }
