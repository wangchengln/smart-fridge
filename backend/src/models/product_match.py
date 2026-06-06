from datetime import datetime

from sqlalchemy import Column, String, DECIMAL, Text, DateTime, Integer, ForeignKey
from sqlalchemy.orm import relationship

from .base import Base


class ProductMatch(Base):
    """商品匹配表模型"""

    __tablename__ = "product_match"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="商品匹配ID")
    ingredient_id = Column(
        Integer,
        ForeignKey("ingredient_base.id"),
        nullable=False,
        default=0,
        comment="食材ID",
    )
    product_id = Column(String(100), nullable=False, comment="美团商品ID")
    product_name = Column(String(200), nullable=False, comment="商品名称")
    price = Column(DECIMAL(10, 2), nullable=False, default=0.00, comment="商品价格")
    original_price = Column(DECIMAL(10, 2), nullable=True, comment="原价")
    unit = Column(String(20), nullable=False, default="", comment="单位")
    spec = Column(String(100), nullable=True, comment="规格")
    image_url = Column(String(255), nullable=True, comment="商品图片URL")
    source = Column(String(20), nullable=False, default="meituan", comment="商品来源")
    category = Column(String(50), nullable=True, comment="商品分类")
    rating = Column(DECIMAL(3, 2), nullable=True, comment="评分")
    sales_count = Column(Integer, nullable=True, default=0, comment="销量")
    stock_status = Column(
        String(20), nullable=False, default="in_stock", comment="库存状态"
    )
    match_score = Column(DECIMAL(5, 4), nullable=False, default=0.0000, comment="匹配度分数")
    created_at = Column(
        DateTime, nullable=False, default=datetime.utcnow, comment="创建时间"
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        comment="更新时间",
    )

    ingredient = relationship("IngredientBase", back_populates="product_matches")
