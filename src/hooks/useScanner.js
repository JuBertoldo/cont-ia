import { useState } from 'react';
import { auth } from '../config/firebaseConfig';
import { analyzeImageWithScannerPipeline } from '../services/scannerService';
import { uploadImage } from '../services/storageService';
import { createInventoryItem } from '../services/inventoryService';

export const useScanner = () => {
  const [loading, setLoading] = useState(false);

  const generateScanId = () => {
    if (!auth.currentUser) throw new Error('Usuário não autenticado.');
    return `scan_${auth.currentUser.uid}_${Date.now()}`;
  };

  const processScan = async (photoData) => {
    setLoading(true);
    try {
      if (!auth.currentUser) {
        throw new Error('Usuário não autenticado.');
      }

      if (!photoData?.base64 || !photoData?.uri) {
        throw new Error('Imagem inválida.');
      }

      const scanId = generateScanId();

      const aiResult = await analyzeImageWithScannerPipeline(photoData.base64);

      const fileName = `${scanId}.jpg`;
      const photoUrl = await uploadImage({
        uri: photoData.uri,
        path: `inventario/${auth.currentUser.uid}/${fileName}`,
      });

      const payload = {
        scanId,
        item: aiResult.item || 'não identificado',
        classificacao: aiResult.classificacao || 'indefinido',
        quantidade: aiResult.quantidade ?? 0,
        repetidos: aiResult.repetidos ?? 0,
        descricao: aiResult.descricao || '',
        fotoUrl: photoUrl,
        fotoNome: fileName,
        usuarioId: auth.currentUser.uid,
        usuarioNome: auth.currentUser.displayName || 'Operador',
        usuarioRole: 'user',
        local: aiResult.local || '',
        origem: 'scanner',
      };

      const inventoryId = await createInventoryItem(payload);

      return {
        id: inventoryId,
        ...payload,
      };
    } catch (error) {
      console.error('useScanner processScan error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    processScan,
  };
};