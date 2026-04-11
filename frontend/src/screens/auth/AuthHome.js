import React, { useEffect, useState } from 'react';
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
  Keyboard,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { ROUTES } from '../../constants/routes';
import { COLORS } from '../../constants/colors';
import { MESSAGES } from '../../constants/messages';
import { isValidEmail } from '../../utils/validators';
import logger from '../../utils/logger';
import { useAuth } from '../../hooks/useAuth';
import { getUserStatus, logout } from '../../services/authService';
import {
  getRememberEmailData,
  saveRememberEmailData,
  updateSavedEmail,
} from '../../services/rememberEmailService';

export default function AuthHome() {
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;

  const { loading, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);

  useEffect(() => {
    loadRememberedEmail();
  }, []);

  const loadRememberedEmail = async () => {
    const data = await getRememberEmailData();

    setRememberEmail(data.rememberEmail);
    if (data.rememberEmail && data.email) {
      setEmail(data.email);
    }
  };

  const handleToggleRemember = async () => {
    const newValue = !rememberEmail;
    setRememberEmail(newValue);

    await saveRememberEmailData({
      rememberEmail: newValue,
      email,
    });
  };

  const handleEmailChange = async value => {
    setEmail(value);

    if (rememberEmail) {
      await updateSavedEmail(value);
    }
  };

  const handleLogin = async () => {
    Keyboard.dismiss();

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      Alert.alert('Atenção', MESSAGES.REQUIRED_FIELDS);
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      Alert.alert('Atenção', MESSAGES.INVALID_EMAIL);
      return;
    }

    try {
      await saveRememberEmailData({
        rememberEmail,
        email: cleanEmail,
      });

      const user = await login(cleanEmail, password);

      if (!rememberEmail) setEmail('');
      setPassword('');

      // Verifica status da conta antes de liberar o acesso
      const status = await getUserStatus(user.uid);

      if (status === 'rejected') {
        await logout();
        Alert.alert(
          'Acesso negado',
          'Sua conta foi recusada. Entre em contato com o administrador.',
        );
        return;
      }

      if (status === 'pending') {
        navigation.replace(ROUTES.PENDING_APPROVAL);
        return;
      }

      navigation.replace(ROUTES.APP_DRAWER);
    } catch (error) {
      logger.error('Erro no login:', error);

      const code = error?.code;

      if (code === 'auth/user-not-found') {
        Alert.alert('Erro', MESSAGES.EMAIL_NOT_FOUND);
      } else if (
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential'
      ) {
        Alert.alert('Erro', MESSAGES.WRONG_PASSWORD);
      } else if (code === 'auth/invalid-email') {
        Alert.alert('Erro', MESSAGES.INVALID_EMAIL);
      } else {
        Alert.alert('Erro', MESSAGES.GENERIC_ERROR);
      }

      setPassword('');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { minHeight: height, paddingBottom: 28 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, isTablet && styles.contentTablet]}>
          <View style={styles.header}>
            <Text style={[styles.logo, isTablet && styles.logoTablet]}>
              CONT.IA
            </Text>
            <Text style={[styles.subtitle, isTablet && styles.subtitleTablet]}>
              Inteligência que conta.
            </Text>
          </View>

          <View style={[styles.formCard, isTablet && styles.formCardTablet]}>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet]}
              placeholder="E-mail"
              placeholderTextColor={COLORS.GRAY}
              value={email}
              onChangeText={handleEmailChange}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              returnKeyType="next"
            />

            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={handleToggleRemember}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={rememberEmail ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={COLORS.PRIMARY}
                />
                <Text style={styles.checkboxText}>Lembrar e-mail</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.passwordInput, isTablet && styles.inputTablet]}
                placeholder="Senha"
                placeholderTextColor={COLORS.GRAY}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />

              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(prev => !prev)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={COLORS.GRAY}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, isTablet && styles.loginBtnTablet]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.BLACK} />
              ) : (
                <Text style={styles.loginBtnText}>ENTRAR</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate(ROUTES.FORGOT)}
            >
              <Text style={styles.forgotText}>Esqueceu a senha?</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              onPress={() => navigation.navigate(ROUTES.REGISTER)}
            >
              <Text style={styles.footerText}>
                Não tem conta?{' '}
                <Text style={styles.footerLink}>Cadastre-se</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.privacyBtn}
              onPress={() => navigation.navigate(ROUTES.PRIVACY_POLICY)}
            >
              <Text style={styles.privacyText}>
                Política de Privacidade e Termos de Uso
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
  checkboxRow: {
    marginBottom: 12,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxText: {
    color: COLORS.GRAY,
    fontSize: 14,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.DARK,
    borderRadius: 12,
    marginBottom: 14,
  },
  passwordInput: {
    flex: 1,
    color: COLORS.WHITE,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    marginBottom: 0,
  },
  eyeBtn: {
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  loginBtn: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 4,
  },
  loginBtnTablet: {
    paddingVertical: 18,
  },
  loginBtnText: {
    color: COLORS.BLACK,
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotText: {
    color: COLORS.GRAY,
    textAlign: 'right',
    marginTop: 14,
    fontSize: 14,
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
  privacyBtn: {
    marginTop: 16,
    paddingVertical: 8,
  },
  privacyText: {
    color: '#444',
    fontSize: 12,
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#222',
  },
  dividerText: {
    color: COLORS.GRAY,
    fontSize: 13,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  googleBtnText: {
    color: COLORS.WHITE,
    fontSize: 15,
    fontWeight: '600',
  },
});
