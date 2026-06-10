import { useGetMe, useGetTokenBalance, useGetCurrentSubscription } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";

// MOCK_USER_ID kept for any legacy imports but now uses real auth
export const MOCK_USER_ID = 1;

export function useCurrentUser() {
  const { userId } = useAuth();
  const { data: user, isLoading, error } = useGetMe();
  return { user, isLoading, error, userId };
}

export function useTokenWarning() {
  const { data: balance } = useGetTokenBalance();
  return {
    balance,
    isNearLimit: balance?.isNearLimit ?? false,
    isExhausted: balance?.isExhausted ?? false,
    tokensRemaining: balance?.tokensRemaining ?? null,
  };
}