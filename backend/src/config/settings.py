"""应用配置，从环境变量读取（支持 backend/.env）"""

import os
from functools import lru_cache


@lru_cache
def get_settings() -> dict:
    return {
        "deepseek_api_key": os.getenv("DEEPSEEK_API_KEY", "").strip(),
        "deepseek_base_url": os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/"),
        "deepseek_model": os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
        # 图片识别（阿里云百炼 · 通义千问 VL，OpenAI 兼容 Chat Completions）
        # 华北2（北京）默认：https://dashscope.aliyuncs.com/compatible-mode/v1
        "vision_api_key": os.getenv("VISION_API_KEY", os.getenv("DASHSCOPE_API_KEY", "")).strip(),
        "vision_base_url": os.getenv(
            "VISION_BASE_URL",
            "https://dashscope.aliyuncs.com/compatible-mode/v1",
        ).rstrip("/"),
        "vision_model": os.getenv("VISION_MODEL", "qwen3-vl-plus"),
    }
