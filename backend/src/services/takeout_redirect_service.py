"""
美团外卖跳转服务
封装「前往美团外卖」页面的 mock 数据逻辑，复用推荐服务中的外卖分析能力
"""

from typing import Any, Dict, List, Optional
from urllib.parse import quote


class TakeoutRedirectService:
    """美团外卖跳转与外卖页 mock 数据"""

    PLATFORM = "meituan_waimai"
    PLATFORM_NAME = "美团外卖"
    HOME_URL = "https://waimai.meituan.com/"

    HOT_SEARCHES = [
        "黄焖鸡米饭",
        "麻辣烫",
        "螺蛳粉",
        "麻辣香锅",
        "酸菜鱼",
        "炸鸡",
        "披萨",
        "沙拉轻食",
    ]

    TASTE_KEYWORDS = {
        "清淡": ["清蒸鱼", "白灼菜心", "粥品"],
        "麻辣": ["麻辣烫", "麻辣香锅", "水煮鱼"],
        "酸甜": ["糖醋里脊", "番茄炒蛋", "酸菜鱼"],
        "咸鲜": ["黄焖鸡米饭", "卤肉饭", "盖浇饭"],
    }

    MERCHANT_PREFIXES = [
        "好滋味",
        "老地方",
        "巷子里",
        "招牌",
        "人气",
        "经典",
    ]

    MERCHANT_SUFFIXES = [
        "（望京店）",
        "（三里屯店）",
        "（国贸店）",
        "（中关村店）",
        "（五道口店）",
    ]

    FEATURE_TAGS = [
        "拌面劲道爽滑",
        "现做现卖",
        "分量足",
        "回头客多",
        "招牌必点",
        "口味正宗",
    ]

    KITCHEN_BADGES = ["明厨亮灶", "无"]

    DELIVERY_PROVIDERS = ["美团快送", "美团专送", "商家自配"]

    def build_order_url(self, keyword: str = "") -> str:
        """构建美团外卖搜索链接（演示用）"""
        trimmed = (keyword or "").strip()
        if not trimmed:
            return self.HOME_URL
        return f"{self.HOME_URL}search?query={quote(trimmed)}"

    def build_channels(self, keyword: str) -> List[Dict[str, str]]:
        """构建外卖渠道列表（外卖同款 / 拼好饭）"""
        trimmed = (keyword or "").strip()
        search_term = trimmed or "附近美食"
        order_url = self.build_order_url(search_term)
        ping_hao_fan_url = self.build_order_url(f"{search_term} 拼好饭")
        return [
            {"id": "waimai", "name": "外卖同款", "order_url": order_url},
            {"id": "ping_hao_fan", "name": "拼好饭", "order_url": ping_hao_fan_url},
        ]

    def resolve_search_keyword(self, preference: Optional[str] = None) -> str:
        """根据口味偏好解析搜索关键词"""
        if preference and preference.strip():
            return preference.strip()
        return ""

    def build_hot_searches(self, preference: Optional[str] = None) -> List[str]:
        """根据口味偏好生成热门搜索词"""
        if preference and preference in self.TASTE_KEYWORDS:
            return self.TASTE_KEYWORDS[preference] + self.HOT_SEARCHES[:4]
        return self.HOT_SEARCHES

    def _infer_category(self, name: str) -> str:
        """根据菜名推断店铺分类"""
        if "拼好饭" in name:
            return "ping_hao_fan"
        if any(k in name for k in ("饭", "面", "粉", "粥", "饺", "包")):
            return "staple"
        if any(k in name for k in ("汤", "羹")):
            return "soup"
        return "hot"

    def build_store_info(self, keyword: str = "") -> Dict[str, Any]:
        """构建外卖店铺信息（对标小象超市闪购页）"""
        store_name = (
            f"{keyword}风味外卖（望京店）" if keyword else "附近热门外卖（望京店）"
        )
        return {
            "name": store_name,
            "rating": 4.8,
            "monthly_sales": "8000+",
            "delivery_time": "35分钟",
            "delivery_fee": 3,
            "min_order": 15,
            "distance": "1.5km",
            "address": "北京市朝阳区望京街道",
            "badge": "美团外卖",
        }

    def build_store_items(
        self, recipes: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """将外卖推荐菜谱转为店铺菜品列表"""
        items: List[Dict[str, Any]] = []
        for index, recipe in enumerate(recipes):
            analysis = recipe.get("takeout_analysis") or {}
            cost_metrics = recipe.get("cost_metrics") or {}
            name = recipe.get("name", "外卖菜品")
            recipe_id = recipe.get("recipe_id", index + 1)
            price = float(
                analysis.get("estimated_takeout_price")
                or cost_metrics.get("final_price")
                or 25
            )
            ping_hao_fan_price = analysis.get("ping_hao_fan_price")
            image_url = recipe.get("image_url") or ""
            match_score = float(recipe.get("match_score", 0.5))
            order_url = analysis.get("order_url") or self.build_order_url(name)

            items.append(
                {
                    "product_id": f"takeout-{recipe_id}",
                    "recipe_id": recipe_id,
                    "name": f"{name} 外卖同款",
                    "price": price,
                    "original_price": round(price * 1.15, 2),
                    "ping_hao_fan_price": float(ping_hao_fan_price)
                    if ping_hao_fan_price is not None
                    else None,
                    "unit": "份",
                    "spec": "1人份",
                    "image_url": image_url,
                    "category": self._infer_category(name),
                    "rating": round(4.5 + (index % 5) * 0.08, 1),
                    "sales_count": 500 + index * 237,
                    "match_score": match_score,
                    "channel": "waimai",
                    "order_url": order_url,
                }
            )

            if ping_hao_fan_price is not None:
                phf_price = float(ping_hao_fan_price)
                items.append(
                    {
                        "product_id": f"phf-{recipe_id}",
                        "recipe_id": recipe_id,
                        "name": f"{name} 拼好饭",
                        "price": phf_price,
                        "original_price": round(phf_price * 1.2, 2),
                        "ping_hao_fan_price": phf_price,
                        "unit": "份",
                        "spec": "拼好饭·1人份",
                        "image_url": image_url,
                        "category": "ping_hao_fan",
                        "rating": round(4.3 + (index % 4) * 0.1, 1),
                        "sales_count": 1200 + index * 189,
                        "match_score": match_score,
                        "channel": "ping_hao_fan",
                        "order_url": self.build_order_url(f"{name} 拼好饭"),
                    }
                )
        return items

    def build_recommendation_tip(self, keyword: str, recipe_count: int) -> str:
        """生成外卖页推荐提示"""
        if keyword:
            return (
                f"今日不想下厨，已为你匹配 {recipe_count} 道「{keyword}」风味外卖同款，"
                "可直接前往美团外卖下单"
            )
        if recipe_count > 0:
            return (
                f"今日不想下厨，已为你匹配 {recipe_count} 道外卖同款/拼好饭，"
                "可直接前往美团外卖"
            )
        return "今日不想下厨，前往美团外卖发现附近美食"

    def prioritize_recipe(
        self,
        recipes: List[Dict[str, Any]],
        focus_recipe_id: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """将指定菜谱置顶展示"""
        if not focus_recipe_id or not recipes:
            return recipes
        focused = [r for r in recipes if r.get("recipe_id") == focus_recipe_id]
        rest = [r for r in recipes if r.get("recipe_id") != focus_recipe_id]
        if not focused:
            return recipes
        return focused + rest

    def build_promotions(
        self,
        recipes: List[Dict[str, Any]],
        keyword: str = "",
    ) -> List[Dict[str, Any]]:
        """构建顶部促销横滑卡片"""
        promotions: List[Dict[str, Any]] = []
        source = recipes[:8] if recipes else [{"name": keyword or "附近美食"}]

        for index, recipe in enumerate(source):
            analysis = recipe.get("takeout_analysis") or {}
            cost_metrics = recipe.get("cost_metrics") or {}
            name = recipe.get("name") or keyword or "热门外卖"
            recipe_id = recipe.get("recipe_id")
            price = float(
                analysis.get("estimated_takeout_price")
                or cost_metrics.get("final_price")
                or round(12.9 + index * 1.5, 1)
            )
            image_url = recipe.get("image_url") or ""
            order_url = analysis.get("order_url") or self.build_order_url(name)

            promotions.append(
                {
                    "id": f"promo-{recipe_id or index + 1}",
                    "title": name,
                    "price": round(price, 1),
                    "price_label": "一口价",
                    "image_url": image_url,
                    "badge": "免配送费",
                    "recipe_id": recipe_id,
                    "order_url": order_url,
                }
            )
        return promotions

    def _build_merchant_name(self, dish_name: str, index: int) -> str:
        """根据菜名生成商家名称"""
        prefix = self.MERCHANT_PREFIXES[index % len(self.MERCHANT_PREFIXES)]
        suffix = self.MERCHANT_SUFFIXES[index % len(self.MERCHANT_SUFFIXES)]
        if len(dish_name) <= 4:
            return f"{prefix}{dish_name}{suffix}"
        return f"{prefix}{dish_name[:6]}{suffix}"

    def _build_merchant_promotions(
        self, index: int, price: float
    ) -> List[Dict[str, str]]:
        """生成商家优惠标签"""
        promos: List[Dict[str, str]] = [
            {"type": "coupon", "text": f"神券 满{int(price * 1.5)}减{int(price * 0.35)}"},
        ]
        if index % 2 == 0:
            promos.append({"type": "collect", "text": "收藏领1元券"})
        if index % 3 == 0:
            promos.append({"type": "discount", "text": "满35减6"})
        return promos

    def build_merchants(
        self,
        recipes: List[Dict[str, Any]],
        keyword: str = "",
    ) -> List[Dict[str, Any]]:
        """将外卖推荐转为附近商家列表"""
        merchants: List[Dict[str, Any]] = []
        source = recipes if recipes else [{"name": keyword or "附近美食"}]

        for index, recipe in enumerate(source[:12]):
            analysis = recipe.get("takeout_analysis") or {}
            cost_metrics = recipe.get("cost_metrics") or {}
            dish_name = recipe.get("name") or keyword or "热门菜品"
            recipe_id = recipe.get("recipe_id", index + 1)
            image_url = recipe.get("image_url") or ""
            match_score = float(recipe.get("match_score", 0.5))
            price = float(
                analysis.get("estimated_takeout_price")
                or cost_metrics.get("final_price")
                or 25
            )
            delivery_minutes = int(analysis.get("delivery_time_minutes") or (30 + index * 3))
            delivery_fee = 0 if index % 3 != 2 else 3
            min_order = 15 if index % 2 == 0 else 20
            merchant_name = self._build_merchant_name(dish_name, index)
            distance_km = round(1.2 + index * 0.45, 1)
            area = self.MERCHANT_SUFFIXES[index % len(self.MERCHANT_SUFFIXES)].strip("（）")

            store_info = {
                "name": merchant_name,
                "rating": round(4.5 + (index % 5) * 0.08, 1),
                "monthly_sales": f"{400 + index * 137}+",
                "delivery_time": f"{delivery_minutes}分钟",
                "delivery_fee": delivery_fee,
                "min_order": min_order,
                "distance": f"{distance_km}km",
                "address": f"北京市朝阳区{area}",
                "badge": "美团外卖",
            }

            merchants.append(
                {
                    "merchant_id": f"merchant-{recipe_id}",
                    "name": merchant_name,
                    "image_url": image_url,
                    "rating": store_info["rating"],
                    "monthly_sales": store_info["monthly_sales"],
                    "min_order": min_order,
                    "delivery_fee": delivery_fee,
                    "delivery_fee_label": "免配送费" if delivery_fee == 0 else f"配送 ¥{delivery_fee}",
                    "distance": store_info["distance"],
                    "delivery_time": store_info["delivery_time"],
                    "feature_tag": self.FEATURE_TAGS[index % len(self.FEATURE_TAGS)],
                    "delivery_provider": self.DELIVERY_PROVIDERS[
                        index % len(self.DELIVERY_PROVIDERS)
                    ],
                    "kitchen_badge": self.KITCHEN_BADGES[0]
                    if index % 4 == 0
                    else None,
                    "promotions": self._build_merchant_promotions(index, price),
                    "match_score": match_score,
                    "recipe_id": recipe_id,
                    "is_food_plaza": False,
                    "social_proof": None,
                    "is_special_offer": index % 3 == 1,
                    "store_info": store_info,
                }
            )

        if merchants:
            plaza = {
                **merchants[0],
                "merchant_id": "merchant-plaza",
                "name": "大连理工附近美食",
                "is_food_plaza": True,
                "social_proof": "用户刚刚下单了招牌拌面 · 3位用户购买了同款",
                "feature_tag": "多店聚合",
                "is_special_offer": False,
            }
            merchants.insert(min(2, len(merchants)), plaza)

        return merchants

    def build_takeout_redirect(
        self,
        *,
        preference: Optional[str] = None,
        takeout_recipes: Optional[List[Dict[str, Any]]] = None,
        focus_recipe_id: Optional[int] = None,
        focus_recipe_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        构建「前往美团外卖」页面数据
        复用推荐服务中的 takeout_analysis 逻辑，聚合跳转链接与推荐列表
        """
        keyword = self.resolve_search_keyword(preference)
        recipes = self.prioritize_recipe(takeout_recipes or [], focus_recipe_id)
        if focus_recipe_name:
            keyword = focus_recipe_name.strip() or keyword
        order_url = self.build_order_url(keyword)
        channels = self.build_channels(keyword)

        tip = self.build_recommendation_tip(keyword, len(recipes))
        if focus_recipe_name:
            tip = f"为「{focus_recipe_name}」匹配外卖同款，可直接前往美团外卖下单"

        return {
            "platform": self.PLATFORM,
            "platform_name": self.PLATFORM_NAME,
            "search_keyword": keyword,
            "order_url": order_url,
            "home_url": self.HOME_URL,
            "recommendation_tip": tip,
            "channels": channels,
            "hot_searches": self.build_hot_searches(preference),
            "store_info": self.build_store_info(keyword),
            "store_items": self.build_store_items(recipes),
            "promotions": self.build_promotions(recipes, keyword),
            "merchants": self.build_merchants(recipes, keyword),
            "takeout_delivery_recipes": recipes,
            "total_count": len(recipes),
            "intent_takeout": True,
        }


takeout_redirect_service = TakeoutRedirectService()
