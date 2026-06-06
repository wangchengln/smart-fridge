"""
为分类侧栏生成本地图标（API 不可用时的回退方案）。
用法: cd backend && python scripts/generate_category_icons_local.py
"""
from __future__ import annotations

import sys
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

from src.utils.ingredient_images import (  # noqa: E402
    CATEGORY_DISPLAY_LABELS,
    CATEGORY_IMAGE_DIR,
    CATEGORY_LOCAL_FILENAMES,
)

SIZE = 256

# 分类 -> (渐变色顶, 渐变色底, 展示字符)
CATEGORY_STYLES: dict[str, tuple[str, str, str]] = {
    "": ("#4FC3F7", "#0288D1", "全"),
    "蔬菜": ("#66BB6A", "#2E7D32", "菜"),
    "水果": ("#EF5350", "#C62828", "果"),
    "肉类": ("#FF7043", "#BF360C", "肉"),
    "蛋类": ("#FFD54F", "#F9A825", "蛋"),
    "乳制品": ("#E1F5FE", "#81D4FA", "奶"),
    "海鲜": ("#26C6DA", "#00838F", "鲜"),
    "豆制品": ("#D7CCC8", "#8D6E63", "豆"),
    "菌类": ("#A1887F", "#5D4037", "菇"),
    "粮食": ("#FFCA28", "#FF8F00", "粮"),
    "调料": ("#CE93D8", "#7B1FA2", "料"),
    "用品": ("#B0BEC5", "#546E7A", "品"),
    "饮品": ("#4DD0E1", "#0097A7", "饮"),
    "未分类": ("#E0E0E0", "#9E9E9E", "其"),
}


def _hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def _load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (
        "C:/Windows/Fonts/msyhbd.ttc",
        "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/simhei.ttf",
    ):
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


def generate_icon(category_key: str) -> bytes:
    label = CATEGORY_DISPLAY_LABELS.get(category_key, category_key or "全部")
    top, bottom, char = CATEGORY_STYLES.get(category_key, ("#BDBDBD", "#757575", "·"))
    top_rgb = _hex_to_rgb(top)
    bottom_rgb = _hex_to_rgb(bottom)

    image = Image.new("RGB", (SIZE, SIZE))
    draw = ImageDraw.Draw(image)
    cx, cy, r = SIZE // 2, SIZE // 2, SIZE // 2 - 4

    for y in range(SIZE):
        ratio = y / max(SIZE - 1, 1)
        color = tuple(int(top_rgb[i] + (bottom_rgb[i] - top_rgb[i]) * ratio) for i in range(3))
        draw.line([(0, y), (SIZE, y)], fill=color)

    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 255, 255, 30))

    font = _load_font(96)
    bbox = draw.textbbox((0, 0), char, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((cx - tw // 2, cy - th // 2 - 8), char, fill=(255, 255, 255), font=font)

    small_font = _load_font(22)
    sb = draw.textbbox((0, 0), label, font=small_font)
    sw = sb[2] - sb[0]
    draw.text((cx - sw // 2, cy + r - 52), label, fill=(255, 255, 255), font=small_font)

    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=90, optimize=True)
    return buffer.getvalue()


def main() -> None:
    CATEGORY_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    created = skipped = 0

    for category_key, filename in CATEGORY_LOCAL_FILENAMES.items():
        target = CATEGORY_IMAGE_DIR / filename
        label = category_key or "全部"
        if target.exists():
            print(f"  SKIP {label}")
            skipped += 1
            continue
        target.write_bytes(generate_icon(category_key))
        print(f"  OK   {label} -> {filename}")
        created += 1

    print(f"\n本地分类图标: 新建 {created}, 跳过 {skipped}")


if __name__ == "__main__":
    main()
