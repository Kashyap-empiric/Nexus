import axios from "axios";
import { supabase } from "@/lib/supabase";
import { APP_ROUTES } from "@/constants/app_routes";

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
      const { data, error: refreshError } = await supabase.auth.getSession();

      if (refreshError || !data.session) {
        window.location.href = APP_ROUTES.AUTH.LOGIN;
        return Promise.reject(error);
      }

      error.config.headers.Authorization = `Bearer ${data.session.access_token}`;
      return axios.request(error.config);
    }
    return Promise.reject(error);
  }
);