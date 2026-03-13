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
import { Ionicons } from '@expo/vector-icons';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');

  // 🧠 FUNÇÃO QUE SIMULA O ENVIO DO E-MAIL
  const handleResetPassword = () => {
    if (!email) {
      alert('Por favor, digite seu e-mail para continuar.');
      return;
    }

    // Quando o banco real chegar, aqui entrará o código do Firebase/Supabase
    alert(`✅ Tudo certo!\nSe o e-mail ${email} estiver cadastrado, você receberá um link com as instruções para redefinir sua senha em instantes.\n\n(Não esqueça de checar o spam!)`);
    
    // Manda o usuário de volta para o Login após o aviso
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* BOTÃO DE VOLTAR LÁ NO TOPO */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={28} color="#00FF88" />
        <Text style={styles.backButtonText}>Voltar ao Login</Text>
      </TouchableOpacity>

      {/* CABEÇALHO */}
      <View style={styles.header}>
        <Ionicons name="lock-closed-outline" size={60} color="#333" style={{ marginBottom: 20 }} />
        <Text style={styles.title}>Recuperar Senha</Text>
        <Text style={styles.subTitle}>
          Digite o e-mail associado à sua conta e enviaremos um link de recuperação.
        </Text>
      </View>

      {/* FORMULÁRIO */}
      <View style={styles.formContainer}>
        <TextInput 
          style={styles.input}
          placeholder="Seu E-mail de cadastro"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TouchableOpacity 
          style={styles.resetButton}
          onPress={handleResetPassword}
        >
          <Text style={styles.resetButtonText}>ENVIAR LINK DE ACESSO</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505', justifyContent: 'center', padding: 20 },
  backButton: { position: 'absolute', top: 50, left: 20, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
  backButtonText: { color: '#00FF88', fontSize: 16, marginLeft: 8, fontWeight: 'bold' },
  header: { alignItems: 'center', marginBottom: 40, marginTop: 40 },
  title: { color: '#fff', fontSize: 32, fontWeight: '900', textAlign: 'center' },
  subTitle: { color: '#888', fontSize: 15, marginTop: 15, textAlign: 'center', paddingHorizontal: 20, lineHeight: 22 },
  formContainer: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  input: { backgroundColor: '#111', color: '#fff', padding: 18, borderRadius: 12, marginBottom: 25, borderWidth: 1, borderColor: '#222', fontSize: 16 },
  resetButton: { backgroundColor: '#00FF88', padding: 18, borderRadius: 12, alignItems: 'center' },
  resetButtonText: { color: '#000', fontSize: 16, fontWeight: '900' }
});