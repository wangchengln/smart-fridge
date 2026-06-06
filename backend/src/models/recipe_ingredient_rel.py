from sqlalchemy import Column, Integer, DECIMAL, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from .base import Base


class RecipeIngredientRel(Base):
    """菜谱食材关联表模型"""

    __tablename__ = "recipe_ingredient_rel"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="关联ID")
    recipe_id = Column(
        Integer, ForeignKey("recipe_base.id"), nullable=False, default=0, comment="菜谱ID"
    )
    ingredient_id = Column(
        Integer,
        ForeignKey("ingredient_base.id"),
        nullable=False,
        default=0,
        comment="食材ID",
    )
    required_quantity = Column(
        DECIMAL(10, 2), nullable=False, default=1.00, comment="所需数量"
    )
    is_required = Column(Boolean, nullable=False, default=True, comment="是否必需")

    recipe = relationship("RecipeBase", back_populates="ingredient_relations")
    ingredient = relationship("IngredientBase", back_populates="recipe_relations")
