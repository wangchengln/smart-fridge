from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship

from .base import Base


class IngredientBase(Base):
    """食材基础库表模型"""

    __tablename__ = "ingredient_base"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="食材ID")
    name = Column(String(100), nullable=False, default="", comment="食材名称")
    category = Column(String(50), nullable=False, default="", comment="食材分类")
    shelf_life = Column(Integer, nullable=False, default=7, comment="保鲜期(天)")
    common_pairings = Column(Text, nullable=True, comment="常见搭配(JSON格式)")

    user_ingredients = relationship("UserIngredient", back_populates="ingredient")
    recipe_relations = relationship("RecipeIngredientRel", back_populates="ingredient")
    product_matches = relationship("ProductMatch", back_populates="ingredient")
