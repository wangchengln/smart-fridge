import hashlib
import random
from typing import List, Dict, Any, Optional
from decimal import Decimal

from ..schemas.purchase import ProductItem

PREMIUM_KEYWORDS = ("有机", "精选", "优质", "进口", "特级")
ECONOMY_KEYWORDS = ("实惠", "特价", "凑单", "散装", "特惠")


class MeituanProductService:
    """
    美团商品数据服务
    为每个食材生成 premium / standard / economy 三档 SKU，支撑标准版与省钱版差异化选品
    """

    def __init__(self):
        self.category_mapping = {
            "蔬菜": "vegetables",
            "水果": "fruits",
            "肉类": "meat",
            "蛋类": "eggs",
            "乳制品": "dairy",
            "海鲜": "seafood",
            "粮食": "grains",
            "调料": "seasonings",
            "豆制品": "beans",
            "菌类": "mushrooms",
        }

        self.mock_products = {
            "西红柿": self._build_tiered_catalog("西红柿", base_per_500g=8.5),
            "鸡蛋": self._build_tiered_catalog("鸡蛋", base_per_500g=16.0, unit_label="枚", specs=[10, 12, 30]),
            "胡萝卜": self._build_tiered_catalog("胡萝卜", base_per_500g=6.5),
            "土豆": self._build_tiered_catalog("土豆", base_per_500g=5.5),
            "猪肉": self._build_tiered_catalog("猪肉", base_per_500g=22.0),
            "鸡肉": self._build_tiered_catalog("鸡肉", base_per_500g=18.0),
            "豆腐": self._build_tiered_catalog("豆腐", base_per_500g=4.5),
        }

    def _build_tiered_catalog(
        self,
        ingredient_name: str,
        base_per_500g: float,
        unit_label: str = "g",
        specs: Optional[List[int]] = None,
    ) -> List[Dict[str, Any]]:
        """为单一食材构建三档商品池"""
        if specs is None:
            specs = [300, 500, 1000]

        tier_defs = [
            ("premium", "有机", 1.48, (4.7, 4.95), 800, 3500),
            ("standard", "新鲜", 1.0, (4.3, 4.65), 1200, 5000),
            ("economy", "实惠", 0.62, (3.9, 4.25), 2000, 8000),
        ]

        products = []
        for tier, prefix, price_mult, rating_range, sales_min, sales_max in tier_defs:
            for idx, spec_val in enumerate(specs):
                if unit_label == "枚":
                    spec_text = f"{spec_val}枚"
                    weight_factor = spec_val / 12
                    unit_price = round(base_per_500g * price_mult * weight_factor / spec_val, 3)
                    price = round(base_per_500g * price_mult * weight_factor, 2)
                else:
                    spec_text = f"{spec_val}g"
                    unit_price = round(base_per_500g * price_mult * (spec_val / 500) / spec_val, 4)
                    price = round(base_per_500g * price_mult * (spec_val / 500), 2)

                original = round(price * (1.18 if tier == "premium" else 1.12 if tier == "standard" else 1.08), 2)
                rating = round(rating_range[0] + (idx * 0.05), 2)
                rating = min(rating, rating_range[1])

                products.append(
                    {
                        "product_id": f"mt_{ingredient_name}_{tier}_{spec_val}",
                        "name": f"{prefix}{ingredient_name} {spec_text}",
                        "price": price,
                        "original_price": original,
                        "unit": spec_text,
                        "spec": f"{spec_text}/份",
                        "rating": rating,
                        "sales_count": sales_min + idx * 400,
                        "tier": tier,
                        "unit_price": unit_price,
                        "spec_amount": spec_val,
                        "image_url": f"https://photo.bj.ide.test.sankuai.com/?keyword={ingredient_name}&width=200&height=200",
                    }
                )
        return products

    def _seed_from_name(self, ingredient_name: str) -> random.Random:
        digest = hashlib.md5(ingredient_name.encode("utf-8")).hexdigest()
        return random.Random(int(digest[:8], 16))

    def search_products(self, ingredient_name: str, category: str = None) -> List[Dict[str, Any]]:
        if ingredient_name in self.mock_products:
            return self.mock_products[ingredient_name]
        return self._generate_mock_products(ingredient_name, category)

    def _generate_mock_products(self, ingredient_name: str, category: str) -> List[Dict[str, Any]]:
        """未知食材：按名称哈希确定性生成三档商品"""
        rng = self._seed_from_name(ingredient_name)
        base_per_500g = round(rng.uniform(6, 28), 2)
        return self._build_tiered_catalog(ingredient_name, base_per_500g=base_per_500g)

    def infer_tier(self, product_name: str, explicit_tier: str = None) -> str:
        if explicit_tier in ("premium", "standard", "economy"):
            return explicit_tier
        if any(kw in product_name for kw in PREMIUM_KEYWORDS):
            return "premium"
        if any(kw in product_name for kw in ECONOMY_KEYWORDS):
            return "economy"
        return "standard"

    def calculate_match_score(self, ingredient_name: str, product_name: str) -> float:
        ingredient_lower = ingredient_name.lower()
        product_lower = product_name.lower()
        if ingredient_lower in product_lower:
            base = 0.88
        elif any(word in product_lower for word in ingredient_lower):
            base = 0.72
        else:
            base = 0.45
        rng = self._seed_from_name(f"{ingredient_name}:{product_name}")
        return round(base + rng.uniform(0, 0.1), 2)

    def sort_products(self, products: List[Dict[str, Any]], sort_by: str = "match_score") -> List[Dict[str, Any]]:
        if sort_by == "price":
            return sorted(products, key=lambda x: x["price"])
        if sort_by == "rating":
            return sorted(products, key=lambda x: x["rating"], reverse=True)
        if sort_by == "sales":
            return sorted(products, key=lambda x: x["sales_count"], reverse=True)
        if sort_by == "match_score":
            return sorted(products, key=lambda x: x.get("match_score", 0), reverse=True)
        return products

    def get_product_recommendations(
        self,
        ingredient_name: str,
        quantity: float,
        category: str = None,
        sort_by: str = "match_score",
    ) -> List[ProductItem]:
        raw_products = self.search_products(ingredient_name, category)

        product_items = []
        for product in raw_products:
            match_score = self.calculate_match_score(ingredient_name, product["name"])
            tier = product.get("tier") or self.infer_tier(product["name"])

            product_items.append(
                ProductItem(
                    product_id=product["product_id"],
                    name=product["name"],
                    price=Decimal(str(product["price"])),
                    original_price=Decimal(str(product["original_price"]))
                    if product.get("original_price")
                    else None,
                    unit=product["unit"],
                    spec=product.get("spec"),
                    image_url=product.get("image_url"),
                    source="meituan",
                    category=category,
                    rating=Decimal(str(product["rating"])) if product.get("rating") else None,
                    sales_count=product.get("sales_count"),
                    match_score=Decimal(str(match_score)),
                    tier=tier,
                    unit_price=Decimal(str(product.get("unit_price", product["price"]))),
                )
            )

        sortable = [{**item.model_dump(), "match_score": float(item.match_score)} for item in product_items]
        sorted_products = self.sort_products(sortable, sort_by)
        return [ProductItem(**item) for item in sorted_products]


meituan_product_service = MeituanProductService()
