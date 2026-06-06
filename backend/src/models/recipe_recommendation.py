from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime, DECIMAL, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from .base import Base


class RecipeRecommendation(Base):
    """菜谱推荐记录表模型"""

    __tablename__ = "recipe_recommendation"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="推荐记录ID")
    user_id = Column(
        Integer, ForeignKey("user.id"), nullable=False, default=0, comment="用户ID"
    )
    recipe_id = Column(
        Integer, ForeignKey("recipe_base.id"), nullable=False, default=0, comment="菜谱ID"
    )
    recommendation_type = Column(
        String(20), nullable=False, default="no_purchase", comment="推荐类型"
    )
    match_score = Column(DECIMAL(5, 4), nullable=False, default=0.0000, comment="匹配度分数")
    existing_ingredients_ratio = Column(
        DECIMAL(5, 4), nullable=False, default=0.0000, comment="现有食材利用率"
    )
    missing_ingredients_count = Column(
        Integer, nullable=False, default=0, comment="缺失食材数量"
    )
    missing_ingredients_detail = Column(
        Text, nullable=True, comment="缺失食材详情(JSON格式)"
    )
    cooking_time = Column(Integer, nullable=False, default=30, comment="烹饪时长(分钟)")
    recommendation_reason = Column(String(200), nullable=True, comment="推荐理由")
    is_selected = Column(Boolean, nullable=False, default=False, comment="是否被用户选择")
    created_at = Column(
        DateTime, nullable=False, default=datetime.utcnow, comment="创建时间"
    )
    expires_at = Column(DateTime, nullable=True, comment="过期时间")

    user = relationship("User", back_populates="recipe_recommendations")
    recipe = relationship("RecipeBase", back_populates="recommendations")
