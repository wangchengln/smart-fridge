"""云冰箱 AI Agent — 先查库存再生成闪购方案"""

from __future__ import annotations

import hashlib
import json
import logging
from decimal import Decimal
from typing import Any, Dict, Generator, List, Optional, Tuple

from sqlalchemy.orm import Session

from ..crud.ingredient_base import get_ingredient_by_id, get_ingredient_by_name, get_or_create_ingredient_base
from ..crud.recipe_base import get_all_recipes
from ..crud.recipe_ingredient_rel import get_recipe_ingredients
from ..crud.user import get_user_by_id
from ..crud.user_ingredient import get_user_ingredients_with_details
from ..schemas.fridge_agent import (
    FridgeAgentCartItem,
    FridgeAgentPriceEstimate,
    FridgeAgentRecipeItem,
    FridgeAgentStructuredResult,
)
from ..schemas.purchase import MissingIngredientAnalyze
from ..services.deepseek_service import deepseek_service
from ..services.purchase_plan_service import purchase_plan_service

logger = logging.getLogger(__name__)

SCENARIO_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "camping_bbq": {
        "label": "露营烧烤",
        "default_people": 4,
        "ingredients": [
            ("玉米", 4.0),
            ("鸡翅", 0.8),
            ("木炭", 1.0),
            ("烧烤调料", 1.0),
            ("啤酒", 6.0),
            ("土豆", 2.0),
            ("洋葱", 1.0),
        ],
        "recipe_keywords": ["烤", "烧烤", "鸡翅", "玉米", "土豆"],
        "redirect_channel": "flash_sale",
    },
    "home_bbq": {
        "label": "居家烧烤",
        "default_people": 4,
        "ingredients": [
            ("猪肉", 0.8),
            ("鸡翅", 0.6),
            ("玉米", 2.0),
            ("木炭", 1.0),
            ("烧烤调料", 1.0),
            ("啤酒", 4.0),
            ("土豆", 2.0),
            ("洋葱", 1.0),
        ],
        "recipe_keywords": ["烤", "烧烤", "肉"],
        "redirect_channel": "flash_combo",
    },
    "hotpot": {
        "label": "火锅聚会",
        "default_people": 4,
        "ingredients": [
            ("牛肉", 0.6),
            ("虾", 0.4),
            ("豆腐", 1.0),
            ("蘑菇", 0.5),
            ("土豆", 1.0),
            ("洋葱", 0.5),
            ("西红柿", 2.0),
        ],
        "recipe_keywords": ["火锅", "煮", "炖"],
        "redirect_channel": "flash_combo",
    },
    "picnic": {
        "label": "野餐便当",
        "default_people": 3,
        "ingredients": [
            ("鸡蛋", 6.0),
            ("西红柿", 2.0),
            ("黄瓜", 2.0),
            ("面包", 1.0),
            ("酸奶", 3.0),
            ("苹果", 4.0),
        ],
        "recipe_keywords": ["沙拉", "炒", "凉拌"],
        "redirect_channel": "flash_sale",
    },
}

REDIRECT_META = {
    "flash_sale": {
        "label": "美团闪购 / 小象超市",
        "url_tpl": "https://bj.meituan.com/flash-sale/bundle/{bundle_sku_id}",
    },
    "flash_combo": {
        "label": "闪购组合购",
        "url_tpl": "https://bj.meituan.com/flash-sale/combo/{bundle_sku_id}",
    },
}

AGENT_TOOLS: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_fridge_inventory",
            "description": "查询用户云冰箱当前库存，返回所有在库食材、数量及临期状态。处理任何场景需求前必须先调用。",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "analyze_scenario",
            "description": "根据场景类型分析冰箱库存是否满足需求，返回已有食材和缺失食材清单。",
            "parameters": {
                "type": "object",
                "properties": {
                    "scenario_type": {
                        "type": "string",
                        "enum": list(SCENARIO_TEMPLATES.keys()),
                        "description": "场景类型：camping_bbq=露营烧烤, home_bbq=居家烧烤, hotpot=火锅, picnic=野餐",
                    },
                    "people_count": {
                        "type": "integer",
                        "description": "用餐/出行人数，默认按场景模板",
                    },
                },
                "required": ["scenario_type"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "recommend_scenario_recipes",
            "description": "基于场景和当前冰箱库存，推荐最匹配的菜谱（含匹配度与缺口数）。",
            "parameters": {
                "type": "object",
                "properties": {
                    "scenario_type": {
                        "type": "string",
                        "enum": list(SCENARIO_TEMPLATES.keys()),
                    },
                    "limit": {"type": "integer", "description": "推荐数量，默认3"},
                },
                "required": ["scenario_type"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_flash_cart",
            "description": "为场景缺失食材生成美团闪购购物车，含商品匹配、预估价格及美团神券抵扣。",
            "parameters": {
                "type": "object",
                "properties": {
                    "scenario_type": {
                        "type": "string",
                        "enum": list(SCENARIO_TEMPLATES.keys()),
                    },
                    "people_count": {"type": "integer"},
                },
                "required": ["scenario_type"],
            },
        },
    },
]


class FridgeAgentService:
    """云冰箱 AI Agent 编排服务"""

    def __init__(self) -> None:
        self._ctx: Dict[str, Any] = {}

    @staticmethod
    def build_system_prompt() -> str:
        return (
            "你是「美团智能云冰箱」首页 AI Agent，对标阿里千问闪购，核心差异是：\n"
            "【说一句话，但先看过你的冰箱里面有什么】—— 必须先查库存，再推荐购买。\n\n"
            "标准流程：\n"
            "1. 理解用户场景（露营烧烤、火锅、野餐等）\n"
            "2. 调用 get_fridge_inventory 查看冰箱\n"
            "3. 调用 analyze_scenario 分析缺口\n"
            "4. 调用 recommend_scenario_recipes 推荐场景菜谱\n"
            "5. 若有缺口，调用 generate_flash_cart 生成闪购购物车与预估价（含神券）\n"
            "6. 用亲切、有行动力的中文总结：库存有什么、缺什么、推荐菜谱、闪购到手价\n\n"
            "要求：\n"
            "- 绝不跳过库存检查直接推荐购买\n"
            "- 明确区分「冰箱已有」和「需要闪购补齐」\n"
            "- 提到美团闪购、神券优惠\n"
            "- 回答控制在 400 字以内，条理清晰"
        )

    def _reset_context(self) -> None:
        self._ctx = {
            "inventory": None,
            "analyze": None,
            "recipes": None,
            "cart": None,
        }

    def _get_stock_items(self, db: Session, user_id: int) -> List[Dict[str, Any]]:
        payload = get_user_ingredients_with_details(db, user_id)
        return payload.get("stocks") or []

    def _get_stock_map(self, db: Session, user_id: int) -> Dict[int, float]:
        return {
            item["ingredient_id"]: float(item["quantity"])
            for item in self._get_stock_items(db, user_id)
        }

    def _resolve_ingredient(
        self, db: Session, name: str, category: str = "食材"
    ) -> Tuple[int, str]:
        ing = get_ingredient_by_name(db, name)
        if ing:
            return ing.id, ing.name
        created = get_or_create_ingredient_base(db, name, category=category)
        return created.id, created.name

    def _scale_scenario_needs(
        self,
        db: Session,
        scenario_type: str,
        people_count: Optional[int],
    ) -> Tuple[str, int, List[Dict[str, Any]]]:
        template = SCENARIO_TEMPLATES[scenario_type]
        base_people = template["default_people"]
        people = people_count or base_people
        scale = people / base_people

        needs: List[Dict[str, Any]] = []
        for name, base_qty in template["ingredients"]:
            ing_id, resolved_name = self._resolve_ingredient(db, name)
            needs.append(
                {
                    "ingredient_id": ing_id,
                    "name": resolved_name,
                    "required_quantity": round(base_qty * scale, 2),
                }
            )
        return template["label"], people, needs

    def _tool_get_fridge_inventory(self, db: Session, user_id: int) -> Dict[str, Any]:
        stocks = self._get_stock_items(db, user_id)
        items = [
            {
                "ingredient_id": s["ingredient_id"],
                "name": s.get("ingredient_name") or s.get("name"),
                "quantity": s["quantity"],
                "unit": "份",
                "near_expiry": s.get("near_expiry", False),
                "freshness": s.get("freshness", "fresh"),
            }
            for s in stocks
        ]
        result = {
            "total_count": len(items),
            "items": items,
            "summary": (
                "、".join(f"{i['name']}×{i['quantity']}" for i in items[:8])
                if items
                else "冰箱暂无库存，建议通过拍照识别或手动录入"
            ),
        }
        self._ctx["inventory"] = result
        return result

    def _tool_analyze_scenario(
        self,
        db: Session,
        user_id: int,
        scenario_type: str,
        people_count: Optional[int] = None,
    ) -> Dict[str, Any]:
        if scenario_type not in SCENARIO_TEMPLATES:
            return {"error": f"不支持的场景: {scenario_type}"}

        label, people, needs = self._scale_scenario_needs(db, scenario_type, people_count)
        stock_map = self._get_stock_map(db, user_id)

        in_stock: List[str] = []
        missing: List[MissingIngredientAnalyze] = []
        covered = 0

        for need in needs:
            current = stock_map.get(need["ingredient_id"], 0)
            required = need["required_quantity"]
            name = need["name"]
            if current >= required:
                covered += 1
                in_stock.append(f"{name}（{current}{'份' if current == int(current) else ''}）")
            else:
                missing.append(
                    MissingIngredientAnalyze(
                        ingredient_id=need["ingredient_id"],
                        name=name,
                        required_quantity=Decimal(str(required)),
                        current_quantity=Decimal(str(current)),
                    )
                )

        missing_labels = [m.name for m in missing]
        result = {
            "scenario_type": scenario_type,
            "scenario_label": label,
            "people_count": people,
            "in_stock": in_stock,
            "missing": missing_labels,
            "covered_count": covered,
            "total_needed": len(needs),
            "coverage_summary": f"冰箱已覆盖 {covered}/{len(needs)} 项",
            "missing_analyze": missing,
        }
        self._ctx["analyze"] = result
        return {
            k: v
            for k, v in result.items()
            if k != "missing_analyze"
        }

    def _tool_recommend_recipes(
        self,
        db: Session,
        user_id: int,
        scenario_type: str,
        limit: int = 3,
    ) -> Dict[str, Any]:
        if scenario_type not in SCENARIO_TEMPLATES:
            return {"error": f"不支持的场景: {scenario_type}"}

        template = SCENARIO_TEMPLATES[scenario_type]
        keywords = template["recipe_keywords"]
        stock_map = self._get_stock_map(db, user_id)
        recipes = get_all_recipes(db)

        scored: List[Tuple[float, Any, List[str], int]] = []
        for recipe in recipes:
            reqs = get_recipe_ingredients(db, recipe.id)
            covered_names: List[str] = []
            missing_count = 0
            for req in reqs:
                ing = get_ingredient_by_id(db, req.ingredient_id)
                name = ing.name if ing else ""
                current = stock_map.get(req.ingredient_id, 0)
                required = float(req.required_quantity)
                if current >= required:
                    covered_names.append(name)
                else:
                    missing_count += 1

            keyword_bonus = sum(1.0 for kw in keywords if kw in recipe.name)
            match_ratio = len(covered_names) / max(len(reqs), 1)
            score = keyword_bonus * 2 + match_ratio * 3 - missing_count * 0.5
            scored.append((score, recipe, covered_names, missing_count))

        scored.sort(key=lambda x: x[0], reverse=True)
        top = scored[: max(limit, 1)]

        recipe_items: List[FridgeAgentRecipeItem] = []
        for score, recipe, covered_names, missing_count in top:
            match_score = min(0.99, max(0.1, (score + 3) / 8))
            recipe_items.append(
                FridgeAgentRecipeItem(
                    recipe_id=recipe.id,
                    recipe_name=recipe.name,
                    cooking_time=recipe.cooking_time or 30,
                    match_score=round(match_score, 2),
                    missing_ingredients_count=missing_count,
                    covered_ingredients=covered_names[:5],
                )
            )

        self._ctx["recipes"] = recipe_items
        return {
            "recipes": [r.model_dump(mode="json") for r in recipe_items],
            "scenario_label": template["label"],
        }

    def _tool_generate_flash_cart(
        self,
        db: Session,
        user_id: int,
        scenario_type: str,
        people_count: Optional[int] = None,
    ) -> Dict[str, Any]:
        analyze = self._ctx.get("analyze")
        if not analyze or analyze.get("scenario_type") != scenario_type:
            self._tool_analyze_scenario(db, user_id, scenario_type, people_count)
            analyze = self._ctx["analyze"]

        missing: List[MissingIngredientAnalyze] = analyze.get("missing_analyze") or []
        if not missing:
            result = {
                "message": "库存充足，无需闪购补货",
                "flash_cart": [],
                "price_estimate": None,
            }
            self._ctx["cart"] = result
            return result

        standard_plan, _, _ = purchase_plan_service.generate_purchase_plans(
            missing, db=db, user_id=user_id, cooking_time=45
        )

        cart_items: List[FridgeAgentCartItem] = [
            FridgeAgentCartItem(
                sku_id=item.product_id or f"sku_{item.ingredient_id}",
                sku_name=item.product_name or item.name,
                ingredient_id=item.ingredient_id,
                ingredient_name=item.name,
                quantity=item.quantity,
                unit=item.unit or "份",
                spec=item.spec,
                price=item.price,
                tier=item.tier,
                rating=item.rating,
            )
            for item in standard_plan.items
        ]

        coupon_label = None
        if standard_plan.matched_coupons:
            best = standard_plan.matched_coupons[0]
            coupon_label = f"已匹配{best.name}，立减¥{float(best.discount_amount):.2f}"

        price_estimate = FridgeAgentPriceEstimate(
            total_price=standard_plan.total_price,
            original_price=standard_plan.original_price,
            discount_amount=standard_plan.discount_amount,
            coupon_discount=standard_plan.coupon_discount,
            final_price=standard_plan.final_price,
            matched_coupons=standard_plan.matched_coupons,
            savings_label=coupon_label,
        )

        template = SCENARIO_TEMPLATES[scenario_type]
        item_names = [c.ingredient_name for c in cart_items]
        digest = hashlib.md5("|".join(sorted(item_names)).encode()).hexdigest()[:10]
        bundle_sku_id = f"mt_agent_{scenario_type}_{digest}"
        redirect = REDIRECT_META[template["redirect_channel"]]

        result = {
            "flash_cart": [c.model_dump(mode="json") for c in cart_items],
            "item_count": len(cart_items),
            "price_estimate": price_estimate.model_dump(mode="json"),
            "bundle_sku_id": bundle_sku_id,
            "redirect_label": redirect["label"],
            "redirect_url": redirect["url_tpl"].format(bundle_sku_id=bundle_sku_id),
            "scenario_label": analyze.get("scenario_label"),
        }
        self._ctx["cart"] = {
            "flash_cart": cart_items,
            "price_estimate": price_estimate,
            "bundle_sku_id": bundle_sku_id,
            "redirect_label": redirect["label"],
            "redirect_url": redirect["url_tpl"].format(bundle_sku_id=bundle_sku_id),
        }
        return result

    def _build_structured_result(self) -> Optional[FridgeAgentStructuredResult]:
        analyze = self._ctx.get("analyze")
        if not analyze:
            return None

        recipes: List[FridgeAgentRecipeItem] = self._ctx.get("recipes") or []
        cart_ctx = self._ctx.get("cart") or {}

        return FridgeAgentStructuredResult(
            scenario_type=analyze.get("scenario_type"),
            scenario_label=analyze.get("scenario_label"),
            people_count=analyze.get("people_count"),
            in_stock=analyze.get("in_stock", []),
            missing=analyze.get("missing", []),
            coverage_summary=analyze.get("coverage_summary"),
            recipes=recipes,
            flash_cart=cart_ctx.get("flash_cart") or [],
            price_estimate=cart_ctx.get("price_estimate"),
            bundle_sku_id=cart_ctx.get("bundle_sku_id"),
            redirect_label=cart_ctx.get("redirect_label"),
            redirect_url=cart_ctx.get("redirect_url"),
        )

    def process_chat(
        self,
        db: Session,
        *,
        user_id: int,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        user = get_user_by_id(db, user_id)
        if not user:
            raise ValueError("用户不存在")

        self._reset_context()

        messages: List[Dict[str, Any]] = [
            {"role": "system", "content": self.build_system_prompt()},
        ]
        for item in history or []:
            role = item.get("role")
            content = (item.get("content") or "").strip()
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": message.strip()})

        def tool_executor(tool_name: str, args: Dict[str, Any]) -> Any:
            if tool_name == "get_fridge_inventory":
                return self._tool_get_fridge_inventory(db, user_id)
            if tool_name == "analyze_scenario":
                return self._tool_analyze_scenario(
                    db,
                    user_id,
                    args.get("scenario_type", "camping_bbq"),
                    args.get("people_count"),
                )
            if tool_name == "recommend_scenario_recipes":
                return self._tool_recommend_recipes(
                    db,
                    user_id,
                    args.get("scenario_type", "camping_bbq"),
                    args.get("limit", 3),
                )
            if tool_name == "generate_flash_cart":
                return self._tool_generate_flash_cart(
                    db,
                    user_id,
                    args.get("scenario_type", "camping_bbq"),
                    args.get("people_count"),
                )
            return {"error": f"未知工具: {tool_name}"}

        answer, tool_calls_made, _ = deepseek_service.chat_with_tools(
            messages=messages,
            tools=AGENT_TOOLS,
            tool_executor=tool_executor,
        )

        structured = self._build_structured_result()
        return {
            "answer": answer,
            "model": deepseek_service.model,
            "provider": "deepseek",
            "tool_calls_made": tool_calls_made,
            "structured": structured,
        }

    def process_chat_stream(
        self,
        db: Session,
        *,
        user_id: int,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Generator[Dict[str, Any], None, None]:
        """流式处理 Agent 对话，yield SSE 事件字典。"""
        user = get_user_by_id(db, user_id)
        if not user:
            raise ValueError("用户不存在")

        self._reset_context()

        messages: List[Dict[str, Any]] = [
            {"role": "system", "content": self.build_system_prompt()},
        ]
        for item in history or []:
            role = item.get("role")
            content = (item.get("content") or "").strip()
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": message.strip()})

        def tool_executor(tool_name: str, args: Dict[str, Any]) -> Any:
            if tool_name == "get_fridge_inventory":
                return self._tool_get_fridge_inventory(db, user_id)
            if tool_name == "analyze_scenario":
                return self._tool_analyze_scenario(
                    db,
                    user_id,
                    args.get("scenario_type", "camping_bbq"),
                    args.get("people_count"),
                )
            if tool_name == "recommend_scenario_recipes":
                return self._tool_recommend_recipes(
                    db,
                    user_id,
                    args.get("scenario_type", "camping_bbq"),
                    args.get("limit", 3),
                )
            if tool_name == "generate_flash_cart":
                return self._tool_generate_flash_cart(
                    db,
                    user_id,
                    args.get("scenario_type", "camping_bbq"),
                    args.get("people_count"),
                )
            return {"error": f"未知工具: {tool_name}"}

        for event in deepseek_service.chat_with_tools_stream(
            messages=messages,
            tools=AGENT_TOOLS,
            tool_executor=tool_executor,
        ):
            if event.get("done"):
                structured = self._build_structured_result()
                yield {
                    "done": True,
                    "model": deepseek_service.model,
                    "provider": "deepseek",
                    "tool_calls_made": event.get("tool_calls_made") or [],
                    "structured": structured.model_dump(mode="json") if structured else None,
                }
                return
            yield event


fridge_agent_service = FridgeAgentService()
