import React, { useState, useMemo } from 'react';
import {
  Filter,
  RotateCcw,
  Search,
  Building2,
  Calendar,
  Layers,
  Edit2,
  Trash2,
  FileSpreadsheet,
  CheckCircle,
  RefreshCw,
  Plus,
  Clock,
  CheckSquare,
  Square,
  AlertTriangle,
  X,
} from 'lucide-react';
import { CommandUnit, OperationLaunch, OrdinancePeriod } from '../../types';
import { formatCurrencyBRL, formatInteger, formatDateBRL, formatDateTimeBRL } from '../../utils/formatters';
import {
  normalizeCommandName,
  sortCommandsByOfficialOrder,
} from '../../utils/commandUtils';
import { DeleteConfirmationModal } from '../common/DeleteConfirmationModal';

interface OperationsListViewProps {
  operations: OperationLaunch[];
  commands: CommandUnit[];
  ordinance: OrdinancePeriod;
  onEdit: (operation: OperationLaunch) => void;
  onDelete: (operationId: string) => void;
  onDeleteBatch?: (operationIds: string[]) => void | Promise<void>;
  initialCommandFilter?: string;
  onNavigateToReports?: () => void;
  onNavigateToCreate?: () => void;
  onRefreshData?: () => Promise<void> | void;
}

export function OperationsListView({
  operations,
  commands,
  ordinance,
  onEdit,
  onDelete,
  onDeleteBatch,
  initialCommandFilter,
  onNavigateToReports,
  onNavigateToCreate,
  onRefreshData,
}: OperationsListViewProps) {
  const [selectedCpa, setSelectedCpa] = useState<string>(initialCommandFilter || '');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [ordinanceScope, setOrdinanceScope] = useState<'CURRENT' | 'ALL'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Multi-selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal confirmation state
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    mode: 'SINGLE' | 'BATCH';
    operation?: OperationLaunch | null;
    operations?: OperationLaunch[];
  }>({
    isOpen: false,
    mode: 'SINGLE',
    operation: null,
    operations: [],
  });
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const normalizeCmd = (code?: string): string => {
    if (!code) return '';
    return code
      .toUpperCase()
      .replace(/[\/\s\-_.]/g, '')
      .replace('DIRECAOSETORIAL', '')
      .replace('DIREÇÃOSETORIAL', '')
      .replace('COMANDO', '');
  };

  // Active subunits for filter
  const activeCommand = commands.find(
    (c) =>
      c.code === selectedCpa ||
      c.name === selectedCpa ||
      c.id === selectedCpa ||
      normalizeCmd(c.code) === normalizeCmd(selectedCpa)
  );
  const availableUnits = activeCommand ? activeCommand.subunits : [];

  // Filter logic
  const filteredOperations = useMemo(() => {
    return operations
      .filter((op) => {
        if (ordinanceScope === 'CURRENT') {
          return (
            op.ordinanceId === ordinance.id ||
            op.ordinanceId === 'portaria-vigente' ||
            !op.ordinanceId
          );
        }
        return true;
      })
      .filter((op) => {
        if (selectedCpa) {
          const opNorm = normalizeCmd(op.commandId);
          const selNorm = normalizeCmd(selectedCpa);
          if (op.commandId !== selectedCpa && opNorm !== selNorm && !opNorm.includes(selNorm) && !selNorm.includes(opNorm)) {
            return false;
          }
        }
        if (selectedUnit && op.subUnit !== selectedUnit) return false;
        if (startDate && op.serviceDate < startDate) return false;
        if (endDate && op.serviceDate > endDate) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesEvent = op.eventName?.toLowerCase().includes(q) || false;
          const matchesOrder = op.orderNumber?.toLowerCase().includes(q) || false;
          const matchesSei = op.seiProcessNumber?.toLowerCase().includes(q) || false;
          const matchesSubunit = op.subUnit?.toLowerCase().includes(q) || false;
          const matchesCreator = op.createdBy?.toLowerCase().includes(q) || false;
          const matchesCmd = op.commandId?.toLowerCase().includes(q) || false;
          if (!matchesEvent && !matchesOrder && !matchesSei && !matchesSubunit && !matchesCreator && !matchesCmd) return false;
        }
        return true;
      });
  }, [operations, ordinanceScope, ordinance.id, selectedCpa, selectedUnit, startDate, endDate, searchQuery]);

  const handleClearFilters = () => {
    setSelectedCpa('');
    setSelectedUnit('');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setOrdinanceScope('ALL');
  };

  const handleManualRefresh = async () => {
    if (onRefreshData) {
      setIsRefreshing(true);
      try {
        await onRefreshData();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  // Selection handlers
  const isAllFilteredSelected =
    filteredOperations.length > 0 &&
    filteredOperations.every((op) => selectedIds.includes(op.id));

  const isSomeFilteredSelected =
    filteredOperations.some((op) => selectedIds.includes(op.id)) &&
    !isAllFilteredSelected;

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      // Deselect all filtered items
      const filteredIdsSet = new Set(filteredOperations.map((o) => o.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredIdsSet.has(id)));
    } else {
      // Select all filtered items
      const newIds = Array.from(
        new Set([...selectedIds, ...filteredOperations.map((o) => o.id)])
      );
      setSelectedIds(newIds);
    }
  };

  const handleToggleSelectOne = (opId: string) => {
    setSelectedIds((prev) =>
      prev.includes(opId) ? prev.filter((id) => id !== opId) : [...prev, opId]
    );
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Selected items objects for summary and batch actions
  const selectedOpsList = useMemo(() => {
    const idSet = new Set(selectedIds);
    return operations.filter((o) => idSet.has(o.id));
  }, [operations, selectedIds]);

  const selectedTotalOfficers = selectedOpsList.reduce(
    (sum, o) => sum + (o.officersCount || 0),
    0
  );
  const selectedTotalFinancial = selectedOpsList.reduce(
    (sum, o) => sum + (o.totalValue || 0),
    0
  );

  // Deletion trigger functions (Opening modal with explicit confirmation)
  const handleOpenSingleDelete = (op: OperationLaunch) => {
    setDeleteModalState({
      isOpen: true,
      mode: 'SINGLE',
      operation: op,
      operations: [],
    });
  };

  const handleOpenBatchDelete = () => {
    if (selectedOpsList.length === 0) return;
    setDeleteModalState({
      isOpen: true,
      mode: 'BATCH',
      operation: null,
      operations: selectedOpsList,
    });
  };

  const handleCloseDeleteModal = () => {
    if (isDeleting) return;
    setDeleteModalState({
      isOpen: false,
      mode: 'SINGLE',
      operation: null,
      operations: [],
    });
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (deleteModalState.mode === 'SINGLE' && deleteModalState.operation) {
        const idToDelete = deleteModalState.operation.id;
        await onDelete(idToDelete);
        setSelectedIds((prev) => prev.filter((id) => id !== idToDelete));
      } else if (deleteModalState.mode === 'BATCH' && deleteModalState.operations) {
        const idsToDelete = deleteModalState.operations.map((o) => o.id);
        if (onDeleteBatch) {
          await onDeleteBatch(idsToDelete);
        } else {
          for (const id of idsToDelete) {
            await onDelete(id);
          }
        }
        setSelectedIds((prev) =>
          prev.filter((id) => !idsToDelete.includes(id))
        );
      }
    } finally {
      setIsDeleting(false);
      setDeleteModalState({
        isOpen: false,
        mode: 'SINGLE',
        operation: null,
        operations: [],
      });
    }
  };

  // Totals for filtered records
  const totalOfficers = filteredOperations.reduce((sum, o) => sum + (o.officersCount || 0), 0);
  const totalFinancial = filteredOperations.reduce((sum, o) => sum + (o.totalValue || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Filter Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-[#002D5A]" />
            <span>Filtros de Pesquisa e Segmentação</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Portaria:</span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
              <button
                type="button"
                onClick={() => setOrdinanceScope('ALL')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  ordinanceScope === 'ALL'
                    ? 'bg-[#002D5A] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas ({operations.length})
              </button>
              <button
                type="button"
                onClick={() => setOrdinanceScope('CURRENT')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  ordinanceScope === 'CURRENT'
                    ? 'bg-[#002D5A] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {ordinance.number}
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 items-end">
          {/* CPA/I Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Comando (CPA/I)
            </label>
            <select
              value={selectedCpa}
              onChange={(e) => {
                setSelectedCpa(e.target.value);
                setSelectedUnit('');
              }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all"
            >
              <option value="">Todos os comandos</option>
              {sortCommandsByOfficialOrder(commands, (c) => c.code).map((cmd) => {
                const norm = normalizeCommandName(cmd.code || cmd.id || cmd.name);
                return (
                  <option key={cmd.id || norm} value={norm}>
                    {norm}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Unidade Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Unidade Subordinada
            </label>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              disabled={!selectedCpa}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] disabled:bg-slate-50 disabled:text-slate-400 transition-all"
            >
              <option value="">Todas as unidades</option>
              {availableUnits.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          {/* De Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Data Inicial
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all"
            />
          </div>

          {/* Até Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Data Final
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all"
            />
          </div>

          {/* Buscar Text */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Termo / Evento / SEI
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ex: Impacto, 2026..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
            </div>
          </div>

          {/* Filter & Clear Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearFilters}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs sm:text-sm py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating / Sticky Bulk Action Bar when items are selected */}
      {selectedIds.length > 0 && (
        <div className="bg-[#002D5A] text-white p-4 rounded-2xl shadow-xl border border-sky-400/30 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-[#7EC2E8] shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base">
                  {selectedIds.length} lançamento(s) selecionado(s)
                </span>
                <span className="text-xs bg-white/15 px-2 py-0.5 rounded-full font-mono font-semibold">
                  {formatInteger(selectedTotalOfficers)} JOEs
                </span>
                <span className="text-xs bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  {formatCurrencyBRL(selectedTotalFinancial)}
                </span>
              </div>
              <p className="text-xs text-sky-200">
                Selecione os registros para exclusão imediata no sistema e banco de dados.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleClearSelection}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              <span>Desmarcar Todos</span>
            </button>
            <button
              type="button"
              onClick={handleOpenBatchDelete}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir Selecionados ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-xs sm:text-sm">
              Lançamentos Registrados ({filteredOperations.length})
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-[#002D5A] border border-[#7EC2E8]">
              {ordinance.number}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onRefreshData && (
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Sincronizar dados com o Supabase"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Sincronizando...' : 'Sincronizar Banco'}</span>
              </button>
            )}

            {onNavigateToCreate && (
              <button
                type="button"
                onClick={onNavigateToCreate}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#002D5A] hover:bg-[#001F3F] text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#7EC2E8]" />
                <span>Novo Lançamento</span>
              </button>
            )}

            {onNavigateToReports && (
              <button
                type="button"
                onClick={onNavigateToReports}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#002D5A]" />
                <span>Relatório Excel</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-700">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                {/* Select All Checkbox */}
                <th className="py-3.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllFilteredSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeFilteredSelected;
                    }}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-[#002D5A] focus:ring-[#7EC2E8] border-slate-300 cursor-pointer"
                    title="Selecionar todos os lançamentos visíveis"
                  />
                </th>
                <th className="py-3.5 px-4">CPA/I</th>
                <th className="py-3.5 px-4">Unidade</th>
                <th className="py-3.5 px-4">Evento / Operação</th>
                <th className="py-3.5 px-4">Ordem / Processo SEI</th>
                <th className="py-3.5 px-4">Data do Serviço</th>
                <th className="py-3.5 px-4">Lançado Em (Dia / Hora)</th>
                <th className="py-3.5 px-4 text-center">Efetivo (JOEs)</th>
                <th className="py-3.5 px-4 text-right">Valor Unit.</th>
                <th className="py-3.5 px-4 text-right">Total</th>
                <th className="py-3.5 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOperations.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-600 mb-1">
                      Nenhum lançamento de JOE encontrado para os filtros selecionados.
                    </p>
                    <p className="text-xs text-slate-400 mb-4">
                      Você pode registrar uma nova solicitação de jornada agora mesmo.
                    </p>
                    {onNavigateToCreate && (
                      <button
                        type="button"
                        onClick={onNavigateToCreate}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#002D5A] hover:bg-[#001F3F] text-white text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
                      >
                        <Plus className="w-4 h-4 text-[#7EC2E8]" />
                        <span>Lançar Solicitação de JOE</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredOperations.map((op) => {
                  const isSelected = selectedIds.includes(op.id);
                  return (
                    <tr
                      key={op.id}
                      className={`transition-colors group ${
                        isSelected
                          ? 'bg-sky-50/80 hover:bg-sky-100/70 font-medium'
                          : 'hover:bg-sky-50/40'
                      }`}
                    >
                      {/* Row Checkbox */}
                      <td className="py-3.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(op.id)}
                          className="w-4 h-4 rounded text-[#002D5A] focus:ring-[#7EC2E8] border-slate-300 cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <span className="inline-block px-2 py-0.5 rounded-lg bg-sky-50 text-[#002D5A] border border-[#7EC2E8]/40 font-mono text-xs">
                          {op.commandId}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-semibold">
                        {op.subUnit}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{op.eventName}</div>
                        {op.eventSubtext && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            {op.eventSubtext}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 text-xs">{op.orderNumber}</div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {op.seiProcessNumber}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="font-bold text-slate-900">{formatDateBRL(op.serviceDate)}</div>
                        <div className="text-xs text-slate-500">{op.startTime || '20h às 02h'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 bg-slate-100/90 px-2 py-1 rounded-md border border-slate-200/80">
                          <Clock className="w-3 h-3 text-[#002D5A]" />
                          <span>{formatDateTimeBRL(op.createdAt)}</span>
                        </div>
                        {op.createdBy && (
                          <div className="text-[10px] text-slate-400 mt-0.5 font-medium truncate max-w-[140px]" title={`Por: ${op.createdBy}`}>
                            Por: {op.createdBy}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-900 font-mono text-sm">
                        {formatInteger(op.officersCount)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-600 font-mono text-xs sm:text-sm">
                        {formatCurrencyBRL(op.unitValue)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-[#002D5A] font-mono text-xs sm:text-sm">
                        {formatCurrencyBRL(op.totalValue)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => onEdit(op)}
                            className="p-1.5 rounded-lg text-[#002D5A] hover:bg-sky-100 transition-colors cursor-pointer"
                            title="Editar lançamento"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenSingleDelete(op)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                            title="Excluir lançamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredOperations.length > 0 && (
              <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-900">
                <tr>
                  <td className="py-3.5 px-3"></td>
                  <td colSpan={6} className="py-3.5 px-4 text-slate-800 uppercase text-xs tracking-wider">
                    Total Geral Filtrado ({filteredOperations.length} registros)
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-sm font-extrabold text-slate-900">
                    {formatInteger(totalOfficers)}
                  </td>
                  <td className="py-3.5 px-4"></td>
                  <td className="py-3.5 px-4 text-right font-mono text-sm font-black text-[#002D5A]">
                    {formatCurrencyBRL(totalFinancial)}
                  </td>
                  <td className="py-3.5 px-4"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Counter subtext */}
      <div className="text-xs sm:text-sm text-slate-500 px-1 font-medium flex items-center justify-between">
        <span>
          Exibindo <strong>{filteredOperations.length}</strong> lançamento(s) ativo(s) nesta portaria.
        </span>
        <span>Referência Contábil: PMMA / CPI</span>
      </div>

      {/* Custom Confirmation Modal for Deletions */}
      <DeleteConfirmationModal
        isOpen={deleteModalState.isOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        mode={deleteModalState.mode}
        operation={deleteModalState.operation}
        operations={deleteModalState.operations}
        isDeleting={isDeleting}
      />
    </div>
  );
}
