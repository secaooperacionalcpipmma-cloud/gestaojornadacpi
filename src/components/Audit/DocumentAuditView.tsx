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

// Fixed 10 units defined in the PMMA/CPI structure matching the user's printout
interface UnitRowConfig {
  code: string; // e.g. 'CPI', 'CPAI-1', 'CPAI-2'...
  standardCode: string; // e.g. 'CPI', 'CPA/I-1', 'CPA/I-2'...
  label: string; // e.g. 'CPI', 'CPAI-1', 'CPAI-2'...
  name: string; // Headquarters or region
}

const AUDIT_UNITS_MATRIX: UnitRowConfig[] = [
  { code: 'CPI', standardCode: 'CPI', label: 'CPI', name: 'Comando do Interior (São Luís / Eixo Central)' },
  { code: 'CPAI-1', standardCode: 'CPA/I-1', label: 'CPAI-1', name: 'Rosário e Região dos Lençóis' },
  { code: 'CPAI-2', standardCode: 'CPA/I-2', label: 'CPAI-2', name: 'Bacabal e Médio Mearim' },
  { code: 'CPAI-3', standardCode: 'CPA/I-3', label: 'CPAI-3', name: 'Imperatriz e Região Tocantina' },
  { code: 'CPAI-4', standardCode: 'CPA/I-4', label: 'CPAI-4', name: 'Caxias e Leste Maranhense' },
  { code: 'CPAI-5', standardCode: 'CPA/I-5', label: 'CPAI-5', name: 'Pinheiro e Baixada Maranhense' },
  { code: 'CPAI-6', standardCode: 'CPA/I-6', label: 'CPAI-6', name: 'Chapadinha e Baixo Parnaíba' },
  { code: 'CPAI-7', standardCode: 'CPA/I-7', label: 'CPAI-7', name: 'Codó e Região dos Cocais' },
  { code: 'CPAI-8', standardCode: 'CPA/I-8', label: 'CPAI-8', name: 'Gov. Nunes Freire e Alto Turi' },
  { code: 'CPAI-9', standardCode: 'CPA/I-9', label: 'CPAI-9', name: 'Balsas e Sul Maranhense' },
];

// Columns matching the user's image: OFICIO, O.S OU ORDEM, ESCALA, RENE, RELATÓRIO, PLANILHA ÚNICA
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
    headerLabel: 'OFICIO',
    buttonLabel: 'CARREGAR OFICIO',
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
    legalArticle: 'Art. 11, III',
  },
  {
    type: 'PLANILHA_UNICA_PAGADORIA',
    headerLabel: 'PLANILHA ÚNICA',
    buttonLabel: 'CARREGAR PLANILHA',
    description: 'Planilha Única Consolidada de Liquidação (DGP)',
    legalArticle: 'Art. 11, I e Parágrafo Único',
  },
];

export const DocumentAuditView: React.FC<DocumentAuditViewProps> = ({
  ordinance,
  commands,
  currentUser,
  onAuditSaved,
}) => {
  // Selected units to include in the audit batch (by code: 'CPI', 'CPAI-1', etc.)
  const [selectedUnitCodes, setSelectedUnitCodes] = useState<string[]>([
    'CPI',
    'CPAI-1',
    'CPAI-2',
    'CPAI-3',
    'CPAI-4',
    'CPAI-5',
    'CPAI-6',
    'CPAI-7',
    'CPAI-8',
    'CPAI-9',
  ]);

  // Documents matrix state: Record<UnitCode, Record<AuditDocumentType, AuditDocumentSlot>>
  const [documentsMatrix, setDocumentsMatrix] = useState<Record<string, Record<AuditDocumentType, AuditDocumentSlot>>>(() => {
    const matrix: Record<string, Record<AuditDocumentType, AuditDocumentSlot>> = {};

    AUDIT_UNITS_MATRIX.forEach((u) => {
      matrix[u.code] = {} as Record<AuditDocumentType, AuditDocumentSlot>;
      const defaultDocs = DEFAULT_UNIT_DOCUMENTS[u.standardCode] || DEFAULT_UNIT_DOCUMENTS[u.code] || {};

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
            ? `${col.headerLabel.replace(/\s+/g, '_')}_${u.code.replace(/[^a-zA-Z0-9]/g, '')}.${col.type === 'PLANILHA_UNICA_PAGADORIA' ? 'xlsx' : col.type === 'ORDEM_SERVICO_OPERACAO' ? 'docx' : 'pdf'}`
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

  // Results state
  const [multiAuditResult, setMultiAuditResult] = useState<MultiUnitAuditResult | null>(null);
  const [activeFilterStatus, setActiveFilterStatus] = useState<'TODOS' | 'APROVADOS' | 'PENDENCIAS'>('TODOS');
  const [selectedUnitDetail, setSelectedUnitDetail] = useState<UnitAuditSummary | null>(null);

  // Auto-run initial audit on mount
  useEffect(() => {
    // Map unitDocumentsMap formatted as expected by service
    const unitDocsMap: Record<string, AuditDocumentSlot[]> = {};

    AUDIT_UNITS_MATRIX.forEach((u) => {
      const slotsObj = documentsMatrix[u.code] || {};
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
      if (result.unitSummaries.length > 0) {
        setSelectedUnitDetail(result.unitSummaries[0]);
      }
    } catch (e) {
      console.warn('Erro na auditoria inicial:', e);
    }
  }, []);

  // Modal editor / viewer state
  const [modalCell, setModalCell] = useState<{ unitCode: string; colType: AuditDocumentType } | null>(null);
  const [modalEditText, setModalEditText] = useState<string>('');

  // Drag over tracking: "unitCode::colType"
  const [dragOverCellKey, setDragOverCellKey] = useState<string | null>(null);

  // File loading states
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Hidden file input references mapped by cell key
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploadTarget, setPendingUploadTarget] = useState<{ unitCode: string; colType: AuditDocumentType } | null>(null);

  // Open single file dialog for a specific cell
  const handleTriggerUpload = (unitCode: string, colType: AuditDocumentType) => {
    setPendingUploadTarget({ unitCode, colType });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Process uploaded file for a specific cell
  const handleProcessUploadedFile = async (unitCode: string, colType: AuditDocumentType, file: File) => {
    setIsProcessingFile(true);
    setProcessingStatus(`Lendo ${file.name} para ${unitCode}...`);

    try {
      const extracted: ExtractedFileResult = await extractTextFromAnyFile(file);

      setDocumentsMatrix((prev) => {
        const next = { ...prev };
        const unitMap = { ...(next[unitCode] || {}) };
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
        next[unitCode] = unitMap;
        return next;
      });

      if (multiAuditResult) setMultiAuditResult(null);
    } catch (err) {
      console.error('Erro ao ler arquivo:', err);
      alert(`Falha ao ler o arquivo ${file.name}.`);
    } finally {
      setIsProcessingFile(false);
      setProcessingStatus('');
      setPendingUploadTarget(null);
    }
  };

  // Clear a single cell
  const handleClearCell = (unitCode: string, colType: AuditDocumentType) => {
    setDocumentsMatrix((prev) => {
      const next = { ...prev };
      const unitMap = { ...(next[unitCode] || {}) };
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
      next[unitCode] = unitMap;
      return next;
    });
    if (multiAuditResult) setMultiAuditResult(null);
  };

  // Clear all documents in the entire matrix
  const handleClearAllMatrix = () => {
    if (!confirm('Deseja limpar todos os documentos carregados na tabela?')) return;
    setDocumentsMatrix((prev) => {
      const next: Record<string, Record<AuditDocumentType, AuditDocumentSlot>> = {};
      AUDIT_UNITS_MATRIX.forEach((u) => {
        next[u.code] = {} as Record<AuditDocumentType, AuditDocumentSlot>;
        MATRIX_COLUMNS.forEach((col) => {
          next[u.code][col.type] = {
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
      return next;
    });
    setMultiAuditResult(null);
  };

  // Load sample documents across units for instant testing
  const handleLoadSampleData = () => {
    setDocumentsMatrix((prev) => {
      const next: Record<string, Record<AuditDocumentType, AuditDocumentSlot>> = {};
      AUDIT_UNITS_MATRIX.forEach((u) => {
        next[u.code] = {} as Record<AuditDocumentType, AuditDocumentSlot>;
        const defaultDocs = DEFAULT_UNIT_DOCUMENTS[u.standardCode] || DEFAULT_UNIT_DOCUMENTS[u.code] || {};

        MATRIX_COLUMNS.forEach((col) => {
          const prefill = defaultDocs[col.type] || '';
          next[u.code][col.type] = {
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
      return next;
    });
    setMultiAuditResult(null);
  };

  // Open modal viewer/editor for a specific cell
  const handleOpenCellModal = (unitCode: string, colType: AuditDocumentType) => {
    const slot = documentsMatrix[unitCode]?.[colType];
    setModalEditText(slot?.content || '');
    setModalCell({ unitCode, colType });
  };

  // Save modal edit
  const handleSaveModalEdit = () => {
    if (!modalCell) return;
    const { unitCode, colType } = modalCell;

    setDocumentsMatrix((prev) => {
      const next = { ...prev };
      const unitMap = { ...(next[unitCode] || {}) };
      unitMap[colType] = {
        ...unitMap[colType],
        content: modalEditText,
        fileType: modalEditText.trim() ? unitMap[colType].fileType || 'TEXT' : undefined,
        fileName: modalEditText.trim() ? unitMap[colType].fileName || `Texto_${colType}.txt` : undefined,
      };
      next[unitCode] = unitMap;
      return next;
    });

    setModalCell(null);
    if (multiAuditResult) setMultiAuditResult(null);
  };

  // Toggle selection of a unit
  const handleToggleUnitSelection = (unitCode: string) => {
    setSelectedUnitCodes((prev) =>
      prev.includes(unitCode) ? prev.filter((c) => c !== unitCode) : [...prev, unitCode]
    );
    if (multiAuditResult) setMultiAuditResult(null);
  };

  // Select / Deselect All units
  const handleSelectAllUnits = () => {
    setSelectedUnitCodes(AUDIT_UNITS_MATRIX.map((u) => u.code));
    if (multiAuditResult) setMultiAuditResult(null);
  };

  const handleDeselectAllUnits = () => {
    setSelectedUnitCodes([]);
    if (multiAuditResult) setMultiAuditResult(null);
  };

  // Drag & drop handlers for cells
  const handleCellDragOver = (e: React.DragEvent, cellKey: string) => {
    e.preventDefault();
    setDragOverCellKey(cellKey);
  };

  const handleCellDragLeave = () => {
    setDragOverCellKey(null);
  };

  const handleCellDrop = (e: React.DragEvent, unitCode: string, colType: AuditDocumentType) => {
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
    return (Object.values(slots) as AuditDocumentSlot[]).filter((s) => s.content && s.content.trim().length > 0).length;
  };

  // Execute Audit on all selected units
  const handleRunAudit = () => {
    setIsAuditing(true);

    setTimeout(() => {
      // Map unitDocumentsMap formatted as expected by service
      const unitDocsMap: Record<string, AuditDocumentSlot[]> = {};

      AUDIT_UNITS_MATRIX.forEach((u) => {
        const slotsObj = documentsMatrix[u.code] || {};
        const slotsArray: AuditDocumentSlot[] = MATRIX_COLUMNS.map((col) => slotsObj[col.type]);
        unitDocsMap[u.standardCode] = slotsArray;
        unitDocsMap[u.code] = slotsArray;
      });

      // Filter selected standard codes
      const targetStandardCodes = AUDIT_UNITS_MATRIX.filter((u) => selectedUnitCodes.includes(u.code)).map(
        (u) => u.standardCode
      );

      const result = performMultiUnitAudit(
        targetStandardCodes,
        unitDocsMap,
        commands,
        ordinance,
        currentUser.name
      );

      setMultiAuditResult(result);
      if (result.unitSummaries.length > 0) {
        setSelectedUnitDetail(result.unitSummaries[0]);
      }
      setIsAuditing(false);

      // Save audit log
      storageService.logAudit({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'AUDITORIA_MULTI_UNIDADES',
        recordId: `auditoria-tabela #${Date.now().toString().slice(-4)}`,
        description: `Auditoria de ${result.totalUnitsAudited} unidades via matriz CPI/CPAI. Conformes: ${result.approvedUnitsCount} | Pendências: ${result.pendingUnitsCount}`,
        ipAddress: '127.0.0.1',
      });

      if (onAuditSaved) {
        onAuditSaved(result);
      }
    }, 300);
  };

  // Copy full parecer / pendências text of a single unit
  const handleCopyUnitParecer = (summary: UnitAuditSummary) => {
    let textToCopy = '';
    const dateStr = new Date().toLocaleDateString('pt-BR');

    if (summary.status === 'APROVADO_CONFORME') {
      textToCopy = `[PARECER DE AUDITORIA DE CONFORMIDADE - PMMA / CPI]
UNIDADE: ${summary.commandId} (${summary.commandName})
OPERAÇÃO / EVENTO: ${summary.eventName || 'Operação de JOE'}
ORDEM: #${summary.orderNumber.toString().padStart(2, '0')}
TURNO: ${summary.durationHours || 6} horas (Em estrita conformidade com o teto de 6h da Portaria nº ${ordinance.number})
EFETIVO: ${summary.totalOfficers} Policiais Militares
VALOR TOTAL: ${formatCurrencyBRL(summary.totalAmount)}
STATUS: APROVADO / 100% CONFORME

PARECER CONCLUSIVO:
A documentação apresentada foi auditada e cumpre rigorosamente os preceitos e diretrizes fixados na Portaria nº ${ordinance.number} - GCG/PMMA. Processo regular e autorizado para liquidação e pagamento de JOE.

Auditor Responsável: ${currentUser.name} | Data: ${dateStr}`;
    } else if (summary.status === 'REPROVADO_PENDENCIAS') {
      const discLines = summary.discrepancies
        .map(
          (d, idx) =>
            `${idx + 1}. [${d.title}]
• Descrição da Inconsistência: ${d.description}
• Base Legal: ${d.legalBasis}
• Ação Saneadora Necessária: ${d.remedyAction}`
        )
        .join('\n\n');

      textToCopy = `[PARECER DE AUDITORIA - DISCRIMINAÇÃO DE PENDÊNCIAS - PMMA / CPI]
UNIDADE: ${summary.commandId} (${summary.commandName})
OPERAÇÃO / EVENTO: ${summary.eventName || 'Operação de JOE'}
ORDEM: #${summary.orderNumber.toString().padStart(2, '0')}
STATUS: REPROVADO COM PENDÊNCIAS (${summary.discrepanciesCount} Inconsistência(s))
DATA DA AUDITORIA: ${dateStr}
AUDITOR RESPONSÁVEL: ${currentUser.name}

============================================================
DISCRIMINAÇÃO DETALHADA DAS PENDÊNCIAS IDENTIFICADAS:
============================================================
${discLines}

============================================================
DETERMINAÇÃO / ENCAMINHAMENTO:
Necessário saneamento e retificação das pendências apontadas pela UPM antes do prosseguimento para liquidação na DGP.`;
    } else {
      textToCopy = `[PARECER DE AUDITORIA - ${summary.commandId}]\nStatus: Sem documentos suficientes carregados para auditoria (Mínimo de 2 arquivos necessários).`;
    }

    navigator.clipboard.writeText(textToCopy);
    setCopiedSection(`PARECER_${summary.commandId}`);
    setTimeout(() => setCopiedSection(null), 3000);
  };

  // Copy plain text
  const handleCopyText = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  // Copy Ascending Formatted HTML Table
  const handleCopyFormattedAscendingReport = () => {
    if (!multiAuditResult) return;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #1e293b; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #002D5A; padding-bottom: 12px;">
          <h2 style="color: #002D5A; margin: 0; font-size: 15pt;">POLÍCIA MILITAR DO MARANHÃO</h2>
          <h3 style="color: #002D5A; margin: 4px 0; font-size: 13pt;">COMANDO DE POLICIAMENTO DO INTERIOR - CPI</h3>
          <h4 style="color: #475569; margin: 4px 0; font-size: 11pt;">RELATÓRIO CONSOLIDADO DE AUDITORIA EM ORDEM CRESCENTE</h4>
          <p style="font-size: 9pt; color: #64748b; margin: 4px 0;">
            Portaria nº ${multiAuditResult.ordinanceNumber} · Valor Ref. JOE: R$ ${multiAuditResult.ordinanceUnitValue.toFixed(2).replace('.', ',')} · Data: ${multiAuditResult.auditDate} · Auditor: ${multiAuditResult.auditorName}
          </p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 9.5pt;" border="1" cellpadding="6">
          <tr style="background-color: #f1f5f9; color: #002D5A; font-weight: bold;">
            <th style="width: 8%; text-align: center;">Ordem</th>
            <th style="width: 16%; text-align: left;">Unidade</th>
            <th style="width: 22%; text-align: left;">Operação / Evento</th>
            <th style="width: 14%; text-align: center;">Efetivo / Total</th>
            <th style="width: 16%; text-align: center;">Status</th>
            <th style="width: 24%; text-align: left;">Inconsistências / Parecer</th>
          </tr>
          ${multiAuditResult.unitSummaries
            .map(
              (u) => `
            <tr style="background-color: ${u.status === 'APROVADO_CONFORME' ? '#f0fdf4' : u.status === 'REPROVADO_PENDENCIAS' ? '#fef2f2' : '#ffffff'};">
              <td style="text-align: center; font-weight: bold;">#${u.orderNumber.toString().padStart(2, '0')}</td>
              <td><b>${u.commandId}</b><br><span style="font-size: 8pt; color: #64748b;">${u.commandName}</span></td>
              <td>${u.eventName || '—'}<br><span style="font-size: 8pt; color: #64748b;">${u.subUnit || ''}</span></td>
              <td style="text-align: center;">${u.totalOfficers} PMs<br><b>${formatCurrencyBRL(u.totalAmount)}</b></td>
              <td style="text-align: center; font-weight: bold; color: ${u.status === 'APROVADO_CONFORME' ? '#166534' : u.status === 'REPROVADO_PENDENCIAS' ? '#991b1b' : '#64748b'};">
                ${u.status === 'APROVADO_CONFORME' ? '✓ CONFORME' : u.status === 'REPROVADO_PENDENCIAS' ? `✗ REPROVADO (${u.discrepanciesCount} PEND.)` : 'SEM DOCUMENTOS'}
              </td>
              <td style="font-size: 8.5pt;">
                ${
                  u.status === 'APROVADO_CONFORME'
                    ? 'Tudo OK. Turno de 6h e valores em conformidade com a portaria.'
                    : u.discrepancies.length > 0
                    ? u.discrepancies.map((d) => `• <b>${d.title}:</b> ${d.description}`).join('<br>')
                    : 'Sem documentos anexados para análise.'
                }
              </td>
            </tr>
          `
            )
            .join('')}
        </table>
      </div>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const textBlob = new Blob([multiAuditResult.consolidatedSeiDispatch], { type: 'text/plain' });

    if (navigator.clipboard && navigator.clipboard.write) {
      navigator.clipboard
        .write([new ClipboardItem({ 'text/html': blob, 'text/plain': textBlob })])
        .then(() => {
          setCopiedSection('FULL_ASCENDING_REPORT');
          setTimeout(() => setCopiedSection(null), 2500);
        })
        .catch(() => {
          navigator.clipboard.writeText(multiAuditResult.consolidatedSeiDispatch);
          setCopiedSection('FULL_ASCENDING_REPORT');
          setTimeout(() => setCopiedSection(null), 2500);
        });
    } else {
      navigator.clipboard.writeText(multiAuditResult.consolidatedSeiDispatch);
      setCopiedSection('FULL_ASCENDING_REPORT');
      setTimeout(() => setCopiedSection(null), 2500);
    }
  };

  // Filtered summaries
  const filteredUnitSummaries = multiAuditResult?.unitSummaries.filter((u) => {
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

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#002D5A] via-[#003B73] to-[#00204A] text-white rounded-2xl p-5 sm:p-6 shadow-md border border-sky-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#7EC2E8] text-[#002D5A] uppercase tracking-wider">
                Matriz Oficial de Fiscalização & Auditoria CPI / CPA/I
              </span>
              <span className="text-xs text-sky-200 font-semibold">
                Portaria nº {ordinance.number} (Teto 6h · R$ {ordinance.unitValueJoe.toFixed(2).replace('.', ',')})
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[#7EC2E8]" />
              <span>Painel de Auditoria de Documentos de JOE (Formato Matriz)</span>
            </h2>
            <p className="text-xs sm:text-sm text-sky-100/90 max-w-3xl leading-relaxed">
              Carregue os arquivos diretamente nas células da tabela (<strong>a partir de 2 documentos por unidade</strong>, não sendo obrigatório todos). O sistema cruzará os dados e gerará o relatório consolidado discriminado em <strong>ordem crescente (CPA/I-1 a CPA/I-9 e CPI)</strong>.
            </p>
          </div>

          <div className="flex flex-wrap md:flex-col gap-2 shrink-0 bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sky-200">Regra:</span>
              <span className="font-bold text-white">Mínimo 2 arquivos</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sky-200">Unidades:</span>
              <span className="font-bold text-[#7EC2E8]">{selectedUnitCodes.length} de {AUDIT_UNITS_MATRIX.length} Selecionadas</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sky-200">Ordem:</span>
              <span className="font-bold text-white">Crescente (1..9, CPI)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Controls Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
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
            onClick={handleLoadSampleData}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Preencher dados de exemplo realistas para demonstração"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Carregar Exemplo Realista</span>
          </button>
          <button
            onClick={handleClearAllMatrix}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar Tudo</span>
          </button>
        </div>

        {/* Master Execution Button */}
        <button
          onClick={handleRunAudit}
          disabled={selectedUnitCodes.length === 0 || isAuditing || isProcessingFile}
          className="px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#002D5A] hover:bg-[#001F3F] text-white shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
        >
          {isAuditing ? (
            <>
              <Loader2 className="w-4 h-4 text-[#7EC2E8] animate-spin" />
              <span>Auditando Cruzamentos...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 text-[#7EC2E8]" />
              <span>Executar Auditoria de JOE ({selectedUnitCodes.length} Unidades)</span>
            </>
          )}
        </button>
      </div>

      {/* Processing Banner */}
      {isProcessingFile && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-center gap-3 animate-pulse">
          <Loader2 className="w-5 h-5 text-[#002D5A] animate-spin shrink-0" />
          <div className="text-xs font-bold text-[#002D5A]">
            {processingStatus || 'Processando arquivo e extraindo conteúdo via OCR/Parser...'}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EXACT MATRIX TABLE AS SHOWN IN THE USER'S PRINT */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-slate-300 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
          <div className="flex items-center gap-2">
            <Table className="w-4 h-4 text-[#002D5A]" />
            <span className="font-bold text-slate-800 uppercase tracking-wide">
              Matriz de Upload e Cruzamento Documental
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Dica: Você pode arrastar e soltar arquivos (PDF, Excel, Word) diretamente dentro de qualquer célula
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border-2 border-black/80 shadow-2xs">
          <table className="w-full border-collapse border border-black text-xs font-sans">
            {/* Table Header: Grey background, bold uppercase, black borders */}
            <thead>
              <tr className="bg-[#D1D5DB] text-slate-900 border-b-2 border-black divide-x-2 divide-black">
                {/* Empty top-left cell with Select-All Checkbox */}
                <th className="p-2.5 w-28 text-center bg-[#E5E7EB] font-black tracking-wider">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-xs uppercase font-extrabold">UNIDADE</span>
                  </div>
                </th>

                {/* 6 Document Columns */}
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

            {/* Table Body: 10 Rows (CPI, CPAI-1, CPAI-2... CPAI-9) */}
            <tbody className="divide-y-2 divide-black bg-white">
              {AUDIT_UNITS_MATRIX.map((unit) => {
                const isSelected = selectedUnitCodes.includes(unit.code);
                const loadedCount = getLoadedCountForUnit(unit.code);
                const hasMinDocs = loadedCount >= 2;

                return (
                  <tr
                    key={unit.code}
                    className={`divide-x-2 divide-black transition-colors ${
                      isSelected ? 'bg-white hover:bg-sky-50/30' : 'bg-slate-100/70 opacity-65'
                    }`}
                  >
                    {/* Unit Column Header (CPI, CPAI-1, CPAI-2...) */}
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
                          title={
                            loadedCount >= 2
                              ? `${loadedCount} documentos carregados (Apto para auditoria)`
                              : loadedCount === 1
                              ? '1 documento carregado (Mínimo de 2 obrigatório)'
                              : 'Nenhum documento carregado'
                          }
                        >
                          {loadedCount}/6 docs {loadedCount >= 2 ? '✓' : loadedCount === 1 ? '(mín. 2)' : ''}
                        </span>
                      </div>
                    </td>

                    {/* 6 Document Cells in the Row */}
                    {MATRIX_COLUMNS.map((col) => {
                      const slot = documentsMatrix[unit.code]?.[col.type] || {
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
                            /* Filled State Card */
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
                                <span className="text-slate-400 font-mono">
                                  {slot.content.length > 1000
                                    ? `${Math.round(slot.content.length / 1000)}k carac.`
                                    : `${slot.content.length} carac.`}
                                </span>
                              </div>

                              {/* Mini Action Buttons */}
                              <div className="flex items-center justify-center gap-1 pt-1 border-t border-emerald-200/60">
                                <button
                                  onClick={() => handleOpenCellModal(unit.code, col.type)}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Visualizar ou editar conteúdo do texto extraído"
                                >
                                  <Eye className="w-3 h-3 text-[#002D5A]" />
                                  <span>Ver / Editar</span>
                                </button>
                                <button
                                  onClick={() => handleTriggerUpload(unit.code, col.type)}
                                  className="p-1 rounded-md text-[10px] text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                                  title="Substituir por outro arquivo"
                                >
                                  <Upload className="w-3 h-3 text-[#002D5A]" />
                                </button>
                                <button
                                  onClick={() => handleClearCell(unit.code, col.type)}
                                  className="p-1 rounded-md text-[10px] text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                                  title="Remover documento"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Empty State Button Matching User's Printout: e.g. "CARREGAR OFICIO" */
                            <div className="py-1">
                              <button
                                onClick={() => handleTriggerUpload(unit.code, col.type)}
                                className="w-full py-2 px-2 rounded-md font-black text-[11px] tracking-tight uppercase text-slate-800 bg-white hover:bg-slate-100 hover:border-slate-400 border border-slate-300 shadow-2xs transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-98"
                              >
                                <Upload className="w-3 h-3 text-slate-500" />
                                <span>{col.buttonLabel}</span>
                              </button>
                              <div className="mt-1 flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleOpenCellModal(unit.code, col.type)}
                                  className="text-[9px] text-slate-400 hover:text-[#002D5A] hover:underline cursor-pointer flex items-center gap-0.5"
                                >
                                  <Edit3 className="w-2.5 h-2.5" />
                                  <span>ou colar texto</span>
                                </button>
                              </div>
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

      {/* ========================================================================= */}
      {/* CONSOLIDATED MULTI-UNIT AUDIT REPORT IN ASCENDING ORDER */}
      {/* ========================================================================= */}
      {multiAuditResult && (
        <div className="space-y-6 animate-in slide-in-from-bottom-3 duration-300">
          {/* Main Verdict Card */}
          <div
            className={`rounded-2xl p-6 border shadow-sm ${
              multiAuditResult.overallStatus === 'APROVADO_CONFORME'
                ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                : multiAuditResult.overallStatus === 'PARCIAL_COM_PENDENCIAS'
                ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                : 'bg-rose-50/90 border-rose-300 text-rose-950'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                    multiAuditResult.overallStatus === 'APROVADO_CONFORME'
                      ? 'bg-emerald-600 text-white'
                      : multiAuditResult.overallStatus === 'PARCIAL_COM_PENDENCIAS'
                      ? 'bg-amber-600 text-white'
                      : 'bg-rose-600 text-white'
                  }`}
                >
                  {multiAuditResult.overallStatus === 'APROVADO_CONFORME' ? (
                    <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
                  ) : (
                    <ShieldAlert className="w-7 h-7 stroke-[2.5]" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-white/70">
                      Resultado Consolidado da Auditoria
                    </span>
                    <span className="text-xs font-mono text-slate-600">
                      Portaria nº {multiAuditResult.ordinanceNumber} · {multiAuditResult.totalUnitsAudited} Unidades Analisadas
                    </span>
                  </div>

                  <h3 className="text-xl font-black tracking-tight mt-1">
                    {multiAuditResult.overallStatus === 'APROVADO_CONFORME'
                      ? 'TODAS AS UNIDADES ESTÃO 100% CONFORMES — AUTORIZADAS PARA PAGAMENTO'
                      : multiAuditResult.overallStatus === 'PARCIAL_COM_PENDENCIAS'
                      ? `${multiAuditResult.approvedUnitsCount} UNIDADE(S) APROVADA(S) · ${multiAuditResult.pendingUnitsCount} COM PENDÊNCIA(S)`
                      : `DETECTADAS PENDÊNCIAS EM TODAS AS ${multiAuditResult.pendingUnitsCount} UNIDADES AUDITADAS`}
                  </h3>

                  <p className="text-xs sm:text-sm mt-1 opacity-90 leading-relaxed">
                    Relatório consolidado e ordenado rigorosamente em <strong>ordem crescente (CPA/I-1 ao CPA/I-9 e CPI)</strong>, com cruzamento das 6 regras da portaria.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
                <button
                  onClick={handleCopyFormattedAscendingReport}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-900 hover:bg-slate-50 border border-slate-300 shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedSection === 'FULL_ASCENDING_REPORT' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Copiada Tabela para Word!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#002D5A]" />
                      <span>Copiar Tabela Formatada (Word)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-200/60">
              <div className="bg-white/80 rounded-xl p-3 border border-slate-200/50">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unidades Aprovadas</div>
                <div className="text-base font-black text-emerald-700 mt-0.5">
                  {multiAuditResult.approvedUnitsCount} de {multiAuditResult.totalUnitsAudited}
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

          {/* ASCENDING ORDER DISCRIMINATED REPORT TABLE (CPA/I-1 TO CPA/I-9 + CPI) */}
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

            {/* Ascending Table */}
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
                        {/* Order Number: 01, 02... 09, 10 */}
                        <td className="py-3 px-3 text-center font-bold font-mono text-slate-500">
                          #{summary.orderNumber.toString().padStart(2, '0')}
                        </td>

                        {/* Unit Code & Name */}
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-900">{summary.commandId}</div>
                          <div className="text-[10px] text-slate-500 line-clamp-1">{summary.commandName}</div>
                        </td>

                        {/* Event / Subunit */}
                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-slate-800">{summary.eventName || 'Operação de JOE'}</div>
                          <div className="text-[10px] text-slate-500">{summary.subUnit || 'UPM / Batalhão'}</div>
                        </td>

                        {/* Turno Hours */}
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

                        {/* Efetivo Count */}
                        <td className="py-3 px-3 text-center font-bold text-slate-800">
                          {summary.totalOfficers > 0 ? `${summary.totalOfficers} PMs` : '—'}
                        </td>

                        {/* Valor Total */}
                        <td className="py-3 px-3.5 text-right font-black text-slate-900 font-mono">
                          {summary.totalAmount > 0 ? formatCurrencyBRL(summary.totalAmount) : '—'}
                        </td>

                        {/* Status Badge */}
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

                        {/* Inconsistencies / Parecer */}
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
                                  title="Copiar parecer de conformidade desta unidade para a área de transferência"
                                >
                                  {copiedSection === `PARECER_${summary.commandId}` ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      <span className="text-emerald-700">Texto Copiado!</span>
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
                                  title="Copiar texto completo de todas as pendências e parecer desta unidade para colar no SEI, Word, etc."
                                >
                                  {copiedSection === `PARECER_${summary.commandId}` ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      <span className="text-emerald-700 font-bold">Texto Copiado!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5 text-rose-700" />
                                      <span>Copiar Parecer Completo</span>
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

                        {/* Details Button */}
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

          {/* DRAFT SEI CONSOLIDATED DISPATCH */}
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
                    Todos os requisitos da Portaria nº {ordinance.number} - GCG foram cumpridos: turno com limite de 6h, valor unitário correto de R$ {ordinance.unitValue.toFixed(2)}, efetivo consistente e denominações padronizadas.
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
