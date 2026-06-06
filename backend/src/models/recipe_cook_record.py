from sqlalchemy import Column, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base


class RecipeCookRecord(Base):
    """用户做菜记录（每次「我做好了」记一条，用于集卡与月度统计）"""

    __tablename__ = "recipe_cook_record"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="记录ID")
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True, comment="用户ID")
    recipe_id = Column(
        Integer, ForeignKey("recipe_base.id"), nullable=False, index=True, comment="菜谱ID"
    )
    servings = Column(Integer, nullable=False, default=2, comment="用餐人数")
    cooked_at = Column(DateTime, nullable=False, default=datetime.utcnow, comment="完成时间")

    user = relationship("User", back_populates="recipe_cook_records")
    recipe = relationship("RecipeBase", back_populates="cook_records")
