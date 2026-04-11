import { useCallback, useEffect, useState } from 'react';
import { auth } from '../config/firebaseConfig';
import { getUserProfile } from '../services/authService';
import { ROLES } from '../constants/roles';

const DEFAULT_PROFILE = {
  nome: 'Operador',
  role: ROLES.USER,
  photoURL: '',
  empresaId: null,
};

/**
 * Hook centralizado para carregar o perfil do usuário autenticado.
 * Elimina a duplicação de getUserProfile + useState em múltiplas telas.
 */
export function useUserProfile() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      if (!auth.currentUser) return;
      const data = await getUserProfile(auth.currentUser.uid);
      if (data) {
        setProfile({
          nome: data.nome || DEFAULT_PROFILE.nome,
          role: data.role || DEFAULT_PROFILE.role,
          photoURL: data.photoURL || DEFAULT_PROFILE.photoURL,
          empresaId: data.empresaId || DEFAULT_PROFILE.empresaId,
        });
      }
    } catch (error) {
      console.error('useUserProfile: erro ao carregar perfil', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return { profile, loading, reloadProfile: loadProfile };
}
