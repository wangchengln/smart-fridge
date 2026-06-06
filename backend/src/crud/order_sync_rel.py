from sqlalchemy.orm import Session
from ..models.order_sync_rel import OrderSyncRel as OrderSyncRelModel
from ..schemas.ingredient import OrderSyncCreate

def get_order_sync_by_id(db: Session, order_id: int):
    """根据订单ID查询订单同步信息"""
    return db.query(OrderSyncRelModel).filter(OrderSyncRelModel.id == order_id).first()

def get_order_sync_by_meituan_id(db: Session, meituan_order_id: str):
    """根据美团订单ID查询订单同步信息"""
    return db.query(OrderSyncRelModel).filter(
        OrderSyncRelModel.meituan_order_id == meituan_order_id
    ).first()

def create_order_sync_rel(db: Session, user_id: int, order: OrderSyncCreate):
    """创建订单同步关联"""
    db_order = OrderSyncRelModel(
        user_id=user_id,
        meituan_order_id=order.meituan_order_id,
        ingredient_details="[]",  # 默认空食材明细
        sync_status="pending"
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order

def update_order_sync_status(db: Session, order_id: int, sync_status: str, ingredient_details: str = None):
    """更新订单同步状态"""
    db_order = db.query(OrderSyncRelModel).filter(OrderSyncRelModel.id == order_id).first()
    if db_order:
        db_order.sync_status = sync_status
        if ingredient_details is not None:
            db_order.ingredient_details = ingredient_details
        db.commit()
        db.refresh(db_order)
    return db_order

def get_user_order_syncs(db: Session, user_id: int):
    """获取用户所有订单同步记录"""
    return db.query(OrderSyncRelModel).filter(OrderSyncRelModel.user_id == user_id).all()
