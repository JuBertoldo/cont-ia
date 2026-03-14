import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from 'firebase/auth'; // Mudou aqui
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage'; // Mudou aqui

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
const app = initializeApp(firebaseConfig);

// Inicializa o Auth com persistência para React Native (Resolve o erro do terminal)
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export const db = getFirestore(app);
export const storage = getStorage(app);