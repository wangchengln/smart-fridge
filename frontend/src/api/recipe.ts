/**
 * 菜谱推荐相关 API 接口封装
 */

import env from '../config/env';
import http from '../utils/http';
import type {
  AdvancedRecommendationRequest,
  ApiResponse,
  PaginationQueryParams,
  RecipeChatRequest,
  RecipeChatResponse,
  RecipeChatStreamDone,
  RecipeChatStatusResponse,
  RecipeDetailResponse,
  RecipeDietaryAnalysisParams,
  RecipeDietaryAnalysisResponse,
  RecipeRecommendParams,
  TakeoutRedirectParams,
  TakeoutRedirectResponse,
  RecipeSelectionRequest,
  RecipeSelectionResponse,
  ClearRecommendationCacheResponse,
  RecipeCollectionResponse,
  RecipeCookRecordResponse,
  RecipeCookRequest,
  RecommendationResponse,
  RecommendationStats,
  UserRecommendationHistoryResponse,
} from '../types/api';

export const getRecipeRecommendations = async (
  params: RecipeRecommendParams
): Promise<RecommendationResponse> => {
  const response = await http.get<RecommendationResponse>('/api/recipe/recommend', { params });
  return response.data;
};

/** 获取「前往美团外卖」页面数据（跳转链接 + 外卖同款推荐） */
export const getTakeoutRedirect = async (
  params: TakeoutRedirectParams
): Promise<TakeoutRedirectResponse> => {
  const response = await http.get<TakeoutRedirectResponse>('/api/recipe/takeout/redirect', {
    params,
  });
  return response.data;
};

export const getAdvancedRecipeRecommendations = async (
  data: AdvancedRecommendationRequest
): Promise<RecommendationResponse> => {
  const response = await http.post<RecommendationResponse>('/api/recipe/advanced-recommend', data);
  return response.data;
};

export const selectRecipe = async (
  data: RecipeSelectionRequest
): Promise<RecipeSelectionResponse> => {
  const response = await http.post<RecipeSelectionResponse>('/api/recipe/select', data);
  return response.data;
};

/** 从菜谱详情选择该菜（与推荐页「选它」相同，同步完成集卡） */
export const selectRecipeById = async (
  recipeId: number,
  data: RecipeCookRequest
): Promise<RecipeSelectionResponse> => {
  const response = await http.post<RecipeSelectionResponse>(
    `/api/recipe/${recipeId}/select`,
    data
  );
  return response.data;
};

export const getRecipeDetail = async (recipeId: number): Promise<RecipeDetailResponse> => {
  const response = await http.get<RecipeDetailResponse>(`/api/recipe/${recipeId}`);
  return response.data;
};

export const getRecipeDietaryAnalysis = async (
  recipeId: number,
  params: RecipeDietaryAnalysisParams
): Promise<RecipeDietaryAnalysisResponse> => {
  const response = await http.get<RecipeDietaryAnalysisResponse>(
    `/api/recipe/${recipeId}/dietary-analysis`,
    { params }
  );
  return response.data;
};

export const getUserRecommendationHistory = async (
  userId: number,
  params: PaginationQueryParams = {}
): Promise<UserRecommendationHistoryResponse> => {
  const response = await http.get<UserRecommendationHistoryResponse>(
    `/api/recipe/user/${userId}/recommendations`,
    { params }
  );
  return response.data;
};

export const getRecommendationStats = async (userId: number): Promise<RecommendationStats> => {
  const response = await http.get<RecommendationStats>(
    `/api/recipe/recommendation-stats/${userId}`
  );
  return response.data;
};

export const getRecipeCollection = async (
  userId: number,
  params?: { year?: number; month?: number }
): Promise<RecipeCollectionResponse> => {
  const response = await http.get<RecipeCollectionResponse>(
    `/api/recipe/user/${userId}/collection`,
    { params }
  );
  return response.data;
};

export const recordRecipeCooked = async (
  recipeId: number,
  data: RecipeCookRequest
): Promise<RecipeCookRecordResponse> => {
  const response = await http.post<RecipeCookRecordResponse>(
    `/api/recipe/${recipeId}/cook`,
    data
  );
  return response.data;
};

export const clearRecommendationCache = async (
  userId: number
): Promise<ClearRecommendationCacheResponse> => {
  const response = await http.delete<ClearRecommendationCacheResponse>(
    `/api/recipe/user/${userId}/recommendations/cache`
  );
  return response.data;
};

export const getRecipeChatStatus = async (): Promise<RecipeChatStatusResponse> => {
  const response = await http.get<RecipeChatStatusResponse>('/api/recipe/chat/status');
  return response.data;
};

export const askRecipeQuestion = async (
  data: RecipeChatRequest
): Promise<RecipeChatResponse> => {
  const response = await http.post<RecipeChatResponse>('/api/recipe/chat', data, {
    timeout: 90000,
  });
  return response.data;
};

interface RecipeChatStreamEvent {
  delta?: string;
  done?: boolean;
  error?: string;
  model?: string;
  recipe_id?: number;
  recipe_name?: string;
}

const parseSseBuffer = (buffer: string): { events: RecipeChatStreamEvent[]; rest: string } => {
  const parts = buffer.split('\n\n');
  const rest = parts.pop() ?? '';
  const events: RecipeChatStreamEvent[] = [];

  for (const part of parts) {
    const line = part
      .split('\n')
      .map((row) => row.trim())
      .find((row) => row.startsWith('data:'));
    if (!line) continue;

    const payload = line.replace(/^data:\s*/, '');
    if (!payload) continue;

    try {
      events.push(JSON.parse(payload) as RecipeChatStreamEvent);
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

/** 菜谱 AI 流式问答（SSE） */
export const askRecipeQuestionStream = async (
  data: RecipeChatRequest,
  onDelta: (delta: string) => void,
  signal?: AbortSignal
): Promise<RecipeChatStreamDone> => {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${env.API_BASE_URL}/api/recipe/chat/stream`, {
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
  let doneMeta: RecipeChatStreamDone | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const { events, rest } = parseSseBuffer(buffer);
    buffer = rest;

    for (const event of events) {
      if (event.error) {
        throw new Error(event.error);
      }
      if (event.delta) {
        onDelta(event.delta);
      }
      if (event.done) {
        doneMeta = {
          done: true,
          model: event.model ?? '',
          recipe_id: event.recipe_id ?? data.recipe_id,
          recipe_name: event.recipe_name ?? '',
        };
      }
    }
  }

  if (buffer.trim()) {
    const { events } = parseSseBuffer(`${buffer}\n\n`);
    for (const event of events) {
      if (event.error) throw new Error(event.error);
      if (event.delta) onDelta(event.delta);
      if (event.done) {
        doneMeta = {
          done: true,
          model: event.model ?? '',
          recipe_id: event.recipe_id ?? data.recipe_id,
          recipe_name: event.recipe_name ?? '',
        };
      }
    }
  }

  if (!doneMeta) {
    throw new Error('AI 流式响应异常结束');
  }

  return doneMeta;
};
