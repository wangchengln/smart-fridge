from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from decimal import Decimal

from .recipe_collection import RecipeBadgeItem


class MatchScoreResult(BaseModel):
    """匹配度计算结果"""
    match_score: Decimal = Field(..., ge=0, le=1, description="匹配度分数")
    existing_ingredients_ratio: Decimal = Field(..., ge=0, le=1, description="现有食材利用率")
    missing_ingredients_count: int = Field(..., ge=0, description="缺失食材数量")


class RecommendationCostMetrics(BaseModel):
    """推荐三维成本指标（含神券后实付）"""
    money_cost: Decimal = Field(..., description="金钱成本估价")
    money_cost_label: str = Field(..., description="金钱成本说明")
    time_cost_minutes: int = Field(..., ge=0, description="时间成本（分钟）")
    time_cost_label: str = Field(..., description="时间成本说明")
    health_score: int = Field(..., ge=0, le=100, description="健康评分 0-100")
    health_score_label: str = Field(default="健康评分", description="健康评分说明")
    original_price: Decimal = Field(..., description="券前原价")
    coupon_discount: Decimal = Field(default=Decimal("0"), description="神券抵扣金额")
    coupon_name: Optional[str] = Field(None, description="使用的神券名称")
    final_price: Decimal = Field(..., description="用神券后实付")
    final_price_label: str = Field(default="用神券后实付", description="实付价标签")
    quadrant: str = Field(..., description="象限编号 Q1-Q4")
    quadrant_label: str = Field(..., description="象限中文标签")


class TakeoutChannel(BaseModel):
    id: str
    name: str
    order_url: str


class TakeoutAnalysis(BaseModel):
    """外卖/拼好饭渠道分析"""
    estimated_takeout_price: Decimal
    estimated_purchase_cost: Decimal
    ping_hao_fan_price: Optional[Decimal] = None
    delivery_time_minutes: int
    savings_vs_purchase: Decimal
    recommendation_tip: str
    search_keyword: str
    platform: str
    channels: Optional[List[TakeoutChannel]] = None
    order_url: str
    is_takeout_recommended: bool
    priority: Optional[str] = None
    final_price: Optional[Decimal] = None
    final_price_label: Optional[str] = "用神券后实付"


class PremadeAnalysis(BaseModel):
    """小象鲜食/便利店闪电仓分析"""
    estimated_premade_price: Decimal
    delivery_time_minutes: int
    recommendation_tip: str
    search_keyword: str
    platform: str
    channel_name: str
    channels: Optional[List[TakeoutChannel]] = None
    order_url: str
    is_premade_recommended: bool = True
    final_price: Optional[Decimal] = None
    final_price_label: Optional[str] = "用神券后实付"


class QuadrantSummaryItem(BaseModel):
    type: str
    label: str
    count: int


class RecommendationItem(BaseModel):
    """推荐结果项"""
    recommendation_id: Optional[int] = None
    recipe_id: int
    name: str
    cooking_time: int
    image_url: Optional[str] = ""
    recommendation_type: str = Field(
        ..., description="四象限类型: cook_self/flash_purchase_cook/takeout_delivery/premade_fresh"
    )
    legacy_recommendation_type: Optional[str] = Field(
        None, description="兼容旧类型: no_purchase/small_purchase/takeout_alternative/premade_fresh"
    )
    quadrant: Optional[str] = Field(None, description="象限编号 Q1-Q4")
    quadrant_label: Optional[str] = Field(None, description="象限中文标签")
    match_score: Decimal
    existing_ingredients_ratio: Decimal
    missing_ingredients_count: int
    missing_ingredients_detail: List[Dict[str, Any]]
    recommendation_reason: str
    cost_metrics: Optional[RecommendationCostMetrics] = None
    purchase_analysis: Optional[Dict[str, Any]] = None
    takeout_analysis: Optional[TakeoutAnalysis] = Field(
        None, description="外卖推荐分析（takeout_delivery 类型）"
    )
    premade_analysis: Optional[PremadeAnalysis] = Field(
        None, description="新鲜预制分析（premade_fresh 类型）"
    )


class RecommendationResponse(BaseModel):
    """四象限推荐响应（保留旧字段名兼容）"""
    cook_self_recipes: List[RecommendationItem] = Field(
        default=[], description="Q1 自己做（库存充足+有时间）"
    )
    flash_purchase_recipes: List[RecommendationItem] = Field(
        default=[], description="Q2 闪购补料后做（库存略缺+想省事）"
    )
    takeout_delivery_recipes: List[RecommendationItem] = Field(
        default=[], description="Q3 外卖同款/拼好饭（完全没料/不想做）"
    )
    premade_fresh_recipes: List[RecommendationItem] = Field(
        default=[], description="Q4 新鲜预制（小象鲜食/便利店闪电仓）"
    )
    no_purchase_recipes: List[RecommendationItem] = Field(
        default=[], description="[兼容] 同 cook_self_recipes"
    )
    small_purchase_recipes: List[RecommendationItem] = Field(
        default=[], description="[兼容] 同 flash_purchase_recipes"
    )
    takeout_alternative_recipes: List[RecommendationItem] = Field(
        default=[], description="[兼容] 同 takeout_delivery_recipes"
    )
    quadrant_summary: Optional[Dict[str, QuadrantSummaryItem]] = None
    total_count: int
    generated_at: str


class RecipeSelectionRequest(BaseModel):
    """菜谱选择请求"""
    recommendation_id: int = Field(..., gt=0, description="推荐记录ID")
    is_selected: bool = Field(..., description="是否选择")
    servings: Optional[int] = Field(2, ge=1, le=12, description="用餐人数（选择时写入集卡）")


class RecipeSelectionResponse(BaseModel):
    """菜谱选择响应（选择菜谱时同步完成厨艺集卡）"""
    recommendation_id: int
    is_selected: bool
    success: bool
    message: str
    recipe_id: Optional[int] = None
    recipe_name: Optional[str] = None
    cook_id: Optional[int] = None
    is_new_badge: Optional[bool] = None
    cook_count: Optional[int] = None
    badge: Optional[RecipeBadgeItem] = None


class RecommendationStats(BaseModel):
    """推荐统计"""
    total_recommendations: int
    type_breakdown: Dict[str, int]
    selected_count: int


class ClearRecommendationCacheResponse(BaseModel):
    """清除推荐缓存响应"""
    deleted_count: int
    message: str


class TakeoutStoreInfo(BaseModel):
    """外卖店铺信息"""
    name: str
    rating: float = Field(..., ge=0, le=5)
    monthly_sales: str
    delivery_time: str
    delivery_fee: float = Field(..., ge=0)
    min_order: float = Field(..., ge=0)
    distance: str
    address: str
    badge: str = "美团外卖"


class TakeoutStoreItem(BaseModel):
    """外卖店铺菜品"""
    product_id: str
    recipe_id: Optional[int] = None
    name: str
    price: Decimal
    original_price: Optional[Decimal] = None
    ping_hao_fan_price: Optional[Decimal] = None
    unit: str = "份"
    spec: str = "1人份"
    image_url: Optional[str] = ""
    category: str = "hot"
    rating: float = Field(..., ge=0, le=5)
    sales_count: int = Field(..., ge=0)
    match_score: float = Field(..., ge=0, le=1)
    channel: str = "waimai"
    order_url: Optional[str] = None


class TakeoutPromotion(BaseModel):
    """外卖顶部促销横滑卡片"""
    id: str
    title: str
    price: Decimal
    price_label: str = "一口价"
    image_url: Optional[str] = ""
    badge: str = "免配送费"
    recipe_id: Optional[int] = None
    order_url: Optional[str] = None


class TakeoutMerchantPromotion(BaseModel):
    """商家优惠标签"""
    type: str
    text: str


class TakeoutMerchant(BaseModel):
    """附近外卖商家"""
    merchant_id: str
    name: str
    image_url: Optional[str] = ""
    rating: float = Field(..., ge=0, le=5)
    monthly_sales: str
    min_order: float = Field(..., ge=0)
    delivery_fee: float = Field(..., ge=0)
    delivery_fee_label: str = "免配送费"
    distance: str
    delivery_time: str
    feature_tag: Optional[str] = None
    delivery_provider: str = "美团快送"
    kitchen_badge: Optional[str] = None
    promotions: List[TakeoutMerchantPromotion] = Field(default_factory=list)
    match_score: float = Field(default=0.5, ge=0, le=1)
    recipe_id: Optional[int] = None
    is_food_plaza: bool = False
    social_proof: Optional[str] = None
    is_special_offer: bool = False
    store_info: TakeoutStoreInfo


class TakeoutRedirectResponse(BaseModel):
    """前往美团外卖页面数据"""
    platform: str = Field(..., description="平台标识")
    platform_name: str = Field(..., description="平台名称")
    search_keyword: str = Field(default="", description="搜索关键词")
    order_url: str = Field(..., description="美团外卖跳转链接")
    home_url: str = Field(..., description="美团外卖首页")
    recommendation_tip: str = Field(..., description="推荐提示文案")
    channels: List[TakeoutChannel] = Field(default=[], description="外卖渠道")
    hot_searches: List[str] = Field(default=[], description="热门搜索词")
    store_info: TakeoutStoreInfo = Field(..., description="外卖店铺信息")
    store_items: List[TakeoutStoreItem] = Field(default=[], description="店铺菜品列表")
    promotions: List[TakeoutPromotion] = Field(default=[], description="顶部促销横滑")
    merchants: List[TakeoutMerchant] = Field(default=[], description="附近商家列表")
    takeout_delivery_recipes: List[RecommendationItem] = Field(
        default=[], description="外卖同款推荐列表"
    )
    total_count: int = Field(default=0, ge=0, description="推荐总数")
    intent_takeout: bool = Field(default=True, description="是否来自「不想做」意图")


class AdvancedRecommendationRequest(BaseModel):
    """高级推荐请求"""
    user_id: int = Field(..., gt=0, description="用户ID")
    preference: Optional[str] = Field(None, description="口味偏好")
    max_cooking_time: Optional[int] = Field(None, ge=1, description="最大烹饪时间(分钟)")
    recommendation_types: Optional[List[str]] = Field(None, description="指定推荐类型")
    min_match_score: Optional[Decimal] = Field(None, ge=0, le=1, description="最低匹配度分数")
    limit: Optional[int] = Field(20, ge=1, le=50, description="返回结果数量限制")
    has_time: Optional[bool] = Field(True, description="是否有时间下厨")
    prefer_convenience: Optional[bool] = Field(False, description="是否倾向省事")
    prefer_premade: Optional[bool] = Field(False, description="是否倾向新鲜预制")
    prefer_takeout: Optional[bool] = Field(False, description="是否倾向外卖")
