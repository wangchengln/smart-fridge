from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship

from .base import Base


class RecipeBase(Base):
    """菜谱基础表模型"""

    __tablename__ = "recipe_base"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="菜谱ID")
    name = Column(String(200), nullable=False, default="", comment="菜谱名称")
    cooking_time = Column(Integer, nullable=False, default=30, comment="烹饪时长(分钟)")
    taste = Column(String(50), nullable=False, default="neutral", comment="口味")
    serving_size = Column(Integer, nullable=False, default=2, comment="适用人数")
    steps = Column(Text, nullable=False, default="", comment="制作步骤(JSON格式)")
    image_url = Column(String(500), nullable=False, default="", comment="封面图路径")

    ingredient_relations = relationship("RecipeIngredientRel", back_populates="recipe")
    recommendations = relationship("RecipeRecommendation", back_populates="recipe")
    purchase_plan_records = relationship("PurchasePlanRecord", back_populates="recipe")
    cook_records = relationship("RecipeCookRecord", back_populates="recipe")
