import React from 'react';
import {
  Shield,
  FileText,
  AlertTriangle,
  ChevronDown,
  PlusCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { User, OrdinancePeriod } from '../types';

interface NavbarProps {
  currentUser: User;
  ordinances: OrdinancePeriod[];
  activeOrdinance: OrdinancePeriod;
  onOrdinanceChange: (ordinanceId: string) => void;
  onUserChange: (user: User) => void;
  pendingCount: number;
  onNewOperation?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  ordinances,
  activeOrdinance,
  onOrdinanceChange,
  onUserChange,
  pendingCount,
  onNewOperation,
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false);
  const [ordinanceDropdownOpen, setOrdinanceDropdownOpen] = React.useState(false);

  // Available mock users for switching roles
  const mockUsers: User[] = [
    {
      id: 'user-cpi-01',
      name: 'Cel PM Roberto Silva (Comandante)',
      email: 'cpi.cmt@pm.ma.gov.br',
      role: 'CPI_GESTOR',
      rank: 'Cel PM',
      registration: '184920-1',
      active: true,
    },
    {
      id: 'user-cpa1-01',
      name: 'Ten Cel PM Anderson Costa',
      email: 'cpa1.gestor@pm.ma.gov.br',
      role: 'CPA_GESTOR',
      commandId: 'CPA/I-1',
      rank: 'Ten Cel PM',
      registration: '193481-2',
      active: true,
    },
    {
      id: 'user-cpa2-01',
      name: 'Maj PM Marcelo Rocha',
      email: 'cpa2.gestor@pm.ma.gov.br',
      role: 'CPA_GESTOR',
      commandId: 'CPA/I-2',
      rank: 'Maj PM',
      registration: '201948-3',
      active: true,
    },
    {
      id: 'user-cpa3-01',
      name: 'Cap PM Felipe Medeiros',
      email: 'cpa3.gestor@pm.ma.gov.br',
      role: 'CPA_GESTOR',
      commandId: 'CPA/I-3',
      rank: 'Cap PM',
      registration: '210592-4',
      active: true,
    },
    {
      id: 'user-cpa6-01',
      name: 'Ten Cel PM Carlos Eduardo',
      email: 'cpa6.gestor@pm.ma.gov.br',
      role: 'CPA_GESTOR',
      commandId: 'CPA/I-6',
      rank: 'Ten Cel PM',
      registration: '189932-1',
      active: true,
    },
  ];

  return (
    <header className="bg-[#00204A] border-b border-[#001838] text-white sticky top-0 z-40 shadow-md">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFD700] text-[#00204A] flex items-center justify-center shadow-lg font-black">
              <Shield className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-lg tracking-tight text-white uppercase">CPI • PMMA</span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 rounded-md">
                  SISTEMA JOE
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium truncate max-w-xs sm:max-w-md">
                Comando de Policiamento do Interior • Gestão Orçamentária
              </p>
            </div>
          </div>

          {/* Active Ordinance Badge & Dropdown */}
          <div className="hidden md:flex items-center space-x-3">
            <div className="relative">
              <button
                onClick={() => setOrdinanceDropdownOpen(!ordinanceDropdownOpen)}
                className="flex items-center space-x-2 bg-[#001838]/80 hover:bg-[#001838] border border-white/15 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-100 transition-colors shadow-inner"
              >
                <FileText className="w-3.5 h-3.5 text-[#FFD700]" />
                <span>{activeOrdinance.number}</span>
                <span className="text-[10px] text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
                  R$ {activeOrdinance.unitValueJoe.toFixed(2)}/JOE
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
              </button>

              {ordinanceDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white text-slate-900 border border-slate-200 rounded-xl shadow-2xl py-2 z-50">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Selecionar Portaria Vigente
                  </div>
                  {ordinances.map((ord) => (
                    <button
                      key={ord.id}
                      onClick={() => {
                        onOrdinanceChange(ord.id);
                        setOrdinanceDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex flex-col hover:bg-slate-50 transition-colors ${
                        ord.id === activeOrdinance.id ? 'bg-amber-50 text-[#00204A] font-bold' : 'text-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold">{ord.number}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            ord.status === 'VIGENTE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(ord.startDate).toLocaleDateString('pt-BR')} a{' '}
                        {new Date(ord.endDate).toLocaleDateString('pt-BR')} • SEI: {ord.seiProcess}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {onNewOperation && (
              <button
                onClick={onNewOperation}
                className="flex items-center space-x-1.5 bg-[#FFD700] hover:bg-[#ffe033] text-[#00204A] font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-md transition-all transform active:scale-95"
              >
                <PlusCircle className="w-4 h-4 text-[#00204A]" />
                <span>Novo Lançamento</span>
              </button>
            )}
          </div>

          {/* User Profile & Role Switcher */}
          <div className="flex items-center space-x-3">
            {/* Quick Notification Pill */}
            {pendingCount > 0 && (
              <div className="flex items-center space-x-1.5 bg-amber-400/20 border border-amber-400/40 text-amber-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#FFD700] animate-pulse"></span>
                <span>{pendingCount} pendente(s)</span>
              </div>
            )}

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center space-x-2.5 bg-[#001838]/80 hover:bg-[#001838] border border-white/15 px-3 py-1.5 rounded-lg transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-full bg-[#FFD700] text-[#00204A] flex items-center justify-center font-black text-xs">
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-bold text-white leading-tight truncate max-w-[140px]">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-[#FFD700] font-medium">
                    {currentUser.role === 'CPI_GESTOR'
                      ? 'CPI • Gestor Geral'
                      : currentUser.role === 'CPA_GESTOR'
                      ? `${currentUser.commandId || 'CPA/I'} • Gestor`
                      : 'Administrador'}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white text-slate-900 border border-slate-200 rounded-xl shadow-2xl py-2 z-50">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Simular / Alternar Perfil de Acesso
                    </p>
                    <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                      Alterne entre Grande Comando (CPI) e Comandos de Área (CPA/I)
                    </p>
                  </div>

                  <div className="max-h-72 overflow-y-auto py-1">
                    {mockUsers.map((usr) => (
                      <button
                        key={usr.id}
                        onClick={() => {
                          onUserChange(usr);
                          setUserDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                          usr.id === currentUser.id ? 'bg-amber-50 text-[#00204A] font-bold' : 'text-slate-700'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-slate-800">{usr.name}</p>
                          <p className="text-[10px] text-slate-500">
                            {usr.email} • Matr. {usr.registration}
                          </p>
                        </div>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                            usr.role === 'CPI_GESTOR'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-blue-100 text-blue-900 border border-blue-300'
                          }`}
                        >
                          {usr.commandId || usr.role}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 px-3 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] text-slate-500">Portaria nº 122/2026-GCG</span>
                    <span className="text-[10px] font-bold text-emerald-700">Sistema Conectado</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

