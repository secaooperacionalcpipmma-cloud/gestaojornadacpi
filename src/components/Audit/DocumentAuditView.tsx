import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Building2,
  Clock,
  DollarSign,
  Users,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Table,
  Layers,
  ArrowRight,
  Info,
  Calendar,
  MapPin,
  FileSpreadsheet,
  FileType,
  Loader2,
  Trash2,
  UploadCloud,
  File as FileIcon,
  Filter,
  CheckSquare,
  Square,
  ListFilter,
  Eye,
  RefreshCw,
  Edit3,
  X,
  Printer,
  Download,
  FileCode,
  Shield,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import {
  AuditDocumentType,
  AuditDocumentSlot,
  DocumentAuditResult,
  MultiUnitAuditResult,
  UnitAuditSummary,
} from '../../types/auditTypes';
import { OrdinancePeriod, CommandUnit, User } from '../../types';
import {
  AUDIT_DOCUMENT_DEFINITIONS,
  performDocumentAudit,
  performMultiUnitAudit,
  getCommandSortOrder,
  DEFAULT_UNIT_DOCUMENTS,
  AUDIT_SAMPLES,
} from '../../services/documentAuditService';
import { extractTextFromAnyFile, ExtractedFileResult } from '../../utils/fileExtractors';
import { formatCurrencyBRL } from '../../utils/formatters';
import { storageService } from '../../services/storageService';

interface DocumentAuditViewProps {
  ordinance: OrdinancePeriod;
  commands: CommandUnit[];
  currentUser: User;
  onAuditSaved?: (result: DocumentAuditResult | MultiUnitAuditResult) => void;
}

// Fixed 10 units defined in the PMMA/CPI structure matching official guidelines
interface UnitRowConfig {
  code: string; // e.g. 'CPI', 'CPA/I-1', 'CPA/I-2'...
  standardCode: string; // e.g. 'CPI', 'CPA/I-1', 'CPA/I-2'...
  label: string; // e.g. 'CPI', 'CPA/I-1', 'CPA/I-2'...
  name: string; // Headquarters or region
}

const AUDIT_UNITS_MATRIX: UnitRowConfig[] = [
  { code: 'CPI', standardCode: 'CPI', label: 'CPI', name: 'Comando do Interior (São Luís / Eixo Central)' },
  { code: 'CPA/I-1', standardCode: 'CPA/I-1', label: 'CPA/I-1', name: 'Rosário e Região dos Lençóis' },
  { code: 'CPA/I-2', standardCode: 'CPA/I-2', label: 'CPA/I-2', name: 'Bacabal e Médio Mearim' },
  { code: 'CPA/I-3', standardCode: 'CPA/I-3', label: 'CPA/I-3', name: 'Imperatriz e Região Tocantina' },
  { code: 'CPA/I-4', standardCode: 'CPA/I-4', label: 'CPA/I-4', name: 'Caxias e Leste Maranhense' },
  { code: 'CPA/I-5', standardCode: 'CPA/I-5', label: 'CPA/I-5', name: 'Pinheiro e Baixada Maranhense' },
  { code: 'CPA/I-6', standardCode: 'CPA/I-6', label: 'CPA/I-6', name: 'Chapadinha e Baixo Parnaíba' },
  { code: 'CPA/I-7', standardCode: 'CPA/I-7', label: 'CPA/I-7', name: 'Codó e Região dos Cocais' },
  { code: 'CPA/I-8', standardCode: 'CPA/I-8', label: 'CPA/I-8', name: 'Gov. Nunes Freire e Alto Turi' },
  { code: 'CPA/I-9', standardCode: 'CPA/I-9', label: 'CPA/I-9', name: 'Balsas e Sul Maranhense' },
];

// Columns matching the official PMMA matrix: OFÍCIO, O.S OU ORDEM, ESCALA, RENE, RELATÓRIO, PLANILHA ÚNICA
interface ColumnDef {
  type: AuditDocumentType;
  headerLabel: string;
  buttonLabel: string;
  description: string;
  legalArticle: string;
}

const MATRIX_COLUMNS: ColumnDef[] = [
  {
    type: 'OFICIO_SOLICITACAO',
    headerLabel: 'OFÍCIO',
    buttonLabel: 'CARREGAR OFÍCIO',
    description: 'Ofício de Solicitação de JOE do CPA/I',
    legalArticle: 'Art. 1º, § 1º e Art. 4º',
  },
  {
    type: 'ORDEM_SERVICO_OPERACAO',
    headerLabel: 'O.S OU ORDEM',
    buttonLabel: 'CARREGAR O.S OU ORD.',
    description: 'Ordem de Serviço (OS) ou Ordem de Operação (OO)',
    legalArticle: 'Art. 4º, II e Art. 11, II',
  },
  {
    type: 'ESCALA_NOMINAL',
    headerLabel: 'ESCALA',
    buttonLabel: 'CARREGAR ESCALA',
    description: 'Escala de Serviço Extraordinária Nominal no SEI',
    legalArticle: 'Art. 6º',
  },
  {
    type: 'RENE_RELATORIO_EXECUCAO',
    headerLabel: 'RENE',
    buttonLabel: 'CARREGAR RENE',
    description: 'Relatório de Execução de JOE (RENE - Art. 10)',
    legalArticle: 'Art. 10 e Art. 11, III',
  },
  {
    type: 'RELATORIO_OPERACIONAL',
    headerLabel: 'RELATÓRIO',
    buttonLabel: 'CARREGAR RELATÓRIO',
    description: 'Relatório Operacional / Missão e Ocorrências',
    legalArticle: 'Art. 11, IV',
  },
  {
    type: 'PLANILHA_UNICA_PAGADORIA',
    headerLabel: 'PLANILHA ÚNICA',
    buttonLabel: 'CARREGAR PLANILHA',
    description: 'Planilha Única Consolidada de Liquidação (DGP)',
    legalArticle: 'Art. 11, V e Parágrafo Único',
  },
];

export const DocumentAuditView: React.FC<DocumentAuditViewProps> = ({
  ordinance,
  commands,
  currentUser,
  onAuditSaved,
}) => {
  // Navigation: Dual Mode (Direct Single Unit Cross-Audit vs Full 10-Unit Matrix Batch Audit)
  const [viewMode, setViewMode] = useState<'SINGLE_UNIT' | 'MATRIX_BATCH'>('SINGLE_UNIT');

  // Active Unit for Single Unit Cross-Audit
  const [activeUnitCode, setActiveUnitCode] = useState<string>('CPA/I-3');

  // Selected units to include in the matrix audit batch (fixed to correctly match AUDIT_UNITS_MATRIX)
  const [selectedUnitCodes, setSelectedUnitCodes] = useState<string[]>(() =>
    AUDIT_UNITS_MATRIX.map((u) => u.code)
  );

  // Documents matrix state: Record<UnitCode, Record<AuditDocumentType, AuditDocumentSlot>>
  const [documentsMatrix, setDocumentsMatrix] = useState<
    Record<string, Record<AuditDocumentType, AuditDocumentSlot>>
  >(() => {
    const matrix: Record<string, Record<AuditDocumentType, AuditDocumentSlot>> = {};

    AUDIT_UNITS_MATRIX.forEach((u) => {
      matrix[u.code] = {} as Record<AuditDocumentType, AuditDocumentSlot>;
      const defaultDocs =
        DEFAULT_UNIT_DOCUMENTS[u.standardCode] || DEFAULT_UNIT_DOCUMENTS[u.code] || {};

      MATRIX_COLUMNS.forEach((col) => {
        const prefill = defaultDocs[col.type] || '';
        matrix[u.code][col.type] = {
          type: col.type,
          title: col.headerLabel,
          shortTitle: col.headerLabel,
          description: col.description,
          legalArticle: col.legalArticle,
          requiredForAudit: false,
          content: prefill,
          fileName: prefill
            ? `${col.headerLabel.replace(/\s+/g, '_')}_${u.code.replace(/[^a-zA-Z0-9]/g, '')}.${
                col.type === 'PLANILHA_UNICA_PAGADORIA'
                  ? 'xlsx'
                  : col.type === 'ORDEM_SERVICO_OPERACAO'
                  ? 'docx'
                  : 'pdf'
              }`
            : undefined,
          fileType: prefill
            ? col.type === 'PLANILHA_UNICA_PAGADORIA'
              ? 'EXCEL'
              : col.type === 'ORDEM_SERVICO_OPERACAO'
              ? 'WORD'
              : 'PDF'
            : undefined,
        };
      });
    });

    return matrix;
  });

  // Single Unit Audit Result State
  const [singleAuditResult, setSingleAuditResult] = useState<DocumentAuditResult | null>(null);

  // Multi Unit Audit Result State
  const [multiAuditResult, setMultiAuditResult] = useState<MultiUnitAuditResult | null>(null);

  // Filter state for ascending table
  const [activeFilterStatus, setActiveFilterStatus] = useState<'TODOS' | 'APROVADOS' | 'PENDENCIAS'>('TODOS');
  const [selectedUnitDetail, setSelectedUnitDetail] = useState<UnitAuditSummary | null>(null);

  // Modal editor / viewer state for document contents
  const [modalCell, setModalCell] = useState<{ unitCode: string; colType: AuditDocumentType } | null>(null);
  const [modalEditText, setModalEditText] = useState<string>('');

  // Drag over tracking
  const [dragOverCellKey, setDragOverCellKey] = useState<string | null>(null);

  // File loading & audit execution states
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Hidden file input references mapped by cell key
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploadTarget, setPendingUploadTarget] = useState<{
    unitCode: string;
    colType: AuditDocumentType;
  } | null>(null);

  // Auto-run initial audits on mount
  useEffect(() => {
    // 1. Run single audit for initial unit (CPA/I-3)
    runSingleUnitAuditInternal('CPA/I-3', documentsMatrix);

    // 2. Run multi-unit batch audit
    runMultiUnitAuditInternal(documentsMatrix);
  }, []);

  // Helper to run single audit
  const runSingleUnitAuditInternal = (
    unitCode: string,
    currentMatrix: Record<string, Record<AuditDocumentType, AuditDocumentSlot>>
  ) => {
    const unitSlotsObj = currentMatrix[unitCode] || {};
    const slotsArray: AuditDocumentSlot[] = MATRIX_COLUMNS.map((col) => unitSlotsObj[col.type]);

    try {
      const result = performDocumentAudit(slotsArray, unitCode, ordinance, currentUser.name);
      setSingleAuditResult(result);
    } catch (e) {
      console.warn('Erro na auditoria individual:', e);
    }
  };

  // Helper to run multi-unit batch audit
  const runMultiUnitAuditInternal = (
    currentMatrix: Record<string, Record<AuditDocumentType, AuditDocumentSlot>>
  ) => {
    const unitDocsMap: Record<string, AuditDocumentSlot[]> = {};

    AUDIT_UNITS_MATRIX.forEach((u) => {
      const slotsObj = currentMatrix[u.code] || {};
      const slotsArray: AuditDocumentSlot[] = MATRIX_COLUMNS.map((col) => slotsObj[col.type]);
      unitDocsMap[u.standardCode] = slotsArray;
      unitDocsMap[u.code] = slotsArray;
    });

    const targetStandardCodes = AUDIT_UNITS_MATRIX.map((u) => u.standardCode);

    try {
      const result = performMultiUnitAudit(
        targetStandardCodes,
        unitDocsMap,
        commands,
        ordinance,
        currentUser.name
      );

      setMultiAuditResult(result);
      if (result.unitSummaries.length > 0 && !selectedUnitDetail) {
        setSelectedUnitDetail(result.unitSummaries[0]);
      }
    } catch (e) {
      console.warn('Erro na auditoria multi-unidades:', e);
    }
  };

  // Trigger file upload dialog
  const handleTriggerUpload = (unitCode: string, colType: AuditDocumentType) => {
    setPendingUploadTarget({ unitCode, colType });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Process uploaded file
  const handleProcessUploadedFile = async (
    unitCode: string,
    colType: AuditDocumentType,
    file: File
  ) => {
    setIsProcessingFile(true);
    setProcessingStatus(`Lendo ${file.name} para ${unitCode}...`);

    try {
      const extracted: ExtractedFileResult = await extractTextFromAnyFile(file);

      const updatedMatrix = { ...documentsMatrix };
      const unitMap = { ...(updatedMatrix[unitCode] || {}) };
      unitMap[colType] = {
        ...unitMap[colType],
        content: extracted.text,
        fileName: file.name,
        fileType: extracted.fileType,
        fileSizeBytes: extracted.fileSizeBytes,
        pageCount: extracted.pageCount,
        sheetCount: extracted.sheetCount,
        uploadedAt: new Date().toISOString(),
      };
      updatedMatrix[unitCode] = unitMap;
      setDocumentsMatrix(updatedMatrix);

      // Re-run audits automatically
      runSingleUnitAuditInternal(activeUnitCode, updatedMatrix);
      runMultiUnitAuditInternal(updatedMatrix);
    } catch (err) {
      console.error('Erro ao ler arquivo:', err);
      alert(`Falha ao ler o arquivo ${file.name}.`);
    } finally {
      setIsProcessingFile(false);
      setProcessingStatus('');
      setPendingUploadTarget(null);
    }
  };

  // Clear a single document slot
  const handleClearCell = (unitCode: string, colType: AuditDocumentType) => {
    const updatedMatrix = { ...documentsMatrix };
    const unitMap = { ...(updatedMatrix[unitCode] || {}) };
    unitMap[colType] = {
      ...unitMap[colType],
      content: '',
      fileName: undefined,
      fileType: undefined,
      fileSizeBytes: undefined,
      pageCount: undefined,
      sheetCount: undefined,
      uploadedAt: undefined,
    };
    updatedMatrix[unitCode] = unitMap;
    setDocumentsMatrix(updatedMatrix);

    runSingleUnitAuditInternal(activeUnitCode, updatedMatrix);
    runMultiUnitAuditInternal(updatedMatrix);
  };

  // Clear all documents for the active unit
  const handleClearActiveUnitDocs = () => {
    const updatedMatrix = { ...documentsMatrix };
    updatedMatrix[activeUnitCode] = {} as Record<AuditDocumentType, AuditDocumentSlot>;
    MATRIX_COLUMNS.forEach((col) => {
      updatedMatrix[activeUnitCode][col.type] = {
        type: col.type,
        title: col.headerLabel,
        shortTitle: col.headerLabel,
        description: col.description,
        legalArticle: col.legalArticle,
        requiredForAudit: false,
        content: '',
      };
    });
    setDocumentsMatrix(updatedMatrix);

    runSingleUnitAuditInternal(activeUnitCode, updatedMatrix);
    runMultiUnitAuditInternal(updatedMatrix);
  };

  // Load sample 100% OK documents for active unit
  const handleLoadSampleOK = () => {
    const sample = AUDIT_SAMPLES.IMPERATRIZ_3BPM_SUCCESS.documents;
    const updatedMatrix = { ...documentsMatrix };
    const unitMap = { ...(updatedMatrix[activeUnitCode] || {}) };

    MATRIX_COLUMNS.forEach((col) => {
      const text = sample[col.type as keyof typeof sample] || '';
      unitMap[col.type] = {
        ...unitMap[col.type],
        content: text,
        fileName: text ? `${col.headerLabel}_Imperatriz_Conforme.pdf` : undefined,
        fileType: text ? (col.type === 'PLANILHA_UNICA_PAGADORIA' ? 'EXCEL' : 'PDF') : undefined,
      };
    });

    updatedMatrix[activeUnitCode] = unitMap;
    setDocumentsMatrix(updatedMatrix);

    runSingleUnitAuditInternal(activeUnitCode, updatedMatrix);
    runMultiUnitAuditInternal(updatedMatrix);
  };

  // Load sample with intentional discrepancies (violations) for active unit
  const handleLoadSampleDiscrepant = () => {
    const sample = AUDIT_SAMPLES.WITH_DISCREPANCIES.documents;
    const updatedMatrix = { ...documentsMatrix };
    const unitMap = { ...(updatedMatrix[activeUnitCode] || {}) };

    MATRIX_COLUMNS.forEach((col) => {
      const text = sample[col.type as keyof typeof sample] || '';
      unitMap[col.type] = {
        ...unitMap[col.type],
        content: text,
        fileName: text ? `${col.headerLabel}_Bacabal_Inconsistente.pdf` : undefined,
        fileType: text ? (col.type === 'PLANILHA_UNICA_PAGADORIA' ? 'EXCEL' : 'PDF') : undefined,
      };
    });

    updatedMatrix[activeUnitCode] = unitMap;
    setDocumentsMatrix(updatedMatrix);

    runSingleUnitAuditInternal(activeUnitCode, updatedMatrix);
    runMultiUnitAuditInternal(updatedMatrix);
  };

  // Load entire realistic matrix for all 10 units
  const handleLoadSampleDataAll = () => {
    const updatedMatrix: Record<string, Record<AuditDocumentType, AuditDocumentSlot>> = {};

    AUDIT_UNITS_MATRIX.forEach((u) => {
      updatedMatrix[u.code] = {} as Record<AuditDocumentType, AuditDocumentSlot>;
      const defaultDocs =
        DEFAULT_UNIT_DOCUMENTS[u.standardCode] || DEFAULT_UNIT_DOCUMENTS[u.code] || {};

      MATRIX_COLUMNS.forEach((col) => {
        const prefill = defaultDocs[col.type] || '';
        updatedMatrix[u.code][col.type] = {
          type: col.type,
          title: col.headerLabel,
          shortTitle: col.headerLabel,
          description: col.description,
          legalArticle: col.legalArticle,
          requiredForAudit: false,
          content: prefill,
          fileName: prefill
            ? `${col.headerLabel.replace(/\s+/g, '_')}_${u.code.replace(/[^a-zA-Z0-9]/g, '')}.pdf`
            : undefined,
          fileType: prefill
            ? col.type === 'PLANILHA_UNICA_PAGADORIA'
              ? 'EXCEL'
              : col.type === 'ORDEM_SERVICO_OPERACAO'
              ? 'WORD'
              : 'PDF'
            : undefined,
        };
      });
    });

    setDocumentsMatrix(updatedMatrix);
    runSingleUnitAuditInternal(activeUnitCode, updatedMatrix);
    runMultiUnitAuditInternal(updatedMatrix);
  };

  // Clear all matrix
  const handleClearAllMatrix = () => {
    if (!confirm('Deseja limpar todos os documentos carregados em todas as 10 unidades?')) return;

    const updatedMatrix: Record<string, Record<AuditDocumentType, AuditDocumentSlot>> = {};
    AUDIT_UNITS_MATRIX.forEach((u) => {
      updatedMatrix[u.code] = {} as Record<AuditDocumentType, AuditDocumentSlot>;
      MATRIX_COLUMNS.forEach((col) => {
        updatedMatrix[u.code][col.type] = {
          type: col.type,
          title: col.headerLabel,
          shortTitle: col.headerLabel,
          description: col.description,
          legalArticle: col.legalArticle,
          requiredForAudit: false,
          content: '',
        };
      });
    });

    setDocumentsMatrix(updatedMatrix);
    runSingleUnitAuditInternal(activeUnitCode, updatedMatrix);
    runMultiUnitAuditInternal(updatedMatrix);
  };

  // Open modal editor for a specific cell
  const handleOpenCellModal = (unitCode: string, colType: AuditDocumentType) => {
    const slot = documentsMatrix[unitCode]?.[colType];
    setModalEditText(slot?.content || '');
    setModalCell({ unitCode, colType });
  };

  // Save modal edit
  const handleSaveModalEdit = () => {
    if (!modalCell) return;
    const { unitCode, colType } = modalCell;

    const updatedMatrix = { ...documentsMatrix };
    const unitMap = { ...(updatedMatrix[unitCode] || {}) };
    unitMap[colType] = {
      ...unitMap[colType],
      content: modalEditText,
      fileType: modalEditText.trim() ? unitMap[colType].fileType || 'TEXT' : undefined,
      fileName: modalEditText.trim()
        ? unitMap[colType].fileName || `Texto_${colType}.txt`
        : undefined,
    };
    updatedMatrix[unitCode] = unitMap;
    setDocumentsMatrix(updatedMatrix);

    setModalCell(null);
    runSingleUnitAuditInternal(activeUnitCode, updatedMatrix);
    runMultiUnitAuditInternal(updatedMatrix);
  };

  // Toggle selection in matrix batch
  const handleToggleUnitSelection = (unitCode: string) => {
    setSelectedUnitCodes((prev) =>
      prev.includes(unitCode) ? prev.filter((c) => c !== unitCode) : [...prev, unitCode]
    );
  };

  const handleSelectAllUnits = () => {
    setSelectedUnitCodes(AUDIT_UNITS_MATRIX.map((u) => u.code));
  };

  const handleDeselectAllUnits = () => {
    setSelectedUnitCodes([]);
  };

  // Drag & drop handlers
  const handleCellDragOver = (e: React.DragEvent, cellKey: string) => {
    e.preventDefault();
    setDragOverCellKey(cellKey);
  };

  const handleCellDragLeave = () => {
    setDragOverCellKey(null);
  };

  const handleCellDrop = (
    e: React.DragEvent,
    unitCode: string,
    colType: AuditDocumentType
  ) => {
    e.preventDefault();
    setDragOverCellKey(null);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleProcessUploadedFile(unitCode, colType, files[0]);
    }
  };

  // Count loaded documents for a unit
  const getLoadedCountForUnit = (unitCode: string) => {
    const slots = documentsMatrix[unitCode] || {};
    return (Object.values(slots) as AuditDocumentSlot[]).filter(
      (s) => s.content && s.content.trim().length > 0
    ).length;
  };

  // Explicit Execution Handlers
  const handleRunAudit = () => {
    setIsAuditing(true);

    setTimeout(() => {
      runSingleUnitAuditInternal(activeUnitCode, documentsMatrix);
      runMultiUnitAuditInternal(documentsMatrix);
      setIsAuditing(false);

      if (multiAuditResult && onAuditSaved) {
        onAuditSaved(multiAuditResult);
      }
    }, 250);
  };

  // Copy plain text
  const handleCopyText = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  // Copy single unit parecer
  const handleCopyUnitParecer = (summary: UnitAuditSummary | DocumentAuditResult) => {
    const dateStr = new Date().toLocaleDateString('pt-BR');
    let textToCopy = '';

    if ('seiDraftDispatch' in summary && summary.seiDraftDispatch) {
      textToCopy = summary.seiDraftDispatch;
    } else {
      const s = summary as UnitAuditSummary;
      if (s.status === 'APROVADO_CONFORME') {
        textToCopy = `[PARECER DE AUDITORIA DE CONFORMIDADE - PMMA / CPI]
UNIDADE: ${s.commandId} (${s.commandName})
OPERAÇÃO / EVENTO: ${s.eventName || 'Operação de JOE'}
ORDEM: #${s.orderNumber.toString().padStart(2, '0')}
TURNO: ${s.durationHours || 6} horas (Em estrita conformidade com o teto de 6h da Portaria nº ${ordinance.number})
EFETIVO: ${s.totalOfficers} Policiais Militares
VALOR TOTAL: ${formatCurrencyBRL(s.totalAmount)}
STATUS: APROVADO / 100% CONFORME

PARECER CONCLUSIVO:
A documentação apresentada foi auditada e cumpre rigorosamente os preceitos e diretrizes fixados na Portaria nº ${ordinance.number} - GCG/PMMA. Processo regular e autorizado para liquidação e pagamento de JOE.

Auditor Responsável: ${currentUser.name} | Data: ${dateStr}`;
      } else {
        const discLines = s.discrepancies
          .map(
            (d, idx) =>
              `${idx + 1}. [${d.title}]
• Descrição da Inconsistência: ${d.description}
• Base Legal: ${d.legalBasis}
• Ação Saneadora Necessária: ${d.remedyAction}`
          )
          .join('\n\n');

        textToCopy = `[PARECER DE AUDITORIA - DISCRIMINAÇÃO DE PENDÊNCIAS - PMMA / CPI]
UNIDADE: ${s.commandId} (${s.commandName})
OPERAÇÃO / EVENTO: ${s.eventName || 'Operação de JOE'}
STATUS: REPROVADO COM PENDÊNCIAS (${s.discrepanciesCount} Inconsistência(s))
DATA DA AUDITORIA: ${dateStr}
AUDITOR RESPONSÁVEL: ${currentUser.name}

============================================================
DISCRIMINAÇÃO DETALHADA DAS PENDÊNCIAS IDENTIFICADAS:
============================================================
${discLines}

============================================================
DETERMINAÇÃO / ENCAMINHAMENTO:
Necessário saneamento e retificação das pendências apontadas pela UPM antes do prosseguimento para liquidação na DGP.`;
      }
    }

    navigator.clipboard.writeText(textToCopy);
    setCopiedSection(`PARECER_${'commandId' in summary ? summary.commandId : summary.selectedCommandId}`);
    setTimeout(() => setCopiedSection(null), 3000);
  };

  // Copy Formatted Comparison Table for Word / Google Docs
  const handleCopyComparisonTableHTML = () => {
    if (!singleAuditResult) return;

    const rows = singleAuditResult.sideBySideComparison
      .map(
        (row) => `
        <tr style="background-color: ${row.isMatch ? '#f0fdf4' : '#fef2f2'}; border: 1px solid #cbd5e1;">
          <td style="padding: 8px; font-weight: bold; color: #002D5A; border: 1px solid #cbd5e1;">${row.label}</td>
          <td style="padding: 8px; font-size: 8pt; color: #475569; border: 1px solid #cbd5e1;">${row.portariaRef || '—'}</td>
          ${MATRIX_COLUMNS.map(
            (col) => `
            <td style="padding: 8px; text-align: center; border: 1px solid #cbd5e1; font-size: 8.5pt;">
              ${row.valuesByDoc[col.type] || '—'}
            </td>
          `
          ).join('')}
          <td style="padding: 8px; text-align: center; font-weight: bold; border: 1px solid #cbd5e1; color: ${
            row.isMatch ? '#166534' : '#991b1b'
          };">
            ${row.isMatch ? '✓ COINCIDEM (100% OK)' : '✗ INCONSISTÊNCIA'}
          </td>
        </tr>
      `
      )
      .join('');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #0f172a; padding: 15px;">
        <div style="text-align: center; border-bottom: 2px solid #002D5A; padding-bottom: 10px; margin-bottom: 15px;">
          <h2 style="color: #002D5A; margin: 0; font-size: 14pt;">POLÍCIA MILITAR DO MARANHÃO - CPI</h2>
          <h3 style="color: #002D5A; margin: 3px 0; font-size: 12pt;">RELATÓRIO DE CONFERÊNCIA E CRUZAMENTO DOCUMENTAL SEI</h3>
          <p style="font-size: 9pt; color: #64748b; margin: 2px 0;">
            Unidade: ${activeUnitCode} · Portaria nº ${ordinance.number} · Data: ${singleAuditResult.auditDate} · Auditor: ${currentUser.name}
          </p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 15px;" border="1" cellpadding="6">
          <thead>
            <tr style="background-color: #002D5A; color: #ffffff; text-align: center; font-weight: bold;">
              <th style="padding: 8px;">Campo Auditado</th>
              <th style="padding: 8px;">Ref. Portaria</th>
              ${MATRIX_COLUMNS.map((col) => `<th style="padding: 8px;">${col.headerLabel}</th>`).join('')}
              <th style="padding: 8px;">Conferência</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div style="padding: 12px; border-radius: 6px; background-color: ${
          singleAuditResult.status === 'APROVADO_CONFORME' ? '#dcfce7' : '#fee2e2'
        }; border: 1px solid ${
      singleAuditResult.status === 'APROVADO_CONFORME' ? '#86efac' : '#fca5a5'
    };">
          <b style="font-size: 11pt; color: ${
            singleAuditResult.status === 'APROVADO_CONFORME' ? '#166534' : '#991b1b'
          };">
            VEREDITO OFICIAL: ${
              singleAuditResult.status === 'APROVADO_CONFORME'
                ? 'INFORMAÇÕES 100% OK — PROCESSO REGULAR E AUTORIZADO'
                : `INCONSISTÊNCIAS DE INFORMAÇÕES DETECTADAS (${singleAuditResult.discrepancies.length} PENDÊNCIAS)`
            }
          </b>
        </div>
      </div>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const textBlob = new Blob([singleAuditResult.seiDraftDispatch], { type: 'text/plain' });

    if (navigator.clipboard && navigator.clipboard.write) {
      navigator.clipboard
        .write([new ClipboardItem({ 'text/html': blob, 'text/plain': textBlob })])
        .then(() => {
          setCopiedSection('COMPARISON_TABLE_HTML');
          setTimeout(() => setCopiedSection(null), 2500);
        })
        .catch(() => {
          navigator.clipboard.writeText(singleAuditResult.seiDraftDispatch);
          setCopiedSection('COMPARISON_TABLE_HTML');
          setTimeout(() => setCopiedSection(null), 2500);
        });
    } else {
      navigator.clipboard.writeText(singleAuditResult.seiDraftDispatch);
      setCopiedSection('COMPARISON_TABLE_HTML');
      setTimeout(() => setCopiedSection(null), 2500);
    }
  };

  // Print single unit official report
  const handlePrintSingleReport = () => {
    window.print();
  };

  // Copy Formatted Ascending Report for All Units
  const handleCopyFormattedAscendingReport = () => {
    if (!multiAuditResult) return;

    const dateStr = new Date().toLocaleDateString('pt-BR');
    let text = `[POLÍCIA MILITAR DO MARANHÃO - COMANDO DO POLICIAMENTO DO INTERIOR]
RELATÓRIO CONSOLIDADO DE AUDITORIA E CRUZAMENTO DOCUMENTAL DE JOE
Portaria nº ${ordinance.number} | Data da Auditoria: ${dateStr} | Auditor: ${currentUser.name}

RESUMO EXECUTIVO:
• Unidades Auditadas: ${multiAuditResult.totalUnitsAudited}
• Unidades 100% Conformes: ${multiAuditResult.approvedUnitsCount}
• Unidades com Pendências: ${multiAuditResult.pendingUnitsCount}
• Total de Inconsistências Apuradas: ${multiAuditResult.totalDiscrepanciesCount}
• Efetivo Geral Auditado: ${multiAuditResult.totalOfficersAllUnits} PMs
• Valor Global Auditado: ${formatCurrencyBRL(multiAuditResult.totalAmountAllUnits)}

================================================================================
DISCRIMINAÇÃO DETALHADA POR UNIDADE (ORDEM CRESCENTE):
================================================================================\n\n`;

    multiAuditResult.unitSummaries.forEach((u) => {
      text += `--------------------------------------------------------------------------------\n`;
      text += `ORDEM #${u.orderNumber.toString().padStart(2, '0')} | UNIDADE: ${u.commandId} (${u.commandName})\n`;
      text += `OPERAÇÃO / EVENTO: ${u.eventName || 'Operação de JOE'} | SUB-UNIDADE: ${u.subUnit || 'UPM'}\n`;
      text += `TURNO: ${u.durationHours ? `${u.durationHours} horas` : 'Não identificado'} | EFETIVO: ${u.totalOfficers} PMs | VALOR: ${formatCurrencyBRL(u.totalAmount)}\n`;
      text += `STATUS: ${u.status === 'APROVADO_CONFORME' ? '✓ APROVADO / 100% CONFORME' : '✗ REPROVADO COM PENDÊNCIAS'}\n`;

      if (u.status === 'APROVADO_CONFORME') {
        text += `PARECER: Documentação 100% regular e em conformidade com o teto de 6h e valores da Portaria nº ${ordinance.number}. Autorizado para liquidação.\n\n`;
      } else {
        text += `PENDÊNCIAS APURADAS (${u.discrepancies.length}):\n`;
        u.discrepancies.forEach((d, idx) => {
          text += `  ${idx + 1}. [${d.title}] ${d.description}\n     Base Legal: ${d.legalBasis} | Ação: ${d.remedyAction}\n`;
        });
        text += `\n`;
      }
    });

    text += `================================================================================\n`;
    text += `MINUTA DE DESPACHO SEI CONSOLIDADO:\n`;
    text += `================================================================================\n`;
    text += multiAuditResult.consolidatedSeiDispatch;

    navigator.clipboard.writeText(text);
    setCopiedSection('FULL_ASCENDING_REPORT');
    setTimeout(() => setCopiedSection(null), 2500);
  };

  // Current active unit configuration
  const currentUnitConfig =
    AUDIT_UNITS_MATRIX.find((u) => u.code === activeUnitCode) || AUDIT_UNITS_MATRIX[0];

  // Active unit loaded slots
  const activeUnitSlots = MATRIX_COLUMNS.map(
    (col) =>
      documentsMatrix[activeUnitCode]?.[col.type] || {
        type: col.type,
        title: col.headerLabel,
        shortTitle: col.headerLabel,
        description: col.description,
        legalArticle: col.legalArticle,
        requiredForAudit: false,
        content: '',
      }
  );

  const activeUnitFilledCount = activeUnitSlots.filter(
    (s) => s.content && s.content.trim().length > 0
  ).length;

  // Filtered summaries for matrix view
  const filteredUnitSummaries =
    multiAuditResult?.unitSummaries.filter((u) => {
      if (activeFilterStatus === 'APROVADOS') return u.status === 'APROVADO_CONFORME';
      if (activeFilterStatus === 'PENDENCIAS') return u.status === 'REPROVADO_PENDENCIAS';
      return true;
    }) || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hidden File Input for Single Cell Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.txt,.json"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0 && pendingUploadTarget) {
            handleProcessUploadedFile(
              pendingUploadTarget.unitCode,
              pendingUploadTarget.colType,
              e.target.files[0]
            );
            e.target.value = '';
          }
        }}
      />

      {/* Top Banner with Portaria Status */}
      <div className="bg-gradient-to-r from-[#002D5A] via-[#003B73] to-[#00204A] text-white rounded-2xl p-5 sm:p-6 shadow-md border border-sky-900/40 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#7EC2E8] text-[#002D5A] uppercase tracking-wider">
                Cruzamento Documental SEI · Fiscalização CPI / PMMA
              </span>
              <span className="text-xs text-sky-200 font-semibold">
                Portaria nº {ordinance.number} (Teto 6h · R$ {ordinance.unitValueJoe.toFixed(2).replace('.', ',')})
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[#7EC2E8]" />
              <span>Conferência de Coincidência e Auditoria de Documentos de JOE</span>
            </h2>
            <p className="text-xs sm:text-sm text-sky-100/90 max-w-3xl leading-relaxed">
              Confronte os documentos da operação (<strong>Ofício, Ordem de Serviço, Escala, RENE, Relatório e Planilha Única</strong>), valide se os dados coincidem entre si e gere o relatório oficial atestando conformidade ou discriminando inconsistências.
            </p>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex flex-wrap md:flex-col gap-2 shrink-0 bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sky-200">Requisito:</span>
              <span className="font-bold text-white">Mínimo 2 documentos</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sky-200">Turno Legal:</span>
              <span className="font-bold text-[#7EC2E8]">≤ 06 horas (Art. 3º)</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sky-200">Valor Unitário:</span>
              <span className="font-bold text-white">R$ {ordinance.unitValueJoe.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-1.5 w-full sm:w-auto bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('SINGLE_UNIT')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              viewMode === 'SINGLE_UNIT'
                ? 'bg-[#002D5A] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <FileCheck className="w-4 h-4 text-[#7EC2E8]" />
            <span>Conferência Detalhada por Unidade</span>
          </button>

          <button
            onClick={() => setViewMode('MATRIX_BATCH')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              viewMode === 'MATRIX_BATCH'
                ? 'bg-[#002D5A] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Table className="w-4 h-4 text-[#7EC2E8]" />
            <span>Matriz Geral (10 Unidades x 6 Docs)</span>
          </button>
        </div>

        {/* Master Run Button */}
        <button
          onClick={handleRunAudit}
          disabled={isAuditing || isProcessingFile}
          className="w-full sm:w-auto px-5 py-2 rounded-xl font-bold text-xs bg-[#002D5A] hover:bg-[#001F3F] text-white shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
        >
          {isAuditing ? (
            <>
              <Loader2 className="w-4 h-4 text-[#7EC2E8] animate-spin" />
              <span>Conferindo Cruzamento...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 text-[#7EC2E8]" />
              <span>Executar Cruzamento & Conferência SEI</span>
            </>
          )}
        </button>
      </div>

      {/* Processing Banner */}
      {isProcessingFile && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-center gap-3 animate-pulse print:hidden">
          <Loader2 className="w-5 h-5 text-[#002D5A] animate-spin shrink-0" />
          <div className="text-xs font-bold text-[#002D5A]">
            {processingStatus || 'Processando arquivo e extraindo dados via OCR/Parser...'}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 1: SINGLE UNIT CROSS-AUDIT & DIRECT COINCIDENCE COMPARISON */}
      {/* ========================================================================= */}
      {viewMode === 'SINGLE_UNIT' && (
        <div className="space-y-6">
          {/* Unit Selector & Quick Action Bar */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 print:hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Unit Selector */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#002D5A]" />
                  <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                    Unidade Auditada:
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {AUDIT_UNITS_MATRIX.map((u) => {
                    const isActive = u.code === activeUnitCode;
                    const loadedCount = getLoadedCountForUnit(u.code);

                    return (
                      <button
                        key={u.code}
                        onClick={() => {
                          setActiveUnitCode(u.code);
                          runSingleUnitAuditInternal(u.code, documentsMatrix);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-[#002D5A] text-white shadow-xs ring-2 ring-[#002D5A]/30'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span>{u.label}</span>
                        {loadedCount > 0 && (
                          <span
                            className={`w-2 h-2 rounded-full ${
                              loadedCount >= 2 ? 'bg-emerald-400' : 'bg-amber-400'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sample Loader Presets */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleLoadSampleOK}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Carregar exemplo com 100% de coincidência entre documentos (Sem pendências)"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Carregar Exemplo 100% OK</span>
                </button>

                <button
                  onClick={handleLoadSampleDiscrepant}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Carregar exemplo com inconsistências (Turno > 6h, nomes divergentes, valores incorretos)"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Carregar Exemplo com Inconsistências</span>
                </button>

                <button
                  onClick={handleClearActiveUnitDocs}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar Unidade</span>
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <span className="font-bold text-[#002D5A]">{currentUnitConfig.label}</span>
                <span className="text-slate-400">·</span>
                <span>{currentUnitConfig.name}</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <span className="text-slate-500">Documentos Carregados:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded-md ${
                    activeUnitFilledCount >= 2
                      ? 'bg-emerald-100 text-emerald-800'
                      : activeUnitFilledCount === 1
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {activeUnitFilledCount} de 6 ({activeUnitFilledCount >= 2 ? 'Apto para Cruzamento' : 'Mínimo 2 obrigatório'})
                </span>
              </div>
            </div>
          </div>

          {/* Document Upload & Input Cards (6 Documents) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 print:hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-[#002D5A]" />
                  <span>Documentos Anexados para Cruzamento ({currentUnitConfig.label})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Carregue no mínimo 2 documentos quaisquer para conferência automática de dados
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {MATRIX_COLUMNS.map((col) => {
                const slot =
                  documentsMatrix[activeUnitCode]?.[col.type] || {
                    type: col.type,
                    title: col.headerLabel,
                    shortTitle: col.headerLabel,
                    description: col.description,
                    legalArticle: col.legalArticle,
                    requiredForAudit: false,
                    content: '',
                  };

                const isFilled = slot.content && slot.content.trim().length > 0;
                const cellKey = `${activeUnitCode}::${col.type}`;
                const isDragOver = dragOverCellKey === cellKey;

                return (
                  <div
                    key={col.type}
                    onDragOver={(e) => handleCellDragOver(e, cellKey)}
                    onDragLeave={handleCellDragLeave}
                    onDrop={(e) => handleCellDrop(e, activeUnitCode, col.type)}
                    className={`rounded-xl p-3.5 border transition-all flex flex-col justify-between gap-3 ${
                      isDragOver
                        ? 'bg-sky-50 border-[#002D5A] ring-2 ring-[#002D5A]/20'
                        : isFilled
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-xs text-[#002D5A] uppercase tracking-wide">
                          {col.headerLabel}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {col.legalArticle}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                        {col.description}
                      </p>
                    </div>

                    {isFilled ? (
                      <div className="bg-white rounded-lg p-2.5 border border-emerald-200/80 space-y-2">
                        <div className="flex items-center justify-between gap-1 text-xs">
                          <div className="flex items-center gap-1.5 text-emerald-800 font-bold truncate">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="truncate" title={slot.fileName || 'Documento Carregado'}>
                              {slot.fileName || 'Texto Informado'}
                            </span>
                          </div>
                          <span className="px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono shrink-0">
                            {slot.fileType || 'TXT'}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-600 line-clamp-2 font-mono bg-slate-50 p-1.5 rounded-md border border-slate-100">
                          {slot.content}
                        </div>

                        <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100">
                          <button
                            onClick={() => handleOpenCellModal(activeUnitCode, col.type)}
                            className="px-2 py-1 rounded-md text-[10px] font-bold text-slate-700 hover:text-[#002D5A] hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Ver / Editar</span>
                          </button>

                          <button
                            onClick={() => handleClearCell(activeUnitCode, col.type)}
                            className="px-2 py-1 rounded-md text-[10px] font-bold text-rose-700 hover:bg-rose-50 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remover</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleTriggerUpload(activeUnitCode, col.type)}
                            className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5 text-[#002D5A]" />
                            <span>{col.buttonLabel}</span>
                          </button>

                          <button
                            onClick={() => handleOpenCellModal(activeUnitCode, col.type)}
                            className="py-2 px-2.5 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                            title="Colar ou digitar texto manualmente"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-[10px] text-center text-slate-400">
                          PDF, Word (.docx), Excel (.xlsx) ou TXT
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Results Area */}
          {singleAuditResult && (
            <div className="space-y-6">
              {/* Official Verdict Banner */}
              <div
                className={`rounded-2xl p-5 sm:p-6 border shadow-xs transition-all ${
                  singleAuditResult.status === 'APROVADO_CONFORME'
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50/90 border-rose-300 text-rose-950'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {singleAuditResult.status === 'APROVADO_CONFORME' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white shadow-2xs">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>100% OK · CONFORME COM A PORTARIA Nº {ordinance.number}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-600 text-white shadow-2xs">
                          <AlertTriangle className="w-4 h-4" />
                          <span>REPROVADO · {singleAuditResult.discrepancies.length} INCONSISTÊNCIA(S) DETECTADA(S)</span>
                        </span>
                      )}
                      <span className="text-xs font-bold text-slate-600">
                        {currentUnitConfig.label} · {singleAuditResult.documentsLoadedCount} Docs Cruzados
                      </span>
                    </div>

                    <h3 className="text-lg font-black tracking-tight text-slate-900">
                      {singleAuditResult.status === 'APROVADO_CONFORME'
                        ? 'Todas as Informações Coincidem e Estão 100% Regulares'
                        : 'Foram Identificadas Inconsistências de Informações nos Documentos'}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed max-w-3xl">
                      {singleAuditResult.status === 'APROVADO_CONFORME'
                        ? `A solicitação referente à "${singleAuditResult.extractedSummary.eventName || 'Operação de JOE'}" cumpre integralmente os requisitos: turno de ${singleAuditResult.extractedSummary.durationHours || 6}h (≤ 6h), valor unitário de R$ ${ordinance.unitValueJoe.toFixed(2)}, efetivo de ${singleAuditResult.extractedSummary.officersCount || 0} PMs e total de ${formatCurrencyBRL(singleAuditResult.extractedSummary.totalAmount || 0)}.`
                        : 'A documentação analisada apresenta divergências entre instrumentos ou desrespeito a parâmetros da Portaria. É necessária a devolução para saneamento antes do pagamento.'}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap md:flex-col gap-2 shrink-0 print:hidden">
                    <button
                      onClick={() => handleCopyUnitParecer(singleAuditResult)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-[#002D5A] hover:bg-[#001F3F] text-white shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      {copiedSection === `PARECER_${singleAuditResult.selectedCommandId}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Despacho SEI Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Despacho SEI</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleCopyComparisonTableHTML}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-[#002D5A] border border-slate-300 shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Copiar tabela formatada para colar no Word ou Google Docs"
                    >
                      {copiedSection === 'COMPARISON_TABLE_HTML' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Tabela Copiada!</span>
                        </>
                      ) : (
                        <>
                          <Table className="w-3.5 h-3.5 text-[#002D5A]" />
                          <span>Copiar Tabela (Word)</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handlePrintSingleReport}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      <span>Imprimir / Salvar PDF</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Coincidence Table */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Table className="w-5 h-5 text-[#002D5A]" />
                      <span>Quadro de Conferência e Coincidência de Dados entre Documentos</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Confronto campo a campo dos dados extraídos de cada instrumento acostado aos autos
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3 w-44">Campo Auditado</th>
                        <th className="py-3 px-2.5 w-32">Ref. Portaria</th>
                        {MATRIX_COLUMNS.map((col) => (
                          <th key={col.type} className="py-3 px-3 text-center min-w-[130px]">
                            {col.headerLabel}
                          </th>
                        ))}
                        <th className="py-3 px-3.5 text-center w-36">Conferência</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {singleAuditResult.sideBySideComparison.map((row, idx) => (
                        <tr
                          key={idx}
                          className={`transition-colors ${
                            row.isMatch ? 'hover:bg-emerald-50/30' : 'bg-rose-50/40 hover:bg-rose-50/60'
                          }`}
                        >
                          <td className="py-3 px-3 font-bold text-slate-900">
                            {row.label}
                          </td>
                          <td className="py-3 px-2.5 text-[11px] text-slate-500 font-mono">
                            {row.portariaRef || '—'}
                          </td>
                          {MATRIX_COLUMNS.map((col) => {
                            const val = row.valuesByDoc[col.type];
                            return (
                              <td
                                key={col.type}
                                className={`py-3 px-3 text-center text-xs font-mono ${
                                  val && val !== '—' ? 'font-bold text-slate-800' : 'text-slate-400'
                                }`}
                              >
                                {val || '—'}
                              </td>
                            );
                          })}
                          <td className="py-3 px-3.5 text-center">
                            {row.isMatch ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>COINCIDEM</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                <span>INCONSISTENTE</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Inconsistencies Breakdown (If Any) */}
              {singleAuditResult.discrepancies.length > 0 && (
                <div className="bg-rose-50/70 rounded-2xl p-5 sm:p-6 border border-rose-300 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-rose-200/80 pb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-600" />
                      <h4 className="text-base font-bold text-rose-950">
                        Discriminação Detalhada das Inconsistências Identificadas ({singleAuditResult.discrepancies.length})
                      </h4>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-200 text-rose-900">
                      Necessário Saneamento
                    </span>
                  </div>

                  <div className="space-y-3">
                    {singleAuditResult.discrepancies.map((d, i) => (
                      <div
                        key={i}
                        className="bg-white rounded-xl p-4 border border-rose-200 shadow-2xs space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-bold text-sm text-rose-900">
                            <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-black">
                              {i + 1}
                            </span>
                            <span>{d.title}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-sm bg-rose-100 text-rose-800 font-mono text-[10px] font-bold">
                            {d.severity}
                          </span>
                        </div>

                        <p className="text-xs text-slate-800 leading-relaxed pl-7">
                          {d.description}
                        </p>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-2 border-t border-slate-100 pl-7 text-slate-600">
                          <div className="font-mono text-[11px] text-slate-500">
                            <strong>Base Legal:</strong> {d.legalBasis}
                          </div>
                          <div className="font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                            <strong>Ação Exigida:</strong> {d.remedyAction}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Official SEI Draft Dispatch */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#002D5A]" />
                      <span>Minuta de Despacho SEI da Unidade ({currentUnitConfig.label})</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Texto oficial formatado para juntada direta no processo eletrônico SEI
                    </p>
                  </div>

                  <button
                    onClick={() => handleCopyText(singleAuditResult.seiDraftDispatch, 'SEI_DISPATCH_SINGLE')}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-sky-50 hover:bg-sky-100 text-[#002D5A] border border-sky-200 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer self-start print:hidden"
                  >
                    {copiedSection === 'SEI_DISPATCH_SINGLE' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Despacho Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#002D5A]" />
                        <span>Copiar Despacho SEI</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap border border-slate-800 shadow-inner">
                  {singleAuditResult.seiDraftDispatch}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: FULL 10-UNIT MATRIX BATCH AUDIT & ASCENDING DISCRIMINATED REPORT */}
      {/* ========================================================================= */}
      {viewMode === 'MATRIX_BATCH' && (
        <div className="space-y-6">
          {/* Action Controls Toolbar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSelectAllUnits}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-50 hover:bg-sky-100 text-[#002D5A] border border-sky-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Selecionar Todas ({AUDIT_UNITS_MATRIX.length})</span>
              </button>
              <button
                onClick={handleDeselectAllUnits}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Limpar Seleção</span>
              </button>
              <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block"></div>
              <button
                onClick={handleLoadSampleDataAll}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Preencher dados de exemplo realistas para todas as 10 unidades"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Carregar Matriz Completa</span>
              </button>
              <button
                onClick={handleClearAllMatrix}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Tudo</span>
              </button>
            </div>

            {/* Run Batch Audit Button */}
            <button
              onClick={handleRunAudit}
              disabled={selectedUnitCodes.length === 0 || isAuditing || isProcessingFile}
              className="px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#002D5A] hover:bg-[#001F3F] text-white shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {isAuditing ? (
                <>
                  <Loader2 className="w-4 h-4 text-[#7EC2E8] animate-spin" />
                  <span>Auditando Matriz...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-[#7EC2E8]" />
                  <span>Executar Auditoria de JOE ({selectedUnitCodes.length} Unidades)</span>
                </>
              )}
            </button>
          </div>

          {/* Exact Matrix Table (10 Units x 6 Documents) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-slate-300 shadow-sm space-y-3 print:hidden">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-[#002D5A]" />
                <span className="font-bold text-slate-800 uppercase tracking-wide">
                  Matriz de Upload e Cruzamento Documental
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Arraste ou clique para carregar arquivos (PDF, Excel, Word)
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border-2 border-black/80 shadow-2xs">
              <table className="w-full border-collapse border border-black text-xs font-sans">
                <thead>
                  <tr className="bg-[#D1D5DB] text-slate-900 border-b-2 border-black divide-x-2 divide-black">
                    <th className="p-2.5 w-28 text-center bg-[#E5E7EB] font-black tracking-wider">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-xs uppercase font-extrabold">UNIDADE</span>
                      </div>
                    </th>

                    {MATRIX_COLUMNS.map((col) => (
                      <th
                        key={col.type}
                        className="p-2.5 text-center font-extrabold uppercase tracking-wide text-xs bg-[#E5E7EB]"
                      >
                        <div>{col.headerLabel}</div>
                        <div className="text-[9px] font-normal text-slate-600 normal-case tracking-normal">
                          {col.legalArticle}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y-2 divide-black bg-white">
                  {AUDIT_UNITS_MATRIX.map((unit) => {
                    const isSelected = selectedUnitCodes.includes(unit.code);
                    const loadedCount = getLoadedCountForUnit(unit.code);

                    return (
                      <tr
                        key={unit.code}
                        className={`divide-x-2 divide-black transition-colors ${
                          isSelected ? 'bg-white hover:bg-sky-50/30' : 'bg-slate-100/70 opacity-65'
                        }`}
                      >
                        {/* Unit Label Column */}
                        <td className="p-2.5 text-center bg-[#E5E7EB] font-black text-slate-900 align-middle">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleUnitSelection(unit.code)}
                                className="w-4 h-4 rounded-sm text-[#002D5A] border-slate-400 focus:ring-0 cursor-pointer"
                              />
                              <span className="text-sm font-black tracking-tight">{unit.label}</span>
                            </label>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                loadedCount >= 2
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : loadedCount === 1
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {loadedCount}/6 docs {loadedCount >= 2 ? '✓' : loadedCount === 1 ? '(mín. 2)' : ''}
                            </span>
                          </div>
                        </td>

                        {/* 6 Document Cells in the Row */}
                        {MATRIX_COLUMNS.map((col) => {
                          const slot =
                            documentsMatrix[unit.code]?.[col.type] || {
                              type: col.type,
                              title: col.headerLabel,
                              shortTitle: col.headerLabel,
                              description: col.description,
                              legalArticle: col.legalArticle,
                              requiredForAudit: false,
                              content: '',
                            };

                          const isFilled = slot.content && slot.content.trim().length > 0;
                          const cellKey = `${unit.code}::${col.type}`;
                          const isDragOver = dragOverCellKey === cellKey;

                          return (
                            <td
                              key={col.type}
                              onDragOver={(e) => handleCellDragOver(e, cellKey)}
                              onDragLeave={handleCellDragLeave}
                              onDrop={(e) => handleCellDrop(e, unit.code, col.type)}
                              className={`p-2 align-middle text-center relative transition-all min-w-[150px] ${
                                isDragOver
                                  ? 'bg-sky-100 ring-2 ring-inset ring-[#002D5A]'
                                  : isFilled
                                  ? 'bg-emerald-50/50'
                                  : 'bg-white hover:bg-slate-50'
                              }`}
                            >
                              {isFilled ? (
                                <div className="space-y-1.5 py-1">
                                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-800">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span className="truncate max-w-[130px]" title={slot.fileName || 'Documento Carregado'}>
                                      {slot.fileName || `${col.headerLabel} OK`}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-center gap-1 text-[10px]">
                                    <span className="px-1.5 py-0.2 rounded-sm bg-emerald-100 text-emerald-800 font-bold font-mono">
                                      {slot.fileType || 'TXT'}
                                    </span>
                                    {slot.pageCount ? (
                                      <span className="text-slate-500 font-medium">
                                        {slot.pageCount} pág{slot.pageCount > 1 ? 's' : ''}
                                      </span>
                                    ) : null}
                                  </div>

                                  <div className="flex items-center justify-center gap-1 pt-1">
                                    <button
                                      onClick={() => handleOpenCellModal(unit.code, col.type)}
                                      className="p-1 rounded-md text-slate-600 hover:text-[#002D5A] hover:bg-slate-200/70 transition-colors cursor-pointer"
                                      title="Visualizar / Editar Conteúdo"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleClearCell(unit.code, col.type)}
                                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                                      title="Remover documento"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1 py-1">
                                  <button
                                    onClick={() => handleTriggerUpload(unit.code, col.type)}
                                    className="w-full py-1.5 px-2 rounded-md text-[11px] font-bold text-slate-800 bg-[#E5E7EB] hover:bg-[#D1D5DB] border border-slate-400 shadow-2xs transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                                  >
                                    <Upload className="w-3 h-3 text-[#002D5A]" />
                                    <span>{col.buttonLabel}</span>
                                  </button>
                                  <button
                                    onClick={() => handleOpenCellModal(unit.code, col.type)}
                                    className="text-[10px] text-slate-500 hover:text-[#002D5A] underline block mx-auto cursor-pointer"
                                  >
                                    Colar Texto
                                  </button>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Results Summary Dashboard */}
          {multiAuditResult && (
            <div className="space-y-6">
              {/* Metric Highlights */}
              <div className="bg-gradient-to-br from-slate-50 to-sky-50/50 rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-[#002D5A]" />
                      <span>Resultado da Auditoria Consolidada de JOE</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Processamento automático dos cruzamentos documentais em ordem crescente
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyFormattedAscendingReport}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#002D5A] hover:bg-[#001F3F] text-white shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedSection === 'FULL_ASCENDING_REPORT' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Relatório Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Relatório Formatado</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white/80 rounded-xl p-3 border border-slate-200/50">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Aprovados</div>
                    <div className="text-base font-black text-emerald-700 mt-0.5">
                      {multiAuditResult.approvedUnitsCount} Unidades
                    </div>
                    <div className="text-[11px] font-medium text-slate-500">100% OK</div>
                  </div>

                  <div className="bg-white/80 rounded-xl p-3 border border-slate-200/50">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Com Pendências</div>
                    <div className="text-base font-black text-rose-700 mt-0.5">
                      {multiAuditResult.pendingUnitsCount} Unidades
                    </div>
                    <div className="text-[11px] font-medium text-slate-500">
                      {multiAuditResult.totalDiscrepanciesCount} Inconsistências
                    </div>
                  </div>

                  <div className="bg-white/80 rounded-xl p-3 border border-slate-200/50">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Efetivo Auditado</div>
                    <div className="text-base font-black text-slate-900 mt-0.5">
                      {multiAuditResult.totalOfficersAllUnits} Policiais
                    </div>
                    <div className="text-[11px] font-medium text-slate-500">Cruzados nas Escalas</div>
                  </div>

                  <div className="bg-white/80 rounded-xl p-3 border border-slate-200/50">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valor Total Auditado</div>
                    <div className="text-base font-black text-slate-900 mt-0.5">
                      {formatCurrencyBRL(multiAuditResult.totalAmountAllUnits)}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500">
                      Ref. R$ {multiAuditResult.ordinanceUnitValue.toFixed(2)}/JOE
                    </div>
                  </div>
                </div>
              </div>

              {/* Ascending Order Discriminated Table (CPA/I-1 to CPA/I-9 + CPI) */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Table className="w-5 h-5 text-[#002D5A]" />
                      <span>Relatório Consolidado Discriminado em Ordem Crescente</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Discriminação detalhada de conformidade ou pendências para cada CPA/I e CPI
                    </p>
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setActiveFilterStatus('TODOS')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeFilterStatus === 'TODOS'
                          ? 'bg-white text-[#002D5A] shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Todos ({multiAuditResult.unitSummaries.length})
                    </button>
                    <button
                      onClick={() => setActiveFilterStatus('APROVADOS')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeFilterStatus === 'APROVADOS'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Aprovados ({multiAuditResult.approvedUnitsCount})
                    </button>
                    <button
                      onClick={() => setActiveFilterStatus('PENDENCIAS')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeFilterStatus === 'PENDENCIAS'
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Com Pendências ({multiAuditResult.pendingUnitsCount})
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3 w-16 text-center">Ordem</th>
                        <th className="py-3 px-3.5 w-36">Unidade</th>
                        <th className="py-3 px-3.5">Operação / Evento</th>
                        <th className="py-3 px-3 text-center w-28">Turno (Horas)</th>
                        <th className="py-3 px-3 text-center w-28">Efetivo</th>
                        <th className="py-3 px-3.5 text-right w-32">Valor Total</th>
                        <th className="py-3 px-3 text-center w-36">Status</th>
                        <th className="py-3 px-3.5">Discriminação de Pendências / Parecer</th>
                        <th className="py-3 px-3 w-20 text-center">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredUnitSummaries.map((summary) => {
                        const isApproved = summary.status === 'APROVADO_CONFORME';
                        const isPending = summary.status === 'REPROVADO_PENDENCIAS';
                        const isSelectedDetail = selectedUnitDetail?.commandId === summary.commandId;

                        return (
                          <tr
                            key={summary.commandId}
                            className={`transition-colors ${
                              isSelectedDetail
                                ? 'bg-sky-50/70'
                                : isApproved
                                ? 'hover:bg-emerald-50/40'
                                : isPending
                                ? 'hover:bg-rose-50/40'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-3 px-3 text-center font-bold font-mono text-slate-500">
                              #{summary.orderNumber.toString().padStart(2, '0')}
                            </td>

                            <td className="py-3 px-3.5">
                              <div className="font-bold text-slate-900">{summary.commandId}</div>
                              <div className="text-[10px] text-slate-500 line-clamp-1">{summary.commandName}</div>
                            </td>

                            <td className="py-3 px-3.5">
                              <div className="font-semibold text-slate-800">{summary.eventName || 'Operação de JOE'}</div>
                              <div className="text-[10px] text-slate-500">{summary.subUnit || 'UPM / Batalhão'}</div>
                            </td>

                            <td className="py-3 px-3 text-center">
                              {summary.durationHours ? (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                    summary.durationHours <= 6
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800 ring-1 ring-rose-300'
                                  }`}
                                >
                                  {summary.durationHours}h
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-center font-bold text-slate-800">
                              {summary.totalOfficers > 0 ? `${summary.totalOfficers} PMs` : '—'}
                            </td>

                            <td className="py-3 px-3.5 text-right font-black text-slate-900 font-mono">
                              {summary.totalAmount > 0 ? formatCurrencyBRL(summary.totalAmount) : '—'}
                            </td>

                            <td className="py-3 px-3 text-center">
                              {isApproved ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>100% CONFORME</span>
                                </span>
                              ) : isPending ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                  <span>REPROVADO ({summary.discrepanciesCount})</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                                  SEM DOCUMENTOS
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3.5">
                              {isApproved ? (
                                <div className="bg-emerald-50/80 rounded-xl p-2.5 border border-emerald-200/80 space-y-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-emerald-900 text-xs flex items-center gap-1.5 font-bold">
                                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                      <span>Conformidade 100% Validada</span>
                                    </div>
                                    <button
                                      onClick={() => handleCopyUnitParecer(summary)}
                                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-emerald-800 hover:text-emerald-950 bg-white hover:bg-emerald-100 border border-emerald-300 shadow-2xs transition-all flex items-center gap-1 shrink-0 cursor-pointer active:scale-95"
                                      title="Copiar parecer de conformidade desta unidade"
                                    >
                                      {copiedSection === `PARECER_${summary.commandId}` ? (
                                        <>
                                          <Check className="w-3 h-3 text-emerald-600" />
                                          <span className="text-emerald-700">Copiado!</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3 text-emerald-700" />
                                          <span>Copiar Parecer</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  <p className="text-emerald-800 text-[11px] font-medium leading-relaxed">
                                    Turno ≤ 6h, efetivo e valor conforme a Portaria nº {ordinance.number}. Documentação regular e autorizada para pagamento.
                                  </p>
                                </div>
                              ) : isPending ? (
                                <div className="bg-rose-50/70 rounded-xl p-2.5 border border-rose-200/80 space-y-2">
                                  <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-rose-200/60">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 flex items-center gap-1">
                                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                      <span>{summary.discrepancies.length} Pendência(s) Identificada(s)</span>
                                    </span>
                                    <button
                                      onClick={() => handleCopyUnitParecer(summary)}
                                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-rose-800 hover:text-rose-950 bg-white hover:bg-rose-100 border border-rose-300 shadow-2xs transition-all flex items-center gap-1 shrink-0 cursor-pointer active:scale-95"
                                      title="Copiar texto completo de todas as pendências"
                                    >
                                      {copiedSection === `PARECER_${summary.commandId}` ? (
                                        <>
                                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                                          <span className="text-emerald-700 font-bold">Copiado!</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3.5 h-3.5 text-rose-700" />
                                          <span>Copiar Parecer</span>
                                        </>
                                      )}
                                    </button>
                                  </div>

                                  <div className="space-y-1.5">
                                    {summary.discrepancies.map((d, idx) => (
                                      <div key={idx} className="text-rose-900 text-[11px] flex items-start gap-1.5 leading-relaxed">
                                        <span className="font-bold text-rose-600 text-xs shrink-0">•</span>
                                        <div>
                                          <span className="font-bold text-slate-900">{d.title}:</span>{' '}
                                          <span className="text-slate-800">{d.description}</span>{' '}
                                          <span className="text-[10px] text-slate-500 font-mono block sm:inline mt-0.5 sm:mt-0">
                                            ({d.remedyAction})
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Nenhum documento anexado para análise.</span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => setSelectedUnitDetail(summary)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-[#002D5A] hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Ver detalhes da auditoria desta unidade"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Draft SEI Consolidated Dispatch */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#002D5A]" />
                      <span>Minuta de Despacho SEI Consolidado (Em Ordem Crescente)</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Texto pronto no padrão oficial da PMMA para juntada no processo eletrônico SEI do CPI
                    </p>
                  </div>

                  <button
                    onClick={() => handleCopyText(multiAuditResult.consolidatedSeiDispatch, 'SEI_DISPATCH')}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-sky-50 hover:bg-sky-100 text-[#002D5A] border border-sky-200 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer self-start"
                  >
                    {copiedSection === 'SEI_DISPATCH' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copiado Despacho SEI!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#002D5A]" />
                        <span>Copiar Despacho SEI</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap border border-slate-800 shadow-inner">
                  {multiAuditResult.consolidatedSeiDispatch}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: UNIT AUDIT DETAIL & PARECER INSPECTION */}
      {/* ========================================================================= */}
      {selectedUnitDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white ${
                    selectedUnitDetail.status === 'APROVADO_CONFORME'
                      ? 'bg-emerald-600'
                      : selectedUnitDetail.status === 'REPROVADO_PENDENCIAS'
                      ? 'bg-rose-600'
                      : 'bg-slate-600'
                  }`}
                >
                  #{selectedUnitDetail.orderNumber.toString().padStart(2, '0')}
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase text-[#002D5A] tracking-wider">
                    Auditoria Individual de JOE
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedUnitDetail.commandId} — {selectedUnitDetail.commandName}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedUnitDetail(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Operação</div>
                <div className="text-xs font-bold text-slate-900 truncate" title={selectedUnitDetail.eventName || ''}>
                  {selectedUnitDetail.eventName || 'Operação de JOE'}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Turno Auditado</div>
                <div className="text-xs font-bold text-slate-900">
                  {selectedUnitDetail.durationHours ? `${selectedUnitDetail.durationHours}h de serviço` : 'Não detectado'}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Efetivo Extraordinário</div>
                <div className="text-xs font-bold text-slate-900">
                  {selectedUnitDetail.totalOfficers > 0 ? `${selectedUnitDetail.totalOfficers} PMs` : '0 PMs'}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Valor Liquidado</div>
                <div className="text-xs font-bold text-slate-900 font-mono">
                  {formatCurrencyBRL(selectedUnitDetail.totalAmount)}
                </div>
              </div>
            </div>

            {/* Inconsistencies List or Approval Note */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Parecer e Cruzamento Documental
                </h4>
                <button
                  onClick={() => handleCopyUnitParecer(selectedUnitDetail)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#002D5A] hover:bg-[#001F3F] text-white shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  {copiedSection === `PARECER_${selectedUnitDetail.commandId}` ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Texto Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Parecer Completo</span>
                    </>
                  )}
                </button>
              </div>

              {selectedUnitDetail.status === 'APROVADO_CONFORME' ? (
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 text-emerald-900 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Processo 100% Conforme e Aprovado</span>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Todos os requisitos da Portaria nº {ordinance.number} - GCG foram cumpridos: turno com limite de 6h, valor unitário correto de R$ {ordinance.unitValueJoe.toFixed(2)}, efetivo consistente e denominações padronizadas.
                  </p>
                </div>
              ) : selectedUnitDetail.discrepancies.length > 0 ? (
                <div className="space-y-2">
                  {selectedUnitDetail.discrepancies.map((d, i) => (
                    <div key={i} className="bg-rose-50 rounded-xl p-3 border border-rose-200 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{d.title}</span>
                      </div>
                      <p className="text-xs text-rose-800 leading-relaxed">{d.description}</p>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-600 pt-1 border-t border-rose-200/60">
                        <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                          {d.legalBasis}
                        </span>
                        <span className="font-semibold text-amber-800">Ação: {d.remedyAction}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-slate-500 text-xs text-center">
                  Sem documentos carregados para auditoria desta unidade.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedUnitDetail(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW / EDIT DOCUMENT CONTENT OF A CELL */}
      {/* ========================================================================= */}
      {modalCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-black uppercase text-[#002D5A] tracking-wider">
                  Visualizar / Editar Documento
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {MATRIX_COLUMNS.find((c) => c.type === modalCell.colType)?.description} · <span className="text-[#002D5A]">{modalCell.unitCode}</span>
                </h3>
              </div>

              <button
                onClick={() => setModalCell(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Conteúdo Textual do Documento (Extraído ou Digitado):
              </label>
              <textarea
                rows={12}
                value={modalEditText}
                onChange={(e) => setModalEditText(e.target.value)}
                placeholder="Cole aqui o texto do documento ou digite os dados da operação, efetivo, datas, horários e valores..."
                className="w-full bg-slate-50 border border-slate-300 focus:border-[#002D5A] focus:ring-2 focus:ring-[#002D5A]/20 rounded-xl p-3 text-xs font-mono text-slate-800 leading-relaxed focus:outline-hidden"
              />
              <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                <span>{modalEditText.length} caracteres</span>
                <span>Padrão SEI / PMMA</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setModalEditText('');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
              >
                Limpar Texto
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalCell(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveModalEdit}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#002D5A] hover:bg-[#001F3F] text-white shadow-sm transition-all cursor-pointer"
                >
                  Salvar e Atualizar Célula
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
