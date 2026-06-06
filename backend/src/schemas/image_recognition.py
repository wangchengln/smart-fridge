from pydantic import BaseModel, Field
from typing import List, Optional
from decimal import Decimal
from datetime import datetime

class RecognizedIngredientItem(BaseModel):
    """识别出的食材项模型"""
    ingredient_id: Optional[int] = Field(None, description="食材ID")
    name: str = Field(..., description="食材名称")
    quantity: Decimal = Field(..., ge=0, description="数量")
    confidence: float = Field(..., ge=0, le=1, description="置信度")
    category: Optional[str] = Field(None, description="食材分类")

class ImageUploadCreate(BaseModel):
    """图片上传请求模型"""
    image: str = Field(..., description="图片base64编码")
    recognition_type: str = Field(..., pattern="^(fridge|shopping_bag)$", description="识别类型")
    user_id: int = Field(..., gt=0, description="用户ID")

class ImageRecognitionResult(BaseModel):
    """图片识别结果模型"""
    recognition_id: int = Field(..., description="识别记录ID")
    status: str = Field(..., description="识别状态")
    ingredients: List[RecognizedIngredientItem] = Field(default=[], description="识别出的食材列表")
    processed_at: Optional[str] = Field(None, description="处理完成时间")

class ImageRecognitionResponse(BaseModel):
    """图片识别响应模型"""
    recognition_id: int
    image_path: str
    status: str
    created_at: str
    
    class Config:
        orm_mode = True

class UpdateRecognitionResultRequest(BaseModel):
    """更新识别结果请求模型"""
    recognition_id: int = Field(..., gt=0, description="识别记录ID")
    ingredients: List[RecognizedIngredientItem] = Field(..., min_items=1, description="更新后的食材列表")

class UpdateRecognitionResultResponse(BaseModel):
    """更新识别结果响应模型"""
    recognition_id: int
    updated_count: int
    success: bool
    message: str
    
    class Config:
        orm_mode = True

class ConfirmRecognitionRequest(BaseModel):
    """确认识别结果请求模型"""
    recognition_id: int = Field(..., gt=0, description="识别记录ID")
    user_id: int = Field(..., gt=0, description="用户ID")
    confirmed_ingredients: List[RecognizedIngredientItem] = Field(..., min_items=1, description="确认的食材列表")

class ConfirmRecognitionResponse(BaseModel):
    """确认识别结果响应模型"""
    recognition_id: int
    confirmed_count: int
    stock_ids: List[int]
    success: bool
    message: str
    
    class Config:
        orm_mode = True

class RecognitionStatusResponse(BaseModel):
    """识别状态查询响应模型"""
    recognition_id: int
    status: str
    progress: Optional[int] = Field(None, ge=0, le=100, description="处理进度")
    ingredients: Optional[List[RecognizedIngredientItem]] = Field(None, description="识别结果")
    error_message: Optional[str] = Field(None, description="错误信息")
    created_at: str
    updated_at: str
    
    class Config:
        orm_mode = True
