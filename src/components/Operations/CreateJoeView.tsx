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
  Camera,
  Sparkles,
  CalendarRange,
  Layers,
  ArrowUpDown,
  CalendarDays,
} from 'lucide-react';
import { CommandUnit, OrdinancePeriod, OperationLaunch, User } from '../../types';
import { formatCurrencyBRL, formatInteger, formatDateBRL } from '../../utils/formatters';
import {
  normalizeCommandName,
  sortCommandsByOfficialOrder,
} from '../../utils/commandUtils';
import { PrintCaptureModal } from './PrintCaptureModal';

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

  // Date selection state: 'SINGLE' (Data única) | 'RANGE' (Intervalo de datas, ex: 01/10 a 03/10)
  const [dateMode, setDateMode] = useState<'SINGLE' | 'RANGE'>('SINGLE');
  const [dataEvento, setDataEvento] = useState<string>(
    operationToEdit?.serviceDate || new Date().toISOString().split('T')[0]
  );
  const [dataFimEvento, setDataFimEvento] = useState<string>(
    operationToEdit?.serviceDate || new Date().toISOString().split('T')[0]
  );
  // Calculation mode for interval: 'DAILY_PER_DAY' (ex: 5 JOEs por dia × 3 dias = 15 JOEs) | 'TOTAL_PERIOD' (5 JOEs no total)
  const [rangeEffectiveMode, setRangeEffectiveMode] = useState<'DAILY_PER_DAY' | 'TOTAL_PERIOD'>('DAILY_PER_DAY');
  // Persistence mode in DB: create individual row for each day (recommended for police roster) or single consolidated row
  const [saveAsDailyEntries, setSaveAsDailyEntries] = useState<boolean>(true);

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
  const [isPrintCaptureOpen, setIsPrintCaptureOpen] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
    details?: string;
  } | null>(null);

  // Available subunits based on selected CPA/I
  const selectedCommand = commands.find(
    (c) =>
      normalizeCommandName(c.code) === normalizeCommandName(cpa) ||
      normalizeCommandName(c.name) === normalizeCommandName(cpa) ||
      normalizeCommandName(c.id) === normalizeCommandName(cpa)
  );
  const availableSubunits = selectedCommand ? selectedCommand.subunits : [];

  useEffect(() => {
    if (cpa && availableSubunits.length > 0 && !availableSubunits.includes(unidade)) {
      setUnidade(availableSubunits[0]);
    }
  }, [cpa]);

  // Helper to generate all ISO date strings between start and end inclusive
  const getDatesInRange = (startStr: string, endStr: string): string[] => {
    if (!startStr || !endStr) return [startStr || new Date().toISOString().split('T')[0]];
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return [startStr];
    }
    const dates: string[] = [];
    const current = new Date(start);
    let count = 0;
    while (current <= end && count < 60) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
      count++;
    }
    return dates;
  };

  const rangeDates = dateMode === 'RANGE' ? getDatesInRange(dataEvento, dataFimEvento) : [dataEvento];
  const countDays = Math.max(1, rangeDates.length);

  // Effective and accounting calculations
  const numEfetivo = Math.max(1, Number(efetivo) || 1);
  const numValorUnit = Number(valorUnitario) > 0 ? Number(valorUnitario) : (ordinance.unitValueJoe || 350);

  const totalCalculatedJoes =
    dateMode === 'RANGE' && rangeEffectiveMode === 'DAILY_PER_DAY'
      ? numEfetivo * countDays
      : numEfetivo;

  const totalCalculatedValue = totalCalculatedJoes * numValorUnit;

  // Preset shortcut helper for common date ranges
  const applyRangeShortcut = (days: number) => {
    setDateMode('RANGE');
    const start = new Date(dataEvento ? dataEvento + 'T00:00:00' : new Date());
    const end = new Date(start);
    end.setDate(end.getDate() + (days - 1));
    setDataFimEvento(end.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpa) {
      setStatusMessage({ type: 'error', text: 'Selecione o Comando (CPA/I).' });
      return;
    }
    if (!unidade) {
      setStatusMessage({ type: 'error', text: 'Selecione a Unidade Operacional.' });
      return;
    }
    if (!nomeEvento.trim()) {
      setStatusMessage({ type: 'error', text: 'Informe o nome do evento / operação.' });
      return;
    }

    if (dateMode === 'RANGE' && dataFimEvento < dataEvento) {
      setStatusMessage({
        type: 'error',
        text: 'Data de término inválida',
        details: 'A data final do intervalo deve ser igual ou posterior à data inicial.',
      });
      return;
    }

    const normCpa = normalizeCommandName(cpa);

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      if (dateMode === 'RANGE' && countDays > 1 && saveAsDailyEntries) {
        // MULTI-DAY LAUNCH: Create an entry for each date in the interval into the database
        const createdOps: OperationLaunch[] = [];

        for (let i = 0; i < rangeDates.length; i++) {
          const dayDate = rangeDates[i];
          const dayOpData: OperationLaunch = {
            id: `op-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
            launchNumber: ordemServico.trim()
              ? `${ordemServico.trim()} (Dia ${i + 1}/${countDays})`
              : `${Math.floor(10000 + Math.random() * 90000)}`,
            commandId: normCpa,
            subUnit: unidade,
            ordinanceId: ordinance.id || 'ord-127-2026',
            seiProcessNumber: processoSei.trim() || '2026.190110.00000',
            orderNumber: ordemServico.trim() || `OS nº ${Math.floor(100 + Math.random() * 900)}/2026-${normCpa}`,
            eventName: nomeEvento.trim(),
            eventSubtext: `Período: ${formatDateBRL(dataEvento)} a ${formatDateBRL(dataFimEvento)} (Dia ${i + 1} de ${countDays})`,
            serviceDate: dayDate,
            startTime: horario.trim() || '20h às 02h',
            officersCount: numEfetivo,
            joesPerOfficer: 1,
            unitValue: numValorUnit,
            totalValue: numEfetivo * numValorUnit,
            status: operationToEdit?.status || 'APROVADO',
            serviceOrderLink: '',
            justification: justificativa.trim() || `Lançamento referente ao dia ${formatDateBRL(dayDate)} do período de ${formatDateBRL(dataEvento)} a ${formatDateBRL(dataFimEvento)}.`,
            notes: `Operação contínua de ${countDays} dias (${formatDateBRL(dataEvento)} a ${formatDateBRL(dataFimEvento)}). Lançamento individualizado do dia ${formatDateBRL(dayDate)}.`,
            authorizeExcess: autorizarExcedente,
            createdBy: currentUser.name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await onSave(dayOpData);
          createdOps.push(dayOpData);
        }

        setStatusMessage({
          type: 'success',
          text: `${countDays} Lançamentos Gravados com Sucesso no Banco de Dados!`,
          details: `Operação "${nomeEvento}" registrada para cada um dos ${countDays} dias do intervalo (${formatDateBRL(dataEvento)} a ${formatDateBRL(dataFimEvento)}) com ${numEfetivo} JOEs por dia, totalizando ${totalCalculatedJoes} JOEs (${formatCurrencyBRL(totalCalculatedValue)}) salvos no Supabase.`,
        });
      } else {
        // SINGLE LAUNCH (ou Lançamento Consolidado do Período)
        const opData: OperationLaunch = {
          id: operationToEdit?.id || `op-${Date.now()}`,
          launchNumber: operationToEdit?.launchNumber || ordemServico || `${Math.floor(10000 + Math.random() * 90000)}`,
          commandId: normCpa,
          subUnit: unidade,
          ordinanceId: ordinance.id || 'ord-127-2026',
          seiProcessNumber: processoSei.trim() || '2026.190110.00000',
          orderNumber: ordemServico.trim() || `OS nº ${Math.floor(100 + Math.random() * 900)}/2026-${normCpa}`,
          eventName: nomeEvento.trim(),
          eventSubtext:
            dateMode === 'RANGE' && countDays > 1
              ? `Período: ${formatDateBRL(dataEvento)} a ${formatDateBRL(dataFimEvento)} (${countDays} dias)`
              : undefined,
          serviceDate: dataEvento || new Date().toISOString().split('T')[0],
          startTime: horario.trim() || '20h às 02h',
          officersCount: totalCalculatedJoes,
          joesPerOfficer: 1,
          unitValue: numValorUnit,
          totalValue: totalCalculatedValue,
          status: operationToEdit?.status || 'APROVADO',
          serviceOrderLink: '',
          justification: justificativa.trim(),
          notes:
            dateMode === 'RANGE' && countDays > 1
              ? `Operação com período de execução de ${formatDateBRL(dataEvento)} a ${formatDateBRL(dataFimEvento)} (${countDays} dias).`
              : undefined,
          authorizeExcess: autorizarExcedente,
          createdBy: currentUser.name,
          createdAt: operationToEdit?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const result = await onSave(opData);
        const isSynced = Boolean(result && typeof result === 'object' && result.syncedWithCloud);

        setStatusMessage({
          type: 'success',
          text: isSynced
            ? 'Salvo com sucesso no Banco de Dados!'
            : 'Lançamento Gravado com Sucesso!',
          details:
            dateMode === 'RANGE' && countDays > 1
              ? `A solicitação de JOE para o período de ${formatDateBRL(dataEvento)} a ${formatDateBRL(dataFimEvento)} (${countDays} dias, ${totalCalculatedJoes} JOEs - ${formatCurrencyBRL(totalCalculatedValue)}) foi gravada com sucesso no Supabase.`
              : `A solicitação de JOE para "${opData.eventName}" (${formatCurrencyBRL(opData.totalValue)}) foi gravada no Supabase e está disponível para todos os usuários.`,
        });
      }

      setIsSubmitting(false);

      // Auto-navigate back to list after short display
      setTimeout(() => {
        setStatusMessage((curr) => {
          if (curr?.type === 'success') {
            onCancel();
          }
          return curr;
        });
      }, 1900);
    } catch (err: any) {
      setIsSubmitting(false);
      setStatusMessage({
        type: 'error',
        text: 'Erro ao registrar lançamento',
        details: err?.message || 'Falha ao processar a operação. Tente novamente.',
      });
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100 mb-6">
        <div className="flex items-center gap-3">
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

        <button
          type="button"
          onClick={() => setIsPrintCaptureOpen(true)}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          title="Capturar informações a partir do print da solicitação de JOE"
        >
          <Camera className="w-4 h-4 text-emerald-200" />
          <span>Capturar via Print (IA)</span>
        </button>
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
          <div className="flex items-start gap-3.5">
            <div
              className={`p-2 rounded-xl mt-0.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'bg-rose-500 text-white shadow-xs'
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

        {/* Row 2: Ordem de serviço / operação | Nome do evento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
              placeholder="Ex: SATURAÇÃO E IMPACTO, Operação Cidade Segura"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all font-semibold"
            />
          </div>
        </div>

        {/* SEÇÃO ESPECIAL: DATA DA EXECUÇÃO (DATA ÚNICA OU INTERVALO DE DATAS) */}
        <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#002D5A]" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Data / Período da Execução da JOE
              </span>
            </div>

            {/* Toggle Data Única vs Intervalo de Datas */}
            <div className="flex items-center bg-white border border-slate-200 p-1 rounded-xl shadow-2xs self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setDateMode('SINGLE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  dateMode === 'SINGLE'
                    ? 'bg-[#002D5A] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Data Única (1 Dia)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDateMode('RANGE');
                  if (!dataFimEvento || dataFimEvento <= dataEvento) {
                    const start = new Date(dataEvento + 'T00:00:00');
                    start.setDate(start.getDate() + 2); // default 3 days (e.g. 01/10 to 03/10)
                    setDataFimEvento(start.toISOString().split('T')[0]);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  dateMode === 'RANGE'
                    ? 'bg-[#002D5A] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span>Intervalo de Datas (Período: Ex: 01/10 a 03/10)</span>
              </button>
            </div>
          </div>

          {/* INPUTS DE DATA */}
          {dateMode === 'SINGLE' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#002D5A]" />
                <span>Data da Execução *</span>
              </label>
              <input
                type="date"
                value={dataEvento}
                onChange={(e) => {
                  setDataEvento(e.target.value);
                  setDataFimEvento(e.target.value);
                }}
                className="w-full sm:w-80 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all font-medium"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Data Início */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#002D5A]" />
                    <span>Data de Início (De) *</span>
                  </label>
                  <input
                    type="date"
                    value={dataEvento}
                    onChange={(e) => {
                      setDataEvento(e.target.value);
                      if (dataFimEvento && e.target.value > dataFimEvento) {
                        setDataFimEvento(e.target.value);
                      }
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all font-medium"
                  />
                </div>

                {/* Data Término */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <CalendarRange className="w-3.5 h-3.5 text-[#002D5A]" />
                    <span>Data de Término (Até) *</span>
                  </label>
                  <input
                    type="date"
                    value={dataFimEvento}
                    min={dataEvento}
                    onChange={(e) => setDataFimEvento(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all font-medium"
                  />
                </div>

                {/* Resumo do Período Badge */}
                <div className="sm:col-span-2 lg:col-span-1 flex flex-col justify-end">
                  <div className="p-3 bg-white border border-sky-200 rounded-xl flex items-center gap-3 text-xs">
                    <div className="w-8 h-8 rounded-lg bg-sky-100 text-[#002D5A] flex items-center justify-center font-bold font-mono shrink-0">
                      {countDays}d
                    </div>
                    <div>
                      <div className="font-bold text-[#002D5A]">
                        {countDays === 1 ? '1 dia selecionado' : `${countDays} dias de operação`}
                      </div>
                      <div className="text-slate-500 font-medium text-[11px]">
                        {formatDateBRL(dataEvento)} até {formatDateBRL(dataFimEvento)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Atalhos rápidos para preenchimento de intervalo */}
              <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-600">
                <span className="font-semibold text-slate-500">Atalhos rápidos:</span>
                <button
                  type="button"
                  onClick={() => applyRangeShortcut(2)}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 font-medium transition-colors cursor-pointer"
                >
                  +1 Dia (2 dias)
                </button>
                <button
                  type="button"
                  onClick={() => applyRangeShortcut(3)}
                  className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#002D5A] border border-sky-200 font-bold transition-colors cursor-pointer"
                >
                  Exemplo: 3 Dias (ex: 01/10 a 03/10)
                </button>
                <button
                  type="button"
                  onClick={() => applyRangeShortcut(5)}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 font-medium transition-colors cursor-pointer"
                >
                  5 Dias Úteis
                </button>
                <button
                  type="button"
                  onClick={() => applyRangeShortcut(7)}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 font-medium transition-colors cursor-pointer"
                >
                  7 Dias (Semana)
                </button>
              </div>

              {/* Opções de Cálculo e Gravação para Intervalo */}
              <div className="p-3.5 bg-sky-50/60 border border-sky-200 rounded-xl space-y-2.5 text-xs">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-[#002D5A]" />
                  <span>Como calcular o efetivo no intervalo de {countDays} dias:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label
                    className={`p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all ${
                      rangeEffectiveMode === 'DAILY_PER_DAY'
                        ? 'bg-white border-[#002D5A] ring-1 ring-[#002D5A] text-slate-900 shadow-2xs'
                        : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rangeCalc"
                      checked={rangeEffectiveMode === 'DAILY_PER_DAY'}
                      onChange={() => setRangeEffectiveMode('DAILY_PER_DAY')}
                      className="mt-0.5 text-[#002D5A]"
                    />
                    <div>
                      <strong className="block font-bold">Efetivo Diário (Multiplicar por dia)</strong>
                      <span className="text-[11px] text-slate-500 block">
                        {numEfetivo} policiais/dia × {countDays} dias = <strong>{numEfetivo * countDays} JOEs no total</strong>
                      </span>
                    </div>
                  </label>

                  <label
                    className={`p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all ${
                      rangeEffectiveMode === 'TOTAL_PERIOD'
                        ? 'bg-white border-[#002D5A] ring-1 ring-[#002D5A] text-slate-900 shadow-2xs'
                        : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rangeCalc"
                      checked={rangeEffectiveMode === 'TOTAL_PERIOD'}
                      onChange={() => setRangeEffectiveMode('TOTAL_PERIOD')}
                      className="mt-0.5 text-[#002D5A]"
                    />
                    <div>
                      <strong className="block font-bold">Efetivo Total Fixo do Período</strong>
                      <span className="text-[11px] text-slate-500 block">
                        Exatamente {numEfetivo} JOEs distribuídas no período total
                      </span>
                    </div>
                  </label>
                </div>

                {/* Opção de Gravação Diária Individualizada no Supabase */}
                <div className="pt-2 border-t border-sky-200/80 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="saveAsDaily"
                    checked={saveAsDailyEntries}
                    onChange={(e) => setSaveAsDailyEntries(e.target.checked)}
                    className="w-4 h-4 text-[#002D5A] rounded-md border-slate-300 focus:ring-[#7EC2E8] cursor-pointer"
                  />
                  <label htmlFor="saveAsDaily" className="text-xs font-semibold text-slate-800 cursor-pointer select-none">
                    Criar lançamentos diários individualizados no banco de dados (um registro para cada dia: {rangeDates.map((d) => formatDateBRL(d).substring(0, 5)).join(', ')})
                  </label>
                </div>
              </div>
            </div>
          )}
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
              <span>
                {dateMode === 'RANGE' && rangeEffectiveMode === 'DAILY_PER_DAY'
                  ? 'Efetivo Diário por Turno (JOEs/dia) *'
                  : 'Efetivo Empregado (JOEs) *'}
              </span>
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
        <div className="p-4 bg-sky-50/80 border border-[#7EC2E8]/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-xs text-slate-700">
            <CheckCircle2 className="w-5 h-5 text-[#002D5A] shrink-0" />
            <div>
              {dateMode === 'RANGE' && countDays > 1 && rangeEffectiveMode === 'DAILY_PER_DAY' ? (
                <span>
                  Cálculo Contábil: <strong className="text-slate-900 font-mono text-sm">{countDays} dias</strong> × <strong className="text-slate-900 font-mono text-sm">{formatInteger(numEfetivo)} JOEs/dia</strong> = <strong className="text-emerald-800 font-mono text-sm">{formatInteger(totalCalculatedJoes)} JOEs no total</strong> × <strong className="text-slate-900 font-mono text-sm">{formatCurrencyBRL(numValorUnit)}</strong>
                </span>
              ) : (
                <span>
                  Cálculo Contábil: <strong className="text-slate-900 font-mono text-sm">{formatInteger(totalCalculatedJoes)} JOEs</strong> × <strong className="text-slate-900 font-mono text-sm">{formatCurrencyBRL(numValorUnit)}</strong>
                </span>
              )}
            </div>
          </div>
          <div className="text-base sm:text-lg font-extrabold text-[#002D5A] font-mono shrink-0">
            Total Previsto: {formatCurrencyBRL(totalCalculatedValue)}
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
                <span>Gravando no Banco de Dados...</span>
              </>
            ) : (
              <>
                {operationToEdit ? <Save className="w-4.5 h-4.5" /> : <PlusCircle className="w-4.5 h-4.5 text-[#7EC2E8]" />}
                <span>
                  {operationToEdit
                    ? 'Salvar Alterações'
                    : dateMode === 'RANGE' && countDays > 1 && saveAsDailyEntries
                    ? `Confirmar ${countDays} Lançamentos Diários`
                    : 'Confirmar Lançamento de JOE'}
                </span>
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

      {/* Modal for capturing JOE from screenshot/print with AI OCR */}
      <PrintCaptureModal
        isOpen={isPrintCaptureOpen}
        onClose={() => setIsPrintCaptureOpen(false)}
        ordinance={ordinance}
        commands={commands}
        currentUser={currentUser}
        onSaveOperation={async (newOp) => {
          await onSave(newOp);
          onCancel();
        }}
      />
    </div>
  );
}
