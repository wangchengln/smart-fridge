from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship

from .base import Base


class PurchasePlanType(Base):
    """补购方案类型表模型"""

    __tablename__ = "purchase_plan_type"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="方案类型ID")
    name = Column(String(50), nullable=False, comment="方案名称")
    description = Column(Text, nullable=True, comment="方案描述")
    priority = Column(Integer, nullable=False, default=0, comment="优先级")
    is_active = Column(Integer, nullable=False, default=1, comment="是否启用")

    purchase_plan_records = relationship(
        "PurchasePlanRecord", back_populates="plan_type"
    )
