import React, { useState } from 'react';
import {
  CalendarRange,
  PlusCircle,
  Calendar,
  DollarSign,
  Copy,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Eye,
  Info,
} from 'lucide-react';
import { OrdinancePeriod, OperationLaunch, User } from '../../types';

interface PeriodsViewProps {
  ordinances: OrdinancePeriod[];
  operations: OperationLaunch[];
  currentUser: User;
  onSavePeriod: (newPeriod: OrdinancePeriod, copyFromId?: string) => void;
  onSelectPeriod: (id: string) => void;
}

export function PeriodsView({
  ordinances,
  operations,
  currentUser,
  onSavePeriod,
  onSelectPeriod,
}: PeriodsViewProps) {
  const [nome, setNome] = useState('');
  const [portaria, setPortaria] = useState('');
  const [seiProcess, setSeiProcess] = useState('2026.190110.');
  const [seiDocument, setSeiDocument] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [valorPadrao, setValorPadrao] = useState<number | string>(350);
  const [status, setStatus] = useState<'VIGENTE' | 'AGENDADA' | 'ENCERRADA'>('VIGENTE');
  const [copiarDe, setCopiarDe] = useState<string>(ordinances[0]?.id || 'none');
  const [createdSuccess, setCreatedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !portaria.trim() || !inicio || !fim) {
      alert('Por favor, preencha todos os campos obrigatórios da nova portaria.');
      return;
    }

    const valJoe = Number(valorPadrao) || 350;
    const totalJoes = 1886;
    const totalBudget = totalJoes * valJoe;

    const newOrd: OrdinancePeriod = {
      id: `ord-${Date.now()}`,
      name: nome.trim(),
      number: portaria.trim(),
      year: new Date(inicio).getFullYear() || 2026,
      seiProcess: seiProcess.trim(),
      seiDocument: seiDocument.trim(),
      startDate: inicio,
      endDate: fim,
      unitValueJoe: valJoe,
      monthlyIndividualLimit: 12,
      maxDurationHours: 6,
      totalBudget,
      totalPlannedJoes: totalJoes,
      status: status === 'VIGENTE' ? 'VIGENTE' : status === 'ENCERRADA' ? 'ENCERRADA' : 'RASCUNHO',
      notes: 'Valores regulamentados pela portaria do Comando-Geral da PMMA (Anexo I).',
      createdAt: new Date().toISOString(),
    };

    onSavePeriod(newOrd, copiarDe);
    setCreatedSuccess(true);
    setNome('');
    setPortaria('');
    setSeiProcess('2026.190110.');
    setSeiDocument('');
    setInicio('');
    setFim('');
    setTimeout(() => setCreatedSuccess(false), 4000);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Card: Períodos cadastrados */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CalendarRange className="w-5 h-5 text-[#002D5A]" />
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Portarias e Períodos Regulamentadores
              </h3>
              <p className="text-xs text-slate-500">
                A portaria em vigor define os valores ativos. Portarias anteriores ficam arquivadas para consulta histórica.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs sm:text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Nome do Período</th>
                <th className="py-3.5 px-4">Portaria / Processo</th>
                <th className="py-3.5 px-4">Vigência</th>
                <th className="py-3.5 px-4 text-right">Valor Padrão</th>
                <th className="py-3.5 px-4 text-center">Lançamentos</th>
                <th className="py-3.5 px-4 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ordinances.map((ord) => {
                const count = operations.filter((o) => o.ordinanceId === ord.id).length;
                const isActive = ord.status === 'VIGENTE';
                return (
                  <tr key={ord.id} className="hover:bg-sky-50/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {ord.name || ord.number}
                        </span>
                        {isActive ? (
                          <span className="bg-sky-50 text-[#002D5A] border border-[#7EC2E8] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                            Em Vigor
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                            {ord.status || 'Histórica'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      <div>{ord.number}</div>
                      {ord.seiProcess && (
                        <div className="text-[11px] text-slate-400 font-mono">SEI: {ord.seiProcess}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {formatDate(ord.startDate)} a {formatDate(ord.endDate)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-900 font-bold font-mono">
                      R$ {ord.unitValueJoe.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-600 font-semibold font-mono">
                      {count} {count === 1 ? 'lançamento' : 'lançamentos'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => onSelectPeriod(ord.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 mx-auto ${
                          isActive
                            ? 'bg-[#002D5A] text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-[#002D5A] text-slate-700 hover:text-white'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isActive ? 'Ativa' : 'Selecionar'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Card: Novo período */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div>
          <div className="flex items-center gap-2.5">
            <PlusCircle className="w-5 h-5 text-[#002D5A]" />
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Cadastrar Nova Portaria de Regulamentação
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Cada nova portaria de JOE cria um período orçamentário. Você pode clonar os tetos de um período anterior para manter as cotas sem retrabalho.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nome de Identificação / Exibição *
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Portaria 130/2026 – out/nov 2026"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Número Oficial da Portaria (GCG) *
              </label>
              <input
                type="text"
                required
                value={portaria}
                onChange={(e) => setPortaria(e.target.value)}
                placeholder="Ex: 130/2026 – GCG"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all font-semibold"
              />
            </div>
          </div>

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
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Documento SEI
              </label>
              <input
                type="text"
                value={seiDocument}
                onChange={(e) => setSeiDocument(e.target.value)}
                placeholder="017934021"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#002D5A]" />
                <span>Data Inicial de Vigência *</span>
              </label>
              <input
                type="date"
                required
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#002D5A]" />
                <span>Data Final de Vigência *</span>
              </label>
              <input
                type="date"
                required
                value={fim}
                onChange={(e) => setFim(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#002D5A]" />
                <span>Valor Padrão da JOE (R$) *</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={valorPadrao}
                onChange={(e) => setValorPadrao(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Situação da Portaria *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A]"
              >
                <option value="VIGENTE">🟢 Vigente (Ativar como portaria atual)</option>
                <option value="AGENDADA">🟡 Agendada (Vigência futura)</option>
                <option value="ENCERRADA">⚪ Histórica / Encerrada</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Copy className="w-3.5 h-3.5 text-[#002D5A]" />
                <span>Copiar Tetos de Período</span>
              </label>
              <select
                value={copiarDe}
                onChange={(e) => setCopiarDe(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] transition-all font-medium"
              >
                <option value="none">Não copiar (iniciar padrão)</option>
                {ordinances.map((ord) => (
                  <option key={ord.id} value={ord.id}>
                    {ord.name || ord.number} ({ord.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 flex items-center gap-4">
            <button
              type="submit"
              className="bg-[#002D5A] hover:bg-[#001F3F] text-white font-bold text-xs sm:text-sm py-3 px-6 rounded-xl shadow-md transition-all active:scale-98 flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-[#7EC2E8]" />
              <span>Cadastrar e Salvar Portaria</span>
            </button>
            {createdSuccess && (
              <span className="text-xs sm:text-sm font-bold text-[#002D5A] bg-sky-50 px-4 py-2 rounded-xl border border-[#7EC2E8] animate-in fade-in flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#002D5A]" />
                Portaria cadastrada com sucesso!
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}
