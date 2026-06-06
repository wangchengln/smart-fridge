import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as userApi from '../api/user';
import type { UserCreateRequest, UserResponse } from '../types/api';
import {
  clearAuthSession,
  getNickname,
  getToken,
  getUserId,
  setAuthSession,
} from '../utils/auth';

interface AuthContextValue {
  userId: number | null;
  nickname: string | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: UserCreateRequest) => Promise<UserResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserIdState] = useState<number | null>(() => getUserId());
  const [nickname, setNicknameState] = useState<string | null>(() => getNickname());
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (credentials: UserCreateRequest) => {
    setIsLoading(true);
    try {
      const data = await userApi.userAuth(credentials);
      setAuthSession({
        token: data.token,
        user_id: data.user_id,
        nickname: data.nickname,
      });
      setTokenState(data.token);
      setUserIdState(data.user_id);
      setNicknameState(data.nickname);
      return data;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearAuthSession();
    setTokenState(null);
    setUserIdState(null);
    setNicknameState(null);
  }, []);

  const value = useMemo(
    () => ({
      userId,
      nickname,
      token,
      isAuthenticated: Boolean(token && userId),
      isLoading,
      login,
      logout,
    }),
    [userId, nickname, token, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
