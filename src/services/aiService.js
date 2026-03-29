import { httpsCallable } from "firebase/functions";
import { auth, functions } from "../config/firebaseConfig";

export const analyzeWithClaudeFunction = async ({ labels = [], objects = [] }) => {
  try {
    if (!auth.currentUser) {
      throw new Error("Usuário não autenticado no app.");
    }

    await auth.currentUser.getIdToken(true);

    const callable = httpsCallable(functions, "analyzeInventory");
    const result = await callable({ labels, objects });

    return result?.data || {};
  } catch (error) {
    console.error("Erro aiService/analyzeWithClaudeFunction:", {
      code: error?.code,
      message: error?.message,
      details: error?.details,
    });
    throw error;
  }
};