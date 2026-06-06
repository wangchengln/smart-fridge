"""
菜谱封面图下载与路径管理
优先从 Wikimedia Commons 下载真实成品实拍图；网络不可用时生成本地封面图
"""
from __future__ import annotations

import hashlib
import re
import time
from io import BytesIO
from pathlib import Path
from typing import Dict, Optional, Tuple
from urllib.parse import quote

import requests
from PIL import Image, ImageDraw, ImageFont

BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
RECIPE_IMAGE_DIR = BACKEND_ROOT / "static" / "images" / "recipes"

# 菜谱名称 -> Wikimedia Commons 文件名（均为成品实拍，CC 协议可商用）
RECIPE_WIKIMEDIA_FILES: Dict[str, str] = {
    # 基础 15 道
    "西红柿炒鸡蛋": "Tomato and eggs.JPG",
    "番茄土豆炒鸡蛋": "Hunan cuisine, stir-fried tomato with eggs.jpg",
    "清炒土豆丝": "Taste of Beijing, Soho, London (4363975792).jpg",
    "胡萝卜炒鸡蛋": "Carrot and egg stir fry.jpg",
    "洋葱炒鸡蛋": "Scrambled eggs with onion.jpg",
    "土豆烧猪肉": "Braised pork with potatoes.jpg",
    "胡萝卜土豆炖猪肉": "Stew with carrots and potatoes.jpg",
    "牛奶蒸蛋": "简单清水蒸蛋.jpg",
    "酸奶香蕉杯": "Banana with yogurt.jpg",
    "虾仁滑蛋": "Shrimp with scrambled eggs.jpg",
    "苹果酸奶沙拉": "Fruit salad with yogurt.jpg",
    "香煎鸡胸肉": "Pan-fried chicken breast.jpg",
    "胡萝卜炖鸡肉": "Chicken stew with carrots.jpg",
    "洋葱炒猪肉": "Pork with onion stir fry.jpg",
    "香蕉牛奶昔": "Banana milkshake.jpg",
    # 补充 35 道
    "宫保鸡丁": "Pollo Kung Pao.jpg",
    "鱼香肉丝": "川菜鱼香肉丝.jpg",
    "酸辣土豆丝": "Taste of Beijing, Soho, London (4363975792).jpg",
    "麻婆豆腐": "Authentic Mapo Tofu.jpg",
    "地三鲜": "Disanxian.jpg",
    "可乐炖鸡肉": "可乐鸡翅.jpg",
    "糖醋猪肉": "Sweet and sour pork.jpg",
    "油焖大虾": "Shrimp with scrambled eggs.jpg",
    "清蒸鱼": "Chinese Steamed Perch.jpg",
    "经典红烧肉": "Red braised pork (20141106191221).JPG",
    "番茄蛋花汤": "Tomato and egg soup.jpg",
    "土豆炖牛肉": "Stew with carrots and potatoes.jpg",
    "洋葱土豆片": "Braised pork with potatoes.jpg",
    "胡萝卜炒牛肉": "Stew with carrots and potatoes.jpg",
    "蘑菇炒鸡肉": "Chicken stew with carrots.jpg",
    "豆腐炖鱼": "Chinese Steamed Perch.jpg",
    "虾仁烧豆腐": "Authentic Mapo Tofu.jpg",
    "香蒜胡萝卜": "Carrot and egg stir fry.jpg",
    "双色土豆丝": "Taste of Beijing, Soho, London (4363975792).jpg",
    "苹果温奶饮": "Banana milkshake.jpg",
    "酸奶苹果捞": "Fruit salad with yogurt.jpg",
    "蘑菇鸡汤": "Chicken stew with carrots.jpg",
    "洋葱炒牛肉": "Pork with onion stir fry.jpg",
    "香煎鱼": "Chinese Steamed Perch.jpg",
    "蛋炒饭": "Egg fried rice.jpg",
    "西红柿土豆汤": "Tomato and egg soup.jpg",
    "胡萝卜奶香羹": "Carrot and egg stir fry.jpg",
    "冷冻香蕉酸奶": "Banana with yogurt.jpg",
    "虾炒蛋": "Shrimp with scrambled eggs.jpg",
    "豆腐蒸蛋": "简单清水蒸蛋.jpg",
    "牛肉时蔬盖饭": "Egg fried rice.jpg",
    "三鲜豆腐汤": "Authentic Mapo Tofu.jpg",
    "土豆焖牛肉": "Stew with carrots and potatoes.jpg",
    "鱼香豆腐": "Authentic Mapo Tofu.jpg",
    "家常木须肉": "Mu xu rou.jpg",
}

# 本地文件名 slug（稳定映射，便于缓存）
RECIPE_LOCAL_FILENAMES: Dict[str, str] = {
    "西红柿炒鸡蛋": "tomato-scrambled-eggs.jpg",
    "番茄土豆炒鸡蛋": "tomato-potato-eggs.jpg",
    "清炒土豆丝": "shredded-potato.jpg",
    "胡萝卜炒鸡蛋": "carrot-scrambled-eggs.jpg",
    "洋葱炒鸡蛋": "onion-scrambled-eggs.jpg",
    "土豆烧猪肉": "pork-potato-stew.jpg",
    "胡萝卜土豆炖猪肉": "pork-carrot-potato-stew.jpg",
    "牛奶蒸蛋": "steamed-egg-milk.jpg",
    "酸奶香蕉杯": "yogurt-banana.jpg",
    "虾仁滑蛋": "shrimp-scrambled-eggs.jpg",
    "苹果酸奶沙拉": "apple-yogurt-salad.jpg",
    "香煎鸡胸肉": "pan-fried-chicken-breast.jpg",
    "胡萝卜炖鸡肉": "chicken-carrot-stew.jpg",
    "洋葱炒猪肉": "pork-onion-stir-fry.jpg",
    "香蕉牛奶昔": "banana-milkshake.jpg",
    "宫保鸡丁": "kung-pao-chicken.jpg",
    "鱼香肉丝": "yuxiang-shredded-pork.jpg",
    "酸辣土豆丝": "hot-sour-shredded-potato.jpg",
    "麻婆豆腐": "mapo-tofu.jpg",
    "地三鲜": "di-san-xian.jpg",
    "可乐炖鸡肉": "cola-chicken.jpg",
    "糖醋猪肉": "sweet-sour-pork.jpg",
    "油焖大虾": "braised-shrimp.jpg",
    "清蒸鱼": "steamed-fish.jpg",
    "经典红烧肉": "red-braised-pork.jpg",
    "番茄蛋花汤": "tomato-egg-drop-soup.jpg",
    "土豆炖牛肉": "beef-potato-stew.jpg",
    "洋葱土豆片": "potato-onion-slices.jpg",
    "胡萝卜炒牛肉": "beef-carrot-stir-fry.jpg",
    "蘑菇炒鸡肉": "mushroom-chicken.jpg",
    "豆腐炖鱼": "fish-tofu-stew.jpg",
    "虾仁烧豆腐": "shrimp-tofu.jpg",
    "香蒜胡萝卜": "garlic-carrot.jpg",
    "双色土豆丝": "two-color-potato-shreds.jpg",
    "苹果温奶饮": "apple-warm-milk.jpg",
    "酸奶苹果捞": "apple-yogurt-mix.jpg",
    "蘑菇鸡汤": "mushroom-chicken-soup.jpg",
    "洋葱炒牛肉": "beef-onion-stir-fry.jpg",
    "香煎鱼": "pan-fried-fish.jpg",
    "蛋炒饭": "egg-fried-rice.jpg",
    "西红柿土豆汤": "tomato-potato-soup.jpg",
    "胡萝卜奶香羹": "carrot-cream-soup.jpg",
    "冷冻香蕉酸奶": "frozen-banana-yogurt.jpg",
    "虾炒蛋": "shrimp-egg-stir-fry.jpg",
    "豆腐蒸蛋": "tofu-steamed-egg.jpg",
    "牛肉时蔬盖饭": "beef-rice-bowl.jpg",
    "三鲜豆腐汤": "three-fresh-tofu-soup.jpg",
    "土豆焖牛肉": "beef-potato-braise.jpg",
    "鱼香豆腐": "yuxiang-tofu.jpg",
    "家常木须肉": "moo-shu-pork.jpg",
}


def wikimedia_direct_url(filename: str, width: int = 0) -> str:
    """根据 Wikimedia 文件名生成 upload.wikimedia.org 直链；width>0 时使用缩略图（更不易触发限流）"""
    normalized = filename.replace(" ", "_")
    digest = hashlib.md5(normalized.encode("utf-8")).hexdigest()
    base = (
        f"https://upload.wikimedia.org/wikipedia/commons/"
        f"{digest[0]}/{digest[0:2]}/{quote(normalized)}"
    )
    if width <= 0:
        return base
    return (
        f"https://upload.wikimedia.org/wikipedia/commons/thumb/"
        f"{digest[0]}/{digest[0:2]}/{quote(normalized)}/{width}px-{quote(normalized)}"
    )


def build_recipe_image_sources() -> Dict[str, Tuple[str, str]]:
    sources: Dict[str, Tuple[str, str]] = {}
    for recipe_name, wiki_filename in RECIPE_WIKIMEDIA_FILES.items():
        local_name = RECIPE_LOCAL_FILENAMES.get(recipe_name) or f"{slugify_recipe_name(recipe_name)}.jpg"
        # 800px 缩略图：体积适中，且 Wikimedia 对 thumb 路径限流更宽松
        sources[recipe_name] = (local_name, wikimedia_direct_url(wiki_filename, width=800))
    return sources


RECIPE_IMAGE_SOURCES: Dict[str, Tuple[str, str]] = build_recipe_image_sources()

# 口味对应封面渐变色 (top, bottom) — 仅在网络下载失败时使用
TASTE_GRADIENTS: Dict[str, Tuple[str, str]] = {
    "清淡": ("#7CB342", "#558B2F"),
    "咸鲜": ("#FF8F00", "#E65100"),
    "酸甜": ("#EC407A", "#AD1457"),
}

WIKIMEDIA_HEADERS = {
    "User-Agent": "SmartFridgeApp/1.0 (recipe image seed; local dev)",
}


def slugify_recipe_name(name: str) -> str:
    return re.sub(r"[^\w\u4e00-\u9fff-]+", "-", name).strip("-").lower()


def recipe_image_public_path(filename: str) -> str:
    return f"/static/images/recipes/{filename}"


def _hex_to_rgb(value: str) -> Tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def _load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/simhei.ttf",
        "C:/Windows/Fonts/msyhbd.ttc",
    ]
    for path in candidates:
        font_path = Path(path)
        if font_path.exists():
            return ImageFont.truetype(str(font_path), size=size)
    return ImageFont.load_default()


def generate_recipe_cover_image(recipe_name: str, taste: str = "咸鲜") -> bytes:
    """网络不可用时，生成本地菜谱封面图"""
    width, height = 800, 600
    top_color, bottom_color = TASTE_GRADIENTS.get(taste, ("#FFB300", "#F57C00"))
    top_rgb = _hex_to_rgb(top_color)
    bottom_rgb = _hex_to_rgb(bottom_color)

    image = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(image)
    for y in range(height):
        ratio = y / max(height - 1, 1)
        color = tuple(
            int(top_rgb[i] + (bottom_rgb[i] - top_rgb[i]) * ratio) for i in range(3)
        )
        draw.line([(0, y), (width, y)], fill=color)

    overlay = Image.new("RGBA", (width, height), (255, 255, 255, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    overlay_draw.rounded_rectangle(
        (40, height - 180, width - 40, height - 40),
        radius=24,
        fill=(255, 255, 255, 210),
    )
    image = Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(image)

    title_font = _load_font(52)
    tag_font = _load_font(28)
    draw.text((64, height - 150), recipe_name, fill=(33, 33, 33), font=title_font)
    draw.text((64, height - 78), f"口味 · {taste}", fill=(102, 102, 102), font=tag_font)

    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=88)
    return buffer.getvalue()


def download_recipe_image(
    recipe_name: str,
    taste: str = "咸鲜",
    force: bool = False,
) -> Optional[str]:
    """
    下载或生成单张菜谱封面图，返回对外访问路径 /static/images/recipes/xxx.jpg
    """
    source = RECIPE_IMAGE_SOURCES.get(recipe_name)
    if not source:
        return None

    filename, url = source
    RECIPE_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    target = RECIPE_IMAGE_DIR / filename

    if target.exists() and not force:
        return recipe_image_public_path(filename)

    try:
        last_exc: Exception | None = None
        for attempt in range(4):
            try:
                response = requests.get(url, headers=WIKIMEDIA_HEADERS, timeout=45)
                response.raise_for_status()
                content_type = response.headers.get("Content-Type", "")
                if not content_type.startswith("image/"):
                    raise ValueError(f"非图片响应: {content_type}")
                if len(response.content) < 50_000:
                    raise ValueError(f"图片过小({len(response.content)} bytes)，可能非实拍图")
                target.write_bytes(response.content)
                return recipe_image_public_path(filename)
            except Exception as exc:
                last_exc = exc
                if attempt < 3:
                    time.sleep(3 * (attempt + 1))
        raise last_exc or RuntimeError("下载失败")
    except Exception as exc:
        print(f"[recipe_images] 远程下载失败 {recipe_name}: {exc}，使用本地生成封面")

    try:
        target.write_bytes(generate_recipe_cover_image(recipe_name, taste))
        return recipe_image_public_path(filename)
    except Exception as exc:
        print(f"[recipe_images] 本地生成失败 {recipe_name}: {exc}")
        return None


def download_all_recipe_images(
    taste_by_name: Optional[Dict[str, str]] = None,
    force: bool = False,
) -> Dict[str, str]:
    """批量下载/生成，返回 {菜谱名: image_url}"""
    results: Dict[str, str] = {}
    for recipe_name in RECIPE_IMAGE_SOURCES:
        taste = (taste_by_name or {}).get(recipe_name, "咸鲜")
        path = download_recipe_image(recipe_name, taste=taste, force=force)
        if path:
            results[recipe_name] = path
    return results
