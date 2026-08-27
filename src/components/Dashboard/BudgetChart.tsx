import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { CommandBudget } from '../../types';
import { getCommandOrderIndex } from './UnitSpendingChart';

interface BudgetChartProps {
  budgets: CommandBudget[];
}

export const BudgetChart: React.FC<BudgetChartProps> = ({ budgets }) => {
  const sortedBudgets = [...budgets].sort(
    (a, b) => getCommandOrderIndex(a.commandId) - getCommandOrderIndex(b.commandId)
  );

  const chartData = sortedBudgets.map((b) => ({
    name: b.commandId.startsWith('CPI') ? 'CPI' : b.commandId,
    Orçado: b.budgetAmount,
    Gasto: b.committedAmount + b.executedAmount,
    Saldo: Math.max(0, b.availableBalance),
  }));

  const formatCurrency = (val: number) =>
    `R$ ${(val / 1000).toFixed(1)}k`;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-[#00204A]">
            Comparativo Orçamentário por Comando de Área (CPI e CPA/I-1 a CPA/I-9)
          </h3>
          <p className="text-[11px] text-slate-500">
            Orçamento Inicial vs Valor Comprometido/Executado vs Saldo Disponível
          </p>
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={10} tickFormatter={formatCurrency} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                borderRadius: '8px',
                color: '#0f172a',
                fontSize: '12px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              formatter={(value: any) => [
                `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                '',
              ]}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Bar dataKey="Orçado" fill="#00204A" radius={[4, 4, 0, 0]} maxBarSize={30} />
            <Bar dataKey="Gasto" fill="#D97706" radius={[4, 4, 0, 0]} maxBarSize={30} />
            <Bar dataKey="Saldo" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
