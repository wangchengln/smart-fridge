/**
 * 用户管理相关 API 接口封装
 */

import http from '../utils/http';
import type {
  ParentModeResponse,
  ParentModeUpdateRequest,
  UserCreateRequest,
  UserInfoResponse,
  UserResponse,
  UserUpdate,
} from '../types/api';

export const userAuth = async (data: UserCreateRequest): Promise<UserResponse> => {
  const response = await http.post<UserResponse>('/api/user/auth', data);
  return response.data;
};

export const updateParentMode = async (
  data: ParentModeUpdateRequest
): Promise<ParentModeResponse> => {
  const response = await http.put<ParentModeResponse>('/api/user/parent-mode', data);
  return response.data;
};

export const getUserInfo = async (userId: number): Promise<UserInfoResponse> => {
  const response = await http.get<UserInfoResponse>(`/api/user/${userId}`);
  return response.data;
};

export const updateUserInfo = async (
  userId: number,
  data: UserUpdate
): Promise<UserInfoResponse> => {
  const response = await http.put<UserInfoResponse>(`/api/user/${userId}`, data);
  return response.data;
};

export const userApi = {
  auth: userAuth,
  updateParentMode,
  getUserInfo,
  updateUserInfo,
};
