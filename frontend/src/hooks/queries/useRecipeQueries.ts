import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as recipeApi from '../../api/recipe';
import type {
  AdvancedRecommendationRequest,
  PaginationQueryParams,
  RecipeChatRequest,
  RecipeCookRequest,
  RecipeDietaryAnalysisParams,
  RecipeRecommendParams,
  TakeoutRedirectParams,
  RecipeSelectionRequest,
} from '../../types/api';

export const useRecipeRecommendations = (params: RecipeRecommendParams | undefined) => {
  const {
    user_id,
    preference,
    max_missing,
    refresh,
    has_time,
    prefer_convenience,
    prefer_premade,
    prefer_takeout,
    dietary_mode,
  } = params ?? {};

  return useQuery({
    queryKey: [
      'recipe',
      'recommendations',
      user_id,
      preference,
      max_missing,
      refresh,
      has_time,
      prefer_convenience,
      prefer_premade,
      prefer_takeout,
      dietary_mode,
    ],
    queryFn: () => recipeApi.getRecipeRecommendations(params!),
    enabled: !!user_id,
    staleTime: 0,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
};

export const useAdvancedRecipeRecommendations = () => {
  return useMutation({
    mutationFn: (data: AdvancedRecommendationRequest) =>
      recipeApi.getAdvancedRecipeRecommendations(data),
    onError: (error: Error) => {
      console.error('高级菜谱推荐失败:', error);
    },
  });
};

export const useSelectRecipe = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RecipeSelectionRequest) => recipeApi.selectRecipe(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recipe', 'recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['recipe', 'user'] });
      if (variables.is_selected) {
        queryClient.invalidateQueries({ queryKey: ['recipe', 'collection'] });
      }
    },
    onError: (error: Error) => {
      console.error('选择菜谱失败:', error);
    },
  });
};

export const useSelectRecipeById = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recipeId,
      data,
    }: {
      recipeId: number;
      data: RecipeCookRequest;
    }) => recipeApi.selectRecipeById(recipeId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recipe', 'collection', variables.data.user_id] });
      queryClient.invalidateQueries({ queryKey: ['recipe', 'recommendations'] });
    },
    onError: (error: Error) => {
      console.error('选择菜谱失败:', error);
    },
  });
};

export const useRecipeDetail = (recipeId: number | null | undefined) => {
  return useQuery({
    queryKey: ['recipe', 'detail', recipeId],
    queryFn: () => recipeApi.getRecipeDetail(recipeId!),
    enabled: !!recipeId,
    staleTime: 1000 * 60 * 30,
  });
};

export const useRecipeDietaryAnalysis = (
  recipeId: number | null | undefined,
  params: RecipeDietaryAnalysisParams | undefined
) => {
  const { user_id, servings, dietary_mode } = params ?? {};

  return useQuery({
    queryKey: ['recipe', 'dietary-analysis', recipeId, user_id, servings, dietary_mode],
    queryFn: () => recipeApi.getRecipeDietaryAnalysis(recipeId!, params!),
    enabled: !!recipeId && !!user_id,
    staleTime: 1000 * 60 * 5,
  });
};

export const useUserRecommendationHistory = (
  userId: number | null | undefined,
  params: PaginationQueryParams = {}
) => {
  return useQuery({
    queryKey: ['recipe', 'user', userId, 'recommendations', params],
    queryFn: () => recipeApi.getUserRecommendationHistory(userId!, params),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
};

export const useRecommendationStats = (userId: number | null | undefined) => {
  return useQuery({
    queryKey: ['recipe', 'stats', userId],
    queryFn: () => recipeApi.getRecommendationStats(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
  });
};

export const useRecipeCollection = (
  userId: number | null | undefined,
  params?: { year?: number; month?: number }
) => {
  return useQuery({
    queryKey: ['recipe', 'collection', userId, params?.year, params?.month],
    queryFn: () => recipeApi.getRecipeCollection(userId!, params),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
};

export const useRecordRecipeCooked = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recipeId,
      data,
    }: {
      recipeId: number;
      data: RecipeCookRequest;
    }) => recipeApi.recordRecipeCooked(recipeId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['recipe', 'collection', variables.data.user_id],
      });
    },
    onError: (error: Error) => {
      console.error('记录做菜失败:', error);
    },
  });
};

export const useClearRecommendationCache = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => recipeApi.clearRecommendationCache(userId),
    onSuccess: (_data, userId) => {
      queryClient.removeQueries({ queryKey: ['recipe', 'recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['recipe', 'stats', userId] });
      queryClient.invalidateQueries({ queryKey: ['recipe', 'user', userId, 'recommendations'] });
    },
    onError: (error: Error) => {
      console.error('清除推荐缓存失败:', error);
    },
  });
};

export const useRecipeChatStatus = () => {
  return useQuery({
    queryKey: ['recipe', 'chat', 'status'],
    queryFn: () => recipeApi.getRecipeChatStatus(),
    staleTime: 1000 * 60 * 5,
  });
};

export const useRecipeChat = () => {
  return useMutation({
    mutationFn: (data: RecipeChatRequest) => recipeApi.askRecipeQuestion(data),
    onError: (error: Error) => {
      console.error('菜谱 AI 问答失败:', error);
    },
  });
};

/** 获取「前往美团外卖」页面数据 */
export const useTakeoutRedirect = () => {
  return useMutation({
    mutationFn: (params: TakeoutRedirectParams) => recipeApi.getTakeoutRedirect(params),
    onError: (error: Error) => {
      console.error('获取美团外卖跳转数据失败:', error);
    },
  });
};
