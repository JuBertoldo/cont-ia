import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth, db } from '../../config/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

// --- 1. CONFIGURAÇÃO DA IA (SRP: Inteligência Artificial) ---
const GEMINI_KEY = "AIzaSyBCD6EHu-Q1rGaDTtd85aPYH-gxstyauZw"; // Lembre de colocar a sua chave nova aqui
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

export default function ScannerScreen({ navigation }) {
  const [image, setImage] = useState(null);
  const [base64, setBase64] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // --- 2. CAPTURA DE IMAGEM (Interface com Hardware) ---
  const pickImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      allowsEditing: true,
      quality: 0.6, // Equilíbrio entre nitidez e velocidade de upload
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setBase64(result.assets[0].base64);
      analyzeWithGemini(result.assets[0].base64);
    }
  };

  // --- 3. AUTOMAÇÃO GEMINI (O "Cérebro" do CONT.IA) ---
  const analyzeWithGemini = async (imageB64) => {
    setAnalyzing(true);
    setPrediction(null);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      // Prompt estruturado para evitar alucinações e garantir a "quebra" dos dados
      const prompt = `Analise esta foto de inventário organizacional. 
      Identifique o objeto, conte quantos itens iguais aparecem e classifique-o (ex: TI, Mobiliário, Esportes).
      Responda APENAS em formato JSON puro, sem markdown ou textos extras:
      {"nome": "Nome do Objeto", "quantidade": 1, "classificacao": "Sua Categoria"}`;

      const imagePart = { inlineData: { data: imageB64, mimeType: "image/jpeg" } };
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      // "Quebrando" os dados: limpando possíveis tags de markdown (```json) e convertendo em objeto
      const cleanedJson = text.replace(/```json|```/g, "").trim();
      const parsedData = JSON.parse(cleanedJson);
      
      setPrediction(parsedData);
    } catch (error) {
      console.error(error);
      Alert.alert("Erro de IA", "Não foi possível identificar o objeto automaticamente.");
    } finally {
      setAnalyzing(false);
    }
  };

  // --- 4. PERSISTÊNCIA (Banco de Dados) ---
  const saveAsset = async () => {
    if (!prediction) return;

    try {
      await addDoc(collection(db, "ativos"), {
        nome: prediction.nome,
        quantidade: prediction.quantidade,
        classificacao: prediction.classificacao,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || "Colaborador",
        createdAt: serverTimestamp(),
      });

      // Feedback Sutil que você sugeriu
      setShowSuccess(true);
      
      // Timer para voltar à Home com elegância
      setTimeout(() => {
        setShowSuccess(false);
        navigation.navigate('Home');
      }, 2000);

    } catch (error) {
      Alert.alert("Erro", "Não foi possível salvar no inventário.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Botão de Fechar Sutil */}
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="close-circle" size={35} color="#444" />
      </TouchableOpacity>

      <View style={styles.content}>
        {!image ? (
          <TouchableOpacity style={styles.placeholder} onPress={pickImage}>
            <Ionicons name="camera-outline" size={80} color="#00FF88" />
            <Text style={styles.placeholderText}>Toque para registrar ativo</Text>
          </TouchableOpacity>
        ) : (
          <Image source={{ uri: image }} style={styles.preview} />
        )}

        {analyzing && (
          <View style={styles.loaderArea}>
            <ActivityIndicator color="#00FF88" size="large" />
            <Text style={styles.loaderText}>IA analisando o objeto...</Text>
          </View>
        )}

        {prediction && !analyzing && (
          <View style={styles.resultCard}>
            <Text style={styles.cardHeader}>IDENTIFICAÇÃO AUTOMÁTICA</Text>
            
            <View style={styles.dataRow}>
              <Text style={styles.label}>NOME:</Text>
              <Text style={styles.value}>{prediction.nome}</Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.label}>QUANTIDADE:</Text>
              <Text style={styles.value}>{prediction.quantidade}</Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.label}>CLASSIFICAÇÃO:</Text>
              <Text style={styles.value}>{prediction.classificacao}</Text>
            </View>

            <TouchableOpacity style={styles.confirmBtn} onPress={saveAsset}>
              <Text style={styles.confirmBtnText}>CONFIRMAR REGISTRO</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setImage(null)}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* OVERLAY DE SUCESSO SUTIL */}
      {showSuccess && (
        <View style={styles.successOverlay}>
          <Ionicons name="checkmark-circle" size={100} color="#00FF88" />
          <Text style={styles.successText}>REGISTRADO COM SUCESSO!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20 },
  closeBtn: { marginTop: 40, alignSelf: 'flex-end' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholder: { width: '100%', height: 350, borderStyle: 'dashed', borderWidth: 2, borderColor: '#333', borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#888', marginTop: 15, fontSize: 16 },
  preview: { width: '100%', height: 350, borderRadius: 30 },
  loaderArea: { marginTop: 30, alignItems: 'center' },
  loaderText: { color: '#00FF88', marginTop: 10, fontWeight: '500' },
  resultCard: { backgroundColor: '#111', width: '100%', padding: 25, borderRadius: 25, marginTop: 20 },
  cardHeader: { color: '#888', fontSize: 12, marginBottom: 15, textAlign: 'center' },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#222', paddingBottom: 5 },
  label: { color: '#00FF88', fontWeight: 'bold', fontSize: 14 },
  value: { color: '#FFF', fontSize: 16, fontWeight: '500' },
  confirmBtn: { backgroundColor: '#00FF88', padding: 20, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  confirmBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  retryText: { color: '#444', textAlign: 'center', marginTop: 15 },
  successOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  successText: { color: '#00FF88', fontWeight: 'bold', marginTop: 20, fontSize: 18 }
});