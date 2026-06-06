import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as userApi from '../../api/user';
import { setAuthSession } from '../../utils/auth';
import type { UserCreateRequest, UserUpdate } from '../../types/api';

export const useUserAuth = () => {
  return useMutation({
    mutationFn: (data: UserCreateRequest) => userApi.userAuth(data),
    onSuccess: (data) => {
      setAuthSession({
        token: data.token,
        user_id: data.user_id,
        nickname: data.nickname,
      });
    },
    onError: (error: Error) => {
      console.error('用户认证失败:', error);
    },
  });
};

export const useUpdateParentMode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userApi.updateParentMode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: (error: Error) => {
      console.error('更新爸妈模式失败:', error);
    },
  });
};

export const useUserInfo = (userId: number | null | undefined) => {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => userApi.getUserInfo(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
};

export const useUpdateUserInfo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: UserUpdate }) =>
      userApi.updateUserInfo(userId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user', variables.userId] });
    },
    onError: (error: Error) => {
      console.error('更新用户信息失败:', error);
    },
  });
};
