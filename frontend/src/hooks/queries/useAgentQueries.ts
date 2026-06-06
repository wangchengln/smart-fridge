import { useMutation, useQuery } from '@tanstack/react-query';
import * as agentApi from '../../api/agent';
import type { FridgeAgentChatRequest } from '../../types/api';

export const useFridgeAgentStatus = () =>
  useQuery({
    queryKey: ['agent', 'fridge', 'status'],
    queryFn: agentApi.getFridgeAgentStatus,
    staleTime: 1000 * 60 * 5,
  });

export const useFridgeAgentChat = () =>
  useMutation({
    mutationFn: (data: FridgeAgentChatRequest) => agentApi.chatWithFridgeAgent(data),
  });
