export type UserRole = 'ADMIN' | 'CPI_GESTOR' | 'CPA_GESTOR' | 'AUDITOR';

export interface User {
  id: string;
  name: string;
  login?: string;
  email?: string;
  role: UserRole;
  commandId?: string; // If CPA_GESTOR, specific to a CPA/I
  rank?: string; // e.g. 'Cel QOPM', 'Maj QOPM', 'Cap QOPM'
  registration?: string; // Matrícula PMMA
  active: boolean;
  lastAccess?: string; // '24/08/2026 14:58'
  profileLabel?: string; // 'Administrador (CPI)' or 'CPA/I'
  password?: string;
}

export interface CommandUnit {
  id: string;
  code: string; // 'CPI' | 'CPA/I-1' | 'CPA/I-2' ... 'CPA/I-9'
  name: string;
  headquarters: string; // e.g., 'São Luís', 'Bacabal', 'Imperatriz', etc.
  subunits: string[]; // e.g., ['23º BPM', '15º BPM', '39º BPM']
  commanderName: string;
  commanderRank: string;
  active: boolean;
}

export interface OrdinancePeriod {
  id: string;
  name?: string; // 'Portaria 122/2026 – ago/set 2026'
  number: string; // e.g., '122/2026 – GCG'
  year: number;
  seiProcess?: string; // '2026.190110.35458'
  seiDocument?: string; // '016909457'
  startDate: string; // '2026-08-20'
  endDate: string; // '2026-09-21'
  unitValueJoe: number; // R$ 350.00
  monthlyIndividualLimit: number; // 12 JOEs
  maxDurationHours: number; // 6h
  totalBudget: number; // R$ 660,100.00
  totalPlannedJoes: number; // 1,886
  status: 'VIGENTE' | 'ENCERRADA' | 'RASCUNHO' | 'SUSPENSA';
  notes?: string;
  createdAt: string;
}

export interface CommandBudget {
  id: string;
  ordinanceId: string;
  commandId: string; // 'CPA/I-1' etc.
  plannedJoes: number;
  budgetAmount: number; // e.g. R$ 65,100.00
  committedAmount: number; // Em análise ou aprovado
  executedAmount: number; // Executado/Consolidado/Pago
  availableBalance: number; // budgetAmount - (committed + executed)
  usedJoesCount: number;
}

export type OperationStatus =
  | 'RASCUNHO'
  | 'PENDENTE_ANALISE'
  | 'EM_ANALISE'
  | 'APROVADO'
  | 'DEVOLVIDO_CORRECAO'
  | 'REJEITADO'
  | 'EXECUTADO'
  | 'AGUARDANDO_CONFERENCIA'
  | 'CONSOLIDADO'
  | 'ENCAMINHADO_PAGADORIA'
  | 'CANCELADO';

export interface PoliceOfficer {
  id: string;
  name: string;
  rank: string; // Cel, Ten-Cel, Maj, Cap, 1º Ten, 2º Ten, SubTen, 1º Sgt, 2º Sgt, 3º Sgt, Cb, Sd
  registration: string; // Matrícula
  cpf: string;
  unit: string; // e.g., '23º BPM'
  commandId: string; // 'CPA/I-1'
  monthlyJoesCount: number; // Current count for active period
  status: 'APTO' | 'LTS' | 'FERIAS' | 'REST_MEDICA' | 'SANC_DISCIPLINAR' | 'RESERVA';
  statusReason?: string;
}

export interface OperationOfficerEntry {
  officerId: string;
  officerName: string;
  rank: string;
  registration: string;
  cpf: string;
  roleInMission: string; // 'Comandante da Patrulha', 'Patrulheiro', 'Motorista'
  joesCount: number; // usually 1
  value: number; // e.g. R$ 350.00
}

export interface SeiChecklist {
  operationalJustification: boolean; // Justificativa fundamentada
  serviceOrOperationOrder: boolean; // OS ou OO válida
  budgetCompatibilityDeclaration: boolean; // Declaração de compatibilidade orçamentária
  cpiPriorAuthorization: boolean; // Autorização prévia expressa do Comandante do CPI
  priorNominalRoster: boolean; // Escala prévia nominal no SEI
  commanderDutyFreeDeclaration: boolean; // Declaração de folga regulamentar e não-sobreposição
  reneReportAttached: boolean; // RENE anexado após missão
  presenceControlVerified: boolean; // Confrontação com CIOPS / Relatório de Apresentação
}

export interface OperationLaunch {
  id: string;
  launchNumber: string; // e.g., '54545' or 'JOE-2026-001'
  commandId: string; // 'CPI - Direção Setorial' | 'CPA/I-1' | ...
  subUnit: string; // 'CPI - Direção Setorial' | '15º BPM' | ...
  ordinanceId: string;
  justification?: string; // 'Necessidade operacional que motivou o emprego extraordinário'
  orderType?: 'ORDEM_DE_SERVICO' | 'ORDEM_DE_OPERACAO';
  orderNumber: string; // e.g., '54545' or 'Ordem de Serviço nº 000/2026'
  eventName: string; // '454545454545' / 'Operação Impacto'
  eventSubtext?: string; // 'ghgh'
  serviceDate: string; // '2026-08-22'
  startTime?: string; // '20h às 02h' or '22:00'
  endTime?: string; // '04:00'
  calculatedDurationHours?: number; // 6
  serviceOrderLink?: string; // 'https://...'
  authorizeExcess?: boolean; // Art. 17, §3º
  location?: string;
  officersCount: number; // 26
  joesPerOfficer?: number; // 1
  unitValue: number; // R$ 350.00
  totalValue: number; // R$ 9.100,00
  status: OperationStatus;
  seiProcessNumber: string; // e.g., '224245245454545'
  seiDocumentNumber?: string;
  officers?: OperationOfficerEntry[];
  checklist?: SeiChecklist;
  notes?: string;
  rejectionReason?: string;
  correctionFeedback?: string;
  batchConsolidationId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyBatchConsolidation {
  id: string;
  batchNumber: string; // e.g., 'LOTE-SEM-34/2026'
  weekStartDate: string;
  weekEndDate: string;
  consolidationDate: string; // Always Tuesday as per Art. 13, V
  ordinanceId: string;
  seiProcess: string;
  seiDispatchNumber: string;
  responsibleUser: string;
  status: 'EM_CONFERENCIA' | 'ENCAMINHADO_PAGADORIA' | 'LIQUIDADO' | 'CANCELADO';
  totalOperationsCount: number;
  totalOfficersCount: number;
  totalJoesCount: number;
  totalFinancialAmount: number;
  cpaBreakdown: {
    commandId: string;
    operationsCount: number;
    officersCount: number;
    joesCount: number;
    amount: number;
  }[];
  operationsIds: string[];
  createdAt: string;
}

export interface Irregularity {
  id: string;
  code: string; // 'IRR-2026-001'
  commandId: string;
  subUnit?: string;
  operationId?: string;
  officerId?: string;
  officerName?: string;
  identifiedBy: string;
  identificationDate: string;
  title: string;
  description: string;
  severity: 'BAIXA' | 'MEDIA' | 'ALTA' | 'GRAVE';
  status: 'ABERTA' | 'EM_ANALISE' | 'AGUARDANDO_ESCLARECIMENTO' | 'RESOLVIDA' | 'ENCAMINHADA_COMANDO_GERAL';
  actionTaken?: string;
  seiProcess?: string;
  reportedToComandoGeralDate?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string; // e.g. '24/08/2026 14:58' or ISO
  userName: string; // 'admin' | 'Cb Osaias'
  userRole?: string;
  action: 'login' | 'logout' | 'criar' | 'editar' | 'excluir' | 'salvar_tetos' | 'CRIACAO' | 'EDICAO' | 'EXCLUSAO' | 'APROVACAO' | 'REJEICAO' | 'DEVOLUCAO' | 'AJUSTE_COTA' | 'CONSOLIDACAO' | 'ENCAMINHAMENTO_PAGADORIA' | 'REGISTRO_IRREGULARIDADE' | 'AUDITORIA_MULTI_UNIDADES';
  module?: 'OPERACOES' | 'ORCAMENTO' | 'PORTARIAS' | 'CONSOLIDACAO' | 'EFETIVO' | 'IRREGULARIDADES' | 'SISTEMA';
  recordId: string; // e.g. 'usuarios #1' | 'lancamentos #2'
  previousValue?: string;
  newValue?: string;
  description: string; // e.g. 'cpi.admin' | '454545454545 · 26 JOEs · R$ 9.100,00'
  ipAddress?: string; // '45.190.120.91' | '2804:...'
}
