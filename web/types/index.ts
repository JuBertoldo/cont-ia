export type Role = "user" | "admin" | "super_admin" | "support";
export type UserStatus = "pending" | "active" | "rejected";
export type TicketStatus = "aberto" | "em_andamento" | "aguardando_cliente" | "resolvido";
export type TicketPriority = "Alta" | "Média" | "Baixa";
export type DatasetStatus = "pendente" | "validado" | "rejeitado";
export type PlanoStatus = "ativo" | "atrasado" | "inadimplente" | "cancelado";
export type Plano = "starter" | "business" | "enterprise";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: Role;
  status: UserStatus;
  empresaId: string;
  photoURL?: string;
  createdAt: Date;
}

export interface Empresa {
  id: string;
  nome: string;
  codigo: string;
  adminUid: string;
  bloqueada?: boolean;
  motivoBloqueio?: string;
  plano?: Plano;
  createdAt: Date;
}

export interface PlanoEmpresa {
  empresaId: string;
  empresaNome: string;
  plano: Plano;
  valor: number;
  vencimento: Date;
  status: PlanoStatus;
  historico: { data: Date; plano: Plano; valor: number }[];
  ultimoPagamento?: Date;
  diasAtraso?: number;
}

export interface LicencaTool {
  id: string;
  nome: string;
  fornecedor: string;
  tipo: "mensal" | "anual" | "por_uso";
  valor: number;
  vencimento: Date;
  status: "ativa" | "vencendo" | "vencida";
  observacao?: string;
}

export interface Chamado {
  id: string;
  numero: string;
  titulo: string;
  descricao: string;
  tipo: "problema" | "sugestao" | "configuracao" | "outro";
  status: TicketStatus;
  prioridade: TicketPriority;
  empresaId: string;
  empresaNome?: string;
  adminId: string;
  adminNome?: string;
  resposta?: string;
  respondidoPor?: string;
  slaRespostaSuporteAt?: Date;
  slaResolucaoAt?: Date;
  primeiraRespostaAt?: Date;
  resolvidoAt?: Date;
  reaberturas: number;
  createdAt: Date;
}

export interface ScanDataset {
  id: string;
  usuarioId: string;
  usuarioNome: string;
  empresaId: string;
  item: string;
  fotoUrl: string;
  detections: { label: string; confidence: number; bbox: number[] }[];
  correcoes: { labelOriginal: string; labelCorrigido: string; confianca: number }[];
  statusDataset: DatasetStatus;
  aiValidacao?: { valid: boolean; suggestedLabel: string; confidence: number; observation: string };
  createdAt: Date;
}

export interface InferenceMetric {
  id: string;
  deviceModel: string;
  platform: string;
  inferenceMs: number;
  yoloCount: number;
  samCount: number;
  success: boolean;
  usuarioId: string;
  empresaId: string;
  createdAt: Date;
}

export interface DetectionStat {
  label: string;
  count: number;
  avgConfidence: number;
  correctionRate: number;
}
