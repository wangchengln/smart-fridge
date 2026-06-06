import type { ApiResponse } from '../types/api';
import type { MockRequestOptions } from 'mockjs';

export function parseBody<T>(options: MockRequestOptions): T {
  return JSON.parse(options.body) as T;
}

export function successResponse<T>(data: T, message = 'success'): ApiResponse<T> {
  return { code: 200, message, data };
}

export function messageResponse(message: string): ApiResponse<undefined> {
  return { code: 200, message, data: undefined };
}
