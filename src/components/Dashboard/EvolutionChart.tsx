import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { OperationLaunch } from '../../types';

interface EvolutionChartProps {
  operations: OperationLaunch[];
}

export const EvolutionChart: React.FC<EvolutionChartProps> = ({ operations }) => {
  // Aggregate expenses chronologically by serviceDate
  const dateMap: Record<string, number> = {};

  // Sort operations by date
  const sortedOps = [...operations].sort(
    (a, b) => new Date(a.serviceDate).getTime() - new Date(b.serviceDate).getTime()
  );

  let cumulative = 0;
  const chartData: { data: string; diario: number; acumulado: number }[] = [];

  sortedOps.forEach((op) => {
    const formattedDate = new Date(op.serviceDate + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
    dateMap[formattedDate] = (dateMap[formattedDate] || 0) + op.totalValue;
  });

  Object.entries(dateMap).forEach(([dateStr, dailyAmount]) => {
    cumulative += dailyAmount;
    chartData.push({
      data: dateStr,
      diario: dailyAmount,
      acumulado: cumulative,
    });
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-[#00204A]">
            Evolução Cronológica dos Gastos de JOE
          </h3>
          <p className="text-[11px] text-slate-500">
            Desembolso acumulado ao longo dos dias de serviço da Portaria
          </p>
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00204A" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#00204A" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="data" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
              tickLine={false}
            />
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
                'Total Acumulado',
              ]}
            />
            <Area
              type="monotone"
              dataKey="acumulado"
              stroke="#00204A"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorAcumulado)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
