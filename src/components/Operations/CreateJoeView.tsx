import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  PlusCircle,
  Save,
  X,
  Building2,
  Calendar,
  Clock,
  Users,
  Calculator,
  ShieldAlert,
  Info,
  CheckCircle2,
  RefreshCw,
  Database,
  ArrowRight,
} from 'lucide-react';
import { CommandUnit, OrdinancePeriod, OperationLaunch, User } from '../../types';
import { formatCurrencyBRL, formatInteger } from '../../utils/formatters';
import {
  normalizeCommandName,
  sortCommandsByOfficialOrder,
} from '../../utils/commandUtils';

interface CreateJoeViewProps {
  commands: CommandUnit[];
  ordinance: OrdinancePeriod;
  currentUser: User;
  onSave: (
    operation: OperationLaunch
  ) => Promise<{ success: boolean; syncedWithCloud: boolean; dbError?: string; message?: string } | void> | void;
  onCancel: () => void;
  initialCommand?: string;
  operationToEdit?: OperationLaunch | null;
}

export function CreateJoeView({
  commands,
  ordinance,
  currentUser,
  onSave,
  onCancel,
  initialCommand,
  operationToEdit,
}: CreateJoeViewProps) {
  const [cpa, setCpa] = useState<string>(
    operationToEdit?.commandId || initialCommand || ''
  );
  const [unidade, setUnidade] = useState<string>(
    operationToEdit?.subUnit || ''
  );
  const [processoSei, setProcessoSei] = useState<string>(
    operationToEdit?.seiProcessNumber || '2026.190110.00000'
  );
  const [ordemServico, setOrdemServico] = useState<string>(
    operationToEdit?.orderNumber || ''
  );
  const [nomeEvento, setNomeEvento] = useState<string>(
    operationToEdit?.eventName || ''
  );
  const [dataEvento, setDataEvento] = useState<string>(
    operationToEdit?.serviceDate || new Date().toISOString().split('T')[0]
  );
  const [horario, setHorario] = useState<string>(
    operationToEdit?.startTime || '20h às 02h'
  );
  const [efetivo, setEfetivo] = useState<number | string>(
    operationToEdit?.officersCount || 5
  );
  const [valorUnitario, setValorUnitario] = useState<number | string>(
    operationToEdit?.unitValue || ordinance.unitValueJoe || 350
  );
  const [justificativa, setJustificativa] = useState<string>(
    operationToEdit?.justification || ''
  );
  const [autorizarExcedente, setAutorizarExcedente] = useState<boolean>(
    operationToEdit?.authorizeExcess || false
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
    details?: string;
  } | null>(null);

  // Available subunits based on selected CPA/I
  const selectedCommand = commands.find(
    (c) => normalizeCommandName(c.code) === normalizeCommandName(cpa) || normalizeCommandName(c.name) === normalizeCommandName(cpa) || normalizeCommandName(c.id) === normalizeCommandName(cpa)
  );
  const availableSubunits = selectedCommand ? selectedCommand.subunits : [];

  useEffect(() => {
    if (cpa && availableSubunits.length > 0 && !availableSubunits.includes(unidade)) {
      setUnidade(availableSubunits[0]);
    }
  }, [cpa]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpa) {
      alert('Por favor, selecione o CPA/I.');
      return;
    }
    if (!unidade) {
      alert('Por favor, selecione a Unidade Operacional.');
      return;
    }
    if (!nomeEvento.trim()) {
      alert('Por favor, informe o nome do evento / operação.');
      return;
    }

    const normCpa = normalizeCommandName(cpa);
    const numEfetivo = Math.max(1, Number(efetivo) || 1);
    const numValorUnit = Number(valorUnitario) > 0 ? Number(valorUnitario) : (ordinance.unitValueJoe || 350);
    const totalVal = numEfetivo * numValorUnit;

    const opData: OperationLaunch = {
      id: operationToEdit?.id || `op-${Date.now()}`,
      launchNumber: operationToEdit?.launchNumber || ordemServico || `${Math.floor(10000 + Math.random() * 90000)}`,
      commandId: normCpa,
      subUnit: unidade,
      ordinanceId: ordinance.id || 'ord-122-2026',
      seiProcessNumber: processoSei.trim() || '2026.190110.00000',
      orderNumber: ordemServico.trim() || `OS nº ${Math.floor(100 + Math.random() * 900)}/2026-${normCpa}`,
      eventName: nomeEvento.trim(),
      serviceDate: dataEvento || new Date().toISOString().split('T')[0],
      startTime: horario.trim() || '20h às 02h',
      officersCount: numEfetivo,
      joesPerOfficer: 1,
      unitValue: numValorUnit,
      totalValue: totalVal,
      status: operationToEdit?.status || 'APROVADO',
      serviceOrderLink: '',
      justification: justificativa.trim(),
      authorizeExcess: autorizarExcedente,
      createdBy: currentUser.name,
      createdAt: operationToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const result = await onSave(opData);

      // Check if explicitly marked as failed on database cloud sync
      if (result && typeof result === 'object' && result.syncedWithCloud === false) {
        setIsSubmitting(false);
        setStatusMessage({
          type: 'error',
          text: 'Erro ao salvar no banco de dados',
          details: result.dbError || 'O banco de dados não confirmou a persistência deste lançamento. Verifique a conexão com o Supabase.',
        });
        return;
      }

      // Confirmed saved to Database
      setStatusMessage({
        type: 'success',
        text: 'Salvo com sucesso no Banco de Dados!',
        details: `A solicitação de JOE para "${opData.eventName}" (R$ ${opData.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) foi gravada com sucesso no Supabase.`,
      });
      setIsSubmitting(false);
      
      // Auto-navigate back to list after 1.8 seconds if the user doesn't interact
      setTimeout(() => {
        // Only if still showing this success message
        setStatusMessage((curr) => {
          if (curr?.type === 'success') {
            onCancel();
          }
          return curr;
        });
      }, 2200);
    } catch (err: any) {
      setIsSubmitting(false);
      setStatusMessage({
        type: 'error',
        text: 'Erro ao salvar no banco de dados',
        details: err?.message || 'Falha ao estabelecer conexão com o banco de dados. Tente novamente.',
      });
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm max-w-5xl">
      <div className="flex items-center gap-3 pb-5 border-b border-slate-100 mb-6">
        <div className="p-2.5 rounded-xl bg-sky-50 text-[#002D5A] border border-[#7EC2E8]/40">
          <FileSpreadsheet className="w-5 h-5 text-[#002D5A]" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            {operationToEdit ? 'Editar Lançamento de JOE' : 'Formulário de Lançamento de JOE'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Portaria ativa: <strong className="text-slate-800">{ordinance.number}</strong> · Valor unitário: <strong className="text-[#002D5A]">{formatCurrencyBRL(ordinance.unitValueJoe)}</strong>
          </p>
        </div>
      </div>

      {/* Top Status Message if present */}
      {statusMessage && (
        <div
          className={`mb-6 p-4 sm:p-5 rounded-2xl border-2 transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-sm'
              : 'bg-rose-50 border-rose-500 text-rose-950 shadow-sm'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl text-white shrink-0 mt-0.5 ${
                statusMessage.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <ShieldAlert className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className={`text-base font-black ${statusMessage.type === 'success' ? 'text-emerald-900' : 'text-rose-900'}`}>
                  {statusMessage.text}
                </h4>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    statusMessage.type === 'success'
                      ? 'bg-emerald-200 text-emerald-900'
                      : 'bg-rose-200 text-rose-900'
                  }`}
                >
                  <Database className="w-3 h-3" />
                  {statusMessage.type === 'success' ? 'PERSISTÊNCIA SUPABASE OK' : 'ERRO NO BANCO'}
                </span>
              </div>
              {statusMessage.details && (
                <p className={`text-xs sm:text-sm mt-1.5 leading-relaxed ${statusMessage.type === 'success' ? 'text-emerald-800' : 'text-rose-800'}`}>
                  {statusMessage.details}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Row 1: CPA/I | Unidade | Processo SEI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#002D5A]" />
              <span>Comando (CPA/I) *</span>
            </label>
            <select
              value={cpa}
              onChange={(e) => setCpa(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all font-medium"
            >
              <option value="">Selecione o Comando...</option>
              {sortCommandsByOfficialOrder(commands, (c) => c.code).map((cmd) => {
                const norm = normalizeCommandName(cmd.code || cmd.id || cmd.name);
                return (
                  <option key={cmd.id || norm} value={norm}>
                    {norm}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#002D5A]" />
              <span>Unidade Operacional (BPM/CIA) *</span>
            </label>
            <select
              value={unidade}
              onChange={(e) => setUnidade(e.target.value)}
              disabled={!cpa}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all disabled:bg-slate-50 disabled:text-slate-400 font-medium"
            >
              <option value="">Selecione a Unidade...</option>
              {availableSubunits.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Número do Processo SEI
            </label>
            <input
              type="text"
              value={processoSei}
              onChange={(e) => setProcessoSei(e.target.value)}
              placeholder="2026.190110.00000"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all font-mono"
            />
          </div>
        </div>

        {/* Row 2: Ordem de serviço / operação | Nome do evento | Data */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Ordem de Serviço / Operação
            </label>
            <input
              type="text"
              value={ordemServico}
              onChange={(e) => setOrdemServico(e.target.value)}
              placeholder="Ex: OS nº 042/2026-CPI"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nome do Evento / Operação *
            </label>
            <input
              type="text"
              value={nomeEvento}
              onChange={(e) => setNomeEvento(e.target.value)}
              placeholder="Ex: Operação Impacto, Policiamento Carnaval"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#002D5A]" />
              <span>Data da Execução</span>
            </label>
            <input
              type="date"
              value={dataEvento}
              onChange={(e) => setDataEvento(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all font-medium"
            />
          </div>
        </div>

        {/* Row 3: Horário | Efetivo empregado (nº de JOEs) | Valor unitário (R$) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#002D5A]" />
              <span>Horário do Turno</span>
            </label>
            <input
              type="text"
              value={horario}
              onChange={(e) => setHorario(e.target.value)}
              placeholder="20h às 02h (6 horas)"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#002D5A]" />
              <span>Efetivo Empregado (JOEs) *</span>
            </label>
            <input
              type="number"
              min="1"
              max="500"
              value={efetivo}
              onChange={(e) => setEfetivo(e.target.value)}
              placeholder="5"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-[#002D5A]" />
              <span>Valor Unitário da Cota (R$)</span>
            </label>
            <input
              type="number"
              value={valorUnitario}
              onChange={(e) => setValorUnitario(e.target.value)}
              placeholder="350"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all font-mono font-bold"
            />
          </div>
        </div>

        {/* Accounting Calculation Callout */}
        <div className="p-4 bg-sky-50/70 border border-[#7EC2E8]/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-xs text-slate-700">
            <CheckCircle2 className="w-4.5 h-4.5 text-[#002D5A] shrink-0" />
            <span>
              Cálculo Contábil: <strong className="text-slate-900 font-mono text-sm">{formatInteger(Number(efetivo) || 0)} JOEs</strong> × <strong className="text-slate-900 font-mono text-sm">{formatCurrencyBRL(Number(valorUnitario) || 350)}</strong>
            </span>
          </div>
          <div className="text-sm sm:text-base font-extrabold text-[#002D5A] font-mono">
            Total Previsto: {formatCurrencyBRL((Number(efetivo) || 0) * (Number(valorUnitario) || 350))}
          </div>
        </div>

        {/* Row 4: Justificativa da criação da JOE */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Justificativa da Criação da JOE
          </label>
          <textarea
            rows={3}
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            placeholder="Descreva a necessidade operacional ou evento que motivou o emprego extraordinário de efetivo"
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all"
          />
        </div>

        {/* Row 6: Autorizar excedente checkbox */}
        <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
          <input
            type="checkbox"
            id="autorizarExcedente"
            checked={autorizarExcedente}
            onChange={(e) => setAutorizarExcedente(e.target.checked)}
            className="w-4 h-4 text-[#002D5A] rounded-md border-slate-300 focus:ring-[#7EC2E8] cursor-pointer"
          />
          <label
            htmlFor="autorizarExcedente"
            className="text-xs sm:text-sm font-medium text-slate-700 select-none cursor-pointer flex items-center gap-1.5"
          >
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Autorizar excedente ao teto previsto (art. 17, §3º — mediante remanejamento pelo Comando-Geral)</span>
          </label>
        </div>

        {/* Status Message: Conditionally rendered only after database response */}
        {statusMessage && (
          <div
            className={`p-4 sm:p-5 rounded-2xl border-2 transition-all ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50/90 border-emerald-500 text-emerald-950 shadow-xs'
                : 'bg-rose-50/90 border-rose-500 text-rose-950 shadow-xs'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl text-white shrink-0 mt-0.5 ${
                  statusMessage.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <ShieldAlert className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className={`text-base font-black ${statusMessage.type === 'success' ? 'text-emerald-900' : 'text-rose-900'}`}>
                    {statusMessage.text}
                  </h4>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                      statusMessage.type === 'success'
                        ? 'bg-emerald-200/80 text-emerald-800'
                        : 'bg-rose-200/80 text-rose-800'
                    }`}
                  >
                    <Database className="w-3 h-3" />
                    {statusMessage.type === 'success' ? 'PERSISTÊNCIA SUPABASE OK' : 'ERRO NO BANCO'}
                  </span>
                </div>
                {statusMessage.details && (
                  <p className={`text-xs sm:text-sm mt-1.5 leading-relaxed ${statusMessage.type === 'success' ? 'text-emerald-800' : 'text-rose-800 font-mono bg-white/70 p-2.5 rounded-lg border border-rose-200'}`}>
                    {statusMessage.details}
                  </p>
                )}

                {/* Quick actions on Success */}
                {statusMessage.type === 'success' && (
                  <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-emerald-200/70 flex-wrap">
                    <button
                      type="button"
                      onClick={onCancel}
                      className="px-3.5 py-1.5 rounded-xl bg-[#002D5A] hover:bg-[#001F3F] text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-[#7EC2E8]" />
                      <span>Ver Lista de Lançamentos</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNomeEvento('');
                        setJustificativa('');
                        setOrdemServico('');
                        setStatusMessage(null);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-emerald-100/50 text-emerald-900 border border-emerald-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Fazer Outro Lançamento</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons: Lançar JOE | Cancelar */}
        <div className="flex items-center gap-3 pt-5 border-t border-slate-100">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#002D5A] hover:bg-[#001F3F] text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Salvando no Banco de Dados...</span>
              </>
            ) : (
              <>
                {operationToEdit ? <Save className="w-4.5 h-4.5" /> : <PlusCircle className="w-4.5 h-4.5 text-[#7EC2E8]" />}
                <span>{operationToEdit ? 'Salvar Alterações' : 'Confirmar Lançamento de JOE'}</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-sm px-5 py-3 rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <X className="w-4.5 h-4.5 text-slate-400" />
            <span>Cancelar</span>
          </button>
        </div>
      </form>
    </div>
  );
}
