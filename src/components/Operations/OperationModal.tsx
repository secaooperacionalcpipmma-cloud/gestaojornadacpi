import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  AlertTriangle,
  Clock,
  Shield,
  DollarSign,
  Users,
  FileText,
  CheckCircle2,
  HelpCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  OperationLaunch,
  CommandBudget,
  CommandUnit,
  OrdinancePeriod,
  PoliceOfficer,
  User,
  OperationOfficerEntry,
} from '../../types';

interface OperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (operation: OperationLaunch) => void;
  operationToEdit?: OperationLaunch | null;
  commands: CommandUnit[];
  budgets: CommandBudget[];
  ordinance: OrdinancePeriod;
  officers: PoliceOfficer[];
  currentUser: User;
}

export const OperationModal: React.FC<OperationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  operationToEdit,
  commands,
  budgets,
  ordinance,
  officers,
  currentUser,
}) => {
  if (!isOpen) return null;

  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [commandId, setCommandId] = useState(
    operationToEdit?.commandId ||
      (currentUser.role === 'CPA_GESTOR' && currentUser.commandId ? currentUser.commandId : 'CPA/I-1')
  );
  const [subUnit, setSubUnit] = useState(operationToEdit?.subUnit || '23º BPM (São Mateus)');
  const [justification, setJustification] = useState(
    operationToEdit?.justification || 'Intensa movimentação gerada por festividades locais e reforço do policiamento ostensivo preventivo.'
  );
  const [orderType, setOrderType] = useState<'ORDEM_DE_SERVICO' | 'ORDEM_DE_OPERACAO'>(
    operationToEdit?.orderType || 'ORDEM_DE_SERVICO'
  );
  const [orderNumber, setOrderNumber] = useState(operationToEdit?.orderNumber || '035/2026');
  const [eventName, setEventName] = useState(operationToEdit?.eventName || '');
  const [serviceDate, setServiceDate] = useState(
    operationToEdit?.serviceDate || new Date().toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState(operationToEdit?.startTime || '22:00');
  const [endTime, setEndTime] = useState(operationToEdit?.endTime || '04:00');
  const [location, setLocation] = useState(operationToEdit?.location || '');
  const [officersCount, setOfficersCount] = useState(operationToEdit?.officersCount || 5);
  const [joesPerOfficer, setJoesPerOfficer] = useState(operationToEdit?.joesPerOfficer || 1);
  const [unitValue, setUnitValue] = useState(operationToEdit?.unitValue || ordinance.unitValueJoe);
  const [seiProcessNumber, setSeiProcessNumber] = useState(
    operationToEdit?.seiProcessNumber || ordinance.seiProcess
  );
  const [seiDocumentNumber, setSeiDocumentNumber] = useState(operationToEdit?.seiDocumentNumber || '');
  const [status, setStatus] = useState(operationToEdit?.status || 'PENDENTE_ANALISE');
  const [selectedOfficers, setSelectedOfficers] = useState<OperationOfficerEntry[]>(
    operationToEdit?.officers || []
  );

  // Error message
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Subunits for selected command
  const availableSubunits = useMemo(() => {
    const cmd = commands.find((c) => c.code === commandId);
    return cmd?.subunits || ['1º BPM', '2º BPM', 'Companhia Independente'];
  }, [commands, commandId]);

  // Duration calculation
  const calculatedDurationHours = useMemo(() => {
    try {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      let diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
      if (diffMinutes < 0) {
        diffMinutes += 24 * 60; // Next day crossing (e.g., 22:00 to 04:00)
      }
      return parseFloat((diffMinutes / 60).toFixed(1));
    } catch {
      return 6;
    }
  }, [startTime, endTime]);

  // Total Value
  const totalValue = officersCount * joesPerOfficer * unitValue;

  // Selected Command Budget
  const targetBudget = useMemo(() => {
    return budgets.find((b) => b.commandId === commandId);
  }, [budgets, commandId]);

  const durationExceeded = calculatedDurationHours > ordinance.maxDurationHours;
  const budgetExceeded = targetBudget ? targetBudget.availableBalance < totalValue : false;

  const handleNominalOfficerAdd = (officer: PoliceOfficer) => {
    if (selectedOfficers.some((o) => o.officerId === officer.id)) return;
    if (officer.status !== 'APTO') {
      alert(`Atenção: O militar ${officer.name} está em ${officer.status} (${officer.statusReason || ''}) e não pode ser escalado em JOE conforme Art. 7º.`);
      return;
    }
    if (officer.monthlyJoesCount >= ordinance.monthlyIndividualLimit) {
      alert(`Atenção: O militar ${officer.name} já atingiu o limite máximo de ${ordinance.monthlyIndividualLimit} JOEs mensais (Art. 8º).`);
      return;
    }

    setSelectedOfficers([
      ...selectedOfficers,
      {
        officerId: officer.id,
        officerName: officer.name,
        rank: officer.rank,
        registration: officer.registration,
        cpf: officer.cpf,
        roleInMission: 'Patrulheiro Escala JOE',
        joesCount: 1,
        value: unitValue,
      },
    ]);
  };

  const handleNominalOfficerRemove = (officerId: string) => {
    setSelectedOfficers(selectedOfficers.filter((o) => o.officerId !== officerId));
  };

  const handleSubmit = (finalStatus?: 'RASCUNHO' | 'PENDENTE_ANALISE') => {
    setErrorMsg(null);

    if (!eventName.trim()) {
      setErrorMsg('Informe a denominação do evento ou operação.');
      setCurrentStep(2);
      return;
    }

    if (!location.trim()) {
      setErrorMsg('Informe o local da realização do serviço.');
      setCurrentStep(2);
      return;
    }

    if (durationExceeded) {
      setErrorMsg(`A duração (${calculatedDurationHours}h) ultrapassa o limite máximo de ${ordinance.maxDurationHours}h da Portaria.`);
      setCurrentStep(3);
      return;
    }

    if (budgetExceeded && finalStatus !== 'RASCUNHO') {
      setErrorMsg(`Saldo orçamentário insuficiente para o ${commandId}. Saldo disponível: R$ ${targetBudget?.availableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`);
      return;
    }

    const payload: OperationLaunch = {
      id: operationToEdit?.id || `op-${Date.now()}`,
      launchNumber: operationToEdit?.launchNumber || `JOE-2026-${Math.floor(100 + Math.random() * 900)}`,
      commandId,
      subUnit,
      ordinanceId: ordinance.id,
      justification,
      orderType,
      orderNumber,
      eventName,
      serviceDate,
      startTime,
      endTime,
      calculatedDurationHours,
      location,
      officersCount: Number(officersCount),
      joesPerOfficer: Number(joesPerOfficer),
      unitValue: Number(unitValue),
      totalValue,
      status: finalStatus || (operationToEdit ? status : 'PENDENTE_ANALISE'),
      seiProcessNumber,
      seiDocumentNumber,
      officers: selectedOfficers,
      checklist: operationToEdit?.checklist || {
        operationalJustification: !!justification,
        serviceOrOperationOrder: !!orderNumber,
        budgetCompatibilityDeclaration: true,
        cpiPriorAuthorization: currentUser.role === 'CPI_GESTOR',
        priorNominalRoster: selectedOfficers.length > 0,
        commanderDutyFreeDeclaration: true,
        reneReportAttached: false,
        presenceControlVerified: false,
      },
      createdBy: operationToEdit?.createdBy || currentUser.name,
      createdAt: operationToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="bg-[#00204A] px-6 py-4 border-b border-[#00204A] flex items-center justify-between text-white">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-[#FFD700]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                {operationToEdit ? `Editar Lançamento: ${operationToEdit.launchNumber}` : 'Novo Lançamento de JOE'}
              </h3>
              <p className="text-xs text-slate-300">
                {ordinance.number} • Instrução Normativa CPI
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

        {/* Step Indicator */}
        <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-200 grid grid-cols-5 gap-2 text-center text-xs">
          {[
            { step: 1, label: 'Unidade' },
            { step: 2, label: 'Operação' },
            { step: 3, label: 'Horários' },
            { step: 4, label: 'Efetivo' },
            { step: 5, label: 'SEI & Envio' },
          ].map((item) => (
            <button
              key={item.step}
              onClick={() => setCurrentStep(item.step)}
              className={`py-1.5 px-2 rounded-xl font-bold transition-colors flex items-center justify-center space-x-1.5 ${
                currentStep === item.step
                  ? 'bg-[#00204A] text-white shadow-xs'
                  : currentStep > item.step
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200/60 text-slate-500'
              }`}
            >
              <span>{item.step}.</span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-red-600 hover:text-red-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 text-slate-800">
          {/* STEP 1: Unidade e Comando */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#00204A]">
                1. Identificação do Comando e Unidade Policial Militar
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Comando de Área Subordinado (CPA/I) *
                  </label>
                  <select
                    value={commandId}
                    onChange={(e) => {
                      setCommandId(e.target.value);
                      const cmd = commands.find((c) => c.code === e.target.value);
                      if (cmd && cmd.subunits.length > 0) {
                        setSubUnit(cmd.subunits[0]);
                      }
                    }}
                    disabled={currentUser.role === 'CPA_GESTOR' && !!currentUser.commandId}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#00204A]"
                  >
                    {commands.map((cmd) => (
                      <option key={cmd.id} value={cmd.code}>
                        {cmd.code} - {cmd.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unidade Policial Militar (UPM / Batalhão) *
                  </label>
                  <select
                    value={subUnit}
                    onChange={(e) => setSubUnit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#00204A]"
                  >
                    {availableSubunits.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Budget snapshot for selected CPA */}
              {targetBudget && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-700">Cota Orçamentária do {commandId}:</span>
                    <span className="font-bold text-[#00204A]">
                      R$ {targetBudget.budgetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({targetBudget.plannedJoes} JOEs)
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Saldo Disponível Atual:</span>
                    <span className={`font-bold ${targetBudget.availableBalance > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      R$ {targetBudget.availableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Informações Operacionais */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#00204A]">
                2. Informações da Missão e Ordem de Serviço/Operação
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Ordem *</label>
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#00204A]"
                  >
                    <option value="ORDEM_DE_SERVICO">Ordem de Serviço (OS)</option>
                    <option value="ORDEM_DE_OPERACAO">Ordem de Operação (OO)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Número da OS/OO *</label>
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="Ex: 032/2026"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#00204A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Data do Serviço *</label>
                  <input
                    type="date"
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#00204A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome do Evento / Operação *
                </label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Ex: FÉRIAS SEGURAS SÃO MATEUS, OPERAÇÃO COMÉRCIO SEGURO"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#00204A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Local / Município / Bairro *
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: São Mateus do Maranhão - Corredor Cultural e Vias Principais"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#00204A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Justificativa da Criação da JOE (Art. 4º) *
                </label>
                <textarea
                  rows={3}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Descreva a fundamentação técnica e necessidade operacional que motiva a jornada extraordinária..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-hidden focus:border-[#00204A]"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Horários e Duração */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#00204A]">
                3. Jornada, Horários e Validação de Duração (Máx. 6 Horas)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Horário de Início *</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#00204A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Horário de Término *</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#00204A]"
                  />
                </div>
              </div>

              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  durationExceeded
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Clock className={`w-5 h-5 ${durationExceeded ? 'text-red-600' : 'text-[#00204A]'}`} />
                  <div>
                    <div className="text-xs font-bold">Duração Calculada do Turno:</div>
                    <div className="text-sm font-black">{calculatedDurationHours} Horas contínuas</div>
                  </div>
                </div>

                <div>
                  {durationExceeded ? (
                    <span className="text-[10px] font-bold px-2.5 py-1 bg-red-600 text-white rounded-full">
                      Excede Teto de 6h (Art. 2º)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full flex items-center">
                      <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-700" />
                      Dentro do Limite Legal
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                <strong>Regra Art. 2º:</strong> A JOE possui duração contínua de até 06 horas e deve ser executada estritamente em horário de folga regulamentar.
              </p>
            </div>
          )}

          {/* STEP 4: Efetivo e Valores */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#00204A]">
                4. Quantitativo de Efetivo e Cálculo Financeiro Automático
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Efetivo Empregado (Qtd Policiais) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={officersCount}
                    onChange={(e) => setOfficersCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-hidden focus:border-[#00204A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jornadas por Policial (Normalmente 1)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={2}
                    value={joesPerOfficer}
                    onChange={(e) => setJoesPerOfficer(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-hidden focus:border-[#00204A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Valor Unitário da JOE (Portaria)
                  </label>
                  <input
                    type="number"
                    value={unitValue}
                    onChange={(e) => setUnitValue(parseFloat(e.target.value) || ordinance.unitValueJoe)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-hidden focus:border-[#00204A]"
                  />
                </div>
              </div>

              {/* Formula Callout */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 font-semibold">Cálculo da Despesa:</div>
                  <div className="text-xs text-slate-800 font-mono mt-0.5 font-bold">
                    {officersCount} PMs × {joesPerOfficer} JOE × R$ {unitValue.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 font-semibold">Valor Total da Missão:</div>
                  <div className="text-xl font-black text-[#00204A] font-mono">
                    R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Nominal Roster Selector (Optional / Progressive) */}
              <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Escalação Nominal Prévia (Art. 6º) - {selectedOfficers.length} selecionado(s)
                  </span>
                  <span className="text-[10px] text-slate-500">Limite: 12 JOEs / Policial</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                  {officers
                    .filter((off) => off.commandId === commandId)
                    .map((off) => {
                      const isSelected = selectedOfficers.some((o) => o.officerId === off.id);
                      return (
                        <div
                          key={off.id}
                          onClick={() =>
                            isSelected ? handleNominalOfficerRemove(off.id) : handleNominalOfficerAdd(off)
                          }
                          className={`p-2 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-blue-50 border-blue-300 text-blue-900'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div>
                            <div className="font-bold truncate">{off.rank} {off.name}</div>
                            <div className="text-[10px] text-slate-500">
                              Matr. {off.registration} • {off.monthlyJoesCount}/12 JOEs
                            </div>
                          </div>
                          {isSelected ? (
                            <CheckCircle2 className="w-4 h-4 text-blue-700" />
                          ) : (
                            <Plus className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: SEI e Envio */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#00204A]">
                5. Conferência Orçamentária e Rito SEI (Arts. 1º, 4º e 13)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Número do Processo SEI *
                  </label>
                  <input
                    type="text"
                    value={seiProcessNumber}
                    onChange={(e) => setSeiProcessNumber(e.target.value)}
                    placeholder="Ex: 2026.190110.35458"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#00204A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Número do Documento SEI (Opcional)
                  </label>
                  <input
                    type="text"
                    value={seiDocumentNumber}
                    onChange={(e) => setSeiDocumentNumber(e.target.value)}
                    placeholder="Ex: 016909457"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#00204A]"
                  />
                </div>
              </div>

              {/* Budget Impact Preview */}
              <div
                className={`p-4 rounded-xl border ${
                  budgetExceeded
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold">Impacto na Cota do {commandId}:</span>
                  <span className="text-xs font-mono font-bold">
                    - R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-200 pt-2">
                  <span>Saldo Restante Pós-Lançamento:</span>
                  <span className="font-mono font-bold text-sm text-[#00204A]">
                    R$ {((targetBudget?.availableBalance || 0) - totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <p className="font-bold text-[#00204A]">Rito de Autorização (Art. 13, I):</p>
                <p>• O Comandante da UPM atesta a folga e a necessidade da JOE.</p>
                <p>• O CPI analisa a pertinência técnica e autoriza o empenho orçamentário.</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 bg-white"
              >
                ← Voltar
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {currentStep < 5 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                className="bg-[#00204A] hover:bg-[#002e6b] text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
              >
                Próximo Passo →
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSubmit('RASCUNHO')}
                  className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 transition-colors"
                >
                  Salvar Rascunho
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit('PENDENTE_ANALISE')}
                  className="bg-[#FFD700] hover:bg-[#ffe033] text-[#00204A] text-xs font-black px-4 py-2 rounded-xl shadow-xs transition-all"
                >
                  Enviar para Análise CPI
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
