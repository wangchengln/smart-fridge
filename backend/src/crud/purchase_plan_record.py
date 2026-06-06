from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime
import json
from ..models.purchase_plan_record import PurchasePlanRecord as PurchasePlanRecordModel

def get_plan_record_by_id(db: Session, record_id: int):
    """根据ID获取方案记录"""
    return db.query(PurchasePlanRecordModel).filter(PurchasePlanRecordModel.id == record_id).first()

def get_user_plan_records(db: Session, user_id: int, limit: int = 20):
    """获取用户的方案记录"""
    return db.query(PurchasePlanRecordModel).filter(
        PurchasePlanRecordModel.user_id == user_id
    ).order_by(PurchasePlanRecordModel.created_at.desc()).limit(limit).all()

def get_plan_records_by_recipe(db: Session, user_id: int, recipe_id: int):
    """根据菜谱ID获取方案记录"""
    return db.query(PurchasePlanRecordModel).filter(
        and_(
            PurchasePlanRecordModel.user_id == user_id,
            PurchasePlanRecordModel.recipe_id == recipe_id
        )
    ).order_by(PurchasePlanRecordModel.created_at.desc()).all()

def create_plan_record(db: Session, record_data: dict):
    """创建方案记录"""
    # 序列化方案详情
    if 'plan_details' in record_data and isinstance(record_data['plan_details'], dict):
        record_data['plan_details'] = json.dumps(record_data['plan_details'], ensure_ascii=False)
    
    db_record = PurchasePlanRecordModel(**record_data)
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

def update_plan_record(db: Session, record_id: int, **kwargs):
    """更新方案记录"""
    db_record = get_plan_record_by_id(db, record_id)
    if db_record:
        # 序列化方案详情
        if 'plan_details' in kwargs and isinstance(kwargs['plan_details'], dict):
            kwargs['plan_details'] = json.dumps(kwargs['plan_details'], ensure_ascii=False)
        
        for key, value in kwargs.items():
            if hasattr(db_record, key):
                setattr(db_record, key, value)
        db.commit()
        db.refresh(db_record)
    return db_record

def update_plan_status(db: Session, record_id: int, status: str):
    """更新方案状态"""
    return update_plan_record(db, record_id, status=status)

def delete_plan_record(db: Session, record_id: int):
    """删除方案记录"""
    db_record = get_plan_record_by_id(db, record_id)
    if db_record:
        db.delete(db_record)
        db.commit()
    return db_record

def get_expired_plans(db: Session, user_id: int):
    """获取过期的方案记录"""
    return db.query(PurchasePlanRecordModel).filter(
        and_(
            PurchasePlanRecordModel.user_id == user_id,
            PurchasePlanRecordModel.expires_at < datetime.utcnow()
        )
    ).all()

def cleanup_expired_plans(db: Session, user_id: int):
    """清理过期的方案记录"""
    expired_records = get_expired_plans(db, user_id)
    for record in expired_records:
        db.delete(record)
    db.commit()
    return len(expired_records)
