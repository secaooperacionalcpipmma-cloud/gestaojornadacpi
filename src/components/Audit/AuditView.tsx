import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldCheck,
  History,
  FileCheck,
  Search,
  Filter,
  UserCheck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  Download,
  Copy,
  Check,
  Clock,
  ArrowUpDown,
} from 'lucide-react';
import { AuditLog, OrdinancePeriod, CommandUnit, User } from '../../types';
import { DocumentAuditView } from './DocumentAuditView';
import { UserActivityAudit } from './UserActivityAudit';
import { INITIAL_USERS } from '../../data/initialData';

interface AuditViewProps {
  logs: AuditLog[];
  users?: User[];
  ordinance?: OrdinancePeriod;
  commands?: CommandUnit[];
  currentUser?: User;
}

// Robust timestamp parser supporting Brazilian format (DD/MM/YYYY HH:mm[:ss]) and ISO strings
function parseLogDate(timestampStr: string): Date | null {
  if (!timestampStr) return null;
  const brMatch = timestampStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10) - 1;
    const year = parseInt(brMatch[3], 10);
    const hours = brMatch[4] ? parseInt(brMatch[4], 10) : 0;
    const minutes = brMatch[5] ? parseInt(brMatch[5], 10) : 0;
    const seconds = brMatch[6] ? parseInt(brMatch[6], 10) : 0;
    return new Date(year, month, day, hours, minutes, seconds);
  }
  const parsed = new Date(timestampStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Check if log timestamp is within the specified start and end dates (inclusive)
function isLogWithinDateRange(timestampStr: string, startDate?: string, endDate?: string): boolean {
  if (!startDate && !endDate) return true;
  const logDate = parseLogDate(timestampStr);
  if (!logDate) return true; // keep if date is invalid to avoid dropping data erroneously

  if (startDate) {
    const [sY, sM, sD] = startDate.split('-').map(Number);
    const startBoundary = new Date(sY, sM - 1, sD, 0, 0, 0, 0);
    if (logDate < startBoundary) return false;
  }

  if (endDate) {
    const [eY, eM, eD] = endDate.split('-').map(Number);
    const endBoundary = new Date(eY, eM - 1, eD, 23, 59, 59, 999);
    if (logDate > endBoundary) return false;
  }

  return true;
}

export function AuditView({ logs, users = INITIAL_USERS, ordinance, commands = [], currentUser }: AuditViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'USER_AUDIT' | 'DOCUMENT_AUDIT' | 'LOGS_TRAIL'>('USER_AUDIT');
  
  // Search & Filtering State
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Fallback defaults if not provided
  const activeOrdinance: OrdinancePeriod = ordinance || {
    id: 'portaria-vigente',
    number: '122/2026 – GCG',
    year: 2026,
    startDate: '2026-08-20',
    endDate: '2026-09-21',
    unitValueJoe: 350.0,
    monthlyIndividualLimit: 12,
    maxDurationHours: 6,
    totalBudget: 660100,
    totalPlannedJoes: 1886,
    status: 'VIGENTE',
    createdAt: '2026-08-20',
  };

  const activeUser: User = currentUser || {
    id: 'admin',
    name: 'Administrador do CPI',
    role: 'ADMIN',
    active: true,
  };

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, actionFilter, startDate, endDate, pageSize, sortOrder]);

  const getActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case 'login':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-[#002D5A] border border-[#7EC2E8]">
            login
          </span>
        );
      case 'logout':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            logout
          </span>
        );
      case 'criar':
      case 'criacao':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            criação
          </span>
        );
      case 'editar':
      case 'edicao':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            edição
          </span>
        );
      case 'excluir':
      case 'exclusao':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
            exclusão
          </span>
        );
      case 'aprovacao':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            aprovação
          </span>
        );
      case 'salvar_tetos':
      case 'ajuste_cota':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-[#002D5A] border border-[#7EC2E8]/40">
            tetos/cota
          </span>
        );
      case 'consolidacao':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
            consolidação
          </span>
        );
      case 'backup_criado':
      case 'backup_restaurado':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
            backup
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
            {action}
          </span>
        );
    }
  };

  // Quick Date Preset Handlers
  const applyTodayPreset = () => {
    const now = new Date();
    const iso = now.toISOString().split('T')[0];
    setStartDate(iso);
    setEndDate(iso);
  };

  const applyLast7DaysPreset = () => {
    const now = new Date();
    const endIso = now.toISOString().split('T')[0];
    const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startIso = past.toISOString().split('T')[0];
    setStartDate(startIso);
    setEndDate(endIso);
  };

  const applyLast30DaysPreset = () => {
    const now = new Date();
    const endIso = now.toISOString().split('T')[0];
    const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startIso = past.toISOString().split('T')[0];
    setStartDate(startIso);
    setEndDate(endIso);
  };

  const applyOrdinancePreset = () => {
    if (activeOrdinance.startDate && activeOrdinance.endDate) {
      setStartDate(activeOrdinance.startDate);
      setEndDate(activeOrdinance.endDate);
    }
  };

  const clearDateFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  const resetAllFilters = () => {
    setSearchTerm('');
    setActionFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSortOrder('DESC');
  };

  // Filtered and Sorted Logs (Memoized for high performance with large datasets)
  const filteredLogs = useMemo(() => {
    const result = logs.filter((log) => {
      // 1. Action Filter
      if (actionFilter !== 'ALL' && log.action.toLowerCase() !== actionFilter.toLowerCase()) {
        return false;
      }

      // 2. Date Range Filter
      if (!isLogWithinDateRange(log.timestamp, startDate, endDate)) {
        return false;
      }

      // 3. Search Query Filter
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase();
        const matchesUser = log.userName?.toLowerCase().includes(q) || false;
        const matchesRecord = log.recordId?.toLowerCase().includes(q) || false;
        const matchesDesc = log.description?.toLowerCase().includes(q) || false;
        const matchesIp = log.ipAddress?.toLowerCase().includes(q) || false;
        const matchesAction = log.action?.toLowerCase().includes(q) || false;
        if (!matchesUser && !matchesRecord && !matchesDesc && !matchesIp && !matchesAction) {
          return false;
        }
      }

      return true;
    });

    // Sort by timestamp
    return result.sort((a, b) => {
      const dateA = parseLogDate(a.timestamp);
      const dateB = parseLogDate(b.timestamp);
      const timeA = dateA ? dateA.getTime() : 0;
      const timeB = dateB ? dateB.getTime() : 0;
      return sortOrder === 'DESC' ? timeB - timeA : timeA - timeB;
    });
  }, [logs, actionFilter, startDate, endDate, searchTerm, sortOrder]);

  // Pagination Calculations
  const totalItems = filteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedLogs = useMemo(() => {
    return filteredLogs.slice(startIndex, endIndex);
  }, [filteredLogs, startIndex, endIndex]);

  // Page Numbers with smart ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (safeCurrentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (safeCurrentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(safeCurrentPage - 1);
        pages.push(safeCurrentPage);
        pages.push(safeCurrentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  // Export to CSV helper
  const exportToCsv = () => {
    const headers = ['Data/Hora', 'Usuário', 'Ação', 'Registro / ID', 'Detalhamento', 'Endereço IP'];
    const rows = filteredLogs.map((l) => [
      `"${l.timestamp || ''}"`,
      `"${(l.userName || '').replace(/"/g, '""')}"`,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${(l.recordId || '').replace(/"/g, '""')}"`,
      `"${(l.description || '').replace(/"/g, '""')}"`,
      `"${(l.ipAddress || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria_logs_cpi_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Copy to clipboard formatted
  const copyFormattedLogs = () => {
    const text = filteredLogs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.action.toUpperCase()}] ${l.userName} (${l.recordId}): ${l.description} [IP: ${l.ipAddress || '127.0.0.1'}]`
      )
      .join('\n');

    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  const hasActiveFilters = searchTerm !== '' || actionFilter !== 'ALL' || startDate !== '' || endDate !== '';

  return (
    <div className="space-y-6">
      {/* Sub-Tabs Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 bg-white px-5 py-3 rounded-2xl shadow-2xs gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveSubTab('USER_AUDIT')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'USER_AUDIT'
                ? 'bg-[#002D5A] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Auditoria de Usuários & Acessos</span>
          </button>

          <button
            onClick={() => setActiveSubTab('DOCUMENT_AUDIT')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'DOCUMENT_AUDIT'
                ? 'bg-[#002D5A] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Cruzamento Documental SEI</span>
          </button>

          <button
            onClick={() => setActiveSubTab('LOGS_TRAIL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'LOGS_TRAIL'
                ? 'bg-[#002D5A] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Trilha Geral de Logs ({logs.length})</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Fiscalização Ativa CPI</span>
        </div>
      </div>

      {/* Sub-Tab 1: User Activity Audit */}
      {activeSubTab === 'USER_AUDIT' && (
        <UserActivityAudit
          logs={logs}
          users={users}
          commands={commands}
          currentUser={activeUser}
        />
      )}

      {/* Sub-Tab 2: Document Audit */}
      {activeSubTab === 'DOCUMENT_AUDIT' && (
        <DocumentAuditView
          ordinance={activeOrdinance}
          commands={commands}
          currentUser={activeUser}
        />
      )}

      {/* Sub-Tab 3: Logs Trail with Pagination and Date Filters */}
      {activeSubTab === 'LOGS_TRAIL' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-150">
          {/* Header Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-50 text-[#002D5A] border border-[#7EC2E8]/40">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  Trilha de Auditoria & Registro de Operações
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {totalItems} de {logs.length} registros
                  </span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Histórico cronológico, imutável e auditável de acessos, lançamentos e movimentações no sistema.
                </p>
              </div>
            </div>

            {/* Quick Export / Copy Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={copyFormattedLogs}
                title="Copiar registros filtrados"
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedNotification ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copiar ({totalItems})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={exportToCsv}
                title="Exportar registros filtrados em CSV"
                className="px-3 py-2 rounded-xl text-xs font-bold text-[#002D5A] bg-sky-50 hover:bg-sky-100 border border-[#7EC2E8]/60 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#002D5A]" />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>

          {/* Filtering Control Panel */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-[#002D5A]" />
                <span>Filtros de Pesquisa, Período e Ordenação</span>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-[#002D5A] hover:underline flex items-center gap-1 normal-case font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Limpar todos os filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-3 items-end">
              {/* Search query input */}
              <div className="lg:col-span-4">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Busca Textual
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Usuário, ID, IP ou detalhe..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-[#002D5A] shadow-2xs"
                  />
                </div>
              </div>

              {/* Action type filter */}
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tipo de Ação
                </label>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-hidden focus:border-[#002D5A] shadow-2xs cursor-pointer"
                >
                  <option value="ALL">Todas as Ações</option>
                  <option value="login">Login</option>
                  <option value="criar">Criação</option>
                  <option value="editar">Edição</option>
                  <option value="excluir">Exclusão</option>
                  <option value="aprovacao">Aprovação</option>
                  <option value="salvar_tetos">Tetos / Cotas</option>
                  <option value="consolidacao">Consolidação</option>
                  <option value="backup_criado">Backup</option>
                </select>
              </div>

              {/* Start Date */}
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Data Inicial
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-[#002D5A] shadow-2xs"
                  />
                </div>
              </div>

              {/* End Date */}
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Data Final
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-[#002D5A] shadow-2xs"
                  />
                </div>
              </div>

              {/* Order / Sort */}
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Ordem Cronológica
                </label>
                <button
                  type="button"
                  onClick={() => setSortOrder((prev) => (prev === 'DESC' ? 'ASC' : 'DESC'))}
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold flex items-center justify-between shadow-2xs cursor-pointer"
                >
                  <span>{sortOrder === 'DESC' ? 'Mais Recentes ⬇' : 'Mais Antigos ⬆'}</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Quick Date Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              <span className="text-slate-500 font-medium text-[11px] mr-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                Atalhos de Período:
              </span>
              <button
                type="button"
                onClick={applyTodayPreset}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={applyLast7DaysPreset}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              >
                Últimos 7 dias
              </button>
              <button
                type="button"
                onClick={applyLast30DaysPreset}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              >
                Últimos 30 dias
              </button>
              <button
                type="button"
                onClick={applyOrdinancePreset}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-50 hover:bg-sky-100 text-[#002D5A] border border-[#7EC2E8]/40 transition-colors cursor-pointer"
              >
                Portaria {activeOrdinance.number}
              </button>
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={clearDateFilters}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                >
                  Limpar Datas
                </button>
              )}
            </div>
          </div>

          {/* Audit Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
            <table className="w-full text-left text-xs sm:text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-44">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Data / Hora</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-4 w-44">Usuário</th>
                  <th className="py-3.5 px-4 w-32 text-center">Ação</th>
                  <th className="py-3.5 px-4 w-44">Registro / ID</th>
                  <th className="py-3.5 px-4">Detalhamento</th>
                  <th className="py-3.5 px-4 w-40 font-mono text-xs">Endereço IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Search className="w-8 h-8 text-slate-300" />
                        <span className="font-semibold">Nenhum registro de auditoria corresponde aos filtros aplicados.</span>
                        <span className="text-xs text-slate-400">Tente ajustar o termo de busca ou o intervalo de datas.</span>
                        {hasActiveFilters && (
                          <button
                            type="button"
                            onClick={resetAllFilters}
                            className="mt-2 px-3 py-1.5 text-xs font-bold text-[#002D5A] bg-sky-50 rounded-lg border border-[#7EC2E8]/40 hover:bg-sky-100 cursor-pointer"
                          >
                            Redefinir Filtros
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-sky-50/30 transition-colors">
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-xs font-medium">
                        {log.timestamp}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div>{log.userName}</div>
                        {log.userRole && (
                          <div className="text-[10px] text-slate-400 font-normal">{log.userRole}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700 font-semibold">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {log.recordId}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-medium leading-relaxed">
                        {log.description}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-xs break-all">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Bar */}
          {totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 text-xs">
              {/* Items per page selector & range summary */}
              <div className="flex flex-wrap items-center gap-3 text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-500">Exibir:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-[#002D5A] cursor-pointer"
                  >
                    <option value={10}>10 por página</option>
                    <option value={25}>25 por página</option>
                    <option value={50}>50 por página</option>
                    <option value={100}>100 por página</option>
                  </select>
                </div>

                <span className="text-slate-400">|</span>

                <span className="font-medium">
                  Mostrando <strong className="text-slate-900">{startIndex + 1}</strong> a{' '}
                  <strong className="text-slate-900">{endIndex}</strong> de{' '}
                  <strong className="text-slate-900">{totalItems}</strong> registros
                </span>
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center gap-1">
                {/* First page */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                  title="Primeira Página"
                  className={`p-2 rounded-lg border transition-all ${
                    safeCurrentPage === 1
                      ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
                      : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 cursor-pointer shadow-2xs'
                  }`}
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                {/* Prev page */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  title="Página Anterior"
                  className={`p-2 rounded-lg border transition-all ${
                    safeCurrentPage === 1
                      ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
                      : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 cursor-pointer shadow-2xs'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1 px-1">
                  {getPageNumbers().map((num, idx) => {
                    if (num === '...') {
                      return (
                        <span key={`dots-${idx}`} className="px-2 py-1 text-slate-400 font-bold select-none">
                          ...
                        </span>
                      );
                    }
                    const isCurrent = num === safeCurrentPage;
                    return (
                      <button
                        key={`page-${num}`}
                        type="button"
                        onClick={() => setCurrentPage(num as number)}
                        className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-[#002D5A] text-white shadow-xs'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>

                {/* Next page */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  title="Próxima Página"
                  className={`p-2 rounded-lg border transition-all ${
                    safeCurrentPage === totalPages
                      ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
                      : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 cursor-pointer shadow-2xs'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Last page */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  title="Última Página"
                  className={`p-2 rounded-lg border transition-all ${
                    safeCurrentPage === totalPages
                      ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
                      : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 cursor-pointer shadow-2xs'
                  }`}
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
