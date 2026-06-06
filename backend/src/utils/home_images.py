"""
首页装饰插图配置（与 frontend/src/utils/homeImageMap.ts 保持一致）
"""
from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Tuple

BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
HOME_IMAGE_DIR = BACKEND_ROOT / "static" / "images" / "home"

# (key, filename, size, prompt)
HomeImageSpec = Tuple[str, str, str, str]

HOME_IMAGE_SPECS: List[HomeImageSpec] = [
    (
        "hero",
        "home-hero.jpg",
        "1344*768",
        "美团风格智能云冰箱首页横幅，现代厨房场景，打开的智能冰箱内有新鲜蔬果，"
        "温暖黄色主色调点缀，简约扁平插画与轻写实结合，宽敞横向构图，"
        "无文字无水印，清新食欲感，移动端首页头图",
    ),
    (
        "meal-cook-self",
        "meal-cook-self.jpg",
        "1024*1024",
        "自己做菜主题圆形插图，中式家常菜炒锅与新鲜食材，蒸汽袅袅，"
        "绿色清新色调，俯拍美食摄影风格，白盘摆盘，无文字无水印",
    ),
    (
        "meal-flash-purchase",
        "meal-flash-purchase.jpg",
        "1024*1024",
        "闪购补货主题插图，购物袋与少量新鲜食材快速送达，橙色活力色调，"
        "简约现代风格，无文字无水印，适合移动端图标",
    ),
    (
        "meal-takeout",
        "meal-takeout.jpg",
        "1024*1024",
        "外卖点餐主题插图，精美外卖餐盒与骑手配送元素，蓝色清爽色调，"
        "现代美食插画，无文字无水印",
    ),
    (
        "meal-premade",
        "meal-premade.jpg",
        "1024*1024",
        "新鲜预制菜主题插图，超市鲜食沙拉与半成品餐盒，紫色优雅色调，"
        "干净背景，无文字无水印",
    ),
    (
        "service-camera",
        "service-camera.jpg",
        "1024*1024",
        "手机拍摄识别食材主题小图标，摄像头对准新鲜蔬菜，黄色点缀，"
        "圆形构图居中，扁平插画，无文字无水印",
    ),
    (
        "service-fridge",
        "service-fridge.jpg",
        "1024*1024",
        "智能冰箱库存管理主题小图标，整齐摆放的冰箱内食材，绿色清新，"
        "圆形构图居中，无文字无水印",
    ),
    (
        "service-recipes",
        "service-recipes.jpg",
        "1024*1024",
        "菜谱推荐主题小图标，精美菜谱卡片与家常菜，橙色温暖，"
        "圆形构图居中，无文字无水印",
    ),
    (
        "service-purchase",
        "service-purchase.jpg",
        "1024*1024",
        "一键补购主题小图标，购物车与新鲜蔬菜，美团黄色主色，"
        "圆形构图居中，无文字无水印",
    ),
    (
        "service-weekend",
        "service-weekend.jpg",
        "1024*1024",
        "周末定时补货主题小图标，日历与新鲜食材箱，蓝色清爽，"
        "圆形构图居中，无文字无水印",
    ),
    (
        "service-party",
        "service-party.jpg",
        "1024*1024",
        "家居聚会聚餐主题小图标，多人分享美食场景，紫色温馨，"
        "圆形构图居中，无文字无水印",
    ),
]

HOME_IMAGE_BY_KEY: Dict[str, str] = {key: filename for key, filename, _, _ in HOME_IMAGE_SPECS}


def home_image_public_path(filename: str) -> str:
    return f"/static/images/home/{filename}"
