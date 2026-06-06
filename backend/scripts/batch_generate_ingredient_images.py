"""
批量 AI 生成食材展示图 / 分类侧栏图标，写入 static 目录。
使用千问 qwen-image-2.0-pro-2026-04-22 同步文生图 API（读取 VISION_API_KEY）。

用法:
  cd backend
  python scripts/batch_generate_ingredient_images.py                # 食材 + 分类，仅缺失
  python scripts/batch_generate_ingredient_images.py --ingredients  # 仅食材
  python scripts/batch_generate_ingredient_images.py --categories   # 仅分类图标
  python scripts/batch_generate_ingredient_images.py --from-db      # 从数据库同步分类后生成
  python scripts/batch_generate_ingredient_images.py --force        # 覆盖已有文件
  python scripts/batch_generate_ingredient_images.py --limit 3       # 调试
"""
from __future__ import annotations

import argparse
import sys
import time
from io import BytesIO
from pathlib import Path

import requests
from dotenv import load_dotenv
from PIL import Image

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

load_dotenv(BACKEND_ROOT / ".env")

from src.utils.database import SessionLocal  # noqa: E402
from src.utils.ingredient_images import (  # noqa: E402
    CATEGORY_IMAGE_DIR,
    CATEGORY_LOCAL_FILENAMES,
    INGREDIENT_IMAGE_DIR,
    build_category_prompt,
    build_ingredient_prompt,
    category_image_public_path,
    ingredient_image_public_path,
    merge_db_ingredient_sources,
)

DASHSCOPE_BASE = "https://dashscope.aliyuncs.com/api/v1"
GENERATION_URL = f"{DASHSCOPE_BASE}/services/aigc/multimodal-generation/generation"
MODEL = "qwen-image-2.0-pro-2026-04-22"
INGREDIENT_TARGET_SIZE = (512, 512)
CATEGORY_TARGET_SIZE = (256, 256)
INGREDIENT_SIZE = "1024*1024"
CATEGORY_SIZE = "1024*1024"
NEGATIVE_PROMPT = "文字, 水印, logo, 模糊, 变形, 卡通, 插画, 菜品, 烹饪, 多余手指, 低画质"
REQUEST_GAP_SEC = 5
SYNC_TIMEOUT_SEC = 300
MAX_RETRIES = 5
RETRY_BASE_SEC = 10


def _api_key() -> str:
    import os

    key = os.getenv("VISION_API_KEY") or os.getenv("DASHSCOPE_API_KEY")
    if not key:
        raise RuntimeError("请在 backend/.env 中配置 VISION_API_KEY（百炼 API Key）")
    return key


def _extract_image_url(data: dict) -> str:
    choices = (data.get("output") or {}).get("choices") or []
    for choice in choices:
        message = choice.get("message") or {}
        for item in message.get("content") or []:
            if item.get("image"):
                return item["image"]
    code = data.get("code")
    message = data.get("message")
    if code or message:
        raise RuntimeError(f"生图失败: {code} {message} {data}")
    raise RuntimeError(f"响应中未找到图片 URL: {data}")


def generate_sync(api_key: str, prompt: str, size: str) -> str:
    payload = {
        "model": MODEL,
        "input": {
            "messages": [
                {
                    "role": "user",
                    "content": [{"text": prompt}],
                }
            ]
        },
        "parameters": {
            "size": size,
            "n": 1,
            "watermark": False,
            "prompt_extend": True,
            "negative_prompt": NEGATIVE_PROMPT,
        },
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    last_exc: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.post(
                GENERATION_URL,
                headers=headers,
                json=payload,
                timeout=SYNC_TIMEOUT_SEC,
            )
            if response.status_code == 429:
                wait = RETRY_BASE_SEC * (attempt + 1)
                print(f"       限流，{wait}s 后重试 ({attempt + 1}/{MAX_RETRIES})...", flush=True)
                time.sleep(wait)
                continue
            if response.status_code >= 400:
                raise RuntimeError(
                    f"生图请求失败: HTTP {response.status_code} {response.text[:500]}"
                )
            return _extract_image_url(response.json())
        except RuntimeError as exc:
            last_exc = exc
            if "429" in str(exc) and attempt < MAX_RETRIES - 1:
                wait = RETRY_BASE_SEC * (attempt + 1)
                print(f"       限流，{wait}s 后重试 ({attempt + 1}/{MAX_RETRIES})...", flush=True)
                time.sleep(wait)
                continue
            raise

    raise last_exc or RuntimeError("生图重试耗尽")


def download_and_resize(image_url: str, target_size: tuple[int, int]) -> bytes:
    response = requests.get(image_url, timeout=120)
    response.raise_for_status()
    image = Image.open(BytesIO(response.content)).convert("RGB")
    image = image.resize(target_size, Image.Resampling.LANCZOS)
    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=88, optimize=True)
    return buffer.getvalue()


def generate_ingredient(api_key: str, ingredient_name: str, category: str) -> bytes:
    prompt = build_ingredient_prompt(ingredient_name, category)
    print("       同步生图中...", flush=True)
    image_url = generate_sync(api_key, prompt, INGREDIENT_SIZE)
    return download_and_resize(image_url, INGREDIENT_TARGET_SIZE)


def generate_category(api_key: str, category_key: str) -> bytes:
    prompt = build_category_prompt(category_key)
    print("       同步生图中...", flush=True)
    image_url = generate_sync(api_key, prompt, CATEGORY_SIZE)
    return download_and_resize(image_url, CATEGORY_TARGET_SIZE)


def run_ingredients(api_key: str, force: bool, limit: int, from_db: bool) -> None:
    if from_db:
        db = SessionLocal()
        try:
            sources = merge_db_ingredient_sources(db)
        finally:
            db.close()
    else:
        from src.utils.ingredient_images import INGREDIENT_IMAGE_SOURCES

        sources = dict(INGREDIENT_IMAGE_SOURCES)
        db = SessionLocal()
        try:
            db_sources = merge_db_ingredient_sources(db)
            for name, value in db_sources.items():
                if name not in sources:
                    sources[name] = value
        finally:
            db.close()

    items = list(sources.items())
    if limit > 0:
        items = items[:limit]

    INGREDIENT_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    success = skipped = 0
    failed: list[str] = []

    print(f"\n[食材图] 共 {len(items)} 种 (model={MODEL})")
    for index, (name, (filename, category)) in enumerate(items):
        target = INGREDIENT_IMAGE_DIR / filename
        if target.exists() and not force:
            print(f"  SKIP {name} (已存在 {filename})")
            skipped += 1
            continue
        if index > 0:
            time.sleep(REQUEST_GAP_SEC)
        try:
            print(f"  GEN  {name} -> {filename} ...", flush=True)
            target.write_bytes(generate_ingredient(api_key, name, category))
            print(f"  OK   {name} -> {ingredient_image_public_path(filename)}")
            success += 1
        except Exception as exc:
            failed.append(name)
            print(f"  FAIL {name}: {exc}")

    print(f"[食材图] 完成: 成功 {success}, 跳过 {skipped}, 失败 {len(failed)}")
    if failed:
        print("失败:", ", ".join(failed))


def run_categories(api_key: str, force: bool, limit: int) -> None:
    items = list(CATEGORY_LOCAL_FILENAMES.items())
    if limit > 0:
        items = items[:limit]

    CATEGORY_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    success = skipped = 0
    failed: list[str] = []

    print(f"\n[分类图标] 共 {len(items)} 个 (model={MODEL})")
    for index, (category_key, filename) in enumerate(items):
        label = category_key or "全部"
        target = CATEGORY_IMAGE_DIR / filename
        if target.exists() and not force:
            print(f"  SKIP {label} (已存在 {filename})")
            skipped += 1
            continue
        if index > 0:
            time.sleep(REQUEST_GAP_SEC)
        try:
            print(f"  GEN  {label} -> {filename} ...", flush=True)
            target.write_bytes(generate_category(api_key, category_key))
            print(f"  OK   {label} -> {category_image_public_path(filename)}")
            success += 1
        except Exception as exc:
            failed.append(label)
            print(f"  FAIL {label}: {exc}")

    print(f"[分类图标] 完成: 成功 {success}, 跳过 {skipped}, 失败 {len(failed)}")
    if failed:
        print("失败:", ", ".join(failed))


def main() -> None:
    parser = argparse.ArgumentParser(description="批量 AI 生成食材图 / 分类侧栏图标")
    parser.add_argument("--ingredients", action="store_true", help="仅生成食材图")
    parser.add_argument("--categories", action="store_true", help="仅生成分类侧栏图标")
    parser.add_argument("--from-db", action="store_true", help="食材图从数据库同步分类信息")
    parser.add_argument("--force", action="store_true", help="覆盖已存在的图片文件")
    parser.add_argument("--limit", type=int, default=0, help="仅处理前 N 项（调试用）")
    args = parser.parse_args()

    run_both = not args.ingredients and not args.categories
    api_key = _api_key()

    if run_both or args.ingredients:
        run_ingredients(api_key, args.force, args.limit, args.from_db or run_both)
    if run_both or args.categories:
        run_categories(api_key, args.force, args.limit)


if __name__ == "__main__":
    main()
