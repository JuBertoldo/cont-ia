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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { isValidEmail } from '../../utils/validators';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../config/firebaseConfig';
import { consumeSupportInvite } from '../../services/supportService';

export default function SupportRegisterScreen() {
  const navigation = useNavigation();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!nome.trim() || !email.trim() || !password) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }
    if (!isValidEmail(email.trim())) {
      Alert.alert('Atenção', 'E-mail inválido.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Atenção', 'A senha precisa ter ao menos 6 caracteres.');
      return;
    }

    setLoading(true);
    let userCredential = null;

    try {
      // 1. Cria conta no Firebase Auth
      userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password,
      );
      const uid = userCredential.user.uid;

      // 2. Valida e consome o convite
      const invite = await consumeSupportInvite(email.trim());

      // 3. Cria perfil no Firestore com role=support e status=active
      await setDoc(doc(db, 'usuarios', uid), {
        uid,
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        role: 'support',
        status: 'active',
        empresaId: null,
        convidadoPor: invite.createdBy ?? '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      Alert.alert(
        'Bem-vindo!',
        'Cadastro realizado. Você já pode entrar com suas credenciais.',
        [{ text: 'OK', onPress: () => navigation.replace(ROUTES.AUTH_HOME) }],
      );
    } catch (error) {
      // Se o convite falhou após criar a conta, desfaz a conta do Firebase Auth
      if (userCredential?.user) {
        try {
          await deleteUser(userCredential.user);
        } catch (_) {}
      }

      const msg =
        error?.code === 'auth/email-already-in-use'
          ? 'Este e-mail já possui uma conta.'
          : error?.message || 'Erro ao criar conta. Tente novamente.';

      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.PRIMARY} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons
                name="shield-checkmark-outline"
                size={36}
                color={COLORS.PRIMARY}
              />
            </View>
            <Text style={styles.title}>Acesso Técnico</Text>
            <Text style={styles.subtitle}>
              Exclusivo para equipe de suporte Cont.IA.{'\n'}É necessário
              convite prévio.
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Nome completo"
              placeholderTextColor={COLORS.GRAY}
              value={nome}
              onChangeText={setNome}
              autoCapitalize="words"
            />
            <TextInput
              style={styles.input}
              placeholder="E-mail do convite"
              placeholderTextColor={COLORS.GRAY}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Crie uma senha"
                placeholderTextColor={COLORS.GRAY}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(p => !p)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={COLORS.GRAY}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && { opacity: 0.6 }]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.BLACK} />
              ) : (
                <Text style={styles.btnText}>Criar conta</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.notice}>
            Se o seu e-mail não tiver convite registrado, o acesso será negado.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.BLACK },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  backBtn: { marginBottom: 20 },
  header: { alignItems: 'center', marginBottom: 32 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0f1f0f',
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    color: COLORS.WHITE,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.GRAY,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    backgroundColor: '#0D0D0D',
    borderRadius: 20,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  input: {
    backgroundColor: '#1A1A1A',
    color: COLORS.WHITE,
    padding: 16,
    borderRadius: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  passwordRow: {
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
    padding: 16,
    fontSize: 15,
  },
  eyeBtn: { paddingHorizontal: 14 },
  btn: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnText: { color: COLORS.BLACK, fontWeight: 'bold', fontSize: 16 },
  notice: {
    color: '#333',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
});
