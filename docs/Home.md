# Cont.IA - Documentação (Home)

## Introdução
O Cont.IA é um aplicativo de inventário patrimonial com suporte de Inteligência Artificial para identificação e classificação de itens por imagem.

## Sobre
### O que é?
Solução mobile para auditoria e gestão de patrimônio.

### Por que?
Para agilizar inventários, padronizar classificações e melhorar rastreabilidade.

### Como funciona?
1. Captura da imagem no app  
2. Extração de labels/objetos  
3. Chamada da Cloud Function `analyzeInventory`  
4. Processamento via Anthropic (API key protegida em Secret Manager)  
5. Retorno em JSON para exibição e persistência

## Setup e Configuração do Sistema
Veja: [Setup](./Setup.md)

## Partes do sistema
- **BD:** Firestore (coleções, regras e histórico)
- **APP:** Captura, fluxo de análise, tela de resultado, histórico
- **Servidor:** Firebase Functions, integração IA, logs e segurança

## Desenvolvedores
- Juliana Pereira Bertoldo
- Welligton Paiva