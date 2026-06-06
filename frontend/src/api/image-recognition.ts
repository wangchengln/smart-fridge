/**
 * 图片识别相关 API 接口封装
 */

import http from '../utils/http';
import type {
  ConfirmRecognitionRequest,
  ConfirmRecognitionResponse,
  ImageRecognitionResponse,
  ImageUploadRequest,
  RecognitionStatusResponse,
  UpdateRecognitionResultRequest,
  UpdateRecognitionResultResponse,
} from '../types/api';

export const uploadAndRecognizeImage = async (
  data: ImageUploadRequest
): Promise<ImageRecognitionResponse> => {
  const response = await http.post<ImageRecognitionResponse>(
    '/api/image-recognition/upload',
    data,
    { timeout: 60000 }
  );
  return response.data;
};

export const getRecognitionStatus = async (
  recognitionId: number
): Promise<RecognitionStatusResponse> => {
  const response = await http.get<RecognitionStatusResponse>(
    `/api/image-recognition/status/${recognitionId}`
  );
  return response.data;
};

export const getRecognitionResult = async (
  recognitionId: number
): Promise<RecognitionStatusResponse> => {
  const response = await http.get<RecognitionStatusResponse>(
    `/api/image-recognition/result/${recognitionId}`
  );
  return response.data;
};

export const updateRecognitionResult = async (
  data: UpdateRecognitionResultRequest
): Promise<UpdateRecognitionResultResponse> => {
  const response = await http.post<UpdateRecognitionResultResponse>(
    '/api/image-recognition/update-result',
    data
  );
  return response.data;
};

export const confirmRecognition = async (
  data: ConfirmRecognitionRequest
): Promise<ConfirmRecognitionResponse> => {
  const response = await http.post<ConfirmRecognitionResponse>(
    '/api/image-recognition/confirm',
    data
  );
  return response.data;
};

export const getUserRecognitionHistory = async (
  userId: number,
  limit = 10
): Promise<ImageRecognitionResponse[]> => {
  const response = await http.get<ImageRecognitionResponse[]>(
    `/api/image-recognition/user/${userId}`,
    { params: { limit } }
  );
  return response.data;
};

export const deleteRecognitionRecord = async (recognitionId: number): Promise<void> => {
  const response = await http.delete<void>(`/api/image-recognition/${recognitionId}`);
  return response.data;
};
