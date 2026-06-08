import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { socket } from "@/lib/socket";
import { useChatStore } from "@/store/chatStore";
import type { LoginFormData, RegisterFormData } from "@/schemas/auth";

export const useAuth = () => {
// ... existing code, skipping lines to replace the uiStore clearAll call
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) throw authError;

      // On success, replace history with conversations page
      router.replace("/conversations");
    } catch (err: any) {
      setError(err.message || "An error occurred during login.");
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Sign up the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            username: data.username,
          },
        },
      });

      if (authError) throw authError;

      // If session is null, email confirmation is required before the user can log in
      if (!authData.session) {
        router.replace("/login?registered=true&confirm=true");
      } else {
        // Email confirmations are disabled — user is immediately signed in
        router.replace("/conversations");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during registration.");
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGithub = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) throw authError;
      // Browser will navigate away — reset loading so button isn't stuck
      // if the redirect is slow or blocked
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || "An error occurred during GitHub login.");
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signOut();
      if (authError) throw authError;
      
      queryClient.clear();
      socket.disconnect();
      useChatStore.getState().clearAll();
      
      router.replace("/login");
    } catch (err: any) {
      setError(err.message || "An error occurred during sign out.");
    } finally {
      setIsLoading(false);
    }
  };

  return { login, register, loginWithGithub, logout, isLoading, error };
};
