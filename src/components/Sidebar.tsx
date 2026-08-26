import React from 'react';
import {
  LayoutDashboard,
  Table,
  DollarSign,
  Send,
  Users,
  Settings,
  History,
  Shield,
  Layers,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingCount?: number;
  alertsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  pendingCount = 0,
  alertsCount = 0,
}) => {
  const menuItems = [
    {
      id: 'DASHBOARD',
      label: 'Dashboard Executivo',
      icon: LayoutDashboard,
      description: 'Visão geral, KPIs e gráficos',
    },
    {
      id: 'OPERATIONS',
      label: 'Lançamentos de JOE',
      icon: Table,
      description: 'Planilha operacional e missões',
      badge: pendingCount > 0 ? pendingCount : undefined,
      badgeColor: 'bg-blue-600 text-white',
    },
    {
      id: 'BUDGET',
      label: 'Controle Orçamentário',
      icon: DollarSign,
      description: 'Cotas CPA/I-1 ao CPA/I-9',
    },
    {
      id: 'CONSOLIDATION',
      label: 'Consolidação Semanal',
      icon: Send,
      description: 'Encaminhamento à Pagadoria-DGP',
    },
    {
      id: 'OFFICERS',
      label: 'Efetivo & Teto 12 JOEs',
      icon: Users,
      description: 'Controle nominal e faltas',
    },
    {
      id: 'AUDIT',
      label: 'Trilha de Auditoria & SEI',
      icon: History,
      description: 'Fiscalização e conformidade',
      badge: alertsCount > 0 ? alertsCount : undefined,
      badgeColor: 'bg-red-600 text-white',
    },
    {
      id: 'SETTINGS',
      label: 'Parâmetros da Portaria',
      icon: Settings,
      description: 'Valores, tetos e processo SEI',
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col justify-between hidden md:flex h-[calc(100vh-4rem)] sticky top-16 shadow-sm">
      <div className="p-3 overflow-y-auto space-y-1">
        <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          Supervisão do Grande Comando
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-all duration-150 group ${
                isActive
                  ? 'bg-[#00204A] text-white font-bold shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-3 truncate">
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-colors ${
                    isActive ? 'text-[#FFD700]' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <div className="truncate">
                  <div className="truncate">{item.label}</div>
                  <div
                    className={`text-[10px] font-normal truncate ${
                      isActive ? 'text-slate-300' : 'text-slate-400 group-hover:text-slate-500'
                    }`}
                  >
                    {item.description}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 flex-shrink-0">
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#FFD700]" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Institutional Legal Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <div className="bg-white border border-slate-200 rounded-xl p-2.5 text-[11px] shadow-2xs">
          <div className="flex items-center space-x-1.5 text-[#00204A] font-bold text-[10px] uppercase">
            <Layers className="w-3.5 h-3.5 text-[#D97706]" />
            <span>Portaria nº 122/2026-GCG</span>
          </div>
          <p className="text-slate-500 text-[10px] mt-1 line-clamp-2">
            Supervisão e auditoria contínua dos Comandos CPA/I-1 ao CPA/I-9.
          </p>
          <div className="mt-2 text-[9px] text-slate-500 flex justify-between items-center border-t border-slate-100 pt-1.5">
            <span className="font-mono">SEI: 2026.190110.35458</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-1 rounded">100% REGULAR</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

