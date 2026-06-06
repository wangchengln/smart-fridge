"""
批量 AI 生成菜谱封面图并写入 static + 数据库。
使用百炼万相文生图 API（读取 VISION_API_KEY），不修改业务逻辑代码。

用法:
  cd backend
  python scripts/batch_generate_recipe_images.py          # 生成全部缺失
  python scripts/batch_generate_recipe_images.py --force  # 覆盖已有文件
  python scripts/batch_generate_recipe_images.py --limit 3  # 仅生成前 3 张（调试）
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

from src.crud.recipe_base import ALL_SEED_RECIPES, sync_recipe_images  # noqa: E402
from src.utils.database import SessionLocal  # noqa: E402
from src.utils.recipe_images import (  # noqa: E402
    RECIPE_IMAGE_DIR,
    RECIPE_IMAGE_SOURCES,
    recipe_image_public_path,
)

DASHSCOPE_BASE = "https://dashscope.aliyuncs.com/api/v1"
GENERATION_URL = f"{DASHSCOPE_BASE}/services/aigc/image-generation/generation"
MODEL = "wan2.6-t2i"
TARGET_SIZE = (800, 600)
NEGATIVE_PROMPT = "文字, 水印, logo, 模糊, 变形, 多余手指, 卡通, 插画"
POLL_INTERVAL_SEC = 3
POLL_TIMEOUT_SEC = 180
REQUEST_GAP_SEC = 2


def _api_key() -> str:
    import os

    key = os.getenv("VISION_API_KEY") or os.getenv("DASHSCOPE_API_KEY")
    if not key:
        raise RuntimeError("请在 backend/.env 中配置 VISION_API_KEY（百炼 API Key）")
    return key


def build_prompt(recipe_name: str) -> str:
    return (
        f"专业美食摄影，{recipe_name}，中式家常菜成品，精致摆盘，"
        f"白色瓷盘，俯拍45度角，自然柔光，食欲感，高清写实照片，"
        f"干净背景，无文字无水印"
    )


def submit_generation(api_key: str, prompt: str) -> str:
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
            "prompt_extend": True,
            "watermark": False,
            "n": 1,
            "negative_prompt": NEGATIVE_PROMPT,
            "size": "1280*1280",
        },
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
    }
    response = requests.post(GENERATION_URL, headers=headers, json=payload, timeout=60)
    if response.status_code >= 400:
        raise RuntimeError(f"提交生图任务失败: HTTP {response.status_code} {response.text[:500]}")
    data = response.json()
    task_id = (data.get("output") or {}).get("task_id")
    if not task_id:
        raise RuntimeError(f"未返回 task_id: {data}")
    return task_id


def poll_task(api_key: str, task_id: str) -> str:
    headers = {"Authorization": f"Bearer {api_key}"}
    url = f"{DASHSCOPE_BASE}/tasks/{task_id}"
    deadline = time.time() + POLL_TIMEOUT_SEC

    while time.time() < deadline:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        output = data.get("output") or {}
        status = output.get("task_status")

        if status == "SUCCEEDED":
            choices = output.get("choices") or []
            for choice in choices:
                message = choice.get("message") or {}
                for item in message.get("content") or []:
                    if item.get("type") == "image" and item.get("image"):
                        return item["image"]
            results = output.get("results") or []
            for result in results:
                if result.get("url"):
                    return result["url"]
            raise RuntimeError(f"任务成功但未找到图片 URL: {data}")

        if status in ("FAILED", "CANCELED"):
            raise RuntimeError(f"生图任务失败: {status} {data}")

        time.sleep(POLL_INTERVAL_SEC)

    raise RuntimeError(f"生图任务超时 ({POLL_TIMEOUT_SEC}s): {task_id}")


def download_and_resize(image_url: str) -> bytes:
    response = requests.get(image_url, timeout=120)
    response.raise_for_status()
    image = Image.open(BytesIO(response.content)).convert("RGB")
    image = image.resize(TARGET_SIZE, Image.Resampling.LANCZOS)
    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=88, optimize=True)
    return buffer.getvalue()


def generate_one(api_key: str, recipe_name: str, taste: str) -> bytes:
    prompt = build_prompt(recipe_name)
    task_id = submit_generation(api_key, prompt)
    image_url = poll_task(api_key, task_id)
    return download_and_resize(image_url)


def main() -> None:
    parser = argparse.ArgumentParser(description="批量 AI 生成菜谱封面图")
    parser.add_argument("--force", action="store_true", help="覆盖已存在的图片文件")
    parser.add_argument("--limit", type=int, default=0, help="仅处理前 N 道菜谱（调试用）")
    args = parser.parse_args()

    api_key = _api_key()
    taste_by_name = {name: taste for name, _, taste, *_ in ALL_SEED_RECIPES}
    recipe_names = list(RECIPE_IMAGE_SOURCES.keys())
    if args.limit > 0:
        recipe_names = recipe_names[: args.limit]

    RECIPE_IMAGE_DIR.mkdir(parents=True, exist_ok=True)

    success = 0
    skipped = 0
    failed: list[str] = []

    print(f"开始 AI 生图: {len(recipe_names)} 道菜谱 (model={MODEL})")

    for index, recipe_name in enumerate(recipe_names):
        filename, _ = RECIPE_IMAGE_SOURCES[recipe_name]
        target = RECIPE_IMAGE_DIR / filename

        if target.exists() and not args.force:
            print(f"  SKIP {recipe_name} (已存在 {filename})")
            skipped += 1
            continue

        if index > 0:
            time.sleep(REQUEST_GAP_SEC)

        taste = taste_by_name.get(recipe_name, "咸鲜")
        try:
            print(f"  GEN  {recipe_name} -> {filename} ...", flush=True)
            target.write_bytes(generate_one(api_key, recipe_name, taste))
            public = recipe_image_public_path(filename)
            print(f"  OK   {recipe_name} -> {public}")
            success += 1
        except Exception as exc:
            failed.append(recipe_name)
            print(f"  FAIL {recipe_name}: {exc}")

    print(f"\n生图完成: 成功 {success}, 跳过 {skipped}, 失败 {len(failed)}")
    if failed:
        print("失败菜谱:", ", ".join(failed))

    if success > 0 or skipped > 0:
        db = SessionLocal()
        try:
            sync_recipe_images(db, force_download=False)
            print("数据库 image_url 已同步")
        finally:
            db.close()


if __name__ == "__main__":
    main()
