import React, { useState } from 'react';
import {
  FileText,
  PlusCircle,
  Calendar,
  DollarSign,
  ShieldCheck,
  Sparkles,
  X,
  Copy,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { OrdinancePeriod, User } from '../../types';

interface CreateOrdinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newPeriod: OrdinancePeriod, copyFromId?: string) => void;
  existingOrdinances: OrdinancePeriod[];
  currentUser: User;
}

export function CreateOrdinanceModal({
  isOpen,
  onClose,
  onSave,
  existingOrdinances,
  currentUser,
}: CreateOrdinanceModalProps) {
  const [nome, setNome] = useState('');
  const [numero, setNumero] = useState('');
  const [seiProcess, setSeiProcess] = useState('2026.190110.');
  const [seiDocument, setSeiDocument] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [unitValueJoe, setUnitValueJoe] = useState<number | string>(350);
  const [monthlyLimit, setMonthlyLimit] = useState<number | string>(12);
  const [maxHours, setMaxHours] = useState<number | string>(6);
  const [status, setStatus] = useState<'VIGENTE' | 'AGENDADA' | 'ENCERRADA'>('VIGENTE');
  const [copiarDe, setCopiarDe] = useState<string>(existingOrdinances[0]?.id || 'none');
  const [notes, setNotes] = useState(
    'Valores e cotas regulamentadas pelo Comando-Geral da PMMA (Art. 17, §3º da Lei de Diretrizes de JOE).'
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !numero.trim() || !startDate || !endDate) {
      alert('Por favor, preencha os campos obrigatórios (Nome, Número da Portaria e Datas de Vigência).');
      return;
    }

    const valJoe = Number(unitValueJoe) || 350;
    const totalJoes = 1886;
    const totalBudget = totalJoes * valJoe;

    const newOrd: OrdinancePeriod = {
      id: `ord-${Date.now()}`,
      name: nome.trim(),
      number: numero.trim(),
      year: new Date(startDate).getFullYear() || 2026,
      seiProcess: seiProcess.trim(),
      seiDocument: seiDocument.trim(),
      startDate,
      endDate,
      unitValueJoe: valJoe,
      monthlyIndividualLimit: Number(monthlyLimit) || 12,
      maxDurationHours: Number(maxHours) || 6,
      totalBudget,
      totalPlannedJoes: totalJoes,
      status: status === 'VIGENTE' ? 'VIGENTE' : status === 'ENCERRADA' ? 'ENCERRADA' : 'RASCUNHO',
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    onSave(newOrd, copiarDe);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#002D5A] text-white p-5 sm:p-6 rounded-t-3xl flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 text-[#7EC2E8] border border-white/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Cadastrar Nova Portaria de JOE
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#7EC2E8]/20 text-[#7EC2E8] border border-[#7EC2E8]/30">
                  PMMA / CPI
                </span>
              </h2>
              <p className="text-xs text-sky-200 mt-0.5">
                Definição das regras, vigência e valores da nova portaria regulamentadora
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-sky-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {/* Status Alert */}
          <div className="p-4 bg-sky-50 rounded-2xl border border-[#7EC2E8]/40 flex items-start gap-3">
            <Info className="w-5 h-5 text-[#002D5A] shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 leading-relaxed">
              <strong className="text-[#002D5A] block font-bold text-sm mb-0.5">
                Portaria em Vigor e Transição Contábil
              </strong>
              Ao cadastrar uma portaria com status <strong>"Vigente (Em vigor)"</strong>, ela se tornará a portaria ativa padrão em todos os painéis e lançamentos do sistema. As portarias anteriores permanecerão arquivadas e disponíveis para consulta histórica no seletor de períodos.
            </div>
          </div>

          {/* Row 1: Nome Descritivo & Número Oficial */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nome de Exibição / Referência *
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Portaria 123/2026 – set/out 2026"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Número Oficial da Portaria (GCG) *
              </label>
              <input
                type="text"
                required
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Ex: 123/2026 – GCG"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all font-semibold"
              />
            </div>
          </div>

          {/* Row 2: Processo SEI & Documento SEI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Processo Administrativo SEI
              </label>
              <input
                type="text"
                value={seiProcess}
                onChange={(e) => setSeiProcess(e.target.value)}
                placeholder="2026.190110.00000"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Número do Documento SEI
              </label>
              <input
                type="text"
                value={seiDocument}
                onChange={(e) => setSeiDocument(e.target.value)}
                placeholder="017849201"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all font-mono"
              />
            </div>
          </div>

          {/* Row 3: Vigência (Início e Fim) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#002D5A]" />
                <span>Início da Vigência *</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#002D5A]" />
                <span>Fim da Vigência *</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all"
              />
            </div>
          </div>

          {/* Row 4: Parâmetros Financeiros e Limites */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#002D5A]" />
                <span>Valor da JOE (R$) *</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={unitValueJoe}
                onChange={(e) => setUnitValueJoe(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Limite Individual Mensal (JOEs)
              </label>
              <input
                type="number"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Duração Máx. Turno (Horas)
              </label>
              <input
                type="number"
                value={maxHours}
                onChange={(e) => setMaxHours(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all font-mono"
              />
            </div>
          </div>

          {/* Row 5: Status da Portaria & Clonagem de Tetos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Situação da Portaria no Sistema *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all"
              >
                <option value="VIGENTE">🟢 Vigente (Ativar imediatamente no sistema)</option>
                <option value="AGENDADA">🟡 Agendada (Futura vigência)</option>
                <option value="ENCERRADA">⚪ Histórica / Encerrada</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Copy className="w-3.5 h-3.5 text-[#002D5A]" />
                <span>Copiar Tetos / Cotas do Período</span>
              </label>
              <select
                value={copiarDe}
                onChange={(e) => setCopiarDe(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all"
              >
                {existingOrdinances.map((ord) => (
                  <option key={ord.id} value={ord.id}>
                    {ord.name || ord.number} ({ord.status})
                  </option>
                ))}
                <option value="none">Não copiar (utilizar cotas padrão)</option>
              </select>
            </div>
          </div>

          {/* Row 6: Notas / Observações */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Observações / Fundamentação Legal
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[#002D5A] hover:bg-[#001F3F] text-white transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4 text-[#7EC2E8]" />
              <span>Salvar e Cadastrar Portaria</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
