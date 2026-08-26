import React, { useState, useMemo } from 'react';
import {
  Send,
  Calendar,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Shield,
  Layers,
  Clock,
  Printer,
  ChevronRight,
  Sparkles,
  FileText,
} from 'lucide-react';
import {
  WeeklyBatchConsolidation,
  OperationLaunch,
  OrdinancePeriod,
  User,
} from '../../types';
import { pdfService } from '../../services/pdfService';
import { excelService } from '../../services/excelService';

interface WeeklyConsolidationProps {
  batches: WeeklyBatchConsolidation[];
  operations: OperationLaunch[];
  ordinance: OrdinancePeriod;
  currentUser: User;
  onCreateBatch: (batchData: Omit<WeeklyBatchConsolidation, 'id' | 'createdAt'>) => void;
}

export const WeeklyConsolidation: React.FC<WeeklyConsolidationProps> = ({
  batches,
  operations,
  ordinance,
  currentUser,
  onCreateBatch,
}) => {
  const [selectedWeekStart, setSelectedWeekStart] = useState('2026-08-20');
  const [selectedWeekEnd, setSelectedWeekEnd] = useState('2026-08-24');
  const [seiDispatch, setSeiDispatch] = useState('DESPACHO-CPI-0198550/2026');

  // Operations eligible for consolidation: APROVADO, EXECUTADO, AGUARDANDO_CONFERENCIA
  const eligibleOperations = useMemo(() => {
    return operations.filter(
      (op) =>
        op.ordinanceId === ordinance.id &&
        ['APROVADO', 'EXECUTADO', 'AGUARDANDO_CONFERENCIA'].includes(op.status) &&
        !op.batchConsolidationId
    );
  }, [operations, ordinance.id]);

  // Group by CPA/I
  const cpaBreakdown = useMemo(() => {
    const map: Record<
      string,
      { commandId: string; operationsCount: number; officersCount: number; joesCount: number; amount: number }
    > = {};

    eligibleOperations.forEach((op) => {
      if (!map[op.commandId]) {
        map[op.commandId] = {
          commandId: op.commandId,
          operationsCount: 0,
          officersCount: 0,
          joesCount: 0,
          amount: 0,
        };
      }
      map[op.commandId].operationsCount += 1;
      map[op.commandId].officersCount += op.officersCount;
      map[op.commandId].joesCount += op.officersCount * op.joesPerOfficer;
      map[op.commandId].amount += op.totalValue;
    });

    return Object.values(map);
  }, [eligibleOperations]);

  const totalOps = eligibleOperations.length;
  const totalOfficers = eligibleOperations.reduce((s, o) => s + o.officersCount, 0);
  const totalJoes = eligibleOperations.reduce((s, o) => s + o.officersCount * o.joesPerOfficer, 0);
  const totalAmount = eligibleOperations.reduce((s, o) => s + o.totalValue, 0);

  const handleGenerateBatch = () => {
    if (eligibleOperations.length === 0) {
      alert('Não há operações aprovadas pendentes de consolidação para gerar o lote.');
      return;
    }

    const batchNumber = `LOTE-SEM-${Math.floor(30 + Math.random() * 20)}/2026-CPI`;

    const newBatch: Omit<WeeklyBatchConsolidation, 'id' | 'createdAt'> = {
      batchNumber,
      weekStartDate: selectedWeekStart,
      weekEndDate: selectedWeekEnd,
      consolidationDate: new Date().toISOString().split('T')[0],
      ordinanceId: ordinance.id,
      seiProcess: ordinance.seiProcess,
      seiDispatchNumber: seiDispatch,
      responsibleUser: currentUser.name,
      status: 'ENCAMINHADO_PAGADORIA',
      totalOperationsCount: totalOps,
      totalOfficersCount: totalOfficers,
      totalJoesCount: totalJoes,
      totalFinancialAmount: totalAmount,
      cpaBreakdown,
      operationsIds: eligibleOperations.map((o) => o.id),
    };

    onCreateBatch(newBatch);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-black text-[#00204A] tracking-tight">
              Consolidação Semanal & Encaminhamento à Pagadoria-DGP
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              Art. 13, Inciso V
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Fechamento semanal obrigatório de <strong>terça-feira</strong> em processo único e planilha consolidada para liquidação financeira.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleGenerateBatch}
            disabled={eligibleOperations.length === 0}
            className="flex items-center space-x-1.5 bg-[#00204A] hover:bg-[#002e6b] text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-xs transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4 text-[#FFD700]" />
            <span>Fechar Lote & Enviar à DGP</span>
          </button>
        </div>
      </div>

      {/* Preparation Box for the current week */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-[#00204A]" />
            <h3 className="text-sm font-bold text-[#00204A] uppercase tracking-wider">
              Lote em Preparação para a Terça-Feira
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Processo SEI: {ordinance.seiProcess}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Início da Semana Operacional:</label>
            <input
              type="date"
              value={selectedWeekStart}
              onChange={(e) => setSelectedWeekStart(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-hidden focus:border-[#00204A]"
            />
          </div>
          <div>
            <label className="block text-slate-700 font-bold mb-1">Término da Semana:</label>
            <input
              type="date"
              value={selectedWeekEnd}
              onChange={(e) => setSelectedWeekEnd(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-hidden focus:border-[#00204A]"
            />
          </div>
          <div>
            <label className="block text-slate-700 font-bold mb-1">Nº do Despacho SEI de Encaminhamento:</label>
            <input
              type="text"
              value={seiDispatch}
              onChange={(e) => setSeiDispatch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-hidden focus:border-[#00204A]"
            />
          </div>
        </div>

        {/* Summary of Eligible Operations */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
          <div>
            <div className="text-xs text-slate-500 uppercase font-bold">Missões Aprovadas</div>
            <div className="text-xl font-black text-[#00204A] mt-0.5">{totalOps}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase font-bold">Efetivo a Pagar</div>
            <div className="text-xl font-black text-blue-700 mt-0.5">{totalOfficers} PMs</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase font-bold">Total de JOEs</div>
            <div className="text-xl font-black text-[#00204A] mt-0.5">{totalJoes}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase font-bold">Valor Total a Liquidar</div>
            <div className="text-xl font-black text-emerald-700 font-mono mt-0.5">
              R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Breakdown table per CPA */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 border-b border-slate-200">
            Resumo Consolidado por Comando de Área (CPA/I)
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-white text-slate-500 text-[10px] uppercase border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Comando</th>
                <th className="py-2.5 px-3 text-center">Missões</th>
                <th className="py-2.5 px-3 text-center">Efetivo</th>
                <th className="py-2.5 px-3 text-center">Qtd. JOEs</th>
                <th className="py-2.5 px-3 text-right">Valor Total (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {cpaBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-500">
                    Nenhuma operação aprovada aguardando fechamento semanal.
                  </td>
                </tr>
              ) : (
                cpaBreakdown.map((item) => (
                  <tr key={item.commandId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-[#00204A]">{item.commandId}</td>
                    <td className="py-2.5 px-3 text-center text-slate-700">{item.operationsCount}</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-800">{item.officersCount} PMs</td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800">{item.joesCount}</td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-700 font-mono">
                      R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* History of Weekly Batches */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-[#00204A] uppercase tracking-wider">
          Histórico de Lotes Encaminhados à Pagadoria-DGP
        </h3>

        <div className="space-y-3">
          {batches.map((batch) => (
            <div
              key={batch.id}
              className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-black text-sm text-[#00204A]">{batch.batchNumber}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {batch.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Fechamento: {new Date(batch.consolidationDate).toLocaleDateString('pt-BR')} • Responsável:{' '}
                  {batch.responsibleUser}
                </p>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Despacho: {batch.seiDispatchNumber} • SEI: {batch.seiProcess}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm font-black text-emerald-700 font-mono">
                    R$ {batch.totalFinancialAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {batch.totalJoesCount} JOEs • {batch.totalOfficersCount} PMs
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() =>
                      pdfService.generateWeeklyConsolidationPDF(
                        batch,
                        operations.filter((o) => batch.operationsIds.includes(o.id)),
                        ordinance
                      )
                    }
                    className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition-colors"
                    title="Baixar PDF Oficial de Encaminhamento"
                  >
                    <Download className="w-4 h-4 text-[#00204A]" />
                  </button>

                  <button
                    onClick={() =>
                      excelService.exportConsolidationToExcel(
                        batch.batchNumber,
                        batch.cpaBreakdown,
                        operations.filter((o) => batch.operationsIds.includes(o.id))
                      )
                    }
                    className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold shadow-xs transition-colors"
                    title="Exportar Planilha Excel DGP"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
