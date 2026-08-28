import React from 'react';
import { Shield, ArrowRight, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';
import { CommandBudget, CommandUnit } from '../../types';
import {
  getCommandOrderIndex,
  normalizeCommandName,
  sortCommandsByOfficialOrder,
} from '../../utils/commandUtils';

interface CpaQuickCardsProps {
  budgets: CommandBudget[];
  commands: CommandUnit[];
  onSelectCpa: (cpaCode: string) => void;
}

export const CpaQuickCards: React.FC<CpaQuickCardsProps> = ({
  budgets,
  commands,
  onSelectCpa,
}) => {
  const sortedBudgets = sortCommandsByOfficialOrder<CommandBudget>(
    budgets.map((b) => ({
      ...b,
      commandId: normalizeCommandName(b.commandId),
    })),
    (b) => b.commandId
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#00204A]">
            Painel Orçamentário Individual por Comando Subordinado
          </h3>
          <p className="text-[11px] text-slate-500">
            Acompanhamento de cotas, saldo disponível e limites de CPI e CPA/I-1 ao CPA/I-9
          </p>
        </div>
        <div className="flex items-center space-x-3 text-[10px] font-bold">
          <span className="flex items-center text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1"></span> Normal (&lt;75%)
          </span>
          <span className="flex items-center text-amber-700">
            <span className="w-2 h-2 rounded-full bg-amber-500 mr-1"></span> Alerta (75-95%)
          </span>
          <span className="flex items-center text-red-700">
            <span className="w-2 h-2 rounded-full bg-red-500 mr-1"></span> Crítico (&gt;95%)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {sortedBudgets.map((b) => {
          const cmd = commands.find((c) => c.code === b.commandId);
          const totalSpent = b.committedAmount + b.executedAmount;
          const pct = (totalSpent / (b.budgetAmount || 1)) * 100;

          const isCritical = pct > 95 || b.availableBalance <= 0;
          const isWarning = pct >= 75 && pct <= 95;

          const statusColor = isCritical
            ? 'border-red-200 bg-red-50/50 hover:border-red-400'
            : isWarning
            ? 'border-amber-200 bg-amber-50/50 hover:border-amber-400'
            : 'border-slate-200 bg-white hover:border-[#00204A]/40';

          const badgeColor = isCritical
            ? 'bg-red-100 text-red-800 border-red-300'
            : isWarning
            ? 'bg-amber-100 text-amber-800 border-amber-300'
            : 'bg-emerald-100 text-emerald-800 border-emerald-300';

          return (
            <div
              key={b.id}
              onClick={() => onSelectCpa(b.commandId)}
              className={`border rounded-xl p-3.5 shadow-xs transition-all cursor-pointer group flex flex-col justify-between ${statusColor}`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#00204A] group-hover:text-blue-700 transition-colors">
                    {b.commandId}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${badgeColor}`}
                  >
                    {pct.toFixed(0)}% Utilizado
                  </span>
                </div>

                <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                  {cmd?.subunits ? `${cmd.subunits.length} unidades` : 'Unidade PMMA'}
                </div>

                {/* Values breakdown */}
                <div className="mt-3 space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-500">
                    <span>Orçamento:</span>
                    <span className="font-semibold text-slate-800">
                      R$ {b.budgetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-500">
                    <span>Gasto/Compr:</span>
                    <span className="font-semibold text-amber-700">
                      R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-200/80">
                    <span>Saldo Livre:</span>
                    <span
                      className={`font-bold ${
                        b.availableBalance < 0 ? 'text-red-700' : 'text-emerald-700'
                      }`}
                    >
                      R$ {b.availableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full ${
                      isCritical
                        ? 'bg-red-500'
                        : isWarning
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  ></div>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500 group-hover:text-[#00204A] font-medium">
                  <span>{b.usedJoesCount} / {b.plannedJoes} JOEs</span>
                  <span className="flex items-center font-bold">
                    Ver missões <ArrowRight className="w-2.5 h-2.5 ml-1" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
