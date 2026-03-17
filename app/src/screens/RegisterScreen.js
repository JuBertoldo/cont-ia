import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Firebase
import { auth } from '../config/firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';

export default function RegisterScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = () => {
    if (!email || !password) return Alert.alert("Aviso", "Preencha e-mail e senha.");
    setLoading(true);
    
    createUserWithEmailAndPassword(auth, email, password)
      .then(() => {
        Alert.alert("Sucesso", "Conta criada com sucesso!");
        navigation.replace('Home');
      })
      .catch((error) => {
        let mensagem = "Erro ao cadastrar.";
        if (error.code === 'auth/email-already-in-use') mensagem = "Este e-mail já está em uso.";
        if (error.code === 'auth/weak-password') mensagem = "A senha deve ter pelo menos 6 caracteres.";
        Alert.alert("Erro", mensagem);
      })
      .finally(() => setLoading(false));
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={28} color="#00FF88" />
      </TouchableOpacity>

      <Text style={styles.logo}>CRIAR CONTA</Text>
      <Text style={styles.subtitle}>Junte-se à CONT.IA</Text>

      <View style={styles.inputContainer}>
        <TextInput 
          style={styles.input} 
          placeholder="Seu E-mail" 
          placeholderTextColor="#888" 
          value={email} 
          onChangeText={setEmail} 
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput 
          style={styles.input} 
          placeholder="Escolha uma Senha" 
          placeholderTextColor="#888" 
          secureTextEntry 
          value={password} 
          onChangeText={setPassword}
        />
      </View>

      <TouchableOpacity style={styles.btnRegister} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="black" /> : <Text style={styles.btnText}>CADASTRAR AGORA</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 20 },
  back: { position: 'absolute', top: 50, left: 20 },
  logo: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
  subtitle: { color: '#888', fontSize: 16, marginBottom: 40 },
  inputContainer: { width: '100%', marginBottom: 20 },
  input: { backgroundColor: '#111', color: '#FFF', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16 },
  btnRegister: { backgroundColor: '#00FF88', width: '100%', padding: 15, borderRadius: 10, alignItems: 'center' },
  btnText: { fontWeight: 'bold', fontSize: 18, color: 'black' }
});