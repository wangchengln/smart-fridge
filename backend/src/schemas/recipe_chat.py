from pydantic import BaseModel, Field
from typing import List, Literal


class RecipeChatHistoryItem(BaseModel):
    """对话历史条目"""

    role: Literal["user", "assistant"] = Field(..., description="消息角色")
    content: str = Field(..., min_length=1, max_length=4000, description="消息内容")


class RecipeChatRequest(BaseModel):
    """菜谱 AI 问答请求"""

    recipe_id: int = Field(..., gt=0, description="菜谱 ID")
    question: str = Field(..., min_length=1, max_length=1000, description="用户问题")
    history: List[RecipeChatHistoryItem] = Field(default_factory=list, max_length=20)


class RecipeChatResponse(BaseModel):
    """菜谱 AI 问答响应"""

    answer: str
    model: str
    recipe_id: int
    recipe_name: str


class RecipeChatStatusResponse(BaseModel):
    """AI 服务配置状态（不暴露 API Key）"""

    configured: bool
    model: str
    provider: str = "deepseek"
