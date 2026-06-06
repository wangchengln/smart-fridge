from datetime import datetime

from sqlalchemy import Column, String, DECIMAL, Text, DateTime, Integer, ForeignKey
from sqlalchemy.orm import relationship

from .base import Base


class PurchasePlanRecord(Base):
    """购买方案记录表模型"""

    __tablename__ = "purchase_plan_record"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="方案记录ID")
    user_id = Column(
        Integer, ForeignKey("user.id"), nullable=False, default=0, comment="用户ID"
    )
    recipe_id = Column(
        Integer, ForeignKey("recipe_base.id"), nullable=False, default=0, comment="菜谱ID"
    )
    plan_type_id = Column(
        Integer,
        ForeignKey("purchase_plan_type.id"),
        nullable=False,
        default=0,
        comment="方案类型ID",
    )
    plan_name = Column(String(100), nullable=False, comment="方案名称")
    total_price = Column(DECIMAL(10, 2), nullable=False, default=0.00, comment="总价")
    original_price = Column(DECIMAL(10, 2), nullable=True, comment="原价")
    discount_amount = Column(
        DECIMAL(10, 2), nullable=False, default=0.00, comment="优惠金额"
    )
    items_count = Column(Integer, nullable=False, default=0, comment="商品数量")
    plan_details = Column(Text, nullable=True, comment="方案详情(JSON格式)")
    status = Column(String(20), nullable=False, default="pending", comment="方案状态")
    created_at = Column(
        DateTime, nullable=False, default=datetime.utcnow, comment="创建时间"
    )
    expires_at = Column(DateTime, nullable=True, comment="过期时间")

    user = relationship("User", back_populates="purchase_plan_records")
    recipe = relationship("RecipeBase", back_populates="purchase_plan_records")
    plan_type = relationship("PurchasePlanType", back_populates="purchase_plan_records")
