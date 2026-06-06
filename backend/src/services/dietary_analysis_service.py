"""
饮食模式分析服务 — 正常 / 减脂 / 爸妈模式
"""
from typing import Any, Dict, List, Optional

from ..data.ingredient_nutrition import (
    HIGH_CALORIE_THRESHOLD,
    HIGH_SODIUM_THRESHOLD,
    HIGH_SUGAR_THRESHOLD,
    MEITUAN_PHARMACY_URL,
    get_nutrition,
)

DIETARY_MODES = ("normal", "fat_loss", "parents")

MODE_LABELS = {
    "normal": "正常模式",
    "fat_loss": "减脂模式",
    "parents": "爸妈模式",
}


class DietaryAnalysisService:
    """根据用户饮食模式分析菜谱营养与用药冲突"""

    GRAMS_PER_UNIT = 100  # required_quantity 按 100g 份计

    def _scale_qty(self, base_qty: float, servings: int, base_servings: int) -> float:
        if base_servings <= 0:
            base_servings = 2
        return base_qty * servings / base_servings

    def _analyze_ingredient(
        self,
        name: str,
        quantity: float,
        dietary_mode: str,
    ) -> Dict[str, Any]:
        nutrition = get_nutrition(name)
        grams = quantity * self.GRAMS_PER_UNIT
        calories = round(nutrition["calories_per_100g"] * quantity, 1)
        sodium_mg = round(nutrition["sodium_mg_per_100g"] * quantity, 1)
        sugar_g = round(nutrition["sugar_g_per_100g"] * quantity, 1)

        tags: List[str] = []
        warnings: List[str] = []

        if dietary_mode == "fat_loss":
            if nutrition["calories_per_100g"] >= HIGH_CALORIE_THRESHOLD:
                tags.append("高热量")
                warnings.append(f"{name} 热量较高（{nutrition['calories_per_100g']} kcal/100g）")
            elif nutrition["calories_per_100g"] <= 50:
                tags.append("低卡")

        if dietary_mode == "parents":
            if nutrition["sodium_mg_per_100g"] >= HIGH_SODIUM_THRESHOLD:
                tags.append("高钠")
                warnings.append(f"{name} 钠含量偏高（{nutrition['sodium_mg_per_100g']} mg/100g），建议少放")
            elif nutrition["sodium_mg_per_100g"] <= 100:
                tags.append("低钠")

            if nutrition["sugar_g_per_100g"] >= HIGH_SUGAR_THRESHOLD:
                tags.append("高糖")
                warnings.append(f"{name} 糖分偏高（{nutrition['sugar_g_per_100g']} g/100g）")
            elif nutrition["sugar_g_per_100g"] <= 3:
                tags.append("低糖")

            if nutrition["is_high_potassium"]:
                tags.append("高钾")

        return {
            "name": name,
            "quantity": quantity,
            "grams_estimated": round(grams, 1),
            "calories": calories,
            "sodium_mg": sodium_mg,
            "sugar_g": sugar_g,
            "is_high_potassium": nutrition["is_high_potassium"],
            "tags": tags,
            "warnings": warnings,
        }

    def analyze_recipe(
        self,
        ingredients: List[Dict[str, Any]],
        *,
        dietary_mode: str = "normal",
        servings: int = 2,
        base_servings: int = 2,
        on_antihypertensive: bool = False,
    ) -> Dict[str, Any]:
        mode = dietary_mode if dietary_mode in DIETARY_MODES else "normal"

        analyzed: List[Dict[str, Any]] = []
        total_calories = 0.0
        total_sodium = 0.0
        total_sugar = 0.0
        high_potassium_items: List[str] = []
        all_warnings: List[str] = []
        medication_conflicts: List[Dict[str, Any]] = []

        for ing in ingredients:
            name = ing.get("name", "")
            base_qty = float(ing.get("required_quantity") or ing.get("scaled_quantity") or 0)
            scaled_qty = self._scale_qty(base_qty, servings, base_servings)
            item = self._analyze_ingredient(name, scaled_qty, mode)
            analyzed.append(item)
            total_calories += item["calories"]
            total_sodium += item["sodium_mg"]
            total_sugar += item["sugar_g"]
            if item["is_high_potassium"]:
                high_potassium_items.append(name)
            all_warnings.extend(item["warnings"])

        per_serving_calories = round(total_calories / max(servings, 1), 1)

        summary: Dict[str, Any] = {
            "dietary_mode": mode,
            "mode_label": MODE_LABELS[mode],
            "servings": servings,
            "total_calories": round(total_calories, 1),
            "calories_per_serving": per_serving_calories,
            "total_sodium_mg": round(total_sodium, 1),
            "total_sugar_g": round(total_sugar, 1),
            "ingredients": analyzed,
            "warnings": all_warnings,
        }

        if mode == "fat_loss":
            if per_serving_calories <= 350:
                summary["fat_loss_rating"] = "推荐"
                summary["fat_loss_tip"] = "本道菜人均热量较低，适合减脂期"
            elif per_serving_calories <= 550:
                summary["fat_loss_rating"] = "适中"
                summary["fat_loss_tip"] = "热量适中，建议控制主食搭配"
            else:
                summary["fat_loss_rating"] = "偏高"
                summary["fat_loss_tip"] = "热量偏高，建议减少油脂肉类用量或搭配蔬菜"

        if mode == "parents":
            sodium_level = "低" if total_sodium / max(servings, 1) < 600 else (
                "中" if total_sodium / max(servings, 1) < 1000 else "高"
            )
            sugar_level = "低" if total_sugar / max(servings, 1) < 10 else (
                "中" if total_sugar / max(servings, 1) < 20 else "高"
            )
            summary["sodium_level"] = sodium_level
            summary["sugar_level"] = sugar_level
            summary["parents_tip"] = (
                "钠/糖含量较低，适合长辈日常饮食"
                if sodium_level == "低" and sugar_level == "低"
                else "建议少盐少糖，烹饪时控制调料用量"
            )

            if on_antihypertensive and high_potassium_items:
                conflict_msg = (
                    f"本菜谱含高钾食材：{'、'.join(high_potassium_items)}。"
                    "服用降压药（如 ACEI/ARB 类）时，大量高钾食物可能影响血钾水平，请咨询医生。"
                )
                medication_conflicts.append({
                    "type": "antihypertensive_potassium",
                    "severity": "warning",
                    "message": conflict_msg,
                    "conflict_ingredients": high_potassium_items,
                    "meituan_pharmacy_url": MEITUAN_PHARMACY_URL,
                    "meituan_pharmacy_label": "美团买药 · 查看用药说明",
                })
                summary["warnings"].append(conflict_msg)

        summary["medication_conflicts"] = medication_conflicts
        summary["high_potassium_ingredients"] = high_potassium_items
        return summary

    def adjust_match_score_for_mode(
        self,
        base_score: float,
        recipe_taste: str,
        cooking_time: int,
        ingredients: List[Dict[str, Any]],
        dietary_mode: str,
        servings: int = 2,
        base_servings: int = 2,
    ) -> float:
        """根据饮食模式微调推荐匹配分"""
        if dietary_mode == "normal":
            return base_score

        analysis = self.analyze_recipe(
            ingredients,
            dietary_mode=dietary_mode,
            servings=servings,
            base_servings=base_servings,
        )
        bonus = 0.0

        if dietary_mode == "fat_loss":
            cps = analysis.get("calories_per_serving", 500)
            if cps <= 350:
                bonus += 0.08
            elif cps >= 600:
                bonus -= 0.1
            if recipe_taste == "清淡":
                bonus += 0.05
            if cooking_time <= 30:
                bonus += 0.03

        elif dietary_mode == "parents":
            if analysis.get("sodium_level") == "低":
                bonus += 0.06
            elif analysis.get("sodium_level") == "高":
                bonus -= 0.08
            if analysis.get("sugar_level") == "低":
                bonus += 0.04
            elif analysis.get("sugar_level") == "高":
                bonus -= 0.06
            if recipe_taste == "清淡":
                bonus += 0.05
            if cooking_time <= 25:
                bonus += 0.04

        return max(0, min(1, round(base_score + bonus, 4)))


dietary_analysis_service = DietaryAnalysisService()
