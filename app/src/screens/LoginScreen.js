import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>
          CONT.<Text style={{color: '#00FF88'}}>IA</Text>
        </Text>
        <Text style={styles.subTitle}>Contagem Inteligente de Peças</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput 
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput 
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* 👇 AQUI ESTÁ O BOTÃO CORRIGIDO 👇 */}
        <TouchableOpacity 
          style={styles.forgotPassword}
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={styles.forgotPasswordText}>Esqueci minha senha</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => navigation.replace('Home')}
        >
          <Text style={styles.loginButtonText}>ENTRAR</Text>
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OU</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.googleButton}>
          <AntDesign name="google" size={22} color="#000" style={{ marginRight: 10 }} />
          <Text style={styles.googleButtonText}>Continuar com o Google</Text>
        </TouchableOpacity>

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Ainda não tem acesso? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Cadastre-se</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505', justifyContent: 'center', padding: 20 },
  logoContainer: { alignItems: 'center', marginBottom: 50 },
  logoText: { color: '#fff', fontSize: 48, fontWeight: '900', letterSpacing: 2 },
  subTitle: { color: '#888', fontSize: 14, marginTop: 5, letterSpacing: 1 },
  formContainer: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  input: { backgroundColor: '#111', color: '#fff', padding: 18, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#222', fontSize: 16 },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 25 },
  forgotPasswordText: { color: '#00FF88', fontSize: 12, fontWeight: '600' },
  loginButton: { backgroundColor: '#00FF88', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  loginButtonText: { color: '#000', fontSize: 16, fontWeight: '900' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#333' },
  dividerText: { color: '#666', paddingHorizontal: 15, fontSize: 12, fontWeight: 'bold' },
  googleButton: { backgroundColor: '#fff', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  googleButtonText: { color: '#000', fontSize: 15, fontWeight: 'bold' },
  registerContainer: { flexDirection: 'row', justifyContent: 'center' },
  registerText: { color: '#888', fontSize: 14 },
  registerLink: { color: '#00FF88', fontSize: 14, fontWeight: 'bold' }
});