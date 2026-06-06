from pydantic import BaseModel, Field
from typing import List, Optional
from decimal import Decimal
from datetime import datetime


class CouponBaseItem(BaseModel):
    """神券模板"""
    id: int
    coupon_type: str = Field(..., description="flash_sale/delivery/cross_store")
    name: str
    description: Optional[str] = None
    discount_type: str = Field(..., description="fixed/percent")
    discount_value: Decimal
    min_order_amount: Decimal
    max_discount: Optional[Decimal] = None
    applicable_scope: str = Field(..., description="grocery/delivery/all")

    class Config:
        orm_mode = True


class UserCouponItem(BaseModel):
    """用户可用神券"""
    user_coupon_id: int
    coupon_id: int
    coupon_type: str
    name: str
    description: Optional[str] = None
    discount_type: str
    discount_value: Decimal
    min_order_amount: Decimal
    max_discount: Optional[Decimal] = None
    applicable_scope: str
    status: str
    expires_at: datetime
    estimated_discount: Optional[Decimal] = Field(None, description="预估可抵扣金额")
    is_applicable: bool = Field(False, description="当前订单是否可用")

    class Config:
        orm_mode = True


class MatchedCoupon(BaseModel):
    """方案匹配到的神券"""
    user_coupon_id: int
    coupon_id: int
    coupon_type: str
    name: str
    discount_amount: Decimal = Field(..., ge=0)
    min_order_amount: Decimal
    is_best: bool = False


class PriceComparisonBreakdown(BaseModel):
    """价格明细"""
    subtotal: Decimal
    coupon_discount: Decimal = Decimal("0")
    delivery_fee: Decimal = Decimal("0")
    final_price: Decimal


class PriceComparison(BaseModel):
    """自己买+做 vs 外卖+券后价 对比"""
    cook_self: PriceComparisonBreakdown
    takeout: PriceComparisonBreakdown
    recommended: str = Field(..., description="cook_self/takeout")
    savings_amount: Decimal = Field(..., description="推荐方案相对另一方案节省金额")
    savings_tip: str


class WeeklySavingsResponse(BaseModel):
    """本周库存管理省钱统计"""
    weekly_saved_amount: Decimal
    week_start: datetime
    breakdown: dict = Field(default_factory=dict, description="按事件类型汇总")
    recent_logs: List[dict] = Field(default_factory=list)


class UserCouponsResponse(BaseModel):
    """用户神券列表响应"""
    coupons: List[UserCouponItem]
    total_count: int
