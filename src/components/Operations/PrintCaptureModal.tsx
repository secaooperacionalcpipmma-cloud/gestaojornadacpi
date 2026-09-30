import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  X,
  FileText,
  Clock,
  Building2,
  Calendar,
  Users,
  Shield,
  ArrowRight,
  ClipboardPaste,
  HelpCircle,
  Eye,
  Check,
  Database,
  ExternalLink,
  Layers,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { CommandUnit, OperationLaunch, OrdinancePeriod, User } from '../../types';
import { ocrJoeService, ExtractedJoeData, FIELD_LABELS } from '../../services/ocrJoeService';
import { formatCurrencyBRL, formatInteger, formatDateBRL } from '../../utils/formatters';
import { normalizeCommandName } from '../../utils/commandUtils';
import { generateSampleScreenDataUrl, OFFICIAL_EXAMPLE_DATA } from '../../utils/samplePrintGenerator';

interface PrintCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  ordinance: OrdinancePeriod;
  commands: CommandUnit[];
  currentUser: User;
  onSaveOperation: (
    op: OperationLaunch
  ) => Promise<{ success: boolean; syncedWithCloud: boolean; dbError?: string; message?: string } | void> | void;
}

export function PrintCaptureModal({
  isOpen,
  onClose,
  ordinance,
  commands,
  currentUser,
  onSaveOperation,
}: PrintCaptureModalProps) {
  // Modes: 'DROPZONE' | 'PROCESSING' | 'REVIEW' | 'SUCCESS' | 'EXAMPLE_VIEWER'
  const [step, setStep] = useState<'DROPZONE' | 'PROCESSING' | 'REVIEW' | 'SUCCESS' | 'EXAMPLE_VIEWER'>('DROPZONE');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedJoeData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isManualEditOpen, setIsManualEditOpen] = useState(false);
  const [savedOperation, setSavedOperation] = useState<OperationLaunch | null>(null);
  const [sampleScreenUrl, setSampleScreenUrl] = useState<string>('');

  // Editable Form fields for completion or manual edits
  const [formCpa, setFormCpa] = useState<string>('');
  const [formSubUnit, setFormSubUnit] = useState<string>('');
  const [formEventName, setFormEventName] = useState<string>('');
  const [formOrderType, setFormOrderType] = useState<'ORDEM_DE_SERVICO' | 'ORDEM_DE_OPERACAO'>('ORDEM_DE_SERVICO');
  const [formOrderNumber, setFormOrderNumber] = useState<string>('');
  const [formSeiProcessNumber, setFormSeiProcessNumber] = useState<string>('');
  const [formServiceDate, setFormServiceDate] = useState<string>('');
  const [formStartTime, setFormStartTime] = useState<string>('20:00');
  const [formEndTime, setFormEndTime] = useState<string>('02:00');
  const [formOfficersCount, setFormOfficersCount] = useState<number>(5);
  const [formUnitValue, setFormUnitValue] = useState<number>(ordinance.unitValueJoe || 350);
  const [formJustification, setFormJustification] = useState<string>('');
  const [formLocation, setFormLocation] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available subunits for selected CPA
  const selectedCmd = commands.find(
    (c) =>
      normalizeCommandName(c.code) === normalizeCommandName(formCpa) ||
      normalizeCommandName(c.name) === normalizeCommandName(formCpa) ||
      normalizeCommandName(c.id) === normalizeCommandName(formCpa)
  );
  const availableSubunits = selectedCmd ? selectedCmd.subunits : [];

  // Reset modal state when opening
  useEffect(() => {
    if (isOpen) {
      setStep('DROPZONE');
      setPreviewImage(null);
      setExtractedData(null);
      setErrorMessage(null);
      setWarningMessage(null);
      setIsSaving(false);
      setIsManualEditOpen(false);
      setSavedOperation(null);
      try {
        setSampleScreenUrl(generateSampleScreenDataUrl());
      } catch (err) {
        console.warn('Could not generate sample screen:', err);
      }
    }
  }, [isOpen]);

  // Global paste handler when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const file = await ocrJoeService.getImageFromClipboard(e);
      if (file) {
        processImageFile(file);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  // Builds and saves the OperationLaunch directly to DB
  const executeSaveOperation = async (opToSave: OperationLaunch) => {
    try {
      setIsSaving(true);
      await onSaveOperation(opToSave);
      setSavedOperation(opToSave);
      setStep('SUCCESS');
    } catch (err: any) {
      console.error('Error saving operation from print capture:', err);
      setErrorMessage(`Falha ao salvar no banco de dados: ${err.message || 'Erro inesperado'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Process image file through OCR API
  const processImageFile = async (fileOrBlobOrBase64: File | Blob | string) => {
    try {
      setErrorMessage(null);
      setWarningMessage(null);
      setStep('PROCESSING');

      let base64 = '';
      if (typeof fileOrBlobOrBase64 === 'string') {
        base64 = fileOrBlobOrBase64;
      } else {
        base64 = await ocrJoeService.fileToBase64(fileOrBlobOrBase64);
      }
      setPreviewImage(base64);

      const res = await ocrJoeService.extractJoeFromPrint(base64, {
        unitValueJoe: ordinance.unitValueJoe || 350,
        ordinanceNumber: ordinance.number || '127/2026',
      });

      if (!res.success || !res.data) {
        setErrorMessage(res.error || 'Não foi possível analisar o print. Tente uma captura com melhor nitidez ou resolução.');
        setStep('DROPZONE');
        return;
      }

      const data = res.data;
      setExtractedData(data);

      // Pre-fill editable state
      const normCpa = normalizeCommandName(data.commandId || '');
      setFormCpa(normCpa);
      setFormSubUnit(data.subUnit || '');
      setFormEventName(data.eventName || '');
      setFormOrderType(data.orderType || 'ORDEM_DE_SERVICO');
      setFormOrderNumber(data.orderNumber || '');
      setFormSeiProcessNumber(data.seiProcessNumber || '');
      setFormServiceDate(data.serviceDate || new Date().toISOString().split('T')[0]);
      setFormStartTime(data.startTime || '20:00');
      setFormEndTime(data.endTime || '02:00');
      setFormOfficersCount(data.officersCount > 0 ? data.officersCount : 5);
      setFormUnitValue(data.unitValue > 0 ? data.unitValue : (ordinance.unitValueJoe || 350));
      setFormJustification(data.justification || '');
      setFormLocation(data.location || '');

      // Check completeness:
      // Required: CPA, SubUnit, EventName, OrderNumber, SeiProcess, ServiceDate, OfficersCount
      const isActuallyComplete =
        Boolean(normCpa) &&
        Boolean(data.subUnit) &&
        Boolean(data.eventName && data.eventName !== '-') &&
        Boolean(data.orderNumber && data.orderNumber !== '-') &&
        Boolean(data.seiProcessNumber && data.seiProcessNumber !== '-' && data.seiProcessNumber !== '00000') &&
        Boolean(data.serviceDate && data.serviceDate.length >= 8) &&
        Number(data.officersCount) > 0;

      if (isActuallyComplete) {
        // AUTOMATIC LAUNCH & SAVE TO DATABASE as requested by user
        const unitVal = Number(data.unitValue) > 0 ? Number(data.unitValue) : (ordinance.unitValueJoe || 350);
        const officers = Number(data.officersCount) || 1;
        const totalVal = officers * unitVal;

        const newOp: OperationLaunch = {
          id: `op-ocr-${Date.now()}`,
          launchNumber: data.orderNumber || `${Math.floor(10000 + Math.random() * 90000)}`,
          commandId: normCpa,
          subUnit: data.subUnit,
          ordinanceId: ordinance.id || 'ord-127-2026',
          seiProcessNumber: data.seiProcessNumber.trim(),
          orderNumber: data.orderNumber.trim(),
          orderType: data.orderType || 'ORDEM_DE_SERVICO',
          eventName: data.eventName.trim(),
          serviceDate: data.serviceDate,
          startTime: data.startTime || '20:00',
          endTime: data.endTime || '02:00',
          officersCount: officers,
          joesPerOfficer: 1,
          unitValue: unitVal,
          totalValue: totalVal,
          status: 'APROVADO',
          serviceOrderLink: '',
          justification: data.justification || 'Captura de solicitação de JOE realizada via reconhecimento de print com IA.',
          authorizeExcess: false,
          createdBy: `${currentUser.name} (Print OCR IA)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await executeSaveOperation(newOp);
      } else {
        // Missing fields: do NOT auto-save. Warn user and give options to recapture or fill in manually.
        setIsManualEditOpen(true);
        setStep('REVIEW');
        setWarningMessage(
          'O sistema não identificou todos os dados obrigatórios no print. Você pode refazer a captura com uma imagem mais nítida ou digitar os campos faltantes abaixo.'
        );
      }
    } catch (err: any) {
      console.error('Error processing image:', err);
      setErrorMessage(err.message || 'Erro inesperado ao processar o print.');
      setStep('DROPZONE');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Screen capture API fallback (captures the user's active screen/window)
  const handleCaptureScreen = async () => {
    try {
      setErrorMessage(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        setErrorMessage('A captura direta não é suportada neste navegador. Use a tecla PrintScreen e cole diretamente com Ctrl+V.');
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as any,
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Stop stream tracks
      stream.getTracks().forEach((track) => track.stop());

      canvas.toBlob((blob) => {
        if (blob) {
          processImageFile(blob);
        }
      }, 'image/png');
    } catch (err: any) {
      console.warn('Screen capture cancelled or denied:', err);
    }
  };

  // Save operation to database from review/manual fill
  const handleSaveToDatabaseManual = async () => {
    setWarningMessage(null);
    setErrorMessage(null);

    if (!formCpa) {
      setWarningMessage('Por favor, informe ou selecione o Comando de Área (CPA/I).');
      setIsManualEditOpen(true);
      return;
    }
    if (!formSubUnit) {
      setWarningMessage('Por favor, informe a Unidade Policial Militar.');
      setIsManualEditOpen(true);
      return;
    }
    if (!formEventName.trim()) {
      setWarningMessage('Por favor, informe o nome do Evento ou Operação Policial.');
      setIsManualEditOpen(true);
      return;
    }
    if (!formSeiProcessNumber.trim()) {
      setWarningMessage('Por favor, informe o número do Processo SEI.');
      setIsManualEditOpen(true);
      return;
    }
    if (!formOrderNumber.trim()) {
      setWarningMessage('Por favor, informe o número da Ordem de Serviço ou Operação.');
      setIsManualEditOpen(true);
      return;
    }

    const normCpa = normalizeCommandName(formCpa);
    const officers = Math.max(1, Number(formOfficersCount) || 1);
    const unitVal = Number(formUnitValue) > 0 ? Number(formUnitValue) : (ordinance.unitValueJoe || 350);
    const totalVal = officers * unitVal;

    const opToSave: OperationLaunch = {
      id: `op-ocr-${Date.now()}`,
      launchNumber: formOrderNumber.trim(),
      commandId: normCpa,
      subUnit: formSubUnit,
      ordinanceId: ordinance.id || 'ord-127-2026',
      seiProcessNumber: formSeiProcessNumber.trim(),
      orderNumber: formOrderNumber.trim(),
      orderType: formOrderType,
      eventName: formEventName.trim(),
      serviceDate: formServiceDate || new Date().toISOString().split('T')[0],
      startTime: formStartTime.trim() || '20:00',
      endTime: formEndTime.trim() || '02:00',
      officersCount: officers,
      joesPerOfficer: 1,
      unitValue: unitVal,
      totalValue: totalVal,
      status: 'APROVADO',
      serviceOrderLink: '',
      justification: formJustification.trim() || 'Lançamento registrado via captura de print com complementação de dados.',
      authorizeExcess: false,
      createdBy: `${currentUser.name} (Print OCR IA)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await executeSaveOperation(opToSave);
  };

  const handleResetCapture = () => {
    setStep('DROPZONE');
    setPreviewImage(null);
    setExtractedData(null);
    setErrorMessage(null);
    setWarningMessage(null);
    setIsManualEditOpen(false);
    setSavedOperation(null);
  };

  // Test with generated official sample
  const handleTestWithSample = () => {
    try {
      const url = sampleScreenUrl || generateSampleScreenDataUrl();
      processImageFile(url);
    } catch (e: any) {
      setErrorMessage('Falha ao carregar tela de exemplo: ' + e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#002D5A] via-[#003B73] to-[#00204A] text-white p-5 sm:p-6 flex items-center justify-between border-b border-sky-400/20 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-[#7EC2E8] shadow-inner shrink-0">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Captura de Lançamento por Print da Tela (JOE)
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#7EC2E8]" />
                  OCR Inteligente IA
                </span>
              </div>
              <p className="text-xs text-sky-200 mt-0.5">
                Cole (<kbd className="px-1.5 py-0.5 bg-white/20 rounded font-mono font-bold text-white text-[10px]">Ctrl + V</kbd>) ou carregue o print da solicitação de JOE para lançamento e gravação automática no banco de dados.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Subheader Navigation: Capturar vs Analisar Exemplo */}
        <div className="bg-slate-100/80 px-5 sm:px-6 py-2 border-b border-slate-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (step === 'EXAMPLE_VIEWER') setStep('DROPZONE');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                step !== 'EXAMPLE_VIEWER'
                  ? 'bg-white text-[#002D5A] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Capturar Tela / Print</span>
            </button>

            <button
              type="button"
              onClick={() => setStep('EXAMPLE_VIEWER')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                step === 'EXAMPLE_VIEWER'
                  ? 'bg-[#002D5A] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#002D5A] bg-white/50 border border-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Analisar Exemplo de Tela a ser Capturada</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-slate-500 font-medium">
            <span>Portaria Vigente:</span>
            <strong className="text-slate-800">{ordinance.number}</strong>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* BANNER DE ERRO / AVISO */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl flex items-start gap-3 text-rose-900 text-xs sm:text-sm animate-shake">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong className="font-bold">Aviso na Captura:</strong> {errorMessage}
              </div>
              <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-800">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {warningMessage && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3 text-amber-950 text-xs sm:text-sm animate-fadeIn">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong className="font-bold">Atenção:</strong> {warningMessage}
              </div>
              <button onClick={() => setWarningMessage(null)} className="text-amber-600 hover:text-amber-900">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP: EXAMPLE_VIEWER (ANALISAR EXEMPLO DE TELA A SER CAPTURADA) */}
          {step === 'EXAMPLE_VIEWER' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[#002D5A]">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-[#002D5A] text-white shrink-0">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      Exemplo Oficial de Tela a ser Capturada (SEI / PMMA)
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Veja abaixo o modelo exato de documento de Solicitação de JOE que o sistema analisa e extrai com IA.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestWithSample}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
                >
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>Testar Captura com este Exemplo</span>
                </button>
              </div>

              {/* Guia de Campos Reconhecidos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-500 uppercase text-[10px]">1. Processo SEI</div>
                  <div className="font-mono font-bold text-slate-800 truncate mt-0.5">{OFFICIAL_EXAMPLE_DATA.processoSei}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-500 uppercase text-[10px]">2. CPA/I e Unidade</div>
                  <div className="font-bold text-[#002D5A] truncate mt-0.5">{OFFICIAL_EXAMPLE_DATA.cpa} • {OFFICIAL_EXAMPLE_DATA.unidade}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-500 uppercase text-[10px]">3. Ordem de Serviço</div>
                  <div className="font-bold text-slate-800 truncate mt-0.5">{OFFICIAL_EXAMPLE_DATA.ordemServico}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-500 uppercase text-[10px]">4. Efetivo e Valor</div>
                  <div className="font-bold text-emerald-700 truncate mt-0.5">{OFFICIAL_EXAMPLE_DATA.efetivo} JOEs • R$ {OFFICIAL_EXAMPLE_DATA.total.toFixed(2)}</div>
                </div>
              </div>

              {/* Image Preview */}
              <div className="border border-slate-300 rounded-2xl overflow-hidden shadow-lg bg-slate-900">
                <img
                  src={sampleScreenUrl || generateSampleScreenDataUrl()}
                  alt="Exemplo de Tela de Solicitação de JOE do SEI"
                  className="w-full h-auto max-h-[460px] object-contain mx-auto"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('DROPZONE')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar para Captura</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestWithSample}
                  className="px-5 py-2.5 rounded-xl bg-[#002D5A] hover:bg-[#001F3F] text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#7EC2E8]" />
                  <span>Executar Análise Automática deste Exemplo</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: DROPZONE / INPUT */}
          {step === 'DROPZONE' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Drag & Drop Card */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-sky-300 hover:border-[#002D5A] bg-sky-50/50 hover:bg-sky-50/80 rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-4 group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 rounded-2xl bg-white border border-sky-200 shadow-sm flex items-center justify-center text-[#002D5A] group-hover:scale-110 transition-transform">
                  <ClipboardPaste className="w-8 h-8 text-[#002D5A]" />
                </div>

                <div className="space-y-1.5 max-w-md">
                  <h4 className="text-base sm:text-lg font-bold text-slate-900">
                    Cole o print aqui com <kbd className="px-2 py-1 bg-white border border-slate-300 rounded-lg shadow-2xs font-mono font-bold text-slate-800 text-xs">Ctrl + V</kbd>
                  </h4>
                  <p className="text-xs text-slate-600">
                    ou arraste o arquivo do print da tela ou clique para selecionar do computador
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#002D5A] hover:bg-[#001F3F] text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Upload className="w-4 h-4 text-[#7EC2E8]" />
                    <span>Selecionar Arquivo de Imagem</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCaptureScreen();
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold shadow-2xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Camera className="w-4 h-4 text-slate-600" />
                    <span>Capturar da Tela Aberta</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTestWithSample();
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold shadow-2xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                    title="Testar com print de exemplo da PMMA"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Testar com Print de Exemplo</span>
                  </button>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                />
              </div>

              {/* Instructions Banner */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3.5 text-xs text-slate-600">
                <HelpCircle className="w-4 h-4 text-[#002D5A] shrink-0 mt-0.5" />
                <div className="leading-relaxed space-y-1">
                  <p className="font-semibold text-slate-800">
                    Como funciona o lançamento automático por print:
                  </p>
                  <p>
                    1. Capture a tela da solicitação de JOE no SEI (<kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">Win + Shift + S</kbd> no Windows).
                  </p>
                  <p>
                    2. Cole aqui com <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">Ctrl + V</kbd>. O sistema identifica o <strong>CPA/I</strong>, a <strong>Unidade</strong>, o <strong>Processo SEI</strong>, a <strong>Ordem de Serviço</strong>, a <strong>Data</strong>, o <strong>Efetivo</strong> e os <strong>Valores</strong>, salvando tudo automaticamente no banco de dados.
                  </p>
                  <p className="text-slate-500">
                    3. Se o print estiver cortado ou faltar alguma informação, o sistema avisará imediatamente para refazer ou digitar apenas o que faltou.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PROCESSING / AI OCR SCANNING */}
          {step === 'PROCESSING' && (
            <div className="py-12 px-4 flex flex-col items-center justify-center space-y-6 text-center animate-fadeIn">
              <div className="relative">
                {previewImage && (
                  <div className="w-48 h-48 rounded-2xl overflow-hidden border-2 border-sky-400 shadow-xl relative bg-slate-900">
                    <img
                      src={previewImage}
                      alt="Print em análise"
                      className="w-full h-full object-cover opacity-70"
                    />
                    {/* Glowing scanning laser bar */}
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#7EC2E8] to-transparent shadow-[0_0_15px_#7EC2E8] animate-bounce" />
                  </div>
                )}
                <div className="absolute -bottom-3 -right-3 p-2.5 rounded-2xl bg-[#002D5A] text-[#7EC2E8] shadow-lg border border-sky-400/40 animate-pulse">
                  <Sparkles className="w-6 h-6" />
                </div>
              </div>

              <div className="space-y-1.5 max-w-sm">
                <h4 className="text-base font-bold text-slate-900 flex items-center justify-center gap-2">
                  <span>Analisando print e gravando no banco...</span>
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Extraindo CPA/I pertencente, Unidade Policial, Processo SEI, Ordem de Serviço, Efetivo e calculando os Valores oficiais.
                </p>
              </div>

              <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#002D5A] via-teal-600 to-[#7EC2E8] animate-pulse rounded-full w-full" />
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW / WARNING WHEN SOMETHING IS MISSING */}
          {step === 'REVIEW' && extractedData && (
            <div className="space-y-5 animate-fadeIn">
              {/* Mandatory fields alert banner */}
              <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5 shadow-sm">
                    <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-amber-900">
                      Atenção: O sistema não conseguiu capturar todas as informações necessárias no print!
                    </h4>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      Conforme solicitado, você deve <strong>refazer a captura</strong> com uma imagem mais legível ou <strong>digitar o que está faltando</strong> no formulário abaixo:
                    </p>
                    {extractedData.missingFields.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {extractedData.missingFields.map((field) => (
                          <span
                            key={field}
                            className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300"
                          >
                            Falta: {FIELD_LABELS[field] || field}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={handleResetCapture}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Refazer Captura</span>
                  </button>
                </div>
              </div>

              {/* Grid: Preview & Editable Form */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left: Thumbnail & Document Preview */}
                <div className="lg:col-span-4 space-y-3">
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-900 shadow-sm relative group">
                    {previewImage && (
                      <img
                        src={previewImage}
                        alt="Print capturado"
                        className="w-full h-56 sm:h-64 object-contain"
                      />
                    )}
                    <div className="p-2.5 bg-slate-900/90 text-white text-[11px] font-medium flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-300">
                        <Eye className="w-3.5 h-3.5" />
                        Print Capturado
                      </span>
                      <button
                        onClick={handleResetCapture}
                        className="text-xs text-sky-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Trocar Print
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                    <div className="text-slate-500 font-bold uppercase text-[10px]">
                      Portaria em Vigor de Vinculação:
                    </div>
                    <div className="font-bold text-[#002D5A] flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#7EC2E8]" />
                      <span>{ordinance.name || ordinance.number}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Complementing Form */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-300 space-y-4">
                    <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-[#002D5A]" />
                        <span>Preencha ou Ajuste o que está faltando para Salvar:</span>
                      </div>
                      <span className="text-[11px] font-semibold text-amber-700">
                        * Campos obrigatórios
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* CPA/I Select */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Comando de Área (CPA/I) *
                        </label>
                        <select
                          value={formCpa}
                          onChange={(e) => {
                            setFormCpa(e.target.value);
                            const cmd = commands.find(
                              (c) => normalizeCommandName(c.code) === normalizeCommandName(e.target.value)
                            );
                            if (cmd && cmd.subunits.length > 0) {
                              setFormSubUnit(cmd.subunits[0]);
                            }
                          }}
                          className={`w-full bg-white border rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] ${
                            !formCpa ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300' : 'border-slate-300'
                          }`}
                        >
                          <option value="">Selecione o CPA/I</option>
                          {commands.map((cmd) => (
                            <option key={cmd.id} value={cmd.code}>
                              {cmd.code}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Unidade Select / Text */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Unidade Subordinada *
                        </label>
                        {availableSubunits.length > 0 ? (
                          <select
                            value={formSubUnit}
                            onChange={(e) => setFormSubUnit(e.target.value)}
                            className={`w-full bg-white border rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] ${
                              !formSubUnit ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300' : 'border-slate-300'
                            }`}
                          >
                            <option value="">Selecione a Unidade</option>
                            {availableSubunits.map((sub) => (
                              <option key={sub} value={sub}>
                                {sub}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={formSubUnit}
                            onChange={(e) => setFormSubUnit(e.target.value)}
                            placeholder="Ex: 2º BPM, 10º BPM"
                            className={`w-full bg-white border rounded-xl px-3 py-2 text-xs font-medium text-slate-800 ${
                              !formSubUnit ? 'border-amber-400 bg-amber-50' : 'border-slate-300'
                            }`}
                          />
                        )}
                      </div>

                      {/* Processo SEI */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Processo SEI *
                        </label>
                        <input
                          type="text"
                          value={formSeiProcessNumber}
                          onChange={(e) => setFormSeiProcessNumber(e.target.value)}
                          placeholder="Ex: 2026.190110.37509"
                          className={`w-full bg-white border rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 ${
                            !formSeiProcessNumber ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300' : 'border-slate-300'
                          }`}
                        />
                      </div>

                      {/* Ordem de Serviço */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Ordem de Serviço / Operação *
                        </label>
                        <div className="flex gap-1.5">
                          <select
                            value={formOrderType}
                            onChange={(e) => setFormOrderType(e.target.value as any)}
                            className="w-20 bg-white border border-slate-300 rounded-xl px-2 py-2 text-xs font-bold text-slate-800"
                          >
                            <option value="ORDEM_DE_SERVICO">OS</option>
                            <option value="ORDEM_DE_OPERACAO">OO</option>
                          </select>
                          <input
                            type="text"
                            value={formOrderNumber}
                            onChange={(e) => setFormOrderNumber(e.target.value)}
                            placeholder="Ex: 142/2026"
                            className={`flex-1 bg-white border rounded-xl px-3 py-2 text-xs font-medium text-slate-800 ${
                              !formOrderNumber ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300' : 'border-slate-300'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Evento */}
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Nome do Evento / Operação *
                        </label>
                        <input
                          type="text"
                          value={formEventName}
                          onChange={(e) => setFormEventName(e.target.value)}
                          placeholder="Ex: Operação Cidade Segura"
                          className={`w-full bg-white border rounded-xl px-3 py-2 text-xs font-bold text-slate-800 ${
                            !formEventName ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300' : 'border-slate-300'
                          }`}
                        />
                      </div>

                      {/* Data do Serviço */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Data do Serviço *
                        </label>
                        <input
                          type="date"
                          value={formServiceDate}
                          onChange={(e) => setFormServiceDate(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800"
                        />
                      </div>

                      {/* Efetivo JOEs */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Efetivo (Nº de JOEs) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formOfficersCount}
                          onChange={(e) => setFormOfficersCount(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-800"
                        />
                      </div>

                      {/* Valores Preview */}
                      <div className="sm:col-span-2 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-900">
                          Total Calculado: {formatInteger(formOfficersCount)} JOEs × {formatCurrencyBRL(formUnitValue)}
                        </span>
                        <span className="font-black text-emerald-800 text-sm font-mono">
                          = {formatCurrencyBRL(formOfficersCount * formUnitValue)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveToDatabaseManual}
                        disabled={isSaving}
                        className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        <span>{isSaving ? 'Gravando no Banco...' : 'Gravar no Banco de Dados Agora'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS - AUTO-SAVED CELEBRATION */}
          {step === 'SUCCESS' && savedOperation && (
            <div className="py-6 px-2 sm:px-6 space-y-6 text-center animate-fadeIn">
              <div className="mx-auto w-16 h-16 rounded-3xl bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center text-emerald-700 shadow-lg animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2 max-w-lg mx-auto">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold">
                  <Database className="w-3.5 h-3.5" />
                  <span>Salvo Automaticamente no Banco de Dados</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  Lançamento de JOE Registrado com Sucesso!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  As informações foram capturadas diretamente do print da solicitação e gravadas no banco de dados.
                </p>
              </div>

              {/* Summary Card with all extracted data */}
              <div className="max-w-xl mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left shadow-xs space-y-3">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center justify-between">
                  <span>Dados Gravados do Lançamento</span>
                  <span className="font-mono text-emerald-700 font-bold">{savedOperation.orderNumber}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">CPA/I Pertencente</span>
                    <strong className="text-slate-900 font-bold text-sm">{savedOperation.commandId}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Unidade Solicitante</span>
                    <strong className="text-slate-900 font-bold text-sm">{savedOperation.subUnit}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Evento / Operação</span>
                    <strong className="text-[#002D5A] font-bold text-sm">{savedOperation.eventName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Processo SEI</span>
                    <span className="font-mono font-bold text-slate-800">{savedOperation.seiProcessNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Data do Serviço</span>
                    <span className="font-bold text-slate-800">{formatDateBRL(savedOperation.serviceDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Efetivo de JOEs</span>
                    <strong className="font-bold text-slate-900 font-mono">{formatInteger(savedOperation.officersCount)} policiais</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Valor Total Gravado</span>
                    <strong className="font-bold text-emerald-700 font-mono text-sm">{formatCurrencyBRL(savedOperation.totalValue)}</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-[#002D5A] hover:bg-[#001F3F] text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Concluir e Voltar aos Lançamentos</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetCapture}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Capturar Outro Print</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            {step === 'SUCCESS' ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Registro gravado e sincronizado no sistema
              </span>
            ) : (
              <span>Formatos aceitos: Print de tela recortado, PNG, JPG, JPEG, WebP</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
