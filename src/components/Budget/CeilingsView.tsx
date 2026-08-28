import React, { useState, useEffect } from 'react';
import {
  Save,
  CheckCircle2,
  Building2,
  ShieldCheck,
  Coins,
  Calculator,
  Info,
  Scale,
} from 'lucide-react';
import { CommandBudget, CommandUnit, OrdinancePeriod, OperationLaunch, User } from '../../types';
import { formatCurrencyBRL, formatInteger, formatAccountingNumber, parseBRLInput } from '../../utils/formatters';
import {
  normalizeCommandName,
  sortCommandsByOfficialOrder,
  getCommandOrderIndex,
} from '../../utils/commandUtils';

interface CeilingsViewProps {
  ordinance: OrdinancePeriod;
  budgets: CommandBudget[];
  commands: CommandUnit[];
  operations: OperationLaunch[];
  currentUser: User;
  onSaveBudgets: (updatedBudgets: CommandBudget[]) => void;
}

interface EditableBudgetRow {
  commandId: string;
  code: string;
  name: string;
  subunits: string[];
  plannedJoes: number;
  budgetAmount: number;
  displayAmount: string;
  launchedJoes: number;
  launchedMoney: number;
}

export function CeilingsView({
  ordinance,
  budgets,
  commands,
  operations,
  currentUser,
  onSaveBudgets,
}: CeilingsViewProps) {
  // Local state for editable budget rows
  const [rows, setRows] = useState<EditableBudgetRow[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Initialize or re-sync rows from budgets and commands
  useEffect(() => {
    const ordOps = operations.filter((o) => o.ordinanceId === ordinance.id);

    const defaultCotas: Record<string, { joes: number; amount: number }> = {
      'CPI': { joes: 30, amount: 10500 },
      'CPA/I-1': { joes: 186, amount: 65100 },
      'CPA/I-2': { joes: 186, amount: 65100 },
      'CPA/I-3': { joes: 300, amount: 105000 },
      'CPA/I-4': { joes: 186, amount: 65100 },
      'CPA/I-5': { joes: 230, amount: 80500 },
      'CPA/I-6': { joes: 170, amount: 59500 },
      'CPA/I-7': { joes: 186, amount: 65100 },
      'CPA/I-8': { joes: 186, amount: 65100 },
      'CPA/I-9': { joes: 226, amount: 79100 },
    };

    const initialRows: EditableBudgetRow[] = commands.map((cmd) => {
      const normCode = normalizeCommandName(cmd.code || cmd.id || cmd.name);
      const existingBgt = budgets.find(
        (b) => normalizeCommandName(b.commandId) === normCode
      );

      const defaultData = defaultCotas[normCode] || { joes: 186, amount: 65100 };

      const plannedJoes = existingBgt ? existingBgt.plannedJoes : defaultData.joes;
      const budgetAmount = existingBgt ? existingBgt.budgetAmount : defaultData.amount;

      const cmdOps = ordOps.filter(
        (o) => normalizeCommandName(o.commandId) === normCode
      );
      const launchedJoes = cmdOps.reduce((sum, o) => sum + (o.officersCount || 0), 0);
      const launchedMoney = cmdOps.reduce((sum, o) => sum + (o.totalValue || 0), 0);

      return {
        commandId: normCode,
        code: normCode,
        name: normCode === 'CPI' ? 'CPI' : normCode,
        subunits: cmd.subunits || [normCode],
        plannedJoes,
        budgetAmount,
        displayAmount: formatAccountingNumber(budgetAmount),
        launchedJoes,
        launchedMoney,
      };
    });

    setRows(sortCommandsByOfficialOrder(initialRows, (r) => r.commandId));
  }, [budgets, commands, operations, ordinance.id]);

  // Handle change in JOEs quantity
  const handleJoesChange = (index: number, valStr: string) => {
    const cleanStr = valStr.replace(/\D/g, '');
    const newJoes = cleanStr === '' ? 0 : parseInt(cleanStr, 10);
    const unitPrice = ordinance.unitValueJoe || 350;
    const newAmount = newJoes * unitPrice;

    setRows((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        plannedJoes: newJoes,
        budgetAmount: newAmount,
        displayAmount: formatAccountingNumber(newAmount),
      };
      return copy;
    });
    setSavedSuccess(false);
  };

  // Handle change in Financial Amount string
  const handleAmountChange = (index: number, valStr: string) => {
    const rawNumber = parseBRLInput(valStr);

    setRows((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        budgetAmount: rawNumber,
        displayAmount: valStr,
      };
      return copy;
    });
    setSavedSuccess(false);
  };

  // Handle blur on amount to format strictly as accounting
  const handleAmountBlur = (index: number) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        displayAmount: formatAccountingNumber(copy[index].budgetAmount),
      };
      return copy;
    });
  };

  // Save all budgets
  const handleSave = () => {
    const updatedBudgets: CommandBudget[] = rows.map((r) => {
      const existing = budgets.find((b) => b.commandId === r.commandId);
      return {
        id: existing?.id || `bgt-${ordinance.id}-${r.commandId.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        ordinanceId: ordinance.id,
        commandId: r.commandId,
        plannedJoes: r.plannedJoes,
        budgetAmount: r.budgetAmount,
        committedAmount: 0,
        executedAmount: r.launchedMoney,
        availableBalance: Math.max(0, r.budgetAmount - r.launchedMoney),
        usedJoesCount: r.launchedJoes,
      };
    });

    onSaveBudgets(updatedBudgets);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 5000);
  };

  // Totals calculations (matching Print 01)
  const totalJoes = rows.reduce((sum, r) => sum + r.plannedJoes, 0);
  const totalBudget = rows.reduce((sum, r) => sum + r.budgetAmount, 0);
  const totalLaunchedJoes = rows.reduce((sum, r) => sum + r.launchedJoes, 0);
  const totalLaunchedMoney = rows.reduce((sum, r) => sum + r.launchedMoney, 0);
  const remainingJoes = Math.max(0, totalJoes - totalLaunchedJoes);
  const remainingBudget = Math.max(0, totalBudget - totalLaunchedMoney);

  return (
    <div className="space-y-6">
      {/* Main Ceilings Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        {/* Header Title and Description matching Print 02 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>{ordinance.name || `Portaria ${ordinance.number}`}</span>
              <span className="text-xs font-bold text-[#002D5A] bg-sky-50 px-3 py-1 rounded-full border border-[#7EC2E8]">
                {ordinance.status || 'VIGENTE'}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-4xl leading-relaxed">
              {ordinance.notes ||
                'Valores do Anexo I da portaria. Altere aqui quando houver remanejamento de cota pelo Comando-Geral (art. 17, §3º).'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className="bg-[#002D5A] hover:bg-[#001F3F] text-white font-bold text-xs sm:text-sm py-2.5 px-6 rounded-xl shadow-md transition-all active:scale-98 flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#7EC2E8]" />
              <span>Salvar Tetos</span>
            </button>
          </div>
        </div>

        {savedSuccess && (
          <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-[#002D5A]">
              <CheckCircle2 className="w-5 h-5 text-[#002D5A] shrink-0" />
              <span>Tetos orçamentários e cotas de JOEs atualizados e registrados com sucesso!</span>
            </div>
            <span className="text-xs font-semibold text-sky-800">Auditado pelo sistema</span>
          </div>
        )}

        {/* Quadro de Cotas Orçamentárias Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
          <table className="w-full text-left text-xs sm:text-sm text-slate-700">
            <thead className="bg-[#002D5A] text-white font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4 w-48 text-sky-100">Comando</th>
                <th className="py-3.5 px-4 w-36 text-right text-sky-100">Teto de JOEs</th>
                <th className="py-3.5 px-4 w-48 text-right text-sky-100">Teto Financeiro (R$)</th>
                <th className="py-3.5 px-4 w-56 text-sky-100">Já Lançado</th>
                <th className="py-3.5 px-4 text-sky-100">Unidades Subordinadas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((row, idx) => (
                <tr
                  key={row.commandId}
                  className={`hover:bg-sky-50/30 transition-colors ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                  }`}
                >
                  {/* Comando */}
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#002D5A]" />
                      <span className="font-semibold">{row.commandId}</span>
                    </div>
                  </td>

                  {/* Teto de JOEs (Accounting formatted integer input) */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center justify-end">
                      <input
                        type="text"
                        value={row.plannedJoes === 0 ? '' : formatInteger(row.plannedJoes)}
                        onChange={(e) => handleJoesChange(idx, e.target.value)}
                        placeholder="0"
                        className="w-24 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs sm:text-sm text-slate-900 font-bold text-right focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] shadow-2xs font-mono"
                      />
                    </div>
                  </td>

                  {/* Teto Financeiro (R$) (Accounting formatted BRL input) */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center justify-end">
                      <div className="relative rounded-xl shadow-2xs">
                        <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 font-bold text-xs sm:text-sm">
                          R$
                        </span>
                        <input
                          type="text"
                          value={row.displayAmount}
                          onChange={(e) => handleAmountChange(idx, e.target.value)}
                          onBlur={() => handleAmountBlur(idx)}
                          placeholder="0,00"
                          className="w-40 bg-white border border-slate-300 rounded-xl pl-8 pr-2.5 py-1.5 text-xs sm:text-sm text-slate-900 font-bold text-right font-mono focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A]"
                        />
                      </div>
                    </div>
                  </td>

                  {/* Já Lançado (Accounting display) */}
                  <td className="py-3.5 px-4">
                    {row.launchedJoes > 0 ? (
                      <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-lg text-xs font-mono font-bold">
                          {formatInteger(row.launchedJoes)} JOEs
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-[#002D5A] font-mono text-xs sm:text-sm font-extrabold">
                          {formatCurrencyBRL(row.launchedMoney)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm font-medium">—</span>
                    )}
                  </td>

                  {/* Unidades Subordinadas */}
                  <td className="py-3.5 px-4 text-slate-600 text-xs sm:text-[13px] leading-relaxed">
                    {row.subunits.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Total Geral do CPI Footer Row matching Print 01 */}
            <tfoot className="border-t-2 border-slate-300 bg-slate-100/90 text-slate-900 font-bold text-xs sm:text-sm">
              <tr className="border-b border-slate-200">
                <td className="py-4 px-4 uppercase tracking-wider text-slate-900 font-black">
                  TOTAL GERAL DO CPI
                </td>
                <td className="py-4 px-4 text-right font-mono font-black text-sm sm:text-base text-slate-900">
                  {formatInteger(totalJoes)}
                </td>
                <td className="py-4 px-4 text-right font-mono font-black text-sm sm:text-base text-[#002D5A]">
                  {formatCurrencyBRL(totalBudget)}
                </td>
                <td className="py-4 px-4 font-mono">
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                    <span className="bg-sky-100 text-[#002D5A] border border-[#7EC2E8]/40 px-2 py-0.5 rounded-md font-bold">
                      {formatInteger(totalLaunchedJoes)} JOEs
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-[#002D5A] font-extrabold">
                      {formatCurrencyBRL(totalLaunchedMoney)}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 text-xs sm:text-sm text-slate-600 font-normal">
                  Saldo: <span className="font-bold text-slate-900">{formatInteger(remainingJoes)} JOEs ({formatCurrencyBRL(remainingBudget)})</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Action Button and Legal Notice footer matching Print 01 */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <button
              onClick={handleSave}
              className="bg-[#002D5A] hover:bg-[#001F3F] text-white font-bold text-xs sm:text-sm py-2.5 px-6 rounded-xl shadow-md transition-all active:scale-98 flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#7EC2E8]" />
              <span>Salvar Tetos</span>
            </button>
            <span className="text-xs sm:text-sm text-slate-500 font-medium">
              Valor unitário regulamentar por JOE: <strong className="text-slate-800 font-bold">{formatCurrencyBRL(ordinance.unitValueJoe || 350)}</strong>
            </span>
          </div>

          {/* Legal Notice Banner from Print 01 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 text-xs sm:text-[13px] leading-relaxed flex items-start gap-3">
            <Scale className="w-5 h-5 text-[#002D5A] shrink-0 mt-0.5" />
            <p>
              <strong className="text-slate-900">Base Legal & Responsabilidade:</strong> Portaria nº 122/2026-GCG (Processo SEI 2026.190110.35458 / Doc. SEI nº 016909457). Informações falsas ou indevidas sujeitam os agentes a sanções administrativas, disciplinares, civis e penais, além da restituição ao erário (Art. 16).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
