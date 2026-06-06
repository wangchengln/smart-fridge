import hashlib
import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Any, Optional, Tuple, Union

from sqlalchemy.orm import Session

from ..schemas.purchase import MissingIngredientAnalyze, PurchasePlanItem
from ..schemas.bundle_scenario import (
    BundleSkuItem,
    FridgeCoverageDetail,
    OrderableBundle,
    ScenarioBundleResponse,
    ScenarioPreviewResponse,
    ScenarioSuggestion,
)
from ..crud.recipe_base import get_recipe_by_id, get_all_recipes
from ..crud.recipe_ingredient_rel import get_recipe_ingredients
from ..crud.user_ingredient import get_near_expiry_ingredients, get_user_ingredients
from ..crud.ingredient_base import get_ingredient_by_id, get_ingredient_by_name
from ..crud.user import get_user_by_id
from ..services.purchase_plan_service import purchase_plan_service
from ..services.meituan_product_service import meituan_product_service


# 周末补货：每人每周基础用量（g 或份）
WEEKLY_STAPLES_PER_PERSON: List[Tuple[str, float]] = [
    ("鸡蛋", 6.0),
    ("牛奶", 1.5),
    ("西红柿", 3.0),
    ("土豆", 2.0),
    ("胡萝卜", 1.0),
    ("猪肉", 0.5),
    ("豆腐", 1.0),
    ("大米", 1.0),
]

# 居家聚会模板（基准 4 人份）
GATHERING_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "hotpot": {
        "label": "火锅聚会",
        "bundle_prefix": "火锅聚会",
        "ingredients": [
            ("火锅底料", 1.0),
            ("牛肉", 0.6),
            ("虾", 0.4),
            ("豆腐", 1.0),
            ("蘑菇", 0.5),
            ("土豆", 1.0),
            ("洋葱", 0.5),
        ],
    },
    "bbq": {
        "label": "烧烤聚会",
        "bundle_prefix": "烧烤聚会",
        "ingredients": [
            ("猪肉", 0.8),
            ("鸡肉", 0.6),
            ("洋葱", 0.5),
            ("土豆", 1.0),
            ("蘑菇", 0.5),
        ],
    },
}

REDIRECT_META = {
    "flash_sale": {
        "label": "美团闪购 / 小象超市",
        "url_tpl": "https://bj.meituan.com/flash-sale/bundle/{bundle_sku_id}",
    },
    "xiaoxiang_scheduled": {
        "label": "小象定时达",
        "url_tpl": "https://bj.meituan.com/xiaoxiang/scheduled/bundle/{bundle_sku_id}",
    },
    "flash_combo": {
        "label": "闪购组合购",
        "url_tpl": "https://bj.meituan.com/flash-sale/combo/{bundle_sku_id}",
    },
}


SCENARIO_META = {
    "cook_shop": {
        "label": "买菜做饭",
        "action_hint": "临期食材优先做成菜，缺什么闪购补齐",
    },
    "weekend_restock": {
        "label": "周末补货",
        "action_hint": "按家庭人数补周常食材，小象定时达送达",
    },
    "home_gathering": {
        "label": "居家聚会",
        "action_hint": "盘点聚会缺口，组合购一键补齐",
    },
}


class BundleScenarioService:
    """云冰箱三大场景 Bundle 生成服务 — 先查库存，再生成可下单组合"""

    def _coverage_detail(
        self,
        covered_items: List[str],
        missing_items: List[str],
    ) -> FridgeCoverageDetail:
        total = len(covered_items) + len(missing_items)
        rate = len(covered_items) / total if total else 0.0
        return FridgeCoverageDetail(
            covered_count=len(covered_items),
            total_count=total,
            covered_items=covered_items,
            missing_items=missing_items,
            coverage_rate=round(rate, 2),
        )

    def _stock_savings_hint(self, covered_count: int, near_used: Optional[List[str]] = None) -> Optional[str]:
        if covered_count <= 0:
            return None
        if near_used:
            return f"优先消耗临期 {len(near_used)} 项，避免浪费约 ¥{len(near_used) * 8}~{len(near_used) * 15}"
        return f"冰箱已有 {covered_count} 项，无需重复购买"

    def _get_user_stock_map(self, db: Session, user_id: int) -> Dict[int, float]:
        stocks = get_user_ingredients(db, user_id)
        return {s.ingredient_id: float(s.quantity) for s in stocks}

    def _resolve_ingredient_id(self, db: Session, name: str) -> int:
        ing = get_ingredient_by_name(db, name)
        return ing.id if ing else 0

    def _plan_items_to_bundle_skus(self, items: List[PurchasePlanItem]) -> List[BundleSkuItem]:
        return [
            BundleSkuItem(
                sku_id=item.product_id or f"sku_{item.ingredient_id}",
                sku_name=item.product_name or item.name,
                ingredient_id=item.ingredient_id,
                ingredient_name=item.name,
                quantity=item.quantity,
                unit=item.unit or "份",
                spec=item.spec,
                price=item.price,
                tier=item.tier,
                rating=item.rating,
            )
            for item in items
        ]

    def _make_bundle_sku_id(self, scenario: str, item_names: List[str]) -> str:
        digest = hashlib.md5("|".join(sorted(item_names)).encode()).hexdigest()[:10]
        return f"mt_bundle_{scenario}_{digest}"

    def _build_bundle_from_missing(
        self,
        db: Session,
        user_id: int,
        missing: List[MissingIngredientAnalyze],
        *,
        bundle_type: str,
        bundle_name: str,
        description: str,
        redirect_channel: str,
        tags: List[str],
        context: Dict[str, Any],
        coverage_summary: Optional[str] = None,
        covered_items: Optional[List[str]] = None,
    ) -> OrderableBundle:
        if not missing:
            raise ValueError("库存充足，无需生成补购 Bundle")

        standard_plan, _, _ = purchase_plan_service.generate_purchase_plans(
            missing, db=db, user_id=user_id
        )
        skus = self._plan_items_to_bundle_skus(standard_plan.items)
        item_names = [s.ingredient_name for s in skus]
        bundle_sku_id = self._make_bundle_sku_id(bundle_type, item_names)
        redirect = REDIRECT_META[redirect_channel]

        return OrderableBundle(
            bundle_id=f"bundle_{bundle_type}_{uuid.uuid4().hex[:12]}",
            bundle_sku_id=bundle_sku_id,
            bundle_name=bundle_name,
            bundle_type=bundle_type,
            description=description,
            items=skus,
            item_count=len(skus),
            total_price=standard_plan.total_price,
            original_price=standard_plan.original_price,
            discount_amount=standard_plan.discount_amount,
            matched_coupons=standard_plan.matched_coupons,
            coupon_discount=standard_plan.coupon_discount,
            final_price=standard_plan.final_price,
            redirect_channel=redirect_channel,
            redirect_label=redirect["label"],
            redirect_url=redirect["url_tpl"].format(bundle_sku_id=bundle_sku_id),
            tags=tags,
            coverage_summary=coverage_summary,
            context={
                **context,
                "covered_items": covered_items or [],
                "missing_items": [m.name for m in missing],
            },
        )

    def _find_near_expiry_recipe(
        self,
        db: Session,
        user_id: int,
        near_expiry_ids: set,
        recipe_id: Optional[int] = None,
    ) -> Tuple[Union[Any, None], List[str], float]:
        """临期优先：选使用临期食材最多的菜谱"""
        if recipe_id:
            recipe = get_recipe_by_id(db, recipe_id)
            if not recipe:
                raise ValueError("菜谱不存在")
            reqs = get_recipe_ingredients(db, recipe_id)
            used = []
            for req in reqs:
                ing = get_ingredient_by_id(db, req.ingredient_id)
                if ing and req.ingredient_id in near_expiry_ids:
                    used.append(ing.name)
            return recipe, used, 1.0

        recipes = get_all_recipes(db)
        best_recipe = None
        best_score = -1.0
        best_used: List[str] = []

        for recipe in recipes:
            reqs = get_recipe_ingredients(db, recipe.id)
            used_names = []
            near_count = 0
            for req in reqs:
                if req.ingredient_id in near_expiry_ids:
                    near_count += 1
                    ing = get_ingredient_by_id(db, req.ingredient_id)
                    if ing:
                        used_names.append(ing.name)
            if near_count == 0:
                continue
            score = near_count + (1.0 / max(recipe.cooking_time, 1))
            if score > best_score:
                best_score = score
                best_recipe = recipe
                best_used = used_names

        if not best_recipe:
            best_recipe = recipes[0] if recipes else None
            if not best_recipe:
                raise ValueError("菜谱库为空，无法推荐")
            best_used = []

        return best_recipe, best_used, best_score

    def _calc_missing_for_recipe(
        self,
        db: Session,
        user_id: int,
        recipe_id: int,
        servings: int,
    ) -> Tuple[List[MissingIngredientAnalyze], int, int]:
        recipe = get_recipe_by_id(db, recipe_id)
        if not recipe:
            raise ValueError("菜谱不存在")

        base_servings = recipe.serving_size or 2
        scale = servings / base_servings
        stock_map = self._get_user_stock_map(db, user_id)
        reqs = get_recipe_ingredients(db, recipe_id)

        missing: List[MissingIngredientAnalyze] = []
        covered = 0
        total = len(reqs)

        for req in reqs:
            required = round(float(req.required_quantity) * scale, 2)
            current = stock_map.get(req.ingredient_id, 0)
            ing = get_ingredient_by_id(db, req.ingredient_id)
            name = ing.name if ing else f"食材{req.ingredient_id}"

            if current >= required:
                covered += 1
            else:
                missing.append(
                    MissingIngredientAnalyze(
                        ingredient_id=req.ingredient_id,
                        name=name,
                        required_quantity=Decimal(str(required)),
                        current_quantity=Decimal(str(current)),
                    )
                )

        return missing, covered, total

    def _pick_recipe_with_gaps(
        self,
        db: Session,
        user_id: int,
        near_expiry_ids: set,
        servings: int,
    ) -> Tuple[Any, List[str], List[MissingIngredientAnalyze], int, int]:
        """优先临期菜谱，若无缺口则遍历其他菜谱"""
        recipes = get_all_recipes(db)
        scored: List[Tuple[float, Any, List[str], List[MissingIngredientAnalyze], int, int]] = []

        for recipe in recipes:
            reqs = get_recipe_ingredients(db, recipe.id)
            used_names = []
            near_count = 0
            for req in reqs:
                if req.ingredient_id in near_expiry_ids:
                    near_count += 1
                    ing = get_ingredient_by_id(db, req.ingredient_id)
                    if ing:
                        used_names.append(ing.name)

            missing, covered, total = self._calc_missing_for_recipe(
                db, user_id, recipe.id, servings
            )
            if not missing:
                continue

            score = near_count * 10 + len(missing) + (1.0 / max(recipe.cooking_time, 1))
            scored.append((score, recipe, used_names, missing, covered, total))

        if not scored:
            raise ValueError("冰箱食材充足，当前无需生成补购 Bundle")

        scored.sort(key=lambda x: x[0], reverse=True)
        _, best, used, missing, covered, total = scored[0]
        return best, used, missing, covered, total

    def _count_weekend_gaps(
        self, db: Session, user_id: int, people: int
    ) -> Tuple[int, int, List[str]]:
        stock_map = self._get_user_stock_map(db, user_id)
        missing_names: List[str] = []
        covered = 0
        for name, per_person_qty in WEEKLY_STAPLES_PER_PERSON:
            required = round(per_person_qty * people, 2)
            ing_id = self._resolve_ingredient_id(db, name)
            current = stock_map.get(ing_id, 0) if ing_id else 0
            if current >= required:
                covered += 1
            else:
                missing_names.append(name)
        return covered, len(missing_names), missing_names

    def get_scenario_preview(self, db: Session, user_id: int) -> ScenarioPreviewResponse:
        """基于冰箱状态生成场景洞察与智能推荐"""
        user = get_user_by_id(db, user_id)
        if not user:
            raise ValueError("用户不存在")

        stocks = get_user_ingredients(db, user_id)
        near_data = get_near_expiry_ingredients(db, user_id)
        near_items = near_data.get("near_expiry_ingredients", [])
        near_names = [item["ingredient_name"] for item in near_items[:5]]
        people = user.family_count or 1

        weekend_covered, weekend_missing_count, _ = self._count_weekend_gaps(db, user_id, people)
        is_weekend = datetime.now().weekday() >= 4

        suggestions: List[ScenarioSuggestion] = []

        cook_reason = (
            f"有 {len(near_names)} 项临期食材待消耗"
            if near_names
            else "根据冰箱缺口智能匹配菜谱"
        )
        suggestions.append(
            ScenarioSuggestion(
                scenario="cook_shop",
                scenario_label=SCENARIO_META["cook_shop"]["label"],
                reason=cook_reason,
                urgency="high" if near_names else "medium",
                badge="临期优先" if near_names else None,
                action_hint=SCENARIO_META["cook_shop"]["action_hint"],
            )
        )

        weekend_reason = (
            f"周常食材缺 {weekend_missing_count} 项，建议周末一次性补齐"
            if weekend_missing_count >= 3
            else f"冰箱已备 {weekend_covered}/{len(WEEKLY_STAPLES_PER_PERSON)} 项周常食材"
        )
        suggestions.append(
            ScenarioSuggestion(
                scenario="weekend_restock",
                scenario_label=SCENARIO_META["weekend_restock"]["label"],
                reason=weekend_reason,
                urgency="high" if is_weekend and weekend_missing_count >= 3 else "medium",
                badge="本周宜补" if is_weekend and weekend_missing_count >= 2 else None,
                action_hint=SCENARIO_META["weekend_restock"]["action_hint"],
            )
        )

        suggestions.append(
            ScenarioSuggestion(
                scenario="home_gathering",
                scenario_label=SCENARIO_META["home_gathering"]["label"],
                reason="朋友来访？先盘点冰箱，缺口组合购一键补齐",
                urgency="low",
                action_hint=SCENARIO_META["home_gathering"]["action_hint"],
            )
        )

        urgency_rank = {"high": 0, "medium": 1, "low": 2}
        suggested = min(suggestions, key=lambda s: urgency_rank.get(s.urgency, 9))

        if near_names:
            headline = f"冰箱有 {len(near_names)} 项临期，建议先做一道菜"
            subheadline = "云冰箱已盘点库存，只买缺口、不重复囤货"
        elif weekend_missing_count >= 3:
            headline = f"周常食材缺 {weekend_missing_count} 项，适合周末补货"
            subheadline = f"按 {people} 人家庭用量计算，定时达送到家"
        elif len(stocks) == 0:
            headline = "冰箱还是空的，从周末补货开始吧"
            subheadline = "先建立库存档案，后续才能智能补齐"
        else:
            headline = f"冰箱在库 {len(stocks)} 项，可智能生成补购方案"
            subheadline = "先查库存再闪购 — 比盲目下单更省心"

        return ScenarioPreviewResponse(
            headline=headline,
            subheadline=subheadline,
            fridge_total=len(stocks),
            near_expiry_count=len(near_items),
            near_expiry_items=near_names,
            suggested_scenario=suggested,
            scenarios=suggestions,
        )

    def generate_cook_shop_bundle(
        self,
        db: Session,
        user_id: int,
        recipe_id: Optional[int] = None,
        servings: Optional[int] = None,
    ) -> ScenarioBundleResponse:
        near_expiry_data = get_near_expiry_ingredients(db, user_id)
        near_items = near_expiry_data.get("near_expiry_ingredients", [])
        near_expiry_ids = {item["ingredient_id"] for item in near_items}

        user = get_user_by_id(db, user_id)
        target_servings = servings or (user.family_count if user else None) or 2

        if recipe_id:
            recipe, near_used, _ = self._find_near_expiry_recipe(
                db, user_id, near_expiry_ids, recipe_id
            )
            missing, covered, total = self._calc_missing_for_recipe(
                db, user_id, recipe.id, target_servings
            )
        else:
            recipe, near_used, missing, covered, total = self._pick_recipe_with_gaps(
                db, user_id, near_expiry_ids, target_servings
            )

        stock_map = self._get_user_stock_map(db, user_id)
        reqs = get_recipe_ingredients(db, recipe.id)
        covered_items = []
        for req in reqs:
            base_servings = recipe.serving_size or 2
            scale = target_servings / base_servings
            required = round(float(req.required_quantity) * scale, 2)
            current = stock_map.get(req.ingredient_id, 0)
            if current >= required:
                ing = get_ingredient_by_id(db, req.ingredient_id)
                if ing:
                    covered_items.append(ing.name)

        missing_items = [m.name for m in missing]
        coverage = self._coverage_detail(covered_items, missing_items)

        near_label = "、".join(near_used[:3]) if near_used else "当前库存"
        reasons = []
        if near_used:
            reasons.append(f"优先消耗临期食材：{near_label}")
        reasons.append(f"「{recipe.name}」库存已覆盖 {covered}/{total} 项，只买缺的 {len(missing)} 项")
        reasons.append("30 分钟闪购送达，组合购一键加购")

        bundle = self._build_bundle_from_missing(
            db,
            user_id,
            missing,
            bundle_type="cook_shop",
            bundle_name=f"{recipe.name} · 缺料补齐包",
            description=f"基于冰箱库存推荐「{recipe.name}」，{coverage.coverage_rate:.0%} 食材已有，只补缺口",
            redirect_channel="flash_sale",
            tags=["临期优先", "缺料补购", "闪购30分钟"],
            context={
                "recipe_id": recipe.id,
                "servings": target_servings,
                "near_expiry_count": len(near_used),
            },
            coverage_summary=f"库存已覆盖 {covered}/{total} 项",
            covered_items=covered_items,
        )

        headline = (
            f"今晚做「{recipe.name}」，只需补齐 {len(missing)} 项"
            if missing
            else f"「{recipe.name}」食材已齐"
        )
        msg = (
            f"临期 {near_label} 优先入菜，缺料闪购补齐"
            if near_used
            else f"冰箱已有 {covered} 项，一键补齐剩余缺口"
        )

        return ScenarioBundleResponse(
            scenario="cook_shop",
            scenario_label="买菜做饭",
            message=msg,
            headline=headline,
            recommendation_reasons=reasons,
            fridge_coverage=coverage,
            stock_savings_hint=self._stock_savings_hint(covered, near_used),
            bundle=bundle,
            recipe_id=recipe.id,
            recipe_name=recipe.name,
            near_expiry_used=near_used,
        )

    def generate_weekend_restock_bundle(
        self,
        db: Session,
        user_id: int,
        family_count: Optional[int] = None,
    ) -> ScenarioBundleResponse:
        user = get_user_by_id(db, user_id)
        if not user:
            raise ValueError("用户不存在")

        people = family_count or user.family_count or 1
        stock_map = self._get_user_stock_map(db, user_id)

        missing: List[MissingIngredientAnalyze] = []
        covered_items: List[str] = []
        covered = 0
        total = len(WEEKLY_STAPLES_PER_PERSON)

        for name, per_person_qty in WEEKLY_STAPLES_PER_PERSON:
            required = round(per_person_qty * people, 2)
            ing_id = self._resolve_ingredient_id(db, name)
            current = stock_map.get(ing_id, 0) if ing_id else 0

            if current >= required:
                covered += 1
                covered_items.append(name)
            else:
                missing.append(
                    MissingIngredientAnalyze(
                        ingredient_id=ing_id or hash(name) % 100000,
                        name=name,
                        required_quantity=Decimal(str(required)),
                        current_quantity=Decimal(str(current)),
                    )
                )

        missing_items = [m.name for m in missing]
        coverage = self._coverage_detail(covered_items, missing_items)
        reasons = [
            f"按 {people} 人家庭周用量计算，缺 {len(missing)} 项",
            f"冰箱已备 {covered}/{total} 项周常食材，避免重复囤货",
            "小象定时达，周末一次性送到家",
        ]

        bundle = self._build_bundle_from_missing(
            db,
            user_id,
            missing,
            bundle_type="weekend_restock",
            bundle_name=f"{people}人家庭 · 周末补货包",
            description=f"盘点冰箱后生成 {people} 人周采购清单，{coverage.coverage_rate:.0%} 已有",
            redirect_channel="xiaoxiang_scheduled",
            tags=["周末补货", "家庭用量", "定时达"],
            context={"family_count": people, "staple_count": total},
            coverage_summary=f"冰箱已备 {covered}/{total} 项周常食材",
            covered_items=covered_items,
        )

        return ScenarioBundleResponse(
            scenario="weekend_restock",
            scenario_label="周末补货",
            message=f"已为 {people} 人家庭生成补货清单，缺 {len(missing)} 项",
            headline=f"周末补货 · 只买缺的 {len(missing)} 项",
            recommendation_reasons=reasons,
            fridge_coverage=coverage,
            stock_savings_hint=self._stock_savings_hint(covered),
            bundle=bundle,
        )

    def generate_home_gathering_bundle(
        self,
        db: Session,
        user_id: int,
        event_type: str = "hotpot",
        guest_count: int = 4,
    ) -> ScenarioBundleResponse:
        template = GATHERING_TEMPLATES.get(event_type)
        if not template:
            raise ValueError(f"不支持的聚会类型: {event_type}")

        base_guests = 4
        scale = guest_count / base_guests
        stock_map = self._get_user_stock_map(db, user_id)

        missing: List[MissingIngredientAnalyze] = []
        covered_items: List[str] = []
        covered = 0
        total = len(template["ingredients"])

        for name, base_qty in template["ingredients"]:
            required = round(base_qty * scale, 2)
            ing_id = self._resolve_ingredient_id(db, name)
            current = stock_map.get(ing_id, 0) if ing_id else 0

            if current >= required:
                covered += 1
                covered_items.append(name)
            else:
                missing.append(
                    MissingIngredientAnalyze(
                        ingredient_id=ing_id or hash(name) % 100000,
                        name=name,
                        required_quantity=Decimal(str(required)),
                        current_quantity=Decimal(str(current)),
                    )
                )

        missing_items = [m.name for m in missing]
        coverage = self._coverage_detail(covered_items, missing_items)
        event_label = template["label"]
        event_short = event_label.replace("聚会", "")

        reasons = [
            f"「来 {guest_count} 人吃{event_short}」场景模板已匹配",
            f"冰箱已有 {covered}/{total} 项聚会食材，只补缺口",
            "闪购组合购，一次下单全部到齐",
        ]

        bundle = self._build_bundle_from_missing(
            db,
            user_id,
            missing,
            bundle_type="home_gathering",
            bundle_name=f"{guest_count}人{event_short} · 缺口补齐包",
            description=f"盘点冰箱后生成 {guest_count} 人{event_label}清单，{coverage.coverage_rate:.0%} 已有",
            redirect_channel="flash_combo",
            tags=["居家聚会", "组合购", "库存盘点"],
            context={
                "event_type": event_type,
                "guest_count": guest_count,
                "event_label": event_label,
            },
            coverage_summary=f"冰箱已有 {covered}/{total} 项聚会食材",
            covered_items=covered_items,
        )

        return ScenarioBundleResponse(
            scenario="home_gathering",
            scenario_label="居家聚会",
            message=f"已为 {guest_count} 人{event_label}生成补齐清单，缺 {len(missing)} 项",
            headline=f"{guest_count}人{event_short} · 只买缺的 {len(missing)} 项",
            recommendation_reasons=reasons,
            fridge_coverage=coverage,
            stock_savings_hint=self._stock_savings_hint(covered),
            bundle=bundle,
        )


bundle_scenario_service = BundleScenarioService()
