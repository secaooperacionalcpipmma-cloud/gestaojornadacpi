import React, { useState, useEffect, useRef } from 'react';
import {
  Cloud,
  CloudCheck,
  CloudUpload,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  Database,
  History,
  HardDrive,
  Shield,
  Layers,
  ArrowRight,
  X,
  FileCheck,
  Calendar,
  Lock,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  googleDriveBackupService,
} from '../../services/googleDriveBackupService';
import {
  User,
  SystemBackupPayload,
  DriveBackupFileMeta,
  DriveSyncStatus,
} from '../../types';
import { storageService } from '../../services/storageService';
import { supabaseService, SupabaseSyncStatus } from '../../services/supabaseService';

interface BackupManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onDataRestored: () => void;
}

export function BackupManagerModal({
  isOpen,
  onClose,
  currentUser,
  onDataRestored,
}: BackupManagerModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'DRIVE' | 'SUPABASE' | 'IMPORT_FILE' | 'DRIVE_HISTORY'>('DRIVE');
  const [driveStatus, setDriveStatus] = useState<DriveSyncStatus>(googleDriveBackupService.getStatus());
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseSyncStatus>(supabaseService.getStatus());
  const [isSyncingSupabase, setIsSyncingSupabase] = useState<boolean>(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(
    googleDriveBackupService.getLastBackupTime()
  );
  const [isAutoBackup, setIsAutoBackup] = useState<boolean>(googleDriveBackupService.isAutoBackup());
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [driveBackups, setDriveBackups] = useState<DriveBackupFileMeta[]>([]);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(
    null
  );

  // File import state
  const [parsedFileBackup, setParsedFileBackup] = useState<SystemBackupPayload | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importMode, setImportMode] = useState<'REPLACE_ALL' | 'MERGE'>('REPLACE_ALL');
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drive restore state
  const [restoringDriveFileId, setRestoringDriveFileId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribeDrive = googleDriveBackupService.onStatusChange((status, time) => {
      setDriveStatus(status);
      setLastBackupTime(time);
    });

    const unsubscribeSupa = supabaseService.onStatusChange((status) => {
      setSupabaseStatus(status);
    });

    setIsAutoBackup(googleDriveBackupService.isAutoBackup());

    if (googleDriveBackupService.isConnected()) {
      fetchDriveHistory();
    }

    return () => {
      unsubscribeDrive();
      unsubscribeSupa();
    };
  }, [isOpen]);

  const handleSyncToSupabase = async () => {
    try {
      setIsSyncingSupabase(true);
      const backupData = storageService.exportFullBackup(currentUser);
      const res = await supabaseService.syncAllToSupabase({
        users: backupData.users,
        commands: backupData.commands,
        ordinances: backupData.ordinances,
        budgets: backupData.budgets,
        officers: backupData.officers,
        operations: backupData.operations,
        batches: backupData.batches,
        irregularities: backupData.irregularities,
        auditLogs: backupData.auditLogs,
      });

      if (res.success) {
        showFeedback('success', 'Todos os dados locais foram sincronizados com o Supabase com sucesso!');
      } else {
        showFeedback('error', res.message || 'Falha ao sincronizar com o Supabase.');
      }
    } catch (e: any) {
      showFeedback('error', e.message || 'Erro de conexão com o Supabase.');
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  const handlePullFromSupabase = async () => {
    try {
      setIsSyncingSupabase(true);
      const res = await supabaseService.bootstrapInitialData();
      if (res.loadedFromSupabase) {
        if (res.operations) {
          (storageService as any).set('cpi_pmma_operations_v4', res.operations, true);
        }
        if (res.ordinances) {
          (storageService as any).set('cpi_pmma_ordinances_v4', res.ordinances, true);
        }
        if (res.budgets) {
          (storageService as any).set('cpi_pmma_budgets_v4', res.budgets, true);
        }
        if (res.users) {
          (storageService as any).set('cpi_pmma_users_v4', res.users, true);
        }
        if (res.auditLogs) {
          (storageService as any).set('cpi_pmma_audit_logs_v4', res.auditLogs, true);
        }
        (storageService as any).notifyChange('SUPABASE_PULL');
        onDataRestored();
        showFeedback('success', 'Dados atualizados a partir do banco de dados Supabase!');
      } else {
        showFeedback('info', 'Banco Supabase conectado, mas sem dados adicionais.');
      }
    } catch (e: any) {
      showFeedback('error', e.message || 'Falha ao carregar do Supabase.');
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  const showFeedback = (type: 'success' | 'error' | 'info', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 6000);
  };

  const handleConnectDrive = async () => {
    try {
      setIsUploading(true);
      await googleDriveBackupService.requestAuthorization(true);
      showFeedback(
        'success',
        `Google Drive conectado com sucesso para a conta ${googleDriveBackupService.getTargetEmail()}!`
      );
      fetchDriveHistory();
    } catch (err: any) {
      showFeedback('error', err.message || 'Não foi possível conectar ao Google Drive.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualBackupToDrive = async () => {
    try {
      setIsUploading(true);
      const res = await googleDriveBackupService.uploadBackupToDrive(currentUser, true);
      if (res.success) {
        showFeedback('success', `Backup salvo com sucesso no Google Drive (${res.fileName})!`);
        fetchDriveHistory();
      } else {
        showFeedback('error', res.message || 'Falha ao salvar no Google Drive.');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro durante o upload.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleAutoBackup = (enabled: boolean) => {
    setIsAutoBackup(enabled);
    googleDriveBackupService.setAutoBackup(enabled);
    if (enabled && !googleDriveBackupService.isConnected()) {
      handleConnectDrive();
    }
  };

  const fetchDriveHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await googleDriveBackupService.listDriveBackups();
      if (res.success) {
        setDriveBackups(res.files);
      } else if (res.message) {
        console.warn(res.message);
      }
    } catch (err) {
      console.warn('Erro ao carregar histórico do drive:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        googleDriveBackupService.validateBackupPayload(parsed);
        setParsedFileBackup(parsed);
        showFeedback('info', `Arquivo "${file.name}" carregado e validado. Verifique os dados abaixo para confirmar a restauração.`);
      } catch (err: any) {
        setParsedFileBackup(null);
        showFeedback('error', err.message || 'Arquivo JSON inválido ou incompatível.');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmFileRestore = () => {
    if (!parsedFileBackup) return;

    if (
      importMode === 'REPLACE_ALL' &&
      !window.confirm(
        'ATENÇÃO: A restauração total irá substituir os dados atuais pelos dados deste backup. Deseja prosseguir?'
      )
    ) {
      return;
    }

    setIsRestoring(true);
    try {
      const res = googleDriveBackupService.restoreBackup(parsedFileBackup, currentUser, importMode);
      if (res.success) {
        showFeedback('success', res.message);
        onDataRestored();
        setTimeout(() => {
          setParsedFileBackup(null);
          setImportFileName('');
        }, 1200);
      } else {
        showFeedback('error', res.message);
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro durante a restauração.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRestoreFromDriveFile = async (file: DriveBackupFileMeta) => {
    if (
      !window.confirm(
        `Deseja restaurar o banco de dados a partir do backup "${file.name}" do Google Drive?`
      )
    ) {
      return;
    }

    setRestoringDriveFileId(file.id);
    try {
      const res = await googleDriveBackupService.downloadDriveBackupContent(file.id);
      if (res.success && res.payload) {
        const restoreRes = googleDriveBackupService.restoreBackup(
          res.payload,
          currentUser,
          'REPLACE_ALL'
        );
        if (restoreRes.success) {
          showFeedback('success', `Restauração do Google Drive concluída com sucesso!`);
          onDataRestored();
        } else {
          showFeedback('error', restoreRes.message);
        }
      } else {
        showFeedback('error', res.message || 'Falha ao baixar arquivo do Drive.');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao restaurar do Drive.');
    } finally {
      setRestoringDriveFileId(null);
    }
  };

  if (!isOpen) return null;

  const currentPayload = googleDriveBackupService.generateBackupPayload(currentUser);
  const isDriveConnected = googleDriveBackupService.isConnected();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#002D5A] to-sky-600 flex items-center justify-center text-white shadow-md">
              <Cloud className="w-6 h-6 text-sky-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase text-[#002D5A] tracking-wider">
                  Segurança & Continuidade
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Google Drive Integrado
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">
                Central de Backup & Restauração do Sistema
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-2.5 animate-in fade-in ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : feedbackMsg.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-sky-50 border-sky-200 text-sky-900'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : feedbackMsg.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">{feedbackMsg.text}</div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('DRIVE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'DRIVE'
                ? 'bg-[#002D5A] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Google Drive Automático</span>
          </button>

          <button
            onClick={() => setActiveSubTab('SUPABASE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'SUPABASE'
                ? 'bg-[#002D5A] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Supabase Cloud DB</span>
          </button>

          <button
            onClick={() => setActiveSubTab('IMPORT_FILE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'IMPORT_FILE'
                ? 'bg-[#002D5A] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Importar Backup (.json)</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('DRIVE_HISTORY');
              fetchDriveHistory();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'DRIVE_HISTORY'
                ? 'bg-[#002D5A] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Histórico no Google Drive ({driveBackups.length})</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* SUBTAB 0: SUPABASE CLOUD DATABASE */}
        {/* ========================================================================= */}
        {activeSubTab === 'SUPABASE' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Supabase Status Banner */}
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 rounded-2xl p-5 border border-emerald-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-950">
                      Banco de Dados em Nuvem (PostgreSQL)
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        supabaseStatus === 'CONNECTED'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : supabaseStatus === 'SYNCING'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                          : 'bg-rose-100 text-rose-900 border border-rose-300'
                      }`}
                    >
                      <Database className="w-3 h-3" />
                      {supabaseStatus === 'CONNECTED'
                        ? 'Supabase Conectado'
                        : supabaseStatus === 'SYNCING'
                        ? 'Sincronizando...'
                        : 'Aguardando Configuração'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900">
                    https://aflnzikfjeadlvpyoear.supabase.co
                  </p>
                  <p className="text-xs text-slate-600">
                    Sincronização bidirecional em tempo real para operações, tetos, portarias, policiais e trilha de auditoria com persistência direta no PostgreSQL.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleSyncToSupabase}
                    disabled={isSyncingSupabase}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Upload className={`w-4 h-4 ${isSyncingSupabase ? 'animate-spin' : ''}`} />
                    <span>{isSyncingSupabase ? 'Enviando ao Supabase...' : 'Subir Tudo para Supabase'}</span>
                  </button>

                  <button
                    onClick={handlePullFromSupabase}
                    disabled={isSyncingSupabase}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-98"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncingSupabase ? 'animate-spin' : ''}`} />
                    <span>Recarregar do Supabase</span>
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm('Deseja limpar todos os dados fictícios locais e manter apenas o banco de dados real?')) {
                        storageService.resetToCleanState();
                      }
                    }}
                    className="px-3 py-2.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-98"
                    title="Limpa cache de demonstração e recarrega"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Limpar Dados Fictícios</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Supabase Schema & Tables Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <div className="text-[11px] font-bold text-slate-500 uppercase">Tabelas Ativas</div>
                <div className="text-xl font-black text-slate-800 mt-1">10</div>
                <div className="text-[10px] text-slate-500">PostgreSQL Schema</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <div className="text-[11px] font-bold text-slate-500 uppercase">Operações JOE</div>
                <div className="text-xl font-black text-slate-800 mt-1">{currentPayload.data.operations.length}</div>
                <div className="text-[10px] text-slate-500">Lançamentos cadastrados</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <div className="text-[11px] font-bold text-slate-500 uppercase">Portarias</div>
                <div className="text-xl font-black text-slate-800 mt-1">{currentPayload.data.ordinances.length}</div>
                <div className="text-[10px] text-slate-500">Períodos de vigência</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <div className="text-[11px] font-bold text-slate-500 uppercase">Políticas RLS</div>
                <div className="text-xl font-black text-emerald-700 mt-1">Ativas</div>
                <div className="text-[10px] text-emerald-600">Leitura/Escrita Liberadas</div>
              </div>
            </div>

            {/* Instructions box */}
            <div className="bg-sky-50/60 border border-sky-200 rounded-xl p-4 space-y-2">
              <div className="text-xs font-bold text-[#002D5A] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Como funciona a integração com Supabase:</span>
              </div>
              <ul className="text-xs text-slate-700 space-y-1 pl-5 list-disc">
                <li>Todos os lançamentos, edições de cotas e novas portarias salvam <strong>diretamente nas tabelas do Supabase</strong>.</li>
                <li>Ao inicializar o sistema em qualquer navegador, os dados mais recentes são carregados da nuvem.</li>
                <li>O botão <strong>"Subir Tudo para Supabase"</strong> força a gravação em massa de todos os dados do sistema nas tabelas remotas.</li>
              </ul>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUBTAB 1: GOOGLE DRIVE AUTO-BACKUP */}
        {/* ========================================================================= */}
        {activeSubTab === 'DRIVE' && (
          <div className="space-y-4">
            {/* Account & Sync Status Banner */}
            <div className="bg-gradient-to-r from-sky-50 to-indigo-50/50 rounded-2xl p-4 border border-sky-200/70">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-sky-900">
                      Conta Oficial de Armazenamento
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isDriveConnected
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isDriveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                        }`}
                      ></span>
                      {isDriveConnected ? 'Conectado & Autorizado' : 'Requer Autorização'}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5 font-mono">
                    <span>{googleDriveBackupService.getTargetEmail()}</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Pasta de Destino no Google Drive:{' '}
                    <strong className="text-slate-800 font-mono">BACKUP_SISTEMA_JOE_CPI_PMMA</strong>
                  </p>
                </div>

                {!isDriveConnected ? (
                  <button
                    onClick={handleConnectDrive}
                    disabled={isUploading}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#002D5A] hover:bg-[#001F3F] text-white shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
                  >
                    <CloudUpload className="w-4 h-4 text-sky-300" />
                    <span>{isUploading ? 'Conectando...' : 'Conectar Google Drive'}</span>
                  </button>
                ) : (
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 block">Último backup salvo:</span>
                    <span className="text-xs font-bold text-slate-800">
                      {lastBackupTime || 'Nenhum nesta sessão'}
                    </span>
                  </div>
                )}
              </div>

              {/* Auto-Backup Toggle */}
              <div className="mt-3.5 pt-3 border-t border-sky-200/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoBackupToggle"
                    checked={isAutoBackup}
                    onChange={(e) => handleToggleAutoBackup(e.target.checked)}
                    className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
                  />
                  <label
                    htmlFor="autoBackupToggle"
                    className="text-xs font-bold text-slate-800 cursor-pointer select-none"
                  >
                    Salvar backup automaticamente no Google Drive toda vez que houver novos dados ou alterações
                  </label>
                </div>

                <span className="text-[11px] font-semibold text-sky-800 hidden sm:inline">
                  {isAutoBackup ? '✓ Ativado' : 'Desativado'}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Immediate Drive Upload */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 hover:border-sky-300 transition-all flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#002D5A]">
                    <CloudUpload className="w-4 h-4 text-sky-600" />
                    <span>Salvar Backup Imediato no Google Drive</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Gera um snapshot completo de todas as portarias, lançamentos de JOE, tetos e usuários e envia para o Google Drive agora.
                  </p>
                </div>

                <button
                  onClick={handleManualBackupToDrive}
                  disabled={isUploading}
                  className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-[#002D5A] hover:bg-[#001F3F] text-white shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Gravando no Google Drive...</span>
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-3.5 h-3.5 text-sky-300" />
                      <span>Fazer Backup Agora</span>
                    </>
                  )}
                </button>
              </div>

              {/* Local Offline JSON Download */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 hover:border-sky-300 transition-all flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>Baixar Arquivo JSON (Backup Local)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Salva o arquivo <code className="font-mono font-semibold">.json</code> no seu computador para arquivamento externo ou transferência manual.
                  </p>
                </div>

                <button
                  onClick={() => googleDriveBackupService.downloadLocalBackupFile(currentUser)}
                  className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <FileJson className="w-3.5 h-3.5 text-slate-600" />
                  <span>Baixar Arquivo .JSON</span>
                </button>
              </div>
            </div>

            {/* Current Database Summary Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-slate-500" />
                  Volume Atual de Registros a Serem Salvos
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Gerado em: {new Date().toLocaleTimeString('pt-BR')}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Lançamentos de JOE</div>
                  <div className="text-sm font-black text-slate-900">
                    {currentPayload.summary.operationsCount}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Portarias Regulamentadas</div>
                  <div className="text-sm font-black text-slate-900">
                    {currentPayload.summary.ordinancesCount}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Tetos Orçamentários</div>
                  <div className="text-sm font-black text-slate-900">
                    {currentPayload.summary.budgetsCount}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Usuários do Sistema</div>
                  <div className="text-sm font-black text-slate-900">
                    {currentPayload.summary.usersCount}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUBTAB 2: IMPORT BACKUP FILE (.JSON) */}
        {/* ========================================================================= */}
        {activeSubTab === 'IMPORT_FILE' && (
          <div className="space-y-4">
            {/* File Upload Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-sky-300 hover:border-[#002D5A] bg-sky-50/40 hover:bg-sky-50/80 rounded-2xl p-6 text-center transition-all cursor-pointer space-y-2"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".json,application/json"
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-sky-200 flex items-center justify-center mx-auto text-sky-600">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800">
                  Clique aqui ou arraste um arquivo de backup (.json)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Formatos aceitos: arquivos JSON gerados pelo próprio Sistema de Controle de JOE
                </p>
              </div>
            </div>

            {/* Parsed Preview Card */}
            {parsedFileBackup && (
              <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-xs space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {importFileName}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    Formato Validado ✓
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Operações</div>
                    <div className="text-sm font-bold text-slate-800">
                      {parsedFileBackup.summary?.operationsCount ?? parsedFileBackup.data?.operations?.length ?? 0}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Portarias</div>
                    <div className="text-sm font-bold text-slate-800">
                      {parsedFileBackup.summary?.ordinancesCount ?? parsedFileBackup.data?.ordinances?.length ?? 0}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Tetos/Cotas</div>
                    <div className="text-sm font-bold text-slate-800">
                      {parsedFileBackup.summary?.budgetsCount ?? parsedFileBackup.data?.budgets?.length ?? 0}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Usuários</div>
                    <div className="text-sm font-bold text-slate-800">
                      {parsedFileBackup.summary?.usersCount ?? parsedFileBackup.data?.users?.length ?? 0}
                    </div>
                  </div>
                </div>

                {/* Import Mode Selection */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-800 block">
                    Modo de Inserção no Banco de Dados:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label
                      className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                        importMode === 'REPLACE_ALL'
                          ? 'border-[#002D5A] bg-sky-50/50 ring-1 ring-[#002D5A]'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'REPLACE_ALL'}
                        onChange={() => setImportMode('REPLACE_ALL')}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Restauração Completa (Substituir Tudo)
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Substitui o estado do banco exatamente pela cópia deste backup.
                        </div>
                      </div>
                    </label>

                    <label
                      className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                        importMode === 'MERGE'
                          ? 'border-[#002D5A] bg-sky-50/50 ring-1 ring-[#002D5A]'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'MERGE'}
                        onChange={() => setImportMode('MERGE')}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Mesclagem Incremental
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Preserva registros atuais e adiciona novos registros que não existam.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleConfirmFileRestore}
                    disabled={isRestoring}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#002D5A] hover:bg-[#001F3F] text-white shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    {isRestoring ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Restaurando Banco de Dados...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Confirmar e Importar Backup</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUBTAB 3: GOOGLE DRIVE BACKUPS HISTORY */}
        {/* ========================================================================= */}
        {activeSubTab === 'DRIVE_HISTORY' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Backups encontrados no Google Drive ({googleDriveBackupService.getTargetEmail()}):
              </span>
              <button
                onClick={fetchDriveHistory}
                disabled={isLoadingHistory}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#002D5A] hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 text-sky-600 animate-spin" />
                <span>Consultando backups no Google Drive...</span>
              </div>
            ) : driveBackups.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-2">
                <Cloud className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="font-semibold text-slate-700">Nenhum backup encontrado nesta pasta do Google Drive.</p>
                <p className="text-[11px]">
                  Clique na aba "Google Drive Automático" e selecione "Fazer Backup Agora" para criar o primeiro ponto de restauração.
                </p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2 divide-y divide-slate-100">
                {driveBackups.map((file) => (
                  <div
                    key={file.id}
                    className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <FileJson className="w-4 h-4 text-sky-600 shrink-0" />
                        <span className="text-xs font-bold text-slate-900">{file.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 pl-6">
                        <span>Data: {new Date(file.createdTime).toLocaleString('pt-BR')}</span>
                        {file.size && <span>Tamanho: {file.size}</span>}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRestoreFromDriveFile(file)}
                      disabled={restoringDriveFileId === file.id}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#002D5A] hover:bg-[#001F3F] text-white shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0 self-end sm:self-center"
                    >
                      {restoringDriveFileId === file.id ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Restaurando...</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 text-sky-300" />
                          <span>Restaurar deste Backup</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Dados protegidos por criptografia e controle de acesso estrito.</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function RotateCcw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
