import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 1. Sua configuração (Mantenha esses dados, são os seus!)
const firebaseConfig = {
  apiKey: "AIzaSyCtFGbBI61y6hYS3C8Lnp1mA2VqUJ0xbY8",
  authDomain: "contia-8ca4a.firebaseapp.com",
  projectId: "contia-8ca4a",
  storageBucket: "contia-8ca4a.firebasestorage.app",
  messagingSenderId: "775741375308",
  appId: "1:775741375308:web:d323a17d20bcca5ee845e9",
  measurementId: "G-9ETQ20D77K"
};

// 2. Inicializa o App (Evita erro de inicialização duplicada no Expo)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 3. Configura o Auth com Persistência (Para o usuário não precisar logar toda hora)
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// 4. Exporta os outros serviços
export const db = getFirestore(app);
export const storage = getStorage(app);

console.log("🔥 Firebase e Storage Inicializados com Sucesso!");