"""检查 DeepSeek 配置是否被后端正确加载"""
from pathlib import Path
import sys

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

from dotenv import load_dotenv

load_dotenv(BACKEND_ROOT / ".env")

from src.services.deepseek_service import deepseek_service

print("configured:", deepseek_service.is_configured())
print("model:", deepseek_service.model)
print("base_url:", deepseek_service.base_url)
print("key_set:", bool(deepseek_service.api_key))
