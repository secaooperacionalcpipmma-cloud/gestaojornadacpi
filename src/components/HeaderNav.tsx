import React, { useState } from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  SlidersHorizontal,
  CalendarDays,
  Users,
  ShieldCheck,
  Download,
  ListOrdered,
  LogOut,
  ChevronDown,
  Building2,
  Sparkles,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { User, OrdinancePeriod } from '../types';
import { CommandBadge } from './common/CommandBadge';

interface HeaderNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUser: User;
  users: User[];
  onUserChange: (user: User) => void;
  ordinances: OrdinancePeriod[];
  activeOrdinance: OrdinancePeriod;
  onOrdinanceChange: (ordId: string) => void;
  onOpenCreateOrdinance?: () => void;
  onExportCsv?: () => void;
}

export function HeaderNav({
  activeTab,
  onTabChange,
  currentUser,
  users,
  onUserChange,
  ordinances,
  activeOrdinance,
  onOrdinanceChange,
  onOpenCreateOrdinance,
  onExportCsv,
}: HeaderNavProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const tabs = [
    { id: 'PAINEL', label: 'Painel', icon: LayoutDashboard },
    { id: 'LANCAR_JOE', label: 'Lançar JOE', icon: PlusCircle },
    { id: 'LANCAMENTOS', label: 'Lançamentos', icon: ClipboardList },
    { id: 'RELATORIOS', label: 'Relatórios Excel', icon: FileSpreadsheet },
    { id: 'LEGISLACAO', label: 'Portaria & Resumo', icon: BookOpen },
    { id: 'TETOS', label: 'Tetos', icon: SlidersHorizontal },
    { id: 'PERIODOS', label: 'Portarias & Períodos', icon: CalendarDays },
    { id: 'USUARIOS', label: 'Usuários', icon: Users },
    { id: 'AUDITORIA', label: 'Auditoria', icon: ShieldCheck },
  ];

  const inEffectOrdinance = ordinances.find((o) => o.status === 'VIGENTE') || ordinances[0];
  const isViewingPastOrdinance = activeOrdinance.id !== inEffectOrdinance?.id;

  // Helper for subtitle & title in navy blue banner
  const getBannerInfo = () => {
    switch (activeTab) {
      case 'PAINEL':
        return {
          title: 'Painel Geral do CPI',
          subtitle: `${activeOrdinance.name || activeOrdinance.number} · Vigência: ${formatDate(activeOrdinance.startDate)} a ${formatDate(activeOrdinance.endDate)}`,
          actions: (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={onOpenCreateOrdinance}
                className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-[#001F3F] hover:bg-[#001730] text-sky-100 hover:text-white transition-all border border-[#7EC2E8]/30 flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[#7EC2E8]" />
                <span>+ Nova Portaria</span>
              </button>
              <button
                onClick={() => onTabChange('RELATORIOS')}
                className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-[#001F3F] hover:bg-[#001730] text-sky-100 hover:text-white transition-all border border-[#7EC2E8]/30 flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#7EC2E8]" />
                <span>Gerar Relatório Excel</span>
              </button>
              <button
                onClick={() => onTabChange('LANCAR_JOE')}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-[#7EC2E8] hover:bg-[#68b0df] text-[#002D5A] transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-98"
              >
                <PlusCircle className="w-4.5 h-4.5" />
                <span>Lançar JOE</span>
              </button>
            </div>
          ),
        };
      case 'LANCAR_JOE':
        return {
          title: 'Novo Lançamento de JOE',
          subtitle: `${activeOrdinance.name || activeOrdinance.number} · Vigência: ${formatDate(activeOrdinance.startDate)} a ${formatDate(activeOrdinance.endDate)}`,
          actions: (
            <button
              onClick={() => onTabChange('LANCAMENTOS')}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#001F3F] hover:bg-[#001730] text-sky-100 hover:text-white transition-all border border-[#7EC2E8]/30 flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <ListOrdered className="w-4.5 h-4.5 text-[#7EC2E8]" />
              <span>Consultar Lançamentos</span>
            </button>
          ),
        };
      case 'LANCAMENTOS':
        return {
          title: 'Histórico de Lançamentos de JOE',
          subtitle: `${activeOrdinance.name || activeOrdinance.number} · Vigência: ${formatDate(activeOrdinance.startDate)} a ${formatDate(activeOrdinance.endDate)}`,
          actions: (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => onTabChange('RELATORIOS')}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#001F3F] hover:bg-[#001730] text-sky-100 hover:text-white transition-all border border-[#7EC2E8]/30 flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-4.5 h-4.5 text-[#7EC2E8]" />
                <span>Relatório Personalizado (Excel)</span>
              </button>
              <button
                onClick={() => onTabChange('LANCAR_JOE')}
                className="px-4.5 py-2 rounded-xl text-sm font-bold bg-[#7EC2E8] hover:bg-[#68b0df] text-[#002D5A] transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-98"
              >
                <PlusCircle className="w-4.5 h-4.5" />
                <span>Lançar JOE</span>
              </button>
            </div>
          ),
        };
      case 'RELATORIOS':
        return {
          title: 'Relatórios Contábeis e Operacionais em Excel',
          subtitle: 'Gere arquivos formatados selecionando uma ou mais unidades e colunas personalizadas',
          actions: null,
        };
      case 'LEGISLACAO':
        return {
          title: 'Legislação & Atribuições do CPI',
          subtitle: 'Consulte a Portaria na íntegra, o Manual Normativo de Atribuições do CPI ou cadastre nova portaria',
          actions: null,
        };
      case 'TETOS':
        return {
          title: 'Tetos e Cotas Orçamentárias por Comando',
          subtitle: `${activeOrdinance.name || activeOrdinance.number} · Vigência: ${formatDate(activeOrdinance.startDate)} a ${formatDate(activeOrdinance.endDate)} · Valor Ref: R$ ${activeOrdinance.unitValueJoe.toFixed(2).replace('.', ',')}`,
          actions: null,
        };
      case 'PERIODOS':
        return {
          title: 'Gestão de Portarias e Períodos de Vigência',
          subtitle: 'Cadastro de novas portarias e histórico de regulamentações das JOEs',
          actions: (
            <button
              onClick={onOpenCreateOrdinance}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-[#7EC2E8] hover:bg-[#68b0df] text-[#002D5A] transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <PlusCircle className="w-4.5 h-4.5" />
              <span>Cadastrar Nova Portaria</span>
            </button>
          ),
        };
      case 'USUARIOS':
        return {
          title: 'Gestão de Usuários e Acessos Setoriais',
          subtitle: 'Permissões por Comando de Policiamento de Área (CPA/I) e Direção do CPI',
          actions: null,
        };
      case 'AUDITORIA':
        return {
          title: 'Auditoria Documental & Trilha de Conformidade CPI',
          subtitle: 'Conferência estrita dos 6 documentos (Ofício, Ordem, Escala, RENE, Relatório e Planilha), cálculo de 6h e validação financeira',
          actions: null,
        };
      default:
        return {
          title: 'Painel do CPI',
          subtitle: `${activeOrdinance.name || activeOrdinance.number} · Vigência: ${formatDate(activeOrdinance.startDate)} a ${formatDate(activeOrdinance.endDate)}`,
          actions: null,
        };
    }
  };

  const banner = getBannerInfo();

  return (
    <header className="bg-[#002D5A] text-white select-none shadow-lg border-b border-sky-900/40">
      {/* Top Bar */}
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Logo & System Title */}
          <div className="flex items-center gap-3.5">
            <CommandBadge commandCode="CPI" size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white leading-tight">
                  Controle de JOE
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7EC2E8]/20 text-[#7EC2E8] border border-[#7EC2E8]/30">
                  <Sparkles className="w-3 h-3" />
                  PMMA
                </span>
              </div>
              <p className="text-xs text-[#7EC2E8] leading-none mt-1 font-medium tracking-wide">
                Polícia Militar do Maranhão · Comando do Policiamento do Interior
              </p>
            </div>
          </div>

          {/* Right Header Area: Portaria Selector & User Details */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* New Ordinance Button */}
            <button
              onClick={onOpenCreateOrdinance}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#001F3F] hover:bg-[#001730] text-[#7EC2E8] hover:text-white border border-[#7EC2E8]/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Cadastrar Nova Portaria Regulamentadora"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nova Portaria</span>
            </button>

            {/* Period Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#001F3F] rounded-xl border border-[#7EC2E8]/40 p-1">
              <span className="text-[11px] font-bold text-sky-200 pl-2">Portaria:</span>
              <select
                value={activeOrdinance.id}
                onChange={(e) => onOrdinanceChange(e.target.value)}
                className="bg-transparent text-white text-xs sm:text-sm font-semibold pr-7 focus:outline-hidden appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%237EC2E8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.2rem center',
                  backgroundSize: '1rem',
                }}
              >
                {ordinances.map((ord) => (
                  <option key={ord.id} value={ord.id} className="bg-slate-900 text-white py-1">
                    {ord.name || ord.number} {ord.status === 'VIGENTE' ? '⭐ (Em Vigor)' : '(Histórico)'}
                  </option>
                ))}
              </select>
            </div>

            {/* User Details */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2.5 text-left p-1.5 rounded-xl hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-white/10"
              >
                <div className="w-9 h-9 rounded-xl bg-[#7EC2E8] border border-white/40 flex items-center justify-center font-black text-sm text-[#002D5A] shadow-xs">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-bold text-white leading-none">
                    {currentUser.name}
                  </div>
                  <div className="text-[11px] text-[#7EC2E8] leading-none mt-1 font-medium">
                    {currentUser.profileLabel || (currentUser.role === 'ADMIN' ? 'Administrador do CPI' : 'CPA/I')}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-sky-200" />
              </button>

              {/* User Switcher Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200/80 py-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Alternar Perfil / Usuário</span>
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          onUserChange(u);
                          setShowUserMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                          u.id === currentUser.id ? 'bg-sky-50/80 text-[#002D5A] font-bold' : 'text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-[13px]">{u.name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {u.login} · {u.profileLabel || u.role}
                          </div>
                        </div>
                        {u.id === currentUser.id && (
                          <span className="w-2.5 h-2.5 rounded-full bg-[#002D5A] ring-4 ring-sky-100"></span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs Pill Row with Icons and Bigger Font */}
        <nav className="flex items-center gap-2 mt-4.5 overflow-x-auto no-scrollbar py-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-4.5 py-2.5 text-sm font-bold rounded-xl transition-all duration-150 whitespace-nowrap flex items-center gap-2.5 cursor-pointer select-none ${
                  isActive
                    ? 'bg-[#7EC2E8] text-[#002D5A] shadow-md shadow-[#7EC2E8]/20 scale-100'
                    : 'text-sky-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-[#002D5A]' : 'text-[#7EC2E8]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Dynamic Sub-header Banner */}
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-sky-800/40 bg-[#002244]">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {banner.title}
            </h2>
            {isViewingPastOrdinance ? (
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                Portaria Histórica Selecionada
              </span>
            ) : (
              <span className="bg-[#7EC2E8]/20 text-[#7EC2E8] border border-[#7EC2E8]/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                Portaria em Vigor
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#7EC2E8] mt-1 font-medium flex items-center gap-2">
            <span>{banner.subtitle}</span>
            {isViewingPastOrdinance && inEffectOrdinance && (
              <button
                onClick={() => onOrdinanceChange(inEffectOrdinance.id)}
                className="underline text-amber-200 hover:text-white cursor-pointer ml-2 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Voltar para Portaria em Vigor ({inEffectOrdinance.number})</span>
              </button>
            )}
          </p>
        </div>
        {banner.actions && <div>{banner.actions}</div>}
      </div>
    </header>
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
