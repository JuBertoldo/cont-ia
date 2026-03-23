import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

/**
 * Função responsável por buscar dados e gerar o CSV com Link da Imagem
 */
export const handleExportCSV = async (selectedUserId = null) => {
  try {
    const ativosRef = collection(db, "ativos");
    let q;

    if (selectedUserId) {
      q = query(ativosRef, where("userId", "==", selectedUserId), orderBy("createdAt", "desc"));
    } else {
      q = query(ativosRef, orderBy("createdAt", "desc"));
    }

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => doc.data());

    if (data.length === 0) {
      alert("Nenhum dado encontrado para exportar.");
      return;
    }

    // 1. CABEÇALHO ATUALIZADO (Adicionado 'Link da Imagem')
    const header = "Nome do Item,Quantidade,Classificacao,Data,Hora,Registrado por,Link da Imagem\n";
    
    // 2. MONTAGEM DAS LINHAS
    const rows = data.map(item => {
      const dataF = item.createdAt?.toDate().toLocaleDateString('pt-BR') || '';
      const horaF = item.createdAt?.toDate().toLocaleTimeString('pt-BR') || '';
      
      const nome = item.nome?.replace(/,/g, '.') || 'Sem nome';
      const cat = item.classificacao?.replace(/,/g, '.') || 'Geral';
      const qtd = item.quantidade || 1;
      const user = item.userName || 'Sistema';
      
      // Captura a URL da imagem salva no Storage
      const imgUrl = item.imageUrl || 'Sem foto';

      // Retorna a linha com a nova coluna no final
      return `${nome},${qtd},${cat},${dataF},${horaF},${user},${imgUrl}`;
    }).join("\n");

    const csvContent = "\uFEFF" + header + rows; // Adicionado BOM (\uFEFF) para o Excel entender acentos pt-BR
    const fileName = `contia_inventario_${Date.now()}.csv`;
    const fileUri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(fileUri);

  } catch (error) {
    console.error("Erro na exportação:", error);
    alert("Erro ao gerar arquivo.");
  }
};