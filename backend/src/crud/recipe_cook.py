"""用户做菜记录与集卡统计"""

from __future__ import annotations

from calendar import monthrange
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from ..models.recipe_base import RecipeBase as RecipeBaseModel
from ..models.recipe_cook_record import RecipeCookRecord as RecipeCookRecordModel

TASTE_EMOJI = {
    "清淡": "🥗",
    "麻辣": "🌶️",
    "酸甜": "🍋",
    "咸鲜": "🍲",
    "neutral": "🍳",
}


def _badge_tier(cook_count: int) -> str:
    if cook_count >= 5:
        return "gold"
    if cook_count >= 3:
        return "silver"
    return "bronze"


def _badge_emoji(taste: str, recipe_name: str) -> str:
    if taste in TASTE_EMOJI:
        return TASTE_EMOJI[taste]
    if any(k in recipe_name for k in ("鸡", "鸭")):
        return "🍗"
    if any(k in recipe_name for k in ("鱼", "虾")):
        return "🐟"
    if any(k in recipe_name for k in ("牛", "猪", "肉")):
        return "🥩"
    if any(k in recipe_name for k in ("蛋", "豆腐")):
        return "🥚"
    return "👨‍🍳"


def create_cook_record(
    db: Session,
    *,
    user_id: int,
    recipe_id: int,
    servings: int = 2,
) -> Tuple[RecipeCookRecordModel, int, bool]:
    """
    记录一次做菜完成。
    返回 (记录, 该菜谱累计次数, 是否首次获得徽章)
    """
    record = RecipeCookRecordModel(
        user_id=user_id,
        recipe_id=recipe_id,
        servings=servings,
        cooked_at=datetime.utcnow(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    cook_count = (
        db.query(RecipeCookRecordModel)
        .filter(
            and_(
                RecipeCookRecordModel.user_id == user_id,
                RecipeCookRecordModel.recipe_id == recipe_id,
            )
        )
        .count()
    )
    is_new_badge = cook_count == 1
    return record, cook_count, is_new_badge


def _build_badge_item(
    recipe: RecipeBaseModel,
    cook_count: int,
    first_at: datetime,
    last_at: datetime,
) -> dict:
    taste = recipe.taste or "neutral"
    return {
        "recipe_id": recipe.id,
        "recipe_name": recipe.name,
        "image_url": recipe.image_url or "",
        "taste": taste,
        "badge_emoji": _badge_emoji(taste, recipe.name),
        "badge_tier": _badge_tier(cook_count),
        "cook_count": cook_count,
        "first_cooked_at": first_at.isoformat(),
        "last_cooked_at": last_at.isoformat(),
    }


def get_user_collection(
    db: Session,
    user_id: int,
    *,
    year: Optional[int] = None,
    month: Optional[int] = None,
) -> dict:
    """集卡列表 + 月度可视化数据"""
    now = datetime.utcnow()
    year = year or now.year
    month = month or now.month

    month_start = datetime(year, month, 1)
    last_day = monthrange(year, month)[1]
    month_end = datetime(year, month, last_day, 23, 59, 59)

    total_cooks = (
        db.query(RecipeCookRecordModel)
        .filter(RecipeCookRecordModel.user_id == user_id)
        .count()
    )

    agg_rows = (
        db.query(
            RecipeCookRecordModel.recipe_id,
            func.count(RecipeCookRecordModel.id).label("cook_count"),
            func.min(RecipeCookRecordModel.cooked_at).label("first_at"),
            func.max(RecipeCookRecordModel.cooked_at).label("last_at"),
        )
        .filter(RecipeCookRecordModel.user_id == user_id)
        .group_by(RecipeCookRecordModel.recipe_id)
        .order_by(func.max(RecipeCookRecordModel.cooked_at).desc())
        .all()
    )

    badges: List[dict] = []
    for row in agg_rows:
        recipe = db.query(RecipeBaseModel).filter(RecipeBaseModel.id == row.recipe_id).first()
        if not recipe:
            continue
        badges.append(
            _build_badge_item(recipe, row.cook_count, row.first_at, row.last_at)
        )

    month_records = (
        db.query(RecipeCookRecordModel)
        .filter(
            and_(
                RecipeCookRecordModel.user_id == user_id,
                RecipeCookRecordModel.cooked_at >= month_start,
                RecipeCookRecordModel.cooked_at <= month_end,
            )
        )
        .all()
    )

    daily_counts: Dict[str, int] = defaultdict(int)
    daily_recipes: Dict[str, List[dict]] = defaultdict(list)
    seen_recipe_per_day: Dict[str, set] = defaultdict(set)
    month_recipe_ids = set()
    recipe_cache: Dict[int, RecipeBaseModel] = {}

    for rec in month_records:
        day_key = rec.cooked_at.strftime("%Y-%m-%d")
        daily_counts[day_key] += 1
        month_recipe_ids.add(rec.recipe_id)
        if rec.recipe_id not in seen_recipe_per_day[day_key]:
            if rec.recipe_id not in recipe_cache:
                recipe_cache[rec.recipe_id] = (
                    db.query(RecipeBaseModel)
                    .filter(RecipeBaseModel.id == rec.recipe_id)
                    .first()
                )
            recipe = recipe_cache[rec.recipe_id]
            if recipe:
                daily_recipes[day_key].append(
                    {
                        "recipe_id": recipe.id,
                        "recipe_name": recipe.name,
                        "image_url": recipe.image_url or "",
                    }
                )
                seen_recipe_per_day[day_key].add(rec.recipe_id)

    daily_breakdown = [
        {
            "date": f"{year:04d}-{month:02d}-{day:02d}",
            "count": daily_counts.get(f"{year:04d}-{month:02d}-{day:02d}", 0),
            "recipes": daily_recipes.get(f"{year:04d}-{month:02d}-{day:02d}", []),
        }
        for day in range(1, last_day + 1)
    ]

    return {
        "total_badges": len(badges),
        "total_cooks": total_cooks,
        "badges": badges,
        "monthly_stats": {
            "year": year,
            "month": month,
            "total_cooks": len(month_records),
            "unique_recipes": len(month_recipe_ids),
            "daily_breakdown": daily_breakdown,
        },
    }


def complete_recipe_collection(
    db: Session,
    *,
    user_id: int,
    recipe_id: int,
    servings: int = 2,
) -> dict:
    """选择/完成菜谱时写入集卡记录，返回徽章与提示信息"""
    recipe = db.query(RecipeBaseModel).filter(RecipeBaseModel.id == recipe_id).first()
    if not recipe:
        raise ValueError("菜谱不存在")

    record, cook_count, is_new_badge = create_cook_record(
        db,
        user_id=user_id,
        recipe_id=recipe_id,
        servings=servings,
    )
    badge = get_badge_for_recipe(db, user_id, recipe_id)

    if is_new_badge:
        message = f"已选择「{recipe.name}」，恭喜解锁新徽章！"
    else:
        message = f"已选择「{recipe.name}」，集卡累计 {cook_count} 次"

    return {
        "cook_id": record.id,
        "recipe_id": recipe_id,
        "recipe_name": recipe.name,
        "is_new_badge": is_new_badge,
        "cook_count": cook_count,
        "badge": badge,
        "message": message,
    }


def get_badge_for_recipe(
    db: Session, user_id: int, recipe_id: int
) -> Optional[dict]:
    """查询用户对某菜谱的徽章信息（若未做过则 None）"""
    agg = (
        db.query(
            func.count(RecipeCookRecordModel.id).label("cook_count"),
            func.min(RecipeCookRecordModel.cooked_at).label("first_at"),
            func.max(RecipeCookRecordModel.cooked_at).label("last_at"),
        )
        .filter(
            and_(
                RecipeCookRecordModel.user_id == user_id,
                RecipeCookRecordModel.recipe_id == recipe_id,
            )
        )
        .first()
    )
    if not agg or not agg.cook_count:
        return None

    recipe = db.query(RecipeBaseModel).filter(RecipeBaseModel.id == recipe_id).first()
    if not recipe:
        return None

    return _build_badge_item(recipe, agg.cook_count, agg.first_at, agg.last_at)
