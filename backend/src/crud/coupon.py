from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy.orm import Session, joinedload

from ..models.coupon_base import CouponBase
from ..models.user_coupon import UserCoupon


def get_coupon_base_by_id(db: Session, coupon_id: int) -> Optional[CouponBase]:
    return db.query(CouponBase).filter(CouponBase.id == coupon_id).first()


def get_all_coupon_bases(db: Session) -> List[CouponBase]:
    return db.query(CouponBase).all()


def get_user_available_coupons(db: Session, user_id: int) -> List[UserCoupon]:
    now = datetime.utcnow()
    return (
        db.query(UserCoupon)
        .options(joinedload(UserCoupon.coupon))
        .filter(
            UserCoupon.user_id == user_id,
            UserCoupon.status == "available",
            UserCoupon.expires_at > now,
        )
        .order_by(UserCoupon.expires_at.asc())
        .all()
    )


def get_user_coupon_by_id(db: Session, user_coupon_id: int) -> Optional[UserCoupon]:
    return (
        db.query(UserCoupon)
        .options(joinedload(UserCoupon.coupon))
        .filter(UserCoupon.id == user_coupon_id)
        .first()
    )


def create_user_coupon(db: Session, data: dict) -> UserCoupon:
    record = UserCoupon(**data)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def mark_coupon_used(db: Session, user_coupon_id: int) -> Optional[UserCoupon]:
    record = get_user_coupon_by_id(db, user_coupon_id)
    if record:
        record.status = "used"
        record.used_at = datetime.utcnow()
        db.commit()
        db.refresh(record)
    return record


def seed_coupon_data(db: Session):
    """初始化神券模板与用户券数据"""
    if db.query(CouponBase).count() > 0:
        return

    templates = [
        {
            "coupon_type": "flash_sale",
            "name": "闪购满29减5",
            "description": "小象超市闪购专享，满29元可用",
            "discount_type": "fixed",
            "discount_value": 5.00,
            "min_order_amount": 29.00,
            "applicable_scope": "grocery",
        },
        {
            "coupon_type": "flash_sale",
            "name": "闪购新客立减8",
            "description": "闪购新客首单立减8元",
            "discount_type": "fixed",
            "discount_value": 8.00,
            "min_order_amount": 20.00,
            "applicable_scope": "grocery",
        },
        {
            "coupon_type": "flash_sale",
            "name": "闪购红包¥3",
            "description": "无门槛闪购红包",
            "discount_type": "fixed",
            "discount_value": 3.00,
            "min_order_amount": 0.00,
            "applicable_scope": "grocery",
        },
        {
            "coupon_type": "delivery",
            "name": "外卖满35减6",
            "description": "美团外卖满35元减6元",
            "discount_type": "fixed",
            "discount_value": 6.00,
            "min_order_amount": 35.00,
            "applicable_scope": "delivery",
        },
        {
            "coupon_type": "delivery",
            "name": "外卖配送费减3",
            "description": "外卖订单配送费立减3元",
            "discount_type": "fixed",
            "discount_value": 3.00,
            "min_order_amount": 15.00,
            "applicable_scope": "delivery",
        },
        {
            "coupon_type": "cross_store",
            "name": "跨店满50减10",
            "description": "美团跨店满减，闪购+外卖通用",
            "discount_type": "fixed",
            "discount_value": 10.00,
            "min_order_amount": 50.00,
            "applicable_scope": "all",
        },
        {
            "coupon_type": "cross_store",
            "name": "跨店9折券",
            "description": "跨店消费享9折，最高减15元",
            "discount_type": "percent",
            "discount_value": 10.00,
            "min_order_amount": 30.00,
            "max_discount": 15.00,
            "applicable_scope": "all",
        },
    ]

    for tpl in templates:
        db.add(CouponBase(**tpl))
    db.commit()

    now = datetime.utcnow()
    coupon_ids = [c.id for c in db.query(CouponBase).all()]
    for user_id in (1, 2):
        for idx, coupon_id in enumerate(coupon_ids):
            db.add(
                UserCoupon(
                    user_id=user_id,
                    coupon_id=coupon_id,
                    status="available",
                    received_at=now - timedelta(days=idx),
                    expires_at=now + timedelta(days=14 - idx),
                )
            )
    db.commit()
