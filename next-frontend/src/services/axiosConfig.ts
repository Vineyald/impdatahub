// services/axiosConfig.ts

import axios from "axios";
import Cookies from "js-cookie";
import { refreshAccessToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const newAccessToken = await refreshAccessToken();
      if (newAccessToken) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        Cookies.set("accessToken", newAccessToken, { expires: 1 / 48 });
        return api(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
