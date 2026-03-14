# ContIA - Gestão de Inventário Inteligente

O **ContIA** é um aplicativo mobile focado em logística e inventário que utiliza Inteligência Artificial Híbrida para automatizar a contagem e catalogação de ativos.



## Funcionalidades
- **Scanner com IA:** Detecção múltipla de objetos via Google Cloud Vision API.
- **Arquitetura Híbrida:** Integração de TensorFlow.js (On-device) e Cloud Vision (Nuvem).
- **Tradução Automática:** Conversão dinâmica de termos técnicos para PT-BR.
- **Dashboard de Estatísticas:** Cálculo em tempo real de lotes e peças totais.
- **Exportação de Dados:** Geração de relatórios em formato Excel (CSV).

## Engenharia de Software

### Diagrama de Fluxo (Data Flow)
O sistema segue um fluxo linear de processamento desde a captura da imagem até a persistência local:
1. **Captura:** Expo Camera (Base64).
2. **Processamento:** API Google Vision (Object Localization).
3. **Filtro:** Algoritmos de desduplicação e tradução.
4. **Armazenamento:** AsyncStorage (JSON Serialized).



[Image of data flow diagram in software engineering]


### Abordagem de IA
O projeto utiliza uma **Dupla Abordagem**:
- **MobileNet (TensorFlow.js):** Carregamento de modelo local para prontidão de resposta.
- **Google Cloud Vision:** Motor de alta precisão para identificação detalhada de objetos.

## Stack Tecnológica
- **Framework:** React Native (Expo)
- **Linguagem:** JavaScript (ES6+)
- **IA:** TensorFlow.js + Google Vision API
- **Navegação:** React Navigation (Stack)
- **Estilo:** Styled-components / StyleSheet (Dark Mode)

## MVP (Produto Mínimo Viável)
Este repositório contém a versão 1.0 funcional, validando a integração entre visão computacional e gestão de banco de dados local.