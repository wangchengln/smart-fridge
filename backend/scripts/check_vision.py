"""检查阿里云百炼视觉识别 API 配置是否可用"""

from pathlib import Path
import sys

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

from dotenv import load_dotenv

load_dotenv(BACKEND_ROOT / ".env")

from src.config.settings import get_settings
from src.services.vision_recognition_service import vision_recognition_service

get_settings.cache_clear()

print("vision_configured:", vision_recognition_service.is_configured())
print("vision_model:", vision_recognition_service.model)
print("vision_base_url:", vision_recognition_service.base_url)
print("key_set:", bool(vision_recognition_service.api_key))

if not vision_recognition_service.is_configured():
    print("\n请在 backend/.env 中配置 VISION_API_KEY（阿里云百炼 API Key）")
    sys.exit(1)

print("\n配置正常。上传图片后将调用 Qwen-VL 进行真实识别。")
