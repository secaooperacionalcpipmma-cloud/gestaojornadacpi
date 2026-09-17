import React from 'react';
import { Trash2, AlertTriangle, X, AlertCircle } from 'lucide-react';
import { formatCurrencyBRL, formatInteger, formatDateBRL } from '../../utils/formatters';
import { OperationLaunch } from '../../types';

export interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  mode: 'SINGLE' | 'BATCH';
  operation?: OperationLaunch | null;
  operations?: OperationLaunch[];
  isDeleting?: boolean;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  mode,
  operation,
  operations = [],
  isDeleting = false,
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  const isBatch = mode === 'BATCH';
  const count = isBatch ? operations.length : 1;
  const totalOfficers = isBatch
    ? operations.reduce((sum, o) => sum + (o.officersCount || 0), 0)
    : (operation?.officersCount || 0);
  const totalValue = isBatch
    ? operations.reduce((sum, o) => sum + (o.totalValue || 0), 0)
    : (operation?.totalValue || 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-fadeIn"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="bg-rose-50 border-b border-rose-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isBatch
                  ? `Excluir ${count} Lançamentos Selecionados`
                  : 'Confirmar Exclusão de Lançamento'}
              </h3>
              <p className="text-xs text-rose-700 font-medium">
                Esta ação removerá o registro imediatamente do banco de dados
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            {isBatch ? (
              <>
                Você tem certeza de que deseja excluir <strong>{count} lançamentos</strong> selecionados?
                Os valores e efetivos de JOE serão estornados imediatamente das cotas da unidade e do banco de dados.
              </>
            ) : (
              <>
                Você tem certeza de que deseja excluir permanentemente o lançamento abaixo?
              </>
            )}
          </p>

          {/* Details Card */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/90 text-xs space-y-2.5">
            {!isBatch && operation ? (
              <>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Comando / Unidade:</span>
                  <span className="font-bold text-slate-900">
                    {operation.commandId} {operation.subUnit ? `· ${operation.subUnit}` : ''}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Evento / Operação:</span>
                  <span className="font-bold text-slate-900 text-right max-w-[240px] truncate" title={operation.eventName}>
                    {operation.eventName}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Data do Serviço:</span>
                  <span className="font-bold text-slate-800">
                    {formatDateBRL(operation.serviceDate)}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Efetivo Solicitado:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {formatInteger(operation.officersCount)} JOEs
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-700 font-semibold">Valor Total a Estornar:</span>
                  <span className="font-extrabold text-rose-700 font-mono text-sm">
                    {formatCurrencyBRL(operation.totalValue)}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Quantidade de Registros:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {count} lançamento(s)
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Total de Efetivo (JOEs):</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {formatInteger(totalOfficers)} JOEs
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-700 font-semibold">Valor Total a Estornar:</span>
                  <span className="font-extrabold text-rose-700 font-mono text-sm">
                    {formatCurrencyBRL(totalValue)}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Atenção:</strong> A exclusão é imediata e atualizará o saldo orçamentário e as cotas correspondentes.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-all cursor-pointer shadow-xs"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 transition-all cursor-pointer shadow-sm hover:shadow active:scale-95 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>
              {isDeleting
                ? 'Excluindo...'
                : isBatch
                ? `Sim, Excluir ${count} Registro(s)`
                : 'Sim, Excluir Imediatamente'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
