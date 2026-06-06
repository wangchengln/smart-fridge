from pydantic import BaseModel, Field
from typing import List, Optional
from decimal import Decimal

class RecipeRecommendCreate(BaseModel):
    """菜谱推荐请求模型"""
    user_id: int = Field(..., gt=0, description="用户ID")
    preference: Optional[str] = Field(None, description="偏好")
    max_missing: Optional[int] = Field(None, ge=0, description="最大缺失食材数")

class MissingIngredient(BaseModel):
    """缺失食材模型"""
    ingredient_id: int
    name: str
    required_quantity: Decimal
    current_quantity: Decimal

class RecipeRecommendItem(BaseModel):
    """推荐菜谱项模型"""
    recipe_id: int
    name: str
    cooking_time: int
    missing_ingredients: List[MissingIngredient]

class RecipeRecommendResponse(BaseModel):
    """菜谱推荐响应模型"""
    recipes: List[RecipeRecommendItem]
    
    class Config:
        orm_mode = True

class RecipeDetailResponse(BaseModel):
    """菜谱详情响应模型"""
    recipe_id: int
    name: str
    cooking_time: int
    serving_size: int = Field(2, ge=1, description="菜谱基准人份（食材用量按此人份标注）")
    image_url: Optional[str] = ""
    steps: List[dict]
    ingredients: List[dict]
    
    class Config:
        orm_mode = True
