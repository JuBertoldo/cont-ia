import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  ActivityIndicator,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Conexão Real com Firebase
import { auth } from '../config/firebaseConfig'; 
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados dos "Olhinhos"
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async () => {
    // 1. Validações Iniciais
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Aviso', 'Por favor, preencha todos os campos.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem.');
      return;
    }

    // 2. Validação de Senha Forte
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,}$/;
    if (!passwordRegex.test(password)) {
      Alert.alert('Senha Fraca', 'A senha deve ter no mínimo 6 caracteres, números e símbolos (ex: !@#$).');
      return;
    }

    setLoading(true);
    Keyboard.dismiss();

    // 3. Chamada Real ao Firebase
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Salva o nome do usuário no perfil do Firebase
      await updateProfile(userCredential.user, { displayName: name });

      Alert.alert(
        'Sucesso! 🎉', 
        'Sua conta foi criada. O sistema perguntará se deseja salvar sua senha.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error(error);
      let errorMessage = 'Ocorreu um erro ao criar a conta.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este e-mail já está em uso.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'E-mail inválido.';
      }

      Alert.alert('Erro no Cadastro', errorMessage);
    } finally {
      setLoading(false);
    }
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
          textContentType="name"
        />
        <TextInput 
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          textContentType="emailAddress" // Sugere e-mail no iOS
        />

        <View style={styles.inputWrapper}>
          <TextInput 
            style={[styles.input, styles.inputWithIcon]}
            placeholder="Senha"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            textContentType="newPassword" // Importante para o "Salvar Senha"
          />
          <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="#888" />
          </TouchableOpacity>
        </View>

        <View style={styles.inputWrapper}>
          <TextInput 
            style={[styles.input, styles.inputWithIcon]}
            placeholder="Confirme a Senha"
            placeholderTextColor="#666"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            textContentType="newPassword"
          />
          <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={22} color="#888" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.registerButton, loading && { opacity: 0.7 }]} 
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.registerButtonText}>CRIAR CONTA</Text>
          )}
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
  input: { backgroundColor: '#111', color: '#fff', padding: 18, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#222', fontSize: 16 },
  inputWrapper: { position: 'relative', justifyContent: 'center' },
  inputWithIcon: { paddingRight: 50 },
  eyeIcon: { position: 'absolute', right: 15, top: 18 },
  registerButton: { backgroundColor: '#00FF88', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 20 },
  registerButtonText: { color: '#000', fontSize: 16, fontWeight: '900' },
  loginContainer: { flexDirection: 'row', justifyContent: 'center' },
  loginText: { color: '#888', fontSize: 14 },
  loginLink: { color: '#00FF88', fontSize: 14, fontWeight: 'bold' }
});