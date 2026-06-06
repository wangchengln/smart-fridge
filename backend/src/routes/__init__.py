"""
FastAPI 路由统一导出文件
包含所有业务接口路由定义
"""

from .user import router as user_router
from .ingredient import router as ingredient_router
from .image_recognition import router as image_recognition_router
from .recipe import router as recipe_router
from .purchase import router as purchase_router
from .coupon import router as coupon_router
from .scenario import router as scenario_router
from .fridge_agent import router as fridge_agent_router

__all__ = [
    "user_router",
    "ingredient_router",
    "image_recognition_router",
    "recipe_router",
    "purchase_router",
    "coupon_router",
    "scenario_router",
    "fridge_agent_router",
]
