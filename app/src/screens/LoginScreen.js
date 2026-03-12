import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Dimensions, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        {/* LOGO */}
        <Text style={styles.logoText}>
          CONT.<Text style={{color: '#00FF88'}}>IA</Text>
        </Text>
        <Text style={styles.subtitle}>SISTEMA DE CONFERÊNCIA INDUSTRIAL</Text>

        {/* INPUTS */}
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="E-mail"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Senha"
            placeholderTextColor="#666"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.buttonText}>ENTRAR</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>v1.0.0 – Acesso Restrito</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center' },
  innerContainer: { width: '90%', maxWidth: 400, alignItems: 'center' },
  logoText: { color: '#fff', fontSize: 40, fontWeight: '900', letterSpacing: 4 },
  subtitle: { color: '#666', fontSize: 10, letterSpacing: 1, marginBottom: 40 },
  inputArea: { width: '100%' },
  input: { 
    backgroundColor: '#111', 
    color: '#fff', 
    padding: 15, 
    borderRadius: 10, 
    marginBottom: 15, 
    borderWidth: 1, 
    borderColor: '#222' 
  },
  button: { 
    backgroundColor: '#00FF88', 
    padding: 18, 
    borderRadius: 10, 
    alignItems: 'center', 
    marginTop: 10 
  },
  buttonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  footerText: { color: '#444', fontSize: 10, marginTop: 40 }
});