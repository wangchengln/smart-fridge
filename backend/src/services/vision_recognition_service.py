"""阿里云百炼 · 通义千问视觉模型（Qwen-VL）食材识别服务"""

from __future__ import annotations

import base64
import json
import logging
import mimetypes
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests

from ..config.settings import get_settings
from ..schemas.image_recognition import RecognizedIngredientItem

logger = logging.getLogger(__name__)


class VisionRecognitionError(Exception):
    """视觉识别调用异常"""

    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


class VisionRecognitionService:
    """通过 OpenAI 兼容接口调用 Qwen-VL 进行食材识别"""

    RECOGNITION_PROMPTS = {
        "fridge": (
            "这是一张冰箱内部的照片。请仔细识别图中所有可见的食材，"
            "估算每种食材的数量（整数或一位小数，单位：个/份/盒/袋等统一为数量）。"
        ),
        "shopping_bag": (
            "这是一张购物袋或刚采购回来的食材照片。请仔细识别图中所有可见的食材，"
            "估算每种食材的数量（整数或一位小数）。"
        ),
    }

    SYSTEM_PROMPT = (
        "你是专业的食材识别助手，擅长从照片中识别中文食材名称。"
        "只识别你能在图片中明确看到的食材，不要猜测或编造。"
        "食材名称使用简洁的中文常用名（如「西红柿」而非「番茄」）。"
        "分类从以下选项中选择：蔬菜、水果、肉类、海鲜、蛋类、乳制品、豆制品、菌类、粮食、调料、未分类。"
        "必须严格返回 JSON，不要包含任何其他文字或 Markdown 代码块。"
        '格式：{"ingredients":[{"name":"食材名","quantity":1.0,"confidence":0.95,"category":"分类"}]}'
    )

    @staticmethod
    def _settings() -> dict:
        return get_settings()

    @property
    def api_key(self) -> str:
        return self._settings()["vision_api_key"]

    @property
    def base_url(self) -> str:
        return self._settings()["vision_base_url"]

    @property
    def model(self) -> str:
        return self._settings()["vision_model"]

    def is_configured(self) -> bool:
        return bool(self.api_key)

    @staticmethod
    def _encode_image(image_path: str) -> tuple[str, str]:
        path = Path(image_path)
        if not path.is_file():
            raise VisionRecognitionError(f"图片文件不存在: {image_path}", status_code=400)

        mime_type, _ = mimetypes.guess_type(path.name)
        if not mime_type or not mime_type.startswith("image/"):
            mime_type = "image/jpeg"

        encoded = base64.b64encode(path.read_bytes()).decode("utf-8")
        return mime_type, encoded

    @staticmethod
    def _build_user_prompt(recognition_type: str) -> str:
        scene = VisionRecognitionService.RECOGNITION_PROMPTS.get(
            recognition_type,
            "请识别图片中的所有食材，并估算数量。",
        )
        return f"{scene}\n请返回 JSON 格式的识别结果。"

    @staticmethod
    def _extract_json(text: str) -> Dict[str, Any]:
        cleaned = text.strip()
        fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
        if fence_match:
            cleaned = fence_match.group(1).strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            brace_match = re.search(r"\{[\s\S]*\}", cleaned)
            if not brace_match:
                raise VisionRecognitionError(
                    f"视觉模型返回内容无法解析为 JSON: {text[:300]}",
                    status_code=502,
                )
            try:
                return json.loads(brace_match.group(0))
            except json.JSONDecodeError as exc:
                raise VisionRecognitionError(
                    f"视觉模型返回 JSON 格式异常: {text[:300]}",
                    status_code=502,
                ) from exc

    @staticmethod
    def _normalize_ingredients(raw_items: Any) -> List[RecognizedIngredientItem]:
        if not isinstance(raw_items, list):
            raise VisionRecognitionError("视觉模型返回的 ingredients 不是数组", status_code=502)

        results: List[RecognizedIngredientItem] = []
        for item in raw_items:
            if not isinstance(item, dict):
                continue

            name = str(item.get("name", "")).strip()
            if not name:
                continue

            try:
                quantity = float(item.get("quantity", 1))
            except (TypeError, ValueError):
                quantity = 1.0

            try:
                confidence = float(item.get("confidence", 0.8))
            except (TypeError, ValueError):
                confidence = 0.8

            confidence = max(0.0, min(1.0, confidence))
            quantity = max(0.0, quantity)

            category = item.get("category")
            category_str = str(category).strip() if category else None

            results.append(
                RecognizedIngredientItem(
                    name=name,
                    quantity=quantity,
                    confidence=confidence,
                    category=category_str or None,
                )
            )

        return results

    def recognize_ingredients(
        self,
        image_path: str,
        recognition_type: str,
    ) -> List[RecognizedIngredientItem]:
        if not self.is_configured():
            raise VisionRecognitionError(
                "未配置 VISION_API_KEY（阿里云百炼 API Key），"
                "请在 backend/.env 中填写。申请地址：https://bailian.console.aliyun.com/",
                status_code=503,
            )

        mime_type, encoded_image = self._encode_image(image_path)
        data_url = f"data:{mime_type};base64,{encoded_image}"

        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": data_url}},
                    {"type": "text", "text": self._build_user_prompt(recognition_type)},
                ],
            },
        ]

        url = f"{self.base_url}/chat/completions"
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": 2048,
            "response_format": {"type": "json_object"},
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            response = requests.post(url, headers=headers, json=payload, timeout=90)
        except requests.RequestException as exc:
            logger.exception("视觉识别网络请求失败")
            raise VisionRecognitionError(
                f"视觉识别服务连接失败：{exc}",
                status_code=502,
            ) from exc

        if response.status_code == 401:
            raise VisionRecognitionError(
                "VISION_API_KEY 无效或已过期，请检查 backend/.env",
                status_code=401,
            )
        if response.status_code == 429:
            raise VisionRecognitionError("视觉识别请求过于频繁，请稍后再试", status_code=429)
        if not response.ok:
            detail = response.text[:300]
            raise VisionRecognitionError(
                f"视觉识别调用失败（HTTP {response.status_code}）：{detail}",
                status_code=502,
            )

        try:
            data = response.json()
            content = data["choices"][0]["message"]["content"].strip()
        except (KeyError, IndexError, TypeError, AttributeError) as exc:
            logger.error("视觉识别响应格式异常: %s", response.text[:500])
            raise VisionRecognitionError("视觉识别返回数据格式异常", status_code=502) from exc

        parsed = self._extract_json(content)
        ingredients = self._normalize_ingredients(parsed.get("ingredients"))

        if not ingredients:
            raise VisionRecognitionError(
                "未能从图片中识别到食材，请尝试拍摄更清晰的照片",
                status_code=422,
            )

        logger.info(
            "视觉识别完成 type=%s count=%d model=%s",
            recognition_type,
            len(ingredients),
            self.model,
        )
        return ingredients


vision_recognition_service = VisionRecognitionService()
