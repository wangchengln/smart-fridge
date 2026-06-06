import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..schemas.bundle_scenario import (
    CookShopScenarioRequest,
    WeekendRestockScenarioRequest,
    HomeGatheringScenarioRequest,
    ScenarioBundleResponse,
    ScenarioPreviewResponse,
    BundleOrderCreate,
    BundleOrderResponse,
)
from ..services.bundle_scenario_service import bundle_scenario_service
from ..utils.database import get_db

router = APIRouter(prefix="/api/scenario", tags=["场景Bundle"])


@router.get("/preview", response_model=ScenarioPreviewResponse)
def scenario_preview(
    user_id: int,
    db: Session = Depends(get_db),
):
    """冰箱场景洞察 — 进入页面前展示库存状态与智能推荐"""
    try:
        return bundle_scenario_service.get_scenario_preview(db, user_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/cook-shop", response_model=ScenarioBundleResponse)
def cook_shop_scenario(
    request: CookShopScenarioRequest,
    db: Session = Depends(get_db),
):
    """买菜做饭：临期优先菜谱 + 缺料补购 Bundle → 闪购/小象"""
    try:
        return bundle_scenario_service.generate_cook_shop_bundle(
            db,
            request.user_id,
            recipe_id=request.recipe_id,
            servings=request.servings,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/weekend-restock", response_model=ScenarioBundleResponse)
def weekend_restock_scenario(
    request: WeekendRestockScenarioRequest,
    db: Session = Depends(get_db),
):
    """周末补货：按家庭人数周采购 Bundle → 小象定时达"""
    try:
        return bundle_scenario_service.generate_weekend_restock_bundle(
            db,
            request.user_id,
            family_count=request.family_count,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/home-gathering", response_model=ScenarioBundleResponse)
def home_gathering_scenario(
    request: HomeGatheringScenarioRequest,
    db: Session = Depends(get_db),
):
    """居家聚会：库存盘点 + 缺口 Bundle → 闪购组合购"""
    try:
        return bundle_scenario_service.generate_home_gathering_bundle(
            db,
            request.user_id,
            event_type=request.event_type,
            guest_count=request.guest_count,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/bundle/order", response_model=BundleOrderResponse)
def order_bundle(
    order: BundleOrderCreate,
    db: Session = Depends(get_db),
):
    """Bundle 一键下单 — 以组合 SKU 为单位提交订单"""
    order_id = f"mt_bundle_order_{uuid.uuid4().hex[:12]}"
    redirect_url = (
        f"https://bj.meituan.com/bundle/checkout?"
        f"bundle_sku_id={order.bundle_sku_id}&order_id={order_id}"
    )

    channel_labels = {
        "cook_shop": ("flash_sale", "美团闪购 / 小象超市"),
        "weekend_restock": ("xiaoxiang_scheduled", "小象定时达"),
        "home_gathering": ("flash_combo", "闪购组合购"),
    }
    default_channel, default_label = channel_labels.get(
        order.scenario, ("flash_sale", "美团闪购")
    )

    return BundleOrderResponse(
        order_id=order_id,
        bundle_id=order.bundle_id,
        bundle_sku_id=order.bundle_sku_id,
        redirect_url=redirect_url,
        total_amount=order.total_amount,
        item_count=order.item_count,
        redirect_channel=order.redirect_channel or default_channel,
        redirect_label=order.redirect_label or default_label,
    )
