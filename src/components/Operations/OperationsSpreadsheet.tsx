import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  PlusCircle,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Copy,
  Edit2,
  Trash2,
  Eye,
  AlertTriangle,
  RotateCcw,
  Send,
  Printer,
  ChevronDown,
  ClipboardCopy,
  Check,
} from 'lucide-react';
import {
  OperationLaunch,
  CommandBudget,
  CommandUnit,
  OrdinancePeriod,
  User,
  OperationStatus,
} from '../../types';
import { pdfService } from '../../services/pdfService';
import { excelService, formatCommandDisplay } from '../../services/excelService';
import { copyFormattedHtmlToClipboard, buildDetailedTableHtml, ReportColumnConfig } from '../../utils/clipboardHelper';
import { formatCurrencyBRL, formatInteger } from '../../utils/formatters';

interface OperationsSpreadsheetProps {
  operations: OperationLaunch[];
  budgets: CommandBudget[];
  commands: CommandUnit[];
  ordinance: OrdinancePeriod;
  currentUser: User;
  onNewOperation: () => void;
  onEditOperation: (op: OperationLaunch) => void;
  onDuplicateOperation: (op: OperationLaunch) => void;
  onDeleteOperation: (opId: string) => void;
  onViewOperation: (op: OperationLaunch) => void;
  onGenerateRene: (op: OperationLaunch) => void;
  onStatusChange: (opId: string, status: OperationStatus, notes?: string, feedback?: string) => void;
  initialCpaFilter?: string;
}

export const OperationsSpreadsheet: React.FC<OperationsSpreadsheetProps> = ({
  operations,
  budgets,
  commands,
  ordinance,
  currentUser,
  onNewOperation,
  onEditOperation,
  onDuplicateOperation,
  onDeleteOperation,
  onViewOperation,
  onGenerateRene,
  onStatusChange,
  initialCpaFilter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cpaFilter, setCpaFilter] = useState(initialCpaFilter || 'ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'TABLE' | 'CARDS'>('TABLE');
  const [isCopying, setIsCopying] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Filtered operations
  const filteredOperations = useMemo(() => {
    return operations.filter((op) => {
      // Ordinance match
      if (op.ordinanceId !== ordinance.id) return false;

      // Role restriction: If CPA_GESTOR, restricted to their commandId
      if (currentUser.role === 'CPA_GESTOR' && currentUser.commandId && op.commandId !== currentUser.commandId) {
        return false;
      }

      // CPA Filter
      if (cpaFilter !== 'ALL' && op.commandId !== cpaFilter) return false;

      // Status Filter
      if (statusFilter !== 'ALL' && op.status !== statusFilter) return false;

      // Search query
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchesEvent = op.eventName.toLowerCase().includes(query);
        const matchesJustif = op.justification.toLowerCase().includes(query);
        const matchesUnit = op.subUnit.toLowerCase().includes(query);
        const matchesOrder = op.orderNumber.toLowerCase().includes(query);
        const matchesLocation = op.location.toLowerCase().includes(query);
        return matchesEvent || matchesJustif || matchesUnit || matchesOrder || matchesLocation;
      }

      return true;
    });
  }, [operations, ordinance.id, currentUser, cpaFilter, statusFilter, searchTerm]);

  // Totals calculations
  const totalOfficers = filteredOperations.reduce((sum, o) => sum + o.officersCount, 0);
  const totalJoes = filteredOperations.reduce((sum, o) => sum + o.officersCount * o.joesPerOfficer, 0);
  const totalValue = filteredOperations.reduce((sum, o) => sum + o.totalValue, 0);

  // Copy Formatted Table to Word / Docs
  const handleCopyTable = async () => {
    try {
      setIsCopying(true);
      const cols: ReportColumnConfig[] = [
        { id: 'commandId', tableHeader: 'COMANDO', getter: (op) => formatCommandDisplay(op.commandId) },
        { id: 'subUnit', tableHeader: 'UNIDADE', getter: (op) => op.subUnit || formatCommandDisplay(op.commandId) },
        { id: 'justification', tableHeader: 'JUSTIFICATIVA DA JOE', getter: (op) => op.justification || '-' },
        {
          id: 'orderNumber',
          tableHeader: 'ORDEM DE SERVIÇO/OPERAÇÃO',
          getter: (op) => (op.orderNumber ? `${op.orderType === 'ORDEM_DE_OPERACAO' ? 'OO' : 'OS'} ${op.orderNumber}` : '-'),
        },
        { id: 'eventName', tableHeader: 'NOME DO EVENTO', getter: (op) => op.eventName },
        {
          id: 'serviceDate',
          tableHeader: 'DATA',
          getter: (op) => {
            if (!op.serviceDate) return '';
            const p = op.serviceDate.split('-');
            return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : op.serviceDate;
          },
        },
        {
          id: 'startTime',
          tableHeader: 'HORÁRIO',
          getter: (op) => (op.startTime ? (op.endTime ? `${op.startTime} às ${op.endTime}` : op.startTime) : '20h às 02h'),
        },
        { id: 'officersCount', tableHeader: 'EFETIVO EMPREGADO', getter: (op) => op.officersCount || 0 },
        { id: 'unitValue', tableHeader: 'VALOR UNITÁRIO', getter: (op) => formatCurrencyBRL(op.unitValue || 350) },
        { id: 'totalValue', tableHeader: 'VALOR TOTAL', getter: (op) => formatCurrencyBRL(op.totalValue || 0) },
      ];

      const { html, plain } = buildDetailedTableHtml(
        filteredOperations,
        cols,
        ordinance,
        totalOfficers,
        totalValue
      );

      const ok = await copyFormattedHtmlToClipboard(html, plain);
      if (ok) {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 4000);
      }
    } catch (err) {
      console.error('Erro ao copiar tabela:', err);
    } finally {
      setIsCopying(false);
    }
  };

  // Selected Unit Budget Balance
  const selectedCpaBudget = useMemo(() => {
    if (cpaFilter === 'ALL') {
      const totalB = budgets.reduce((s, b) => s + b.budgetAmount, 0);
      const totalS = budgets.reduce((s, b) => s + b.committedAmount + b.executedAmount, 0);
      return {
        name: 'Geral CPI (Todas as Unidades)',
        budget: totalB,
        spent: totalS,
        balance: totalB - totalS,
      };
    }
    const b = budgets.find((b) => b.commandId === cpaFilter);
    return {
      name: cpaFilter,
      budget: b ? b.budgetAmount : 0,
      spent: b ? b.committedAmount + b.executedAmount : 0,
      balance: b ? b.availableBalance : 0,
    };
  }, [budgets, cpaFilter]);

  const getStatusBadge = (status: OperationStatus) => {
    switch (status) {
      case 'APROVADO':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            Aprovado
          </span>
        );
      case 'PENDENTE_ANALISE':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            Pendente Análise
          </span>
        );
      case 'EM_ANALISE':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
            Em Análise
          </span>
        );
      case 'CONSOLIDADO':
      case 'ENCAMINHADO_PAGADORIA':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-300">
            Consolidado / Pagadoria
          </span>
        );
      case 'DEVOLVIDO_CORRECAO':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            Devolvido p/ Correção
          </span>
        );
      case 'REJEITADO':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
            Rejeitado
          </span>
        );
      case 'RASCUNHO':
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            Rascunho
          </span>
        );
    }
  };

  const isCpiGestor = currentUser.role === 'CPI_GESTOR' || currentUser.role === 'ADMIN';

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-black text-[#00204A] tracking-tight">
              Planilha Oficial de Lançamentos da JOE
            </h2>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-[#00204A] text-[#FFD700] border border-[#00204A]">
              Modelo Portaria nº 122/2026-GCG
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro, fiscalização prévia e controle nominal dos serviços operacionais extraordinários.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 p-0.5 rounded-xl flex items-center border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                viewMode === 'TABLE' ? 'bg-[#00204A] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Planilha Oficial
            </button>
            <button
              onClick={() => setViewMode('CARDS')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                viewMode === 'CARDS' ? 'bg-[#00204A] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cartões
            </button>
          </div>

          <button
            onClick={handleCopyTable}
            disabled={isCopying}
            title="Copiar tabela filtrada formatada com cores e bordas para Word (Ctrl+V)"
            className="flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {copySuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <ClipboardCopy className="w-3.5 h-3.5 text-emerald-200" />
                <span>{isCopying ? 'Copiando...' : 'Copiar p/ Word'}</span>
              </>
            )}
          </button>

          <button
            onClick={() => pdfService.generateOperationsReport(filteredOperations, ordinance, cpaFilter)}
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5 text-[#D97706]" />
            <span>Gerar PDF</span>
          </button>

          <button
            onClick={() => excelService.exportOperationsToExcel(filteredOperations, budgets, ordinance, commands)}
            className="flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={onNewOperation}
            className="flex items-center space-x-1.5 bg-[#FFD700] hover:bg-[#ffe033] text-[#00204A] font-black px-4 py-2 rounded-xl text-xs shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4 text-[#00204A]" />
            <span>Nova Linha / JOE</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white border border-slate-200 rounded-2xl p-3 shadow-xs">
        {/* Search */}
        <div className="sm:col-span-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por evento, OS/OO, justificativa ou unidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#00204A]"
          />
        </div>

        {/* CPA Filter */}
        <div className="sm:col-span-3">
          <select
            value={cpaFilter}
            onChange={(e) => setCpaFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-[#00204A]"
          >
            <option value="ALL">Todos os Comandos (CPA/I-1 a 9)</option>
            {commands.map((cmd) => (
              <option key={cmd.id} value={cmd.code}>
                {cmd.code}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="sm:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-[#00204A]"
          >
            <option value="ALL">Todos os Status</option>
            <option value="PENDENTE_ANALISE">Pendente de Análise</option>
            <option value="EM_ANALISE">Em Análise</option>
            <option value="APROVADO">Aprovado</option>
            <option value="DEVOLVIDO_CORRECAO">Devolvido para Correção</option>
            <option value="CONSOLIDADO">Consolidado</option>
            <option value="ENCAMINHADO_PAGADORIA">Encaminhado à Pagadoria</option>
            <option value="REJEITADO">Rejeitado</option>
            <option value="RASCUNHO">Rascunho</option>
          </select>
        </div>

        {/* Clear Filters */}
        <div className="sm:col-span-2 flex items-center justify-end">
          {(searchTerm || cpaFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCpaFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="text-[11px] text-[#D97706] hover:text-amber-800 font-bold flex items-center"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Main Official Spreadsheet Table View */}
      {viewMode === 'TABLE' ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#00204A] text-slate-200 border-b border-slate-200 uppercase text-[10px] font-black tracking-wider">
                  <th className="py-3 px-3 text-center border-r border-[#00204A]/50">COMANDO</th>
                  <th className="py-3 px-3 border-r border-[#00204A]/50">UNIDADE</th>
                  <th className="py-3 px-3 border-r border-[#00204A]/50 min-w-[200px]">
                    JUSTIFICATIVA DA CRIAÇÃO DA JOE
                  </th>
                  <th className="py-3 px-3 text-center border-r border-[#00204A]/50">ORDEM DE SERV./OP.</th>
                  <th className="py-3 px-3 border-r border-[#00204A]/50 min-w-[180px]">NOME DO EVENTO</th>
                  <th className="py-3 px-3 text-center border-r border-[#00204A]/50">DATA</th>
                  <th className="py-3 px-3 text-center border-r border-[#00204A]/50">HORÁRIO</th>
                  <th className="py-3 px-3 text-center border-r border-[#00204A]/50">EFETIVO</th>
                  <th className="py-3 px-3 text-right border-r border-[#00204A]/50">VALOR UNIT.</th>
                  <th className="py-3 px-3 text-right border-r border-[#00204A]/50">VALOR TOTAL</th>
                  <th className="py-3 px-3 text-center border-r border-[#00204A]/50">STATUS</th>
                  <th className="py-3 px-3 text-center">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredOperations.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-500">
                      Nenhum lançamento encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredOperations.map((op) => (
                    <tr
                      key={op.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-2.5 px-3 font-bold text-center text-[#00204A] border-r border-slate-100 whitespace-nowrap">
                        {op.commandId}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 border-r border-slate-100 font-semibold whitespace-nowrap">
                        {op.subUnit}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 border-r border-slate-100 max-w-xs truncate" title={op.justification}>
                        {op.justification}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-700 border-r border-slate-100 whitespace-nowrap">
                        <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {op.orderType === 'ORDEM_DE_OPERACAO' ? 'OO' : 'OS'} {op.orderNumber}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-900 font-bold border-r border-slate-100 whitespace-nowrap">
                        {op.eventName}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-700 border-r border-slate-100 whitespace-nowrap font-mono text-[11px]">
                        {new Date(op.serviceDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-700 border-r border-slate-100 whitespace-nowrap font-mono text-[11px]">
                        {op.startTime} às {op.endTime}
                        <span className="block text-[9px] text-slate-500">
                          ({op.calculatedDurationHours}h)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-800 font-bold border-r border-slate-100">
                        {op.officersCount}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 border-r border-slate-100 font-mono">
                        R$ {op.unitValue.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-[#00204A] border-r border-slate-100 font-mono whitespace-nowrap">
                        R$ {op.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-slate-100 whitespace-nowrap">
                        {getStatusBadge(op.status)}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          {/* View detail */}
                          <button
                            onClick={() => onViewOperation(op)}
                            title="Ver Detalhes e Checklist SEI"
                            className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Generate RENE PDF */}
                          <button
                            onClick={() => onGenerateRene(op)}
                            title="Gerar RENE (Relatório de Execução Art. 10)"
                            className="p-1 text-[#D97706] hover:text-amber-800 hover:bg-amber-50 rounded"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* CPI Gestor Quick Approval */}
                          {isCpiGestor && ['PENDENTE_ANALISE', 'EM_ANALISE', 'RASCUNHO'].includes(op.status) && (
                            <button
                              onClick={() => onStatusChange(op.id, 'APROVADO')}
                              title="Aprovar Lançamento (Art. 13, I)"
                              className="p-1 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Duplicate */}
                          <button
                            onClick={() => onDuplicateOperation(op)}
                            title="Duplicar Lançamento"
                            className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => onEditOperation(op)}
                            title="Editar Lançamento"
                            className="p-1 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          {!['CONSOLIDADO', 'ENCAMINHADO_PAGADORIA'].includes(op.status) && (
                            <button
                              onClick={() => onDeleteOperation(op.id)}
                              title="Excluir Lançamento"
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Exact PMMA Footer matching the official spreadsheet */}
              <tfoot>
                <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200 text-[11px]">
                  <td colSpan={7} className="py-3 px-3 text-right uppercase tracking-wider text-slate-600">
                    TOTAL DA UNIDADE / FILTRO ({filteredOperations.length} Lançamentos):
                  </td>
                  <td className="py-3 px-3 text-center text-[#00204A] font-mono text-xs font-black">
                    {totalOfficers} Policiais
                  </td>
                  <td className="py-3 px-3 text-right text-slate-600 font-mono text-[10px] font-bold">
                    {totalJoes} JOEs
                  </td>
                  <td className="py-3 px-3 text-right font-black text-[#00204A] font-mono text-sm whitespace-nowrap">
                    R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2} className="py-3 px-3 text-center">
                    <span className="text-[10px] text-slate-500">
                      Saldo Restante {cpaFilter !== 'ALL' ? cpaFilter : 'CPI'}:{' '}
                      <strong className={selectedCpaBudget.balance < 0 ? 'text-red-700' : 'text-emerald-700'}>
                        R$ {selectedCpaBudget.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </strong>
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOperations.map((op) => (
            <div
              key={op.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-[#00204A]/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-[#00204A] text-xs">{op.commandId}</span>
                    <span className="text-slate-500 text-xs">• {op.subUnit}</span>
                  </div>
                  {getStatusBadge(op.status)}
                </div>

                <h4 className="font-bold text-sm text-slate-900 mt-2 leading-snug">
                  {op.eventName}
                </h4>

                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                  {op.justification}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-500">Ordem:</span>{' '}
                    <span className="font-semibold text-slate-800">
                      {op.orderType === 'ORDEM_DE_OPERACAO' ? 'OO' : 'OS'} {op.orderNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Data:</span>{' '}
                    <span className="font-semibold text-slate-800">
                      {new Date(op.serviceDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Horário:</span>{' '}
                    <span className="font-semibold text-slate-800">
                      {op.startTime} às {op.endTime} ({op.calculatedDurationHours}h)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Efetivo:</span>{' '}
                    <span className="font-semibold text-slate-800">{op.officersCount} PMs</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                  <span className="text-slate-500">Valor Total:</span>
                  <span className="font-black text-[#00204A] text-sm font-mono">
                    R$ {op.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => onViewOperation(op)}
                  className="text-xs text-[#00204A] hover:text-blue-800 font-bold flex items-center"
                >
                  <Eye className="w-3.5 h-3.5 mr-1 text-[#D97706]" />
                  Ver Detalhes SEI
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => onGenerateRene(op)}
                    title="Imprimir RENE"
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onEditOperation(op)}
                    title="Editar"
                    className="p-1.5 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
