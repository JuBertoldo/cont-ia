import { useState } from 'react';
import { auth } from '../config/firebaseConfig';
import { processScan } from '../services/scannerService';
import logger from '../utils/logger';

export const useScanner = () => {
  const [loading, setLoading] = useState(false);

  const scan = async imageUri => {
    setLoading(true);
    try {
      if (!auth.currentUser) {
        throw new Error('Usuário não autenticado.');
      }

      if (!imageUri) {
        throw new Error('Imagem inválida.');
      }

      return await processScan({
        imageUri,
        usuarioId: auth.currentUser.uid,
        usuarioNome: auth.currentUser.displayName || 'Operador',
        usuarioRole: 'user',
      });
    } catch (error) {
      logger.error('useScanner scan error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { loading, scan };
};
