from pydantic import BaseModel, Field, model_validator
from typing import List, Optional
from decimal import Decimal
from datetime import datetime

class IngredientRecognitionCreate(BaseModel):
    """食材识别请求模型"""
    image: str = Field(..., description="图片base64编码")
    type: str = Field(..., pattern="^(fridge|shopping_bag)$", description="识别类型")

class RecognizedIngredient(BaseModel):
    """识别出的食材模型"""
    ingredient_id: int
    name: str
    quantity: Decimal = Field(..., ge=0)
    confidence: float = Field(..., ge=0, le=1)

class IngredientRecognitionResponse(BaseModel):
    """食材识别响应模型"""
    ingredients: List[RecognizedIngredient]
    
    class Config:
        orm_mode = True

class OrderSyncCreate(BaseModel):
    """订单同步请求模型"""
    meituan_order_id: str = Field(..., min_length=1, description="美团订单ID")

class OrderSyncResponse(BaseModel):
    """订单同步响应模型"""
    sync_status: str
    ingredients: List[dict]
    
    class Config:
        orm_mode = True

class IngredientBaseItem(BaseModel):
    """食材基础库条目"""
    id: int
    name: str
    category: str
    shelf_life: int

    class Config:
        from_attributes = True


class IngredientBaseListResponse(BaseModel):
    """食材基础库列表响应"""
    ingredients: List[IngredientBaseItem]
    total_count: int


class StockUpdateCreate(BaseModel):
    """库存更新请求模型"""
    user_id: Optional[int] = Field(None, gt=0, description="用户ID")
    ingredient_id: Optional[int] = Field(None, gt=0, description="食材ID")
    ingredient_name: Optional[str] = Field(None, min_length=1, max_length=100, description="食材名称（手动输入）")
    category: Optional[str] = Field(None, max_length=50, description="食材分类（新食材时使用）")
    quantity: Decimal = Field(..., ge=0, description="数量")
    freshness: str = Field(..., min_length=1, description="新鲜度")

    @model_validator(mode="after")
    def validate_ingredient_reference(self):
        if not self.ingredient_id and not (self.ingredient_name and self.ingredient_name.strip()):
            raise ValueError("需要提供 ingredient_id 或 ingredient_name")
        return self

class StockUpdateResponse(BaseModel):
    """库存更新响应模型"""
    stock_id: int
    
    class Config:
        orm_mode = True

class NearExpiryIngredient(BaseModel):
    """临期食材模型"""
    stock_id: int
    ingredient_id: int
    ingredient_name: str
    quantity: float
    freshness: str
    storage_date: str
    shelf_life: int
    expiry_date: str
    days_remaining: int

class NearExpiryResponse(BaseModel):
    """临期食材响应模型"""
    total_count: int
    near_expiry_ingredients: List[NearExpiryIngredient]
    
    class Config:
        orm_mode = True

class CheckNearExpiryRequest(BaseModel):
    """检查临期食材请求模型"""
    user_id: int = Field(..., gt=0, description="用户ID")
    days_before_expiry: int = Field(2, ge=0, description="提前几天提醒")


class BatchUpdateNearExpiryRequest(BaseModel):
    """批量更新临期状态请求模型"""
    user_id: int = Field(..., gt=0, description="用户ID")
    stock_ids: List[int] = Field(..., min_items=1, description="库存ID列表")
    near_expiry: bool = Field(..., description="临期状态")

class BatchUpdateNearExpiryResponse(BaseModel):
    """批量更新临期状态响应模型"""
    updated_count: int
    success: bool
    message: str
    
    class Config:
        orm_mode = True
