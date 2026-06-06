"""
批量 AI 生成首页装饰插图（qwen-image-2.0-pro-2026-04-22）

用法:
  cd backend
  python scripts/batch_generate_home_images.py
  python scripts/batch_generate_home_images.py --limit 2
  python scripts/batch_generate_home_images.py --force
"""
from __future__ import annotations

import argparse
import os
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

from src.utils.home_images import HOME_IMAGE_DIR, HOME_IMAGE_SPECS, home_image_public_path  # noqa: E402

GENERATION_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
MODEL = "qwen-image-2.0-pro-2026-04-22"
NEGATIVE_PROMPT = (
    "文字, 水印, logo, 模糊, 变形, 低分辨率, 畸形手指, 过度饱和, "
    "AI感, 杂乱构图, 丑陋"
)
REQUEST_GAP_SEC = 10
MAX_RETRIES = 5
RETRY_WAIT_SEC = 30

TARGET_SIZES = {
    "hero": (1344, 768),
    "meal": (512, 512),
    "service": (256, 256),
}


def _api_key() -> str:
    key = os.getenv("VISION_API_KEY") or os.getenv("DASHSCOPE_API_KEY")
    if not key:
        raise RuntimeError("请在 backend/.env 中配置 VISION_API_KEY 或 DASHSCOPE_API_KEY")
    return key


def _extract_image_url(data: dict) -> str:
    output = data.get("output") or {}
    for choice in output.get("choices") or []:
        message = choice.get("message") or {}
        for item in message.get("content") or []:
            if item.get("image"):
                return item["image"]
    raise RuntimeError(f"响应中未找到图片 URL: {data}")


def generate_one(api_key: str, prompt: str, size: str) -> bytes:
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
            "negative_prompt": NEGATIVE_PROMPT,
            "prompt_extend": True,
            "watermark": False,
            "n": 1,
            "size": size,
        },
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    last_error: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        response = requests.post(GENERATION_URL, headers=headers, json=payload, timeout=180)
        if response.status_code == 429 and attempt < MAX_RETRIES:
            wait_sec = RETRY_WAIT_SEC * attempt
            print(f"    限流，{wait_sec}s 后重试 ({attempt}/{MAX_RETRIES}) ...", flush=True)
            time.sleep(wait_sec)
            continue
        if response.status_code >= 400:
            last_error = RuntimeError(f"生图失败 HTTP {response.status_code}: {response.text[:500]}")
            break
        image_url = _extract_image_url(response.json())
        image_response = requests.get(image_url, timeout=120)
        image_response.raise_for_status()
        return image_response.content

    raise last_error or RuntimeError("生图失败：未知错误")


def resize_image(content: bytes, key: str) -> bytes:
    if key == "hero":
        target = TARGET_SIZES["hero"]
    elif key.startswith("meal-"):
        target = TARGET_SIZES["meal"]
    else:
        target = TARGET_SIZES["service"]

    image = Image.open(BytesIO(content)).convert("RGB")
    image = image.resize(target, Image.Resampling.LANCZOS)
    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=88, optimize=True)
    return buffer.getvalue()


def main() -> None:
    parser = argparse.ArgumentParser(description="批量 AI 生成首页装饰插图")
    parser.add_argument("--force", action="store_true", help="覆盖已存在文件")
    parser.add_argument("--limit", type=int, default=0, help="仅生成前 N 张")
    parser.add_argument("--keys", nargs="*", default=None, help="仅生成指定 key，如 meal-takeout")
    args = parser.parse_args()

    api_key = _api_key()
    specs = HOME_IMAGE_SPECS
    if args.keys:
        key_set = set(args.keys)
        specs = [item for item in specs if item[0] in key_set]
    elif args.limit > 0:
        specs = specs[: args.limit]
    HOME_IMAGE_DIR.mkdir(parents=True, exist_ok=True)

    success = 0
    skipped = 0
    failed: list[str] = []

    print(f"开始首页 AI 生图: {len(specs)} 张 (model={MODEL})")

    for index, (key, filename, size, prompt) in enumerate(specs):
        target = HOME_IMAGE_DIR / filename
        if target.exists() and not args.force:
            print(f"  SKIP {key} (已存在 {filename})")
            skipped += 1
            continue

        if index > 0:
            time.sleep(REQUEST_GAP_SEC)

        try:
            print(f"  GEN  {key} -> {filename} ({size}) ...", flush=True)
            raw = generate_one(api_key, prompt, size)
            target.write_bytes(resize_image(raw, key))
            print(f"  OK   {home_image_public_path(filename)}")
            success += 1
        except Exception as exc:
            failed.append(key)
            print(f"  FAIL {key}: {exc}")

    print(f"\n完成: 成功 {success}, 跳过 {skipped}, 失败 {len(failed)}")
    if failed:
        print("失败项:", ", ".join(failed))


if __name__ == "__main__":
    main()
