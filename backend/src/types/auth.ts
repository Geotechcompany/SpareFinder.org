export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  isAdminLogin?: boolean;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  company?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GoogleAuthRequest {
  access_token?: string;
  id_token?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface Profile {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  role: 'user' | 'admin' | 'super_admin';
  phone?: string;
  company?: string;
  bio?: string;
  location?: string;
  website?: string;
  preferences?: any;
  metadata?: any;
  created_at: string;
  updated_at: string;
} 