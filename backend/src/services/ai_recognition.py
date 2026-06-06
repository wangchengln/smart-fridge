import logging
from typing import Any, Dict, List

from ..schemas.image_recognition import RecognizedIngredientItem
from .vision_recognition_service import VisionRecognitionError, vision_recognition_service

logger = logging.getLogger(__name__)


class AIRecognitionService:
    """
    AI 识别服务
    调用通义千问视觉模型（Qwen-VL）识别图片中的食材
    """

    def __init__(self):
        self.ingredient_database = {
            "西红柿": {"category": "蔬菜", "shelf_life": 7},
            "番茄": {"category": "蔬菜", "shelf_life": 7},
            "鸡蛋": {"category": "蛋类", "shelf_life": 30},
            "牛奶": {"category": "乳制品", "shelf_life": 7},
            "酸奶": {"category": "乳制品", "shelf_life": 7},
            "胡萝卜": {"category": "蔬菜", "shelf_life": 14},
            "土豆": {"category": "蔬菜", "shelf_life": 30},
            "洋葱": {"category": "蔬菜", "shelf_life": 60},
            "苹果": {"category": "水果", "shelf_life": 21},
            "香蕉": {"category": "水果", "shelf_life": 7},
            "鸡肉": {"category": "肉类", "shelf_life": 3},
            "猪肉": {"category": "肉类", "shelf_life": 3},
            "牛肉": {"category": "肉类", "shelf_life": 5},
            "鱼": {"category": "海鲜", "shelf_life": 2},
            "虾": {"category": "海鲜", "shelf_life": 2},
            "大米": {"category": "粮食", "shelf_life": 365},
            "面粉": {"category": "粮食", "shelf_life": 180},
            "面包": {"category": "粮食", "shelf_life": 7},
            "食用油": {"category": "调料", "shelf_life": 365},
            "盐": {"category": "调料", "shelf_life": 1095},
            "糖": {"category": "调料", "shelf_life": 1095},
            "酱油": {"category": "调料", "shelf_life": 365},
            "醋": {"category": "调料", "shelf_life": 365},
            "豆腐": {"category": "豆制品", "shelf_life": 7},
            "蘑菇": {"category": "菌类", "shelf_life": 7},
        }

    def recognize_ingredients(
        self,
        image_path: str,
        recognition_type: str,
    ) -> List[RecognizedIngredientItem]:
        """
        识别图片中的食材
        :param image_path: 图片路径
        :param recognition_type: 识别类型 (fridge/shopping_bag)
        :return: 识别出的食材列表
        """
        try:
            ingredients = vision_recognition_service.recognize_ingredients(
                image_path,
                recognition_type,
            )
        except VisionRecognitionError:
            raise
        except Exception as exc:
            logger.exception("食材识别失败")
            raise VisionRecognitionError(f"食材识别失败：{exc}", status_code=502) from exc

        return self._enrich_ingredients(ingredients)

    def _enrich_ingredients(
        self,
        ingredients: List[RecognizedIngredientItem],
    ) -> List[RecognizedIngredientItem]:
        """用本地食材库补全分类信息，并合并重复项"""
        merged: Dict[str, RecognizedIngredientItem] = {}

        for item in ingredients:
            normalized_name = item.name.strip()
            db_info = self.ingredient_database.get(normalized_name)
            category = item.category or (db_info["category"] if db_info else "未分类")

            if normalized_name in merged:
                existing = merged[normalized_name]
                merged[normalized_name] = RecognizedIngredientItem(
                    name=normalized_name,
                    quantity=existing.quantity + item.quantity,
                    confidence=max(existing.confidence, item.confidence),
                    category=existing.category or category,
                )
            else:
                merged[normalized_name] = RecognizedIngredientItem(
                    name=normalized_name,
                    quantity=item.quantity,
                    confidence=item.confidence,
                    category=category,
                )

        return list(merged.values())

    def validate_recognition_result(self, ingredients: List[RecognizedIngredientItem]) -> Dict[str, Any]:
        """
        验证识别结果的合理性
        :param ingredients: 识别出的食材列表
        :return: 验证结果
        """
        validation_result: Dict[str, Any] = {
            "is_valid": True,
            "warnings": [],
            "suggestions": [],
        }

        low_confidence_items = [item for item in ingredients if item.confidence < 0.7]
        if low_confidence_items:
            validation_result["warnings"].append(
                f"发现{len(low_confidence_items)}个低置信度识别结果"
            )
            validation_result["suggestions"].append("建议手动确认低置信度食材")

        unreasonable_quantities = [item.name for item in ingredients if item.quantity > 20]
        if unreasonable_quantities:
            validation_result["warnings"].append(
                f"以下食材数量可能不合理: {', '.join(unreasonable_quantities)}"
            )
            validation_result["suggestions"].append("请检查食材数量是否正确")

        ingredient_names = [item.name for item in ingredients]
        duplicates = {name for name in ingredient_names if ingredient_names.count(name) > 1}
        if duplicates:
            validation_result["warnings"].append(f"发现重复食材: {', '.join(duplicates)}")
            validation_result["suggestions"].append("请合并重复的食材")

        if validation_result["warnings"]:
            validation_result["is_valid"] = False

        return validation_result


ai_recognition_service = AIRecognitionService()
