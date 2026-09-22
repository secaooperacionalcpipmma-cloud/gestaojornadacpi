import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  CheckCircle2,
  Building2,
  ShieldCheck,
  Coins,
  Calculator,
  Info,
  Scale,
  RotateCcw,
  Sparkles,
  FileCheck2,
  Star,
} from 'lucide-react';
import { CommandBudget, CommandUnit, OrdinancePeriod, OperationLaunch, User } from '../../types';
import { formatCurrencyBRL, formatInteger, formatAccountingNumber, parseBRLInput, formatDateBRL } from '../../utils/formatters';
import {
  normalizeCommandName,
  sortCommandsByOfficialOrder,
} from '../../utils/commandUtils';
import { getOrdinanceStatusInfo } from '../../utils/ordinancePeriodUtils';

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
  displayJoes: string;
  displayAmount: string;
  launchedJoes: number;
  launchedMoney: number;
}

// Cotas Oficiais do Anexo I da Portaria nº 127/2026 – GCG (SEI 2026.190110.39762 / 017554882)
// Período: 22/09/2026 a 26/10/2026 - Total CPI: 1.105 JOEs / R$ 386.750,00
const OFFICIAL_127_COTAS: Record<string, { joes: number; amount: number }> = {
  'CPI': { joes: 25, amount: 8750 },
  'CPA/I-1': { joes: 106, amount: 37100 },
  'CPA/I-2': { joes: 106, amount: 37100 },
  'CPA/I-3': { joes: 200, amount: 70000 },
  'CPA/I-4': { joes: 106, amount: 37100 },
  'CPA/I-5': { joes: 137, amount: 47950 },
  'CPA/I-6': { joes: 100, amount: 35000 },
  'CPA/I-7': { joes: 105, amount: 36750 },
  'CPA/I-8': { joes: 105, amount: 36750 },
  'CPA/I-9': { joes: 115, amount: 40250 },
};

// Cotas Oficiais Anteriores da Portaria nº 122/2026 – GCG (Histórica)
const OFFICIAL_122_COTAS: Record<string, { joes: number; amount: number }> = {
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

export function CeilingsView({
  ordinance,
  budgets,
  commands,
  operations,
  currentUser,
  onSaveBudgets,
}: CeilingsViewProps) {
  const [rows, setRows] = useState<EditableBudgetRow[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const lastOrdinanceIdRef = useRef<string>(ordinance.id);

  const unitPrice = ordinance.unitValueJoe || 350;
  const isPortaria127 =
    ordinance.number?.includes('127') ||
    ordinance.id?.includes('127') ||
    ordinance.name?.includes('127');

  // Initialize or re-sync rows from budgets and commands
  useEffect(() => {
    const isOrdinanceSwitched = lastOrdinanceIdRef.current !== ordinance.id;
    if (isOrdinanceSwitched) {
      lastOrdinanceIdRef.current = ordinance.id;
      setIsDirty(false);
    }

    const ordOps = operations.filter((o) => o.ordinanceId === ordinance.id);
    const defaultCotas = isPortaria127 ? OFFICIAL_127_COTAS : OFFICIAL_122_COTAS;

    setRows((prevRows) => {
      // If the user has unsaved edits on the current ordinance, preserve their edited values
      // and only update launched counters from operations
      if (isDirty && !isOrdinanceSwitched && prevRows.length > 0) {
        return prevRows.map((row) => {
          const cmdOps = ordOps.filter(
            (o) => normalizeCommandName(o.commandId) === row.commandId
          );
          const launchedJoes = cmdOps.reduce((sum, o) => sum + (o.officersCount || 0), 0);
          const launchedMoney = cmdOps.reduce((sum, o) => sum + (o.totalValue || 0), 0);
          return {
            ...row,
            launchedJoes,
            launchedMoney,
          };
        });
      }

      // Otherwise build fresh rows from budgets or official defaults
      const initialRows: EditableBudgetRow[] = commands.map((cmd) => {
        const normCode = normalizeCommandName(cmd.code || cmd.id || cmd.name);
        const existingBgt = budgets.find(
          (b) =>
            normalizeCommandName(b.commandId) === normCode &&
            b.ordinanceId === ordinance.id
        );

        const defaultData = defaultCotas[normCode] || { joes: 106, amount: 37100 };

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
          displayJoes: String(plannedJoes),
          displayAmount: formatAccountingNumber(budgetAmount),
          launchedJoes,
          launchedMoney,
        };
      });

      return sortCommandsByOfficialOrder(initialRows, (r) => r.commandId);
    });
  }, [budgets, commands, operations, ordinance.id, isPortaria127]);

  // Handle change in JOEs quantity input with smooth typing and instant sync
  const handleJoesChange = (index: number, valStr: string) => {
    // Keep raw string for user typing
    const cleanStr = valStr.replace(/\D/g, '');
    const newJoes = cleanStr === '' ? 0 : parseInt(cleanStr, 10);
    const newAmount = newJoes * unitPrice;

    setRows((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        plannedJoes: newJoes,
        displayJoes: cleanStr,
        budgetAmount: newAmount,
        displayAmount: formatAccountingNumber(newAmount),
      };
      return copy;
    });
    setIsDirty(true);
    setSavedSuccess(false);
  };

  // Handle blur on JOEs input to format as clean number
  const handleJoesBlur = (index: number) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        displayJoes: String(copy[index].plannedJoes),
      };
      return copy;
    });
  };

  // Handle change in Financial Amount string
  const handleAmountChange = (index: number, valStr: string) => {
    const rawNumber = parseBRLInput(valStr);
    const calculatedJoes = Math.round(rawNumber / unitPrice);

    setRows((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        budgetAmount: rawNumber,
        displayAmount: valStr,
        plannedJoes: calculatedJoes,
        displayJoes: String(calculatedJoes),
      };
      return copy;
    });
    setIsDirty(true);
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

  // Apply Official Anexo I values for Portaria 127/2026 (or 122)
  const handleApplyOfficialAnexoI = () => {
    const defaultCotas = isPortaria127 ? OFFICIAL_127_COTAS : OFFICIAL_122_COTAS;

    setRows((prev) =>
      prev.map((row) => {
        const official = defaultCotas[row.commandId] || {
          joes: 106,
          amount: 106 * unitPrice,
        };
        return {
          ...row,
          plannedJoes: official.joes,
          displayJoes: String(official.joes),
          budgetAmount: official.amount,
          displayAmount: formatAccountingNumber(official.amount),
        };
      })
    );
    setIsDirty(true);
    setSavedSuccess(false);
  };

  // Save all budgets
  const handleSave = () => {
    const updatedBudgets: CommandBudget[] = rows.map((r) => {
      const existing = budgets.find(
        (b) => b.commandId === r.commandId && b.ordinanceId === ordinance.id
      );
      const safeId =
        existing?.id ||
        `bgt-${ordinance.id}-${r.commandId.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      return {
        id: safeId,
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
    setIsDirty(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 6000);
  };

  // Totals calculations matching Print 01 & Print 02
  const totalJoes = rows.reduce((sum, r) => sum + r.plannedJoes, 0);
  const totalBudget = rows.reduce((sum, r) => sum + r.budgetAmount, 0);
  const totalLaunchedJoes = rows.reduce((sum, r) => sum + r.launchedJoes, 0);
  const totalLaunchedMoney = rows.reduce((sum, r) => sum + r.launchedMoney, 0);
  const remainingJoes = Math.max(0, totalJoes - totalLaunchedJoes);
  const remainingBudget = Math.max(0, totalBudget - totalLaunchedMoney);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Main Ceilings Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        {/* Header Title and Description matching Print 01 and PDF */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                <span>{ordinance.number || ordinance.name || 'PORTARIA Nº 127/2026 – GCG'}</span>
              </h2>
              {(() => {
                const statusInfo = getOrdinanceStatusInfo(ordinance);
                if (statusInfo.isCurrentInEffect) {
                  return (
                    <span className="text-xs font-bold text-[#002D5A] bg-sky-50 px-3 py-1 rounded-full border border-[#7EC2E8] inline-flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>Em Vigor</span>
                    </span>
                  );
                }
                if (statusInfo.isExpired) {
                  return (
                    <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-300 inline-flex items-center gap-1">
                      <span>Já Executado no período {statusInfo.periodText}</span>
                    </span>
                  );
                }
                return (
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-300">
                    {statusInfo.badgeLabel}
                  </span>
                );
              })()}
              {isDirty && (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-300 animate-pulse">
                  ● Alterações não salvas
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-4xl leading-relaxed">
              {ordinance.notes ||
                'Valores e cotas regulamentadas pelo Comando-Geral da PMMA (Art. 17, §3º da Lei de Diretrizes de JOE).'}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-2 font-medium">
              <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md">
                <strong>Vigência:</strong> {formatDateBRL(ordinance.startDate)} a {formatDateBRL(ordinance.endDate)}
              </span>
              {ordinance.seiProcess && (
                <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md font-mono">
                  <strong>Proc. SEI:</strong> {ordinance.seiProcess}
                </span>
              )}
              {ordinance.seiDocument && (
                <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md font-mono">
                  <strong>Doc. SEI:</strong> {ordinance.seiDocument}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isPortaria127 && (
              <button
                type="button"
                onClick={handleApplyOfficialAnexoI}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#002D5A] bg-sky-50 hover:bg-sky-100 border border-[#7EC2E8] transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
                title="Preencher com os valores oficiais do Anexo I da Portaria 127/2026 (Total: 1.105 JOEs / R$ 386.750,00)"
              >
                <Sparkles className="w-4 h-4 text-sky-600" />
                <span>Aplicar Anexo I Oficial (1.105 JOEs)</span>
              </button>
            )}

            <button
              onClick={handleSave}
              className="bg-[#002D5A] hover:bg-[#001F3F] text-white font-bold text-xs sm:text-sm py-2.5 px-6 rounded-xl shadow-md transition-all active:scale-98 flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#7EC2E8]" />
              <span>Salvar Tetos</span>
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {savedSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                Tetos da {ordinance.number || 'Portaria'} salvos com sucesso! 10 Comandos atualizados ({formatInteger(totalJoes)} JOEs · {formatCurrencyBRL(totalBudget)}).
              </span>
            </div>
            <span className="text-xs font-semibold text-emerald-700">Gravado no Banco de Dados</span>
          </div>
        )}

        {/* Quadro de Cotas Orçamentárias Table matching Print 01 */}
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

                  {/* Teto de JOEs (Input editável com suporte completo a digitação direta) */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center justify-end">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={row.displayJoes}
                        onChange={(e) => handleJoesChange(idx, e.target.value)}
                        onBlur={() => handleJoesBlur(idx)}
                        placeholder="0"
                        className="w-24 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs sm:text-sm text-slate-900 font-bold text-right focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] shadow-2xs font-mono"
                      />
                    </div>
                  </td>

                  {/* Teto Financeiro (R$) (Input editável com cálculo automático) */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center justify-end">
                      <div className="relative rounded-xl shadow-2xs">
                        <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 font-bold text-xs sm:text-sm">
                          R$
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
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

            {/* Total Geral do CPI Footer Row matching Print 01 & Print 02 */}
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

        {/* Action Button and Legal Notice footer matching Print 01 and PDF */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                className="bg-[#002D5A] hover:bg-[#001F3F] text-white font-bold text-xs sm:text-sm py-2.5 px-6 rounded-xl shadow-md transition-all active:scale-98 flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4 text-[#7EC2E8]" />
                <span>Salvar Tetos</span>
              </button>

              {isPortaria127 && (
                <button
                  type="button"
                  onClick={handleApplyOfficialAnexoI}
                  className="text-xs text-sky-700 hover:text-sky-900 font-semibold underline px-2 py-1 cursor-pointer"
                >
                  Restaurar valores oficiais do Anexo I
                </button>
              )}
            </div>

            <span className="text-xs sm:text-sm text-slate-500 font-medium">
              Valor unitário regulamentar por JOE: <strong className="text-slate-800 font-bold">{formatCurrencyBRL(unitPrice)}</strong>
            </span>
          </div>

          {/* Legal Notice Banner matching Print 01 & Official PDF */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 text-xs sm:text-[13px] leading-relaxed flex items-start gap-3">
            <Scale className="w-5 h-5 text-[#002D5A] shrink-0 mt-0.5" />
            <p>
              <strong className="text-slate-900">Base Legal & Responsabilidade:</strong> Portaria nº {ordinance.number || '127/2026 – GCG'} (Processo SEI {ordinance.seiProcess || '2026.190110.39762'} / Doc. SEI nº {ordinance.seiDocument || '017554882'}). Informações falsas ou indevidas sujeitam os agentes a sanções administrativas, disciplinares, civis e penais, além da restituição ao erário (Art. 16).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
