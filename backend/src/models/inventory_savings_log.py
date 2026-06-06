from datetime import datetime

from sqlalchemy import Column, Integer, String, DECIMAL, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from .base import Base


class InventorySavingsLog(Base):
    """库存管理省钱记录表"""

    __tablename__ = "inventory_savings_log"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="记录ID")
    user_id = Column(
        Integer, ForeignKey("user.id"), nullable=False, default=0, comment="用户ID"
    )
    event_type = Column(
        String(30),
        nullable=False,
        comment="事件类型: stock_used/coupon_saved/no_purchase/near_expiry_used/plan_saved",
    )
    saved_amount = Column(DECIMAL(10, 2), nullable=False, default=0.00, comment="节省金额")
    description = Column(Text, nullable=True, comment="事件描述")
    recipe_id = Column(Integer, ForeignKey("recipe_base.id"), nullable=True, comment="关联菜谱ID")
    created_at = Column(
        DateTime, nullable=False, default=datetime.utcnow, comment="创建时间"
    )

    user = relationship("User", back_populates="inventory_savings_logs")
