from pydantic import BaseModel, Field
from typing import List, Optional
from decimal import Decimal

from .coupon import MatchedCoupon, PriceComparison, UserCouponItem

class MissingIngredientAnalyze(BaseModel):
    """缺失食材分析项模型"""
    ingredient_id: int
    name: str
    required_quantity: Decimal = Field(..., ge=0)
    current_quantity: Decimal = Field(..., ge=0)

class PurchaseAnalyzeCreate(BaseModel):
    """补购分析请求模型"""
    recipe_id: int = Field(..., gt=0, description="菜谱ID")
    user_id: int = Field(..., gt=0, description="用户ID")
    servings: Optional[int] = Field(
        None,
        ge=1,
        le=12,
        description="用餐人数；不传则使用菜谱基准人份",
    )

class PurchaseAnalyzeResponse(BaseModel):
    """补购分析响应模型"""
    missing_ingredients: List[MissingIngredientAnalyze]
    
    class Config:
        orm_mode = True

class PurchasePlanCreate(BaseModel):
    """补购方案生成请求模型"""
    missing_ingredients: List[MissingIngredientAnalyze]
    plan_type: Optional[str] = Field("standard", description="方案类型: standard/economy")
    user_id: Optional[int] = Field(None, gt=0, description="用户ID，用于神券匹配")
    recipe_id: Optional[int] = Field(None, gt=0, description="菜谱ID，用于到手价对比")
    cooking_time: Optional[int] = Field(None, ge=0, description="烹饪时长(分钟)")

class PurchasePlanItem(BaseModel):
    """补购方案项模型"""
    ingredient_id: int
    name: str
    quantity: Decimal
    price: Decimal
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    unit: Optional[str] = None
    spec: Optional[str] = None
    tier: Optional[str] = Field(None, description="商品档次: premium/standard/economy")
    rating: Optional[Decimal] = Field(None, ge=0, le=5, description="商品评分")
    unit_price: Optional[Decimal] = Field(None, ge=0, description="单位价格(元/规格)")
    savings_vs_standard: Optional[Decimal] = Field(None, description="相对标准版节省金额")

class PurchasePlan(BaseModel):
    """补购方案模型"""
    plan_type: str = Field(..., description="方案类型")
    plan_name: str = Field(..., description="方案名称")
    plan_description: Optional[str] = Field(None, description="方案策略说明")
    total_price: Decimal = Field(..., ge=0)
    original_price: Optional[Decimal] = Field(None, ge=0)
    discount_amount: Decimal = Field(..., ge=0)
    items: List[PurchasePlanItem]
    cost_effectiveness: Optional[Decimal] = Field(None, ge=0)  # 性价比评分
    avg_quality_score: Optional[Decimal] = Field(None, ge=0, le=5, description="平均品质分")
    strategy_tags: List[str] = Field(default_factory=list, description="策略标签")
    matched_coupons: List[MatchedCoupon] = Field(default_factory=list, description="匹配的神券")
    coupon_discount: Decimal = Field(Decimal("0"), ge=0, description="神券抵扣金额")
    final_price: Decimal = Field(Decimal("0"), ge=0, description="券后到手价")

class PurchasePlanResponse(BaseModel):
    """补购方案响应模型"""
    standard_plan: Optional[PurchasePlan] = Field(None, description="标准版方案")
    economy_plan: Optional[PurchasePlan] = Field(None, description="省钱版方案")
    comparison: Optional[dict] = Field(None, description="方案对比")
    price_comparison: Optional[PriceComparison] = Field(
        None, description="自己买+做 vs 外卖+券后价对比"
    )
    available_coupons: List[UserCouponItem] = Field(
        default_factory=list, description="用户可用神券列表"
    )

    class Config:
        orm_mode = True

class ProductMatchCreate(BaseModel):
    """商品匹配请求模型"""
    ingredient_id: int = Field(..., gt=0, description="食材ID")
    quantity: Decimal = Field(..., ge=0, description="数量")
    sort_by: Optional[str] = Field("match_score", description="排序方式: price/rating/sales/match_score")

class ProductItem(BaseModel):
    """商品项模型"""
    product_id: str
    name: str
    price: Decimal = Field(..., ge=0)
    original_price: Optional[Decimal] = Field(None, ge=0)
    unit: str
    spec: Optional[str] = None
    image_url: Optional[str] = None
    source: str
    category: Optional[str] = None
    rating: Optional[Decimal] = Field(None, ge=0, le=5)
    sales_count: Optional[int] = Field(None, ge=0)
    match_score: Decimal = Field(..., ge=0, le=1)
    tier: Optional[str] = Field(None, description="商品档次: premium/standard/economy")
    unit_price: Optional[Decimal] = Field(None, ge=0, description="单位价格")

class ProductMatchResponse(BaseModel):
    """商品匹配响应模型"""
    products: List[ProductItem]
    total_count: int
    
    class Config:
        orm_mode = True

class OrderCreate(BaseModel):
    """下单请求模型"""
    products: List[ProductItem]
    user_id: int = Field(..., gt=0, description="用户ID")
    plan_type: Optional[str] = Field("standard", description="方案类型")

class OrderResponse(BaseModel):
    """下单响应模型"""
    redirect_url: str
    order_id: str
    total_amount: Decimal
    plan_details: Optional[dict] = None
    
    class Config:
        orm_mode = True

class PurchasePlanSelectionCreate(BaseModel):
    """方案选择请求模型"""
    user_id: int = Field(..., gt=0, description="用户ID")
    recipe_id: int = Field(..., gt=0, description="菜谱ID")
    plan_type: str = Field(..., description="选择的方案类型")
    plan_details: dict = Field(..., description="方案详情")

class PurchasePlanSelectionResponse(BaseModel):
    """方案选择响应模型"""
    selection_id: int
    plan_type: str
    total_price: Decimal
    success: bool
    message: str
    weekly_saved_amount: Optional[Decimal] = Field(None, ge=0, description="本周累计省钱")

    class Config:
        orm_mode = True
