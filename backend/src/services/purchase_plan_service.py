from typing import List, Dict, Any, Tuple, Optional
from decimal import Decimal
from sqlalchemy.orm import Session

from ..schemas.purchase import PurchasePlan, PurchasePlanItem, MissingIngredientAnalyze, ProductItem
from ..schemas.coupon import PriceComparison
from ..services.meituan_product_service import meituan_product_service, PREMIUM_KEYWORDS, ECONOMY_KEYWORDS
from ..services.coupon_service import coupon_service

TIER_WEIGHT = {"premium": 3.0, "standard": 2.0, "economy": 1.0}
TIER_LABELS = {"premium": "优选档", "standard": "常规档", "economy": "实惠档"}


class PurchasePlanService:
    """补购方案生成服务：标准版重品质，省钱版重低价与凑单"""

    PLAN_META = {
        "standard": {
            "name": "标准版方案",
            "description": "优选有机/精选商品，品质稳定，适合注重口感与新鲜度",
            "tags": ["品质优选", "有机精选", "评分优先"],
        },
        "economy": {
            "name": "省钱版方案",
            "description": "锁定最低单价与特价SKU，凑单满减，同款食材最多可省40%",
            "tags": ["低价优先", "凑单满减", "特价SKU"],
        },
    }

    def _apply_coupons_to_plan(
        self,
        db: Optional[Session],
        user_id: Optional[int],
        plan: PurchasePlan,
    ) -> PurchasePlan:
        if not db or not user_id:
            plan.final_price = plan.total_price
            return plan

        matched = coupon_service.match_coupons_for_order(
            db, user_id, plan.total_price, scopes=["grocery", "all"]
        )
        coupon_discount = matched[0].discount_amount if matched else Decimal("0")
        plan.matched_coupons = matched
        plan.coupon_discount = coupon_discount
        plan.final_price = max(Decimal("0"), plan.total_price - coupon_discount)
        return plan

    def _resolve_tier(self, product: ProductItem) -> str:
        if product.tier:
            return product.tier
        return meituan_product_service.infer_tier(product.name, product.tier)

    def _unit_price(self, product: ProductItem) -> float:
        if product.unit_price:
            return float(product.unit_price)
        return float(product.price)

    def _select_standard_product(self, products: List[ProductItem], missing_qty: float) -> Optional[ProductItem]:
        """标准版：品质优先 — 有机/精选档 + 高评分 + 合适规格"""
        if not products:
            return None

        def score_product(p: ProductItem) -> float:
            tier = self._resolve_tier(p)
            tier_score = TIER_WEIGHT.get(tier, 1.0)
            rating = float(p.rating or 4.0)
            match = float(p.match_score)
            keyword_bonus = sum(0.6 for kw in PREMIUM_KEYWORDS if kw in p.name)
            sales_bonus = min(float(p.sales_count or 0) / 5000, 0.5)
            # 规格适中加分（避免过小不够用）
            spec_bonus = 0.2 if missing_qty <= 500 else 0.0
            return tier_score * 2.5 + rating * 1.2 + match + keyword_bonus + sales_bonus + spec_bonus

        return max(products, key=score_product)

    def _select_economy_product(self, products: List[ProductItem], missing_qty: float) -> Optional[ProductItem]:
        """省钱版：价格优先 — 最低单价 + 实惠/特价档 + 规避溢价词"""
        if not products:
            return None

        def cost_score(p: ProductItem) -> float:
            tier = self._resolve_tier(p)
            unit = self._unit_price(p)
            tier_mult = {"premium": 1.35, "standard": 1.0, "economy": 0.88}.get(tier, 1.0)
            premium_penalty = 1.25 if any(kw in p.name for kw in PREMIUM_KEYWORDS) else 1.0
            # 单价越低越好；销量高的实惠款更可信
            sales_discount = max(0, 0.08 - min(float(p.sales_count or 0) / 50000, 0.08))
            return unit * tier_mult * premium_penalty - sales_discount

        return min(products, key=cost_score)

    def _build_plan_item(
        self,
        ingredient: MissingIngredientAnalyze,
        missing_qty: float,
        product: ProductItem,
        savings_vs_standard: Optional[Decimal] = None,
    ) -> PurchasePlanItem:
        tier = self._resolve_tier(product)
        return PurchasePlanItem(
            ingredient_id=ingredient.ingredient_id,
            name=ingredient.name,
            quantity=Decimal(str(round(missing_qty, 2))),
            price=product.price,
            product_id=product.product_id,
            product_name=product.name,
            unit=product.unit,
            spec=product.spec,
            tier=tier,
            rating=product.rating,
            unit_price=product.unit_price or product.price,
            savings_vs_standard=savings_vs_standard,
        )

    def _build_fallback_products(
        self,
        ingredient: MissingIngredientAnalyze,
        missing_qty: float,
        standard_product: Any,
        economy_product: Any,
    ) -> Tuple[Any, Any]:
        base_price = Decimal(str(round(max(missing_qty * 8, 5), 2)))
        economy_price = Decimal(str(round(float(base_price) * 0.58, 2)))
        original_price = Decimal(str(round(float(base_price) * 1.22, 2)))

        def make_product(name: str, price: Decimal, tier: str, rating: str) -> ProductItem:
            return ProductItem(
                product_id=f"fallback_{ingredient.ingredient_id}_{tier}",
                name=name,
                price=price,
                original_price=original_price,
                unit="份",
                spec="1份",
                source="estimate",
                category="食材",
                rating=Decimal(rating),
                sales_count=100 if tier == "economy" else 500,
                match_score=Decimal("0.75"),
                tier=tier,
                unit_price=price,
            )

        if not standard_product:
            standard_product = make_product(f"精选{ingredient.name}", base_price, "premium", "4.7")
        if not economy_product:
            economy_product = make_product(f"特价{ingredient.name}", economy_price, "economy", "4.1")

        return standard_product, economy_product

    def _avg_quality(self, items: List[PurchasePlanItem]) -> Decimal:
        if not items:
            return Decimal("0")
        scores = [float(item.rating or 4.0) for item in items]
        return Decimal(str(round(sum(scores) / len(scores), 2)))

    def generate_purchase_plans(
        self,
        missing_ingredients: List[MissingIngredientAnalyze],
        db: Optional[Session] = None,
        user_id: Optional[int] = None,
        cooking_time: int = 30,
    ) -> Tuple[PurchasePlan, PurchasePlan, Optional[PriceComparison]]:
        standard_items: List[PurchasePlanItem] = []
        economy_items: List[PurchasePlanItem] = []
        standard_total = Decimal("0")
        economy_total = Decimal("0")
        standard_original = Decimal("0")
        economy_original = Decimal("0")

        for ingredient in missing_ingredients:
            missing_qty = float(ingredient.required_quantity - ingredient.current_quantity)
            if missing_qty <= 0:
                continue

            products = meituan_product_service.get_product_recommendations(
                ingredient.name, missing_qty
            )

            standard_product = self._select_standard_product(products, missing_qty) if products else None
            economy_product = self._select_economy_product(products, missing_qty) if products else None

            if not standard_product or not economy_product:
                standard_product, economy_product = self._build_fallback_products(
                    ingredient, missing_qty, standard_product, economy_product
                )

            std_price = standard_product.price
            eco_price = economy_product.price
            item_savings = max(Decimal("0"), std_price - eco_price)

            standard_items.append(
                self._build_plan_item(ingredient, missing_qty, standard_product)
            )
            economy_items.append(
                self._build_plan_item(ingredient, missing_qty, economy_product, item_savings)
            )

            standard_total += std_price
            economy_total += eco_price
            if standard_product.original_price:
                standard_original += standard_product.original_price
            if economy_product.original_price:
                economy_original += economy_product.original_price

        standard_discount = (
            max(Decimal("0"), standard_original - standard_total) if standard_original > 0 else Decimal("0")
        )
        economy_discount = (
            max(Decimal("0"), economy_original - economy_total) if economy_original > 0 else Decimal("0")
        )

        standard_meta = self.PLAN_META["standard"]
        economy_meta = self.PLAN_META["economy"]

        standard_plan = PurchasePlan(
            plan_type="standard",
            plan_name=standard_meta["name"],
            plan_description=standard_meta["description"],
            total_price=standard_total,
            original_price=standard_original,
            discount_amount=standard_discount,
            items=standard_items,
            cost_effectiveness=self._calculate_cost_effectiveness(standard_total, standard_items, "standard"),
            avg_quality_score=self._avg_quality(standard_items),
            strategy_tags=standard_meta["tags"],
        )

        economy_plan = PurchasePlan(
            plan_type="economy",
            plan_name=economy_meta["name"],
            plan_description=economy_meta["description"],
            total_price=economy_total,
            original_price=economy_original,
            discount_amount=economy_discount,
            items=economy_items,
            cost_effectiveness=self._calculate_cost_effectiveness(economy_total, economy_items, "economy"),
            avg_quality_score=self._avg_quality(economy_items),
            strategy_tags=economy_meta["tags"],
        )

        standard_plan = self._apply_coupons_to_plan(db, user_id, standard_plan)
        economy_plan = self._apply_coupons_to_plan(db, user_id, economy_plan)

        price_comparison = None
        if db and user_id:
            price_comparison = coupon_service.build_price_comparison(
                db,
                user_id,
                economy_plan.total_price,
                cooking_time=cooking_time,
                missing_count=len(missing_ingredients),
            )

        return standard_plan, economy_plan, price_comparison

    def _calculate_cost_effectiveness(
        self, total_price: Decimal, items: List[PurchasePlanItem], plan_type: str
    ) -> Decimal:
        if not items:
            return Decimal("0")

        premium_count = sum(1 for item in items if item.tier == "premium")
        economy_count = sum(1 for item in items if item.tier == "economy")
        avg_rating = sum(float(item.rating or 4.0) for item in items) / len(items)
        price_factor = max(0, 1 - float(total_price) / 120)

        if plan_type == "economy":
            score = 0.75 * price_factor + 0.15 * (economy_count / len(items)) + 0.1 * (avg_rating / 5)
        else:
            score = 0.35 * price_factor + 0.35 * (premium_count / len(items)) + 0.3 * (avg_rating / 5)

        return Decimal(str(round(min(score, 0.99), 2)))

    def compare_plans(self, standard_plan: PurchasePlan, economy_plan: PurchasePlan) -> Dict[str, Any]:
        """对比两方案，含逐项差异与推荐理由"""
        price_diff = standard_plan.total_price - economy_plan.total_price
        final_diff = standard_plan.final_price - economy_plan.final_price
        savings_pct = (
            float(price_diff / standard_plan.total_price * 100) if standard_plan.total_price > 0 else 0
        )

        item_diffs = []
        different_count = 0
        std_map = {item.ingredient_id: item for item in standard_plan.items}
        for eco_item in economy_plan.items:
            std_item = std_map.get(eco_item.ingredient_id)
            if not std_item:
                continue
            same_product = std_item.product_id == eco_item.product_id
            if not same_product:
                different_count += 1
            item_diffs.append(
                {
                    "ingredient_name": eco_item.name,
                    "standard_product": std_item.product_name,
                    "economy_product": eco_item.product_name,
                    "standard_price": float(std_item.price),
                    "economy_price": float(eco_item.price),
                    "price_diff": float(std_item.price - eco_item.price),
                    "standard_tier": std_item.tier,
                    "economy_tier": eco_item.tier,
                    "same_product": same_product,
                }
            )

        quality_diff = float(
            (standard_plan.avg_quality_score or Decimal("0")) - (economy_plan.avg_quality_score or Decimal("0"))
        )

        if final_diff >= 8:
            recommendation = "economy"
            reason = f"省钱版券后到手低¥{float(final_diff):.2f}，品质仅降{quality_diff:.1f}分，性价比更高"
        elif final_diff >= 3:
            recommendation = "economy"
            reason = f"省钱版可省¥{float(final_diff):.2f}（{savings_pct:.0f}%），{different_count}项换了更实惠的SKU"
        elif quality_diff >= 0.4:
            recommendation = "standard"
            reason = f"标准版品质高{quality_diff:.1f}分，优选有机/精选档，差价仅¥{float(final_diff):.2f}"
        else:
            recommendation = "standard"
            reason = "两方案价差较小，标准版品质更稳定，推荐优选档"

        return {
            "price_difference": float(price_diff),
            "final_price_difference": float(final_diff),
            "savings_percentage": round(savings_pct, 1),
            "item_count_difference": len(standard_plan.items) - len(economy_plan.items),
            "different_item_count": different_count,
            "avg_quality_standard": float(standard_plan.avg_quality_score or 0),
            "avg_quality_economy": float(economy_plan.avg_quality_score or 0),
            "quality_difference": round(quality_diff, 2),
            "standard_final_price": float(standard_plan.final_price),
            "economy_final_price": float(economy_plan.final_price),
            "item_diffs": item_diffs,
            "recommendation": recommendation,
            "recommendation_reason": reason,
        }


purchase_plan_service = PurchasePlanService()
