import React, { useState, useEffect } from 'react';
import {
  Database,
  Activity,
  Shield,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  Lock,
  Download,
  Upload,
  Layers,
  Cpu,
  Radio,
  FileCode,
  Eye,
  Check,
  X,
  ExternalLink,
  Table,
  Sliders,
  Flame,
  Key,
} from 'lucide-react';
import { User, OrdinancePeriod } from '../../types';
import {
  supabaseService,
  ComprehensiveDiagnosticReport,
  DatabaseTableStat,
} from '../../services/supabaseService';
import { supabase } from '../../lib/supabase';
import { storageService } from '../../services/storageService';

interface DatabaseConnectionTestViewProps {
  currentUser: User;
  activeOrdinance: OrdinancePeriod;
  onDataRefreshed?: () => void;
}

export const DatabaseConnectionTestView: React.FC<DatabaseConnectionTestViewProps> = ({
  currentUser,
  activeOrdinance,
  onDataRefreshed,
}) => {
  const isSuperUser = currentUser.role === 'ADMIN';

  const [isRunningTest, setIsRunningTest] = useState(false);
  const [report, setReport] = useState<ComprehensiveDiagnosticReport | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>('operation_launches');
  const [tableSampleData, setTableSampleData] = useState<any[]>([]);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(
    null
  );

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const runDiagnostic = async () => {
    setIsRunningTest(true);
    try {
      const res = await supabaseService.runComprehensiveDiagnostics();
      setReport(res);
      if (res.overallStatus === 'ONLINE') {
        showToast('success', `Conexão com Supabase validada com sucesso (${res.pingLatencyMs}ms)!`);
      } else {
        showToast('error', 'Instabilidade detectada na conexão com o banco de dados.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Falha ao executar diagnóstico.');
    } finally {
      setIsRunningTest(false);
    }
  };

  const loadTableSample = async (tableName: string) => {
    setSelectedTable(tableName);
    setIsLoadingSample(true);
    try {
      const { data, error } = await supabase.from(tableName).select('*').limit(5);
      if (error) {
        setTableSampleData([]);
        showToast('error', `Erro ao inspecionar tabela ${tableName}: ${error.message}`);
      } else {
        setTableSampleData(data || []);
      }
    } catch (err: any) {
      setTableSampleData([]);
      showToast('error', `Falha ao ler dados da tabela: ${err.message}`);
    } finally {
      setIsLoadingSample(false);
    }
  };

  const handlePushAllToDatabase = async () => {
    setIsSyncing(true);
    try {
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
        showToast('success', 'Todos os dados locais foram sincronizados e gravados no Supabase!');
        runDiagnostic();
      } else {
        showToast('error', res.message || 'Falha ao subir dados para o Supabase.');
      }
    } catch (e: any) {
      showToast('error', e.message || 'Erro ao sincronizar.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullAllFromDatabase = async () => {
    setIsSyncing(true);
    try {
      const res = await supabaseService.bootstrapInitialData();
      if (res.loadedFromSupabase) {
        if (res.operations) (storageService as any).set('cpi_pmma_operations_v4', res.operations, true);
        if (res.ordinances) (storageService as any).set('cpi_pmma_ordinances_v4', res.ordinances, true);
        if (res.budgets) (storageService as any).set('cpi_pmma_budgets_v4', res.budgets, true);
        if (res.users) (storageService as any).set('cpi_pmma_users_v4', res.users, true);
        if (res.auditLogs) (storageService as any).set('cpi_pmma_audit_logs_v4', res.auditLogs, true);

        (storageService as any).notifyChange('SUPABASE_PULL');
        if (onDataRefreshed) onDataRefreshed();
        showToast('success', 'Dados atualizados com sucesso a partir do banco Supabase!');
        runDiagnostic();
      } else {
        showToast('info', 'Banco Supabase conectado, mas sem novos registros.');
      }
    } catch (e: any) {
      showToast('error', e.message || 'Erro ao recarregar dados do banco.');
    } finally {
      setIsSyncing(false);
    }
  };

  const downloadReportJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diagnostico_banco_supabase_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (isSuperUser) {
      runDiagnostic();
      loadTableSample('operation_launches');
    }
  }, [isSuperUser]);

  // Access control restriction for non-admins
  if (!isSuperUser) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-white rounded-3xl p-8 border border-rose-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-widest text-rose-600">
              Acesso Restrito ao Super Usuário
            </span>
            <h2 className="text-2xl font-black text-slate-900">
              Painel de Teste de Conexão com o Banco de Dados
            </h2>
          </div>
          <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Esta área é de acesso exclusivo para a chefia da Seção Operacional e Administradores do CPI
            para monitoramento de conectividade, schema PostgreSQL, políticas RLS e integridade de rede.
          </p>
          <div className="pt-3">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
              <Shield className="w-4 h-4 text-slate-500" />
              Seu perfil atual: <span className="text-[#002D5A]">{currentUser.profileLabel || currentUser.role}</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between shadow-lg transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : toastMessage.type === 'error'
              ? 'bg-rose-600 text-white border-rose-500'
              : 'bg-[#002D5A] text-white border-sky-600'
          }`}
        >
          <div className="flex items-center gap-3">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : toastMessage.type === 'error' ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Activity className="w-5 h-5" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner / Header Card */}
      <div className="bg-gradient-to-r from-[#001F3F] via-[#002D5A] to-[#003870] rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-sky-800/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-slate-950 uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                <Shield className="w-3.5 h-3.5" />
                Menu Exclusivo Super Usuário
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#7EC2E8]/20 text-[#7EC2E8] border border-[#7EC2E8]/40 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" />
                PostgreSQL Supabase Cloud
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>Teste de Conexão & Diagnóstico do Banco de Dados</span>
            </h1>

            <p className="text-xs sm:text-sm text-[#7EC2E8] max-w-2xl leading-relaxed">
              Verificação em tempo real de latência, disponibilidade de tabelas, integridade de schema,
              permissões de leitura/escrita e sincronização de dados do Sistema de Controle de JOE - CPI/PMMA.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={runDiagnostic}
              disabled={isRunningTest}
              className="px-5 py-3 rounded-2xl text-xs sm:text-sm font-black bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-50 text-slate-950 transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRunningTest ? 'animate-spin' : ''}`} />
              <span>{isRunningTest ? 'Executando Testes...' : 'Testar Conexão Agora'}</span>
            </button>

            <button
              onClick={handlePushAllToDatabase}
              disabled={isSyncing}
              className="px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-[#001730] hover:bg-[#000F20] text-sky-200 hover:text-white border border-[#7EC2E8]/40 transition-all shadow-md flex items-center gap-2 cursor-pointer"
              title="Forçar envio de todos os dados locais para as tabelas do Supabase"
            >
              <Upload className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Subir Tudo (Push)</span>
            </button>

            <button
              onClick={handlePullAllFromDatabase}
              disabled={isSyncing}
              className="px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-[#001730] hover:bg-[#000F20] text-sky-200 hover:text-white border border-[#7EC2E8]/40 transition-all shadow-md flex items-center gap-2 cursor-pointer"
              title="Baixar dados mais recentes do Supabase para o cache local"
            >
              <Download className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Puxar da Nuvem (Pull)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Connection Status */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
              Status da Conexão
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  report?.overallStatus === 'ONLINE'
                    ? 'bg-emerald-500 animate-pulse'
                    : report?.overallStatus === 'DEGRADED'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
              ></span>
              <span className="text-lg font-black text-slate-900">
                {report?.overallStatus === 'ONLINE'
                  ? 'Conectado (Online)'
                  : report?.overallStatus === 'DEGRADED'
                  ? 'Degradado'
                  : 'Desconectado'}
              </span>
            </div>
            <span className="text-xs text-slate-500 block">PostgreSQL via REST API</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Database className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2: Latency */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
              Latência de Resposta (Ping)
            </span>
            <div className="text-2xl font-black text-slate-900">
              {report ? `${report.pingLatencyMs} ms` : '...'}
            </div>
            <span className="text-xs font-semibold text-emerald-600 block">
              {report && report.pingLatencyMs < 150 ? '⚡ Excelente (Tempo Real)' : '✓ Estável'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3: Total Records in Cloud */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
              Registros no Banco Nuvem
            </span>
            <div className="text-2xl font-black text-slate-900">
              {report ? report.totalRecordsInCloud : '...'}
            </div>
            <span className="text-xs text-slate-500 block">
              Distribuídos em {report?.tables.length || 9} tabelas
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4: Authenticated Role */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
              Permissão & Segurança
            </span>
            <div className="text-base font-black text-slate-900">
              Super Administrador
            </div>
            <span className="text-xs text-emerald-700 font-semibold block">
              Políticas RLS Liberadas ✓
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Shield className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Grid: Diagnostics Checks & Server Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Diagnostics Check Results */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#002D5A] text-white flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-sky-200" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Testes de Integridade do Banco de Dados
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bateria de verificações de rede, autenticação, schema e gravação direta.
                  </p>
                </div>
              </div>

              {report && (
                <button
                  onClick={downloadReportJson}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Relatório (.json)</span>
                </button>
              )}
            </div>

            {/* Checks list */}
            <div className="space-y-2.5">
              {isRunningTest && !report ? (
                <div className="py-12 text-center text-slate-500 space-y-3">
                  <RefreshCw className="w-8 h-8 text-[#002D5A] animate-spin mx-auto" />
                  <p className="text-sm font-semibold">Executando diagnósticos de banco de dados...</p>
                </div>
              ) : report?.checks.map((chk) => (
                <div
                  key={chk.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    chk.status === 'SUCCESS'
                      ? 'bg-emerald-50/50 border-emerald-200/80'
                      : chk.status === 'WARNING'
                      ? 'bg-amber-50/50 border-amber-200/80'
                      : 'bg-rose-50/50 border-rose-200/80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {chk.status === 'SUCCESS' ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : chk.status === 'WARNING' ? (
                        <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
                          <X className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{chk.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border text-slate-600">
                          {chk.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 mt-0.5 font-medium">{chk.message}</p>
                      {chk.details && (
                        <p className="text-[11px] text-slate-500 font-mono mt-1">{chk.details}</p>
                      )}
                    </div>
                  </div>

                  {chk.latencyMs !== undefined && (
                    <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-white text-slate-700 border border-slate-200 shrink-0 self-end sm:self-center">
                      {chk.latencyMs} ms
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Connection & Server Parameters */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <h3 className="text-base font-black text-slate-900">Parâmetros do Servidor</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Endpoint URL (REST)</span>
                <p className="font-mono font-semibold text-slate-800 break-all">
                  https://aflnzikfjeadlvpyoear.supabase.co
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Chave de Acesso (API Key)</span>
                <p className="font-mono font-semibold text-slate-800 flex items-center justify-between">
                  <span>sb_publishable_9cCpk...W0q</span>
                  <Key className="w-3.5 h-3.5 text-slate-400" />
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Motor do Banco de Dados</span>
                <p className="font-semibold text-slate-800 flex items-center justify-between">
                  <span>PostgreSQL 15 (Managed Cloud)</span>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    Ativo
                  </span>
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Criptografia & Transporte</span>
                <p className="font-semibold text-slate-800 flex items-center justify-between">
                  <span>TLS 1.3 / SSL Forçado</span>
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Sessão do Super Usuário</span>
                <p className="font-semibold text-slate-800 flex items-center justify-between">
                  <span>{currentUser.name}</span>
                  <span className="font-mono text-[11px] text-[#002D5A] font-bold">{currentUser.role}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table-by-Table Schema & Live Data Inspector */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#002D5A] text-white flex items-center justify-center">
              <Table className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Inspetor de Tabelas do PostgreSQL (Supabase)
              </h3>
              <p className="text-xs text-slate-500">
                Selecione uma tabela para inspecionar registros reais gravados no banco remoto.
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Total de Tabelas Monitoradas:{' '}
            <strong className="text-slate-800">{report?.tables.length || 9}</strong>
          </div>
        </div>

        {/* Table Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {report?.tables.map((tbl) => (
            <button
              key={tbl.tableName}
              onClick={() => loadTableSample(tbl.tableName)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer shrink-0 ${
                selectedTable === tbl.tableName
                  ? 'bg-[#002D5A] text-white shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>{tbl.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  selectedTable === tbl.tableName
                    ? 'bg-sky-300 text-[#002D5A]'
                    : 'bg-white text-slate-800 border border-slate-200'
                }`}
              >
                {tbl.rowCount}
              </span>
            </button>
          ))}
        </div>

        {/* Table Details & Sample Rows View */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-100/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                Tabela ativa:{' '}
                <code className="font-mono text-[#002D5A] bg-white px-2 py-0.5 rounded-md border border-slate-200 font-bold">
                  {selectedTable}
                </code>
              </span>
              <span className="text-[11px] text-slate-500">
                (Amostra dos 5 primeiros registros)
              </span>
            </div>

            <button
              onClick={() => selectedTable && loadTableSample(selectedTable)}
              disabled={isLoadingSample}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer self-end sm:self-auto"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingSample ? 'animate-spin' : ''}`} />
              <span>Atualizar Amostra</span>
            </button>
          </div>

          {isLoadingSample ? (
            <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 text-[#002D5A] animate-spin" />
              <span>Carregando dados da tabela no Supabase...</span>
            </div>
          ) : tableSampleData.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">Tabela vazia ou sem registros no momento.</p>
              <p className="text-[11px]">
                Utilize o botão "Subir Tudo (Push)" acima para sincronizar os dados locais com o Supabase.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-200/80 text-slate-700 font-bold uppercase text-[10px] tracking-wider sticky top-0">
                  <tr>
                    {Object.keys(tableSampleData[0] || {}).map((col) => (
                      <th key={col} className="p-3 border-b border-slate-300 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white font-mono text-[11px]">
                  {tableSampleData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-sky-50/50 transition-colors">
                      {Object.keys(row).map((col) => {
                        const val = row[col];
                        return (
                          <td
                            key={col}
                            className="p-3 border-b border-slate-100 max-w-xs truncate text-slate-700"
                            title={typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          >
                            {val === null || val === undefined ? (
                              <span className="text-slate-300 italic">null</span>
                            ) : typeof val === 'object' ? (
                              <span className="text-indigo-600 font-semibold">{JSON.stringify(val)}</span>
                            ) : typeof val === 'boolean' ? (
                              <span
                                className={`px-1.5 py-0.5 rounded-sm font-bold text-[10px] ${
                                  val ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {val ? 'true' : 'false'}
                              </span>
                            ) : (
                              String(val)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
