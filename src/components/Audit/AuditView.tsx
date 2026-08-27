import React, { useState } from 'react';
import { ShieldCheck, History, FileCheck, Activity, Search, Filter, UserCheck, Users } from 'lucide-react';
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

export function AuditView({ logs, users = INITIAL_USERS, ordinance, commands = [], currentUser }: AuditViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'USER_AUDIT' | 'DOCUMENT_AUDIT' | 'LOGS_TRAIL'>('USER_AUDIT');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

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

  const getActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case 'login':
        return (
          <span className="bg-sky-50 text-[#002D5A] border border-[#7EC2E8] text-xs font-bold px-2.5 py-0.5 rounded-full">
            login
          </span>
        );
      case 'logout':
        return (
          <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
            logout
          </span>
        );
      case 'criar':
      case 'criacao':
        return (
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
            criação
          </span>
        );
      case 'editar':
      case 'edicao':
        return (
          <span className="bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
            edição
          </span>
        );
      case 'excluir':
      case 'exclusao':
        return (
          <span className="bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
            exclusão
          </span>
        );
      case 'aprovacao':
        return (
          <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
            aprovação
          </span>
        );
      case 'salvar_tetos':
      case 'ajuste_cota':
        return (
          <span className="bg-sky-100 text-[#002D5A] border border-[#7EC2E8]/40 text-xs font-bold px-2.5 py-0.5 rounded-full">
            tetos/cota
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
            {action}
          </span>
        );
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (actionFilter !== 'ALL' && l.action.toLowerCase() !== actionFilter.toLowerCase()) return false;
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      return (
        l.userName.toLowerCase().includes(q) ||
        l.recordId.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

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

      {/* Sub-Tab 2: Logs Trail */}
      {activeSubTab === 'LOGS_TRAIL' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5 animate-in fade-in duration-150">
          {/* Title & Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#002D5A]" />
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  Trilha de Auditoria & Registro de Operações
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  {filteredLogs.length} registro(s) exibidos. Histórico imutável de lançamentos, alterações e ações no sistema.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrar por usuário, ID ou detalhe..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-[#002D5A]"
                />
              </div>

              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">Todas as Ações</option>
                <option value="criar">Criação</option>
                <option value="editar">Edição</option>
                <option value="excluir">Exclusão</option>
                <option value="aprovacao">Aprovação / Auditoria</option>
                <option value="salvar_tetos">Tetos / Cotas</option>
                <option value="login">Login</option>
              </select>
            </div>
          </div>

          {/* Audit Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs sm:text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-44">Data / Hora</th>
                  <th className="py-3.5 px-4 w-36">Usuário</th>
                  <th className="py-3.5 px-4 w-28 text-center">Ação</th>
                  <th className="py-3.5 px-4 w-40">Registro / ID</th>
                  <th className="py-3.5 px-4">Detalhamento</th>
                  <th className="py-3.5 px-4 w-40 font-mono text-xs">Endereço IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-sm">
                      Nenhum registro de auditoria corresponde aos filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-sky-50/30 transition-colors">
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-xs font-medium">
                        {log.timestamp}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {log.userName}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700 font-semibold">
                        {log.recordId}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-medium">
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
        </div>
      )}
    </div>
  );
}
