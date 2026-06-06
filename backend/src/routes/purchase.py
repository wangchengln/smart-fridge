from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal
import json

from ..schemas.purchase import (
    PurchaseAnalyzeCreate, PurchaseAnalyzeResponse,
    PurchasePlanCreate, PurchasePlanResponse,
    ProductMatchCreate, ProductMatchResponse,
    OrderCreate, OrderResponse,
    PurchasePlanSelectionCreate, PurchasePlanSelectionResponse
)
from ..services.purchase_plan_service import purchase_plan_service
from ..services.meituan_product_service import meituan_product_service
from ..services.coupon_service import coupon_service
from ..crud.inventory_savings import create_savings_log, get_weekly_savings
from ..crud.ingredient_base import get_ingredient_by_id
from ..crud.recipe_base import get_recipe_by_id
from ..crud.recipe_ingredient_rel import get_recipe_ingredients
from ..crud.user_ingredient import get_user_ingredients
from ..crud.product_match import create_product_match, batch_create_product_matches, search_products
from ..crud.purchase_plan_record import create_plan_record, get_user_plan_records, update_plan_status
from ..utils.database import get_db

router = APIRouter(prefix="/api/purchase", tags=["补购交易"])

@router.post("/analyze", response_model=PurchaseAnalyzeResponse)
def analyze_missing_ingredients(
    analyze: PurchaseAnalyzeCreate,
    db: Session = Depends(get_db)
):
    """缺失食材分析接口 - 集成菜谱推荐的结果"""
    recipe = get_recipe_by_id(db, analyze.recipe_id)
    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="菜谱不存在",
        )

    # 获取菜谱所需食材
    recipe_requirements = get_recipe_ingredients(db, analyze.recipe_id)
    if not recipe_requirements:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="菜谱不存在或没有食材要求"
        )

    base_servings = recipe.serving_size or 2
    target_servings = analyze.servings or base_servings
    quantity_scale = target_servings / base_servings
    
    # 获取用户现有食材
    user_stocks = get_user_ingredients(db, analyze.user_id)
    user_ingredients = {
        stock.ingredient_id: float(stock.quantity) 
        for stock in user_stocks
    }
    
    # 分析缺失食材
    missing_ingredients = []
    for req in recipe_requirements:
        ingredient_id = req.ingredient_id
        required_qty = round(float(req.required_quantity) * quantity_scale, 2)
        current_qty = user_ingredients.get(ingredient_id, 0)
        
        if current_qty < required_qty:
            # 获取食材名称
            ingredient = get_ingredient_by_id(db, ingredient_id)
            ingredient_name = ingredient.name if ingredient else f"食材{ingredient_id}"
            
            missing_ingredients.append({
                "ingredient_id": ingredient_id,
                "name": ingredient_name,
                "required_quantity": required_qty,
                "current_quantity": current_qty
            })
    
    return {"missing_ingredients": missing_ingredients}

@router.post("/plan", response_model=PurchasePlanResponse)
def generate_purchase_plans(
    plan: PurchasePlanCreate,
    db: Session = Depends(get_db)
):
    """补购方案生成接口 - 实现标准版和省钱版"""
    if not plan.missing_ingredients:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="没有缺失食材，无需生成补购方案"
        )
    
    cooking_time = plan.cooking_time or 30
    if plan.recipe_id:
        recipe = get_recipe_by_id(db, plan.recipe_id)
        if recipe and recipe.cooking_time:
            cooking_time = recipe.cooking_time

    standard_plan, economy_plan, price_comparison = purchase_plan_service.generate_purchase_plans(
        plan.missing_ingredients,
        db=db,
        user_id=plan.user_id,
        cooking_time=cooking_time,
    )

    available_coupons = []
    if plan.user_id:
        order_amount = economy_plan.total_price if economy_plan else Decimal("0")
        available_coupons = coupon_service.get_user_coupons_with_estimates(
            db, plan.user_id, order_amount
        )

    if not standard_plan.items and not economy_plan.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无法为当前缺失食材生成补购方案",
        )

    comparison = purchase_plan_service.compare_plans(standard_plan, economy_plan)
    
    return {
        "standard_plan": standard_plan,
        "economy_plan": economy_plan,
        "comparison": comparison,
        "price_comparison": price_comparison,
        "available_coupons": available_coupons,
    }

@router.post("/match", response_model=ProductMatchResponse)
def match_products(
    match: ProductMatchCreate,
    db: Session = Depends(get_db)
):
    """商品匹配接口 - 集成美团商品数据"""
    # 获取食材信息
    ingredient = get_ingredient_by_id(db, match.ingredient_id)
    if not ingredient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="食材不存在"
        )
    
    # 获取商品推荐
    products = meituan_product_service.get_product_recommendations(
        ingredient.name,
        float(match.quantity),
        ingredient.category,
        match.sort_by
    )
    
    # 保存商品匹配记录到数据库
    product_records = []
    for product in products[:10]:  # 限制保存前10个商品
        product_data = {
            'ingredient_id': match.ingredient_id,
            'product_id': product.product_id,
            'product_name': product.name,
            'price': float(product.price),
            'original_price': float(product.original_price) if product.original_price else None,
            'unit': product.unit,
            'spec': product.spec,
            'image_url': product.image_url,
            'source': product.source,
            'category': product.category,
            'rating': float(product.rating) if product.rating else None,
            'sales_count': product.sales_count,
            'stock_status': 'in_stock',
            'match_score': float(product.match_score)
        }
        
        # 检查是否已存在，避免重复
        existing = db.query("product_match").filter(
            "ingredient_id" == match.ingredient_id,
            "product_id" == product.product_id
        ).first()
        
        if not existing:
            product_record = create_product_match(db, product_data)
            product_records.append(product_record)
    
    return {
        "products": products,
        "total_count": len(products)
    }

@router.get("/products/search", response_model=ProductMatchResponse)
def search_products_endpoint(
    ingredient_id: int = Query(..., gt=0, description="食材ID"),
    sort_by: str = Query("match_score", description="排序方式: price/rating/sales/match_score"),
    limit: int = Query(10, ge=1, le=50, description="返回数量限制"),
    db: Session = Depends(get_db)
):
    """商品搜索接口 - 从数据库获取已匹配的商品"""
    products = search_products(db, ingredient_id, sort_by, limit)
    
    # 转换为响应格式
    product_items = []
    for product in products:
        product_item = {
            "product_id": product.product_id,
            "name": product.product_name,
            "price": product.price,
            "original_price": product.original_price,
            "unit": product.unit,
            "spec": product.spec,
            "image_url": product.image_url,
            "source": product.source,
            "category": product.category,
            "rating": product.rating,
            "sales_count": product.sales_count,
            "match_score": product.match_score
        }
        product_items.append(product_item)
    
    return {
        "products": product_items,
        "total_count": len(product_items)
    }

@router.post("/plan/select", response_model=PurchasePlanSelectionResponse)
def select_purchase_plan(
    selection: PurchasePlanSelectionCreate,
    db: Session = Depends(get_db)
):
    """选择补购方案接口"""
    # 创建方案选择记录
    plan_record_data = {
        'user_id': selection.user_id,
        'recipe_id': selection.recipe_id,
        'plan_type_id': 1 if selection.plan_type == 'standard' else 2,  # 假设1=标准版，2=省钱版
        'plan_name': selection.plan_type,
        'total_price': float(selection.plan_details.get('total_price', 0)),
        'original_price': float(selection.plan_details.get('original_price', 0)) if selection.plan_details.get('original_price') else None,
        'discount_amount': float(selection.plan_details.get('discount_amount', 0)),
        'items_count': len(selection.plan_details.get('items', [])),
        'plan_details': selection.plan_details,
        'status': 'selected',
        'expires_at': None  # 可设置为24小时后过期
    }
    
    plan_record = create_plan_record(db, plan_record_data)

    coupon_discount = float(selection.plan_details.get("coupon_discount", 0) or 0)
    if coupon_discount > 0:
        create_savings_log(
            db,
            {
                "user_id": selection.user_id,
                "event_type": "coupon_saved",
                "saved_amount": coupon_discount,
                "description": f"补购方案使用神券抵扣¥{coupon_discount:.2f}",
                "recipe_id": selection.recipe_id,
            },
        )

    if selection.plan_type == "economy":
        standard_price = float(selection.plan_details.get("standard_total_price", 0) or 0)
        economy_price = float(selection.plan_details.get("total_price", 0) or 0)
        plan_saved = standard_price - economy_price
        if plan_saved > 0:
            create_savings_log(
                db,
                {
                    "user_id": selection.user_id,
                    "event_type": "plan_saved",
                    "saved_amount": plan_saved,
                    "description": f"选择省钱版方案，比标准版少花¥{plan_saved:.2f}",
                    "recipe_id": selection.recipe_id,
                },
            )

    if not plan_record:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="创建方案记录失败"
        )
    
    return {
        "selection_id": plan_record.id,
        "plan_type": selection.plan_type,
        "total_price": plan_record.total_price,
        "success": True,
        "message": "方案选择成功",
        "weekly_saved_amount": get_weekly_savings(db, selection.user_id),
    }

@router.get("/user/{user_id}/plans")
def get_user_purchase_plans(
    user_id: int,
    limit: int = Query(20, ge=1, le=100, description="返回数量限制"),
    db: Session = Depends(get_db)
):
    """获取用户的购买方案历史"""
    plan_records = get_user_plan_records(db, user_id, limit)
    
    # 转换响应格式
    plans = []
    for record in plan_records:
        plan_details = {}
        if record.plan_details:
            try:
                plan_details = json.loads(record.plan_details)
            except:
                plan_details = {}
        
        plan = {
            "record_id": record.id,
            "plan_type": record.plan_name,
            "total_price": float(record.total_price),
            "original_price": float(record.original_price) if record.original_price else None,
            "discount_amount": float(record.discount_amount),
            "items_count": record.items_count,
            "status": record.status,
            "created_at": record.created_at.isoformat(),
            "plan_details": plan_details
        }
        plans.append(plan)
    
    return {
        "plans": plans,
        "total_count": len(plans)
    }

@router.post("/order", response_model=OrderResponse)
def create_order(
    order: OrderCreate,
    db: Session = Depends(get_db)
):
    """下单跳转接口 - 集成美团购物页面"""
    if not order.products:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="订单商品不能为空"
        )
    
    # 计算订单总金额
    total_amount = sum(float(product.price) for product in order.products)
    
    # 模拟生成订单ID
    import uuid
    order_id = f"mt_order_{uuid.uuid4().hex[:12]}"
    
    # 模拟生成美团跳转URL
    # 实际应该调用美团开放平台的下单API
    redirect_url = f"https://bj.meituan.com/cart?order_id={order_id}&total={total_amount}"
    
    # 更新方案状态为已下单
    if order.plan_type:
        # 查找最近的方案记录并更新状态
        recent_plans = get_user_plan_records(db, order.user_id, 1)
        if recent_plans:
            update_plan_status(db, recent_plans[0].id, 'ordered')
    
    return {
        "redirect_url": redirect_url,
        "order_id": order_id,
        "total_amount": total_amount,
        "plan_details": {
            "plan_type": order.plan_type,
            "items_count": len(order.products)
        }
    }

@router.get("/meituan/mock-page")
def get_meituan_mock_page():
    """获取美团购物页面模拟数据"""
    # 模拟美团购物页面数据
    mock_page_data = {
        "page_title": "美团购物 - 智能云冰箱补购",
        "order_summary": {
            "total_items": 3,
            "total_amount": 45.6,
            "estimated_delivery": "30-45分钟"
        },
        "products": [
            {
                "name": "新鲜西红柿 500g",
                "price": 8.5,
                "quantity": 2,
                "subtotal": 17.0
            },
            {
                "name": "土鸡蛋 12枚装", 
                "price": 18.8,
                "quantity": 1,
                "subtotal": 18.8
            },
            {
                "name": "新鲜胡萝卜 1kg",
                "price": 6.9,
                "quantity": 1,
                "subtotal": 6.9
            }
        ],
        "delivery_info": {
            "address": "智能云冰箱用户地址",
            "delivery_fee": 3.0,
            "delivery_time": "预计30-45分钟送达"
        },
        "payment_methods": ["微信支付", "支付宝", "美团支付"]
    }
    
    return mock_page_data
