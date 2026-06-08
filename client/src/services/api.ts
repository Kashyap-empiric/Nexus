import axios from "axios";
import { supabase } from "@/lib/supabase";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api",
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
    if (error.response?.status === 401) {
      // Attempt token refresh via Supabase
      const { data, error: refreshError } = await supabase.auth.getSession();
      
      if (refreshError || !data.session) {
        window.location.href = "/login";
        return Promise.reject(error);
      }

      // Retry the original request with the new token
      error.config.headers.Authorization = `Bearer ${data.session.access_token}`;
      return axios.request(error.config);
    }
    return Promise.reject(error);
  }
);
