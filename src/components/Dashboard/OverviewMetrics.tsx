import React from 'react';
import {
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Users,
} from 'lucide-react';
import { CommandBudget, OperationLaunch, OrdinancePeriod } from '../../types';

interface OverviewMetricsProps {
  ordinance: OrdinancePeriod;
  budgets: CommandBudget[];
  operations: OperationLaunch[];
  irregularitiesCount: number;
}

export const OverviewMetrics: React.FC<OverviewMetricsProps> = ({
  ordinance,
  budgets,
  operations,
  irregularitiesCount,
}) => {
  const totalBudget = budgets.reduce((s, b) => s + b.budgetAmount, 0);
  const totalCommitted = budgets.reduce((s, b) => s + b.committedAmount, 0);
  const totalExecuted = budgets.reduce((s, b) => s + b.executedAmount, 0);
  const totalSpent = totalCommitted + totalExecuted;
  const availableBalance = totalBudget - totalSpent;
  const percentUsed = (totalSpent / (totalBudget || 1)) * 100;

  const totalPlannedJoes = budgets.reduce((s, b) => s + b.plannedJoes, 0);
  const totalUsedJoes = budgets.reduce((s, b) => s + b.usedJoesCount, 0);

  const pendingCount = operations.filter((o) =>
    ['PENDENTE_ANALISE', 'EM_ANALISE'].includes(o.status)
  ).length;
  const approvedCount = operations.filter((o) =>
    ['APROVADO', 'EXECUTADO', 'CONSOLIDADO', 'ENCAMINHADO_PAGADORIA'].includes(o.status)
  ).length;
  const correctionCount = operations.filter((o) => o.status === 'DEVOLVIDO_CORRECAO').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Budget Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
            Orçamento Geral
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-black text-[#00204A] tracking-tight">
            R$ {totalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
          <span>{ordinance.number}</span>
          <span className="font-bold text-slate-700">{totalPlannedJoes} JOEs</span>
        </div>
      </div>

      {/* Total Spent / Committed */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
            Total Gasto / Empenhado
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-[#D97706]">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-black text-[#D97706] tracking-tight">
            R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-900">
            {percentUsed.toFixed(1)}%
          </span>
        </div>
        {/* Progress bar */}
        <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${
              percentUsed > 90
                ? 'bg-red-500'
                : percentUsed > 75
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(percentUsed, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Available Balance */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
            Saldo Disponível CPI
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span
            className={`text-2xl font-black tracking-tight ${
              availableBalance < 0 ? 'text-red-600' : 'text-emerald-700'
            }`}
          >
            R$ {availableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
          <span>{totalPlannedJoes - totalUsedJoes} JOEs restantes</span>
          <span className="text-emerald-700 font-bold">
            {((availableBalance / (totalBudget || 1)) * 100).toFixed(1)}% livre
          </span>
        </div>
      </div>

      {/* Operations Flow Status */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
            Fluxo de Lançamentos
          </span>
          <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1 text-center">
          <div className="bg-slate-50 rounded-lg p-1 border border-slate-100">
            <div className="text-xs font-black text-blue-700">{pendingCount}</div>
            <div className="text-[9px] text-slate-500 uppercase font-bold">Análise</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-1 border border-slate-100">
            <div className="text-xs font-black text-emerald-700">{approvedCount}</div>
            <div className="text-[9px] text-slate-500 uppercase font-bold">Aprovados</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-1 border border-slate-100">
            <div className="text-xs font-black text-amber-700">{correctionCount}</div>
            <div className="text-[9px] text-slate-500 uppercase font-bold">Devolvidos</div>
          </div>
        </div>
        <div className="mt-2 text-[10px] text-slate-500 flex justify-between">
          <span>Total: {operations.length} missões</span>
          {irregularitiesCount > 0 && (
            <span className="text-red-600 font-bold flex items-center">
              <AlertTriangle className="w-2.5 h-2.5 mr-0.5 inline" />
              {irregularitiesCount} alerta(s)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
