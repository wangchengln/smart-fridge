import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as imageRecognitionApi from '../../api/image-recognition';
import type {
  ConfirmRecognitionRequest,
  ImageUploadRequest,
  UpdateRecognitionResultRequest,
} from '../../types/api';

export const useUploadAndRecognizeImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ImageUploadRequest) => imageRecognitionApi.uploadAndRecognizeImage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imageRecognition', 'history'] });
    },
    onError: (error: Error) => {
      console.error('图片上传识别失败:', error);
    },
  });
};

export const useRecognitionStatus = (recognitionId: number | null | undefined) => {
  return useQuery({
    queryKey: ['imageRecognition', 'status', recognitionId],
    queryFn: () => imageRecognitionApi.getRecognitionStatus(recognitionId!),
    enabled: !!recognitionId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'pending' || status === 'processing' ? 2000 : false;
    },
    staleTime: 0,
  });
};

export const useRecognitionResult = (recognitionId: number | null | undefined) => {
  return useQuery({
    queryKey: ['imageRecognition', 'result', recognitionId],
    queryFn: () => imageRecognitionApi.getRecognitionResult(recognitionId!),
    enabled: !!recognitionId,
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateRecognitionResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateRecognitionResultRequest) =>
      imageRecognitionApi.updateRecognitionResult(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['imageRecognition', 'status', variables.recognition_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['imageRecognition', 'result', variables.recognition_id],
      });
    },
    onError: (error: Error) => {
      console.error('更新识别结果失败:', error);
    },
  });
};

export const useConfirmRecognition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ConfirmRecognitionRequest) => imageRecognitionApi.confirmRecognition(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['imageRecognition', 'status', variables.recognition_id],
      });
      queryClient.invalidateQueries({ queryKey: ['imageRecognition', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['ingredient', 'stock'] });
    },
    onError: (error: Error) => {
      console.error('确认识别结果失败:', error);
    },
  });
};

export const useUserRecognitionHistory = (
  userId: number | null | undefined,
  limit = 10
) => {
  return useQuery({
    queryKey: ['imageRecognition', 'history', userId, limit],
    queryFn: () => imageRecognitionApi.getUserRecognitionHistory(userId!, limit),
    enabled: !!userId,
    staleTime: 1000 * 60,
  });
};

export const useDeleteRecognitionRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recognitionId: number) =>
      imageRecognitionApi.deleteRecognitionRecord(recognitionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imageRecognition', 'history'] });
    },
    onError: (error: Error) => {
      console.error('删除识别记录失败:', error);
    },
  });
};
