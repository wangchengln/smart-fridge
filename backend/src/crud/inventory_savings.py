from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.inventory_savings_log import InventorySavingsLog


def create_savings_log(db: Session, data: dict) -> InventorySavingsLog:
    record = InventorySavingsLog(**data)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_week_start() -> datetime:
    now = datetime.utcnow()
    return now - timedelta(days=now.weekday())


def get_weekly_savings(db: Session, user_id: int) -> float:
    week_start = get_week_start()
    total = (
        db.query(func.coalesce(func.sum(InventorySavingsLog.saved_amount), 0))
        .filter(
            InventorySavingsLog.user_id == user_id,
            InventorySavingsLog.created_at >= week_start,
        )
        .scalar()
    )
    return float(total or 0)


def get_weekly_savings_logs(
    db: Session, user_id: int, limit: int = 20
) -> List[InventorySavingsLog]:
    week_start = get_week_start()
    return (
        db.query(InventorySavingsLog)
        .filter(
            InventorySavingsLog.user_id == user_id,
            InventorySavingsLog.created_at >= week_start,
        )
        .order_by(InventorySavingsLog.created_at.desc())
        .limit(limit)
        .all()
    )


def get_savings_by_event_type(db: Session, user_id: int) -> dict:
    week_start = get_week_start()
    rows = (
        db.query(
            InventorySavingsLog.event_type,
            func.coalesce(func.sum(InventorySavingsLog.saved_amount), 0),
        )
        .filter(
            InventorySavingsLog.user_id == user_id,
            InventorySavingsLog.created_at >= week_start,
        )
        .group_by(InventorySavingsLog.event_type)
        .all()
    )
    return {event_type: float(amount) for event_type, amount in rows}


def seed_initial_savings_logs(db: Session):
    """为演示首页省钱数据，初始化本周省钱记录"""
    if db.query(InventorySavingsLog).count() > 0:
        return

    now = datetime.utcnow()
    samples = [
        {
            "user_id": 1,
            "event_type": "stock_used",
            "saved_amount": 12.50,
            "description": "用冰箱现有鸡蛋做菜，无需补购",
            "created_at": now - timedelta(days=2),
        },
        {
            "user_id": 1,
            "event_type": "no_purchase",
            "saved_amount": 28.00,
            "description": "食材齐全制作番茄炒蛋，省去补购费用",
            "recipe_id": 1,
            "created_at": now - timedelta(days=1),
        },
        {
            "user_id": 1,
            "event_type": "coupon_saved",
            "saved_amount": 8.00,
            "description": "补购方案使用闪购新客券立减8元",
            "created_at": now - timedelta(hours=6),
        },
        {
            "user_id": 1,
            "event_type": "near_expiry_used",
            "saved_amount": 6.80,
            "description": "临期胡萝卜优先使用，避免浪费",
            "created_at": now - timedelta(hours=2),
        },
        {
            "user_id": 1,
            "event_type": "plan_saved",
            "saved_amount": 15.20,
            "description": "选择省钱版补购方案，比标准版少花15.2元",
            "created_at": now - timedelta(hours=1),
        },
    ]
    for item in samples:
        db.add(InventorySavingsLog(**item))
    db.commit()
