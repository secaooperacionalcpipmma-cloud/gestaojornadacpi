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
} from 'lucide-react';
import { CommandUnit, OrdinancePeriod, OperationLaunch, User } from '../../types';
import { formatCurrencyBRL, formatInteger } from '../../utils/formatters';

interface CreateJoeViewProps {
  commands: CommandUnit[];
  ordinance: OrdinancePeriod;
  currentUser: User;
  onSave: (operation: OperationLaunch) => void;
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
    operationToEdit?.serviceDate || ''
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

  // Available subunits based on selected CPA/I
  const selectedCommand = commands.find((c) => c.code === cpa || c.name === cpa || c.id === cpa);
  const availableSubunits = selectedCommand ? selectedCommand.subunits : [];

  useEffect(() => {
    if (cpa && availableSubunits.length > 0 && !availableSubunits.includes(unidade)) {
      setUnidade(availableSubunits[0]);
    }
  }, [cpa]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpa) {
      alert('Por favor, selecione o CPA/I.');
      return;
    }
    if (!unidade) {
      alert('Por favor, selecione a Unidade.');
      return;
    }
    if (!nomeEvento.trim()) {
      alert('Por favor, informe o nome do evento / operação.');
      return;
    }

    const numEfetivo = Number(efetivo) || 1;
    const numValorUnit = Number(valorUnitario) || 350;
    const totalVal = numEfetivo * numValorUnit;

    const opData: OperationLaunch = {
      id: operationToEdit?.id || `op-${Date.now()}`,
      launchNumber: operationToEdit?.launchNumber || ordemServico || `${Math.floor(10000 + Math.random() * 90000)}`,
      commandId: cpa,
      subUnit: unidade,
      ordinanceId: ordinance.id,
      seiProcessNumber: processoSei,
      orderNumber: ordemServico || 'Ordem de Serviço nº 000/2026',
      eventName: nomeEvento,
      serviceDate: dataEvento || new Date().toISOString().split('T')[0],
      startTime: horario,
      officersCount: numEfetivo,
      joesPerOfficer: 1,
      unitValue: numValorUnit,
      totalValue: totalVal,
      status: operationToEdit?.status || 'APROVADO',
      serviceOrderLink: '',
      justification: justificativa,
      authorizeExcess: autorizarExcedente,
      createdBy: currentUser.name,
      createdAt: operationToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(opData);
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
              {commands.map((cmd) => (
                <option key={cmd.id} value={cmd.code}>
                  {cmd.code}
                </option>
              ))}
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

        {/* Action Buttons: Lançar JOE | Cancelar */}
        <div className="flex items-center gap-3 pt-5 border-t border-slate-100">
          <button
            type="submit"
            className="bg-[#002D5A] hover:bg-[#001F3F] text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-98"
          >
            {operationToEdit ? <Save className="w-4.5 h-4.5" /> : <PlusCircle className="w-4.5 h-4.5 text-[#7EC2E8]" />}
            <span>{operationToEdit ? 'Salvar Alterações' : 'Confirmar Lançamento de JOE'}</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-sm px-5 py-3 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
          >
            <X className="w-4.5 h-4.5 text-slate-400" />
            <span>Cancelar</span>
          </button>
        </div>
      </form>
    </div>
  );
}
