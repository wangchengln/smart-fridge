"""批量下载菜谱封面图并同步到数据库"""
from __future__ import annotations

import sys
import time
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

from dotenv import load_dotenv

load_dotenv(BACKEND_ROOT / ".env")

from src.crud.recipe_base import ALL_SEED_RECIPES, sync_recipe_images  # noqa: E402
from src.utils.database import SessionLocal  # noqa: E402
from src.utils.recipe_images import RECIPE_IMAGE_SOURCES, download_recipe_image  # noqa: E402


def main() -> None:
    taste_by_name = {name: taste for name, _, taste, *_ in ALL_SEED_RECIPES}

    print(f"开始下载 {len(RECIPE_IMAGE_SOURCES)} 张菜谱封面图...")
    success = 0
    failed: list[str] = []

    for index, recipe_name in enumerate(RECIPE_IMAGE_SOURCES):
        if index:
            time.sleep(6)
        taste = taste_by_name.get(recipe_name, "咸鲜")
        path = download_recipe_image(recipe_name, taste=taste, force=True)
        if path:
            success += 1
            print(f"  OK  {recipe_name} -> {path}")
        else:
            failed.append(recipe_name)
            print(f"  FAIL {recipe_name}")

    print(f"\n下载完成: {success}/{len(RECIPE_IMAGE_SOURCES)}")
    if failed:
        print("失败:", ", ".join(failed))

    db = SessionLocal()
    try:
        sync_recipe_images(db, force_download=True)
        print("数据库 image_url 已同步")
    finally:
        db.close()


if __name__ == "__main__":
    main()
