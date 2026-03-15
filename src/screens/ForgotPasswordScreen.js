import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Firebase
import { auth } from '../config/firebaseConfig';
import { sendPasswordResetEmail } from 'firebase/auth';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = () => {
    if (!email) {
      Alert.alert('Aviso', 'Por favor, digite seu e-mail.');
      return;
    }

    setLoading(true);
    sendPasswordResetEmail(auth, email)
      .then(() => {
        Alert.alert('Sucesso', 'Link de recuperação enviado para o seu e-mail!');
        navigation.goBack();
      })
      .catch(() => {
        Alert.alert('Erro', 'Verifique se o e-mail está correto.');
      })
      .finally(() => setLoading(false));
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={28} color="#00FF88" />
      </TouchableOpacity>

      <View style={styles.header}>
        <Ionicons name="lock-closed-outline" size={60} color="#00FF88" style={{ marginBottom: 20 }} />
        <Text style={styles.title}>Recuperar Senha</Text>
        <Text style={styles.subTitle}>Enviaremos um link de redefinição para o seu e-mail.</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput 
          style={styles.input}
          placeholder="Seu E-mail"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TouchableOpacity style={styles.resetButton} onPress={handleResetPassword} disabled={loading}>
          {loading ? <ActivityIndicator color="black" /> : <Text style={styles.resetButtonText}>ENVIAR LINK</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505', justifyContent: 'center', padding: 20 },
  backButton: { position: 'absolute', top: 50, left: 20 },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  subTitle: { color: '#888', fontSize: 15, textAlign: 'center', marginTop: 10 },
  formContainer: { width: '100%' },
  input: { backgroundColor: '#111', color: '#fff', padding: 18, borderRadius: 12, marginBottom: 20 },
  resetButton: { backgroundColor: '#00FF88', padding: 18, borderRadius: 12, alignItems: 'center' },
  resetButtonText: { color: '#000', fontWeight: 'bold' }
});