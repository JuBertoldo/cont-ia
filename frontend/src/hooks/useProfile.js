import { useCallback, useState } from 'react';
import { auth } from '../config/firebaseConfig';
import { getUserProfile } from '../services/authService';
import {
  updateProfileName,
  updateProfileBirthDate,
  updateProfilePhoto,
} from '../services/profileService';
import logger from '../utils/logger';

export const useProfile = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      if (!auth.currentUser) {
        return null;
      }

      const profile = await getUserProfile(auth.currentUser.uid);

      if (profile) {
        return {
          nome: profile.nome || auth.currentUser.displayName || '',
          email: profile.email || auth.currentUser.email || '',
          photoURL: profile.photoURL || auth.currentUser.photoURL || '',
          role: profile.role || 'user',
          birthDate: profile.birthDate || '',
        };
      }

      return {
        nome: auth.currentUser.displayName || '',
        email: auth.currentUser.email || '',
        photoURL: auth.currentUser.photoURL || '',
        role: 'user',
        birthDate: '',
      };
    } catch (error) {
      logger.error('useProfile loadProfile error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveName = async name => {
    setSaving(true);
    try {
      if (!auth.currentUser) throw new Error('Usuário não autenticado.');
      await updateProfileName(auth.currentUser.uid, name);
    } catch (error) {
      logger.error('useProfile saveName error:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const saveBirthDate = async birthDate => {
    setSaving(true);
    try {
      if (!auth.currentUser) throw new Error('Usuário não autenticado.');
      await updateProfileBirthDate(auth.currentUser.uid, birthDate);
    } catch (error) {
      logger.error('useProfile saveBirthDate error:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const savePhoto = async uri => {
    setSaving(true);
    try {
      if (!auth.currentUser) throw new Error('Usuário não autenticado.');
      const downloadURL = await updateProfilePhoto(auth.currentUser.uid, uri);
      return downloadURL;
    } catch (error) {
      logger.error('useProfile savePhoto error:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return {
    loading,
    saving,
    loadProfile,
    saveName,
    saveBirthDate,
    savePhoto,
  };
};
