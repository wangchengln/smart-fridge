"""
统一 API 响应格式：{ code, message, data }
与前端 utils/http.js 及 docs/api-contract.md 保持一致。
"""

import json
from typing import Any

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


def success_response(data: Any = None, message: str = "success") -> dict:
    return {"code": 200, "message": message, "data": data}


def error_response(code: int, message: str, data: Any = None) -> dict:
    return {"code": code, "message": message, "data": data}


EXCLUDE_PATH_PREFIXES = ("/docs", "/redoc", "/openapi")
EXCLUDE_PATHS = {"/", "/health"}


def _should_wrap(path: str) -> bool:
    if path in EXCLUDE_PATHS:
        return False
    if any(path.startswith(prefix) for prefix in EXCLUDE_PATH_PREFIXES):
        return False
    return path.startswith("/api/")


def _extract_error_message(payload: Any) -> str:
    if isinstance(payload, dict):
        detail = payload.get("detail")
        if isinstance(detail, str):
            return detail
        if isinstance(detail, list) and detail:
            first = detail[0]
            if isinstance(first, dict) and "msg" in first:
                return str(first["msg"])
            return "参数校验失败"
    return "请求失败"


class UnifiedResponseMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not _should_wrap(request.url.path):
            return await call_next(request)

        response = await call_next(request)
        content_type = response.headers.get("content-type", "")
        if "application/json" not in content_type:
            return response

        body = b""
        async for chunk in response.body_iterator:
            body += chunk

        if not body:
            return response

        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            return Response(
                content=body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=content_type,
            )

        if isinstance(payload, dict) and "code" in payload and "message" in payload:
            return JSONResponse(content=payload, status_code=response.status_code)

        if response.status_code >= 400:
            wrapped = error_response(
                response.status_code,
                _extract_error_message(payload),
            )
            return JSONResponse(content=wrapped, status_code=response.status_code)

        wrapped = success_response(payload)
        return JSONResponse(content=wrapped, status_code=response.status_code)


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    message = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response(exc.status_code, message),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content=error_response(422, "参数校验失败"),
    )
