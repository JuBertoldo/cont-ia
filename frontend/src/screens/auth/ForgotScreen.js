import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { COLORS } from '../../constants/colors';
import { MESSAGES } from '../../constants/messages';
import { isValidEmail } from '../../utils/validators';
import { resetPassword } from '../../services/authService';
import { ROUTES } from '../../constants/routes';

export default function ForgotScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      Alert.alert('Atenção', 'Digite seu e-mail para receber o link.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      Alert.alert('Atenção', MESSAGES.INVALID_EMAIL);
      return;
    }

    setLoading(true);
    try {
      await resetPassword(cleanEmail);
    } catch {
      // Erros são silenciados propositalmente para não revelar se o e-mail existe
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={28} color={COLORS.PRIMARY} />
        </TouchableOpacity>

        {sent ? (
          /* ── Estado de sucesso ── */
          <View style={styles.successContainer}>
            <Ionicons
              name="mail-open-outline"
              size={80}
              color={COLORS.PRIMARY}
            />

            <Text style={styles.successTitle}>E-mail enviado!</Text>
            <Text style={styles.successSubtitle}>
              Enviamos um link de redefinição para{'\n'}
              <Text style={styles.successEmail}>{email}</Text>
            </Text>

            <Text style={styles.successHint}>
              Verifique também a pasta de spam caso não encontre na caixa de
              entrada.
            </Text>

            <TouchableOpacity
              style={styles.backToLoginBtn}
              onPress={() => navigation.replace(ROUTES.AUTH_HOME)}
            >
              <Ionicons name="log-in-outline" size={20} color={COLORS.BLACK} />
              <Text style={styles.backToLoginText}>VOLTAR AO LOGIN</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendBtn}
              onPress={() => setSent(false)}
            >
              <Text style={styles.resendText}>
                Não recebeu? Tentar novamente
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ── Formulário ── */
          <View style={styles.form}>
            <Text style={styles.title}>Recuperar Acesso</Text>
            <Text style={styles.subtitle}>
              Digite seu e-mail cadastrado e enviaremos um link para redefinir a
              senha.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Seu e-mail"
              placeholderTextColor={COLORS.GRAY}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={handleReset}
            />

            <TouchableOpacity
              style={styles.button}
              onPress={handleReset}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.BLACK} />
              ) : (
                <Text style={styles.buttonText}>ENVIAR LINK</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: { flex: 1, backgroundColor: COLORS.BLACK },
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.BLACK,
    padding: 30,
    justifyContent: 'center',
  },
  backBtn: { position: 'absolute', top: 50, left: 20, zIndex: 10 },

  // Formulário
  form: { marginTop: 60 },
  title: {
    color: COLORS.WHITE,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    color: COLORS.GRAY,
    fontSize: 15,
    marginBottom: 30,
    lineHeight: 22,
  },
  input: {
    backgroundColor: COLORS.DARK,
    color: COLORS.WHITE,
    padding: 18,
    borderRadius: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  button: {
    backgroundColor: COLORS.PRIMARY,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: COLORS.BLACK, fontWeight: 'bold', fontSize: 16 },

  // Sucesso
  successContainer: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 10,
  },
  successTitle: {
    color: COLORS.WHITE,
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
  },
  successSubtitle: {
    color: COLORS.GRAY,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  successEmail: { color: COLORS.WHITE, fontWeight: 'bold' },
  successHint: {
    color: '#555',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 36,
    lineHeight: 20,
  },
  backToLoginBtn: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  backToLoginText: { color: COLORS.BLACK, fontWeight: 'bold', fontSize: 16 },
  resendBtn: { paddingVertical: 12 },
  resendText: {
    color: COLORS.GRAY,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
