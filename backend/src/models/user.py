from sqlalchemy import Column, Integer, String, Boolean, Text
from sqlalchemy.orm import relationship

from .base import Base


class User(Base):
    """用户表模型"""

    __tablename__ = "user"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="用户ID")
    phone = Column(String(11), nullable=False, unique=True, default="", comment="手机号")
    nickname = Column(String(50), nullable=False, default="", comment="用户昵称")
    family_count = Column(Integer, nullable=False, default=1, comment="家庭人数")
    family_type = Column(String(20), nullable=False, default="default", comment="家庭类型")
    taste_preference = Column(Text, nullable=True, comment="口味偏好(JSON格式)")
    parent_mode = Column(Boolean, nullable=False, default=False, comment="爸妈模式开关")
    dietary_mode = Column(String(20), nullable=False, default="normal", comment="饮食模式: normal/fat_loss/parents")
    on_antihypertensive = Column(Boolean, nullable=False, default=False, comment="是否服用降压药")

    ingredients = relationship("UserIngredient", back_populates="user")
    image_recognitions = relationship("ImageRecognition", back_populates="user")
    order_syncs = relationship("OrderSyncRel", back_populates="user")
    recipe_recommendations = relationship("RecipeRecommendation", back_populates="user")
    purchase_plan_records = relationship("PurchasePlanRecord", back_populates="user")
    recipe_cook_records = relationship("RecipeCookRecord", back_populates="user")
    user_coupons = relationship("UserCoupon", back_populates="user")
    inventory_savings_logs = relationship("InventorySavingsLog", back_populates="user")
