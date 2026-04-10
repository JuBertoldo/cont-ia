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
import Ionicons from 'react-native-vector-icons/Ionicons';

import { ROUTES } from '../../constants/routes';
import { COLORS } from '../../constants/colors';
import { MESSAGES } from '../../constants/messages';
import { isValidEmail, isStrongPassword } from '../../utils/validators';
import { useAuth } from '../../hooks/useAuth';

export default function RegisterScreen({ navigation }) {
  const { loading, register } = useAuth();
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;

  // null = não escolheu ainda | false = nova empresa | true = já tem empresa
  const [temEmpresa, setTemEmpresa] = useState(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [matricula, setMatricula] = useState('');
  const [codigoEmpresa, setCodigoEmpresa] = useState('');
  const [nomeEmpresa, setNomeEmpresa] = useState('');

  const handleRegister = async () => {
    const cleanName = nome.trim();
    const cleanEmail = email.trim();
    const cleanMatricula = matricula.trim();

    if (!cleanName || !cleanEmail || !password || !cleanMatricula) {
      Alert.alert('Atenção', MESSAGES.REQUIRED_FIELDS);
      return;
    }

    if (temEmpresa === false && !nomeEmpresa.trim()) {
      Alert.alert('Atenção', 'Digite o nome da sua empresa.');
      return;
    }

    if (temEmpresa === true && !codigoEmpresa.trim()) {
      Alert.alert(
        'Atenção',
        'Digite o código da empresa fornecido pelo administrador.',
      );
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
      await register(
        cleanName,
        cleanEmail,
        password,
        cleanMatricula,
        temEmpresa ? codigoEmpresa : '',
        temEmpresa ? '' : nomeEmpresa,
      );

      if (!temEmpresa) {
        Alert.alert(
          'Empresa criada!',
          'Sua conta de administrador foi criada com sucesso.',
        );
        navigation.replace(ROUTES.APP_DRAWER);
      } else {
        Alert.alert(
          'Cadastro enviado',
          'Sua conta foi criada e está aguardando aprovação do administrador.',
          [
            {
              text: 'OK',
              onPress: () => navigation.replace(ROUTES.PENDING_APPROVAL),
            },
          ],
        );
      }
    } catch (error) {
      const code = error?.code;
      if (code === 'auth/matricula-already-in-use') {
        Alert.alert('Erro', 'Esta matrícula já está cadastrada nesta empresa.');
      } else if (code === 'auth/codigo-invalido') {
        Alert.alert(
          'Erro',
          'Código de empresa inválido. Verifique com o administrador.',
        );
      } else if (code === 'auth/codigo-required') {
        Alert.alert('Erro', 'Digite o código da empresa.');
      } else if (code === 'auth/empresa-required') {
        Alert.alert('Erro', 'Digite o nome da sua empresa.');
      } else if (code === 'auth/email-already-in-use') {
        Alert.alert('Erro', MESSAGES.EMAIL_ALREADY_EXISTS);
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
        contentContainerStyle={[styles.container, { minHeight: height }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, isTablet && styles.contentTablet]}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={28} color={COLORS.PRIMARY} />
            </TouchableOpacity>
            <Text style={[styles.logo, isTablet && styles.logoTablet]}>
              CONT.IA
            </Text>
            <Text style={[styles.subtitle, isTablet && styles.subtitleTablet]}>
              Inteligência que conta.
            </Text>
          </View>

          {/* Pergunta inicial */}
          {temEmpresa === null && (
            <View style={styles.questionCard}>
              <Ionicons
                name="business-outline"
                size={40}
                color={COLORS.PRIMARY}
                style={{ alignSelf: 'center', marginBottom: 16 }}
              />
              <Text style={styles.questionTitle}>
                Sua empresa já usa o Cont.IA?
              </Text>
              <Text style={styles.questionSubtitle}>
                Isso determina se você vai criar uma empresa nova ou entrar em
                uma existente.
              </Text>

              <TouchableOpacity
                style={styles.optionBtn}
                onPress={() => setTemEmpresa(false)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={22}
                  color={COLORS.BLACK}
                />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>
                    Não, quero criar minha empresa.
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionBtn, styles.optionBtnSecondary]}
                onPress={() => setTemEmpresa(true)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="people-outline"
                  size={22}
                  color={COLORS.PRIMARY}
                />
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, { color: COLORS.PRIMARY }]}>
                    Sim, tenho um código.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Formulário */}
          {temEmpresa !== null && (
            <View style={[styles.formCard, isTablet && styles.formCardTablet]}>
              {/* Voltar para a pergunta */}
              <TouchableOpacity
                onPress={() => setTemEmpresa(null)}
                style={styles.changeOption}
              >
                <Ionicons
                  name="arrow-back-outline"
                  size={16}
                  color={COLORS.GRAY}
                />
                <Text style={styles.changeOptionText}>
                  {temEmpresa
                    ? 'Entrar em empresa existente'
                    : 'Criar nova empresa'}
                </Text>
              </TouchableOpacity>

              {/* Nova empresa */}
              {!temEmpresa && (
                <>
                  <Text style={styles.sectionLabel}>Nome da empresa</Text>
                  <TextInput
                    style={[styles.input, isTablet && styles.inputTablet]}
                    placeholder="Ex: Metalúrgica Santos"
                    placeholderTextColor={COLORS.GRAY}
                    value={nomeEmpresa}
                    onChangeText={setNomeEmpresa}
                    autoCapitalize="words"
                  />
                  <View style={styles.divider} />
                </>
              )}

              {/* Código de empresa existente */}
              {temEmpresa && (
                <>
                  <Text style={styles.sectionLabel}>Código da empresa</Text>
                  <TextInput
                    style={[styles.input, isTablet && styles.inputTablet]}
                    placeholder="Ex: X7K2PQ"
                    placeholderTextColor={COLORS.GRAY}
                    value={codigoEmpresa}
                    onChangeText={setCodigoEmpresa}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                  <View style={styles.divider} />
                </>
              )}

              <TextInput
                style={[styles.input, isTablet && styles.inputTablet]}
                placeholder="Matrícula do funcionário"
                placeholderTextColor={COLORS.GRAY}
                value={matricula}
                onChangeText={setMatricula}
                autoCapitalize="characters"
                autoCorrect={false}
              />

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
                  <Text style={styles.buttonText}>
                    {!temEmpresa ? 'CRIAR EMPRESA E CONTA' : 'CADASTRAR'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              onPress={() => navigation.navigate(ROUTES.AUTH_HOME)}
            >
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
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.BLACK,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoid: { flex: 1, backgroundColor: COLORS.BLACK },
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.BLACK,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  content: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  contentTablet: { maxWidth: 520 },
  header: { alignItems: 'center', marginBottom: 24, position: 'relative' },
  backBtn: { position: 'absolute', left: 0, top: 0, padding: 4, zIndex: 10 },
  logo: {
    color: COLORS.WHITE,
    fontSize: 42,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  logoTablet: { fontSize: 48 },
  subtitle: {
    marginTop: 8,
    color: COLORS.PRIMARY,
    fontSize: 14,
    textAlign: 'center',
  },
  subtitleTablet: { fontSize: 16 },

  // Pergunta inicial
  questionCard: {
    backgroundColor: '#0B0B0B',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    marginBottom: 16,
  },
  questionTitle: {
    color: COLORS.WHITE,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  questionSubtitle: {
    color: COLORS.GRAY,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  optionBtn: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  optionBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
  optionText: { flex: 1 },
  optionTitle: { color: COLORS.BLACK, fontWeight: 'bold', fontSize: 15 },
  optionDesc: { color: '#1a1a1a', fontSize: 12, marginTop: 2 },

  // Formulário
  formCard: {
    backgroundColor: '#0B0B0B',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  formCardTablet: { padding: 24, borderRadius: 24 },
  changeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  changeOptionText: { color: COLORS.GRAY, fontSize: 13 },
  sectionLabel: {
    color: COLORS.GRAY,
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  divider: { height: 1, backgroundColor: '#222', marginVertical: 12 },
  input: {
    backgroundColor: COLORS.DARK,
    color: COLORS.WHITE,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 14,
    fontSize: 16,
  },
  inputTablet: { paddingVertical: 18, fontSize: 17 },
  button: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 4,
  },
  buttonTablet: { paddingVertical: 18 },
  buttonText: { color: COLORS.BLACK, fontSize: 16, fontWeight: 'bold' },
  footer: { alignItems: 'center', marginTop: 24 },
  footerText: { color: COLORS.WHITE, fontSize: 14 },
  footerLink: { color: COLORS.PRIMARY, fontWeight: 'bold' },
});
