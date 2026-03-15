import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Firebase
import { auth } from '../config/firebaseConfig';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

// Google Auth
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export default function LoginScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --- CONFIGURAÇÃO BLINDADA PARA ELIMINAR O ERRO 400 ---
  const [request, response, promptAsync] = Google.useAuthRequest(
    {
      webClientId: "775741375308-61j9cjtugpk0t9qh1rdrpqp15msdrrt1.apps.googleusercontent.com",
      iosClientId: "775741375308-61j9cjtugpk0t9qh1rdrpqp15msdrrt1.apps.googleusercontent.com",
      
      // 🚨 FIXO: Este link faz o erro 400 sumir porque é o que o Google Cloud conhece.
      redirectUri: "https://auth.expo.io/@jpbertoldo/cont-ia",
    },
    discovery
  );

  useEffect(() => {
    // RASTREADOR NO TERMINAL
    if (request) {
      console.log("🚀 LINK ENVIADO AO GOOGLE:", request.redirectUri);
    }
  }, [request]);

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      setLoading(true);
      signInWithCredential(auth, credential)
        .then(() => navigation.replace('Home'))
        .catch((err) => {
          console.log(err);
          Alert.alert("Erro", "Falha na autenticação do Google.");
        })
        .finally(() => setLoading(false));
    }
  }, [response]);

  const handleLogin = () => {
    if (!email || !password) return Alert.alert("Aviso", "Preencha e-mail e senha.");
    setLoading(true);
    signInWithEmailAndPassword(auth, email, password)
      .then(() => navigation.replace('Home'))
      .catch(() => Alert.alert("Erro", "E-mail ou senha incorretos."))
      .finally(() => setLoading(false));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>CONT.IA</Text>
      <Text style={styles.subtitle}>Gestão Inteligente</Text>

      <View style={styles.inputContainer}>
        <TextInput 
          style={styles.input} 
          placeholder="E-mail" 
          placeholderTextColor="#888" 
          value={email} 
          onChangeText={setEmail} 
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="username"
        />

        <View style={styles.passwordWrapper}>
          <TextInput 
            style={[styles.input, { flex: 1, marginBottom: 0 }]} 
            placeholder="Senha" 
            placeholderTextColor="#888" 
            secureTextEntry={!showPassword} 
            value={password} 
            onChangeText={setPassword}
            textContentType="password"
          />
          <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#888" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.btnLogin} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="black" /> : <Text style={styles.btnText}>ENTRAR</Text>}
      </TouchableOpacity>

      <View style={styles.dividerContainer}>
        <View style={styles.line} /><Text style={styles.dividerText}>OU</Text><View style={styles.line} />
      </View>

      <TouchableOpacity 
        style={[styles.btnGoogle, (!request || loading) && { opacity: 0.6 }]} 
        // 🚨 O useProxy: true aqui garante que o navegador abra o link seguro
        onPress={() => promptAsync({ useProxy: true })} 
        disabled={!request || loading}
      >
        <Ionicons name="logo-google" size={20} color="white" style={{ marginRight: 10 }} />
        <Text style={styles.btnGoogleText}>Entrar com Google</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.linkText}>Novo por aqui? <Text style={{ color: '#00FF88' }}>Crie uma conta</Text></Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 20 },
  logo: { color: '#FFF', fontSize: 42, fontWeight: 'bold' },
  subtitle: { color: '#888', fontSize: 16, marginBottom: 40 },
  inputContainer: { width: '100%', marginBottom: 20 },
  input: { backgroundColor: '#111', color: '#FFF', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16 },
  passwordWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 10, marginBottom: 15 },
  eyeIcon: { paddingHorizontal: 15 },
  btnLogin: { backgroundColor: '#00FF88', width: '100%', padding: 15, borderRadius: 10, alignItems: 'center' },
  btnText: { fontWeight: 'bold', fontSize: 18, color: 'black' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 30 },
  line: { flex: 1, height: 1, backgroundColor: '#333' },
  dividerText: { color: '#888', marginHorizontal: 10 },
  btnGoogle: { flexDirection: 'row', backgroundColor: '#333', width: '100%', padding: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnGoogleText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  linkText: { color: '#888', marginTop: 30 }
});