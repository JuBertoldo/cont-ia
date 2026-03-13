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
// 📦 Importando os ícones mágicos do Expo
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 👁️ Estados para controlar se a senha está visível ou não
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = () => {
    if (!name || !email || !password || !confirmPassword) {
      alert('Por favor, preencha todos os campos.');
      return;
    }
    if (password !== confirmPassword) {
      alert('As senhas não coincidem. Tente novamente.');
      return;
    }
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,}$/;
    if (!passwordRegex.test(password)) {
      alert('Sua senha é muito fraca!\nEla deve ter no mínimo 6 caracteres, contendo números e caracteres especiais (ex: !@#$).');
      return;
    }
    const mockBancoDeDados = ['teste@teste.com', 'admin@cont.ia', 'joao@silva.com'];
    if (mockBancoDeDados.includes(email.toLowerCase())) {
      alert('❌ Este e-mail já está cadastrado no sistema!');
      return;
    }

    alert('✅ Conta criada com sucesso!\nFaça login para continuar.');
    navigation.goBack(); 
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Crie sua Conta</Text>
        <Text style={styles.subTitle}>Junte-se ao sistema CONT.IA</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput 
          style={styles.input}
          placeholder="Nome Completo"
          placeholderTextColor="#666"
          value={name}
          onChangeText={setName}
        />
        <TextInput 
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* 🔒 CAMPO DE SENHA COM OLHINHO */}
        <View style={styles.inputWrapper}>
          <TextInput 
            style={[styles.input, styles.inputWithIcon]} // Junta os estilos para dar espaço ao ícone
            placeholder="Senha"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword} // Inverte o estado (se showPassword for true, secure vira false)
          />
          <TouchableOpacity 
            style={styles.eyeIcon} 
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="#888" />
          </TouchableOpacity>
        </View>

        {/* 🔒 CAMPO DE CONFIRMAR SENHA COM OLHINHO */}
        <View style={styles.inputWrapper}>
          <TextInput 
            style={[styles.input, styles.inputWithIcon]}
            placeholder="Confirme a Senha"
            placeholderTextColor="#666"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity 
            style={styles.eyeIcon} 
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={22} color="#888" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
          <Text style={styles.registerButtonText}>CRIAR CONTA</Text>
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Já tem uma conta? </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.loginLink}>Faça Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505', justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { color: '#fff', fontSize: 32, fontWeight: '900' },
  subTitle: { color: '#888', fontSize: 14, marginTop: 5 },
  formContainer: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  
  // Estilo Base do Input
  input: { 
    backgroundColor: '#111', 
    color: '#fff', 
    padding: 18, 
    borderRadius: 12, 
    marginBottom: 15, 
    borderWidth: 1, 
    borderColor: '#222', 
    fontSize: 16 
  },
  
  // 👇 Novos estilos para fazer o ícone funcionar
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputWithIcon: {
    paddingRight: 50, // Dá espaço para o texto não encostar no ícone
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 18, // Centraliza o ícone verticalmente no campo
  },
  // 👆 Fim dos novos estilos

  registerButton: { backgroundColor: '#00FF88', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 20 },
  registerButtonText: { color: '#000', fontSize: 16, fontWeight: '900' },
  loginContainer: { flexDirection: 'row', justifyContent: 'center' },
  loginText: { color: '#888', fontSize: 14 },
  loginLink: { color: '#00FF88', fontSize: 14, fontWeight: 'bold' }
});