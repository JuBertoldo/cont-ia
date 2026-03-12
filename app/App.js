import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Dimensions, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Camera } from 'expo-camera';
import * as tf from '@tensorflow/tfjs';
import { cameraWithTensors, bundleResourceIO } from '@tensorflow/tfjs-react-native';

// Configuração da Câmera com TensorFlow
const TensorCamera = cameraWithTensors(Camera);
const PARAFUSOS_CLASSES = ['Sextavado', 'Philips', 'Allen', 'Arruela'];

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [isModelReady, setIsModelReady] = useState(false);
  
  // Estado do Inventário (Acúmulo de Contagem)
  const [inventory, setInventory] = useState({
    'Sextavado': 0, 'Philips': 0, 'Allen': 0, 'Arruela': 0
  });

  const isProcessing = useRef(false);
  const rafId = useRef(null);

  // Guarda o milissegundo exato em que cada parafuso foi contado pela última vez
  const lastCountTime = useRef({ 'Sextavado': 0, 'Philips': 0, 'Allen': 0, 'Arruela': 0 });

  const [model, setModel] = useState(null);
  const [detections, setDetections] = useState([]);
  
  // Pega as dimensões da tela (Corrigindo o erro da variável 'width')
  const { width, height } = Dimensions.get('window');

  const processDetection = (detectedClass) => {
    const now = Date.now();
    const COOLDOWN_MS = 3000; // 3 segundos de intervalo de segurança

    // Só libera a contagem se a diferença de tempo for maior que 3 segundos
    if (now - lastCountTime.current[detectedClass] > COOLDOWN_MS) {
      // Atualiza o inventário somando +1
      setInventory((prev) => ({
        ...prev,
        [detectedClass]: prev[detectedClass] + 1
      }));
      
      // Reinicia o relógio para esse tipo de parafuso
      lastCountTime.current[detectedClass] = now;
      console.log(`+1 ${detectedClass} adicionado!`);
    }
  };

  useEffect(() => {
    (async () => {
      // 1. Pedir permissão
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');

      // 2. Iniciar TensorFlow
      await tf.ready();

     // 3. Carregar o modelo da pasta assets
      try {
        const modelJson = require('./assets/model.json');
        
        // Agora listamos as 3 partes do cérebro aqui:
        const modelWeights = [
          require('./assets/group1-shard1of3.bin'),
          require('./assets/group1-shard2of3.bin'),
          require('./assets/group1-shard3of3.bin'),
        ];
        
        console.log("Iniciando o carregamento do cérebro de 3 partes...");
        
        // Passamos o array de pesos para a IA
        const loadedModel = await tf.loadGraphModel(bundleResourceIO(modelJson, modelWeights));
        
        setModel(loadedModel);
        setIsModelReady(true);
        console.log("Cérebro completo e pronto!");
      } catch (error) {
        console.log("Erro ao carregar o cérebro da IA:", error)
      }
    })();
  }, []);

  // ==========================================
  // FUNÇÃO RESTAURADA: Processa os quadros da câmera
  // ==========================================
  const handleCameraStream = (images) => {
    const loop = async () => {
      if (isProcessing.current || !isModelReady) return;
      
      const nextImageTensor = images.next().value;
      if (nextImageTensor) {
        isProcessing.current = true;
        try {
          // Quando for testar a IA de verdade, é só usar o const predictions
          // const predictions = await model.executeAsync(nextImageTensor);
          
          // ==========================================
          // 🧠 LÓGICA REAL DA IA (Comentada para teste em casa)
          // ==========================================
          /*
          const boxes = await predictions[0].data();   
          const scores = await predictions[1].data();  
          const classes = await predictions[2].data(); 
          
          const realDetections = [];
          for (let i = 0; i < scores.length; i++) {
            if (scores[i] > 0.60) { 
              const yMin = boxes[i * 4];
              const xMin = boxes[i * 4 + 1];
              const yMax = boxes[i * 4 + 2];
              const xMax = boxes[i * 4 + 3];

              realDetections.push({
                bbox: [xMin * 640, yMin * 640, (xMax - xMin) * 640, (yMax - yMin) * 640],
                class: PARAFUSOS_CLASSES[classes[i]] || 'Desconhecido',
                score: scores[i]
              });
              
              // AQUI CHAMAMOS A CONTAGEM REAL (Quando a IA for ativada)
              // processDetection(PARAFUSOS_CLASSES[classes[i]]);
            }
          }
          setDetections(realDetections);
          */
          // ==========================================

          // Mock de teste (Quadrado verde fixo na tela)
          const mockDetections = [
            {
              bbox: [50, 100, 200, 200], 
              class: 'Parafuso Philips',
              score: 0.98
            }
          ];
          setDetections(mockDetections);

        } catch (error) {
          console.log("Erro no processamento:", error);
        } finally {
          tf.dispose([nextImageTensor]); 
          isProcessing.current = false;
        }
      }
      rafId.current = requestAnimationFrame(loop);
    };
    loop();
  };

  // ==========================================
  // LÓGICA DE NEGÓCIOS: Finalizar o Lote
  // ==========================================
  const handleFinishConference = () => {
    // 1. Calcula o total de peças lidas
    const totalPecas = Object.values(inventory).reduce((acc, curr) => acc + curr, 0);

    // 2. Trava de segurança: não deixa fechar lote vazio
    if (totalPecas === 0) {
      Alert.alert("Atenção ⚠️", "O inventário está vazio. Escaneie algumas peças primeiro!");
      return;
    }

    // 3. Monta o texto do relatório só com o que foi encontrado
    let relatorio = `Total de peças detectadas: ${totalPecas}\n\n`;
    for (const [peca, quantidade] of Object.entries(inventory)) {
      if (quantidade > 0) {
        relatorio += `• ${peca}: ${quantidade} unid.\n`;
      }
    }

    // 4. Mostra o alerta com opções de confirmar ou cancelar
    Alert.alert(
      "📦 Resumo do Lote",
      relatorio,
      [
        {
          text: "Revisar",
          style: "cancel"
        },
        {
          text: "Confirmar e Salvar",
          onPress: () => {
            // Zera o inventário para começar o próximo lote limpo
            setInventory({ 'Sextavado': 0, 'Philips': 0, 'Allen': 0, 'Arruela': 0 });
            Alert.alert("✅ Sucesso", "Lote finalizado com sucesso!");
          }
        }
      ]
    );
  };

  const renderInventoryItem = ({ item }) => (
    <View style={styles.inventoryCard}>
      <View style={styles.cardHeader}>
        <View style={styles.dot} />
        <Text style={styles.inventoryName}>{item.toUpperCase()}</Text>
      </View>
      <Text style={styles.inventoryCount}>{inventory[item]}</Text>
    </View>
  );

  const renderBoundingBoxes = () => {
    return detections.map((det, index) => {
      const x = det.bbox[0] * width / 640;
      const y = det.bbox[1] * (height * 0.75) / 640;
      const w = det.bbox[2] * width / 640;
      const h = det.bbox[3] * (height * 0.75) / 640;

      return (
        <View key={index} style={[styles.boundBox, { left: x, top: y, width: w, height: h }]}>
          <Text style={styles.boundLabel}>{det.class} {Math.round(det.score * 100)}%</Text>
        </View>
      );
    });
  };

  if (hasPermission === null) return <View style={styles.container}><Text>Carregando...</Text></View>;

  return (
    <View style={styles.container}>
      {/* Área Visual da Câmera */}
      <View style={styles.cameraContainer}>
        <TensorCamera
          style={styles.camera}
          type={Camera.Constants.Type.back}
          onReady={handleCameraStream}
          autorender={true}
          resizeHeight={640}
          resizeWidth={640}
          resizeDepth={3}
        />
        
        {/* CORREÇÃO: Adicionamos a chamada dos quadrados verdes aqui dentro! */}
        {renderBoundingBoxes()}

        <View style={styles.hudHeader}>
          <Text style={styles.logoText}>CONT.<Text style={{color: '#00FF88'}}>IA</Text></Text>
          <View style={styles.liveBadge}><Text style={styles.liveText}>SCANNER ATIVO</Text></View>
        </View>
      </View>

      {/* Painel de Inventário Inferior */}
      <View style={styles.footer}>
        <View style={styles.footerHeader}>
          <Text style={styles.footerTitle}>RESUMO DO LOTE</Text>
          <TouchableOpacity onPress={() => setInventory({ 'Sextavado': 0, 'Philips': 0, 'Allen': 0, 'Arruela': 0 })}>
            <Text style={styles.resetLink}>LIMPAR</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={Object.keys(inventory)}
          renderItem={renderInventoryItem}
          keyExtractor={item => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.inventoryList}
        />

        <TouchableOpacity style={styles.btnFinish} onPress={handleFinishConference}>
          <Text style={styles.btnFinishText}>FINALIZAR CONFERÊNCIA</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  cameraContainer: { flex: 0.75, overflow: 'hidden', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  camera: { flex: 1 },
  hudHeader: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  liveBadge: { backgroundColor: 'rgba(0, 255, 136, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 5, borderWidth: 1, borderColor: '#00FF88' },
  liveText: { color: '#00FF88', fontSize: 9, fontWeight: '900' },
  footer: { flex: 0.25, backgroundColor: '#121212', padding: 20 },
  footerHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  footerTitle: { color: '#444', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  resetLink: { color: '#666', fontSize: 10, fontWeight: 'bold' },
  inventoryList: { paddingRight: 20 },
  inventoryCard: { backgroundColor: '#1E1E1E', padding: 15, borderRadius: 12, marginRight: 12, minWidth: 110, justifyContent: 'center', borderWidth: 1, borderColor: '#2A2A2A' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00FF88', marginRight: 6 },
  inventoryName: { color: '#888', fontSize: 9, fontWeight: 'bold' },
  inventoryCount: { color: '#fff', fontSize: 28, fontWeight: '300' },
  btnFinish: { backgroundColor: '#00FF88', paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  btnFinishText: { color: '#000', fontWeight: '900', fontSize: 12 },
  boundBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#00FF88',
    borderRadius: 4,
    zIndex: 10,
  },
  boundLabel: {
    backgroundColor: '#00FF88',
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
    position: 'absolute',
    top: -15,
    left: -2,
    paddingHorizontal: 4,
  },
});