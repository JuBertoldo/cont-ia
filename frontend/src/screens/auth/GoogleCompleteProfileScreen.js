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
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { signInWithGoogle } from '../../services/googleAuthService';
import { getUserStatus } from '../../services/authService';

// Recebe `googleSession` com o idToken pendente para reprocessar
export default function GoogleCompleteProfileScreen({ navigation, _route }) {
  const [codigoEmpresa, setCodigoEmpresa] = useState('');
  const [matricula, setMatricula] = useState('');
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!codigoEmpresa.trim()) {
      Alert.alert(
        'Atenção',
        'Digite o código da empresa fornecido pelo administrador.',
      );
      return;
    }

    setLoading(true);
    try {
      const { user, status } = await signInWithGoogle({
        codigoEmpresa,
        matricula,
      });

      const resolvedStatus = status || (await getUserStatus(user.uid));

      if (resolvedStatus === 'active') {
        navigation.replace(ROUTES.APP_DRAWER);
      } else {
        navigation.replace(ROUTES.PENDING_APPROVAL);
      }
    } catch (error) {
      const code = error?.code;
      if (code === 'auth/codigo-invalido') {
        Alert.alert(
          'Erro',
          'Código de empresa inválido. Verifique com o administrador.',
        );
      } else {
        Alert.alert(
          'Erro',
          error?.message || 'Não foi possível completar o cadastro.',
        );
      }
    } finally {
      setLoading(false);
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
        <View style={styles.iconBox}>
          <Ionicons name="business-outline" size={60} color={COLORS.PRIMARY} />
        </View>

        <Text style={styles.title}>Completar Cadastro</Text>
        <Text style={styles.subtitle}>
          Para finalizar, informe o código da empresa e sua matrícula.
        </Text>

        <View style={styles.formCard}>
          <TextInput
            style={styles.input}
            placeholder="Código da empresa"
            placeholderTextColor={COLORS.GRAY}
            value={codigoEmpresa}
            onChangeText={setCodigoEmpresa}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Matrícula (opcional)"
            placeholderTextColor={COLORS.GRAY}
            value={matricula}
            onChangeText={setMatricula}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleComplete}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.BLACK} />
            ) : (
              <Text style={styles.buttonText}>CONCLUIR CADASTRO</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: { flex: 1, backgroundColor: COLORS.BLACK },
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.BLACK,
    justifyContent: 'center',
    padding: 28,
  },
  iconBox: { alignItems: 'center', marginBottom: 20 },
  title: {
    color: COLORS.WHITE,
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    color: COLORS.GRAY,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  formCard: {
    backgroundColor: '#0B0B0B',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1A1A1A',
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
  button: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 4,
  },
  buttonText: { color: COLORS.BLACK, fontSize: 16, fontWeight: 'bold' },
});
