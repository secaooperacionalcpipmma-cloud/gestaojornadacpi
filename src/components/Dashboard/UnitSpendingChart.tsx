import React, { useState, useMemo } from 'react';
import {
  Percent,
  Building2,
  Filter,
  Shield,
  Layers,
  ArrowUpDown,
  TrendingUp,
  Coins,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { CommandUnit, CommandBudget, OperationLaunch, OrdinancePeriod } from '../../types';
import { formatCurrencyBRL, formatInteger } from '../../utils/formatters';
import { CommandBadge } from '../common/CommandBadge';

export const getCommandOrderIndex = (codeOrId: string = '') => {
  const norm = String(codeOrId || '').toUpperCase().trim();
  if (norm === 'CPI' || norm.startsWith('CPI') || norm.includes('DIREÇÃO') || norm.includes('DIRECAO') || norm.includes('SETORIAL')) return 0;
  if (norm.includes('CPA/I-1') || norm.includes('CPAI-1') || norm === 'CPA-1' || norm.includes('CPA/I 1')) return 1;
  if (norm.includes('CPA/I-2') || norm.includes('CPAI-2') || norm === 'CPA-2' || norm.includes('CPA/I 2')) return 2;
  if (norm.includes('CPA/I-3') || norm.includes('CPAI-3') || norm === 'CPA-3' || norm.includes('CPA/I 3')) return 3;
  if (norm.includes('CPA/I-4') || norm.includes('CPAI-4') || norm === 'CPA-4' || norm.includes('CPA/I 4')) return 4;
  if (norm.includes('CPA/I-5') || norm.includes('CPAI-5') || norm === 'CPA-5' || norm.includes('CPA/I 5')) return 5;
  if (norm.includes('CPA/I-6') || norm.includes('CPAI-6') || norm === 'CPA-6' || norm.includes('CPA/I 6')) return 6;
  if (norm.includes('CPA/I-7') || norm.includes('CPAI-7') || norm === 'CPA-7' || norm.includes('CPA/I 7')) return 7;
  if (norm.includes('CPA/I-8') || norm.includes('CPAI-8') || norm === 'CPA-8' || norm.includes('CPA/I 8')) return 8;
  if (norm.includes('CPA/I-9') || norm.includes('CPAI-9') || norm === 'CPA-9' || norm.includes('CPA/I 9')) return 9;
  return 99;
};

interface UnitSpendingChartProps {
  commands: CommandUnit[];
  budgets: CommandBudget[];
  operations: OperationLaunch[];
  ordinance: OrdinancePeriod;
}

export function UnitSpendingChart({
  commands,
  budgets,
  operations,
  ordinance,
}: UnitSpendingChartProps) {
  const [viewMode, setViewMode] = useState<'CPA' | 'SUBUNITS'>('CPA');
  const [selectedCpaFilter, setSelectedCpaFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'ORDER' | 'PERCENT_DESC' | 'PERCENT_ASC'>('ORDER');

  // Filter operations for current ordinance
  const currentOps = useMemo(
    () => operations.filter((o) => o.ordinanceId === ordinance.id),
    [operations, ordinance.id]
  );

  // Total spent in the current ordinance
  const totalExecutedAmount = useMemo(
    () => currentOps.reduce((sum, o) => sum + (o.totalValue || 0), 0),
    [currentOps]
  );
  const totalPlannedBudget = ordinance.totalBudget || 660100;
  const overallPercentage = totalPlannedBudget > 0 ? (totalExecutedAmount / totalPlannedBudget) * 100 : 0;

  // 1. Calculate stats per CPA/I (Comandos de Policiamento de Área)
  // % referente ao valor em dinheiro definido para cada uma
  const cpaData = useMemo(() => {
    const unitValue = ordinance.unitValueJoe || 350;

    const list = commands.map((cmd) => {
      const bgt = budgets.find((b) => b.commandId === cmd.code || b.commandId === cmd.id);
      const cmdOps = currentOps.filter(
        (o) => o.commandId === cmd.code || o.commandId === cmd.name || o.commandId?.includes(cmd.id)
      );

      const plannedJoes = bgt ? bgt.plannedJoes : 186;
      const plannedBudget = bgt ? bgt.budgetAmount : plannedJoes * unitValue;
      const executedAmount = cmdOps.reduce((sum, o) => sum + (o.totalValue || 0), 0);
      const executedJoes = cmdOps.reduce((sum, o) => sum + (o.officersCount || 0), 0);

      // % de gasto referente ao valor em dinheiro definido para esta unidade
      const percentSpent = plannedBudget > 0 ? (executedAmount / plannedBudget) * 100 : 0;
      const balance = Math.max(0, plannedBudget - executedAmount);

      const isCpi = cmd.id === 'CPI' || cmd.code.startsWith('CPI');
      const displayLabel = isCpi ? 'CPI' : cmd.code;

      return {
        id: cmd.id,
        code: displayLabel,
        rawCode: cmd.code,
        name: cmd.name,
        headquarters: cmd.headquarters,
        subunitsCount: cmd.subunits?.length || 0,
        plannedBudget,
        executedAmount,
        plannedJoes,
        executedJoes,
        percentSpent: Number(percentSpent.toFixed(1)),
        balance,
      };
    });

    // Filter
    let filtered = list;
    if (selectedCpaFilter !== 'ALL') {
      filtered = filtered.filter((c) => c.rawCode === selectedCpaFilter || c.code === selectedCpaFilter || c.id === selectedCpaFilter);
    }

    // Sort
    if (sortBy === 'ORDER') {
      filtered.sort((a, b) => getCommandOrderIndex(a.rawCode || a.id) - getCommandOrderIndex(b.rawCode || b.id));
    } else if (sortBy === 'PERCENT_DESC') {
      filtered.sort((a, b) => b.percentSpent - a.percentSpent);
    } else if (sortBy === 'PERCENT_ASC') {
      filtered.sort((a, b) => a.percentSpent - b.percentSpent);
    }

    return filtered;
  }, [commands, budgets, currentOps, ordinance, selectedCpaFilter, sortBy]);

  // 2. Calculate stats per Subunit (BPMs / CIAs)
  // Each subunit has an estimated quota defined from its CPA
  const subunitData = useMemo(() => {
    const list: Array<{
      id: string;
      code: string;
      cpaCode: string;
      cpaName: string;
      plannedBudget: number;
      executedAmount: number;
      plannedJoes: number;
      executedJoes: number;
      percentSpent: number;
      balance: number;
    }> = [];

    const unitValue = ordinance.unitValueJoe || 350;

    commands.forEach((cmd, cmdIdx) => {
      const bgt = budgets.find((b) => b.commandId === cmd.code || b.commandId === cmd.id);
      const cpaPlannedBudget = bgt ? bgt.budgetAmount : 186 * unitValue;
      const cpaPlannedJoes = bgt ? bgt.plannedJoes : 186;
      const subCount = Math.max(1, cmd.subunits?.length || 1);

      // Estimated quota per subunit within the CPA
      const subPlannedBudget = cpaPlannedBudget / subCount;
      const subPlannedJoes = Math.round(cpaPlannedJoes / subCount);

      cmd.subunits?.forEach((subName, subIdx) => {
        const subOps = currentOps.filter(
          (o) =>
            o.subUnit === subName ||
            (o.commandId === cmd.code && o.subUnit?.includes(subName.replace('º BPM', '')))
        );

        const executedAmount = subOps.reduce((sum, o) => sum + (o.totalValue || 0), 0);
        const executedJoes = subOps.reduce((sum, o) => sum + (o.officersCount || 0), 0);
        const percentSpent = subPlannedBudget > 0 ? (executedAmount / subPlannedBudget) * 100 : 0;
        const balance = Math.max(0, subPlannedBudget - executedAmount);

        list.push({
          id: `${cmd.code}-${subName}`,
          code: subName,
          cpaCode: cmd.code,
          cpaName: cmd.name,
          plannedBudget: subPlannedBudget,
          executedAmount,
          plannedJoes: subPlannedJoes,
          executedJoes,
          percentSpent: Number(percentSpent.toFixed(1)),
          balance,
        });
      });
    });

    // Filter
    let filtered = list;
    if (selectedCpaFilter !== 'ALL') {
      filtered = filtered.filter((s) => s.cpaCode === selectedCpaFilter);
    }

    // Sort
    if (sortBy === 'ORDER') {
      filtered.sort((a, b) => {
        const cpaDiff = getCommandOrderIndex(a.cpaCode) - getCommandOrderIndex(b.cpaCode);
        if (cpaDiff !== 0) return cpaDiff;
        return a.code.localeCompare(b.code, undefined, { numeric: true });
      });
    } else if (sortBy === 'PERCENT_DESC') {
      filtered.sort((a, b) => b.percentSpent - a.percentSpent);
    } else if (sortBy === 'PERCENT_ASC') {
      filtered.sort((a, b) => a.percentSpent - b.percentSpent);
    }

    return filtered;
  }, [commands, budgets, currentOps, ordinance, selectedCpaFilter, sortBy]);

  const activeData = viewMode === 'CPA' ? cpaData : subunitData;

  // Maximum percentage for the scale (minimum 100% or highest data item + 10%)
  const maxScalePercent = useMemo(() => {
    const highest = Math.max(...activeData.map((d) => d.percentSpent), 0);
    if (highest <= 100) return 100;
    return Math.ceil(highest / 20) * 20;
  }, [activeData]);

  // Scale grid values (e.g. 0%, 20%, 40%, 60%, 80%, 100%)
  const gridSteps = useMemo(() => {
    const steps = [];
    const stepCount = 5;
    const interval = maxScalePercent / stepCount;
    for (let i = 0; i <= stepCount; i++) {
      steps.push(Math.round(i * interval));
    }
    return steps;
  }, [maxScalePercent]);

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
      {/* Header with Title & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#002D5A] text-white shadow-xs">
            <Percent className="w-5 h-5 text-[#7EC2E8]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Porcentagem de Gasto por Unidade (Valor em Dinheiro Definido)
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-[#002D5A] border border-[#7EC2E8]">
                {ordinance.number}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Cada barra indica a porcentagem consumida em relação ao teto financeiro (R$) fixado pela Portaria
            </p>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              onClick={() => setViewMode('CPA')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'CPA'
                  ? 'bg-[#002D5A] text-white shadow-xs'
                  : 'hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Por Comandos (CPA/I)</span>
            </button>
            <button
              onClick={() => setViewMode('SUBUNITS')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'SUBUNITS'
                  ? 'bg-[#002D5A] text-white shadow-xs'
                  : 'hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Por Batalhões (BPMs/CIAs)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and sorting toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-bold text-slate-700">Filtrar:</span>
            <select
              value={selectedCpaFilter}
              onChange={(e) => setSelectedCpaFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8]"
            >
              <option value="ALL">Todos os Comandos (CPI, CPA/I-1 a CPA/I-9)</option>
              {commands.map((c) => {
                const isCpi = c.id === 'CPI' || c.code.startsWith('CPI');
                return (
                  <option key={c.id} value={c.code}>
                    {isCpi ? 'CPI' : c.code}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-bold text-slate-700">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8]"
            >
              <option value="ORDER">Ordem Padrão (CPI, CPA/I-1 a CPA/I-9)</option>
              <option value="PERCENT_DESC">Maior % de Gasto primeiro</option>
              <option value="PERCENT_ASC">Menor % de Gasto primeiro</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 text-slate-600 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#00C05B]" />
            <span className="text-[11px] font-semibold text-slate-700">Maior Gasto (% Teto)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#18234D]" />
            <span className="text-[11px] font-semibold text-slate-700">Demais Unidades</span>
          </div>
        </div>
      </div>

      {/* GRAPH CONTAINER - MODELED EXACTLY AFTER THE SCREENSHOT */}
      <div className="bg-[#F6F7FA] rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-inner relative overflow-hidden">
        {/* Subtle grid lines in background */}
        <div className="absolute inset-0 left-32 sm:left-44 right-16 sm:right-28 pointer-events-none flex justify-between py-6">
          {gridSteps.map((step) => (
            <div
              key={step}
              className="h-full border-r border-slate-200/90 relative flex flex-col justify-end"
            >
              {/* Optional vertical line subtle styling */}
            </div>
          ))}
        </div>

        {/* Rows of items */}
        <div className="space-y-6 sm:space-y-7 relative z-10">
          {activeData.map((item, index) => {
            const maxPercentInList = Math.max(...activeData.map((d) => d.percentSpent), 0);
            // Is top item (green highlight for highest spender > 0%)
            const isTop = (sortBy === 'PERCENT_DESC' && index === 0) || (item.percentSpent > 0 && item.percentSpent === maxPercentInList);
            const isOverBudget = item.percentSpent >= 100;

            // Bar color logic: Top item gets bright green (#00C05B) just like the screenshot, others get deep navy blue (#18234D)
            const barBgColor = isOverBudget
              ? '#E11D48' // Rose/Red for over-budget
              : isTop
              ? '#00C05B' // Vibrant Green for top spender
              : '#18234D'; // Navy blue for other units

            const circleBgColor = isOverBudget
              ? 'bg-rose-600 text-white'
              : isTop
              ? 'bg-[#00C05B] text-white shadow-sm'
              : 'bg-[#18234D] text-white';

            // Calculate width percentage relative to max scale
            const barWidthPercent = Math.min(100, Math.max(2, (item.percentSpent / maxScalePercent) * 100));

            return (
              <div
                key={item.id}
                className="group flex items-center gap-3 sm:gap-4 transition-all"
              >
                {/* Left: Official Unit Badge / Brasão */}
                <div
                  className="shrink-0 flex items-center justify-center p-0.5"
                  title={`${item.code}: ${item.percentSpent}% do teto em dinheiro`}
                >
                  <CommandBadge
                    commandCode={'cpaCode' in item ? (item as any).cpaCode : item.code}
                    size="md"
                  />
                </div>

                {/* Label Column: Unit Code */}
                <div className="w-24 sm:w-32 shrink-0 pr-2">
                  <div className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight truncate">
                    {item.code}
                  </div>
                </div>

                {/* Bar & Right-aligned Percentage Row */}
                <div className="flex-1 flex items-center gap-3 sm:gap-4 min-w-0">
                  {/* The Horizontal Bar */}
                  <div className="flex-1 h-8 sm:h-9 bg-transparent relative flex items-center">
                    <div
                      className="h-full rounded-r-md sm:rounded-r-lg transition-all duration-700 ease-out flex items-center justify-end px-3 shadow-xs"
                      style={{
                        width: `${barWidthPercent}%`,
                        backgroundColor: barBgColor,
                      }}
                    >
                      {/* Optional inner highlight for wide bars */}
                      {barWidthPercent > 40 && (
                        <span className="text-[11px] font-bold text-white/90 hidden md:inline font-mono">
                          {formatCurrencyBRL(item.executedAmount)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Percentage Value positioned at the right of the bar tip */}
                  <div className="shrink-0 w-24 sm:w-36 text-left">
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className="text-lg sm:text-2xl font-black tracking-tight font-mono"
                        style={{ color: barBgColor }}
                      >
                        {item.percentSpent}%
                      </span>
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium font-mono truncate">
                      {formatCurrencyBRL(item.executedAmount)} / {formatCurrencyBRL(item.plannedBudget)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom scale axis showing percentages (0%, 20%, 40%, 60%, 80%, 100%) */}
        <div className="mt-8 pt-4 border-t border-slate-300/80 flex items-center justify-between text-[11px] font-bold text-slate-400 font-mono pl-36 sm:pl-48 pr-28 sm:pr-40">
          {gridSteps.map((step) => (
            <span key={step} className="text-center">
              {step}%
            </span>
          ))}
        </div>
      </div>

      {/* Summary Footer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Maior Execução Financeira</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              {activeData[0]?.code || 'N/A'}: <strong className="text-emerald-700 font-mono">{activeData[0]?.percentSpent}%</strong>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {formatCurrencyBRL(activeData[0]?.executedAmount)} gastos
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-50 text-[#002D5A] border border-[#7EC2E8]">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Gasto Global Acumulado (CPI)</div>
            <div className="text-sm font-bold text-[#002D5A] mt-0.5 font-mono">
              {formatCurrencyBRL(totalExecutedAmount)} ({overallPercentage.toFixed(1)}%)
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Teto total: {formatCurrencyBRL(totalPlannedBudget)}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Valor Unitário por JOE</div>
            <div className="text-sm font-bold text-indigo-900 mt-0.5 font-mono">
              {formatCurrencyBRL(ordinance.unitValueJoe || 350)}
            </div>
            <div className="text-[11px] text-slate-500">
              Fixado na {ordinance.number}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
