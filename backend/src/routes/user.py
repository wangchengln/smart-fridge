from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Dict

from ..schemas.user import (
    UserCreate, UserResponse, ParentModeUpdate, ParentModeResponse,
    UserInfoResponse, UserUpdate,
)
from ..crud.user import (
    get_user_by_phone, create_user, update_parent_mode,
    get_user_by_id, update_user,
)
from ..utils.database import get_db
from ..utils.jwt_auth import create_access_token

router = APIRouter(prefix="/api/user", tags=["用户管理"])

@router.post("/auth", response_model=UserResponse)
def user_auth(user: UserCreate, db: Session = Depends(get_db)):
    """用户登录/注册接口"""
    # 检查用户是否存在
    db_user = get_user_by_phone(db, phone=user.phone)
    
    if not db_user:
        # 创建新用户
        db_user = create_user(db, user)
    
    # 生成JWT令牌
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"user_id": db_user.id}, expires_delta=access_token_expires
    )
    
    return {
        "user_id": db_user.id,
        "token": access_token,
        "nickname": db_user.nickname
    }

@router.put("/parent-mode", response_model=ParentModeResponse)
def update_parent_mode_endpoint(
    parent_mode: ParentModeUpdate, 
    token: str = Depends(lambda: None),  # 简化处理，实际应该从请求头获取
    db: Session = Depends(get_db)
):
    """爸妈模式切换接口"""
    # 这里应该从JWT token中获取user_id
    # 简化处理，假设user_id=1
    user_id = 1
    
    db_user = update_parent_mode(db, user_id, parent_mode)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    return {"parent_mode": db_user.parent_mode}


@router.get("/{user_id}", response_model=UserInfoResponse)
def get_user_info(user_id: int, db: Session = Depends(get_db)):
    """获取用户信息"""
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在",
        )
    return {
        "id": db_user.id,
        "nickname": db_user.nickname,
        "family_count": db_user.family_count,
        "family_type": db_user.family_type,
        "taste_preference": db_user.taste_preference,
        "parent_mode": db_user.parent_mode,
        "dietary_mode": getattr(db_user, "dietary_mode", None) or "normal",
        "on_antihypertensive": bool(getattr(db_user, "on_antihypertensive", False)),
    }


@router.put("/{user_id}", response_model=UserInfoResponse)
def update_user_info(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
):
    """更新用户信息"""
    db_user = update_user(db, user_id, user_update)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在",
        )
    return {
        "id": db_user.id,
        "nickname": db_user.nickname,
        "family_count": db_user.family_count,
        "family_type": db_user.family_type,
        "taste_preference": db_user.taste_preference,
        "parent_mode": db_user.parent_mode,
        "dietary_mode": getattr(db_user, "dietary_mode", None) or "normal",
        "on_antihypertensive": bool(getattr(db_user, "on_antihypertensive", False)),
    }
