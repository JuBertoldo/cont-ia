import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { auth, db } from '../../config/firebaseConfig';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore'; // Importante para o banco de dados
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen({ navigation }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!nome || !email || !password) {
      Alert.alert("Erro", "Preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      // 1. Cria o usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Atualiza o nome no perfil do Auth
      await updateProfile(user, { displayName: nome });

      // 3. AUTOMAÇÃO: Cria o perfil no Firestore com Role Padrão (USER)
      // Isso resolve o Desafio de Segurança e Governança
      await setDoc(doc(db, "usuarios", user.uid), {
        nome: nome,
        email: email,
        role: "user", // <--- O "segredo" da automação está aqui!
        createdAt: new Date()
      });

      Alert.alert("Sucesso!", "Conta criada com perfil operacional.");
      navigation.replace('Home');
    } catch (error) {
      console.error(error);
      Alert.alert("Erro no Cadastro", "Verifique os dados ou tente outro e-mail.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={28} color="#00FF88" />
      </TouchableOpacity>

      <Text style={styles.title}>Criar Conta</Text>
      <Text style={styles.subtitle}>Junte-se ao CONT.IA</Text>

      <TextInput style={styles.input} placeholder="Nome Completo" placeholderTextColor="#666" value={nome} onChangeText={setNome} />
      <TextInput style={styles.input} placeholder="E-mail Corporativo" placeholderTextColor="#666" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Senha" placeholderTextColor="#666" value={password} onChangeText={setPassword} secureTextEntry />

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>CADASTRAR</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 30, justifyContent: 'center' },
  backBtn: { position: 'absolute', top: 50, left: 20 },
  title: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
  subtitle: { color: '#00FF88', fontSize: 16, marginBottom: 30 },
  input: { backgroundColor: '#111', color: '#FFF', padding: 18, borderRadius: 12, marginBottom: 15, fontSize: 16 },
  button: { backgroundColor: '#00FF88', padding: 20, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#000', fontWeight: 'bold', fontSize: 16 }
});