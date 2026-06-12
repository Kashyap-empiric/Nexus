"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/shared/lib/supabase";
import { APP_ROUTES } from "@/config/url";
import type { LoginFormData, RegisterFormData } from "../schemas/auth";

export const useAuth = () => {
  const router = useRouter();
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred during login.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);
    try {
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

      if (!authData.session) {
        router.replace(`${APP_ROUTES.AUTH.LOGIN}?registered=true&confirm=true`);
      } else {
        router.replace(APP_ROUTES.CONVERSATIONS.INDEX);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred during registration.";
      setError(message);
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
      setIsLoading(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred during GitHub login.";
      setError(message);
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signOut();
      if (authError) throw authError;
      // Note: Teardown and routing are now handled by AuthProvider's onAuthStateChange listener
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred during sign out.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return { login, register, loginWithGithub, logout, isLoading, error };
};
