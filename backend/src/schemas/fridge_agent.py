from decimal import Decimal
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from .coupon import MatchedCoupon


class FridgeAgentHistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=4000)


class FridgeAgentChatRequest(BaseModel):
    user_id: int = Field(..., gt=0)
    message: str = Field(..., min_length=1, max_length=500)
    history: List[FridgeAgentHistoryItem] = Field(default_factory=list, max_length=10)


class FridgeAgentCartItem(BaseModel):
    sku_id: str
    sku_name: str
    ingredient_id: int
    ingredient_name: str
    quantity: Decimal
    unit: str
    spec: Optional[str] = None
    price: Decimal
    tier: Optional[str] = None
    rating: Optional[Decimal] = None


class FridgeAgentRecipeItem(BaseModel):
    recipe_id: int
    recipe_name: str
    cooking_time: int
    match_score: float
    missing_ingredients_count: int
    covered_ingredients: List[str] = Field(default_factory=list)


class FridgeAgentPriceEstimate(BaseModel):
    total_price: Decimal
    original_price: Optional[Decimal] = None
    discount_amount: Decimal = Decimal("0")
    coupon_discount: Decimal = Decimal("0")
    final_price: Decimal
    matched_coupons: List[MatchedCoupon] = Field(default_factory=list)
    savings_label: Optional[str] = None


class FridgeAgentStructuredResult(BaseModel):
    scenario_type: Optional[str] = None
    scenario_label: Optional[str] = None
    people_count: Optional[int] = None
    in_stock: List[str] = Field(default_factory=list)
    missing: List[str] = Field(default_factory=list)
    coverage_summary: Optional[str] = None
    recipes: List[FridgeAgentRecipeItem] = Field(default_factory=list)
    flash_cart: List[FridgeAgentCartItem] = Field(default_factory=list)
    price_estimate: Optional[FridgeAgentPriceEstimate] = None
    bundle_sku_id: Optional[str] = None
    redirect_label: Optional[str] = None
    redirect_url: Optional[str] = None


class FridgeAgentChatResponse(BaseModel):
    answer: str
    model: str
    provider: str = "deepseek"
    tool_calls_made: List[str] = Field(default_factory=list)
    structured: Optional[FridgeAgentStructuredResult] = None


class FridgeAgentStatusResponse(BaseModel):
    configured: bool
    model: str
    provider: str = "deepseek"
    tagline: str = "说一句话，但先看过你的冰箱里面有什么"
