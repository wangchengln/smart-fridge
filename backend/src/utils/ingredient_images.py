"""
食材展示图与分类侧栏图标路径、名称映射（与前端 ingredientImageMap.ts / categoryImageMap.ts 保持一致）
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Dict, Optional, Tuple

BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
INGREDIENT_IMAGE_DIR = BACKEND_ROOT / "static" / "images" / "ingredients"
CATEGORY_IMAGE_DIR = INGREDIENT_IMAGE_DIR / "categories"

# 食材名称 -> 本地文件名
INGREDIENT_LOCAL_FILENAMES: Dict[str, str] = {
    "西红柿": "tomato.jpg",
    "胡萝卜": "carrot.jpg",
    "土豆": "potato.jpg",
    "洋葱": "onion.jpg",
    "苹果": "apple.jpg",
    "香蕉": "banana.jpg",
    "猪肉": "pork.jpg",
    "鸡肉": "chicken.jpg",
    "鸡蛋": "egg.jpg",
    "牛奶": "milk.jpg",
    "酸奶": "yogurt.jpg",
    "虾": "shrimp.jpg",
    "牛肉": "beef.jpg",
    "鱼": "fish.jpg",
    "豆腐": "tofu.jpg",
    "蘑菇": "mushroom.jpg",
    "大米": "rice.jpg",
    "玉米": "corn.jpg",
    "鸡翅": "chicken-wing.jpg",
    "可乐": "cola.jpg",
    "木炭": "charcoal.jpg",
    "烧烤调料": "bbq-seasoning.jpg",
    "啤酒": "beer.jpg",
    "黄瓜": "cucumber.jpg",
    "面包": "bread.jpg",
    # 用户通过冰箱添加的食材
    "草莓": "strawberry.jpg",
    "葡萄": "grape.jpg",
    "西兰花": "broccoli.jpg",
    "黄椒": "yellow-pepper.jpg",
    "绿叶菜": "leafy-greens.jpg",
    "奶酪": "cheese.jpg",
    "米饭": "cooked-rice.jpg",
    "炒菜（含芹菜、肉等）": "stir-fry-dish.jpg",
    "果汁（深红色）": "juice-dark-red.jpg",
    "果汁（黄色）": "juice-yellow.jpg",
    "果汁（橙红色）": "juice-orange-red.jpg",
    "大虾": "large-shrimp.jpg",
}

INGREDIENT_CATALOG: list[Tuple[str, str, int]] = [
    ("西红柿", "蔬菜", 7),
    ("胡萝卜", "蔬菜", 14),
    ("土豆", "蔬菜", 21),
    ("洋葱", "蔬菜", 14),
    ("苹果", "水果", 14),
    ("香蕉", "水果", 7),
    ("猪肉", "肉类", 3),
    ("鸡肉", "肉类", 3),
    ("鸡蛋", "蛋类", 14),
    ("牛奶", "乳制品", 7),
    ("酸奶", "乳制品", 7),
    ("虾", "海鲜", 2),
    ("牛肉", "肉类", 5),
    ("鱼", "海鲜", 2),
    ("豆腐", "豆制品", 7),
    ("蘑菇", "菌类", 7),
    ("大米", "粮食", 365),
    ("玉米", "蔬菜", 7),
    ("鸡翅", "肉类", 3),
    ("可乐", "饮品", 365),
    ("木炭", "用品", 365),
    ("烧烤调料", "调料", 180),
    ("啤酒", "饮品", 180),
    ("黄瓜", "蔬菜", 7),
    ("面包", "粮食", 5),
    ("草莓", "水果", 7),
    ("葡萄", "水果", 7),
    ("西兰花", "蔬菜", 7),
    ("黄椒", "蔬菜", 14),
    ("绿叶菜", "蔬菜", 5),
    ("奶酪", "乳制品", 14),
    ("米饭", "粮食", 3),
    ("炒菜（含芹菜、肉等）", "未分类", 2),
    ("果汁（深红色）", "调料", 180),
    ("果汁（黄色）", "调料", 180),
    ("果汁（橙红色）", "调料", 180),
    ("大虾", "海鲜", 2),
]

_CATEGORY_BY_NAME: Dict[str, str] = {
    name: category for name, category, _ in INGREDIENT_CATALOG
}

# 分类侧栏图标（key 为空字符串表示「全部」）
CATEGORY_LOCAL_FILENAMES: Dict[str, str] = {
    "": "all.jpg",
    "蔬菜": "vegetable.jpg",
    "水果": "fruit.jpg",
    "肉类": "meat.jpg",
    "蛋类": "egg.jpg",
    "乳制品": "dairy.jpg",
    "海鲜": "seafood.jpg",
    "豆制品": "bean-product.jpg",
    "菌类": "fungus.jpg",
    "粮食": "grain.jpg",
    "调料": "seasoning.jpg",
    "用品": "supplies.jpg",
    "饮品": "beverage.jpg",
    "未分类": "other.jpg",
}

CATEGORY_DISPLAY_LABELS: Dict[str, str] = {
    "": "全部",
    "蔬菜": "蔬菜",
    "水果": "水果",
    "肉类": "肉类",
    "蛋类": "蛋类",
    "乳制品": "乳制品",
    "海鲜": "海鲜",
    "豆制品": "豆制品",
    "菌类": "菌类",
    "粮食": "粮食",
    "调料": "调料",
    "用品": "用品",
    "饮品": "饮品",
    "未分类": "未分类",
}

# 食材名称 -> (文件名, 分类)
INGREDIENT_IMAGE_SOURCES: Dict[str, Tuple[str, str]] = {
    name: (filename, _CATEGORY_BY_NAME.get(name, "未分类"))
    for name, filename in INGREDIENT_LOCAL_FILENAMES.items()
}


def slugify_ingredient_name(name: str) -> str:
    return re.sub(r"[^\w\u4e00-\u9fff-]+", "-", name).strip("-").lower()


def ingredient_image_public_path(filename: str) -> str:
    return f"/static/images/ingredients/{filename}"


def category_image_public_path(filename: str) -> str:
    return f"/static/images/ingredients/categories/{filename}"


def build_ingredient_prompt(ingredient_name: str, category: str) -> str:
    """构建 wan2.7-image-pro 食材摄影提示词"""
    return (
        f"专业食材摄影，新鲜{ingredient_name}（{category}），"
        f"单品特写，白色干净背景，俯拍，自然柔光，高清写实照片，"
        f"电商生鲜风格，无文字无水印"
    )


def build_category_prompt(category_key: str) -> str:
    """构建分类侧栏图标提示词"""
    label = CATEGORY_DISPLAY_LABELS.get(category_key, category_key or "全部")
    if category_key == "":
        subject = "冰箱图标，冰块与新鲜食材组合"
    else:
        subject = f"{label}类食材代表图案"
    return (
        f"简约 App 图标风格，{subject}，"
        f"圆形图标构图，居中，柔和明亮配色，微立体写实，"
        f"适合手机侧边栏分类导航，浅色背景，无文字无水印"
    )


def get_ingredient_image_path(ingredient_name: str) -> Optional[str]:
    filename = INGREDIENT_LOCAL_FILENAMES.get(ingredient_name)
    if not filename:
        return None
    target = INGREDIENT_IMAGE_DIR / filename
    if not target.exists():
        return None
    return ingredient_image_public_path(filename)


def ensure_ingredient_filename(name: str) -> str:
    """为食材名获取或自动分配静态图文件名"""
    if name in INGREDIENT_LOCAL_FILENAMES:
        return INGREDIENT_LOCAL_FILENAMES[name]
    slug = slugify_ingredient_name(name) or f"ingredient-{abs(hash(name)) % 100000}"
    filename = f"{slug}.jpg"
    INGREDIENT_LOCAL_FILENAMES[name] = filename
    return filename


def merge_db_ingredient_sources(db) -> Dict[str, Tuple[str, str]]:
    """合并数据库中的食材，返回待生图列表（含分类）；未映射名称自动 slug 化"""
    from ..crud.ingredient_base import get_all_ingredients

    sources: Dict[str, Tuple[str, str]] = {}

    for item in get_all_ingredients(db):
        category = item.category or _CATEGORY_BY_NAME.get(item.name, "未分类")
        filename = ensure_ingredient_filename(item.name)
        sources[item.name] = (filename, category)

    return sources


def get_category_image_path(category_key: str) -> Optional[str]:
    filename = CATEGORY_LOCAL_FILENAMES.get(category_key)
    if not filename:
        return None
    target = CATEGORY_IMAGE_DIR / filename
    if not target.exists():
        return None
    return category_image_public_path(filename)
