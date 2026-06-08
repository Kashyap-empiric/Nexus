import axios from "axios";
import { supabase } from "@/shared/lib/supabase";
import { APP_ROUTES } from "@/shared/constants/app_routes";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
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
        await supabase.auth.signOut();
        return Promise.reject(error);
      }

      error.config.headers.Authorization = `Bearer ${data.session.access_token}`;
      return axios.request(error.config);
    }
    return Promise.reject(error);
  }
);