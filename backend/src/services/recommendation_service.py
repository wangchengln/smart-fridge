import copy
import json
from typing import List, Dict, Any, Tuple, Optional
from decimal import Decimal
from urllib.parse import quote
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from ..schemas.purchase import MissingIngredientAnalyze


class RecommendationService:
    """
    菜谱推荐服务 — 四象限决策模型
    Q1 食材充足 → 仅「自己做」
    Q2/Q3/Q4 食材不足 → 同一批菜谱同时出现在「闪购补料」「外卖」「新鲜预制」，
                        由用户自主选择怎么吃
    """

    # 新象限类型（对外主键）
    QUADRANT_TYPES = {
        "cook_self": {
            "quadrant": "Q1",
            "label": "自己做",
            "legacy_type": "no_purchase",
            "description": "库存充足，有时间，无需补购",
        },
        "flash_purchase_cook": {
            "quadrant": "Q2",
            "label": "闪购补料后做",
            "legacy_type": "small_purchase",
            "description": "库存略缺，闪购少量补料即可开做",
        },
        "takeout_delivery": {
            "quadrant": "Q3",
            "label": "外卖同款",
            "legacy_type": "takeout_alternative",
            "description": "食材不足或不想下厨，点外卖/拼好饭",
        },
        "premade_fresh": {
            "quadrant": "Q4",
            "label": "新鲜预制",
            "legacy_type": "premade_fresh",
            "description": "小象鲜食/便利店闪电仓，新鲜即食",
        },
    }

    LEGACY_TYPE_MAP = {
        "no_purchase": "cook_self",
        "small_purchase": "flash_purchase_cook",
        "takeout_alternative": "takeout_delivery",
        "premade_fresh": "premade_fresh",
    }

    WEIGHTS = {
        "existing_ingredients_ratio": 0.4,
        "missing_count_penalty": 0.3,
        "cooking_time_factor": 0.2,
        "category_bonus": 0.1,
    }

    FLASH_DELIVERY_MINUTES = 30
    PREMADE_DELIVERY_MINUTES = 28
    UNIT_INGREDIENT_PRICE = 5.0

    def normalize_recommendation_type(self, recommendation_type: str) -> str:
        """将历史/兼容类型名转为四象限类型"""
        if recommendation_type in self.QUADRANT_TYPES:
            return recommendation_type
        return self.LEGACY_TYPE_MAP.get(recommendation_type, recommendation_type)

    def calculate_match_score(
        self,
        recipe: Any,
        user_ingredients: Dict[int, float],
        recipe_requirements: List[Any],
    ) -> Tuple[float, float, List[Dict]]:
        total_required = 0
        total_existing = 0
        missing_ingredients = []

        for req in recipe_requirements:
            ingredient_id = req.ingredient_id
            required_qty = float(req.required_quantity)
            existing_qty = user_ingredients.get(ingredient_id, 0)

            total_required += required_qty

            if existing_qty >= required_qty:
                total_existing += required_qty
            else:
                if existing_qty > 0:
                    total_existing += existing_qty

                missing_qty = required_qty - existing_qty
                missing_ingredients.append(
                    {
                        "ingredient_id": ingredient_id,
                        "name": f"食材{ingredient_id}",
                        "required_quantity": required_qty,
                        "current_quantity": existing_qty,
                        "missing_quantity": missing_qty,
                    }
                )

        existing_ratio = total_existing / total_required if total_required > 0 else 0
        missing_count = len(missing_ingredients)

        base_score = existing_ratio
        missing_penalty = min(missing_count * 0.1, 0.5)
        time_factor = max(0, 1 - recipe.cooking_time / 120)
        category_bonus = 0.05

        match_score = (
            base_score
            - missing_penalty
            + (time_factor * self.WEIGHTS["cooking_time_factor"])
            + (category_bonus * self.WEIGHTS["category_bonus"])
        )
        match_score = max(0, min(1, match_score))

        return round(match_score, 4), round(existing_ratio, 4), missing_ingredients

    def is_premade_eligible(
        self,
        missing_count: int,
        cooking_time: int,
        *,
        has_time: bool = True,
    ) -> bool:
        """是否适合走新鲜预制通道（Q4）"""
        if cooking_time > 30 or missing_count > 3:
            return False
        if missing_count == 0 and has_time:
            return False
        return True

    def categorize_recommendation(
        self,
        missing_count: int,
        existing_ratio: float,
        cooking_time: int,
        *,
        has_time: bool = True,
        prefer_convenience: bool = False,
        prefer_premade: bool = False,
        prefer_takeout: bool = False,
    ) -> str:
        """
        基础分类（用于单条 enrich；分桶由 split_by_quadrant 决定）：
        食材充足 → 自己做；食材不足 → 默认闪购补料（同批菜谱会复制到 Q2/Q3/Q4）
        """
        if missing_count == 0:
            return "cook_self"
        return "flash_purchase_cook"

    def categorize_recommendation_legacy(self, missing_count: int) -> str:
        """兼容旧三类接口"""
        if missing_count == 0:
            return "no_purchase"
        if missing_count <= 3:
            return "small_purchase"
        return "takeout_alternative"

    def _estimate_purchase_cost(self, missing_ingredients_detail: List[Dict[str, Any]]) -> float:
        return round(
            sum(
                float(item.get("missing_quantity", 0)) * self.UNIT_INGREDIENT_PRICE
                for item in missing_ingredients_detail
            ),
            2,
        )

    def calculate_health_score(
        self,
        taste: str,
        cooking_time: int,
        recommendation_type: str,
    ) -> int:
        """健康评分 0-100，自制偏高、外卖/预制偏低"""
        taste_bonus = {
            "清淡": 15,
            "酸甜": 8,
            "咸鲜": 3,
            "麻辣": -5,
            "neutral": 0,
        }.get(taste or "neutral", 0)

        type_bonus = {
            "cook_self": 12,
            "no_purchase": 12,
            "flash_purchase_cook": 6,
            "small_purchase": 6,
            "premade_fresh": -3,
            "takeout_delivery": -12,
            "takeout_alternative": -12,
        }.get(recommendation_type, 0)

        time_bonus = 5 if cooking_time <= 20 else (0 if cooking_time <= 45 else -5)
        score = 72 + taste_bonus + type_bonus + time_bonus
        return max(30, min(100, int(round(score))))

    def build_cost_metrics(
        self,
        db: Session,
        user_id: int,
        recommendation_type: str,
        recipe_name: str,
        cooking_time: int,
        missing_ingredients_detail: List[Dict[str, Any]],
        existing_ratio: float,
        taste: str = "neutral",
    ) -> Dict[str, Any]:
        """
        构建金钱/时间/健康三维成本指标，含神券后实付。
        """
        from .coupon_service import coupon_service

        normalized = self.normalize_recommendation_type(recommendation_type)
        purchase_cost = self._estimate_purchase_cost(missing_ingredients_detail)
        missing_count = len(missing_ingredients_detail)
        health_score = self.calculate_health_score(taste, cooking_time, normalized)

        final_price_label = "用神券后实付"

        if normalized == "cook_self":
            money_cost = 0.0
            money_label = "食材成本（冰箱已有）"
            time_cost = cooking_time
            time_label = "烹饪时间"
            coupon_scopes = ["grocery", "all"]
            order_amount = Decimal("0")
            final_price_label = "额外支出（食材已有）"
        elif normalized == "flash_purchase_cook":
            money_cost = purchase_cost
            money_label = "闪购补料成本"
            time_cost = self.FLASH_DELIVERY_MINUTES + cooking_time
            time_label = "闪购送达+烹饪"
            coupon_scopes = ["grocery", "all"]
            order_amount = Decimal(str(purchase_cost))
        elif normalized == "premade_fresh":
            money_cost = round(15 + cooking_time * 0.35 + missing_count * 2.0, 2)
            money_label = "鲜食/便利店估价"
            time_cost = self.PREMADE_DELIVERY_MINUTES
            time_label = "闪电仓送达"
            coupon_scopes = ["grocery", "all"]
            order_amount = Decimal(str(money_cost))
        else:
            money_cost = round(18 + cooking_time * 0.6 + missing_count * 3.5, 2)
            money_label = "外卖估价"
            time_cost = int(25 + min(cooking_time // 3, 25))
            time_label = "配送+等待"
            coupon_scopes = ["delivery", "all"]
            order_amount = Decimal(str(money_cost))
            if normalized == "takeout_delivery":
                order_amount += coupon_service.DELIVERY_FEE

        discount = Decimal("0")
        best_coupon = None
        if order_amount > 0:
            discount, best_coupon = coupon_service.apply_best_coupon(
                db, user_id, order_amount, scopes=coupon_scopes
            )
        final_price = max(Decimal("0"), order_amount - discount)

        return {
            "money_cost": money_cost,
            "money_cost_label": money_label,
            "time_cost_minutes": time_cost,
            "time_cost_label": time_label,
            "health_score": health_score,
            "health_score_label": "健康评分",
            "original_price": float(order_amount),
            "coupon_discount": float(discount),
            "coupon_name": best_coupon.name if best_coupon else None,
            "final_price": float(final_price),
            "final_price_label": final_price_label,
            "quadrant": self.QUADRANT_TYPES[normalized]["quadrant"],
            "quadrant_label": self.QUADRANT_TYPES[normalized]["label"],
        }

    def generate_recommendation_reason(
        self,
        recommendation_type: str,
        match_score: float,
        existing_ratio: float,
        missing_count: int,
        cost_metrics: Optional[Dict[str, Any]] = None,
    ) -> str:
        normalized = self.normalize_recommendation_type(recommendation_type)
        final_price = cost_metrics.get("final_price") if cost_metrics else None
        price_hint = ""
        if cost_metrics and final_price is not None and float(final_price) > 0:
            price_hint = f"，{cost_metrics['final_price_label']}约¥{final_price:.2f}"

        if normalized == "cook_self":
            return (
                f"库存充足（利用率{existing_ratio * 100:.0f}%），"
                f"约{cost_metrics['time_cost_minutes'] if cost_metrics else 0}分钟可开饭，无需补购"
            )
        if normalized == "flash_purchase_cook":
            return (
                f"仅缺{missing_count}样食材，闪购补料后{price_hint or '即可制作'}，"
                f"健康评分{cost_metrics['health_score'] if cost_metrics else '-'}"
            )
        if normalized == "premade_fresh":
            return (
                f"小象鲜食/便利店有同款鲜食，"
                f"约{cost_metrics['time_cost_minutes'] if cost_metrics else self.PREMADE_DELIVERY_MINUTES}分钟送达"
                f"{price_hint}"
            )
        return self._takeout_reason_summary(missing_count, existing_ratio, price_hint)

    def _takeout_reason_summary(
        self,
        missing_count: int,
        existing_ratio: float,
        price_hint: str = "",
        *,
        prefer_takeout: bool = False,
        cooking_time: int = 0,
    ) -> str:
        if prefer_takeout:
            if missing_count == 0:
                return (
                    f"今日不想下厨，点外卖同款约省{cooking_time}分钟烹饪时间"
                    f"{price_hint}"
                )
            return (
                f"缺{missing_count}样食材且不想做，外卖同款/拼好饭更省事"
                f"{price_hint}"
            )
        return (
            f"冰箱食材仅覆盖{existing_ratio * 100:.0f}%，"
            f"缺{missing_count}样主料，外卖同款/拼好饭更省事{price_hint}"
        )

    def build_takeout_analysis(
        self,
        recipe_name: str,
        cooking_time: int,
        missing_ingredients_detail: List[Dict[str, Any]],
        existing_ratio: float,
        cost_metrics: Optional[Dict[str, Any]] = None,
        *,
        prefer_takeout: bool = False,
    ) -> Dict[str, Any]:
        missing_count = len(missing_ingredients_detail)
        purchase_cost = self._estimate_purchase_cost(missing_ingredients_detail)
        estimated_takeout = round(18 + cooking_time * 0.6 + missing_count * 3.5, 2)
        ping_hao_fan_price = round(estimated_takeout * 0.72, 2)
        delivery_time = int(25 + min(cooking_time // 3, 25))
        savings = round(purchase_cost - estimated_takeout, 2)

        if cost_metrics:
            estimated_takeout = cost_metrics.get("money_cost", estimated_takeout)
            delivery_time = cost_metrics.get("time_cost_minutes", delivery_time)
            if cost_metrics.get("final_price") is not None:
                ping_hao_fan_price = round(float(cost_metrics["final_price"]) * 0.85, 2)

        if prefer_takeout:
            if missing_count == 0:
                tip = (
                    f"今日不想下厨，外卖同款约¥{estimated_takeout:.0f}，"
                    f"拼好饭约¥{ping_hao_fan_price:.0f}更省心"
                )
            elif savings >= 5:
                tip = (
                    f"缺{missing_count}样且不想做，外卖约¥{estimated_takeout:.0f}，"
                    f"比补购做饭更省事"
                )
            else:
                tip = (
                    f"缺{missing_count}样食材，推荐美团外卖同款或拼好饭"
                )
            priority = "high"
        elif savings >= 8:
            tip = (
                f"预估补购约¥{purchase_cost:.0f}，外卖约¥{estimated_takeout:.0f}，"
                f"拼好饭约¥{ping_hao_fan_price:.0f}，推荐直接点外卖"
            )
            priority = "high"
        elif missing_count >= 6:
            tip = f"缺{missing_count}样食材，建议美团外卖点同款或拼好饭"
            priority = "high"
        elif purchase_cost >= 25:
            tip = f"补购成本约¥{purchase_cost:.0f}，外卖约¥{estimated_takeout:.0f}，省时省力"
            priority = "medium"
        else:
            tip = (
                f"食材利用率仅{existing_ratio * 100:.0f}%，"
                "可点外卖同款或拼好饭"
            )
            priority = "low"

        keyword = recipe_name.strip()
        order_url = f"https://waimai.meituan.com/search?query={quote(keyword)}"
        ping_hao_fan_url = f"https://waimai.meituan.com/search?query={quote(keyword + ' 拼好饭')}"

        return {
            "estimated_takeout_price": estimated_takeout,
            "estimated_purchase_cost": purchase_cost,
            "ping_hao_fan_price": ping_hao_fan_price,
            "delivery_time_minutes": delivery_time,
            "savings_vs_purchase": savings,
            "recommendation_tip": tip,
            "search_keyword": keyword,
            "platform": "meituan_waimai",
            "channels": [
                {"id": "waimai", "name": "外卖同款", "order_url": order_url},
                {"id": "ping_hao_fan", "name": "拼好饭", "order_url": ping_hao_fan_url},
            ],
            "order_url": order_url,
            "is_takeout_recommended": prefer_takeout or priority in ("high", "medium"),
            "priority": priority,
            "intent_takeout": prefer_takeout,
            "final_price": cost_metrics.get("final_price") if cost_metrics else None,
            "final_price_label": cost_metrics.get("final_price_label") if cost_metrics else "用神券后实付",
        }

    def build_premade_analysis(
        self,
        recipe_name: str,
        cooking_time: int,
        missing_ingredients_detail: List[Dict[str, Any]],
        cost_metrics: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        missing_count = len(missing_ingredients_detail)
        estimated_price = round(15 + cooking_time * 0.35 + missing_count * 2.0, 2)
        delivery_time = self.PREMADE_DELIVERY_MINUTES

        if cost_metrics:
            estimated_price = cost_metrics.get("money_cost", estimated_price)
            delivery_time = cost_metrics.get("time_cost_minutes", delivery_time)

        keyword = recipe_name.strip()
        xiaoxiang_url = f"https://www.meituan.com/s/{quote(keyword + ' 小象鲜食')}"
        convenience_url = f"https://www.meituan.com/s/{quote(keyword + ' 便利店')}"

        channel = "xiaoxiang" if cooking_time <= 20 else "convenience_flash"
        channel_name = "小象鲜食" if channel == "xiaoxiang" else "便利店闪电仓"
        order_url = xiaoxiang_url if channel == "xiaoxiang" else convenience_url

        tip = (
            f"{channel_name}有新鲜预制同款，约{delivery_time}分钟送达，"
            f"健康评分{cost_metrics['health_score'] if cost_metrics else '-'}"
        )
        if cost_metrics and cost_metrics.get("final_price") is not None:
            tip += f"，{cost_metrics['final_price_label']}约¥{cost_metrics['final_price']:.2f}"

        return {
            "estimated_premade_price": estimated_price,
            "delivery_time_minutes": delivery_time,
            "recommendation_tip": tip,
            "search_keyword": keyword,
            "platform": channel,
            "channel_name": channel_name,
            "channels": [
                {"id": "xiaoxiang", "name": "小象鲜食", "order_url": xiaoxiang_url},
                {"id": "convenience_flash", "name": "便利店闪电仓", "order_url": convenience_url},
            ],
            "order_url": order_url,
            "is_premade_recommended": True,
            "final_price": cost_metrics.get("final_price") if cost_metrics else None,
            "final_price_label": cost_metrics.get("final_price_label") if cost_metrics else "用神券后实付",
        }

    def build_purchase_analysis(
        self,
        recommendation_type: str,
        missing_ingredients_detail: List[Dict[str, Any]],
        cost_metrics: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        normalized = self.normalize_recommendation_type(recommendation_type)
        if not missing_ingredients_detail:
            return None

        missing_for_purchase = [
            MissingIngredientAnalyze(
                ingredient_id=item["ingredient_id"],
                name=item["name"],
                required_quantity=item["required_quantity"],
                current_quantity=item["current_quantity"],
            ).model_dump()
            for item in missing_ingredients_detail
        ]

        estimated_cost = self._estimate_purchase_cost(missing_ingredients_detail)
        if cost_metrics:
            estimated_cost = cost_metrics.get("money_cost", estimated_cost)

        return {
            "missing_ingredients": missing_for_purchase,
            "estimated_cost": estimated_cost,
            "flash_delivery_minutes": self.FLASH_DELIVERY_MINUTES,
            "purchase_urgency": "high" if normalized == "flash_purchase_cook" else "low",
            "final_price": cost_metrics.get("final_price") if cost_metrics else None,
            "final_price_label": cost_metrics.get("final_price_label") if cost_metrics else "用神券后实付",
        }

    def enrich_recommendation_item(
        self,
        db: Session,
        user_id: int,
        item: Dict[str, Any],
        taste: str = "neutral",
    ) -> Dict[str, Any]:
        """为单条推荐补全四象限元数据、成本指标与渠道分析"""
        normalized = self.normalize_recommendation_type(item["recommendation_type"])
        legacy_type = self.QUADRANT_TYPES[normalized]["legacy_type"]
        item["recommendation_type"] = normalized
        item["legacy_recommendation_type"] = legacy_type
        item["quadrant"] = self.QUADRANT_TYPES[normalized]["quadrant"]
        item["quadrant_label"] = self.QUADRANT_TYPES[normalized]["label"]

        cost_metrics = self.build_cost_metrics(
            db,
            user_id,
            normalized,
            item["name"],
            item["cooking_time"],
            item["missing_ingredients_detail"],
            item["existing_ingredients_ratio"],
            taste=taste,
        )
        item["cost_metrics"] = cost_metrics

        item["purchase_analysis"] = self.build_purchase_analysis(
            normalized,
            item["missing_ingredients_detail"],
            cost_metrics,
        )
        item["takeout_analysis"] = None
        item["premade_analysis"] = None

        prefer_takeout = bool(item.get("prefer_takeout"))

        if normalized == "takeout_delivery":
            item["takeout_analysis"] = self.build_takeout_analysis(
                item["name"],
                item["cooking_time"],
                item["missing_ingredients_detail"],
                item["existing_ingredients_ratio"],
                cost_metrics,
                prefer_takeout=prefer_takeout,
            )
            item["recommendation_reason"] = item["takeout_analysis"]["recommendation_tip"]
        elif normalized == "premade_fresh":
            item["premade_analysis"] = self.build_premade_analysis(
                item["name"],
                item["cooking_time"],
                item["missing_ingredients_detail"],
                cost_metrics,
            )
            item["recommendation_reason"] = item["premade_analysis"]["recommendation_tip"]
        else:
            item["recommendation_reason"] = self.generate_recommendation_reason(
                normalized,
                item["match_score"],
                item["existing_ingredients_ratio"],
                item["missing_ingredients_count"],
                cost_metrics,
            )

        return item

    def sort_takeout_recommendations(
        self, recommendations: List[Dict], *, prefer_takeout: bool = False
    ) -> List[Dict]:
        def sort_key(item: Dict) -> Tuple:
            analysis = item.get("takeout_analysis") or {}
            metrics = item.get("cost_metrics") or {}
            if prefer_takeout:
                return (
                    1 if analysis.get("is_takeout_recommended") else 0,
                    item.get("cooking_time", 0),
                    item.get("missing_ingredients_count", 0),
                    -float(metrics.get("final_price", 9999)),
                    item.get("match_score", 0),
                )
            return (
                1 if analysis.get("is_takeout_recommended") else 0,
                float(analysis.get("savings_vs_purchase", 0)),
                -float(metrics.get("final_price", 9999)),
                -item.get("missing_ingredients_count", 0),
                item.get("existing_ingredients_ratio", 0),
            )

        return sorted(recommendations, key=sort_key, reverse=True)

    def sort_premade_recommendations(self, recommendations: List[Dict]) -> List[Dict]:
        def sort_key(item: Dict) -> Tuple:
            metrics = item.get("cost_metrics") or {}
            return (
                metrics.get("health_score", 0),
                -metrics.get("final_price", 9999),
                -item.get("cooking_time", 999),
                item.get("match_score", 0),
            )

        return sorted(recommendations, key=sort_key, reverse=True)

    def filter_and_sort_recommendations(
        self,
        recommendations: List[Dict],
        recommendation_type: str = None,
        min_match_score: float = 0.1,
    ) -> List[Dict]:
        filtered = [r for r in recommendations if r["match_score"] >= min_match_score]

        if recommendation_type:
            normalized = self.normalize_recommendation_type(recommendation_type)
            filtered = [
                r
                for r in filtered
                if self.normalize_recommendation_type(r["recommendation_type"]) == normalized
            ]

        return sorted(
            filtered,
            key=lambda x: (
                x["match_score"],
                x.get("covered_ingredients_count", 0),
                x["existing_ingredients_ratio"],
                -x["missing_ingredients_count"],
            ),
            reverse=True,
        )

    def build_quadrant_variant(
        self,
        db: Session,
        user_id: int,
        source_item: Dict[str, Any],
        quadrant_type: str,
        taste: str = "neutral",
    ) -> Dict[str, Any]:
        """基于源推荐生成指定象限变体（补全对应渠道的成本与分析）"""
        variant = copy.deepcopy(source_item)
        variant.pop("recommendation_id", None)
        variant["recommendation_type"] = quadrant_type
        variant["prefer_takeout"] = quadrant_type == "takeout_delivery"
        return self.enrich_recommendation_item(db, user_id, variant, taste=taste)

    def split_by_quadrant(
        self,
        recommendations: List[Dict],
        db: Session,
        user_id: int,
        *,
        prefer_takeout: bool = False,
    ) -> Dict[str, List[Dict]]:
        """
        按库存分桶：
        - 食材充足 → 仅 Q1 自己做
        - 食材不足 → 同一批菜谱复制到 Q2 闪购 / Q3 外卖 / Q4 预制
        """
        buckets = {
            "cook_self_recipes": [],
            "flash_purchase_recipes": [],
            "takeout_delivery_recipes": [],
            "premade_fresh_recipes": [],
        }

        sufficient: List[Dict] = []
        insufficient: List[Dict] = []

        for item in recommendations:
            if item["missing_ingredients_count"] == 0:
                sufficient.append(item)
            else:
                insufficient.append(item)

        for item in sufficient:
            normalized = self.normalize_recommendation_type(item["recommendation_type"])
            if normalized == "cook_self":
                buckets["cook_self_recipes"].append(item)
            else:
                taste = item.get("taste", "neutral")
                buckets["cook_self_recipes"].append(
                    self.build_quadrant_variant(
                        db, user_id, item, "cook_self", taste=taste
                    )
                )

        for item in insufficient:
            taste = item.get("taste", "neutral")
            buckets["flash_purchase_recipes"].append(
                self.build_quadrant_variant(
                    db, user_id, item, "flash_purchase_cook", taste=taste
                )
            )
            buckets["takeout_delivery_recipes"].append(
                self.build_quadrant_variant(
                    db, user_id, item, "takeout_delivery", taste=taste
                )
            )
            buckets["premade_fresh_recipes"].append(
                self.build_quadrant_variant(
                    db, user_id, item, "premade_fresh", taste=taste
                )
            )

        buckets["takeout_delivery_recipes"] = self.sort_takeout_recommendations(
            buckets["takeout_delivery_recipes"],
            prefer_takeout=prefer_takeout,
        )
        buckets["premade_fresh_recipes"] = self.sort_premade_recommendations(
            buckets["premade_fresh_recipes"]
        )

        return buckets

    def build_response_payload(
        self,
        sorted_recommendations: List[Dict],
        db: Session,
        user_id: int,
        *,
        has_time: bool = True,
        prefer_takeout: bool = False,
    ) -> Dict[str, Any]:
        """构建 API 响应，同时保留旧字段名以兼容前端"""
        buckets = self.split_by_quadrant(
            sorted_recommendations,
            db,
            user_id,
            prefer_takeout=prefer_takeout,
        )

        return {
            "cook_self_recipes": buckets["cook_self_recipes"],
            "flash_purchase_recipes": buckets["flash_purchase_recipes"],
            "takeout_delivery_recipes": buckets["takeout_delivery_recipes"],
            "premade_fresh_recipes": buckets["premade_fresh_recipes"],
            "no_purchase_recipes": buckets["cook_self_recipes"],
            "small_purchase_recipes": buckets["flash_purchase_recipes"],
            "takeout_alternative_recipes": buckets["takeout_delivery_recipes"],
            "quadrant_summary": {
                "Q1": {
                    "type": "cook_self",
                    "label": "自己做",
                    "count": len(buckets["cook_self_recipes"]),
                },
                "Q2": {
                    "type": "flash_purchase_cook",
                    "label": "闪购补料后做",
                    "count": len(buckets["flash_purchase_recipes"]),
                },
                "Q3": {
                    "type": "takeout_delivery",
                    "label": "外卖同款/拼好饭",
                    "count": len(buckets["takeout_delivery_recipes"]),
                },
                "Q4": {
                    "type": "premade_fresh",
                    "label": "新鲜预制",
                    "count": len(buckets["premade_fresh_recipes"]),
                },
            },
        }

    def batch_analyze_missing_ingredients(
        self,
        user_id: int,
        recipe_recommendations: List[Dict],
    ) -> List[Dict]:
        analyzed_results = []

        for rec in recipe_recommendations:
            estimated_cost = self._estimate_purchase_cost(rec["missing_ingredients_detail"])
            rec["purchase_analysis"] = {
                "missing_ingredients": rec["missing_ingredients_detail"],
                "estimated_cost": estimated_cost,
                "purchase_urgency": (
                    "high"
                    if self.normalize_recommendation_type(rec["recommendation_type"])
                    == "flash_purchase_cook"
                    else "low"
                ),
            }
            analyzed_results.append(rec)

        return analyzed_results


recommendation_service = RecommendationService()
