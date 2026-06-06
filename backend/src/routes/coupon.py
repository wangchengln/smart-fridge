from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from decimal import Decimal

from ..schemas.coupon import UserCouponsResponse, WeeklySavingsResponse
from ..crud.coupon import get_user_available_coupons
from ..crud.inventory_savings import (
    get_weekly_savings,
    get_weekly_savings_logs,
    get_savings_by_event_type,
    get_week_start,
    create_savings_log,
)
from ..services.coupon_service import coupon_service
from ..utils.database import get_db

router = APIRouter(prefix="/api/coupon", tags=["美团神券"])


@router.get("/user/{user_id}", response_model=UserCouponsResponse)
def get_user_coupons(
    user_id: int,
    order_amount: float = Query(0, ge=0, description="预估订单金额，用于计算券可用性"),
    db: Session = Depends(get_db),
):
    """获取用户可用神券（闪购券、外卖券、跨店券）"""
    amount = Decimal(str(order_amount)) if order_amount > 0 else None
    coupons = coupon_service.get_user_coupons_with_estimates(db, user_id, amount)
    return {"coupons": coupons, "total_count": len(coupons)}


@router.get("/user/{user_id}/weekly-savings", response_model=WeeklySavingsResponse)
def get_weekly_savings_summary(
    user_id: int,
    db: Session = Depends(get_db),
):
    """获取本周因库存管理节省的金额"""
    weekly_amount = get_weekly_savings(db, user_id)
    breakdown = get_savings_by_event_type(db, user_id)
    logs = get_weekly_savings_logs(db, user_id, limit=10)

    recent_logs = [
        {
            "id": log.id,
            "event_type": log.event_type,
            "saved_amount": float(log.saved_amount),
            "description": log.description,
            "recipe_id": log.recipe_id,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]

    return {
        "weekly_saved_amount": Decimal(str(round(weekly_amount, 2))),
        "week_start": get_week_start(),
        "breakdown": breakdown,
        "recent_logs": recent_logs,
    }


@router.post("/user/{user_id}/record-savings")
def record_savings_event(
    user_id: int,
    event_type: str = Query(..., description="事件类型"),
    saved_amount: float = Query(..., ge=0, description="节省金额"),
    description: str = Query("", description="事件描述"),
    recipe_id: int = Query(None, description="关联菜谱ID"),
    db: Session = Depends(get_db),
):
    """记录库存管理省钱事件（内部/前端触发）"""
    valid_types = {
        "stock_used",
        "coupon_saved",
        "no_purchase",
        "near_expiry_used",
        "plan_saved",
    }
    if event_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"无效事件类型，可选: {', '.join(valid_types)}",
        )

    log = create_savings_log(
        db,
        {
            "user_id": user_id,
            "event_type": event_type,
            "saved_amount": saved_amount,
            "description": description,
            "recipe_id": recipe_id,
        },
    )
    return {
        "success": True,
        "log_id": log.id,
        "weekly_saved_amount": get_weekly_savings(db, user_id),
    }
