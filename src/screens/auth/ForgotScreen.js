import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { auth } from '../../config/firebaseConfig';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

export default function ForgotScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      Alert.alert("Atenção", "Digite seu e-mail para receber o link.");
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setSent(true);
      Alert.alert("E-mail enviado", "Verifique sua caixa de entrada para redefinir a senha.");
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        Alert.alert("Erro", "Este e-mail não está cadastrado.");
      } else if (err.code === 'auth/invalid-email') {
        Alert.alert("Erro", "O formato do e-mail é inválido.");
      } else {
        Alert.alert("Erro", "Erro ao processar solicitação. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={28} color="#00FF88" />
      </TouchableOpacity>

      <Text style={styles.title}>Recuperar Acesso</Text>
      <Text style={styles.subtitle}>Enviaremos um link para o seu e-mail corporativo.</Text>

      {sent ? (
        <View style={[styles.errorBox, { borderColor: '#00FF88', backgroundColor: 'rgba(0, 255, 136, 0.1)' }]}>
          <Text style={[styles.errorText, { color: '#00FF88' }]}>
            Link enviado com sucesso!
          </Text>
        </View>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="E-mail cadastrado"
        placeholderTextColor="#666"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          setSent(false);
        }}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading}>
        {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>ENVIAR LINK</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 30, justifyContent: 'center' },
  backBtn: { position: 'absolute', top: 50, left: 20 },
  title: { color: '#FFF', fontSize: 28, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { color: '#666', fontSize: 16, marginBottom: 30 },
  errorBox: { padding: 15, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: '#FF5252' },
  errorText: { color: '#FF5252', textAlign: 'center' },
  input: { backgroundColor: '#111', color: '#FFF', padding: 18, borderRadius: 12, marginBottom: 20 },
  button: { backgroundColor: '#00FF88', padding: 20, borderRadius: 15, alignItems: 'center' },
  buttonText: { color: '#000', fontWeight: 'bold' },
});