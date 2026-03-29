import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { ROUTES } from '../../constants/routes';
import { COLORS } from '../../constants/colors';
import { MESSAGES } from '../../constants/messages';
import { isValidEmail, isStrongPassword } from '../../utils/validators';
import { useAuth } from '../../hooks/useAuth';

export default function RegisterScreen({ navigation }) {
  const { loading, register } = useAuth();
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    const cleanName = nome.trim();
    const cleanEmail = email.trim();

    if (!cleanName || !cleanEmail || !password) {
      Alert.alert('Atenção', MESSAGES.REQUIRED_FIELDS);
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      Alert.alert('Atenção', MESSAGES.INVALID_EMAIL);
      return;
    }

    if (!isStrongPassword(password)) {
      Alert.alert('Atenção', MESSAGES.WEAK_PASSWORD);
      return;
    }

    try {
      await register(cleanName, cleanEmail, password);
      Alert.alert('Sucesso', 'Conta criada com sucesso.');
      navigation.replace(ROUTES.APP_DRAWER);
    } catch (error) {
      console.error('Erro no cadastro:', error);

      const code = error?.code;

      if (code === 'auth/email-already-in-use') {
        Alert.alert('Erro', MESSAGES.EMAIL_ALREADY_EXISTS);
      } else if (code === 'auth/invalid-email') {
        Alert.alert('Erro', MESSAGES.INVALID_EMAIL);
      } else if (code === 'auth/weak-password') {
        Alert.alert('Erro', MESSAGES.WEAK_PASSWORD);
      } else {
        Alert.alert('Erro', MESSAGES.GENERIC_ERROR);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { minHeight: height },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, isTablet && styles.contentTablet]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={28} color={COLORS.PRIMARY} />
            </TouchableOpacity>

            <Text style={[styles.logo, isTablet && styles.logoTablet]}>CONT.IA</Text>
            <Text style={[styles.subtitle, isTablet && styles.subtitleTablet]}>
              Crie sua conta de acesso
            </Text>
          </View>

          <View style={[styles.formCard, isTablet && styles.formCardTablet]}>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet]}
              placeholder="Nome Completo"
              placeholderTextColor={COLORS.GRAY}
              value={nome}
              onChangeText={setNome}
              autoCapitalize="words"
              autoCorrect={false}
            />

            <TextInput
              style={[styles.input, isTablet && styles.inputTablet]}
              placeholder="E-mail"
              placeholderTextColor={COLORS.GRAY}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={[styles.input, isTablet && styles.inputTablet]}
              placeholder="Senha (mín. 8, 1 número, 1 especial)"
              placeholderTextColor={COLORS.GRAY}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.button, isTablet && styles.buttonTablet]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.BLACK} />
              ) : (
                <Text style={styles.buttonText}>CADASTRAR</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity onPress={() => navigation.navigate(ROUTES.AUTH_HOME)}>
              <Text style={styles.footerText}>
                Já tem conta? <Text style={styles.footerLink}>Entrar</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    backgroundColor: COLORS.BLACK,
  },
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.BLACK,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  content: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  contentTablet: {
    maxWidth: 520,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 4,
    zIndex: 10,
  },
  logo: {
    color: COLORS.WHITE,
    fontSize: 42,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  logoTablet: {
    fontSize: 48,
  },
  subtitle: {
    marginTop: 8,
    color: COLORS.PRIMARY,
    fontSize: 14,
    textAlign: 'center',
  },
  subtitleTablet: {
    fontSize: 16,
  },
  formCard: {
    backgroundColor: '#0B0B0B',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  formCardTablet: {
    padding: 24,
    borderRadius: 24,
  },
  input: {
    backgroundColor: COLORS.DARK,
    color: COLORS.WHITE,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 14,
    fontSize: 16,
  },
  inputTablet: {
    paddingVertical: 18,
    fontSize: 17,
  },
  button: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 4,
  },
  buttonTablet: {
    paddingVertical: 18,
  },
  buttonText: {
    color: COLORS.BLACK,
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    color: COLORS.WHITE,
    fontSize: 14,
  },
  footerLink: {
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
  },
});