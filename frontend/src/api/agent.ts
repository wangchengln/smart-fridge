/**
 * 云冰箱 AI Agent API
 */

import env from '../config/env';
import http from '../utils/http';
import type {
  FridgeAgentChatRequest,
  FridgeAgentChatResponse,
  FridgeAgentChatStreamDone,
  FridgeAgentStatusResponse,
} from '../types/api';
import type { ApiResponse } from '../types/api';

export const getFridgeAgentStatus = async (): Promise<FridgeAgentStatusResponse> => {
  const response = await http.get<FridgeAgentStatusResponse>('/api/agent/fridge/status');
  return response.data;
};

export const chatWithFridgeAgent = async (
  data: FridgeAgentChatRequest
): Promise<FridgeAgentChatResponse> => {
  const response = await http.post<FridgeAgentChatResponse>('/api/agent/fridge/chat', data, {
    timeout: 120000,
  });
  return response.data;
};

interface FridgeAgentStreamEvent {
  delta?: string;
  tool?: string;
  done?: boolean;
  error?: string;
  model?: string;
  provider?: string;
  tool_calls_made?: string[];
  structured?: FridgeAgentChatStreamDone['structured'];
}

const parseSseBuffer = (buffer: string): { events: FridgeAgentStreamEvent[]; rest: string } => {
  const parts = buffer.split('\n\n');
  const rest = parts.pop() ?? '';
  const events: FridgeAgentStreamEvent[] = [];

  for (const part of parts) {
    const line = part
      .split('\n')
      .map((row) => row.trim())
      .find((row) => row.startsWith('data:'));
    if (!line) continue;

    const payload = line.replace(/^data:\s*/, '');
    if (!payload) continue;

    try {
      events.push(JSON.parse(payload) as FridgeAgentStreamEvent);
    } catch {
      // 忽略无法解析的 SSE 块
    }
  }

  return { events, rest };
};

const extractApiErrorMessage = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as ApiResponse<unknown>;
    if (body.message) return body.message;
  } catch {
    // 非 JSON 响应
  }
  return `请求失败（HTTP ${response.status}）`;
};

/** 云冰箱 AI Agent 流式对话（SSE） */
export const chatWithFridgeAgentStream = async (
  data: FridgeAgentChatRequest,
  callbacks: {
    onDelta: (delta: string) => void;
    onTool?: (toolName: string) => void;
  },
  signal?: AbortSignal
): Promise<FridgeAgentChatStreamDone> => {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${env.API_BASE_URL}/api/agent/fridge/chat/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
    signal,
  });

  if (!response.ok) {
    throw new Error(await extractApiErrorMessage(response));
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('浏览器不支持流式响应');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let doneMeta: FridgeAgentChatStreamDone | null = null;

  const handleEvents = (events: FridgeAgentStreamEvent[]) => {
    for (const event of events) {
      if (event.error) {
        throw new Error(event.error);
      }
      if (event.tool) {
        callbacks.onTool?.(event.tool);
      }
      if (event.delta) {
        callbacks.onDelta(event.delta);
      }
      if (event.done) {
        doneMeta = {
          done: true,
          model: event.model ?? '',
          provider: event.provider ?? 'deepseek',
          tool_calls_made: event.tool_calls_made ?? [],
          structured: event.structured,
        };
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const { events, rest } = parseSseBuffer(buffer);
    buffer = rest;
    handleEvents(events);
  }

  if (buffer.trim()) {
    const { events } = parseSseBuffer(`${buffer}\n\n`);
    handleEvents(events);
  }

  if (!doneMeta) {
    throw new Error('AI 流式响应异常结束');
  }

  return doneMeta;
};
