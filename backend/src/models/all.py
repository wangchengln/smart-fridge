"""
SQLAlchemy 模型统一导出（导入即注册到统一 Base.metadata）
"""

from .base import Base
from .user import User
from .ingredient_base import IngredientBase
from .user_ingredient import UserIngredient
from .recipe_base import RecipeBase
from .recipe_ingredient_rel import RecipeIngredientRel
from .order_sync_rel import OrderSyncRel
from .image_recognition import ImageRecognition
from .recipe_recommendation import RecipeRecommendation
from .purchase_plan_type import PurchasePlanType
from .product_match import ProductMatch
from .purchase_plan_record import PurchasePlanRecord
from .recipe_cook_record import RecipeCookRecord
from .coupon_base import CouponBase
from .user_coupon import UserCoupon
from .inventory_savings_log import InventorySavingsLog

__all__ = [
    "Base",
    "User",
    "IngredientBase",
    "UserIngredient",
    "RecipeBase",
    "RecipeIngredientRel",
    "OrderSyncRel",
    "ImageRecognition",
    "RecipeRecommendation",
    "PurchasePlanType",
    "ProductMatch",
    "PurchasePlanRecord",
    "RecipeCookRecord",
    "CouponBase",
    "UserCoupon",
    "InventorySavingsLog",
]
