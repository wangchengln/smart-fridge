from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship

from .base import Base


class OrderSyncRel(Base):
    """订单同步关联表模型"""

    __tablename__ = "order_sync_rel"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="关联ID")
    user_id = Column(
        Integer, ForeignKey("user.id"), nullable=False, default=0, comment="用户ID"
    )
    meituan_order_id = Column(
        String(100), nullable=False, default="", comment="美团订单ID"
    )
    ingredient_details = Column(
        Text, nullable=False, default="", comment="食材明细(JSON格式)"
    )
    sync_status = Column(
        String(20), nullable=False, default="pending", comment="同步状态"
    )

    user = relationship("User", back_populates="order_syncs")
