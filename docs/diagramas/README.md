# Diagramas UML — Cont.IA TCC

Diagramas em formato PlantUML para o TCC do projeto Cont.IA.

## Arquivos

| Arquivo | Diagrama | Capítulo TCC |
|---------|----------|--------------|
| `01_casos_de_uso.puml` | Casos de Uso | Cap. 4 — Proposta |
| `02_atividades.puml` | Atividades (Fluxo de Contagem) | Cap. 4 — Proposta |
| `03_classes.puml` | Classes | Cap. 4 — Proposta |
| `04_sequencia.puml` | Sequência (Fluxo de Detecção) | Cap. 4 — Proposta |
| `05_implantacao.puml` | Implantação (Infraestrutura) | Cap. 4 — Proposta |
| `06_maquina_estados.puml` | Máquina de Estados (Ciclo do Usuário) | Cap. 4 — Proposta |

## Como renderizar no VS Code

1. Instale a extensão **PlantUML** (jebbs.plantuml)
2. Instale o **Java** (necessário para renderização local)
3. Abra qualquer `.puml` e pressione `Alt+D` para preview
4. Clique com botão direito → **Export Current Diagram** → PNG

## Como usar no Overleaf

1. Exporte cada diagrama como PNG (300 DPI)
2. Faça upload na pasta `figuras/` do Overleaf
3. Use no LaTeX:

```latex
\begin{figure}[H]
    \begin{center}
        \includegraphics[width=0.85\textwidth]{figuras/01_casos_de_uso}
    \end{center}
    \caption{Diagrama de Casos de Uso do Cont.IA}
    \label{fig:casos_uso}
    \fonte{Elaborado pelos autores (2025)}
\end{figure}
```
