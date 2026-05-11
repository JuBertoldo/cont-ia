/**
 * Hook de inicialização do ScannerScreen.
 *
 * Responsabilidade: carregar dados de sessão (perfil do usuário + localização GPS)
 * que o ScannerScreen precisa mas que não são lógica de UI.
 * Extraído de ScannerScreen.js para manter a tela focada em renderização.
 *
 * @returns {{
 *   empresaId: string | null,
 *   usuarioRole: string,
 *   location: object | null,
 *   locationName: string,
 *   gpsLoading: boolean,
 *   fetchLocation: () => Promise<void>,
 * }}
 */
import { useEffect, useState } from 'react';
import { auth } from '../config/firebaseConfig';
import { getUserProfile } from '../services/authService';
import { getLocation } from '../services/geocoding';
import { ROLES } from '../constants/roles';

export function useScannerScreen() {
  const [empresaId, setEmpresaId] = useState(null);
  const [usuarioRole, setUsuarioRole] = useState(ROLES.USER);
  const [location, setLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);

  const fetchLocation = async () => {
    setGpsLoading(true);
    setLocationName('');
    const coords = await getLocation();
    setLocation(coords);
    if (coords) {
      try {
        const { getAddressFromCoords } = require('../services/geocoding');
        const name = await getAddressFromCoords(
          coords.latitude,
          coords.longitude,
        );
        setLocationName(name || '');
      } catch {
        setLocationName('');
      }
    }
    setGpsLoading(false);
  };

  useEffect(() => {
    // Carrega perfil do usuário para obter empresaId e role
    const loadProfile = async () => {
      if (!auth.currentUser) return;
      const profile = await getUserProfile(auth.currentUser.uid);
      setEmpresaId(profile?.empresaId || null);
      setUsuarioRole(profile?.role || ROLES.USER);
    };

    fetchLocation();
    loadProfile();
  }, []);

  return {
    empresaId,
    usuarioRole,
    location,
    locationName,
    gpsLoading,
    fetchLocation,
  };
}
