"""DeepSeek 大模型调用服务"""

from __future__ import annotations

import json
import logging
from typing import Any, Callable, Dict, Generator, List, Optional, Tuple

import requests

from ..config.settings import get_settings

logger = logging.getLogger(__name__)


class DeepSeekServiceError(Exception):
    """DeepSeek 调用异常"""

    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


class DeepSeekService:
    """封装 DeepSeek Chat Completions API"""

    @staticmethod
    def _settings() -> dict:
        return get_settings()

    @property
    def api_key(self) -> str:
        return self._settings()["deepseek_api_key"]

    @property
    def base_url(self) -> str:
        return self._settings()["deepseek_base_url"]

    @property
    def model(self) -> str:
        return self._settings()["deepseek_model"]

    def is_configured(self) -> bool:
        return bool(self.api_key)

    @staticmethod
    def build_recipe_system_prompt(recipe: Dict[str, Any]) -> str:
        """根据菜谱详情构建系统提示词"""
        steps_text = "\n".join(
            f"{idx + 1}. {step.get('description', '')}"
            for idx, step in enumerate(recipe.get("steps") or [])
        )
        ingredients_text = "\n".join(
            f"- {item.get('name', '未知')}：{item.get('required_quantity', '')}"
            + ("（必选）" if item.get("is_required") else "（可选）")
            for item in recipe.get("ingredients") or []
        )

        return (
            "你是「智能云冰箱」App 中的专业烹饪助手，正在帮助用户制作一道菜。\n"
            "请基于以下菜谱信息回答问题，语气亲切、步骤清晰，适合做饭过程中快速阅读。\n"
            "要求：\n"
            "1. 优先结合本菜谱的步骤和食材作答；\n"
            "2. 若问题与当前菜谱无关，可简要回答并引导回到本菜；\n"
            "3. 涉及食品安全时给出保守建议；\n"
            "4. 回答简洁实用，控制在 300 字以内，必要时用条目列出。\n\n"
            f"【菜名】{recipe.get('name', '')}\n"
            f"【烹饪时间】约 {recipe.get('cooking_time', 0)} 分钟\n"
            f"【所需食材】\n{ingredients_text or '暂无'}\n"
            f"【制作步骤】\n{steps_text or '暂无'}"
        )

    def _build_messages(
        self,
        *,
        system_prompt: str,
        question: str,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> List[Dict[str, str]]:
        messages: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]

        for item in history or []:
            role = item.get("role")
            content = (item.get("content") or "").strip()
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": question.strip()})
        return messages

    def _request_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _raise_for_response_status(self, response: requests.Response) -> None:
        if response.status_code == 401:
            raise DeepSeekServiceError("DeepSeek API Key 无效或已过期，请检查 backend/.env", 401)
        if response.status_code == 429:
            raise DeepSeekServiceError("DeepSeek 请求过于频繁，请稍后再试", 429)
        if not response.ok:
            detail = response.text[:300]
            raise DeepSeekServiceError(
                f"DeepSeek 调用失败（HTTP {response.status_code}）：{detail}",
                status_code=502,
            )

    def chat(
        self,
        *,
        system_prompt: str,
        question: str,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        if not self.is_configured():
            raise DeepSeekServiceError(
                "未配置 DEEPSEEK_API_KEY，请在 backend/.env 中填写真实的 DeepSeek API Key",
                status_code=503,
            )

        messages = self._build_messages(
            system_prompt=system_prompt,
            question=question,
            history=history,
        )

        url = f"{self.base_url}/chat/completions"
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 1024,
            "stream": False,
        }

        try:
            response = requests.post(
                url,
                headers=self._request_headers(),
                json=payload,
                timeout=60,
            )
        except requests.RequestException as exc:
            logger.exception("DeepSeek 网络请求失败")
            raise DeepSeekServiceError(f"DeepSeek 服务连接失败：{exc}", status_code=502) from exc

        self._raise_for_response_status(response)

        data = response.json()
        try:
            return data["choices"][0]["message"]["content"].strip()
        except (KeyError, IndexError, TypeError) as exc:
            logger.error("DeepSeek 响应格式异常: %s", data)
            raise DeepSeekServiceError("DeepSeek 返回数据格式异常", status_code=502) from exc

    def chat_stream(
        self,
        *,
        system_prompt: str,
        question: str,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Generator[str, None, None]:
        """流式调用 DeepSeek，逐段 yield 文本增量。"""
        if not self.is_configured():
            raise DeepSeekServiceError(
                "未配置 DEEPSEEK_API_KEY，请在 backend/.env 中填写真实的 DeepSeek API Key",
                status_code=503,
            )

        messages = self._build_messages(
            system_prompt=system_prompt,
            question=question,
            history=history,
        )

        url = f"{self.base_url}/chat/completions"
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 1024,
            "stream": True,
        }

        try:
            response = requests.post(
                url,
                headers=self._request_headers(),
                json=payload,
                timeout=60,
                stream=True,
            )
        except requests.RequestException as exc:
            logger.exception("DeepSeek 流式请求失败")
            raise DeepSeekServiceError(f"DeepSeek 服务连接失败：{exc}", status_code=502) from exc

        self._raise_for_response_status(response)

        for line in response.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data: "):
                continue

            data_str = line[6:].strip()
            if data_str == "[DONE]":
                break

            try:
                chunk = json.loads(data_str)
            except json.JSONDecodeError:
                logger.warning("DeepSeek 流式块解析失败: %s", data_str[:200])
                continue

            try:
                delta = chunk["choices"][0]["delta"].get("content") or ""
            except (KeyError, IndexError, TypeError):
                continue

            if delta:
                yield delta

    def _post_chat_completion(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not self.is_configured():
            raise DeepSeekServiceError(
                "未配置 DEEPSEEK_API_KEY，请在 backend/.env 中填写真实的 DeepSeek API Key",
                status_code=503,
            )

        url = f"{self.base_url}/chat/completions"
        try:
            response = requests.post(
                url,
                headers=self._request_headers(),
                json=payload,
                timeout=90,
            )
        except requests.RequestException as exc:
            logger.exception("DeepSeek 网络请求失败")
            raise DeepSeekServiceError(f"DeepSeek 服务连接失败：{exc}", status_code=502) from exc

        self._raise_for_response_status(response)
        return response.json()

    def chat_with_tools(
        self,
        *,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
        tool_executor: Callable[[str, Dict[str, Any]], Any],
        max_rounds: int = 6,
        temperature: float = 0.5,
    ) -> Tuple[str, List[str], List[Dict[str, Any]]]:
        """
        带工具调用的多轮对话，直到模型返回最终文本。
        返回 (answer, tool_names_called, updated_messages)。
        """
        working_messages = list(messages)
        tool_names_called: List[str] = []

        for _ in range(max_rounds):
            payload: Dict[str, Any] = {
                "model": self.model,
                "messages": working_messages,
                "temperature": temperature,
                "max_tokens": 2048,
                "stream": False,
                "tools": tools,
                "tool_choice": "auto",
            }
            data = self._post_chat_completion(payload)

            try:
                message = data["choices"][0]["message"]
            except (KeyError, IndexError, TypeError) as exc:
                logger.error("DeepSeek 工具调用响应格式异常: %s", data)
                raise DeepSeekServiceError("DeepSeek 返回数据格式异常", status_code=502) from exc

            tool_calls = message.get("tool_calls") or []
            if not tool_calls:
                content = (message.get("content") or "").strip()
                return content, tool_names_called, working_messages

            working_messages.append(message)

            for tool_call in tool_calls:
                fn = tool_call.get("function") or {}
                tool_name = fn.get("name", "")
                raw_args = fn.get("arguments") or "{}"
                try:
                    args = json.loads(raw_args) if isinstance(raw_args, str) else raw_args
                except json.JSONDecodeError:
                    args = {}

                if tool_name:
                    tool_names_called.append(tool_name)

                try:
                    result = tool_executor(tool_name, args)
                    result_content = json.dumps(result, ensure_ascii=False)
                except Exception as exc:
                    logger.exception("工具 %s 执行失败", tool_name)
                    result_content = json.dumps(
                        {"error": str(exc)},
                        ensure_ascii=False,
                    )

                working_messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_call.get("id"),
                        "content": result_content,
                    }
                )

        raise DeepSeekServiceError("AI Agent 工具调用轮次超限，请简化问题后重试", status_code=502)

    @staticmethod
    def _accumulate_stream_tool_calls(
        tool_calls_by_index: Dict[int, Dict[str, Any]],
        deltas: List[Dict[str, Any]],
    ) -> None:
        for tc in deltas:
            idx = tc.get("index", 0)
            if idx not in tool_calls_by_index:
                tool_calls_by_index[idx] = {
                    "id": "",
                    "type": "function",
                    "function": {"name": "", "arguments": ""},
                }
            entry = tool_calls_by_index[idx]
            if tc.get("id"):
                entry["id"] = tc["id"]
            fn = tc.get("function") or {}
            if fn.get("name"):
                entry["function"]["name"] += fn["name"]
            if fn.get("arguments"):
                entry["function"]["arguments"] += fn["arguments"]

    @staticmethod
    def _ordered_tool_calls(tool_calls_by_index: Dict[int, Dict[str, Any]]) -> List[Dict[str, Any]]:
        return [tool_calls_by_index[i] for i in sorted(tool_calls_by_index.keys())]

    def chat_with_tools_stream(
        self,
        *,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
        tool_executor: Callable[[str, Dict[str, Any]], Any],
        max_rounds: int = 6,
        temperature: float = 0.5,
    ) -> Generator[Dict[str, Any], None, None]:
        """
        带工具调用的流式对话。逐轮流式请求，工具阶段发出 tool 事件，最终回答发出 delta 事件。
        结束时 yield {"done": True, "answer": "...", "tool_calls_made": [...]}。
        """
        if not self.is_configured():
            raise DeepSeekServiceError(
                "未配置 DEEPSEEK_API_KEY，请在 backend/.env 中填写真实的 DeepSeek API Key",
                status_code=503,
            )

        working_messages = list(messages)
        tool_names_called: List[str] = []
        url = f"{self.base_url}/chat/completions"

        for _ in range(max_rounds):
            payload: Dict[str, Any] = {
                "model": self.model,
                "messages": working_messages,
                "temperature": temperature,
                "max_tokens": 2048,
                "stream": True,
                "tools": tools,
                "tool_choice": "auto",
            }

            try:
                response = requests.post(
                    url,
                    headers=self._request_headers(),
                    json=payload,
                    timeout=90,
                    stream=True,
                )
            except requests.RequestException as exc:
                logger.exception("DeepSeek 流式工具调用请求失败")
                raise DeepSeekServiceError(f"DeepSeek 服务连接失败：{exc}", status_code=502) from exc

            self._raise_for_response_status(response)

            tool_calls_by_index: Dict[int, Dict[str, Any]] = {}
            round_content: List[str] = []

            for line in response.iter_lines(decode_unicode=True):
                if not line or not line.startswith("data: "):
                    continue

                data_str = line[6:].strip()
                if data_str == "[DONE]":
                    break

                try:
                    chunk = json.loads(data_str)
                except json.JSONDecodeError:
                    logger.warning("DeepSeek 流式块解析失败: %s", data_str[:200])
                    continue

                try:
                    delta = chunk["choices"][0]["delta"]
                except (KeyError, IndexError, TypeError):
                    continue

                content = delta.get("content") or ""
                if content:
                    round_content.append(content)
                    yield {"delta": content}

                tool_deltas = delta.get("tool_calls")
                if tool_deltas:
                    self._accumulate_stream_tool_calls(tool_calls_by_index, tool_deltas)

            tool_calls = self._ordered_tool_calls(tool_calls_by_index)
            if not tool_calls:
                answer = "".join(round_content).strip()
                yield {
                    "done": True,
                    "answer": answer,
                    "tool_calls_made": tool_names_called,
                }
                return

            message: Dict[str, Any] = {
                "role": "assistant",
                "content": "".join(round_content) or None,
                "tool_calls": tool_calls,
            }
            working_messages.append(message)

            for tool_call in tool_calls:
                fn = tool_call.get("function") or {}
                tool_name = fn.get("name", "")
                raw_args = fn.get("arguments") or "{}"
                try:
                    args = json.loads(raw_args) if isinstance(raw_args, str) else raw_args
                except json.JSONDecodeError:
                    args = {}

                if tool_name:
                    tool_names_called.append(tool_name)
                    yield {"tool": tool_name}

                try:
                    result = tool_executor(tool_name, args)
                    result_content = json.dumps(result, ensure_ascii=False)
                except Exception as exc:
                    logger.exception("工具 %s 执行失败", tool_name)
                    result_content = json.dumps({"error": str(exc)}, ensure_ascii=False)

                working_messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_call.get("id"),
                        "content": result_content,
                    }
                )

        raise DeepSeekServiceError("AI Agent 工具调用轮次超限，请简化问题后重试", status_code=502)


deepseek_service = DeepSeekService()
