// services/auth.ts
import axios from "axios";
import Cookies from "js-cookie";
import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function login(email: string, password: string) {
  try {
    const response = await axios.post(`${API_URL}/login/`, {
      email,
      password,
    },{
      headers: {'Content-Type':'application/json'}
    });

    const { access, refresh } = response.data;
    Cookies.set("accessToken", access, { expires: 1 / 48 }); // 30 min
    Cookies.set("refreshToken", refresh, { expires: 1 });    // 1 day
    return response.data;

    
  } catch (error: any) {
    // Verifica se o backend retornou uma mensagem de erro específica
    if (error.response && error.response.data) {
      const backendError = error.response.data.detail || "Erro desconhecido no login.";
      throw new Error(backendError);
    }
    throw new Error("Falha no login.");
  }
}

export async function checkAndRefreshToken() {
  const accessToken = Cookies.get('accessToken');
  const refreshToken = Cookies.get('refreshToken');

  if (!accessToken && refreshToken) {
    return refreshAccessToken();
  }

  if (accessToken) {
    const decoded = JSON.parse(atob(accessToken.split('.')[1]));
    const exp = decoded.exp * 1000;
    const now = Date.now();

    if (exp - now < 5 * 60 * 1000) {
      return refreshAccessToken();
    }
  }
}

export async function refreshAccessToken() {
    const refreshToken = Cookies.get("refreshToken");
    if (refreshToken) {
        const response = await axios.post(`${API_URL}/token/refresh/`, {  // Use crases aqui
            refresh: refreshToken,
        });
        Cookies.set("accessToken", response.data.access, { expires: 1 / 48 });
        return response.data.access;
    }
}

export async function register(name: string, email: string, password: string, adminPassword: string) {
  try {
    const response = await axios.post(`${API_URL}/register/`, { 
      name, 
      email, 
      password, 
      admin_password: adminPassword});
    return response;
  } catch (error: any) {
    // Verifica se há uma resposta de erro do backend
    if (error.response && error.response.data) {
      // Extrai a mensagem de erro do backend
      const backendError = error.response.data.email ? error.response.data.email[0] : "Erro de registro desconhecido.";
      throw new Error(backendError);
    }
    throw new Error("Registro falhou.");
  }
}