import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Ionicons, FontAwesome } from '@expo/vector-icons'; 

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(false);
  const [verSenha, setVerSenha] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const carregarEmailSalvo = async () => {
      const emailSalvo = await AsyncStorage.getItem('@contia_email_salvo');
      if (emailSalvo) {
        setEmail(emailSalvo);
        setLembrar(true);
      }
    };
    carregarEmailSalvo();
  }, []);

  const handleLogin = async () => {
    const emailLimpo = email.trim();
    
    if (!emailLimpo || !senha) {
      Alert.alert("Atenção", "Preencha todos os campos!");
      return;
    }

    setLoading(true);
    try {
      // 🚀 Tentativa de Login
      await signInWithEmailAndPassword(auth, emailLimpo, senha);
      
      if (lembrar) {
        await AsyncStorage.setItem('@contia_email_salvo', emailLimpo);
      } else {
        await AsyncStorage.removeItem('@contia_email_salvo');
      }

      navigation.replace('Home');
    } catch (error) {
      console.error("Erro Firebase:", error.code);
      // Aqui exibimos o código real do erro para você me falar qual é
      Alert.alert("Erro no Login", `Código: ${error.code}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>CONT.<Text style={{color: '#00FF88'}}>IA</Text></Text>
        
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.inputPassword}
            placeholder="Senha"
            placeholderTextColor="#666"
            value={senha}
            onChangeText={setSenha}
            secureTextEntry={!verSenha}
          />
          <TouchableOpacity style={styles.eyeIcon} onPress={() => setVerSenha(!verSenha)}>
            <Ionicons name={verSenha ? "eye-off-outline" : "eye-outline"} size={22} color="#666" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.rememberContainer} onPress={() => setLembrar(!lembrar)}>
          <View style={[styles.checkbox, lembrar && styles.checkboxChecked]}>
            {lembrar && <View style={styles.checkboxInner} />}
          </View>
          <Text style={styles.rememberText}>Lembrar meu e-mail</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>ENTRAR</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Não tem conta? Cadastre-se</Text>
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>ou entre com</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity style={styles.googleButton} onPress={() => Alert.alert("Google", "Em breve")}>
          <FontAwesome name="google" size={18} color="#fff" style={{ marginRight: 12 }} />
          <Text style={styles.googleButtonText}>Continuar com Google</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#050505', justifyContent: 'center', padding: 30 },
  title: { color: '#fff', fontSize: 42, fontWeight: '900', marginBottom: 40, textAlign: 'center' },
  input: { backgroundColor: '#111', color: '#fff', padding: 18, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#222' },
  passwordContainer: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#222', alignItems: 'center' },
  inputPassword: { flex: 1, color: '#fff', padding: 18 },
  eyeIcon: { padding: 15 },
  rememberContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, marginLeft: 5 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#00FF88', marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#00FF88' },
  checkboxInner: { width: 10, height: 10, backgroundColor: '#000', borderRadius: 2 },
  rememberText: { color: '#999', fontSize: 14 },
  button: { backgroundColor: '#00FF88', padding: 20, borderRadius: 15, alignItems: 'center' },
  buttonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  link: { color: '#00FF88', textAlign: 'center', marginTop: 25, fontWeight: '600' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 30 },
  line: { flex: 1, height: 1, backgroundColor: '#222' },
  dividerText: { color: '#666', paddingHorizontal: 15, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  googleButton: { flexDirection: 'row', backgroundColor: '#111', padding: 18, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#333' },
  googleButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});