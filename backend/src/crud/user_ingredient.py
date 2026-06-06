from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, timedelta
from ..models.user_ingredient import UserIngredient as UserIngredientModel
from ..models.ingredient_base import IngredientBase as IngredientBaseModel
from ..schemas.ingredient import StockUpdateCreate

NEAR_EXPIRY_FRESHNESS = frozenset({"expiring", "expired"})


def freshness_implies_near_expiry(freshness: str) -> bool:
    """手动标记的临期/过期新鲜度应同步到临期提醒"""
    return freshness in NEAR_EXPIRY_FRESHNESS


def get_user_ingredients(db: Session, user_id: int):
    """获取用户所有食材库存"""
    return db.query(UserIngredientModel).filter(UserIngredientModel.user_id == user_id).all()


def get_user_ingredients_with_details(db: Session, user_id: int):
    """获取用户食材库存列表（含食材名称、分类）"""
    rows = db.query(UserIngredientModel, IngredientBaseModel).join(
        IngredientBaseModel,
        UserIngredientModel.ingredient_id == IngredientBaseModel.id,
    ).filter(UserIngredientModel.user_id == user_id).all()

    stocks = []
    for user_ingredient, ingredient_base in rows:
        stocks.append({
            "id": user_ingredient.id,
            "ingredient_id": user_ingredient.ingredient_id,
            "ingredient_name": ingredient_base.name,
            "name": ingredient_base.name,
            "category": ingredient_base.category,
            "quantity": float(user_ingredient.quantity),
            "freshness": user_ingredient.freshness,
            "storage_method": user_ingredient.storage_method,
            "near_expiry": user_ingredient.near_expiry,
            "storage_date": user_ingredient.storage_date.isoformat(),
        })

    return {
        "total_count": len(stocks),
        "stocks": stocks,
    }

def get_user_ingredient(db: Session, user_id: int, ingredient_id: int):
    """获取用户特定食材库存"""
    return db.query(UserIngredientModel).filter(
        UserIngredientModel.user_id == user_id,
        UserIngredientModel.ingredient_id == ingredient_id
    ).first()

def create_user_ingredient(db: Session, user_id: int, stock: StockUpdateCreate):
    """创建用户食材库存"""
    db_stock = UserIngredientModel(
        user_id=user_id,
        ingredient_id=stock.ingredient_id,
        quantity=stock.quantity,
        freshness=stock.freshness,
        storage_method="manual",
        near_expiry=freshness_implies_near_expiry(stock.freshness),
        storage_date=datetime.utcnow()
    )
    db.add(db_stock)
    db.commit()
    db.refresh(db_stock)
    return db_stock

def update_user_ingredient(db: Session, stock_id: int, stock: StockUpdateCreate):
    """更新用户食材库存"""
    db_stock = db.query(UserIngredientModel).filter(UserIngredientModel.id == stock_id).first()
    if db_stock:
        db_stock.quantity = stock.quantity
        db_stock.freshness = stock.freshness
        db_stock.near_expiry = freshness_implies_near_expiry(stock.freshness)
        db.commit()
        db.refresh(db_stock)
    return db_stock

def delete_user_ingredient(db: Session, stock_id: int):
    """删除用户食材库存"""
    db_stock = db.query(UserIngredientModel).filter(UserIngredientModel.id == stock_id).first()
    if db_stock:
        db.delete(db_stock)
        db.commit()
        return True
    return False

def update_near_expiry_status(db: Session, stock_id: int, near_expiry: bool):
    """更新临期状态"""
    db_stock = db.query(UserIngredientModel).filter(UserIngredientModel.id == stock_id).first()
    if db_stock:
        db_stock.near_expiry = near_expiry
        db.commit()
        db.refresh(db_stock)
    return db_stock

def check_near_expiry_ingredients(db: Session, user_id: int, days_before_expiry: int = 2):
    """
    检查并标记临期食材
    :param db: 数据库会话
    :param user_id: 用户ID
    :param days_before_expiry: 提前几天提醒（默认2天）
    :return: 临期食材列表
    """
    # 获取用户所有食材库存，关联查询食材基础信息
    user_ingredients = db.query(UserIngredientModel, IngredientBaseModel).join(
        IngredientBaseModel,
        UserIngredientModel.ingredient_id == IngredientBaseModel.id
    ).filter(UserIngredientModel.user_id == user_id).all()
    
    near_expiry_ingredients = []
    for user_ingredient, ingredient_base in user_ingredients:
        expiry_date = user_ingredient.storage_date + timedelta(days=ingredient_base.shelf_life)
        near_expiry_date = expiry_date - timedelta(days=days_before_expiry)

        if freshness_implies_near_expiry(user_ingredient.freshness):
            is_near_expiry = True
        else:
            is_near_expiry = datetime.utcnow() >= near_expiry_date

        if user_ingredient.near_expiry != is_near_expiry:
            user_ingredient.near_expiry = is_near_expiry
            db.commit()

        if is_near_expiry:
            near_expiry_ingredients.append({
                "stock_id": user_ingredient.id,
                "ingredient_id": user_ingredient.ingredient_id,
                "ingredient_name": ingredient_base.name,  # 关联查询获取食材名称
                "quantity": float(user_ingredient.quantity),
                "freshness": user_ingredient.freshness,
                "storage_date": user_ingredient.storage_date.isoformat(),
                "shelf_life": ingredient_base.shelf_life,
                "expiry_date": expiry_date.isoformat(),
                "days_remaining": (expiry_date - datetime.utcnow()).days
            })
    
    return near_expiry_ingredients

def get_near_expiry_ingredients(db: Session, user_id: int):
    """
    获取临期食材列表
    :param db: 数据库会话
    :param user_id: 用户ID
    :return: 临期食材列表
    """
    # 获取所有标记为临期的食材
    near_expiry_ingredients = db.query(UserIngredientModel, IngredientBaseModel).join(
        IngredientBaseModel,
        UserIngredientModel.ingredient_id == IngredientBaseModel.id
    ).filter(
        and_(
            UserIngredientModel.user_id == user_id,
            or_(
                UserIngredientModel.near_expiry == True,
                UserIngredientModel.freshness.in_(list(NEAR_EXPIRY_FRESHNESS)),
            ),
        )
    ).all()
    
    # 转换为响应格式
    result = []
    for user_ingredient, ingredient_base in near_expiry_ingredients:
        expiry_date = user_ingredient.storage_date + timedelta(days=ingredient_base.shelf_life)
        result.append({
            "stock_id": user_ingredient.id,
            "ingredient_id": user_ingredient.ingredient_id,
            "ingredient_name": ingredient_base.name,  # 关联查询获取食材名称
            "quantity": float(user_ingredient.quantity),
            "freshness": user_ingredient.freshness,
            "storage_date": user_ingredient.storage_date.isoformat(),
            "shelf_life": ingredient_base.shelf_life,
            "expiry_date": expiry_date.isoformat(),
            "days_remaining": (expiry_date - datetime.utcnow()).days
        })
    
    return {
        "total_count": len(near_expiry_ingredients),
        "near_expiry_ingredients": result  # 实际实现时需要填充数据
    }

def batch_update_near_expiry_status(db: Session, user_id: int, stock_ids: list, near_expiry: bool):
    """
    批量更新临期状态
    :param db: 数据库会话
    :param user_id: 用户ID
    :param stock_ids: 库存ID列表
    :param near_expiry: 临期状态
    :return: 更新结果
    """
    updated_count = 0
    
    for stock_id in stock_ids:
        db_stock = db.query(UserIngredientModel).filter(
            and_(
                UserIngredientModel.id == stock_id,
                UserIngredientModel.user_id == user_id
            )
        ).first()
        
        if db_stock and db_stock.near_expiry != near_expiry:
            db_stock.near_expiry = near_expiry
            if near_expiry:
                if db_stock.freshness not in NEAR_EXPIRY_FRESHNESS:
                    db_stock.freshness = "expiring"
            elif db_stock.freshness in NEAR_EXPIRY_FRESHNESS:
                db_stock.freshness = "good"
            updated_count += 1
    
    if updated_count > 0:
        db.commit()
    
    return {
        "updated_count": updated_count,  # 实际实现时需要统计更新数量
        "success": True,
        "message": f"成功更新 {updated_count} 个食材的临期状态"
    }
