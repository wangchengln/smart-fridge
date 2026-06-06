import {
  useQuery,
  useMutation,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { userApi } from '../../api/user';
import { ingredientApi } from '../../api/ingredient';
import * as imageRecognitionApi from '../../api/image-recognition';
import * as recipeApi from '../../api/recipe';
import * as purchaseApi from '../../api/purchase';
import type {
  ProductMatchResponse,
  ProductSearchParams,
  RecipeRecommendParams,
  RecognitionStatusResponse,
  RecommendationResponse,
  UserInfoResponse,
} from '../../types/api';

export const createTypedQuery = <TData>(
  queryKey: unknown[],
  queryFn: () => Promise<TData>,
  options: Omit<UseQueryOptions<TData>, 'queryKey' | 'queryFn'> = {}
) => {
  return () =>
    useQuery({
      queryKey,
      queryFn,
      ...options,
    });
};

export const createTypedMutation = <TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'> = {}
) => {
  return () =>
    useMutation({
      mutationFn,
      ...options,
    });
};

export const QueryTypes = {
  USER_INFO: 'user/info',
  USER_AUTH: 'user/auth',
  PARENT_MODE: 'user/parentMode',
  INGREDIENT_RECOGNITION: 'ingredient/recognition',
  INGREDIENT_STOCK: 'ingredient/stock',
  NEAR_EXPIRY: 'ingredient/nearExpiry',
  IMAGE_UPLOAD: 'image/upload',
  RECOGNITION_STATUS: 'image/status',
  RECOGNITION_RESULT: 'image/result',
  RECIPE_RECOMMENDATIONS: 'recipe/recommendations',
  RECIPE_DETAIL: 'recipe/detail',
  PURCHASE_ANALYSIS: 'purchase/analysis',
  PURCHASE_PLANS: 'purchase/plans',
  PRODUCT_SEARCH: 'purchase/products',
} as const;

export const TypedQueries = {
  useUser: (userId: number | null | undefined) =>
    createTypedQuery<UserInfoResponse>(
      [QueryTypes.USER_INFO, userId],
      () => userApi.getUserInfo(userId!),
      { enabled: !!userId }
    ),

  useIngredientRecognition: () =>
    createTypedMutation((data: Parameters<typeof ingredientApi.recognize>[0]) =>
      ingredientApi.recognize(data)
    ),

  useRecognitionStatus: (recognitionId: number | null | undefined) =>
    createTypedQuery<RecognitionStatusResponse>(
      [QueryTypes.RECOGNITION_STATUS, recognitionId],
      () => imageRecognitionApi.getRecognitionStatus(recognitionId!),
      {
        enabled: !!recognitionId,
        refetchInterval: (query) => {
          const status = query.state.data?.status;
          return status === 'pending' || status === 'processing' ? 2000 : false;
        },
      }
    ),

  useRecipeRecommendations: (params: RecipeRecommendParams | undefined) =>
    createTypedQuery<RecommendationResponse>(
      [QueryTypes.RECIPE_RECOMMENDATIONS, params],
      () => recipeApi.getRecipeRecommendations(params!),
      { enabled: !!params?.user_id }
    ),

  useProductSearch: (params: ProductSearchParams | undefined) =>
    createTypedQuery<ProductMatchResponse>(
      [QueryTypes.PRODUCT_SEARCH, params],
      () => purchaseApi.searchProducts(params!),
      { enabled: !!params?.ingredient_id }
    ),
};
