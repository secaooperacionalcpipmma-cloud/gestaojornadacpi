import { CommandUnit, OrdinancePeriod, User } from './index';

export type AuditDocumentType =
  | 'OFICIO_SOLICITACAO'
  | 'ORDEM_SERVICO_OPERACAO'
  | 'ESCALA_NOMINAL'
  | 'RENE_RELATORIO_EXECUCAO'
  | 'RELATORIO_OPERACIONAL'
  | 'PLANILHA_UNICA_PAGADORIA';

export interface AuditDocumentSlot {
  type: AuditDocumentType;
  title: string;
  shortTitle: string;
  description: string;
  legalArticle: string;
  requiredForAudit: boolean;
  content: string;
  fileName?: string;
  fileType?: 'PDF' | 'EXCEL' | 'WORD' | 'TEXT' | 'DESCONHECIDO';
  fileSizeBytes?: number;
  pageCount?: number;
  sheetCount?: number;
  uploadedAt?: string;
  extractedData?: ExtractedDocumentData;
}

export interface ExtractedOfficer {
  name: string;
  rank: string;
  registration: string;
  cpf: string;
  unit?: string;
  role?: string;
  joesCount: number;
  value: number;
}

export interface ExtractedDocumentData {
  documentNumber?: string;
  processSei?: string;
  commandId?: string; // e.g. 'CPA/I-3'
  subUnit?: string; // e.g. '3º BPM'
  eventName?: string;
  serviceDate?: string;
  startTime?: string;
  endTime?: string;
  calculatedHours?: number;
  officersCount?: number;
  unitValue?: number;
  totalFinancialValue?: number;
  location?: string;
  signatories?: string[];
  officersList?: ExtractedOfficer[];
  rawText?: string;
}

export type AuditSeverity = 'INFO' | 'AVISO' | 'IRREGULARIDADE_LEVE' | 'IRREGULARIDADE_GRAVE';

export interface AuditDiscrepancy {
  id: string;
  field: string;
  title: string;
  description: string;
  legalBasis: string; // e.g. 'Art. 3º e Art. 17 da Portaria nº 122/2026-GCG'
  severity: AuditSeverity;
  documentsInvolved: AuditDocumentType[];
  expectedValue?: string;
  foundValues?: Record<string, string>;
  remedyAction: string; // O que a UPM deve fazer para corrigir
}

export interface AuditRuleCheck {
  id: string;
  category: 'TURNO_HORAS' | 'VALORES_PORTARIA' | 'COINCIDENCIA_DADOS' | 'EFETIVO_PESSOAL' | 'LIMITES_LEGAIS' | 'DOCUMENTACAO_SEI';
  title: string;
  description: string;
  legalArticle: string;
  status: 'CONFORME' | 'INCONSISTENTE' | 'NAO_APLICAVEL' | 'PENDENTE_DOCUMENTO';
  details: string;
}

export interface DocumentAuditResult {
  id: string;
  auditDate: string;
  auditorName: string;
  selectedCommandId: string; // 'CPA/I-3'
  ordinanceNumber: string;
  ordinanceUnitValue: number;
  status: 'APROVADO_CONFORME' | 'REPROVADO_PENDENCIAS' | 'EM_ANALISE';
  documentsLoadedCount: number;
  loadedDocumentTypes: AuditDocumentType[];
  ruleChecks: AuditRuleCheck[];
  discrepancies: AuditDiscrepancy[];
  extractedSummary: {
    eventName?: string;
    subUnit?: string;
    dates?: string[];
    hoursRange?: string;
    durationHours?: number;
    officersCount?: number;
    totalAmount?: number;
    unitValue?: number;
    location?: string;
  };
  sideBySideComparison: {
    field: string;
    label: string;
    portariaRef?: string;
    valuesByDoc: Partial<Record<AuditDocumentType, string>>;
    isMatch: boolean;
  }[];
  seiDraftDispatch: string;
}

export interface UnitAuditSummary {
  commandId: string; // e.g. 'CPA/I-1'
  commandName: string;
  orderNumber: number; // For ascending order: 1, 2, 3... 9, 10
  status: 'APROVADO_CONFORME' | 'REPROVADO_PENDENCIAS' | 'SEM_DOCUMENTOS';
  documentsLoadedCount: number;
  discrepanciesCount: number;
  totalOfficers: number;
  totalAmount: number;
  durationHours?: number;
  eventName?: string;
  subUnit?: string;
  discrepancies: AuditDiscrepancy[];
  ruleChecks: AuditRuleCheck[];
  result?: DocumentAuditResult;
}

export interface MultiUnitAuditResult {
  id: string;
  auditDate: string;
  auditorName: string;
  ordinanceNumber: string;
  ordinanceUnitValue: number;
  selectedCommandIds: string[];
  unitSummaries: UnitAuditSummary[]; // Sorted in ascending order (CPA/I-1 to CPA/I-9, CPI)
  overallStatus: 'APROVADO_CONFORME' | 'REPROVADO_PENDENCIAS' | 'PARCIAL_COM_PENDENCIAS';
  totalUnitsAudited: number;
  approvedUnitsCount: number;
  pendingUnitsCount: number;
  emptyUnitsCount: number;
  totalDiscrepanciesCount: number;
  totalOfficersAllUnits: number;
  totalAmountAllUnits: number;
  consolidatedSeiDispatch: string;
}
