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

  // Handle operation launch save
  const handleSaveOperation = (op: OperationLaunch) => {
    storageService.saveOperation(op, currentUser);
    reloadData();
    setOperationToEdit(null);
    setLaunchPreselectedCpa('');
    setActiveTab('LANCAMENTOS');
  };

  // Handle operation delete
  const handleDeleteOperation = (opId: string) => {
    storageService.deleteOperation(opId, currentUser);
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

