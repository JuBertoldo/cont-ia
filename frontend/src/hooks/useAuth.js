import { useState } from 'react';
import {
  loginWithEmail,
  registerWithEmail,
  resetPassword,
  logout as logoutService,
} from '../services/authService';
import logger from '../utils/logger';

export const useAuth = () => {
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const user = await loginWithEmail({ email, password });
      return user;
    } catch (error) {
      logger.error('useAuth login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    name,
    email,
    password,
    matricula,
    codigoEmpresa,
    nomeEmpresa,
  ) => {
    setLoading(true);
    try {
      const user = await registerWithEmail({
        name,
        email,
        password,
        matricula,
        codigoEmpresa,
        nomeEmpresa,
      });
      return user;
    } catch (error) {
      logger.error('useAuth register error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async email => {
    setLoading(true);
    try {
      await resetPassword(email);
    } catch (error) {
      logger.error('useAuth forgotPassword error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    setLoading(true);
    try {
      await logoutService();
    } catch (error) {
      logger.error('useAuth logout error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    login,
    register,
    forgotPassword,
    signOutUser,
  };
};
