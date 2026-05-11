/**
 * Constantes e utilitários do sistema de chamados (Support).
 *
 * Separado do supportService.js para seguir o princípio da
 * Responsabilidade Única (SRP): este arquivo define DADOS e REGRAS,
 * enquanto supportService.js executa OPERAÇÕES no Firestore.
 *
 * Importável em telas sem carregar nenhuma dependência de rede.
 */
import { Timestamp } from 'firebase/firestore';

// ── Tipos de chamado ──────────────────────────────────────────────────────────

/** Lista de tipos disponíveis para abertura de chamado (exibição em UI). */
export const TICKET_TYPES = [
  { key: 'problema', label: 'Problema / Bug', icon: 'bug-outline' },
  { key: 'sugestao', label: 'Sugestão de melhoria', icon: 'bulb-outline' },
  {
    key: 'configuracao',
    label: 'Configuração da empresa',
    icon: 'settings-outline',
  },
  { key: 'outro', label: 'Outro', icon: 'help-circle-outline' },
];

// ── Status de chamado ─────────────────────────────────────────────────────────

/** Mapa de status → label e cor para exibição na UI. */
export const TICKET_STATUS = {
  aberto: { label: 'Aberto', color: '#3b82f6' },
  em_andamento: { label: 'Em andamento', color: '#f59e0b' },
  aguardando_cliente: { label: 'Aguardando cliente', color: '#8b5cf6' },
  resolvido: { label: 'Resolvido', color: '#22c55e' },
};

/** Transições de status permitidas por estado atual. */
export const TICKET_TRANSITIONS = {
  aberto: ['em_andamento'],
  em_andamento: ['aguardando_cliente', 'resolvido'],
  aguardando_cliente: ['em_andamento'],
  resolvido: ['aberto'],
};

// ── SLA por tipo ──────────────────────────────────────────────────────────────

/**
 * Prazos de SLA (Service Level Agreement) por tipo de chamado, em horas.
 * Controla prioridade, cor e deadlines exibidos no painel de suporte.
 */
export const TICKET_SLA = {
  problema: {
    prioridade: 'Alta',
    prioridadeColor: '#ef4444',
    respostaSuporteH: 2,
    resolucaoH: 12,
    respostaClienteH: 4,
  },
  configuracao: {
    prioridade: 'Média',
    prioridadeColor: '#f59e0b',
    respostaSuporteH: 4,
    resolucaoH: 48,
    respostaClienteH: 8,
  },
  sugestao: {
    prioridade: 'Baixa',
    prioridadeColor: '#22c55e',
    respostaSuporteH: 24,
    resolucaoH: 720,
    respostaClienteH: 48,
  },
  outro: {
    prioridade: 'Média',
    prioridadeColor: '#f59e0b',
    respostaSuporteH: 8,
    resolucaoH: 72,
    respostaClienteH: 24,
  },
};

// ── Utilitários de SLA ────────────────────────────────────────────────────────

/**
 * Calcula o estado visual do SLA a partir de um deadline.
 *
 * @param {import('firebase/firestore').Timestamp | Date | null} deadline
 * @returns {{ status: string, color: string, label: string } | null}
 *   - status: 'ok' | 'atencao' | 'critico' | 'vencido'
 *   - color: cor hexadecimal para exibição
 *   - label: texto legível com tempo restante
 */
export function getSlaInfo(deadline) {
  if (!deadline) return null;
  const d = deadline?.toDate ? deadline.toDate() : new Date(deadline);
  const msLeft = d - Date.now();
  const hLeft = msLeft / 3_600_000;

  if (msLeft <= 0)
    return { status: 'vencido', color: '#ef4444', label: 'Vencido' };
  if (hLeft < 1)
    return {
      status: 'critico',
      color: '#f97316',
      label: `${Math.ceil(hLeft * 60)}min restantes`,
    };
  if (hLeft < 4)
    return {
      status: 'atencao',
      color: '#f59e0b',
      label: `${Math.floor(hLeft)}h ${Math.round(
        (hLeft % 1) * 60,
      )}min restantes`,
    };
  return {
    status: 'ok',
    color: '#22c55e',
    label: `${Math.floor(hLeft)}h restantes`,
  };
}

/**
 * Retorna um Firestore Timestamp correspondente a `h` horas a partir de agora.
 * @param {number} h - Número de horas
 * @returns {import('firebase/firestore').Timestamp}
 */
export function addHours(h) {
  return Timestamp.fromDate(new Date(Date.now() + h * 3_600_000));
}
