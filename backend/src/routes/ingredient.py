from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.orm import Session

from ..schemas.ingredient import (
    IngredientRecognitionCreate, IngredientRecognitionResponse,
    OrderSyncCreate, OrderSyncResponse,
    StockUpdateCreate, StockUpdateResponse,
    NearExpiryResponse, CheckNearExpiryRequest,
    BatchUpdateNearExpiryRequest, BatchUpdateNearExpiryResponse,
    IngredientBaseListResponse,
)
from ..crud.user_ingredient import (
    create_user_ingredient, update_user_ingredient, delete_user_ingredient,
    check_near_expiry_ingredients, get_near_expiry_ingredients,
    batch_update_near_expiry_status, get_user_ingredients_with_details,
)
from ..crud.ingredient_base import get_all_ingredients, get_or_create_ingredient_base
from ..crud.order_sync_rel import create_order_sync_rel, update_order_sync_status
from ..utils.database import get_db

router = APIRouter(prefix="/api/ingredient", tags=["食材管理"])

@router.post("/recognize", response_model=IngredientRecognitionResponse)
def recognize_ingredients(
    recognition: IngredientRecognitionCreate,
    db: Session = Depends(get_db)
):
    """图片识别接口"""
    # 模拟识别结果
    ingredients = [
        {
            "ingredient_id": 1,
            "name": "西红柿",
            "quantity": 2.0,
            "confidence": 0.95
        },
        {
            "ingredient_id": 2,
            "name": "鸡蛋",
            "quantity": 6.0,
            "confidence": 0.98
        }
    ]
    
    return {"ingredients": ingredients}

@router.post("/sync-order", response_model=OrderSyncResponse)
def sync_order(
    order: OrderSyncCreate,
    db: Session = Depends(get_db)
):
    """订单同步接口"""
    # 创建订单同步记录
    db_order = create_order_sync_rel(db, user_id=1, order=order)
    
    # 模拟同步成功
    db_order = update_order_sync_status(
        db, 
        order_id=db_order.id, 
        sync_status="completed",
        ingredient_details='[{"name": "牛奶", "quantity": 1}]'
    )
    
    return {
        "sync_status": db_order.sync_status,
        "ingredients": [{"name": "牛奶", "quantity": 1}]
    }

@router.get("/base", response_model=IngredientBaseListResponse)
def list_ingredient_base(db: Session = Depends(get_db)):
    """获取食材基础库列表"""
    ingredients = get_all_ingredients(db)
    return {
        "ingredients": ingredients,
        "total_count": len(ingredients),
    }


@router.post("/stock", response_model=StockUpdateResponse)
def create_stock(
    stock: StockUpdateCreate,
    db: Session = Depends(get_db)
):
    """库存增删改接口 - 创建"""
    if stock.ingredient_id:
        ingredient_id = stock.ingredient_id
    else:
        ingredient = get_or_create_ingredient_base(
            db,
            stock.ingredient_name.strip(),
            stock.category or "未分类",
        )
        ingredient_id = ingredient.id

    stock_payload = StockUpdateCreate(
        ingredient_id=ingredient_id,
        quantity=stock.quantity,
        freshness=stock.freshness,
    )
    if not stock.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="需要提供 user_id",
        )
    db_stock = create_user_ingredient(db, user_id=stock.user_id, stock=stock_payload)
    return {"stock_id": db_stock.id}

@router.put("/stock", response_model=StockUpdateResponse)
def update_stock(
    stock: StockUpdateCreate,
    stock_id: int,
    db: Session = Depends(get_db)
):
    """库存增删改接口 - 更新"""
    db_stock = update_user_ingredient(db, stock_id, stock)
    if not db_stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="库存记录不存在"
        )
    return {"stock_id": db_stock.id}

@router.delete("/stock/{stock_id}")
def delete_stock(
    stock_id: int,
    db: Session = Depends(get_db)
):
    """库存增删改接口 - 删除"""
    success = delete_user_ingredient(db, stock_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="库存记录不存在"
        )
    return {"message": "删除成功"}

@router.get("/user/{user_id}/stocks")
def get_user_stocks(
    user_id: int = Path(..., gt=0, description="用户ID"),
    db: Session = Depends(get_db),
):
    """获取用户食材库存列表"""
    return get_user_ingredients_with_details(db, user_id)


@router.post("/check-near-expiry")
def check_near_expiry(
    request: CheckNearExpiryRequest,
    db: Session = Depends(get_db),
):
    """检查并标记临期食材"""
    near_expiry_ingredients = check_near_expiry_ingredients(
        db, request.user_id, request.days_before_expiry
    )
    return {
        "near_expiry_count": len(near_expiry_ingredients),
        "near_expiry_ingredients": near_expiry_ingredients,
    }

@router.get("/near-expiry", response_model=NearExpiryResponse)
def get_near_expiry(
    user_id: int,
    db: Session = Depends(get_db)
):
    """获取临期食材列表"""
    result = get_near_expiry_ingredients(db, user_id)
    return result

@router.post("/batch-update-near-expiry", response_model=BatchUpdateNearExpiryResponse)
def batch_update_near_expiry(
    request: BatchUpdateNearExpiryRequest,
    db: Session = Depends(get_db),
):
    """批量更新临期状态"""
    return batch_update_near_expiry_status(
        db, request.user_id, request.stock_ids, request.near_expiry
    )
