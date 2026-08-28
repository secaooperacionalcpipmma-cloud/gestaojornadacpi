import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Edit,
  ArrowRightLeft,
  CheckCircle2,
  X,
  Layers,
} from 'lucide-react';
import { CommandBudget, CommandUnit, OrdinancePeriod, User } from '../../types';
import { pdfService } from '../../services/pdfService';
import { excelService } from '../../services/excelService';
import {
  normalizeCommandName,
  sortCommandsByOfficialOrder,
} from '../../utils/commandUtils';

interface BudgetManagementProps {
  budgets: CommandBudget[];
  commands: CommandUnit[];
  ordinance: OrdinancePeriod;
  currentUser: User;
  onUpdateBudget: (budget: CommandBudget, reason: string) => void;
}

export const BudgetManagement: React.FC<BudgetManagementProps> = ({
  budgets,
  commands,
  ordinance,
  currentUser,
  onUpdateBudget,
}) => {
  const [editingBudget, setEditingBudget] = useState<CommandBudget | null>(null);
  const [newBudgetAmount, setNewBudgetAmount] = useState<number>(0);
  const [newPlannedJoes, setNewPlannedJoes] = useState<number>(0);
  const [reason, setReason] = useState<string>('');

  const sortedBudgets = sortCommandsByOfficialOrder<CommandBudget>(
    budgets.map((b) => ({
      ...b,
      commandId: normalizeCommandName(b.commandId),
    })),
    (b) => b.commandId
  );

  const totalBudget = budgets.reduce((s, b) => s + b.budgetAmount, 0);
  const totalCommitted = budgets.reduce((s, b) => s + b.committedAmount, 0);
  const totalExecuted = budgets.reduce((s, b) => s + b.executedAmount, 0);
  const totalSpent = totalCommitted + totalExecuted;
  const totalBalance = totalBudget - totalSpent;
  const totalJoes = budgets.reduce((s, b) => s + b.plannedJoes, 0);
  const totalUsedJoes = budgets.reduce((s, b) => s + b.usedJoesCount, 0);

  const isCpiOrAdmin = currentUser.role === 'CPI_GESTOR' || currentUser.role === 'ADMIN';

  const handleStartEdit = (b: CommandBudget) => {
    setEditingBudget(b);
    setNewBudgetAmount(b.budgetAmount);
    setNewPlannedJoes(b.plannedJoes);
    setReason('');
  };

  const handleSaveEdit = () => {
    if (!editingBudget) return;
    onUpdateBudget(
      {
        ...editingBudget,
        budgetAmount: newBudgetAmount,
        plannedJoes: newPlannedJoes,
      },
      reason || 'Ajuste de cota pelo gestor CPI'
    );
    setEditingBudget(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-black text-[#00204A] tracking-tight">
              Controle Orçamentário Estrito & Quadro de Cotas
            </h2>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-[#00204A] text-[#FFD700] border border-[#00204A]">
              Art. 5º e 13, II
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Quadro de distribuição das cotas financeiras por Comando de Área (Anexo I da {ordinance.number}).
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => pdfService.generateBudgetReport(budgets, commands, ordinance)}
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5 text-[#D97706]" />
            <span>Gerar Demonstrativo PDF</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Teto Orçamentário Geral</span>
          <div className="text-xl font-black text-[#00204A] mt-1">
            R$ {totalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500 font-semibold">{totalJoes} JOEs Previstas</span>
        </div>

        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Total Comprometido / Gasto</span>
          <div className="text-xl font-black text-[#D97706] mt-1">
            R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-amber-700 font-bold">{totalUsedJoes} JOEs Lançadas ({((totalSpent / (totalBudget || 1)) * 100).toFixed(1)}%)</span>
        </div>

        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Saldo Disponível Geral</span>
          <div className={`text-xl font-black mt-1 ${totalBalance < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
            R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-emerald-700 font-bold">{totalJoes - totalUsedJoes} JOEs Disponíveis</span>
        </div>

        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Valor Unitário Vigente</span>
          <div className="text-xl font-black text-blue-700 mt-1">
            R$ {ordinance.unitValueJoe.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-500">Teto individual: {ordinance.monthlyIndividualLimit} JOEs/PM</span>
        </div>
      </div>

      {/* Table of Quotas per Command */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Detalhamento por Subunidade / Comando de Área Subordinado
          </h3>
          <span className="text-[10px] font-bold text-slate-500">Base: Anexo I da Portaria</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#00204A] text-slate-200 uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="py-3 px-3">Comando / Sigla</th>
                <th className="py-3 px-3">Denominação & Sede</th>
                <th className="py-3 px-3 text-center">Qtd. JOEs</th>
                <th className="py-3 px-3 text-right">Orçamento (R$)</th>
                <th className="py-3 px-3 text-right">Comprometido (R$)</th>
                <th className="py-3 px-3 text-right">Executado (R$)</th>
                <th className="py-3 px-3 text-right">Saldo Disponível (R$)</th>
                <th className="py-3 px-3 text-center">% Utilizado</th>
                <th className="py-3 px-3 text-center">Status</th>
                {isCpiOrAdmin && <th className="py-3 px-3 text-center">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedBudgets.map((b) => {
                const cmd = commands.find((c) => normalizeCommandName(c.code) === b.commandId);
                const spent = b.committedAmount + b.executedAmount;
                const pct = (spent / (b.budgetAmount || 1)) * 100;
                const isCritical = pct > 95 || b.availableBalance <= 0;
                const isWarning = pct >= 75 && pct <= 95;

                return (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-[#00204A]">{b.commandId}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800">{cmd?.name || b.commandId}</div>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                      {b.usedJoesCount} / {b.plannedJoes}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      R$ {b.budgetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-amber-700">
                      R$ {b.committedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-cyan-700">
                      R$ {b.executedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-mono font-black ${
                        b.availableBalance < 0 ? 'text-red-700' : 'text-emerald-700'
                      }`}
                    >
                      R$ {b.availableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="w-20 mx-auto">
                        <div className="flex justify-between text-[9px] mb-0.5 text-slate-500 font-bold">
                          <span>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                          isCritical
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : isWarning
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        {isCritical ? 'CRÍTICO' : isWarning ? 'ALERTA' : 'REGULAR'}
                      </span>
                    </td>
                    {isCpiOrAdmin && (
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleStartEdit(b)}
                          className="p-1.5 text-slate-500 hover:text-[#00204A] hover:bg-slate-100 rounded-lg transition-colors"
                          title="Ajustar Cota do Comando"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-black text-[#00204A] text-xs border-t-2 border-slate-200">
                <td colSpan={2} className="py-3 px-3 uppercase tracking-wider text-right">
                  TOTAL GERAL DO CPI:
                </td>
                <td className="py-3 px-3 text-center font-mono text-[#00204A]">{totalJoes} JOEs</td>
                <td className="py-3 px-3 text-right font-mono text-[#00204A]">
                  R$ {totalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-3 text-right font-mono text-amber-700">
                  R$ {totalCommitted.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-3 text-right font-mono text-cyan-700">
                  R$ {totalExecuted.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-3 text-right font-mono text-emerald-700 text-sm">
                  R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-3 text-center text-[10px] text-slate-500">
                  {((totalSpent / (totalBudget || 1)) * 100).toFixed(1)}% Geral
                </td>
                <td colSpan={2} className="py-3 px-3 text-center text-emerald-700 font-bold text-[10px]">
                  SUPERVISÃO 100% ATIVA
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Edit Quota Modal */}
      {editingBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-sm font-black text-[#00204A]">
                Ajustar Cota Orçamentária • {editingBudget.commandId}
              </h3>
              <button onClick={() => setEditingBudget(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Quantidade de JOEs Previstas:</label>
                <input
                  type="number"
                  value={newPlannedJoes}
                  onChange={(e) => {
                    const joes = parseInt(e.target.value) || 0;
                    setNewPlannedJoes(joes);
                    setNewBudgetAmount(joes * ordinance.unitValueJoe);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:border-[#00204A] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Valor Total Orçado (R$):</label>
                <input
                  type="number"
                  value={newBudgetAmount}
                  onChange={(e) => setNewBudgetAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:border-[#00204A] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Justificativa Administrativa do Ajuste *:</label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Suplementação autorizada pelo Cmt-Geral via Processo SEI..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:border-[#00204A] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setEditingBudget(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="bg-[#FFD700] hover:bg-[#ffe033] text-[#00204A] text-xs font-black px-4 py-2 rounded-xl shadow-xs"
              >
                Salvar Ajuste
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
