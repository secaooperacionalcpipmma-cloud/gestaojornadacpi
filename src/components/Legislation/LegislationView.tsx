import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  FileText,
  Download,
  Printer,
  Copy,
  CheckCircle2,
  Search,
  SlidersHorizontal,
  Sparkles,
  ShieldAlert,
  Calendar,
  Building2,
  Layers,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  PlusCircle,
  Clock,
  DollarSign,
  AlertTriangle,
  BadgeAlert,
  ArrowRight,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  LegislationDocument,
  CpiExecutiveSummary,
  OFFICIAL_PORTARIA_122,
  OFFICIAL_CPI_SUMMARY,
  generateCpiSummaryFromInput,
} from '../../data/legislationData';
import { formatCurrencyBRL, formatInteger } from '../../utils/formatters';
import { pdfService } from '../../services/pdfService';
import { OrdinancePeriod, User } from '../../types';

interface LegislationViewProps {
  ordinances: OrdinancePeriod[];
  activeOrdinance: OrdinancePeriod;
  currentUser: User;
  onSaveNewOrdinance?: (newPeriod: OrdinancePeriod, copyFromId?: string) => void;
  onSelectOrdinance?: (id: string) => void;
}

export function LegislationView({
  ordinances,
  activeOrdinance,
  currentUser,
  onSaveNewOrdinance,
  onSelectOrdinance,
}: LegislationViewProps) {
  // Sub-tab: 'RESUMO' | 'PORTARIA_INTEGRA' | 'NOVA_PORTARIA'
  const [subTab, setSubTab] = useState<'RESUMO' | 'PORTARIA_INTEGRA' | 'NOVA_PORTARIA'>('RESUMO');

  // Active Portaria Document
  const [portariaDoc, setPortariaDoc] = useState<LegislationDocument>(OFFICIAL_PORTARIA_122);
  const [activeSummary, setActiveSummary] = useState<CpiExecutiveSummary>(OFFICIAL_CPI_SUMMARY);

  // Search in Portaria text
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('ALL');

  // Copy status feedback
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Form for New Ordinance and Auto Summary Generator
  const [newNumber, setNewNumber] = useState('PORTARIA Nº 123/2026 – GCG');
  const [newPeriod, setNewPeriod] = useState('22/09/2026 a 21/10/2026');
  const [newStartDate, setNewStartDate] = useState('2026-09-22');
  const [newEndDate, setNewEndDate] = useState('2026-10-21');
  const [newSeiProcess, setNewSeiProcess] = useState('2026.190110.35458');
  const [newSeiDoc, setNewSeiDoc] = useState('016909457');
  const [newUnitValue, setNewUnitValue] = useState<number>(350);
  const [newMonthlyLimit, setNewMonthlyLimit] = useState<number>(12);
  const [newTextOrdinance, setNewTextOrdinance] = useState('');
  const [generatedPreviewSummary, setGeneratedPreviewSummary] = useState<CpiExecutiveSummary | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Custom quotas builder for new ordinance
  const [customQuotas, setCustomQuotas] = useState([
    { unit: 'CPI — Direção Setorial', joes: 30, amount: 10500 },
    { unit: 'Comando de Policiamento de Área do Interior - 1 (CPA/I-1)', joes: 186, amount: 65100 },
    { unit: 'Comando de Policiamento de Área do Interior - 2 (CPA/I-2)', joes: 186, amount: 65100 },
    { unit: 'Comando de Policiamento de Área do Interior - 3 (CPA/I-3)', joes: 300, amount: 105000 },
    { unit: 'Comando de Policiamento de Área do Interior - 4 (CPA/I-4)', joes: 186, amount: 65100 },
    { unit: 'Comando de Policiamento de Área do Interior - 5 (CPA/I-5)', joes: 230, amount: 80500 },
    { unit: 'Comando de Policiamento de Área do Interior - 6 (CPA/I-6)', joes: 170, amount: 59500 },
    { unit: 'Comando de Policiamento de Área do Interior - 7 (CPA/I-7)', joes: 186, amount: 65100 },
    { unit: 'Comando de Policiamento de Área do Interior - 8 (CPA/I-8)', joes: 186, amount: 65100 },
    { unit: 'Comando de Policiamento de Área do Interior - 9 (CPA/I-9)', joes: 226, amount: 79100 },
  ]);

  // Recalculate amounts when unit value changes
  const handleUnitValueChange = (val: number) => {
    setNewUnitValue(val);
    setCustomQuotas((prev) =>
      prev.map((q) => ({
        ...q,
        amount: q.joes * val,
      }))
    );
  };

  const handleQuotaJoesChange = (index: number, joes: number) => {
    setCustomQuotas((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        joes,
        amount: joes * newUnitValue,
      };
      return copy;
    });
  };

  // Copy helper
  const handleCopyText = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 3000);
  };

  // Filtered chapters for Portaria text
  const filteredChapters = useMemo(() => {
    return portariaDoc.chapters
      .filter((chap) => selectedChapterId === 'ALL' || chap.id === selectedChapterId)
      .map((chap) => {
        if (!searchTerm.trim()) return chap;
        const term = searchTerm.toLowerCase();
        const matchedArticles = chap.articles.filter(
          (art) =>
            art.number.toLowerCase().includes(term) ||
            art.text.toLowerCase().includes(term) ||
            art.items?.some((it) => it.toLowerCase().includes(term)) ||
            art.paragraphs?.some((p) => p.toLowerCase().includes(term))
        );
        return {
          ...chap,
          articles: matchedArticles,
        };
      })
      .filter((chap) => chap.articles.length > 0);
  }, [portariaDoc, selectedChapterId, searchTerm]);

  // Generate Summary from User Input
  const handleGenerateSummary = () => {
    const generated = generateCpiSummaryFromInput({
      ordinanceNumber: newNumber,
      period: newPeriod,
      seiProcess: newSeiProcess,
      seiDocNumber: newSeiDoc,
      unitValue: newUnitValue,
      monthlyLimit: newMonthlyLimit,
      quotas: customQuotas,
    });
    setGeneratedPreviewSummary(generated);
  };

  // Save ordinance to system
  const handleSaveAndActivateOrdinance = () => {
    if (!generatedPreviewSummary) {
      handleGenerateSummary();
    }
    const currentGenerated =
      generatedPreviewSummary ||
      generateCpiSummaryFromInput({
        ordinanceNumber: newNumber,
        period: newPeriod,
        seiProcess: newSeiProcess,
        seiDocNumber: newSeiDoc,
        unitValue: newUnitValue,
        monthlyLimit: newMonthlyLimit,
        quotas: customQuotas,
      });

    const newOrd: OrdinancePeriod = {
      id: `ord-${Date.now()}`,
      name: `${newNumber} (${newPeriod})`,
      number: newNumber,
      year: new Date(newStartDate).getFullYear() || 2026,
      seiProcess: newSeiProcess,
      seiDocument: newSeiDoc,
      startDate: newStartDate,
      endDate: newEndDate,
      unitValueJoe: newUnitValue,
      monthlyIndividualLimit: newMonthlyLimit,
      maxDurationHours: 6,
      totalBudget: currentGenerated.totalAmount,
      totalPlannedJoes: currentGenerated.totalJoes,
      status: 'VIGENTE',
      notes: 'Cadastrada pelo menu Legislação com Resumo Normativo das Atribuições do CPI gerado automaticamente.',
      createdAt: new Date().toISOString(),
    };

    if (onSaveNewOrdinance) {
      onSaveNewOrdinance(newOrd);
    }
    setActiveSummary(currentGenerated);
    setSaveSuccessMsg(true);
    setTimeout(() => {
      setSaveSuccessMsg(false);
      setSubTab('RESUMO');
    }, 1800);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Navigation & Quick Actions */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#002D5A] text-white flex items-center justify-center shadow-md">
            <BookOpen className="w-6 h-6 text-[#7EC2E8]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Legislação & Atribuições do CPI
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Portaria 122/2026-GCG
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Consulte a Portaria na íntegra, acesse o Resumo Normativo com as competências do CPI ou cadastre novas portarias com geração automática de resumo.
            </p>
          </div>
        </div>

        {/* Global Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => pdfService.generateCpiSummaryManualPDF(activeSummary)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-[#002D5A] border border-slate-300 shadow-xs flex items-center gap-2 cursor-pointer transition-all hover:border-[#002D5A]"
          >
            <Download className="w-4 h-4 text-[#002D5A]" />
            <span>Baixar Resumo CPI (PDF)</span>
          </button>
          <button
            onClick={() => pdfService.generateOfficialPortariaPDF(portariaDoc)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#002D5A] hover:bg-[#001f3f] text-white shadow-xs flex items-center gap-2 cursor-pointer transition-all"
          >
            <FileText className="w-4 h-4 text-[#7EC2E8]" />
            <span>Baixar Portaria Completa (PDF)</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setSubTab('RESUMO')}
          className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            subTab === 'RESUMO'
              ? 'border-[#002D5A] text-[#002D5A]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Segundo Anexo: Resumo & Atribuições do CPI</span>
        </button>

        <button
          onClick={() => setSubTab('PORTARIA_INTEGRA')}
          className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            subTab === 'PORTARIA_INTEGRA'
              ? 'border-[#002D5A] text-[#002D5A]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Primeiro Anexo: Portaria Nº 122/2026 na Íntegra</span>
        </button>

        <button
          onClick={() => setSubTab('NOVA_PORTARIA')}
          className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            subTab === 'NOVA_PORTARIA'
              ? 'border-[#002D5A] text-[#002D5A]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Cadastrar Portaria & Gerar Resumo Automático</span>
        </button>
      </div>

      {/* TAB 1: RESUMO NORMATIVO & ATRIBUIÇÕES DO CPI (SEGUNDO ANEXO) */}
      {subTab === 'RESUMO' && (
        <div className="space-y-6">
          {/* Header Card matching uploaded PDF */}
          <div className="bg-[#002D5A] text-white rounded-2xl p-6 sm:p-7 shadow-md">
            <div className="text-center space-y-1.5 border-b border-sky-800/60 pb-5">
              <p className="text-xs tracking-widest text-sky-200 font-bold uppercase">
                Governo do Estado do Maranhão • Polícia Militar do Maranhão
              </p>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                COMANDO DE POLICIAMENTO DO INTERIOR (CPI) • GRANDE COMANDO
              </h1>
              <p className="text-xs text-sky-300 font-medium">
                INSTRUÇÃO NORMATIVA E GUIA OPERACIONAL • {activeSummary.ordinanceNumber} (Período: {activeSummary.period})
              </p>
            </div>

            <div className="mt-5 bg-slate-900/80 rounded-xl p-4 text-center border border-sky-400/20">
              <h2 className="text-base sm:text-lg font-black text-[#7EC2E8] uppercase tracking-wide">
                MANUAL NORMATIVO: ATRIBUIÇÕES DO CPI E REQUISITOS DA JOE
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Regras de Autorização, Escalonamento, Execução, Limites Individuais, Fiscalização e Prestação de Contas
              </p>
            </div>
          </div>

          {/* 1. PARÂMETROS ESSENCIAIS DA JOE */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#002D5A] uppercase tracking-wide flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#002D5A]"></span>
                1. Parâmetros Essenciais da JOE (Arts. 2º, 3º e 8º)
              </h3>
              <button
                onClick={() => handleCopyText(JSON.stringify(activeSummary.parameters, null, 2), 'params')}
                className="text-xs text-slate-500 hover:text-[#002D5A] flex items-center gap-1 font-medium"
              >
                {copiedSection === 'params' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSection === 'params' ? 'Copiado!' : 'Copiar Parâmetros'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Duração da Jornada
                </div>
                <div className="text-xl font-black text-[#002D5A]">Até 06 Horas</div>
                <div className="text-xs text-slate-500 mt-1">Turno contínuo extraordinário</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  Valor Unitário
                </div>
                <div className="text-xl font-black text-emerald-700">R$ 350,00</div>
                <div className="text-xs text-slate-500 mt-1">Por jornada / toda a semana</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                  <BadgeAlert className="w-3.5 h-3.5 text-blue-600" />
                  Limite Mensal por PM
                </div>
                <div className="text-xl font-black text-blue-900">Máx. 12 JOEs</div>
                <div className="text-xs text-slate-500 mt-1">Teto legal intransponível</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  Regime de Execução
                </div>
                <div className="text-xl font-black text-amber-900">Horário de Folga</div>
                <div className="text-xs text-slate-500 mt-1">Vedada sobreposição ordinária</div>
              </div>
            </div>

            {/* Legal concept callout */}
            <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 text-slate-800 text-xs leading-relaxed">
              <strong className="text-indigo-950 font-bold">Conceito Legal de JOE (Art. 2º): </strong>
              {activeSummary.parameters.legalConcept}
            </div>
          </div>

          {/* 2. OBRIGATORIEDADES PARA PLANEJAMENTO, AUTORIZAÇÃO E VALIDAÇÃO (SEI) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-black text-[#002D5A] uppercase tracking-wide flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#002D5A]"></span>
                2. Obrigatoriedades para Planejamento, Autorização e Validação
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                A autorização e posterior pagamento da JOE dependem da estrita observância de um rito formal obrigatório via SEI (Sistema Eletrônico de Informações), estruturado em três etapas consecutivas:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fase 1 */}
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                <div className="bg-[#002D5A] text-white p-3 px-4">
                  <span className="text-[11px] font-bold tracking-widest text-[#7EC2E8] uppercase block">
                    Etapa 1 • Prévia
                  </span>
                  <h4 className="text-sm font-bold">Fase 1: Solicitação Prévia e Autorização (Arts. 1º e 4º)</h4>
                </div>
                <div className="p-4 space-y-2 text-xs text-slate-700">
                  <p className="font-semibold text-slate-900">A UPM deve instaurar processo SEI antes da operação contendo:</p>
                  <ul className="space-y-1.5 pl-2 list-disc list-outside text-slate-700">
                    <li>Justificativa fundamentada da necessidade operacional extraordinária;</li>
                    <li>Ordem de Serviço (OS) ou Ordem de Operação (OO) numerada;</li>
                    <li>Denominação da operação, data, horário e local de execução;</li>
                    <li>Quantitativo do efetivo a ser empregado e valor financeiro total estimado;</li>
                    <li>Declaração de compatibilidade com a cota orçamentária do CPI;</li>
                    <li className="font-bold text-[#002D5A]">Autorização prévia expressa do Comandante do CPI.</li>
                  </ul>
                </div>
              </div>

              {/* Fase 2 */}
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                <div className="bg-[#002D5A] text-white p-3 px-4">
                  <span className="text-[11px] font-bold tracking-widest text-[#7EC2E8] uppercase block">
                    Etapa 2 • Escala
                  </span>
                  <h4 className="text-sm font-bold">Fase 2: Escala Extraordinária Prévia (Art. 6º)</h4>
                </div>
                <div className="p-4 space-y-2 text-xs text-slate-700">
                  <p className="font-semibold text-slate-900">Previamente à execução, a UPM insere a escala contendo:</p>
                  <ul className="space-y-1.5 pl-2 list-disc list-outside text-slate-700">
                    <li>Nome completo, Posto ou Graduação, Matrícula e CPF;</li>
                    <li>Unidade de lotação, data, horário, local de emprego e função;</li>
                    <li className="font-bold text-slate-900">
                      Declaração de responsabilidade funcional do Comandante da UPM de que os militares estão em folga, sem impedimentos funcionais e não escalados em serviço ordinário simultâneo.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Fase 3 */}
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
              <div className="bg-[#002D5A] text-white p-3 px-4">
                <span className="text-[11px] font-bold tracking-widest text-[#7EC2E8] uppercase block">
                  Etapa 3 • Liquidação & Prestação de Contas
                </span>
                <h4 className="text-sm font-bold">Fase 3: Comprovação, Fiscalização e Liquidação (Arts. 9º, 10 e 11)</h4>
              </div>
              <div className="p-4 space-y-2.5 text-xs text-slate-700">
                <p className="font-semibold text-slate-900">
                  Ao término do serviço, para fins de liquidação financeira pela Pagadoria-DGP, o processo SEI deve conter cumulativamente:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="font-bold text-[#002D5A] block mb-1">1. Controle de Presença (Art. 9º)</span>
                    Registro de apresentação, permanência, encerramento e confrontação com CIOPS ou sistemas operacionais locais.
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="font-bold text-[#002D5A] block mb-1">2. RENE (Art. 10)</span>
                    Relatório de Execução de JOE com efetivo empregado, local, horário, nº SEI e 3 assinaturas (Oficial, P/1 e Cmt UPM).
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="font-bold text-[#002D5A] block mb-1">3. Relatório & Planilha Consolidada</span>
                    Relatório operacional detalhado e planilha nominal de todos os policiais militares efetivamente empregados.
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="font-bold text-[#002D5A] block mb-1">4. Declaração do Cmt da UPM</span>
                    Certificação expressa de inexistência de sobreposição e plena regularidade do serviço extraordinário.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. VEDAÇÕES E IMPEDIMENTOS ABSOLUTOS */}
          <div className="bg-red-50/70 rounded-2xl p-6 border border-red-200 shadow-xs space-y-3">
            <h3 className="text-base font-black text-red-900 uppercase tracking-wide flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              3. Vedações e Impedimentos Absolutos (Art. 7º)
            </h3>
            <p className="text-xs font-bold text-red-800">
              É terminantemente PROIBIDA a inclusão em escala de JOE de militar que esteja:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-red-950 font-medium">
              <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-lg border border-red-200">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 shrink-0"></span>
                <span>Escalado em serviço ordinário no mesmo período (mesmo que parcial);</span>
              </div>
              <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-lg border border-red-200">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 shrink-0"></span>
                <span>Afastado por Licença para Tratamento de Saúde (LTS própria ou de dependente);</span>
              </div>
              <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-lg border border-red-200">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 shrink-0"></span>
                <span>Sob restrição médica funcional incompatível com o esforço/atividade;</span>
              </div>
              <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-lg border border-red-200">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 shrink-0"></span>
                <span>Em cumprimento de sanção disciplinar, afastamento preventivo, reserva ou reforma;</span>
              </div>
            </div>
            <p className="text-[11px] text-red-700 italic pt-1">
              * É vedada a inclusão meramente retroativa de policial em escala extraordinária, salvo exceção fundamentada apreciada pelo CPI e homologada pelo Cmt-Geral (Art. 11, § 2º).
            </p>
          </div>

          {/* 4. ATRIBUIÇÕES DO CPI COMO GRANDE COMANDO (ART. 13) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-black text-[#002D5A] uppercase tracking-wide flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#002D5A]" />
                4. Atribuições do CPI como Grande Comando (Art. 13)
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                {activeSummary.cpiDuties.intro}
              </p>
            </div>

            <div className="space-y-3">
              {activeSummary.cpiDuties.responsibilities.map((resp, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition-all ${
                    resp.highlight
                      ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#002D5A] text-white text-[11px] flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      {resp.title}
                      <span className="text-xs font-semibold text-slate-500 font-mono">({resp.articles})</span>
                    </h4>
                    {resp.highlight && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 uppercase">
                        Obrigatório Semanal
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 mt-2 pl-7 leading-relaxed">
                    {resp.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 5. QUADRO DE COTAS ORÇAMENTÁRIAS DO CPI (ANEXO I) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-[#002D5A] uppercase tracking-wide flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-[#002D5A]" />
                  5. Quadro de Cotas Orçamentárias do CPI (Anexo I — {activeSummary.period})
                </h3>
                <p className="text-xs text-slate-500">
                  Distribuição orçamentária oficial entre a Direção Setorial e os 9 Comandos de Policiamento de Área do Interior.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="bg-[#002D5A] text-white">
                    <th className="py-2.5 px-4 font-bold uppercase tracking-wider text-center border-r border-sky-900">
                      Subunidade / Comando de Área Subordinado
                    </th>
                    <th className="py-2.5 px-4 font-bold uppercase tracking-wider text-center border-r border-sky-900 w-44">
                      Qtd. Total de JOEs
                    </th>
                    <th className="py-2.5 px-4 font-bold uppercase tracking-wider text-center w-48">
                      Valor em Reais (R$)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeSummary.quotaTable.map((q, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-4 font-semibold text-slate-900 text-center border-r border-slate-200">
                        {q.unit}
                      </td>
                      <td className="py-2 px-4 font-mono font-bold text-slate-800 text-center border-r border-slate-200">
                        {formatInteger(q.joes)}
                      </td>
                      <td className="py-2 px-4 font-mono font-bold text-slate-900 text-center">
                        {formatCurrencyBRL(q.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 text-slate-950 font-black border-t-2 border-slate-300">
                    <td className="py-3 px-4 uppercase text-center border-r border-slate-300">
                      TOTAL GERAL DO CPI
                    </td>
                    <td className="py-3 px-4 font-mono text-center border-r border-slate-300 text-sm">
                      {formatInteger(activeSummary.totalJoes)}
                    </td>
                    <td className="py-3 px-4 font-mono text-center text-sm text-[#002D5A]">
                      {formatCurrencyBRL(activeSummary.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
              <strong className="text-slate-800 font-bold">Base Legal & Responsabilidade: </strong>
              Portaria nº 122/2026-GCG (Processo SEI {activeSummary.seiProcess} / Doc. SEI nº {activeSummary.seiDocNumber}). Informações falsas ou indevidas sujeitam os agentes a sanções administrativas, disciplinares, civis e penais, além da restituição integral ao erário (Art. 16).
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEXTO INTEGRAL DA PORTARIA Nº 122/2026-GCG (PRIMEIRO ANEXO) */}
      {subTab === 'PORTARIA_INTEGRA' && (
        <div className="space-y-6">
          {/* Search & Filter Toolbar */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por artigo, termo (ex: SEI, RENE, 350)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#002D5A]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-hidden focus:border-[#002D5A] bg-white font-medium text-slate-700"
              >
                <option value="ALL">Todos os Capítulos (I a IX)</option>
                {portariaDoc.chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.number} — {c.title}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  const fullText = JSON.stringify(portariaDoc, null, 2);
                  handleCopyText(fullText, 'full_portaria');
                }}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                {copiedSection === 'full_portaria' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copiedSection === 'full_portaria' ? 'Copiado!' : 'Copiar Texto'}
              </button>
            </div>
          </div>

          {/* Official Document View (Paper Styled) */}
          <div className="bg-white rounded-2xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-6 font-serif text-slate-900">
            {/* Header PMMA */}
            <div className="text-center space-y-1 pb-6 border-b border-slate-200">
              <p className="text-sm font-bold uppercase tracking-wider text-slate-800 font-sans">
                GOVERNO DO ESTADO DO MARANHÃO
              </p>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600 font-sans">
                POLÍCIA MILITAR DO MARANHÃO
              </p>
              <h2 className="text-lg font-black text-[#002D5A] tracking-tight font-sans pt-2">
                {portariaDoc.ordinanceNumber}
              </h2>
            </div>

            {/* Preamble */}
            <div className="p-4 bg-slate-50 rounded-xl text-xs sm:text-sm italic text-slate-700 border-l-4 border-[#002D5A] leading-relaxed font-sans">
              {portariaDoc.preamble}
            </div>

            {/* Considerations */}
            <div className="space-y-2 text-xs sm:text-sm text-slate-700 leading-relaxed">
              {portariaDoc.considerations.map((c, idx) => (
                <p key={idx} className="text-justify indent-6">
                  {c}
                </p>
              ))}
            </div>

            {/* RESOLVE */}
            <div className="pt-2">
              <p className="text-sm font-black text-[#002D5A] font-sans tracking-wide">RESOLVE:</p>
            </div>

            {/* Chapters & Articles */}
            <div className="space-y-8">
              {filteredChapters.map((chapter) => (
                <div key={chapter.id} className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="text-center font-sans">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
                      {chapter.number}
                    </span>
                    <h3 className="text-sm font-black text-[#002D5A] uppercase tracking-wide">
                      {chapter.title}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {chapter.articles.map((art, aIdx) => (
                      <div key={aIdx} className="space-y-2 text-xs sm:text-sm leading-relaxed">
                        <p className="text-justify font-sans">
                          <strong className="font-bold text-slate-900">{art.number} </strong>
                          <span className="text-slate-800">{art.text}</span>
                        </p>

                        {/* Items */}
                        {art.items && art.items.length > 0 && (
                          <div className="pl-6 space-y-1 text-slate-700 font-sans text-xs">
                            {art.items.map((it, itIdx) => (
                              <p key={itIdx}>{it}</p>
                            ))}
                          </div>
                        )}

                        {/* Paragraphs */}
                        {art.paragraphs && art.paragraphs.length > 0 && (
                          <div className="pl-4 space-y-1.5 text-slate-700 italic font-sans text-xs">
                            {art.paragraphs.map((p, pIdx) => (
                              <p key={pIdx}>{p}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Signatory */}
            <div className="pt-8 border-t border-slate-200 text-center font-sans space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                DÊ-SE CIÊNCIA, PUBLIQUE-SE E CUMPRA-SE.
              </p>
              <p className="text-xs text-slate-600 mt-2">
                {portariaDoc.signatory.location}, na data da assinatura eletrônica.
              </p>
              <div className="pt-4">
                <p className="text-sm font-black text-[#002D5A] uppercase">{portariaDoc.signatory.name}</p>
                <p className="text-xs text-slate-600">{portariaDoc.signatory.role}</p>
              </div>
            </div>

            {/* ANEXO I - TABELAS DE TODOS OS GRANDES COMANDOS */}
            <div className="pt-10 border-t-2 border-slate-300 font-sans space-y-6">
              <div className="text-center space-y-1">
                <span className="text-sm font-black text-[#002D5A] uppercase tracking-widest">
                  ANEXO I
                </span>
                <h3 className="text-base font-black text-slate-900">
                  QUADRO DE PLANEJAMENTO E CONTROLE ORÇAMENTÁRIO DA JOE
                </h3>
                <p className="text-xs text-slate-500 font-medium">PERÍODO: {portariaDoc.period}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {portariaDoc.annexes[0]?.commands.map((cmd, cIdx) => (
                  <div key={cIdx} className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="bg-[#002D5A] text-white py-2 px-3 text-center text-xs font-bold uppercase tracking-wide">
                      {cmd.commandName}
                    </div>
                    <table className="w-full text-xs text-center border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                          <th className="py-1.5 px-2 font-bold text-center border-r border-slate-200">COMANDO / UNIDADE</th>
                          <th className="py-1.5 px-2 font-bold text-center border-r border-slate-200 w-28">QTD JOES</th>
                          <th className="py-1.5 px-2 font-bold text-center w-32">VALOR (R$)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {cmd.rows.map((r, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50">
                            <td className="py-1.5 px-2 font-medium text-slate-800 text-center border-r border-slate-200">{r.unit}</td>
                            <td className="py-1.5 px-2 font-mono text-center border-r border-slate-200">{formatInteger(r.plannedJoes)}</td>
                            <td className="py-1.5 px-2 font-mono text-center">{formatCurrencyBRL(r.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-bold border-t border-slate-300">
                          <td className="py-1.5 px-2 text-center border-r border-slate-300 uppercase">QUANTIDADE TOTAL</td>
                          <td className="py-1.5 px-2 font-mono text-center border-r border-slate-300">{formatInteger(cmd.totalJoes)}</td>
                          <td className="py-1.5 px-2 font-mono text-center text-[#002D5A]">{formatCurrencyBRL(cmd.totalAmount)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CADASTRAR PORTARIA & GERADOR AUTOMÁTICO DE RESUMO DO CPI */}
      {subTab === 'NOVA_PORTARIA' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Inclusão de Nova Portaria e Gerador Automático de Resumo
                  </h3>
                  <p className="text-xs text-slate-500">
                    Insira os dados da nova portaria. O sistema irá sintetizar automaticamente as atribuições do CPI, calcular tetos orçamentários e gerar o Resumo Operacional em tempo real.
                  </p>
                </div>
              </div>

              <button
                onClick={handleGenerateSummary}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#002D5A] hover:bg-[#001f3f] text-white shadow-xs flex items-center gap-2 cursor-pointer transition-all shrink-0"
              >
                <RefreshCw className="w-4 h-4 text-[#7EC2E8]" />
                <span>Atualizar Resumo do CPI</span>
              </button>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Número da Portaria *
                </label>
                <input
                  type="text"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-hidden focus:border-[#002D5A] font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Período de Vigência *
                </label>
                <input
                  type="text"
                  value={newPeriod}
                  onChange={(e) => setNewPeriod(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-hidden focus:border-[#002D5A] font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Processo SEI *
                </label>
                <input
                  type="text"
                  value={newSeiProcess}
                  onChange={(e) => setNewSeiProcess(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-hidden focus:border-[#002D5A] font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Documento SEI
                </label>
                <input
                  type="text"
                  value={newSeiDoc}
                  onChange={(e) => setNewSeiDoc(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-hidden focus:border-[#002D5A] font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Data Início Vigência
                </label>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-hidden focus:border-[#002D5A] font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Data Término Vigência
                </label>
                <input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-hidden focus:border-[#002D5A] font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Valor Unitário da JOE (R$)
                </label>
                <input
                  type="number"
                  value={newUnitValue}
                  onChange={(e) => handleUnitValueChange(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-hidden focus:border-[#002D5A] font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Limite Mensal por PM (JOEs)
                </label>
                <input
                  type="number"
                  value={newMonthlyLimit}
                  onChange={(e) => setNewMonthlyLimit(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-hidden focus:border-[#002D5A] font-bold"
                />
              </div>
            </div>

            {/* Custom Quota Matrix for CPI Subunits */}
            <div className="pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-black text-[#002D5A] uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4" />
                  Cotas das Unidades Subordinadas do CPI (CPA/I-1 a CPA/I-9 e Direção)
                </h4>
                <span className="text-xs font-bold text-slate-600 font-mono">
                  Total JOEs: {formatInteger(customQuotas.reduce((acc, q) => acc + (Number(q.joes) || 0), 0))} · Total:{' '}
                  {formatCurrencyBRL(customQuotas.reduce((acc, q) => acc + (Number(q.amount) || 0), 0))}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {customQuotas.map((q, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-700 truncate mb-1">
                      {q.unit.replace('Comando de Policiamento de Área do Interior - ', 'CPA/I-')}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={q.joes}
                        onChange={(e) => handleQuotaJoesChange(idx, Number(e.target.value))}
                        className="w-20 text-xs font-mono font-bold rounded-lg border border-slate-300 p-1.5 bg-white text-center"
                      />
                      <span className="text-[11px] font-mono font-bold text-[#002D5A] truncate">
                        {formatCurrencyBRL(q.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateSummary}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Pré-visualizar Resumo das Atribuições</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {saveSuccessMsg && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Portaria cadastrada e resumo ativado!
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveAndActivateOrdinance}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#002D5A] hover:bg-[#001f3f] text-white shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-[#7EC2E8]" />
                  <span>Cadastrar & Ativar como Portaria Vigente</span>
                </button>
              </div>
            </div>
          </div>

          {/* Generated Preview Card */}
          {generatedPreviewSummary && (
            <div className="bg-white rounded-2xl p-6 border-2 border-indigo-300 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-black text-slate-900">
                    Resumo Gerado Automaticamente para: {generatedPreviewSummary.ordinanceNumber}
                  </h3>
                </div>
                <button
                  onClick={() => pdfService.generateCpiSummaryManualPDF(generatedPreviewSummary)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar Este Resumo em PDF</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Vigência</span>
                  <span className="text-xs font-bold text-slate-900">{generatedPreviewSummary.period}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Valor Unitário</span>
                  <span className="text-xs font-bold text-emerald-700">{generatedPreviewSummary.parameters.unitValue}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Total JOEs CPI</span>
                  <span className="text-xs font-bold text-slate-900">{formatInteger(generatedPreviewSummary.totalJoes)}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Cota Financeira CPI</span>
                  <span className="text-xs font-bold text-[#002D5A]">{formatCurrencyBRL(generatedPreviewSummary.totalAmount)}</span>
                </div>
              </div>

              {/* Responsibilities list preview */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-[#002D5A] uppercase block">
                  Atribuições Privativas do CPI Sintetizadas (Art. 13):
                </span>
                <ul className="text-xs text-slate-700 space-y-1.5 pl-4 list-disc">
                  <li><strong>Análise e Autorização Prévia (Art. 1º, § 1º e Art. 13, I):</strong> Avaliar a necessidade e autorizar expressamente os pedidos das 9 CPA/Is.</li>
                  <li><strong>Controle Orçamentário (Art. 13, II):</strong> Limite estrito de {formatCurrencyBRL(generatedPreviewSummary.totalAmount)} para {formatInteger(generatedPreviewSummary.totalJoes)} JOEs.</li>
                  <li><strong>Fiscalização Documental e em Campo (Art. 13, III e IV):</strong> Auditar autos no SEI e verificar execução real por amostragem.</li>
                  <li><strong>Encaminhamento Semanal à Pagadoria (Art. 13, V):</strong> Envio obrigatório às terças-feiras em processo único e planilha única.</li>
                  <li><strong>Comunicação de Irregularidades (Art. 13, VI):</strong> Notificar imediatamente o Comando-Geral ao constatar desvios.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
