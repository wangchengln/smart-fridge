from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    """用户创建/登录请求模型"""
    phone: str = Field(..., min_length=11, max_length=11, description="手机号")
    code: str = Field(..., min_length=4, max_length=6, description="验证码")

class UserResponse(BaseModel):
    """用户响应模型"""
    user_id: int
    token: str
    nickname: str
    
    class Config:
        orm_mode = True

class ParentModeUpdate(BaseModel):
    """爸妈模式更新请求模型"""
    parent_mode: bool = Field(..., description="爸妈模式开关")

class ParentModeResponse(BaseModel):
    """爸妈模式响应模型"""
    parent_mode: bool
    
    class Config:
        orm_mode = True


class UserInfoResponse(BaseModel):
    """用户信息响应模型"""
    id: int
    nickname: str
    family_count: int
    family_type: str
    taste_preference: Optional[str] = None
    parent_mode: bool
    dietary_mode: str = "normal"
    on_antihypertensive: bool = False

    class Config:
        orm_mode = True


class UserUpdate(BaseModel):
    """用户信息更新请求模型"""
    nickname: Optional[str] = Field(None, max_length=50)
    family_count: Optional[int] = Field(None, ge=1, le=12)
    family_type: Optional[str] = Field(None, max_length=20)
    taste_preference: Optional[str] = None
    parent_mode: Optional[bool] = None
    dietary_mode: Optional[str] = Field(None, description="饮食模式: normal/fat_loss/parents")
    on_antihypertensive: Optional[bool] = Field(None, description="是否服用降压药")
