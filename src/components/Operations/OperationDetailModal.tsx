import React, { useState } from 'react';
import {
  X,
  Shield,
  FileText,
  Calendar,
  Clock,
  MapPin,
  Users,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Printer,
  Send,
  MessageSquare,
  FileCheck,
} from 'lucide-react';
import { OperationLaunch, OrdinancePeriod, User, OperationStatus } from '../../types';
import { pdfService } from '../../services/pdfService';

interface OperationDetailModalProps {
  operation: OperationLaunch | null;
  ordinance: OrdinancePeriod;
  currentUser: User;
  onClose: () => void;
  onStatusChange: (opId: string, status: OperationStatus, notes?: string, feedback?: string) => void;
  onGenerateRene: (op: OperationLaunch) => void;
}

export const OperationDetailModal: React.FC<OperationDetailModalProps> = ({
  operation,
  ordinance,
  currentUser,
  onClose,
  onStatusChange,
  onGenerateRene,
}) => {
  if (!operation) return null;

  const [feedback, setFeedback] = useState('');
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [checklist, setChecklist] = useState(operation.checklist);

  const isCpiGestor = currentUser.role === 'CPI_GESTOR' || currentUser.role === 'ADMIN';

  const handleToggleChecklist = (key: keyof typeof checklist) => {
    if (!isCpiGestor) return;
    setChecklist({ ...checklist, [key]: !checklist[key] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-[#00204A] px-6 py-4 border-b border-[#00204A] flex items-center justify-between text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-[#FFD700]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black text-white">{operation.launchNumber}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-[#FFD700] border border-white/20">
                  {operation.commandId} • {operation.subUnit}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                {operation.eventName} • Processo SEI: {operation.seiProcessNumber}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6 text-slate-800">
          {/* Status & Quick Info */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Situação do Lançamento
              </span>
              <div className="text-sm font-black text-[#00204A] mt-0.5 flex items-center space-x-2">
                <span>{operation.status.replace(/_/g, ' ')}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Valor Total Financeiro
              </span>
              <div className="text-lg font-black text-[#00204A] font-mono mt-0.5">
                R$ {operation.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Feedback from CPI if returned */}
          {operation.correctionFeedback && (
            <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl text-xs text-amber-900">
              <div className="font-bold flex items-center space-x-1.5 text-amber-800 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>Parecer / Motivo da Devolução pelo CPI:</span>
              </div>
              <p>{operation.correctionFeedback}</p>
            </div>
          )}

          {/* Operational Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-[#00204A] uppercase text-[10px] tracking-wider">
                Dados Operacionais
              </div>
              <div>
                <span className="text-slate-500">Ordem de Serviço:</span>{' '}
                <span className="font-semibold text-slate-900 font-mono">
                  {operation.orderType === 'ORDEM_DE_OPERACAO' ? 'OO' : 'OS'} {operation.orderNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Data do Serviço:</span>{' '}
                <span className="font-semibold text-slate-900">
                  {new Date(operation.serviceDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Horário e Duração:</span>{' '}
                <span className="font-semibold text-slate-900">
                  {operation.startTime} às {operation.endTime} ({operation.calculatedDurationHours}h contínuas)
                </span>
              </div>
              <div>
                <span className="text-slate-500">Local:</span>{' '}
                <span className="font-semibold text-slate-900">{operation.location}</span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-[#00204A] uppercase text-[10px] tracking-wider">
                Efetivo e Parâmetros
              </div>
              <div>
                <span className="text-slate-500">Efetivo Empregado:</span>{' '}
                <span className="font-semibold text-slate-900">{operation.officersCount} Policiais Militares</span>
              </div>
              <div>
                <span className="text-slate-500">Valor Unitário da JOE:</span>{' '}
                <span className="font-semibold text-slate-900 font-mono">R$ {operation.unitValue.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-500">Lançado por:</span>{' '}
                <span className="font-semibold text-slate-900">{operation.createdBy}</span>
              </div>
              <div>
                <span className="text-slate-500">Registro no Sistema:</span>{' '}
                <span className="font-semibold text-slate-900">
                  {new Date(operation.createdAt).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          </div>

          {/* Justification Box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-800 block mb-1">
              Justificativa Operacional Fundamentada (Art. 4º):
            </span>
            <p className="text-slate-600 leading-relaxed">{operation.justification}</p>
          </div>

          {/* Nominal Officers Roster Table */}
          {operation.officers.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800">
                  Escala Nominal Comprovada ({operation.officers.length} Policiais)
                </span>
                <span className="text-[10px] text-slate-500">Relação SEI Art. 6º</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Posto/Grad</th>
                      <th className="py-2.5 px-3">Nome Completo</th>
                      <th className="py-2.5 px-3">Matrícula</th>
                      <th className="py-2.5 px-3">Função</th>
                      <th className="py-2.5 px-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {operation.officers.map((off) => (
                      <tr key={off.officerId}>
                        <td className="py-2.5 px-3 font-bold text-[#00204A]">{off.rank}</td>
                        <td className="py-2.5 px-3 text-slate-800 font-medium">{off.officerName}</td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{off.registration}</td>
                        <td className="py-2.5 px-3 text-slate-600">{off.roleInMission}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-[#00204A] font-bold">
                          R$ {off.value.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SEI Documental Checklist (Art. 1º, 4º, 6º, 9º, 10, 11) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-[#00204A]" />
                <span className="text-xs font-bold text-[#00204A] uppercase tracking-wider">
                  Checklist de Fiscalização & Rito SEI (Art. 13, III e IV)
                </span>
              </div>
              <span className="text-[10px] text-slate-500">Auditoria Obrigatória CPI</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { key: 'operationalJustification', label: 'Justificativa Operacional nos Autos' },
                { key: 'serviceOrOperationOrder', label: 'Ordem de Serviço (OS) ou OO Juntada' },
                { key: 'budgetCompatibilityDeclaration', label: 'Compatibilidade com Cota Orçamentária' },
                { key: 'cpiPriorAuthorization', label: 'Autorização Prévia do Cmt CPI (Art. 13, I)' },
                { key: 'priorNominalRoster', label: 'Escala Extraordinária Prévia no SEI' },
                { key: 'commanderDutyFreeDeclaration', label: 'Declaração de Folga Regulamentar' },
                { key: 'presenceControlVerified', label: 'Controle de Presença e CIOPS Checado' },
                { key: 'reneReportAttached', label: 'RENE Assinado pelo Cmt da UPM e P/1' },
              ].map((item) => {
                const isChecked = checklist[item.key as keyof typeof checklist];
                return (
                  <div
                    key={item.key}
                    onClick={() => handleToggleChecklist(item.key as any)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                      isCpiGestor ? 'cursor-pointer' : ''
                    } ${
                      isChecked
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className="truncate mr-2 font-medium">{item.label}</span>
                    {isChecked ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onGenerateRene(operation)}
              className="flex items-center space-x-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              <Printer className="w-3.5 h-3.5 text-[#00204A]" />
              <span>Gerar RENE (Art. 10)</span>
            </button>
          </div>

          {/* CPI Decisions */}
          {isCpiGestor && (
            <div className="flex flex-wrap items-center gap-2">
              {['PENDENTE_ANALISE', 'EM_ANALISE', 'RASCUNHO', 'DEVOLVIDO_CORRECAO'].includes(
                operation.status
              ) && (
                <>
                  <button
                    onClick={() => setShowFeedbackInput(!showFeedbackInput)}
                    className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors"
                  >
                    Devolver p/ Correção
                  </button>

                  <button
                    onClick={() => {
                      onStatusChange(operation.id, 'REJEITADO', 'Rejeitado na análise prévia do CPI');
                      onClose();
                    }}
                    className="bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors"
                  >
                    Rejeitar
                  </button>

                  <button
                    onClick={() => {
                      onStatusChange(operation.id, 'APROVADO', 'Autorização prévia deferida pelo CPI (Art. 13, I)');
                      onClose();
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-xs transition-all"
                  >
                    ✓ Aprovar JOE
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Feedback Input Prompt */}
        {showFeedbackInput && (
          <div className="p-4 bg-amber-50 border-t border-amber-200 space-y-2">
            <label className="block text-xs font-bold text-amber-900">
              Descreva as correções necessárias para a UPM:
            </label>
            <textarea
              rows={2}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Ex: Falta anexar declaração de folga ou retificar horário da OS..."
              className="w-full bg-white border border-amber-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-[#00204A]"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowFeedbackInput(false)}
                className="text-xs text-slate-600 px-2 py-1"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onStatusChange(operation.id, 'DEVOLVIDO_CORRECAO', undefined, feedback);
                  setShowFeedbackInput(false);
                  onClose();
                }}
                className="bg-[#00204A] text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs"
              >
                Confirmar Devolução
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
