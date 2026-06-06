/**
 * API 接口统一导出
 */

export * from './user';
export * from './ingredient';
export * from './image-recognition';
export * from './recipe';
export * from './purchase';
export * from './coupon';

// 类型契约 re-export，便于业务层 import { UserResponse } from '@/api'
export type * from '../types/api';
