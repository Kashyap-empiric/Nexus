"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/shared/lib/supabase";
import { api } from "@/shared/lib/api";
import { APP_ROUTES, API_ROUTES } from "@/config/url";
import type { LoginFormData, RegisterFormData } from "../schemas/auth";

export const useAuth = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveEmail = async (identifier: string): Promise<string> => {
    if (identifier.includes("@")) return identifier;
    try {
      const { data } = await api.post<{ email: string | null }>(API_ROUTES.USERS.RESOLVE_USERNAME, { username: identifier });
      return data.email || `${identifier}@nonexistent.local`;
    } catch {
      return `${identifier}@nonexistent.local`;
    }
  };

  const login = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const email = await resolveEmail(data.identifier);

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: data.password,
      });

      if (authError) throw authError;

      router.replace(APP_ROUTES.CONVERSATIONS.INDEX);
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
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}${APP_ROUTES.AUTH.CALLBACK}`,
        },
      });

      if (authError) {
        if (authError.message?.toLowerCase().includes('popup') || authError.message?.toLowerCase().includes('blocked')) {
          if (data?.url) {
            window.location.href = data.url;
            return;
          }
        }
        throw authError;
      }
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred during sign out.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return { login, register, loginWithGithub, logout, isLoading, error };
};
