/**
 * Testes unitários — ProfileScreen
 * Cobre: carregamento de perfil, edição de nome e validação de campo vazio.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../../config/firebaseConfig', () => ({
  auth: {
    currentUser: {
      uid: 'uid-123',
      displayName: 'Juliana',
      email: 'juliana@contia.com',
    },
    onAuthStateChanged: jest.fn(cb => {
      cb({ uid: 'uid-123' });
      return jest.fn();
    }),
  },
  storage: {},
  db: {},
}));

jest.mock('../../../services/authService', () => ({
  getUserProfile: jest.fn(() =>
    Promise.resolve({
      nome: 'Juliana',
      email: 'juliana@contia.com',
      role: 'user',
      matricula: '12345',
      photoURL: '',
      pushAtivo: false,
    }),
  ),
}));

jest.mock('../../../services/profileService', () => ({
  updateProfileName: jest.fn(() => Promise.resolve()),
  updateProfilePhoto: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../services/empresaService', () => ({
  getEmpresaById: jest.fn(() => Promise.resolve({ nome: 'Empresa Teste' })),
}));

jest.mock('../../../services/notificationService', () => ({
  ativarPushNotifications: jest.fn(() => Promise.resolve()),
  desativarPushNotifications: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../services/deletionService', () => ({
  requestAccountDeletion: jest.fn(() => Promise.resolve({ success: true })),
}));

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

import ProfileScreen from '../ProfileScreen';
import { updateProfileName } from '../../../services/profileService';

// ── Testes ───────────────────────────────────────────────────────────────────

describe('ProfileScreen', () => {
  const navigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renderiza sem lançar exceções', () => {
    expect(() =>
      render(<ProfileScreen navigation={navigation} />),
    ).not.toThrow();
  });

  it('exibe nome do usuário após carregamento', async () => {
    const { getByDisplayValue } = render(
      <ProfileScreen navigation={navigation} />,
    );
    await waitFor(() => expect(getByDisplayValue('Juliana')).toBeTruthy(), {
      timeout: 3000,
    });
  });

  it('chama updateProfileName ao pressionar SALVAR NOME', async () => {
    const { getByDisplayValue, getByText } = render(
      <ProfileScreen navigation={navigation} />,
    );

    await waitFor(() => getByDisplayValue('Juliana'), { timeout: 3000 });
    fireEvent.changeText(getByDisplayValue('Juliana'), 'Juliana Bertoldo');
    fireEvent.press(getByText('SALVAR NOME'));

    await waitFor(
      () =>
        expect(updateProfileName).toHaveBeenCalledWith(
          'uid-123',
          'Juliana Bertoldo',
        ),
      { timeout: 3000 },
    );
  });

  it('exibe alerta se nome estiver vazio', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByDisplayValue, getByText } = render(
      <ProfileScreen navigation={navigation} />,
    );

    await waitFor(() => getByDisplayValue('Juliana'), { timeout: 3000 });
    fireEvent.changeText(getByDisplayValue('Juliana'), '');
    fireEvent.press(getByText('SALVAR NOME'));

    expect(alertSpy).toHaveBeenCalledWith('Atenção', 'Digite um nome válido.');
  });

  it('updateProfileName NÃO é chamado quando nome está vazio', async () => {
    const { getByDisplayValue, getByText } = render(
      <ProfileScreen navigation={navigation} />,
    );

    await waitFor(() => getByDisplayValue('Juliana'), { timeout: 3000 });
    fireEvent.changeText(getByDisplayValue('Juliana'), '');
    fireEvent.press(getByText('SALVAR NOME'));

    expect(updateProfileName).not.toHaveBeenCalled();
  });
});
