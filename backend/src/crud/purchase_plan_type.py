from sqlalchemy.orm import Session
from ..models.purchase_plan_type import PurchasePlanType as PurchasePlanTypeModel

def get_plan_type_by_id(db: Session, plan_type_id: int):
    """根据ID获取方案类型"""
    return db.query(PurchasePlanTypeModel).filter(PurchasePlanTypeModel.id == plan_type_id).first()

def get_plan_type_by_name(db: Session, name: str):
    """根据名称获取方案类型"""
    return db.query(PurchasePlanTypeModel).filter(PurchasePlanTypeModel.name == name).first()

def get_all_plan_types(db: Session):
    """获取所有方案类型"""
    return db.query(PurchasePlanTypeModel).filter(PurchasePlanTypeModel.is_active == 1).all()

def create_plan_type(db: Session, name: str, description: str = None, priority: int = 0):
    """创建方案类型"""
    db_plan_type = PurchasePlanTypeModel(
        name=name,
        description=description,
        priority=priority,
        is_active=1
    )
    db.add(db_plan_type)
    db.commit()
    db.refresh(db_plan_type)
    return db_plan_type

def update_plan_type(db: Session, plan_type_id: int, **kwargs):
    """更新方案类型"""
    db_plan_type = get_plan_type_by_id(db, plan_type_id)
    if db_plan_type:
        for key, value in kwargs.items():
            if hasattr(db_plan_type, key):
                setattr(db_plan_type, key, value)
        db.commit()
        db.refresh(db_plan_type)
    return db_plan_type

def delete_plan_type(db: Session, plan_type_id: int):
    """删除方案类型（软删除）"""
    db_plan_type = get_plan_type_by_id(db, plan_type_id)
    if db_plan_type:
        db_plan_type.is_active = 0
        db.commit()
    return db_plan_type
