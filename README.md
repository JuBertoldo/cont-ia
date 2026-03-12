# 📦 Cont.IA - Scanner de Estoque Edge AI

O **Cont.IA** é um aplicativo mobile SaaS (Software as a Service) projetado para revolucionar o inventário de pequenas e médias empresas (PMEs). Utilizando Inteligência Artificial diretamente no dispositivo (Edge Computing) e Realidade Aumentada, ele realiza varreduras contínuas de peças (parafusos, porcas, etc.) via câmera, evitando dupla contagem e gerando auditorias financeiras automáticas.

## 🚀 Tecnologias Utilizadas (Tech Stack)

* **Frontend:** React Native + Expo
* **Câmera & Frames:** `react-native-vision-camera`
* **Inteligência Artificial (Edge):** YOLO11 Nano (Formato `.tflite`) via `react-native-fast-tflite`
* **Rastreamento de Objetos:** Algoritmo SORT customizado em JavaScript (Worklets)
* **Motor Gráfico (AR):** `@shopify/react-native-skia`
* **Banco de Dados & Nuvem:** Firebase Firestore
* **Exportação:** CSV via `expo-file-system` e `expo-sharing`

## ⚙️ Funcionalidades Chave (MVP)

- [ ] **Varredura Contínua (Tracking):** Identificação e contagem de peças em movimento sem duplicidade.
- [ ] **AR Interface:** Bounding boxes e IDs únicos desenhados sobre o vídeo a 60FPS.
- [ ] **Auditoria Offline-First:** Comparação instantânea entre o contado e o saldo do banco de dados.
- [ ] **Relatórios Financeiros:** Exportação de planilhas CSV com os desvios calculados direto para o WhatsApp/Email.

## 📂 Estrutura de Pastas (Padrão)
O projeto segue uma arquitetura modularizada, separando UI, Lógica de IA e Serviços de Nuvem dentro da pasta `/src`.