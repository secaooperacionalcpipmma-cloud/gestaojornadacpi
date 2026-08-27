import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Activity,
  Calendar,
  Clock,
  Search,
  Filter,
  Download,
  Printer,
  FileSpreadsheet,
  Eye,
  LogIn,
  LogOut,
  PlusCircle,
  Edit3,
  Trash2,
  Sliders,
  Users,
  ShieldAlert,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { AuditLog, User, CommandUnit } from '../../types';
import { CommandBadge } from '../common/CommandBadge';

interface UserActivityAuditProps {
  logs: AuditLog[];
  users: User[];
  commands?: CommandUnit[];
  currentUser?: User;
}

export const UserActivityAudit: React.FC<UserActivityAuditProps> = ({
  logs,
  users,
  commands = [],
  currentUser,
}) => {
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('ALL');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('ALL');
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLogDetail, setSelectedLogDetail] = useState<AuditLog | null>(null);

  // Calculate statistics per user
  const userStats = useMemo(() => {
    const map = new Map<
      string,
      {
        user: User;
        loginCount: number;
        activityCount: number;
        lastLogin: string | null;
        lastActivity: { time: string; desc: string; action: string } | null;
      }
    >();

    users.forEach((u) => {
      map.set(u.id, {
        user: u,
        loginCount: 0,
        activityCount: 0,
        lastLogin: u.lastAccess || null,
        lastActivity: null,
      });
    });

    logs.forEach((log) => {
      // Find matching user by name or login
      const matchedUser = users.find(
        (u) =>
          u.name.toLowerCase() === log.userName.toLowerCase() ||
          (u.login && log.description.toLowerCase().includes(u.login.toLowerCase()))
      );

      const userId = matchedUser ? matchedUser.id : log.userName;
      if (!map.has(userId)) {
        map.set(userId, {
          user: matchedUser || {
            id: userId,
            name: log.userName,
            login: log.userName.toLowerCase().replace(/\s+/g, '.'),
            role: (log.userRole as any) || 'OPERADOR',
            active: true,
          },
          loginCount: 0,
          activityCount: 0,
          lastLogin: null,
          lastActivity: null,
        });
      }

      const stat = map.get(userId)!;
      if (log.action.toLowerCase() === 'login') {
        stat.loginCount += 1;
        if (!stat.lastLogin || log.timestamp > stat.lastLogin) {
          stat.lastLogin = log.timestamp;
        }
      } else {
        stat.activityCount += 1;
        if (!stat.lastActivity || log.timestamp > stat.lastActivity.time) {
          stat.lastActivity = {
            time: log.timestamp,
            desc: log.description,
            action: log.action,
          };
        }
      }
    });

    return Array.from(map.values());
  }, [users, logs]);

  // Overall metrics
  const totalLogins = useMemo(
    () => logs.filter((l) => l.action.toLowerCase() === 'login').length,
    [logs]
  );
  const totalModifications = useMemo(
    () => logs.filter((l) => l.action.toLowerCase() !== 'login' && l.action.toLowerCase() !== 'logout').length,
    [logs]
  );
  const activeUsersCount = useMemo(() => users.filter((u) => u.active).length, [users]);

  // Filtered log list
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      // User filter
      if (selectedUserFilter !== 'ALL') {
        const u = users.find((usr) => usr.id === selectedUserFilter);
        if (u) {
          const matchName = l.userName.toLowerCase() === u.name.toLowerCase();
          const matchLogin = u.login && l.description.toLowerCase().includes(u.login.toLowerCase());
          if (!matchName && !matchLogin) return false;
        } else if (l.userName !== selectedUserFilter) {
          return false;
        }
      }

      // Action filter
      if (selectedActionFilter !== 'ALL') {
        const act = l.action.toLowerCase();
        if (selectedActionFilter === 'LOGINS' && act !== 'login' && act !== 'logout') return false;
        if (selectedActionFilter === 'LANCAMENTOS' && !['criar', 'criacao', 'editar', 'edicao', 'excluir', 'exclusao'].includes(act)) return false;
        if (selectedActionFilter === 'TETOS' && !['salvar_tetos', 'ajuste_cota'].includes(act)) return false;
        if (selectedActionFilter === 'USUARIOS' && !l.recordId.toLowerCase().includes('usuario')) return false;
        if (selectedActionFilter === 'APROVACOES' && act !== 'aprovacao') return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match =
          l.userName.toLowerCase().includes(q) ||
          l.recordId.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          (l.ipAddress && l.ipAddress.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [logs, selectedUserFilter, selectedActionFilter, searchTerm, users]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['Data/Hora', 'Usuário', 'Perfil/Cargo', 'Ação', 'Módulo/Registro', 'Detalhamento', 'Endereço IP'];
    const rows = filteredLogs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.userName}"`,
      `"${l.userRole || 'Operador'}"`,
      `"${l.action.toUpperCase()}"`,
      `"${l.recordId}"`,
      `"${l.description.replace(/"/g, '""')}"`,
      `"${l.ipAddress || '127.0.0.1'}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `auditoria_atividades_usuarios_cpi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print audit report
  const handlePrint = () => {
    window.print();
  };

  const getActionBadge = (action: string) => {
    const act = action.toLowerCase();
    if (act === 'login') {
      return (
        <span className="inline-flex items-center gap-1 bg-sky-50 text-[#002D5A] border border-sky-200 text-[11px] font-bold px-2 py-0.5 rounded-full">
          <LogIn className="w-3 h-3 text-[#002D5A]" />
          Login de Acesso
        </span>
      );
    }
    if (act === 'logout') {
      return (
        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold px-2 py-0.5 rounded-full">
          <LogOut className="w-3 h-3 text-slate-500" />
          Encerramento
        </span>
      );
    }
    if (act === 'criar' || act === 'criacao') {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold px-2 py-0.5 rounded-full">
          <PlusCircle className="w-3 h-3 text-emerald-600" />
          Criação / Inserção
        </span>
      );
    }
    if (act === 'editar' || act === 'edicao') {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold px-2 py-0.5 rounded-full">
          <Edit3 className="w-3 h-3 text-amber-600" />
          Alteração / Edição
        </span>
      );
    }
    if (act === 'excluir' || act === 'exclusao') {
      return (
        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-bold px-2 py-0.5 rounded-full">
          <Trash2 className="w-3 h-3 text-rose-600" />
          Exclusão
        </span>
      );
    }
    if (act === 'salvar_tetos' || act === 'ajuste_cota') {
      return (
        <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-bold px-2 py-0.5 rounded-full">
          <Sliders className="w-3 h-3 text-indigo-600" />
          Ajuste de Tetos
        </span>
      );
    }
    if (act === 'aprovacao') {
      return (
        <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-bold px-2 py-0.5 rounded-full">
          <CheckCircle2 className="w-3 h-3 text-teal-600" />
          Aprovação
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
        <Activity className="w-3 h-3 text-slate-500" />
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Users registered */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Usuários no Sistema
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {users.length}{' '}
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                {activeUsersCount} ativos
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">CPI e CPAs/I 1 ao 9</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#002D5A]">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Logins count */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Acessos / Sessões
            </span>
            <div className="text-2xl font-black text-[#002D5A] mt-1">{totalLogins}</div>
            <p className="text-[11px] text-slate-400 mt-1">Registros de autenticação</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
            <LogIn className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Activities count */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Atividades Registradas
            </span>
            <div className="text-2xl font-black text-amber-700 mt-1">{totalModifications}</div>
            <p className="text-[11px] text-slate-400 mt-1">Lançamentos, tetos e edições</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Total audit trail */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Trilha de Auditoria
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">{logs.length}</div>
            <p className="text-[11px] text-slate-400 mt-1">Eventos imutáveis gravados</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* SECTION 1: USER MONITORING CARDS */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-5 h-5 text-[#002D5A]" />
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Painel de Monitoramento Individual de Usuários
              </h3>
              <p className="text-xs text-slate-500">
                Identificação detalhada de quem acessou, quando realizou login e quais atividades executou.
              </p>
            </div>
          </div>

          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 self-start sm:self-auto">
            {userStats.length} Usuários Monitorados
          </span>
        </div>

        {/* User Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {userStats.map(({ user, loginCount, activityCount, lastLogin, lastActivity }) => {
            const isSelected = selectedUserFilter === user.id;
            return (
              <div
                key={user.id}
                onClick={() => setSelectedUserFilter(isSelected ? 'ALL' : user.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#002D5A] bg-sky-50/50 shadow-md ring-2 ring-[#7EC2E8]'
                    : 'border-slate-200/80 hover:border-sky-300 hover:bg-slate-50/70 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-xs text-[#002D5A] shrink-0">
                        {user.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                          {user.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {user.login} · {user.commandId || user.profileLabel || user.role}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        user.active
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {user.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  {/* Access details */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Último Acesso:
                      </span>
                      <span className="font-bold text-slate-800 text-[11px]">
                        {lastLogin || user.lastAccess || 'Sem registro'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-[11px] text-slate-500">Total de Acessos:</span>
                      <span className="font-black text-[#002D5A] bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100 text-[11px]">
                        {loginCount} {loginCount === 1 ? 'login' : 'logins'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-[11px] text-slate-500">Ações no Sistema:</span>
                      <span className="font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 text-[11px]">
                        {activityCount} {activityCount === 1 ? 'ação' : 'ações'}
                      </span>
                    </div>

                    {lastActivity && (
                      <div className="mt-2 pt-2 border-t border-dashed border-slate-200">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Última Atividade Realizada:
                        </div>
                        <div className="text-[11px] text-slate-700 font-medium truncate mt-0.5">
                          {lastActivity.desc}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2 text-right">
                  <span className="text-[10px] font-bold text-[#002D5A] hover:underline flex items-center justify-end gap-0.5">
                    {isSelected ? 'Limpar filtro' : 'Filtrar atividades deste usuário'}
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: CHRONOLOGICAL ACTIVITY AUDIT TRAIL */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-[#002D5A]" />
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Trilha Cronológica de Atividades & Acessos
              </h3>
              <p className="text-xs text-slate-500">
                {filteredLogs.length} registro(s) localizados. Histórico detalhado de quem executou cada ação no sistema.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-[#002D5A] hover:bg-[#001F3F] text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4 text-[#7EC2E8]" />
              <span>Imprimir Relatório</span>
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, ID, detalhe ou IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#002D5A] font-medium"
            />
          </div>

          {/* User selector */}
          <div>
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Todos os Usuários</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.login})
                </option>
              ))}
            </select>
          </div>

          {/* Action category */}
          <div>
            <select
              value={selectedActionFilter}
              onChange={(e) => setSelectedActionFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Todas as Atividades</option>
              <option value="LOGINS">Logins & Acessos</option>
              <option value="LANCAMENTOS">Lançamentos de JOE (Criação/Edição/Exclusão)</option>
              <option value="TETOS">Ajuste de Tetos & Orçamento</option>
              <option value="USUARIOS">Gestão de Usuários</option>
              <option value="APROVACOES">Aprovações de Escala</option>
            </select>
          </div>

          {/* Clear filter button */}
          <div className="flex items-center">
            {(selectedUserFilter !== 'ALL' || selectedActionFilter !== 'ALL' || searchTerm.trim()) && (
              <button
                onClick={() => {
                  setSelectedUserFilter('ALL');
                  setSelectedActionFilter('ALL');
                  setSearchTerm('');
                }}
                className="text-xs text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
              >
                Limpar Todos os Filtros
              </button>
            )}
          </div>
        </div>

        {/* Audit Log Records Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs sm:text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4 w-44">Data / Hora</th>
                <th className="py-3.5 px-4 w-48">Usuário Responsável</th>
                <th className="py-3.5 px-4 w-36 text-center">Ação Realizada</th>
                <th className="py-3.5 px-4 w-40">Módulo / Referência</th>
                <th className="py-3.5 px-4">Detalhamento da Atividade</th>
                <th className="py-3.5 px-4 w-36 font-mono text-xs text-right">IP / Conexão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 text-sm">
                    Nenhum registro de atividade encontrado com os critérios selecionados.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-sky-50/30 transition-colors">
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-xs font-semibold whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 leading-tight">{log.userName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{log.userRole || 'Operador'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center">{getActionBadge(log.action)}</td>
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-700">
                      {log.recordId}
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 font-medium">
                      <div className="text-xs sm:text-sm">{log.description}</div>
                      {log.previousValue && log.newValue && (
                        <div className="mt-1 text-[11px] text-slate-500 font-mono bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                          <span className="text-rose-700">De: {log.previousValue}</span> →{' '}
                          <span className="text-emerald-700">Para: {log.newValue}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-xs text-right break-all">
                      {log.ipAddress || '2804:6788:4015:7c00:d3d:e9c2:1b3f:2aea'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
