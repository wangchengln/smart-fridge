export interface AuthSession {
  token: string;
  user_id: number;
  nickname: string;
}

const TOKEN_KEY = 'token';
const USER_ID_KEY = 'userId';
const NICKNAME_KEY = 'nickname';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const setToken = (token: string | null): void => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const getUserId = (): number | null => {
  const id = localStorage.getItem(USER_ID_KEY);
  return id ? Number(id) : null;
};

export const setUserId = (userId: number | null): void => {
  if (userId != null) {
    localStorage.setItem(USER_ID_KEY, String(userId));
  } else {
    localStorage.removeItem(USER_ID_KEY);
  }
};

export const getNickname = (): string | null => localStorage.getItem(NICKNAME_KEY);

export const setNickname = (nickname: string | null): void => {
  if (nickname) {
    localStorage.setItem(NICKNAME_KEY, nickname);
  } else {
    localStorage.removeItem(NICKNAME_KEY);
  }
};

export const setAuthSession = ({ token, user_id, nickname }: AuthSession): void => {
  setToken(token);
  setUserId(user_id);
  setNickname(nickname);
};

export const clearAuthSession = (): void => {
  setToken(null);
  setUserId(null);
  setNickname(null);
};

export const isAuthenticated = (): boolean => Boolean(getToken() && getUserId());
