import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { logout } from '../../services/authService';

export default function PendingApprovalScreen({ navigation }) {
  const handleLogout = async () => {
    try {
      await logout();
      navigation.replace(ROUTES.AUTH_HOME);
    } catch {
      Alert.alert('Erro', 'Não foi possível sair. Tente novamente.');
    }
  };

  return (
    <View style={styles.container}>
      <Ionicons name="time-outline" size={90} color={COLORS.PRIMARY} />

      <Text style={styles.title}>Aguardando aprovação</Text>

      <Text style={styles.description}>
        Seu cadastro foi recebido com sucesso.{'\n\n'}
        Um administrador irá revisar sua conta em breve.{'\n'}
        Você receberá acesso assim que for aprovado.
      </Text>

      <View style={styles.infoBox}>
        <Ionicons
          name="information-circle-outline"
          size={18}
          color={COLORS.PRIMARY}
        />
        <Text style={styles.infoText}>
          Entre em contato com o administrador caso precise de acesso urgente.
        </Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.RED} />
        <Text style={styles.logoutText}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    color: COLORS.WHITE,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    color: COLORS.GRAY,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.DARK,
    borderRadius: 12,
    padding: 14,
    marginBottom: 40,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.PRIMARY,
  },
  infoText: {
    color: COLORS.GRAY,
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
  },
  logoutText: { color: COLORS.RED, fontWeight: 'bold', fontSize: 15 },
});
