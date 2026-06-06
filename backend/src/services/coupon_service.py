from decimal import Decimal
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from ..crud.coupon import get_user_available_coupons
from ..schemas.coupon import (
    MatchedCoupon,
    PriceComparison,
    PriceComparisonBreakdown,
    UserCouponItem,
)


COUPON_TYPE_LABELS = {
    "flash_sale": "闪购券",
    "delivery": "外卖券",
    "cross_store": "跨店券",
}


class CouponService:
    """美团神券匹配与价格计算服务"""

    DELIVERY_FEE = Decimal("3.00")

    def calculate_discount(
        self,
        order_amount: Decimal,
        discount_type: str,
        discount_value: Decimal,
        min_order_amount: Decimal,
        max_discount: Optional[Decimal] = None,
    ) -> Decimal:
        if order_amount < min_order_amount:
            return Decimal("0")

        if discount_type == "percent":
            discount = order_amount * discount_value / Decimal("100")
            if max_discount is not None:
                discount = min(discount, max_discount)
            return Decimal(str(round(float(discount), 2)))

        return min(discount_value, order_amount)

    def _coupon_to_item(
        self, user_coupon, order_amount: Optional[Decimal] = None
    ) -> UserCouponItem:
        coupon = user_coupon.coupon
        estimated = None
        is_applicable = False
        if order_amount is not None:
            estimated = self.calculate_discount(
                order_amount,
                coupon.discount_type,
                Decimal(str(coupon.discount_value)),
                Decimal(str(coupon.min_order_amount)),
                Decimal(str(coupon.max_discount)) if coupon.max_discount else None,
            )
            is_applicable = estimated > 0

        return UserCouponItem(
            user_coupon_id=user_coupon.id,
            coupon_id=coupon.id,
            coupon_type=coupon.coupon_type,
            name=coupon.name,
            description=coupon.description,
            discount_type=coupon.discount_type,
            discount_value=Decimal(str(coupon.discount_value)),
            min_order_amount=Decimal(str(coupon.min_order_amount)),
            max_discount=Decimal(str(coupon.max_discount)) if coupon.max_discount else None,
            applicable_scope=coupon.applicable_scope,
            status=user_coupon.status,
            expires_at=user_coupon.expires_at,
            estimated_discount=estimated,
            is_applicable=is_applicable,
        )

    def get_user_coupons_with_estimates(
        self, db: Session, user_id: int, order_amount: Optional[Decimal] = None
    ) -> List[UserCouponItem]:
        records = get_user_available_coupons(db, user_id)
        return [self._coupon_to_item(r, order_amount) for r in records]

    def match_coupons_for_order(
        self,
        db: Session,
        user_id: int,
        order_amount: Decimal,
        scopes: Optional[List[str]] = None,
    ) -> List[MatchedCoupon]:
        """
        为订单金额匹配可用神券，按抵扣金额降序。
        scopes: grocery / delivery / all
        """
        if scopes is None:
            scopes = ["grocery", "all"]

        records = get_user_available_coupons(db, user_id)
        matched: List[MatchedCoupon] = []

        for record in records:
            coupon = record.coupon
            scope = coupon.applicable_scope
            if scope != "all" and scope not in scopes:
                continue

            discount = self.calculate_discount(
                order_amount,
                coupon.discount_type,
                Decimal(str(coupon.discount_value)),
                Decimal(str(coupon.min_order_amount)),
                Decimal(str(coupon.max_discount)) if coupon.max_discount else None,
            )
            if discount <= 0:
                continue

            matched.append(
                MatchedCoupon(
                    user_coupon_id=record.id,
                    coupon_id=coupon.id,
                    coupon_type=coupon.coupon_type,
                    name=coupon.name,
                    discount_amount=discount,
                    min_order_amount=Decimal(str(coupon.min_order_amount)),
                    is_best=False,
                )
            )

        matched.sort(key=lambda x: float(x.discount_amount), reverse=True)
        if matched:
            matched[0].is_best = True
        return matched

    def apply_best_coupon(
        self,
        db: Session,
        user_id: int,
        order_amount: Decimal,
        scopes: Optional[List[str]] = None,
    ) -> Tuple[Decimal, Optional[MatchedCoupon]]:
        matched = self.match_coupons_for_order(db, user_id, order_amount, scopes)
        if not matched:
            return Decimal("0"), None
        best = matched[0]
        return best.discount_amount, best

    def build_price_comparison(
        self,
        db: Session,
        user_id: int,
        purchase_subtotal: Decimal,
        cooking_time: int,
        missing_count: int,
        existing_stock_value: Decimal = Decimal("0"),
    ) -> PriceComparison:
        """
        对比「自己买+做」vs「外卖+券后价」真实到手价。
        """
        flash_matched = self.match_coupons_for_order(
            db, user_id, purchase_subtotal, scopes=["grocery", "all"]
        )
        flash_discount = flash_matched[0].discount_amount if flash_matched else Decimal("0")
        cook_final = max(Decimal("0"), purchase_subtotal - flash_discount)

        estimated_takeout = Decimal(
            str(round(18 + cooking_time * 0.6 + missing_count * 3.5, 2))
        )
        takeout_subtotal = estimated_takeout + self.DELIVERY_FEE

        delivery_matched = self.match_coupons_for_order(
            db, user_id, takeout_subtotal, scopes=["delivery", "all"]
        )
        takeout_discount = (
            delivery_matched[0].discount_amount if delivery_matched else Decimal("0")
        )
        takeout_final = max(Decimal("0"), takeout_subtotal - takeout_discount)

        if cook_final <= takeout_final:
            recommended = "cook_self"
            savings = takeout_final - cook_final
            tip = (
                f"自己买食材+制作到手约¥{float(cook_final):.2f}"
                f"（闪购券减¥{float(flash_discount):.2f}），"
                f"比外卖券后价省¥{float(savings):.2f}"
            )
        else:
            recommended = "takeout"
            savings = cook_final - takeout_final
            tip = (
                f"外卖券后到手约¥{float(takeout_final):.2f}"
                f"（含配送费¥{float(self.DELIVERY_FEE):.2f}，券减¥{float(takeout_discount):.2f}），"
                f"比自己做省¥{float(savings):.2f}"
            )

        return PriceComparison(
            cook_self=PriceComparisonBreakdown(
                subtotal=purchase_subtotal,
                coupon_discount=flash_discount,
                delivery_fee=Decimal("0"),
                final_price=cook_final,
            ),
            takeout=PriceComparisonBreakdown(
                subtotal=estimated_takeout,
                coupon_discount=takeout_discount,
                delivery_fee=self.DELIVERY_FEE,
                final_price=takeout_final,
            ),
            recommended=recommended,
            savings_amount=Decimal(str(round(float(savings), 2))),
            savings_tip=tip,
        )


coupon_service = CouponService()
