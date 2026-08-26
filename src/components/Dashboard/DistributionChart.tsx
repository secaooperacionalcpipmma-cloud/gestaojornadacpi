import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { CommandBudget } from '../../types';

interface DistributionChartProps {
  budgets: CommandBudget[];
}

const COLORS = [
  '#00204A',
  '#D97706',
  '#0D9488',
  '#2563EB',
  '#7C3AED',
  '#DC2626',
  '#059669',
  '#EA580C',
  '#4F46E5',
  '#65A30D',
];

export const DistributionChart: React.FC<DistributionChartProps> = ({ budgets }) => {
  const data = budgets.map((b) => ({
    name: b.commandId,
    value: b.committedAmount + b.executedAmount || 1, // small fallback for chart display
    actualSpent: b.committedAmount + b.executedAmount,
  }));

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-[#00204A]">
            Distribuição dos Gastos por CPA/I
          </h3>
          <p className="text-[11px] text-slate-500">
            Participação percentual de cada Comando na execução da JOE
          </p>
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                borderRadius: '8px',
                color: '#0f172a',
                fontSize: '12px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              formatter={(val: any, name: any, item: any) => [
                `R$ ${item.payload.actualSpent.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}`,
                item.payload.name,
              ]}
            />
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
