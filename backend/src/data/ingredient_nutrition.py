"""
食材营养数据（每 100g 估算值，用于减脂/爸妈模式分析）
"""
from typing import Dict, Optional, TypedDict


class NutritionInfo(TypedDict):
    calories_per_100g: int
    sodium_mg_per_100g: int
    sugar_g_per_100g: float
    is_high_potassium: bool


# 高钾阈值：>300mg/100g 视为高钾（与降压药存在潜在冲突）
# 高钠阈值：>400mg/100g
# 高糖阈值：>8g/100g
# 高热量阈值：>200kcal/100g

INGREDIENT_NUTRITION: Dict[str, NutritionInfo] = {
    "西红柿": {"calories_per_100g": 18, "sodium_mg_per_100g": 5, "sugar_g_per_100g": 2.6, "is_high_potassium": True},
    "胡萝卜": {"calories_per_100g": 41, "sodium_mg_per_100g": 69, "sugar_g_per_100g": 4.7, "is_high_potassium": False},
    "土豆": {"calories_per_100g": 77, "sodium_mg_per_100g": 6, "sugar_g_per_100g": 0.8, "is_high_potassium": True},
    "洋葱": {"calories_per_100g": 40, "sodium_mg_per_100g": 4, "sugar_g_per_100g": 4.2, "is_high_potassium": False},
    "苹果": {"calories_per_100g": 52, "sodium_mg_per_100g": 1, "sugar_g_per_100g": 10.4, "is_high_potassium": False},
    "香蕉": {"calories_per_100g": 89, "sodium_mg_per_100g": 1, "sugar_g_per_100g": 12.2, "is_high_potassium": True},
    "猪肉": {"calories_per_100g": 242, "sodium_mg_per_100g": 62, "sugar_g_per_100g": 0.0, "is_high_potassium": False},
    "鸡肉": {"calories_per_100g": 165, "sodium_mg_per_100g": 74, "sugar_g_per_100g": 0.0, "is_high_potassium": False},
    "鸡蛋": {"calories_per_100g": 155, "sodium_mg_per_100g": 124, "sugar_g_per_100g": 1.1, "is_high_potassium": False},
    "牛奶": {"calories_per_100g": 42, "sodium_mg_per_100g": 44, "sugar_g_per_100g": 5.0, "is_high_potassium": False},
    "酸奶": {"calories_per_100g": 59, "sodium_mg_per_100g": 36, "sugar_g_per_100g": 4.7, "is_high_potassium": False},
    "虾": {"calories_per_100g": 99, "sodium_mg_per_100g": 111, "sugar_g_per_100g": 0.0, "is_high_potassium": False},
    "牛肉": {"calories_per_100g": 250, "sodium_mg_per_100g": 72, "sugar_g_per_100g": 0.0, "is_high_potassium": False},
    "鱼": {"calories_per_100g": 120, "sodium_mg_per_100g": 90, "sugar_g_per_100g": 0.0, "is_high_potassium": False},
    "豆腐": {"calories_per_100g": 76, "sodium_mg_per_100g": 7, "sugar_g_per_100g": 0.6, "is_high_potassium": True},
    "蘑菇": {"calories_per_100g": 22, "sodium_mg_per_100g": 5, "sugar_g_per_100g": 2.0, "is_high_potassium": True},
    "大米": {"calories_per_100g": 130, "sodium_mg_per_100g": 1, "sugar_g_per_100g": 0.1, "is_high_potassium": False},
    "玉米": {"calories_per_100g": 86, "sodium_mg_per_100g": 15, "sugar_g_per_100g": 6.3, "is_high_potassium": False},
    "鸡翅": {"calories_per_100g": 203, "sodium_mg_per_100g": 82, "sugar_g_per_100g": 0.0, "is_high_potassium": False},
    "烧烤调料": {"calories_per_100g": 320, "sodium_mg_per_100g": 6800, "sugar_g_per_100g": 8.0, "is_high_potassium": False},
    "啤酒": {"calories_per_100g": 43, "sodium_mg_per_100g": 4, "sugar_g_per_100g": 0.0, "is_high_potassium": False},
    "黄瓜": {"calories_per_100g": 15, "sodium_mg_per_100g": 2, "sugar_g_per_100g": 1.7, "is_high_potassium": False},
    "面包": {"calories_per_100g": 265, "sodium_mg_per_100g": 491, "sugar_g_per_100g": 5.0, "is_high_potassium": False},
}

DEFAULT_NUTRITION: NutritionInfo = {
    "calories_per_100g": 80,
    "sodium_mg_per_100g": 50,
    "sugar_g_per_100g": 2.0,
    "is_high_potassium": False,
}

HIGH_CALORIE_THRESHOLD = 200
HIGH_SODIUM_THRESHOLD = 400
HIGH_SUGAR_THRESHOLD = 8.0

MEITUAN_PHARMACY_URL = "https://yiyao.meituan.com/main/home"


def get_nutrition(ingredient_name: str) -> NutritionInfo:
    return INGREDIENT_NUTRITION.get(ingredient_name.strip(), DEFAULT_NUTRITION)
