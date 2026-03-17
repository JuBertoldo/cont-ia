import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyCtFGbBI61y6hYS3C8Lnp1mA2VqUJ0xbY8",
  authDomain: "contia-8ca4a.firebaseapp.com",
  projectId: "contia-8ca4a",
  storageBucket: "contia-8ca4a.firebasestorage.app",
  messagingSenderId: "775741375308",
  appId: "1:775741375308:web:d323a17d20bcca5ee845e9",
  measurementId: "G-9ETQ20D77K"
};

// Inicializa o App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Configura Auth
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Configura e Exporta o Banco de Dados
export const db = getFirestore(app);

console.log("🔥 Firebase Inicializado com Sucesso!");