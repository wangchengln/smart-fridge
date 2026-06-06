from datetime import datetime

from sqlalchemy import Column, Integer, DECIMAL, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from .base import Base


class UserIngredient(Base):
    """用户食材库存表模型"""

    __tablename__ = "user_ingredient"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="库存ID")
    user_id = Column(
        Integer, ForeignKey("user.id"), nullable=False, default=0, comment="用户ID"
    )
    ingredient_id = Column(
        Integer,
        ForeignKey("ingredient_base.id"),
        nullable=False,
        default=0,
        comment="食材ID",
    )
    quantity = Column(DECIMAL(10, 2), nullable=False, default=1.00, comment="数量")
    freshness = Column(String(20), nullable=False, default="fresh", comment="新鲜度")
    storage_method = Column(
        String(20), nullable=False, default="manual", comment="入库方式"
    )
    near_expiry = Column(Boolean, nullable=False, default=False, comment="临期标记")
    storage_date = Column(
        DateTime, nullable=False, default=datetime.utcnow, comment="入库时间"
    )

    user = relationship("User", back_populates="ingredients")
    ingredient = relationship("IngredientBase", back_populates="user_ingredients")
