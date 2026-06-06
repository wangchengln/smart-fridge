/**
 * HTTP 请求客户端封装
 * 基于 axios，统一处理 ApiResponse 格式与鉴权
 */

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  isAxiosError,
} from 'axios';
import env from '../config/env';
import type { ApiResponse } from '../types/api';

export class HttpError extends Error {
  readonly code?: number;

  constructor(message: string, code?: number) {
    super(message);
    this.name = 'HttpError';
    this.code = code;
  }
}

interface TypedHttpClient {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>>;
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>>;
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>>;
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>>;
}

const rawClient: AxiosInstance = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: env.REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

rawClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (env.isDev) {
      console.log('Request:', config.method?.toUpperCase(), config.url, config.data ?? config.params);
    }

    return config;
  },
  (error: unknown) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

rawClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    if (env.isDev) {
      console.log('Response:', response.status, response.data);
    }

    const apiData = response.data;

    if (apiData.code === 200) {
      return response;
    }

    return Promise.reject(new HttpError(apiData.message || '请求失败', apiData.code));
  },
  (error: unknown) => {
    console.error('Response Error:', error);

    if (isAxiosError(error)) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
      }

      if (error.response) {
        const payload = error.response.data as { message?: string } | undefined;
        error.message =
          payload?.message || `HTTP ${error.response.status}: ${error.response.statusText}`;
      } else if (error.request) {
        error.message = '网络连接失败，请检查网络设置';
      }
    }

    return Promise.reject(error);
  }
);

async function unwrap<T>(promise: Promise<AxiosResponse<ApiResponse<T>>>): Promise<ApiResponse<T>> {
  const response = await promise;
  return response.data;
}

const http: TypedHttpClient = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    unwrap<T>(rawClient.get<ApiResponse<T>>(url, config)),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    unwrap<T>(rawClient.post<ApiResponse<T>>(url, data, config)),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    unwrap<T>(rawClient.put<ApiResponse<T>>(url, data, config)),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    unwrap<T>(rawClient.delete<ApiResponse<T>>(url, config)),
};

export default http;
