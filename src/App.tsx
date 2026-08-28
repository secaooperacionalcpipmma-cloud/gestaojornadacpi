import React, { useState, useCallback, useEffect } from 'react';
import { HeaderNav } from './components/HeaderNav';
import { DashboardView } from './components/Dashboard/DashboardView';
import { CreateJoeView } from './components/Operations/CreateJoeView';
import { OperationsListView } from './components/Operations/OperationsListView';
import { CeilingsView } from './components/Budget/CeilingsView';
import { PeriodsView } from './components/Periods/PeriodsView';
import { ReportsView } from './components/Reports/ReportsView';
import { LegislationView } from './components/Legislation/LegislationView';
import { CreateOrdinanceModal } from './components/Periods/CreateOrdinanceModal';
import { UsersView } from './components/Users/UsersView';
import { AuditView } from './components/Audit/AuditView';
import { DatabaseConnectionTestView } from './components/Database/DatabaseConnectionTestView';
import { BackupManagerModal } from './components/Backup/BackupManagerModal';
import { LoginView } from './components/Auth/LoginView';
import { storageService } from './services/storageService';
import { googleDriveBackupService } from './services/googleDriveBackupService';
import { CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';
import {
  OperationLaunch,
  CommandBudget,
  CommandUnit,
  OrdinancePeriod,
  User,
  AuditLog,
} from './types';

export default function App() {
  // Navigation active tab: PAINEL | LANCAR_JOE | LANCAMENTOS | TETOS | PERIODOS | RELATORIOS | USUARIOS | AUDITORIA
  const [activeTab, setActiveTab] = useState<string>('PAINEL');

  // Application State - Authenticated user session
  const [currentUser, setCurrentUser] = useState<User | null>(storageService.getSessionUser());
  const [users, setUsers] = useState<User[]>(storageService.getUsers());
  const [ordinances, setOrdinances] = useState<OrdinancePeriod[]>(storageService.getOrdinances());
  const [activeOrdinance, setActiveOrdinance] = useState<OrdinancePeriod>(storageService.getActiveOrdinance());
  const [commands, setCommands] = useState<CommandUnit[]>(storageService.getCommands());
  const [budgets, setBudgets] = useState<CommandBudget[]>(storageService.getBudgets(activeOrdinance.id));
  const [operations, setOperations] = useState<OperationLaunch[]>(storageService.getOperations());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(storageService.getAuditLogs());

  // Modal State
  const [isCreateOrdinanceOpen, setIsCreateOrdinanceOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState<{
    id: string;
    type: 'success' | 'error' | 'info';
    title: string;
    message?: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = Date.now().toString();
    setToast({ id, type, title, message });
    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 6500);
  };

  // Edit / Pre-fill state
  const [launchPreselectedCpa, setLaunchPreselectedCpa] = useState<string>('');
  const [operationToEdit, setOperationToEdit] = useState<OperationLaunch | null>(null);
  const [listCpaFilter, setListCpaFilter] = useState<string>('');

  // Reload state from storage
  const reloadData = useCallback(() => {
    setUsers(storageService.getUsers());
    setOrdinances(storageService.getOrdinances());
    const currentOrd = storageService.getActiveOrdinance();
    setActiveOrdinance(currentOrd);
    setCommands(storageService.getCommands());
    setBudgets(storageService.getBudgets(currentOrd.id));
    setOperations(storageService.getOperations());
    setAuditLogs(storageService.getAuditLogs());
    const session = storageService.getSessionUser();
    setCurrentUser(session);
  }, []);

  // Initialize Supabase on mount
  useEffect(() => {
    storageService.initSupabase().then(() => {
      reloadData();
    });
  }, [reloadData]);

  // Listen to storage data updates and trigger debounced Google Drive backup
  useEffect(() => {
    const unsubscribe = storageService.onDataChanged((type) => {
      if (type === 'SESSION_LOGOUT') {
        setCurrentUser(null);
        return;
      }
      reloadData();
      if (type !== 'IMPORT_BACKUP' && currentUser) {
        googleDriveBackupService.scheduleAutoBackup(currentUser);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser, reloadData]);

  // Handle active ordinance period switch
  const handleOrdinanceChange = (ordId: string) => {
    storageService.setActiveOrdinanceId(ordId);
    reloadData();
  };

  // Handle active user change (simulation switcher)
  const handleUserChange = (user: User) => {
    setCurrentUser(user);
    storageService.setCurrentUser(user);
  };

  // Handle user logout
  const handleLogout = () => {
    storageService.logout(currentUser || undefined);
    setCurrentUser(null);
  };

  // Handle login success
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    reloadData();
  };

  // Handle operation launch save with explicit verification and instant state update
  const handleSaveOperation = async (op: OperationLaunch) => {
    // 1. Reload local state immediately so operations and dashboard update with zero lag
    const result = await storageService.saveOperation(op, currentUser);
    reloadData();
    
    if (result.syncedWithCloud) {
      showToast(
        'success',
        'Salvo com sucesso no Banco de Dados!',
        `Operação "${op.eventName}" (${op.officersCount} JOEs) gravada com sucesso no Supabase.`
      );
    } else {
      showToast(
        'info',
        'Lançamento registrado com sucesso!',
        `Operação "${op.eventName}" (${op.officersCount} JOEs) salva no sistema. Sincronização em segundo plano.`
      );
    }
    
    setOperationToEdit(null);
    setLaunchPreselectedCpa('');
    return result;
  };

  // Handle operation delete
  const handleDeleteOperation = async (opId: string) => {
    const res = storageService.deleteOperation(opId, currentUser);
    if (res.success) {
      showToast('info', 'Lançamento excluído', 'O registro foi removido com sucesso.');
    } else {
      showToast('error', 'Erro ao excluir', res.message || 'Falha ao remover o registro.');
    }
    reloadData();
  };

  // Handle edit operation click
  const handleEditOperation = (op: OperationLaunch) => {
    setOperationToEdit(op);
    setActiveTab('LANCAR_JOE');
  };

  // Handle batch saving ceilings
  const handleSaveBudgets = (updatedBudgets: CommandBudget[]) => {
    storageService.saveAllBudgets(updatedBudgets, activeOrdinance.id, currentUser);
    reloadData();
  };

  // Handle save new ordinance period
  const handleSavePeriod = (newPeriod: OrdinancePeriod, copyFromId?: string) => {
    storageService.saveOrdinance(newPeriod, currentUser, copyFromId);
    storageService.setActiveOrdinanceId(newPeriod.id);
    reloadData();
  };

  // Handle user management actions
  const handleSaveUser = (newUser: User) => {
    storageService.saveUser(newUser, currentUser);
    reloadData();
  };

  const handleToggleUserStatus = (userId: string) => {
    storageService.toggleUserStatus(userId, currentUser);
    reloadData();
  };

  const handleResetUserPassword = (userId: string, newPass: string) => {
    storageService.resetUserPassword(userId, newPass, currentUser);
    reloadData();
  };

  const handleDeleteUser = (userId: string) => {
    storageService.deleteUser(userId, currentUser);
    reloadData();
  };

  // Navigation helpers from Dashboard
  const handleNavigateToLaunch = (commandCode?: string) => {
    setOperationToEdit(null);
    setLaunchPreselectedCpa(commandCode || '');
    setActiveTab('LANCAR_JOE');
  };

  const handleNavigateToList = (commandCode?: string) => {
    setListCpaFilter(commandCode || '');
    setActiveTab('LANCAMENTOS');
  };

  // Export CSV
  const handleExportCsv = () => {
    const activeOps = operations.filter((o) => o.ordinanceId === activeOrdinance.id);
    const headers = [
      'CPA/I',
      'Unidade',
      'Evento',
      'Ordem de Servico',
      'Processo SEI',
      'Data',
      'Horario',
      'Efetivo (JOEs)',
      'Valor Unitario (R$)',
      'Valor Total (R$)',
      'Status',
    ];

    const rows = activeOps.map((op) => [
      `"${op.commandId}"`,
      `"${op.subUnit || ''}"`,
      `"${op.eventName}"`,
      `"${op.orderNumber}"`,
      `"${op.seiProcessNumber}"`,
      `"${op.serviceDate}"`,
      `"${op.startTime || ''}"`,
      op.officersCount,
      op.unitValue.toFixed(2),
      op.totalValue.toFixed(2),
      `"${op.status}"`,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `lancamentos_joe_${activeOrdinance.number.replace(/[^a-zA-Z0-9]/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If no user is logged in, show mandatory login authentication screen
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-slate-900 flex flex-col font-sans antialiased">
      {/* Top Header & Navigation Banner */}
      <HeaderNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'LANCAR_JOE' && activeTab !== 'LANCAR_JOE') {
            setOperationToEdit(null);
            setLaunchPreselectedCpa('');
          }
          setActiveTab(tab);
        }}
        currentUser={currentUser}
        users={users}
        onUserChange={handleUserChange}
        ordinances={ordinances}
        activeOrdinance={activeOrdinance}
        onOrdinanceChange={handleOrdinanceChange}
        onExportCsv={handleExportCsv}
        onOpenCreateOrdinance={() => setIsCreateOrdinanceOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1520px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'PAINEL' && (
          <DashboardView
            ordinance={activeOrdinance}
            budgets={budgets}
            operations={operations}
            commands={commands}
            onNavigateToLaunch={handleNavigateToLaunch}
            onNavigateToList={handleNavigateToList}
          />
        )}

        {activeTab === 'LANCAR_JOE' && (
          <CreateJoeView
            commands={commands}
            ordinance={activeOrdinance}
            currentUser={currentUser}
            onSave={handleSaveOperation}
            onCancel={() => {
              setOperationToEdit(null);
              setActiveTab('LANCAMENTOS');
            }}
            initialCommand={launchPreselectedCpa}
            operationToEdit={operationToEdit}
          />
        )}

        {activeTab === 'LANCAMENTOS' && (
          <OperationsListView
            operations={operations}
            commands={commands}
            ordinance={activeOrdinance}
            onEdit={handleEditOperation}
            onDelete={handleDeleteOperation}
            initialCommandFilter={listCpaFilter}
            onNavigateToReports={() => setActiveTab('RELATORIOS')}
            onNavigateToCreate={() => {
              setOperationToEdit(null);
              setActiveTab('LANCAR_JOE');
            }}
            onRefreshData={async () => {
              await storageService.refreshOperationsFromDatabase();
              reloadData();
            }}
          />
        )}

        {activeTab === 'TETOS' && (
          <CeilingsView
            ordinance={activeOrdinance}
            budgets={budgets}
            commands={commands}
            operations={operations}
            currentUser={currentUser}
            onSaveBudgets={handleSaveBudgets}
          />
        )}

        {activeTab === 'PERIODOS' && (
          <PeriodsView
            ordinances={ordinances}
            operations={operations}
            currentUser={currentUser}
            onSavePeriod={handleSavePeriod}
            onSelectPeriod={handleOrdinanceChange}
          />
        )}

        {activeTab === 'RELATORIOS' && (
          <ReportsView
            commands={commands}
            operations={operations}
            ordinances={ordinances}
            activeOrdinance={activeOrdinance}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'LEGISLACAO' && (
          <LegislationView
            ordinances={ordinances}
            activeOrdinance={activeOrdinance}
            currentUser={currentUser}
            onSaveNewOrdinance={handleSavePeriod}
            onSelectOrdinance={handleOrdinanceChange}
          />
        )}

        {activeTab === 'USUARIOS' && (
          <UsersView
            users={users}
            commands={commands}
            currentUser={currentUser}
            onSaveUser={handleSaveUser}
            onToggleStatus={handleToggleUserStatus}
            onResetPassword={handleResetUserPassword}
            onDeleteUser={handleDeleteUser}
          />
        )}

        {activeTab === 'AUDITORIA' && (
          <AuditView
            logs={auditLogs}
            users={users}
            ordinance={activeOrdinance}
            commands={commands}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'TESTE_BD' && (
          <DatabaseConnectionTestView
            currentUser={currentUser}
            activeOrdinance={activeOrdinance}
            onDataRefreshed={reloadData}
          />
        )}
      </main>

      {/* Modal for Creating New Ordinance */}
      <CreateOrdinanceModal
        isOpen={isCreateOrdinanceOpen}
        onClose={() => setIsCreateOrdinanceOpen(false)}
        onSave={handleSavePeriod}
        existingOrdinances={ordinances}
        currentUser={currentUser}
      />

      {/* Modal for Google Drive Backup & Restoration */}
      <BackupManagerModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        currentUser={currentUser}
        onDataRestored={reloadData}
      />

      {/* Global Toast Notification */}
      {toast && (
        <aside
          role="status"
          aria-live="polite"
          aria-label="Notificação do sistema"
          className="fixed bottom-6 right-6 z-50 max-w-md w-full shadow-2xl rounded-2xl overflow-hidden border-2 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
        >
          <div
            className={`p-4 flex items-start gap-3.5 ${
              toast.type === 'success'
                ? 'bg-emerald-900/95 border-emerald-500 text-white'
                : toast.type === 'error'
                ? 'bg-rose-950/95 border-rose-500 text-white'
                : 'bg-slate-900/95 border-slate-700 text-white'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && (
                <div className="p-1.5 rounded-xl bg-emerald-500 text-white">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              )}
              {toast.type === 'error' && (
                <div className="p-1.5 rounded-xl bg-rose-500 text-white">
                  <XCircle className="w-5 h-5" />
                </div>
              )}
              {toast.type === 'info' && (
                <div className="p-1.5 rounded-xl bg-blue-500 text-white">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h5 className="text-sm font-black tracking-tight">{toast.title}</h5>
              {toast.message && (
                <p className="text-xs text-slate-200 mt-1 leading-relaxed break-words">{toast.message}</p>
              )}
            </div>

            <button
              onClick={() => setToast(null)}
              className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* Subtle Footer */}
      <footer className="mt-auto py-6 border-t border-slate-200/80 text-center text-xs text-slate-400">
        <div className="max-w-[1520px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Controle de JOE v3.0.0 · Portaria nº 122/2026 – GCG · PMMA</span>
          <button
            onClick={() => {
              if (window.confirm('Deseja restaurar os dados de demonstração originais?')) {
                storageService.resetToDemoData();
                reloadData();
              }
            }}
            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            Restaurar dados de teste
          </button>
        </div>
      </footer>
    </div>
  );
}

