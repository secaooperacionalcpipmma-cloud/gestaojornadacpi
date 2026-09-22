import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Layers,
  FileCheck,
  Building2,
  Table,
  BarChart3,
  CheckCircle2,
  Info,
  FileText,
  Copy,
  ClipboardCopy,
  ChevronDown,
  Check,
  Sparkles,
  CloudUpload,
  ExternalLink,
  FolderSearch,
} from 'lucide-react';
import {
  googleDriveBackupService,
  TARGET_DRIVE_FOLDER_LINK,
} from '../../services/googleDriveBackupService';
import { CommandUnit, OperationLaunch, OrdinancePeriod, User, CommandBudget } from '../../types';
import {
  formatCurrencyBRL,
  formatInteger,
  formatValorTotal,
  formatValorExecutado,
  formatValorDisponivel,
  formatJoeDisponivel,
} from '../../utils/formatters';
import { excelService, formatCommandDisplay, sortOperationsOfficial } from '../../services/excelService';
import { pdfService } from '../../services/pdfService';
import { storageService } from '../../services/storageService';
import {
  getOrdinanceStatusInfo,
  sortOrdinancesWithInEffectFirst,
} from '../../utils/ordinancePeriodUtils';
import {
  copyFormattedHtmlToClipboard,
  buildDetailedTableHtml,
  buildQuadroResumoHtml,
  buildUnifiedReportHtml,
  ReportColumnConfig,
} from '../../utils/clipboardHelper';
import { CommandBadge } from '../common/CommandBadge';
import {
  normalizeCommandName,
  sortCommandsByOfficialOrder,
  OFFICIAL_COMMAND_CODES,
} from '../../utils/commandUtils';

interface ReportsViewProps {
  commands: CommandUnit[];
  operations: OperationLaunch[];
  ordinances: OrdinancePeriod[];
  activeOrdinance: OrdinancePeriod;
  currentUser: User;
  budgets?: CommandBudget[];
}

interface ColumnField {
  id: string;
  label: string; // UI label in selection
  tableHeader: string; // Header in table/export
  defaultSelected: boolean;
  getter: (op: OperationLaunch, ord?: OrdinancePeriod) => string | number;
}

export function ReportsView({
  commands,
  operations,
  ordinances,
  activeOrdinance,
  currentUser,
  budgets,
}: ReportsViewProps) {
  // Selected ordinance filter (defaults to active in-effect ordinance)
  const [selectedOrdinanceId, setSelectedOrdinanceId] = useState<string>(activeOrdinance.id);

  // Date range filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Report Type Selection: 'UNIFIED' (Print 01 + Print 02) | 'DETAILED' | 'SUMMARY_CPI'
  const [reportType, setReportType] = useState<'UNIFIED' | 'DETAILED' | 'SUMMARY_CPI'>('UNIFIED');

  // Page orientation for PDF: 'landscape' (default - full view of 7 cols) or 'portrait'
  const [pdfOrientation, setPdfOrientation] = useState<'landscape' | 'portrait'>('landscape');

  // Copy to clipboard status and dropdown state
  const [isCopying, setIsCopying] = useState(false);
  const [copySuccessMessage, setCopySuccessMessage] = useState<string | null>(null);
  const [copyDropdownOpen, setCopyDropdownOpen] = useState(false);

  // List of standard 10 commands (CPI and CPA/I-1 to CPA/I-9)
  const commandList = useMemo(() => {
    const sorted = sortCommandsByOfficialOrder(commands, (c) => c.code);
    return sorted.map((c) => {
      const norm = normalizeCommandName(c.code || c.id || c.name);
      return {
        id: norm,
        code: norm,
        displayCode: norm,
        name: norm === 'CPI' ? 'CPI' : norm,
      };
    });
  }, [commands]);

  // Selected commands state (CPI to CPAI-9) - defaults to all 10 selected as array of string codes
  const [selectedCommands, setSelectedCommands] = useState<string[]>(() =>
    commands.map((c) => c.code)
  );

  // Available columns strictly ordered matching Print 03
  const availableColumns: ColumnField[] = useMemo(
    () => [
      {
        id: 'commandId',
        label: 'Comando de Área',
        tableHeader: 'COMANDO',
        defaultSelected: true,
        getter: (op) => formatCommandDisplay(op.commandId),
      },
      {
        id: 'subUnit',
        label: 'Unidade Subordinada',
        tableHeader: 'UNIDADE',
        defaultSelected: true,
        getter: (op) => op.subUnit || formatCommandDisplay(op.commandId),
      },
      {
        id: 'justification',
        label: 'Justificativa da JOE',
        tableHeader: 'JUSTIFICATIVA DA CRIAÇÃO DA JOE',
        defaultSelected: true,
        getter: (op) => op.justification || '-',
      },
      {
        id: 'orderNumber',
        label: 'Ordem de Serviço/Operação',
        tableHeader: 'ORDEM DE SERVIÇO/OPERAÇÃO',
        defaultSelected: true,
        getter: (op) =>
          op.orderNumber
            ? `${op.orderType === 'ORDEM_DE_OPERACAO' ? 'OO' : 'OS'} ${op.orderNumber}`
            : '-',
      },
      {
        id: 'eventName',
        label: 'Nome do Evento',
        tableHeader: 'NOME DO EVENTO',
        defaultSelected: true,
        getter: (op) => op.eventName,
      },
      {
        id: 'serviceDate',
        label: 'Data do Serviço',
        tableHeader: 'DATA',
        defaultSelected: true,
        getter: (op) => formatDate(op.serviceDate),
      },
      {
        id: 'startTime',
        label: 'Horário / Turno',
        tableHeader: 'HORÁRIO',
        defaultSelected: true,
        getter: (op) =>
          op.startTime
            ? op.endTime
              ? `${op.startTime} às ${op.endTime}`
              : op.startTime
            : '20h às 02h',
      },
      {
        id: 'officersCount',
        label: 'Efetivo Empregado (JOEs)',
        tableHeader: 'EFETIVO EMPREGADO',
        defaultSelected: true,
        getter: (op) => op.officersCount || 0,
      },
      {
        id: 'unitValue',
        label: 'Valor Unitário (R$)',
        tableHeader: 'VALOR UNITÁRIO',
        defaultSelected: true,
        getter: (op) => formatCurrencyBRL(op.unitValue || 350),
      },
      {
        id: 'totalValue',
        label: 'Valor Total (R$)',
        tableHeader: 'VALOR TOTAL',
        defaultSelected: true,
        getter: (op) => formatCurrencyBRL(op.totalValue || 0),
      },
      {
        id: 'launchNumber',
        label: 'Nº Lançamento',
        tableHeader: 'Nº LANÇAMENTO',
        defaultSelected: false,
        getter: (op) => op.launchNumber || op.id,
      },
      {
        id: 'ordinance',
        label: 'Portaria de Regulamentação',
        tableHeader: 'PORTARIA',
        defaultSelected: false,
        getter: (op, ord) => ord?.name || ord?.number || op.ordinanceId,
      },
      {
        id: 'seiProcessNumber',
        label: 'Processo SEI',
        tableHeader: 'PROCESSO SEI',
        defaultSelected: false,
        getter: (op) => op.seiProcessNumber || '-',
      },
      {
        id: 'status',
        label: 'Situação / Status',
        tableHeader: 'STATUS',
        defaultSelected: false,
        getter: (op) => op.status || 'APROVADO',
      },
      {
        id: 'createdBy',
        label: 'Cadastrado Por',
        tableHeader: 'CADASTRADO POR',
        defaultSelected: false,
        getter: (op) => op.createdBy || '-',
      },
    ],
    []
  );

  // Selected columns state
  const [selectedColumnIds, setSelectedColumnIds] = useState<string[]>(
    availableColumns.filter((c) => c.defaultSelected).map((c) => c.id)
  );

  // Current chosen ordinance
  const currentOrd = ordinances.find((o) => o.id === selectedOrdinanceId) || activeOrdinance;

  // Normalizer for command codes
  const normalizeCmd = (code: string): string => {
    if (!code) return '';
    return code
      .toUpperCase()
      .replace(/[\/\s\-_.]/g, '')
      .replace('DIRECAOSETORIAL', '')
      .replace('DIREÇÃOSETORIAL', '')
      .replace('COMANDO', '');
  };

  // Filter operations based on ordinance, selected commands, and dates (Sorted officially: CPI first, then CPAI-1 to CPAI-9)
  const filteredOperations = useMemo(() => {
    const matched = operations.filter((op) => {
      if (selectedOrdinanceId !== 'ALL' && op.ordinanceId !== selectedOrdinanceId) return false;

      // Filter by selected commands array
      if (selectedCommands.length > 0) {
        const opNorm = normalizeCmd(op.commandId);
        const match = selectedCommands.some((code) => {
          const codeNorm = normalizeCmd(code);
          return (
            op.commandId === code ||
            opNorm === codeNorm ||
            opNorm.includes(codeNorm) ||
            codeNorm.includes(opNorm)
          );
        });
        if (!match) return false;
      } else {
        return false;
      }

      if (startDate && op.serviceDate < startDate) return false;
      if (endDate && op.serviceDate > endDate) return false;
      return true;
    });

    return sortOperationsOfficial(matched);
  }, [operations, selectedOrdinanceId, selectedCommands, startDate, endDate]);

  // Aggregate totals
  const totalOfficersCount = useMemo(
    () => filteredOperations.reduce((sum, op) => sum + (op.officersCount || 0), 0),
    [filteredOperations]
  );
  const totalFinancialAmount = useMemo(
    () => filteredOperations.reduce((sum, op) => sum + (op.totalValue || 0), 0),
    [filteredOperations]
  );

  // Quadro Resumo CPI Data Breakdown (PRINT 02 MODEL - EXACT REPLICATION)
  const quadroResumoData = useMemo(() => {
    const standardCodes = [...OFFICIAL_COMMAND_CODES];

    // Get budgets for the selected ordinance
    const effectiveBudgets =
      (budgets && budgets.length > 0
        ? budgets.filter((b) => b.ordinanceId === selectedOrdinanceId)
        : []) || [];

    const storedBudgets =
      effectiveBudgets.length > 0
        ? effectiveBudgets
        : storageService.getBudgets(selectedOrdinanceId);

    // Official standard amounts defined for Portaria 122/2026
    const defaultDisponibilizado: Record<string, { val: number; joes: number }> = {
      'CPI': { val: 10500, joes: 30 },
      'CPA/I-1': { val: 65100, joes: 186 },
      'CPA/I-2': { val: 65100, joes: 186 },
      'CPA/I-3': { val: 105000, joes: 300 },
      'CPA/I-4': { val: 65100, joes: 186 },
      'CPA/I-5': { val: 80500, joes: 230 },
      'CPA/I-6': { val: 59500, joes: 170 },
      'CPA/I-7': { val: 65100, joes: 186 },
      'CPA/I-8': { val: 65100, joes: 186 },
      'CPA/I-9': { val: 79100, joes: 226 },
    };

    const rows = standardCodes.map((code) => {
      const bgt = storedBudgets.find(
        (b) => normalizeCommandName(b.commandId) === normalizeCommandName(code)
      );
      const def = defaultDisponibilizado[code] || { val: 0, joes: 0 };
      const valorTotalDisponibilizado =
        bgt?.budgetAmount !== undefined ? bgt.budgetAmount : def.val;
      const quantJoe = bgt?.plannedJoes !== undefined ? bgt.plannedJoes : def.joes;

      // Filter operations for this unit
      const opsForCode = filteredOperations.filter(
        (op) => normalizeCommandName(op.commandId) === normalizeCommandName(code)
      );

      const valorExecutado = opsForCode.reduce(
        (sum, op) => sum + (Number(op.totalValue) || 0),
        0
      );
      const quantJoeExecutada = opsForCode.reduce(
        (sum, op) => sum + (Number(op.officersCount) || 0),
        0
      );

      const valorDisponivel = valorTotalDisponibilizado - valorExecutado;
      const quantJoeDisponivel = quantJoe - quantJoeExecutada;

      return {
        code,
        valorTotalDisponibilizado,
        quantJoe,
        valorExecutado,
        quantJoeExecutada,
        valorDisponivel,
        quantJoeDisponivel,
        amount: valorExecutado, // backward compatibility
      };
    });

    const totalDisponibilizado = rows.reduce(
      (sum, r) => sum + r.valorTotalDisponibilizado,
      0
    );
    const totalQuantJoe = rows.reduce((sum, r) => sum + r.quantJoe, 0);
    const totalExecutado = rows.reduce((sum, r) => sum + r.valorExecutado, 0);
    const totalQuantExecutada = rows.reduce(
      (sum, r) => sum + r.quantJoeExecutada,
      0
    );
    const totalDisponivel = totalDisponibilizado - totalExecutado;
    const totalQuantDisponivel = totalQuantJoe - totalQuantExecutada;

    return {
      rows,
      totalDisponibilizado,
      totalQuantJoe,
      totalExecutado,
      totalQuantExecutada,
      totalDisponivel,
      totalQuantDisponivel,
      totalGeral: totalExecutado, // backward compatibility
    };
  }, [filteredOperations, selectedOrdinanceId, budgets]);

  // Command selection helpers for multi-unit selection array
  const handleSelectAllCommands = () => {
    setSelectedCommands(commands.map((c) => c.code));
  };

  const handleClearAllCommands = () => {
    setSelectedCommands([]);
  };

  const handleSelectExclusiveCommand = (cmdCode: string) => {
    setSelectedCommands([cmdCode]);
  };

  const handleToggleCommand = (cmdCode: string) => {
    setSelectedCommands((prev) =>
      prev.includes(cmdCode) ? prev.filter((c) => c !== cmdCode) : [...prev, cmdCode]
    );
  };

  // Column selection helpers
  const handleToggleColumn = (colId: string) => {
    setSelectedColumnIds((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId]
    );
  };

  const handleSelectAllColumns = () => {
    setSelectedColumnIds(availableColumns.map((c) => c.id));
  };

  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // COPIAR E COLAR FORMATADO PARA WORD / GOOGLE DOCS / SEI
  const handleCopyFormatted = async (targetType: 'UNIFIED' | 'DETAILED' | 'SUMMARY_CPI' = reportType) => {
    try {
      setIsCopying(true);
      const activeCols: ReportColumnConfig[] = availableColumns
        .filter((c) => selectedColumnIds.includes(c.id))
        .map((c) => ({
          id: c.id,
          tableHeader: c.tableHeader,
          getter: (op: OperationLaunch) => c.getter(op, currentOrd),
        }));

      let result: { html: string; plain: string };
      let label = '';

      if (targetType === 'SUMMARY_CPI') {
        result = buildQuadroResumoHtml(quadroResumoData, currentOrd);
        label = 'Quadro Resumo Geral do CPI';
      } else if (targetType === 'DETAILED') {
        result = buildDetailedTableHtml(
          filteredOperations,
          activeCols,
          currentOrd,
          totalOfficersCount,
          totalFinancialAmount
        );
        label = 'Planilha Detalhada de Lançamentos';
      } else {
        result = buildUnifiedReportHtml(
          filteredOperations,
          activeCols,
          quadroResumoData,
          currentOrd,
          totalOfficersCount,
          totalFinancialAmount
        );
        label = 'Relatório Integrado (Planilha + Quadro Resumo CPI)';
      }

      const success = await copyFormattedHtmlToClipboard(result.html, result.plain);
      if (success) {
        setCopySuccessMessage(
          `${label} copiado! Cole (Ctrl+V) diretamente no Word, Google Docs ou SEI com todas as cores, bordas e alinhamentos formatados.`
        );
        setTimeout(() => {
          setCopySuccessMessage(null);
        }, 5000);
      } else {
        alert('Não foi possível copiar para a área de transferência. Verifique as permissões do navegador.');
      }
    } catch (err) {
      console.error('Erro ao copiar tabela formatada:', err);
      alert('Ocorreu um erro ao preparar os dados formatados para cópia.');
    } finally {
      setIsCopying(false);
      setCopyDropdownOpen(false);
    }
  };

  // EXCEL EXPORT FUNCTION (Styled Identical to System Preview)
  const handleExportExcel = async () => {
    if (filteredOperations.length === 0 && reportType !== 'SUMMARY_CPI') {
      alert('Não há dados correspondentes aos filtros para exportar.');
      return;
    }

    try {
      setIsExportingExcel(true);
      const activeCols = availableColumns
        .filter((c) => selectedColumnIds.includes(c.id))
        .map((c) => ({
          id: c.id,
          label: c.tableHeader,
          getter: (op: OperationLaunch) => c.getter(op, currentOrd),
        }));

      if (reportType === 'SUMMARY_CPI') {
        await excelService.exportQuadroResumoCPI(filteredOperations, currentOrd, commands);
      } else {
        await excelService.exportDetailedOperations(filteredOperations, currentOrd, activeCols);
      }
    } catch (err) {
      console.error('Erro ao gerar Excel:', err);
      alert('Ocorreu um erro ao gerar a planilha Excel formatada.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // PDF EXPORT FUNCTION (Formatted Identical to System Preview)
  const handleExportPDF = () => {
    if (filteredOperations.length === 0 && reportType !== 'SUMMARY_CPI') {
      alert('Não há dados correspondentes aos filtros para gerar o PDF.');
      return;
    }

    try {
      setIsExportingPDF(true);
      const activeCols = availableColumns
        .filter((c) => selectedColumnIds.includes(c.id))
        .map((c) => ({
          id: c.id,
          label: c.tableHeader,
          getter: (op: OperationLaunch) => c.getter(op, currentOrd),
        }));

      pdfService.generateOfficialCPIReportPDF(
        filteredOperations,
        currentOrd,
        reportType,
        activeCols,
        pdfOrientation
      );
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Ocorreu um erro ao gerar o relatório em PDF.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // SALVAR RELATÓRIO MAIS ATUAL NO GOOGLE DRIVE PARA TESTE
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const [driveSaveResult, setDriveSaveResult] = useState<{
    success: boolean;
    message: string;
    fileName?: string;
    webViewLink?: string;
    dayOfWeek?: string;
  } | null>(null);

  const handleSaveToDriveTest = async () => {
    try {
      setIsSavingToDrive(true);
      const res = await googleDriveBackupService.uploadBackupToDrive(currentUser, true);
      if (res.success) {
        setDriveSaveResult({
          success: true,
          message: `Relatório mais atualizado salvo com sucesso na pasta oficial do Google Drive!`,
          fileName: res.fileName,
          webViewLink: res.webViewLink || googleDriveBackupService.getTargetFolderLink(),
          dayOfWeek: res.dayOfWeek,
        });
      } else {
        setDriveSaveResult({
          success: false,
          message: res.message || 'Falha ao salvar no Google Drive.',
        });
      }
    } catch (err: any) {
      setDriveSaveResult({
        success: false,
        message: err.message || 'Erro durante o envio para o Google Drive.',
      });
    } finally {
      setIsSavingToDrive(false);
    }
  };

  // ABRIR GOOGLE PICKER PARA SELECIONAR ARQUIVO NO DRIVE
  const [isOpeningPicker, setIsOpeningPicker] = useState(false);

  const handleOpenGooglePicker = async () => {
    try {
      setIsOpeningPicker(true);
      await googleDriveBackupService.openGooglePicker(
        (doc) => {
          setDriveSaveResult({
            success: true,
            message: `Arquivo selecionado no Google Drive com sucesso via Google Picker!`,
            fileName: doc.name,
            webViewLink: doc.url || `https://drive.google.com/file/d/${doc.id}/view`,
          });
        },
        () => {
          // Cancelled
        }
      );
    } catch (err: any) {
      setDriveSaveResult({
        success: false,
        message: err.message || 'Não foi possível abrir o Google Picker.',
      });
    } finally {
      setIsOpeningPicker(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast de Notificação de Cópia Formatada com Sucesso */}
      {copySuccessMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-[#002D5A] text-white p-4 rounded-2xl shadow-2xl border-2 border-[#7EC2E8] flex items-start gap-3.5 animate-in fade-in slide-in-from-bottom-5">
          <div className="p-2 rounded-xl bg-emerald-500 text-white shrink-0 mt-0.5 shadow-xs">
            <Check className="w-5 h-5 stroke-[3]" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-xs sm:text-sm text-[#7EC2E8] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Tabela Copiada com Formatação!
            </div>
            <p className="text-xs text-slate-100 mt-1 leading-relaxed">
              {copySuccessMessage}
            </p>
          </div>
          <button
            onClick={() => setCopySuccessMessage(null)}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Banner de Resultado do Envio para o Google Drive (Teste) */}
      {driveSaveResult && (
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in ${
            driveSaveResult.success
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  driveSaveResult.success ? 'bg-emerald-600' : 'bg-rose-600'
                }`}
              ></span>
              <strong className="text-sm font-bold">{driveSaveResult.message}</strong>
              {driveSaveResult.dayOfWeek && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {driveSaveResult.dayOfWeek}
                </span>
              )}
            </div>
            {driveSaveResult.fileName && (
              <p className="text-xs font-mono text-slate-700">
                Arquivo gerado: <strong>{driveSaveResult.fileName}</strong>
              </p>
            )}
            {!driveSaveResult.success && driveSaveResult.message.includes('origin_mismatch') && (
              <p className="text-xs text-rose-800 bg-white/70 p-2 rounded-lg border border-rose-200 mt-1">
                <strong>Origem necessária no Google Cloud Console:</strong>{' '}
                <code className="font-mono">{typeof window !== 'undefined' ? window.location.origin : ''}</code>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {driveSaveResult.webViewLink && (
              <a
                href={driveSaveResult.webViewLink}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-all flex items-center gap-1.5"
              >
                <span>Abrir no Google Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            {!driveSaveResult.success && (
              <>
                <button
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(window.location.origin);
                      alert(`URL de Origem copiada: ${window.location.origin}`);
                    }
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 shadow-2xs transition-colors"
                >
                  Copiar URL da Origem
                </button>
                <button
                  onClick={handleExportExcel}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                >
                  Baixar Excel Agora
                </button>
              </>
            )}
            <button
              onClick={() => setDriveSaveResult(null)}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-[#002D5A] text-white shadow-sm">
              <FileSpreadsheet className="w-6 h-6 text-[#7EC2E8]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex flex-wrap items-center gap-2">
                Gerador de Relatórios Oficiais CPI
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <ClipboardCopy className="w-3 h-3 text-emerald-600" />
                  COPIAR P/ WORD
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                  PDF
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-50 text-[#002D5A] border border-[#7EC2E8]/60">
                  EXCEL
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Emissão, download em PDF/Excel e cópia formatada da tabela para Word, Google Docs e SEI
              </p>
            </div>
          </div>

          {/* Action Buttons with Copy & Paste Dropdown */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Split Button / Menu for Copying Formatted Table to Word/Docs */}
            <div className="relative">
              <div className="inline-flex rounded-xl shadow-sm">
                <button
                  onClick={() => handleCopyFormatted(reportType)}
                  disabled={isCopying}
                  title="Copiar tabela exibida formatada com bordas e cores para colar (Ctrl+V) no Word"
                  className="px-4 py-2.5 rounded-l-xl text-xs sm:text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  <ClipboardCopy className="w-4 h-4 text-emerald-200" />
                  <span>{isCopying ? 'Copiando...' : 'Copiar p/ Word (Ctrl+V)'}</span>
                </button>
                <button
                  onClick={() => setCopyDropdownOpen((prev) => !prev)}
                  disabled={isCopying}
                  title="Opções de cópia de tabelas"
                  className="px-2.5 py-2.5 rounded-r-xl border-l border-emerald-800/80 text-xs sm:text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all flex items-center justify-center cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  <ChevronDown className="w-4 h-4 text-emerald-200" />
                </button>
              </div>

              {/* Dropdown Options */}
              {copyDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-40 animate-in fade-in zoom-in-95">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Opções de Cópia Formatada
                  </div>
                  <button
                    onClick={() => handleCopyFormatted('UNIFIED')}
                    className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-slate-50 text-slate-800 font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#002D5A]" />
                    <span>Relatório Completo (Planilha + Resumo)</span>
                  </button>
                  <button
                    onClick={() => handleCopyFormatted('DETAILED')}
                    className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-slate-50 text-slate-800 font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Table className="w-3.5 h-3.5 text-[#002D5A]" />
                    <span>Apenas Planilha Detalhada ({filteredOperations.length} reg.)</span>
                  </button>
                  <button
                    onClick={() => handleCopyFormatted('SUMMARY_CPI')}
                    className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-slate-50 text-slate-800 font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-[#002D5A]" />
                    <span>Apenas Quadro Resumo Geral CPI</span>
                  </button>
                </div>
              )}
            </div>

            {/* PDF Export Button */}
            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-rose-700 hover:bg-rose-800 text-white transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <FileText className="w-4 h-4 text-rose-200" />
              <span>{isExportingPDF ? 'Gerando PDF...' : pdfOrientation === 'landscape' ? 'Gerar PDF (Paisagem)' : 'Gerar PDF (Retrato)'}</span>
            </button>

            {/* Excel Export Button */}
            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#002D5A] hover:bg-[#001F3F] text-white transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-[#7EC2E8]" />
              <span>{isExportingExcel ? 'Gerando Excel...' : 'Gerar Excel (.xlsx)'}</span>
            </button>

            {/* Save to Google Drive Test Button */}
            <button
              onClick={handleSaveToDriveTest}
              disabled={isSavingToDrive}
              title="Salvar o relatório mais atual diretamente na pasta oficial do Google Drive para teste"
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <CloudUpload className={`w-4 h-4 ${isSavingToDrive ? 'animate-spin' : 'text-emerald-200'}`} />
              <span>{isSavingToDrive ? 'Salvando no Drive...' : 'Salvar no Google Drive (Teste)'}</span>
            </button>

            {/* Google Picker Drive Explorer Button */}
            <button
              onClick={handleOpenGooglePicker}
              disabled={isOpeningPicker}
              title="Abrir o Google Picker oficial para selecionar planilhas ou arquivos no Google Drive"
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-indigo-700 hover:bg-indigo-800 text-white transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <FolderSearch className={`w-4 h-4 ${isOpeningPicker ? 'animate-spin' : 'text-indigo-200'}`} />
              <span>{isOpeningPicker ? 'Abrindo Picker...' : 'Selecionar no Drive (Picker)'}</span>
            </button>
          </div>
        </div>

        {/* Escolha do Modelo de Relatório (TABS / TOGGLES) */}
        <div className="pt-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Modelo de Relatório para Visualização, Cópia e Exportação
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setReportType('UNIFIED')}
              className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                reportType === 'UNIFIED'
                  ? 'border-[#002D5A] bg-sky-50/80 ring-2 ring-[#002D5A]/10'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <Layers className={`w-5 h-5 mt-0.5 ${reportType === 'UNIFIED' ? 'text-[#002D5A]' : 'text-slate-400'}`} />
              <div>
                <div className="font-bold text-xs sm:text-sm text-slate-900">
                  Relatório Integrado (Recomendado)
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Planilha detalhada no topo + Quadro Resumo CPI com espaço abaixo
                </div>
              </div>
            </button>

            <button
              onClick={() => setReportType('DETAILED')}
              className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                reportType === 'DETAILED'
                  ? 'border-[#002D5A] bg-sky-50/80 ring-2 ring-[#002D5A]/10'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <Table className={`w-5 h-5 mt-0.5 ${reportType === 'DETAILED' ? 'text-[#002D5A]' : 'text-slate-400'}`} />
              <div>
                <div className="font-bold text-xs sm:text-sm text-slate-900">
                  Apenas Planilha Detalhada
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Visualização somente dos lançamentos operacionais de cada unidade
                </div>
              </div>
            </button>

            <button
              onClick={() => setReportType('SUMMARY_CPI')}
              className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                reportType === 'SUMMARY_CPI'
                  ? 'border-[#002D5A] bg-sky-50/80 ring-2 ring-[#002D5A]/10'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <BarChart3 className={`w-5 h-5 mt-0.5 ${reportType === 'SUMMARY_CPI' ? 'text-[#002D5A]' : 'text-slate-400'}`} />
              <div>
                <div className="font-bold text-xs sm:text-sm text-slate-900">
                  Apenas Quadro Resumo CPI
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Tabela compacta com totais de CPAI-1 a CPAI-9 e Total Geral CPI
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Escolha da Orientação da Página para PDF (Paisagem vs Retrato) */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Orientação da Página no PDF (Visualização Total)
            </label>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 self-start sm:self-auto">
              Modo Paisagem: 100% das 7 Colunas Visíveis sem Cortes
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => setPdfOrientation('landscape')}
              className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                pdfOrientation === 'landscape'
                  ? 'border-[#002D5A] bg-sky-50/80 ring-2 ring-[#002D5A]/10 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className={`w-8 h-5 rounded border-2 mt-0.5 shrink-0 flex items-center justify-center font-mono text-[9px] font-black transition-colors ${
                pdfOrientation === 'landscape' ? 'border-[#002D5A] bg-[#002D5A] text-white' : 'border-slate-400 text-slate-500'
              }`}>
                ▬
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs sm:text-sm text-slate-900">
                    Modo Paisagem (Horizontal • A4 297mm)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-600 text-white">
                    RECOMENDADO
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Exibe o relatório em largura estendida. Garante visualização de 100% das 7 colunas do Quadro Resumo CPI e da Planilha sem qualquer corte na lateral direita.
                </div>
              </div>
            </button>

            <button
              onClick={() => setPdfOrientation('portrait')}
              className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                pdfOrientation === 'portrait'
                  ? 'border-[#002D5A] bg-sky-50/80 ring-2 ring-[#002D5A]/10 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className={`w-5 h-8 rounded border-2 mt-0.5 shrink-0 flex items-center justify-center font-mono text-[9px] font-black transition-colors ${
                pdfOrientation === 'portrait' ? 'border-[#002D5A] bg-[#002D5A] text-white' : 'border-slate-400 text-slate-500'
              }`}>
                ▮
              </div>
              <div className="flex-1">
                <div className="font-bold text-xs sm:text-sm text-slate-900">
                  Modo Retrato (Vertical • A4 210mm)
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Formato vertical clássico com colunas e tipografia ajustadas proporcionalmente para caber na folha.
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Info Banner with Copy explanation */}
        <div className="p-3.5 bg-sky-50/70 border border-[#7EC2E8]/40 rounded-xl flex items-start gap-3 text-xs text-slate-700">
          <Info className="w-4 h-4 text-[#002D5A] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            Configurado para a <strong>Portaria em Vigor ({activeOrdinance.number})</strong>. Os cálculos de cada CPAI e do Total Geral são executados <strong>automaticamente pelo sistema</strong>. A opção <strong>"Copiar p/ Word"</strong> copia a tabela exatamente como exibida com todas as grades, cabeçalhos azuis e valores formatados para colar com <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-300 font-mono text-[10px] font-bold text-slate-800">Ctrl + V</kbd> no Word ou SEI.
          </div>
        </div>
      </div>

      {/* Grid: Ordinance & Date Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Ordinance Filter */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-[#002D5A]" />
            <span>Portaria Regulamentadora</span>
          </label>
          <select
            value={selectedOrdinanceId}
            onChange={(e) => setSelectedOrdinanceId(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A]"
          >
            {sortOrdinancesWithInEffectFirst(ordinances).map((ord) => {
              const statusInfo = getOrdinanceStatusInfo(ord);
              return (
                <option key={ord.id} value={ord.id}>
                  {ord.name || ord.number} {statusInfo.selectorLabel}
                </option>
              );
            })}
            <option value="ALL">Todas as Portarias (Geral Histórico)</option>
          </select>
        </div>

        {/* Start Date */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#002D5A]" />
            <span>Data Inicial (Opcional)</span>
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A]"
          />
        </div>

        {/* End Date */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#002D5A]" />
            <span>Data Final (Opcional)</span>
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A]"
          />
        </div>
      </div>

      {/* Card 1: Seleção Resumida de Comandos (CPI até CPAI-9) - PRINT 01 */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#002D5A]" />
              Seleção de Comandos de Área (CPI até CPAI-9)
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-[#002D5A] border border-[#7EC2E8]">
                {selectedCommands.length === commandList.length && commandList.length > 0
                  ? 'Todas as 10 Unidades Selecionadas'
                  : selectedCommands.length === 1
                  ? `1 Unidade Selecionada (${selectedCommands[0]})`
                  : selectedCommands.length === 0
                  ? 'Nenhuma Unidade Selecionada'
                  : `${selectedCommands.length} de ${commandList.length} unidades selecionadas`}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Filtre por <strong>apenas uma unidade</strong>, <strong>múltiplas unidades</strong> ou <strong>todas</strong> para compor relatórios, PDFs e planilhas formatadas
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick dropdown for 1-click single unit selection */}
            <select
              value={
                selectedCommands.length === 1
                  ? selectedCommands[0]
                  : selectedCommands.length === commandList.length && commandList.length > 0
                  ? 'ALL'
                  : selectedCommands.length === 0
                  ? 'NONE'
                  : ''
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'ALL') {
                  handleSelectAllCommands();
                } else if (val === 'NONE') {
                  handleClearAllCommands();
                } else if (val) {
                  handleSelectExclusiveCommand(val);
                }
              }}
              className="bg-sky-50/80 border border-[#7EC2E8] text-[#002D5A] text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-hidden cursor-pointer"
            >
              <option value="">Filtro Rápido...</option>
              <option value="ALL">Selecionar Todos (10 Comandos)</option>
              <option value="NONE">Limpar Seleção (Nenhum)</option>
              <optgroup label="Filtrar Apenas 1 Unidade:">
                {commandList.map((c) => (
                  <option key={c.id} value={c.code}>
                    Apenas {c.code}
                  </option>
                ))}
              </optgroup>
            </select>

            <button
              onClick={handleSelectAllCommands}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#002D5A] bg-sky-50 hover:bg-sky-100 border border-[#7EC2E8]/40 transition-colors cursor-pointer"
            >
              Selecionar Todos
            </button>
            <button
              onClick={handleClearAllCommands}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Desmarcar Todos
            </button>
          </div>
        </div>

        {/* 10 Command Cards (CPI and CPA/I-1 to CPA/I-9) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {commandList.map((cmd) => {
            const isChecked = selectedCommands.includes(cmd.code);
            return (
              <div
                key={cmd.id}
                onClick={() => handleToggleCommand(cmd.code)}
                className={`p-3 rounded-xl border flex flex-col items-center justify-between text-center gap-2 cursor-pointer transition-all relative group ${
                  isChecked
                    ? 'border-[#002D5A] bg-sky-50/70 text-[#002D5A] font-bold shadow-xs ring-1 ring-[#002D5A]/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 opacity-70'
                }`}
              >
                <div className="w-full flex items-center justify-between pointer-events-none">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    readOnly
                    className="w-4 h-4 rounded text-[#002D5A] focus:ring-[#7EC2E8] border-slate-300 pointer-events-none"
                  />
                  {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-[#002D5A]" />}
                </div>

                <div className="pointer-events-none">
                  <CommandBadge commandCode={cmd.code} size="sm" />
                </div>

                <div className="text-xs font-bold tracking-tight pointer-events-none">
                  {cmd.displayCode}
                </div>

                {/* Direct 1-Click Exclusive Button */}
                <button
                  type="button"
                  title={`Filtrar apenas ${cmd.code}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectExclusiveCommand(cmd.code);
                  }}
                  className="w-full mt-1 py-1 px-1.5 text-[10px] font-bold rounded-lg bg-white hover:bg-[#002D5A] text-slate-600 hover:text-white border border-slate-200 hover:border-[#002D5A] transition-all shadow-2xs cursor-pointer"
                >
                  Apenas Este
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card 2: Column Selection (Only for Detailed Mode) - PRINT 02 */}
      {reportType !== 'SUMMARY_CPI' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#002D5A]" />
                Campos e Colunas do Relatório
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {selectedColumnIds.length} de {availableColumns.length} colunas ativas
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Marque os campos cadastrados que você deseja incluir na planilha formatada
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAllColumns}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#002D5A] bg-sky-50 hover:bg-sky-100 border border-[#7EC2E8]/40 transition-colors cursor-pointer"
              >
                Selecionar Todas as Colunas
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {availableColumns.map((col) => {
              const isChecked = selectedColumnIds.includes(col.id);
              return (
                <label
                  key={col.id}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    isChecked
                      ? 'border-[#002D5A] bg-sky-50/70 text-[#002D5A] font-bold shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleColumn(col.id)}
                    className="w-4 h-4 rounded text-[#002D5A] focus:ring-[#7EC2E8] border-slate-300"
                  />
                  <span>{col.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Card 3: Preview Area (PRINT 01 + ESPAÇO + PRINT 02) */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              {reportType === 'SUMMARY_CPI'
                ? 'Pré-visualização do Quadro Resumo CPI'
                : reportType === 'DETAILED'
                ? `Pré-visualização da Planilha Detalhada (${filteredOperations.length} registros)`
                : `Pré-visualização do Relatório Integrado: Planilha Detalhada + Quadro Resumo CPI`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Valores e totais calculados automaticamente pelo sistema em tempo real
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
              <span className="text-slate-500 block">Total de JOEs:</span>
              <strong className="text-slate-900 font-mono text-sm font-bold">
                {formatInteger(totalOfficersCount)}
              </strong>
            </div>
            <div className="p-3 bg-sky-50 rounded-xl border border-[#7EC2E8]/40">
              <span className="text-slate-500 block">Valor Total:</span>
              <strong className="text-[#002D5A] font-mono text-sm font-black">
                {formatCurrencyBRL(totalFinancialAmount)}
              </strong>
            </div>
          </div>
        </div>

        {/* PARTE 1: PLANILHA DETALHADA DE OPERAÇÕES (PRINT 01) */}
        {(reportType === 'UNIFIED' || reportType === 'DETAILED') && (
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Table className="w-4 h-4 text-[#002D5A]" />
                <span>1. Planilha Detalhada de Lançamentos ({filteredOperations.length} registros)</span>
              </h4>

              {/* Quick Copy Button specifically for this table */}
              <button
                onClick={() => handleCopyFormatted('DETAILED')}
                disabled={isCopying}
                title="Copiar apenas esta tabela detalhada com formatação para o Word"
                className="self-start sm:self-auto px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer active:scale-98"
              >
                <Copy className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copiar Tabela Detalhada (Word)</span>
              </button>
            </div>

            {/* Table styled exactly like Print 01 */}
            <div className="overflow-x-auto rounded-lg border border-slate-400 bg-white shadow-xs">
              <table className="w-full text-left text-[11px] text-slate-800 border-collapse">
                <thead className="bg-slate-100 border-b border-slate-400 text-slate-900 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    {availableColumns
                      .filter((c) => selectedColumnIds.includes(c.id))
                      .map((col) => (
                        <th
                          key={col.id}
                          className="py-2.5 px-3 border-r border-slate-300 last:border-r-0 whitespace-nowrap text-center"
                        >
                          {col.tableHeader}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredOperations.length === 0 ? (
                    <tr>
                      <td
                        colSpan={selectedColumnIds.length}
                        className="py-8 text-center text-slate-400 text-xs"
                      >
                        Nenhum registro encontrado para os comandos e filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredOperations.map((op) => (
                      <tr key={op.id} className="hover:bg-slate-50/70 transition-colors">
                        {availableColumns
                          .filter((c) => selectedColumnIds.includes(c.id))
                          .map((col) => {
                            const val = col.getter(op, currentOrd);
                            return (
                              <td
                                key={col.id}
                                className={`py-2 px-3 border-r border-slate-200 last:border-r-0 text-center ${
                                  col.id === 'unitValue' || col.id === 'totalValue'
                                    ? 'font-mono font-bold text-slate-900'
                                    : col.id === 'officersCount'
                                    ? 'font-mono font-bold text-slate-900'
                                    : col.id === 'command' || col.id === 'commandId' || col.id === 'subUnit'
                                    ? 'font-semibold text-slate-900'
                                    : 'text-slate-800'
                                }`}
                              >
                                {col.id === 'unitValue' || col.id === 'totalValue'
                                  ? (typeof val === 'number' ? formatCurrencyBRL(val) : String(val))
                                  : typeof val === 'number'
                                  ? formatInteger(val)
                                  : String(val)}
                              </td>
                            );
                          })}
                      </tr>
                    ))
                  )}
                  {/* Summary Footer Row (TOTAL UNIDADE - PRINT 01) */}
                  {filteredOperations.length > 0 && (
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900">
                      {availableColumns
                        .filter((c) => selectedColumnIds.includes(c.id))
                        .map((col, idx) => {
                          if (idx === 0) {
                            return (
                              <td
                                key={col.id}
                                className="py-2.5 px-3 uppercase tracking-wider font-black border-r border-slate-300 text-center"
                              >
                                TOTAL UNIDADE
                              </td>
                            );
                          }
                          if (col.id === 'totalValue') {
                            return (
                              <td
                                key={col.id}
                                className="py-2.5 px-3 font-mono font-black text-center text-slate-900 border-r border-slate-300 last:border-r-0"
                              >
                                {formatCurrencyBRL(totalFinancialAmount)}
                              </td>
                            );
                          }
                          if (col.id === 'officersCount') {
                            return (
                              <td
                                key={col.id}
                                className="py-2.5 px-3 font-mono font-black text-center text-slate-900 border-r border-slate-300 last:border-r-0"
                              >
                                {formatInteger(totalOfficersCount)}
                              </td>
                            );
                          }
                          return (
                            <td
                              key={col.id}
                              className="py-2.5 px-3 border-r border-slate-300 last:border-r-0 text-center"
                            ></td>
                          );
                        })}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ESPAÇO ENTRE O QUADRO DO PRINT 01 E O QUADRO DO PRINT 02 */}
        {reportType === 'UNIFIED' && (
          <div className="py-4 my-2 flex items-center justify-center">
            <div className="w-full border-t border-slate-200 relative">
              <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 px-3 bg-white text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
                Quadro Resumo Consolidado Abaixo
              </span>
            </div>
          </div>
        )}

        {/* PARTE 2: QUADRO RESUMO CPI (PRINT 02) */}
        {(reportType === 'UNIFIED' || reportType === 'SUMMARY_CPI') && (
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#002D5A]" />
                <span>2. Quadro Resumo Geral CPI (Cálculos Automáticos)</span>
              </h4>

              {/* Quick Copy Button specifically for Quadro Resumo */}
              <button
                onClick={() => handleCopyFormatted('SUMMARY_CPI')}
                disabled={isCopying}
                title="Copiar apenas o Quadro Resumo CPI formatado para o Word"
                className="self-start sm:self-auto px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer active:scale-98"
              >
                <Copy className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copiar Quadro Resumo (Word)</span>
              </button>
            </div>

            {/* Centered official layout matching Print 02 */}
            <div className="w-full border-2 border-slate-700 bg-white shadow-sm overflow-x-auto">
              <table className="w-full text-xs text-slate-900 border-collapse">
                <thead>
                  {/* Row 1: CPI */}
                  <tr>
                    <th
                      colSpan={7}
                      className="py-2.5 text-center font-black text-slate-900 text-lg tracking-widest bg-white border border-slate-400"
                    >
                      CPI
                    </th>
                  </tr>
                  {/* Row 2: QUADRO RESUMO CPI */}
                  <tr>
                    <th
                      colSpan={7}
                      className="py-2 text-center font-bold text-xs sm:text-sm tracking-wider uppercase bg-slate-200 border border-slate-400 text-slate-900"
                    >
                      QUADRO RESUMO CPI
                    </th>
                  </tr>
                  {/* Row 3: 7 Column Headers */}
                  <tr className="bg-slate-300 text-[11px] font-bold text-slate-900 uppercase">
                    <th className="py-2 px-3 text-center border border-slate-400 tracking-wider">
                      UNIDADE
                    </th>
                    <th className="py-2 px-3 text-center border border-slate-400 tracking-wider">
                      VALOR TOTAL DISPONIBILIZADO
                    </th>
                    <th className="py-2 px-3 text-center border border-slate-400 tracking-wider">
                      QUANT. JOE
                    </th>
                    <th className="py-2 px-3 text-center border border-slate-400 tracking-wider">
                      VALOR EXECUTADO
                    </th>
                    <th className="py-2 px-3 text-center border border-slate-400 tracking-wider">
                      QUANT. JOE EXECUTADA
                    </th>
                    <th className="py-2 px-3 text-center border border-slate-400 tracking-wider">
                      VALOR DISPONÍVEL
                    </th>
                    <th className="py-2 px-3 text-center border border-slate-400 tracking-wider">
                      QUANT. JOE DISPONÍVEL
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {quadroResumoData.rows.map((row) => (
                    <tr key={row.code} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 text-center font-bold border border-slate-300 text-slate-900">
                        {row.code}
                      </td>
                      <td className="py-2 px-3 text-center font-medium border border-slate-300 text-slate-900">
                        {formatValorTotal(row.valorTotalDisponibilizado)}
                      </td>
                      <td className="py-2 px-3 text-center font-medium border border-slate-300 text-slate-900">
                        {row.quantJoe}
                      </td>
                      <td className="py-2 px-3 text-center font-bold border border-slate-300 text-slate-900">
                        {formatValorExecutado(row.valorExecutado)}
                      </td>
                      <td className="py-2 px-3 text-center font-medium border border-slate-300 text-slate-900">
                        {row.quantJoeExecutada}
                      </td>
                      <td
                        className={`py-2 px-3 text-center font-medium border border-slate-300 ${
                          row.valorDisponivel < 0 ? 'text-red-700 font-bold' : 'text-slate-900'
                        }`}
                      >
                        {formatValorDisponivel(row.valorDisponivel)}
                      </td>
                      <td
                        className={`py-2 px-3 text-center font-medium border border-slate-300 ${
                          row.quantJoeDisponivel < 0 ? 'text-red-700 font-bold' : 'text-slate-900'
                        }`}
                      >
                        {formatJoeDisponivel(row.quantJoeDisponivel)}
                      </td>
                    </tr>
                  ))}
                  {/* Total Row: TOTAL GERAL CPI */}
                  <tr className="bg-slate-300 font-bold border-t-2 border-slate-700 text-slate-900">
                    <td className="py-2.5 px-3 text-center uppercase tracking-wider border border-slate-400 font-black text-xs sm:text-sm">
                      TOTAL GERAL CPI
                    </td>
                    <td className="py-2.5 px-3 text-center border border-slate-400 font-black text-xs sm:text-sm text-slate-900">
                      {formatValorTotal(quadroResumoData.totalDisponibilizado)}
                    </td>
                    <td className="py-2.5 px-3 text-center border border-slate-400 font-black text-xs sm:text-sm text-slate-900">
                      {quadroResumoData.totalQuantJoe}
                    </td>
                    <td className="py-2.5 px-3 text-center border border-slate-400 font-black text-xs sm:text-sm text-slate-900">
                      {formatValorExecutado(quadroResumoData.totalExecutado)}
                    </td>
                    <td className="py-2.5 px-3 text-center border border-slate-400 font-black text-xs sm:text-sm text-slate-900">
                      {quadroResumoData.totalQuantExecutada}
                    </td>
                    <td className="py-2.5 px-3 text-center border border-slate-400 font-black text-xs sm:text-sm text-slate-900">
                      {formatValorDisponivel(quadroResumoData.totalDisponivel)}
                    </td>
                    <td className="py-2.5 px-3 text-center border border-slate-400 font-black text-xs sm:text-sm text-slate-900">
                      {formatJoeDisponivel(quadroResumoData.totalQuantDisponivel)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Download & Copy Buttons in footer */}
        <div className="pt-5 border-t border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
            <Info className="w-4 h-4 text-[#002D5A] shrink-0" />
            <span>
              Formatos oficiais: <strong>Copiar p/ Word / Docs</strong>, <strong>PDF</strong> e <strong>Excel (.xlsx)</strong> estruturados com cabeçalhos, alinhamentos, bordas e somatórios idênticos à pré-visualização.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Primary Copy Button in Footer */}
            <button
              onClick={() => handleCopyFormatted(reportType)}
              disabled={isCopying}
              className="flex-1 sm:flex-initial px-5 py-3 rounded-xl text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <ClipboardCopy className="w-4.5 h-4.5 text-emerald-200" />
              <span>{isCopying ? 'Copiando Tabela...' : 'Copiar Tabela p/ Word (Ctrl+V)'}</span>
            </button>

            {/* PDF Export Button */}
            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="flex-1 sm:flex-initial px-5 py-3 rounded-xl text-sm font-bold bg-rose-700 hover:bg-rose-800 text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <FileText className="w-4.5 h-4.5 text-rose-200" />
              <span>{isExportingPDF ? 'Gerando Relatório PDF...' : pdfOrientation === 'landscape' ? 'Baixar Relatório em PDF (Modo Paisagem)' : 'Baixar Relatório em PDF (Modo Retrato)'}</span>
            </button>

            {/* Excel Export Button */}
            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="flex-1 sm:flex-initial px-5 py-3 rounded-xl text-sm font-bold bg-[#002D5A] hover:bg-[#001F3F] text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <Download className="w-4.5 h-4.5 text-[#7EC2E8]" />
              <span>{isExportingExcel ? 'Gerando Planilha Excel...' : 'Baixar Planilha em Excel (.xlsx)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}


