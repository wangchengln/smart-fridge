"""云冰箱 AI Agent 路由"""

import json

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..schemas.fridge_agent import (
    FridgeAgentChatRequest,
    FridgeAgentChatResponse,
    FridgeAgentStatusResponse,
)
from ..services.deepseek_service import DeepSeekServiceError, deepseek_service
from ..services.fridge_agent_service import fridge_agent_service
from ..utils.database import get_db

router = APIRouter(prefix="/api/agent/fridge", tags=["云冰箱AI Agent"])


@router.get("/status", response_model=FridgeAgentStatusResponse)
def get_fridge_agent_status():
    """检查 DeepSeek AI Agent 是否已配置"""
    return {
        "configured": deepseek_service.is_configured(),
        "model": deepseek_service.model,
        "provider": "deepseek",
        "tagline": "说一句话，但先看过你的冰箱里面有什么",
    }


@router.post("/chat", response_model=FridgeAgentChatResponse)
def fridge_agent_chat(
    request: FridgeAgentChatRequest,
    db: Session = Depends(get_db),
):
    """
    云冰箱 AI Agent 对话 — 先查库存，再生成闪购方案。
    使用 DeepSeek 工具调用编排 get_fridge_inventory / analyze_scenario 等。
    """
    history = [{"role": item.role, "content": item.content} for item in request.history]

    try:
        result = fridge_agent_service.process_chat(
            db,
            user_id=request.user_id,
            message=request.message,
            history=history,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except DeepSeekServiceError as exc:
        status_code = exc.status_code or status.HTTP_502_BAD_GATEWAY
        raise HTTPException(status_code=status_code, detail=str(exc)) from exc

    return result


@router.post("/chat/stream")
def fridge_agent_chat_stream(
    request: FridgeAgentChatRequest,
    db: Session = Depends(get_db),
):
    """
    云冰箱 AI Agent 对话（SSE 流式输出）。
    事件格式：data: {"delta": "..."} | {"tool": "..."} | {"done": true, ...} | {"error": "..."}
    """
    history = [{"role": item.role, "content": item.content} for item in request.history]

    def event_stream():
        try:
            for event in fridge_agent_service.process_chat_stream(
                db,
                user_id=request.user_id,
                message=request.message,
                history=history,
            ):
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        except ValueError as exc:
            yield f"data: {json.dumps({'error': str(exc)}, ensure_ascii=False)}\n\n"
        except DeepSeekServiceError as exc:
            yield f"data: {json.dumps({'error': str(exc)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
