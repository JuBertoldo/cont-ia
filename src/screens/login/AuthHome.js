import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { auth, db } from '../../config/firebaseConfig';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential
} from 'firebase/auth';

import { doc, getDoc, setDoc } from 'firebase/firestore';

import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

export default function AuthHome() {

  const navigation = useNavigation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: 'SEU_EXPO_CLIENT_ID',
    androidClientId: 'SEU_ANDROID_CLIENT_ID',
    iosClientId: 'SEU_IOS_CLIENT_ID',
    webClientId: 'SEU_WEB_CLIENT_ID',
  });

  const verificarPerfilEEntrar = async (user) => {
    try {

      const ref = doc(db, 'usuarios', user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {

        const dados = snap.data();

        navigation.replace(
          dados.role === 'admin'
            ? 'AdminHome'
            : 'Home'
        );

      } else {

        await setDoc(ref, {
          nome: user.displayName || 'Usuário',
          email: user.email,
          role: 'user',
          createdAt: new Date()
        });

        navigation.replace('Home');
      }

    } catch (e) {
      Alert.alert('Erro ao carregar perfil');
      navigation.replace('Home');
    }
  };

  useEffect(() => {

    if (response?.type === 'success') {

      const { idToken } = response.authentication;

      const credential = GoogleAuthProvider.credential(idToken);

      setLoading(true);

      signInWithCredential(auth, credential)
        .then(res => verificarPerfilEEntrar(res.user))
        .catch(() => Alert.alert('Erro login Google'))
        .finally(() => setLoading(false));
    }

  }, [response]);

  const handleLoginEmail = () => {

    if (!email || !password)
      return Alert.alert('Preencha email e senha');

    setLoading(true);

    signInWithEmailAndPassword(auth, email, password)
      .then(res => verificarPerfilEEntrar(res.user))
      .catch(() => Alert.alert('Email ou senha inválidos'))
      .finally(() => setLoading(false));
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >

      <ScrollView contentContainerStyle={styles.container}>

        <Text style={styles.logo}>CONT.IA</Text>

        <View style={styles.form}>

          <TextInput
            style={styles.input}
            placeholder="E-mail"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />

          <View style={styles.passwordWrapper}>

            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Senha"
              placeholderTextColor="#888"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color="#888"
              />
            </TouchableOpacity>

          </View>

          <TouchableOpacity
            style={styles.btnLogin}
            onPress={handleLoginEmail}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="black" />
              : <Text style={styles.btnText}>ENTRAR</Text>}
          </TouchableOpacity>

        </View>

        <View style={styles.dividerContainer}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>OU</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity
          style={[
            styles.btnGoogle,
            (!request || loading) && { opacity: 0.6 }
          ]}
          onPress={() => promptAsync()}
          disabled={!request || loading}
        >
          <Ionicons
            name="logo-google"
            size={20}
            color="white"
            style={{ marginRight: 10 }}
          />
          <Text style={styles.btnGoogleText}>
            Entrar com Google
          </Text>
        </TouchableOpacity>

      </ScrollView>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 25
  },
  logo: {
    color: '#FFF',
    fontSize: 42,
    fontWeight: 'bold',
    marginBottom: 40
  },
  form: { width: '100%' },
  input: {
    backgroundColor: '#111',
    color: '#FFF',
    padding: 18,
    borderRadius: 12,
    marginBottom: 15
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    marginBottom: 15
  },
  eyeIcon: { paddingHorizontal: 15 },
  btnLogin: {
    backgroundColor: '#00FF88',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center'
  },
  btnText: {
    fontWeight: 'bold',
    fontSize: 18,
    color: 'black'
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
    width: '100%'
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#333'
  },
  dividerText: {
    color: '#888',
    marginHorizontal: 15
  },
  btnGoogle: {
    flexDirection: 'row',
    backgroundColor: '#333',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  },
  btnGoogleText: {
    color: '#FFF',
    fontWeight: 'bold'
  }
});