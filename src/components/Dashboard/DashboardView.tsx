import React, { useState } from 'react';
import {
  TrendingUp,
  Wallet,
  Coins,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Eye,
  Plus,
  Building2,
  Sparkles,
  Layers,
} from 'lucide-react';
import { OrdinancePeriod, CommandBudget, CommandUnit, OperationLaunch } from '../../types';
import { formatCurrencyBRL, formatInteger } from '../../utils/formatters';
import { UnitSpendingChart } from './UnitSpendingChart';
import { CommandBadge } from '../common/CommandBadge';

interface DashboardViewProps {
  ordinance: OrdinancePeriod;
  budgets: CommandBudget[];
  operations: OperationLaunch[];
  commands: CommandUnit[];
  onNavigateToLaunch: (commandCode?: string) => void;
  onNavigateToList: (commandCode?: string) => void;
}

export function DashboardView({
  ordinance,
  budgets,
  operations,
  commands,
  onNavigateToLaunch,
  onNavigateToList,
}: DashboardViewProps) {
  const [filterType, setFilterType] = useState<'ALL' | 'ATTENTION' | 'NO_LAUNCH'>('ALL');

  // Filter operations for current ordinance
  const currentOps = operations.filter((o) => o.ordinanceId === ordinance.id);

  // Total launched JOEs & amounts
  const totalLaunchedJoes = currentOps.reduce((sum, o) => sum + (o.officersCount || 0), 0);
  const totalExecutedAmount = currentOps.reduce((sum, o) => sum + (o.totalValue || 0), 0);

  const totalPlannedJoes = ordinance.totalPlannedJoes || 1886;
  const totalPlannedBudget = ordinance.totalBudget || 660100;

  const executionPercentage = totalPlannedJoes > 0 ? Math.round((totalLaunchedJoes / totalPlannedJoes) * 100) : 0;

  // Remaining JOEs and balance
  const remainingJoes = Math.max(0, totalPlannedJoes - totalLaunchedJoes);
  const remainingBudget = Math.max(0, totalPlannedBudget - totalExecutedAmount);

  // Calculate days remaining
  const daysRemaining = calculateDaysRemaining(ordinance.endDate);

  // Command summary data
  const commandStats = commands.map((cmd) => {
    const bgt = budgets.find((b) => b.commandId === cmd.code || b.commandId === cmd.id);
    const cmdOps = currentOps.filter(
      (o) => o.commandId === cmd.code || o.commandId === cmd.name || o.commandId.includes(cmd.id)
    );

    const launched = cmdOps.reduce((sum, o) => sum + o.officersCount, 0);
    const planned = bgt ? bgt.plannedJoes : 186;
    const percentage = planned > 0 ? Math.round((launched / planned) * 100) : 0;
    const spentAmount = cmdOps.reduce((sum, o) => sum + o.totalValue, 0);
    const totalCmdBudget = bgt ? bgt.budgetAmount : planned * 350;
    const balance = Math.max(0, totalCmdBudget - spentAmount);

    return {
      command: cmd,
      budget: bgt,
      unitCount: cmd.subunits?.length || 1,
      plannedJoes: planned,
      launchedJoes: launched,
      percentage,
      spentAmount,
      balance,
      hasLaunches: launched > 0,
      isHighAttention: percentage >= 80,
    };
  });

  // Filter commands by active filter tab
  const filteredCommands = commandStats.filter((cs) => {
    if (filterType === 'ATTENTION') return cs.isHighAttention;
    if (filterType === 'NO_LAUNCH') return !cs.hasLaunches;
    return true;
  });

  const highAttentionCount = commandStats.filter((cs) => cs.isHighAttention).length;

  return (
    <div className="space-y-6">
      {/* Top 3 Summary Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Card 1: Execução do Teto do CPI */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-sky-50 text-[#002D5A] border border-[#7EC2E8]/40">
                <TrendingUp className="w-5 h-5 text-[#002D5A]" />
              </span>
              <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                Execução Global do Teto do CPI
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {ordinance.number}
            </span>
          </div>

          <div className="mt-5 flex flex-col sm:flex-row items-center gap-6">
            {/* Donut Chart */}
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#002D5A]"
                  strokeDasharray={`${Math.max(1, executionPercentage)}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-lg font-black text-slate-900 leading-none">
                  {executionPercentage}%
                </span>
                <span className="text-[10px] text-slate-500 font-bold leading-tight mt-0.5">
                  EXECUTADO
                </span>
              </div>
            </div>

            {/* 3 Metric Stats */}
            <div className="flex-1 grid grid-cols-3 gap-3 w-full text-left">
              <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                <div className="text-xs font-semibold text-slate-500">Lançadas</div>
                <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1 font-mono">
                  {formatInteger(totalLaunchedJoes)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  de {formatInteger(totalPlannedJoes)} JOEs
                </div>
              </div>

              <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                <div className="text-xs font-semibold text-slate-500">Empenhado</div>
                <div className="text-lg sm:text-xl font-bold text-[#002D5A] mt-1 font-mono">
                  {formatCurrencyBRL(totalExecutedAmount)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  de {formatCurrencyBRL(totalPlannedBudget)}
                </div>
              </div>

              <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                <div className="text-xs font-semibold text-slate-500">Dias Restantes</div>
                <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1 font-mono">
                  {daysRemaining}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  até {formatDate(ordinance.endDate)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Saldo em JOEs */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-sky-50 text-[#002D5A] border border-[#7EC2E8]/40">
              <Coins className="w-5 h-5 text-[#002D5A]" />
            </span>
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              Saldo em Cotas (JOEs)
            </span>
          </div>
          <div className="my-auto py-3">
            <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-mono">
              {formatInteger(remainingJoes)}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#002D5A]" />
              <span>Cotas disponíveis para distribuição</span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Teto total:</span>
            <span className="font-bold text-slate-800">{formatInteger(totalPlannedJoes)} JOEs</span>
          </div>
        </div>

        {/* Card 3: Saldo Financeiro */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-sky-50 text-[#002D5A] border border-[#7EC2E8]/40">
              <Wallet className="w-5 h-5 text-[#002D5A]" />
            </span>
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              Saldo Orçamentário
            </span>
          </div>
          <div className="my-auto py-3">
            <div className="text-2xl sm:text-3xl font-black text-[#002D5A] tracking-tight font-mono">
              {formatCurrencyBRL(remainingBudget)}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1.5 flex items-center gap-1.5">
              {highAttentionCount > 0 ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-amber-700 font-semibold">{highAttentionCount} comando acima de 80%</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#002D5A]" />
                  <span>Nenhum comando em limite de alerta</span>
                </>
              )}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Orçamento total:</span>
            <span className="font-bold text-slate-800 font-mono">{formatCurrencyBRL(totalPlannedBudget)}</span>
          </div>
        </div>
      </div>

      {/* Chart: Porcentagem do Gasto por Unidade */}
      <UnitSpendingChart
        commands={commands}
        budgets={budgets}
        operations={operations}
        ordinance={ordinance}
      />

      {/* Section: Execução por CPA/I */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#002D5A] text-white">
              <Building2 className="w-5 h-5 text-[#7EC2E8]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Execução por Comandos de Policiamento de Área (CPA/I)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Acompanhamento detalhado do consumo de cotas e saldo financeiro
              </p>
            </div>
          </div>

          {/* Filter Pills: Todos | Em atenção | Sem lançamento */}
          <div className="inline-flex bg-slate-100 p-1.5 rounded-xl text-xs font-bold text-slate-600 gap-1">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                filterType === 'ALL'
                  ? 'bg-[#002D5A] text-white shadow-xs font-bold'
                  : 'hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span>Todos</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-md bg-white/20">
                {commandStats.length}
              </span>
            </button>
            <button
              onClick={() => setFilterType('ATTENTION')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                filterType === 'ATTENTION'
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Em Atenção</span>
              {highAttentionCount > 0 && (
                <span className="text-[11px] px-1.5 py-0.2 rounded-md bg-white/20">
                  {highAttentionCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilterType('NO_LAUNCH')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                filterType === 'NO_LAUNCH'
                  ? 'bg-slate-800 text-white shadow-xs font-bold'
                  : 'hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span>Sem Lançamento</span>
            </button>
          </div>
        </div>

        {/* 3-Column Grid of Command Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCommands.map((cs) => {
            const isAmber = cs.percentage >= 80;
            return (
              <div
                key={cs.command.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-[#7EC2E8] hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top line: Command Code & Badge % */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <CommandBadge commandCode={cs.command.code} size="sm" />
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                          {cs.command.code}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {cs.unitCount} {cs.unitCount === 1 ? 'unidade' : 'unidades subordinadas'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1 ${
                        isAmber
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : cs.percentage > 0
                          ? 'bg-[#E5F3FB] text-[#002D5A] border border-[#7EC2E8]'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {cs.percentage}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full mt-4 overflow-hidden border border-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isAmber
                          ? 'bg-amber-500'
                          : cs.percentage > 0
                          ? 'bg-[#002D5A]'
                          : 'bg-slate-200'
                      }`}
                      style={{ width: `${Math.min(100, cs.percentage)}%` }}
                    />
                  </div>

                  {/* Stats Line: JOEs launched vs Planned and Remaining Balance */}
                  <div className="flex items-center justify-between mt-4 text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Consumo</span>
                      <span className="text-slate-800 font-bold">
                        {formatInteger(cs.launchedJoes)} / {formatInteger(cs.plannedJoes)} JOEs
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Saldo Financeiro</span>
                      <span className="font-bold text-[#002D5A] font-mono text-xs sm:text-sm">
                        {formatCurrencyBRL(cs.balance)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => onNavigateToList(cs.command.code)}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-600" />
                    <span>Lançamentos</span>
                  </button>
                  <button
                    onClick={() => onNavigateToLaunch(cs.command.code)}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#002D5A] hover:bg-[#001F3F] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#7EC2E8]" />
                    <span>Lançar JOE</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function calculateDaysRemaining(endDateStr?: string): number {
  if (!endDateStr) return 0;
  const target = new Date(endDateStr);
  const now = new Date('2026-08-25'); // reference matching environment date
  const diffTime = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}
