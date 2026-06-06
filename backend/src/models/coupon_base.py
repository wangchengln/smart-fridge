from sqlalchemy import Column, Integer, String, DECIMAL, Text
from sqlalchemy.orm import relationship

from .base import Base


class CouponBase(Base):
    """美团神券模板表"""

    __tablename__ = "coupon_base"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="券模板ID")
    coupon_type = Column(
        String(20),
        nullable=False,
        comment="券类型: flash_sale(闪购券)/delivery(外卖券)/cross_store(跨店券)",
    )
    name = Column(String(100), nullable=False, comment="券名称")
    description = Column(Text, nullable=True, comment="券描述")
    discount_type = Column(
        String(20), nullable=False, default="fixed", comment="优惠类型: fixed/percent"
    )
    discount_value = Column(DECIMAL(10, 2), nullable=False, default=0.00, comment="优惠面值")
    min_order_amount = Column(
        DECIMAL(10, 2), nullable=False, default=0.00, comment="最低消费门槛"
    )
    max_discount = Column(DECIMAL(10, 2), nullable=True, comment="最高优惠上限(百分比券)")
    applicable_scope = Column(
        String(20), nullable=False, default="grocery", comment="适用范围: grocery/delivery/all"
    )

    user_coupons = relationship("UserCoupon", back_populates="coupon")
