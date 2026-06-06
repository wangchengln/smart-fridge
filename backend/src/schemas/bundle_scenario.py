from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from decimal import Decimal

from .coupon import MatchedCoupon


class BundleSkuItem(BaseModel):
    """Bundle 内单个 SKU（闪购组合购的最小可售单元）"""
    sku_id: str = Field(..., description="美团 SKU ID")
    sku_name: str = Field(..., description="SKU 名称")
    ingredient_id: int
    ingredient_name: str
    quantity: Decimal = Field(..., ge=0)
    unit: str
    spec: Optional[str] = None
    price: Decimal = Field(..., ge=0)
    tier: Optional[str] = Field(None, description="premium/standard/economy")
    rating: Optional[Decimal] = Field(None, ge=0, le=5)


class OrderableBundle(BaseModel):
    """可下单 Bundle — 对应美团闪购 2025 组合 SKU 策略"""
    bundle_id: str
    bundle_sku_id: str = Field(..., description="组合购 SKU，一键加购")
    bundle_name: str
    bundle_type: str = Field(..., description="cook_shop | weekend_restock | home_gathering")
    description: str
    items: List[BundleSkuItem]
    item_count: int
    total_price: Decimal = Field(..., ge=0)
    original_price: Optional[Decimal] = Field(None, ge=0)
    discount_amount: Decimal = Field(Decimal("0"), ge=0)
    matched_coupons: List[MatchedCoupon] = Field(default_factory=list)
    coupon_discount: Decimal = Field(Decimal("0"), ge=0)
    final_price: Decimal = Field(..., ge=0)
    redirect_channel: str = Field(
        ...,
        description="flash_sale | xiaoxiang_scheduled | flash_combo",
    )
    redirect_label: str
    redirect_url: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    coverage_summary: Optional[str] = None
    context: Dict[str, Any] = Field(default_factory=dict)


class FridgeCoverageDetail(BaseModel):
    """库存覆盖详情 — 突出「先查库存再补齐」"""
    covered_count: int = Field(..., ge=0)
    total_count: int = Field(..., ge=0)
    covered_items: List[str] = Field(default_factory=list)
    missing_items: List[str] = Field(default_factory=list)
    coverage_rate: float = Field(..., ge=0, le=1, description="0~1 覆盖率")


class ScenarioSuggestion(BaseModel):
    """场景智能推荐"""
    scenario: str
    scenario_label: str
    reason: str
    urgency: str = Field("medium", description="high | medium | low")
    badge: Optional[str] = None
    action_hint: Optional[str] = None


class ScenarioPreviewResponse(BaseModel):
    """进入场景页前的冰箱洞察 — 主动服务入口"""
    headline: str
    subheadline: str
    fridge_total: int = Field(..., ge=0)
    near_expiry_count: int = Field(..., ge=0)
    near_expiry_items: List[str] = Field(default_factory=list)
    suggested_scenario: Optional[ScenarioSuggestion] = None
    scenarios: List[ScenarioSuggestion] = Field(default_factory=list)


class ScenarioBundleResponse(BaseModel):
    """场景 Bundle 响应"""
    scenario: str
    scenario_label: str
    message: str
    headline: Optional[str] = None
    recommendation_reasons: List[str] = Field(default_factory=list)
    fridge_coverage: Optional[FridgeCoverageDetail] = None
    stock_savings_hint: Optional[str] = None
    bundle: OrderableBundle
    recipe_id: Optional[int] = None
    recipe_name: Optional[str] = None
    near_expiry_used: List[str] = Field(default_factory=list)


class CookShopScenarioRequest(BaseModel):
    """买菜做饭场景：临期优先菜谱 + 缺料补购 Bundle"""
    user_id: int = Field(..., gt=0)
    recipe_id: Optional[int] = Field(None, gt=0, description="指定菜谱，不传则自动推荐临期优先")
    servings: Optional[int] = Field(None, ge=1, le=12)


class WeekendRestockScenarioRequest(BaseModel):
    """周末补货场景：按家庭人数生成周采购 Bundle"""
    user_id: int = Field(..., gt=0)
    family_count: Optional[int] = Field(None, ge=1, le=12, description="不传则读取用户档案")


class HomeGatheringScenarioRequest(BaseModel):
    """居家聚会场景：库存盘点 + 缺口 Bundle"""
    user_id: int = Field(..., gt=0)
    event_type: str = Field("hotpot", description="聚会类型: hotpot/bbq")
    guest_count: int = Field(..., ge=2, le=20, description="聚会人数")


class BundleOrderCreate(BaseModel):
    """Bundle 下单请求"""
    bundle_id: str
    bundle_sku_id: str
    user_id: int = Field(..., gt=0)
    scenario: str
    total_amount: Decimal = Field(..., ge=0)
    item_count: int = Field(..., ge=1)
    redirect_channel: Optional[str] = None
    redirect_label: Optional[str] = None


class BundleOrderResponse(BaseModel):
    """Bundle 下单响应"""
    order_id: str
    bundle_id: str
    bundle_sku_id: str
    redirect_url: str
    total_amount: Decimal
    item_count: int
    redirect_channel: str
    redirect_label: str
