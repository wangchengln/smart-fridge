from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from .base import Base


class UserCoupon(Base):
    """用户可用神券表"""

    __tablename__ = "user_coupon"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="用户券ID")
    user_id = Column(
        Integer, ForeignKey("user.id"), nullable=False, default=0, comment="用户ID"
    )
    coupon_id = Column(
        Integer, ForeignKey("coupon_base.id"), nullable=False, comment="券模板ID"
    )
    status = Column(
        String(20), nullable=False, default="available", comment="状态: available/used/expired"
    )
    received_at = Column(
        DateTime, nullable=False, default=datetime.utcnow, comment="领取时间"
    )
    expires_at = Column(DateTime, nullable=False, comment="过期时间")
    used_at = Column(DateTime, nullable=True, comment="使用时间")

    user = relationship("User", back_populates="user_coupons")
    coupon = relationship("CouponBase", back_populates="user_coupons")
