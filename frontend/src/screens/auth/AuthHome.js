import React, { useEffect, useRef, useState } from 'react';
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
  Keyboard,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { ROUTES } from '../../constants/routes';
import { COLORS } from '../../constants/colors';
import { MESSAGES } from '../../constants/messages';
import { isValidEmail } from '../../utils/validators';
import logger from '../../utils/logger';
import { useAuth } from '../../hooks/useAuth';
import {
  getUserStatus,
  logout,
  logLoginAudit,
} from '../../services/authService';
import {
  checkLoginBlock,
  recordFailedAttempt,
  clearLoginAttempts,
  MAX_LOGIN_ATTEMPTS,
} from '../../services/loginAttemptService';
import {
  getRememberEmailData,
  saveRememberEmailData,
} from '../../services/rememberEmailService';

export default function AuthHome() {
  const navigation = useNavigation();

  const { loading, login } = useAuth();
  const lastTapRef = useRef(0);

  const handleLogoDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      navigation.navigate(ROUTES.SUPPORT_REGISTER);
    }
    lastTapRef.current = now;
  };

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

  const handleEmailChange = value => {
    setEmail(value);
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

    const { blocked, remainingMinutes } = await checkLoginBlock(cleanEmail);
    if (blocked) {
      Alert.alert(
        'Acesso bloqueado',
        `Conta bloqueada após ${MAX_LOGIN_ATTEMPTS} tentativas falhas. Tente novamente em ${remainingMinutes} minuto(s).`,
      );
      return;
    }

    try {
      const user = await login(cleanEmail, password);

      await clearLoginAttempts(cleanEmail);

      await saveRememberEmailData({ rememberEmail, email: cleanEmail });

      if (!rememberEmail) setEmail('');
      setPassword('');

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

      logLoginAudit(user.uid, true);
      navigation.replace(ROUTES.APP_DRAWER);
    } catch (error) {
      logger.error('Erro no login:', error);

      const code = error?.code;

      const { count, blocked: nowBlocked } = await recordFailedAttempt(
        cleanEmail,
      );

      if (nowBlocked) {
        Alert.alert(
          'Acesso bloqueado',
          `Conta bloqueada após ${MAX_LOGIN_ATTEMPTS} tentativas falhas. Tente novamente em 15 minuto(s).`,
        );
      } else if (
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential'
      ) {
        const remaining = MAX_LOGIN_ATTEMPTS - count;
        const suffix =
          remaining > 0 ? ` (${remaining} tentativa(s) restante(s))` : '';
        Alert.alert('Erro', MESSAGES.INVALID_CREDENTIALS + suffix);
      } else if (code === 'auth/invalid-email') {
        Alert.alert('Erro', MESSAGES.INVALID_EMAIL);
      } else {
        Alert.alert('Erro', MESSAGES.GENERIC_ERROR);
      }

      setPassword('');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.BLACK} />
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Logo — duplo toque abre cadastro de suporte técnico ── */}
          <TouchableOpacity
            style={styles.header}
            onPress={handleLogoDoubleTap}
            activeOpacity={1}
          >
            <Text style={styles.logo}>CONT.IA</Text>
            <Text style={styles.subtitle}>Inteligência que conta.</Text>
          </TouchableOpacity>

          {/* ── Formulário ── */}
          <View style={styles.formCard}>
            <TextInput
              style={styles.input}
              placeholder="E-mail"
              placeholderTextColor={COLORS.GRAY}
              value={email}
              onChangeText={handleEmailChange}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              returnKeyType="next"
            />

            <TouchableOpacity
              style={styles.checkboxRow}
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

            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
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
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
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
              style={styles.forgotBtn}
              onPress={() => navigation.navigate(ROUTES.FORGOT)}
            >
              <Text style={styles.forgotText}>Esqueceu a senha?</Text>
            </TouchableOpacity>
          </View>

          {/* ── Footer ── */}
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.BLACK,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },

  // ── Logo ──
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    color: COLORS.WHITE,
    fontSize: 44,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  subtitle: {
    marginTop: 8,
    color: COLORS.PRIMARY,
    fontSize: 15,
    letterSpacing: 0.5,
  },

  // ── Form ──
  formCard: {
    backgroundColor: '#0D0D0D',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    gap: 12,
  },
  input: {
    backgroundColor: '#1A1A1A',
    color: COLORS.WHITE,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  checkboxText: {
    color: COLORS.GRAY,
    fontSize: 14,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  passwordInput: {
    flex: 1,
    color: COLORS.WHITE,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  loginBtn: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 17,
    marginTop: 4,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: COLORS.BLACK,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  forgotBtn: {
    alignItems: 'flex-end',
    paddingTop: 4,
  },
  forgotText: {
    color: COLORS.GRAY,
    fontSize: 13,
  },

  // ── Footer ──
  footer: {
    alignItems: 'center',
    marginTop: 36,
    gap: 12,
  },
  footerText: {
    color: COLORS.GRAY,
    fontSize: 14,
  },
  footerLink: {
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
  },
  privacyBtn: {
    paddingVertical: 4,
  },
  privacyText: {
    color: '#3A3A3A',
    fontSize: 11,
    textAlign: 'center',
  },
});
