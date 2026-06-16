import axios from "axios";
import { supabase } from "@/shared/lib/supabase";
import { ENV } from "@/config/env";
import { toast } from "sonner";
import React from "react";
import { AlertTriangle } from "lucide-react";

export const api = axios.create({
  baseURL: ENV.API_URL,
});

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const { data, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError || !data.session) {
        await supabase.auth.signOut();
        return Promise.reject(error);
      }

      originalRequest.headers.Authorization = `Bearer ${data.session.access_token}`;
      return axios.request(originalRequest);
    }
    
    if (error.response?.status === 429) {
      toast.error(error.response.data?.error || "Too many requests. Please try again later.", {
        style: { backgroundColor: "#ef4444", color: "white", borderColor: "#ef4444" },
        icon: React.createElement(AlertTriangle, { color: "#fde047", size: 18 }),
        position: "top-right"
      });
    }

    return Promise.reject(error);
  }
);