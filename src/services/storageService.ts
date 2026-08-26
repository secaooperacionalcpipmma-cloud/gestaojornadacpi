import {
  User,
  CommandUnit,
  OrdinancePeriod,
  CommandBudget,
  OperationLaunch,
  PoliceOfficer,
  Irregularity,
  AuditLog,
  WeeklyBatchConsolidation,
  OperationStatus,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_COMMANDS,
  INITIAL_ORDINANCES,
  INITIAL_BUDGETS,
  INITIAL_OFFICERS,
  INITIAL_OPERATIONS,
  INITIAL_BATCHES,
  INITIAL_IRREGULARITIES,
  INITIAL_AUDIT_LOGS,
} from '../data/initialData';

const STORAGE_KEYS = {
  USERS: 'cpi_pmma_users_v4',
  CURRENT_USER: 'cpi_pmma_current_user_v4',
  COMMANDS: 'cpi_pmma_commands_v4',
  ORDINANCES: 'cpi_pmma_ordinances_v4',
  ACTIVE_ORDINANCE_ID: 'cpi_pmma_active_ordinance_id_v4',
  BUDGETS: 'cpi_pmma_budgets_v4',
  OFFICERS: 'cpi_pmma_officers_v4',
  OPERATIONS: 'cpi_pmma_operations_v4',
  BATCHES: 'cpi_pmma_batches_v4',
  IRREGULARITIES: 'cpi_pmma_irregularities_v4',
  AUDIT_LOGS: 'cpi_pmma_audit_logs_v4',
};

class StorageService {
  private get<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Error writing to storage:', e);
    }
  }

  // Users
  getUsers(): User[] {
    return this.get(STORAGE_KEYS.USERS, INITIAL_USERS);
  }

  getCurrentUser(): User {
    const defaultUser = INITIAL_USERS[0]; // admin
    return this.get(STORAGE_KEYS.CURRENT_USER, defaultUser);
  }

  setCurrentUser(user: User): void {
    this.set(STORAGE_KEYS.CURRENT_USER, user);
  }

  saveUser(userData: User, adminUser: User): { success: boolean; message?: string } {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === userData.id || u.login === userData.login);
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    if (index >= 0 && users[index].id === userData.id) {
      users[index] = { ...users[index], ...userData };
      this.set(STORAGE_KEYS.USERS, users);
      this.logAudit({
        userName: adminUser.name,
        userRole: adminUser.role,
        action: 'editar',
        recordId: `usuarios #${users.length - index}`,
        description: `${userData.login} · ${userData.profileLabel || userData.role}`,
        ipAddress: '2804:6788:4015:7c00:d3d:e9c2:1b3f:2aea',
      });
    } else {
      const newUser: User = {
        ...userData,
        id: userData.id || `usr-${Date.now()}`,
        active: true,
        lastAccess: formattedDate,
      };
      users.push(newUser);
      this.set(STORAGE_KEYS.USERS, users);
      this.logAudit({
        userName: adminUser.name,
        userRole: adminUser.role,
        action: 'criar',
        recordId: `usuarios #${users.length}`,
        description: `${newUser.login} · ${newUser.profileLabel || newUser.role}`,
        ipAddress: '2804:6788:4015:7c00:d3d:e9c2:1b3f:2aea',
      });
    }
    return { success: true };
  }

  toggleUserStatus(userId: string, adminUser: User): void {
    const users = this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (user) {
      user.active = !user.active;
      this.set(STORAGE_KEYS.USERS, users);
      this.logAudit({
        userName: adminUser.name,
        userRole: adminUser.role,
        action: 'editar',
        recordId: `usuarios #${users.indexOf(user) + 1}`,
        description: `Usuário ${user.login} alterado para ${user.active ? 'ativo' : 'inativo'}`,
        ipAddress: '2804:6788:4015:7c00:d3d:e9c2:1b3f:2aea',
      });
    }
  }

  resetUserPassword(userId: string, newPass: string, adminUser: User): { success: boolean } {
    const users = this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (user) {
      user.password = newPass;
      this.set(STORAGE_KEYS.USERS, users);
      this.logAudit({
        userName: adminUser.name,
        userRole: adminUser.role,
        action: 'editar',
        recordId: `usuarios #${users.indexOf(user) + 1}`,
        description: `Redefinição de senha para o usuário ${user.login}`,
        ipAddress: '2804:6788:4015:7c00:d3d:e9c2:1b3f:2aea',
      });
      return { success: true };
    }
    return { success: false };
  }

  // Commands
  getCommands(): CommandUnit[] {
    return this.get(STORAGE_KEYS.COMMANDS, INITIAL_COMMANDS);
  }

  // Ordinances
  getOrdinances(): OrdinancePeriod[] {
    return this.get(STORAGE_KEYS.ORDINANCES, INITIAL_ORDINANCES);
  }

  getActiveOrdinance(): OrdinancePeriod {
    const ordinances = this.getOrdinances();
    const savedId = this.get<string | null>(STORAGE_KEYS.ACTIVE_ORDINANCE_ID, null);
    const active = savedId ? ordinances.find((o) => o.id === savedId) : null;
    return active || ordinances.find((o) => o.status === 'VIGENTE') || ordinances[0];
  }

  setActiveOrdinanceId(id: string): void {
    this.set(STORAGE_KEYS.ACTIVE_ORDINANCE_ID, id);
  }

  saveOrdinance(
    ordinance: OrdinancePeriod,
    user: User,
    copyFromPeriodId?: string
  ): void {
    const ordinances = this.getOrdinances();
    const index = ordinances.findIndex((o) => o.id === ordinance.id);
    let isNew = false;

    // If new or updated ordinance is marked as VIGENTE, adjust other ordinances
    if (ordinance.status === 'VIGENTE') {
      ordinances.forEach((ord) => {
        if (ord.id !== ordinance.id && ord.status === 'VIGENTE') {
          ord.status = 'ENCERRADA';
        }
      });
      this.setActiveOrdinanceId(ordinance.id);
    }

    if (index >= 0) {
      ordinances[index] = { ...ordinances[index], ...ordinance };
    } else {
      isNew = true;
      ordinances.unshift(ordinance);
      const commands = this.getCommands();
      const budgets = this.getBudgets();

      let sourceBudgets: CommandBudget[] = [];
      if (copyFromPeriodId && copyFromPeriodId !== 'none') {
        sourceBudgets = this.getBudgets(copyFromPeriodId);
      }

      commands.forEach((cmd) => {
        const matchingSource = sourceBudgets.find((b) => b.commandId === cmd.code || b.commandId === cmd.id);
        const joes = matchingSource
          ? matchingSource.plannedJoes
          : cmd.code.includes('CPI')
          ? 30
          : cmd.code.includes('3')
          ? 300
          : cmd.code.includes('5')
          ? 230
          : cmd.code.includes('9')
          ? 226
          : cmd.code.includes('6')
          ? 170
          : 186;

        const bAmount = joes * (ordinance.unitValueJoe || 350);
        budgets.push({
          id: `bgt-${ordinance.id}-${cmd.id.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          ordinanceId: ordinance.id,
          commandId: cmd.code,
          plannedJoes: joes,
          budgetAmount: bAmount,
          committedAmount: 0,
          executedAmount: 0,
          availableBalance: bAmount,
          usedJoesCount: 0,
        });
      });
      this.set(STORAGE_KEYS.BUDGETS, budgets);
    }
    this.set(STORAGE_KEYS.ORDINANCES, ordinances);

    this.logAudit({
      userName: user.name,
      userRole: user.role,
      action: isNew ? 'criar' : 'editar',
      recordId: `periodos #${ordinance.number}`,
      description: isNew ? `Criação da portaria ${ordinance.name || ordinance.number} (${ordinance.status})` : `Atualização da portaria ${ordinance.name || ordinance.number}`,
      ipAddress: '2804:6788:4015:7c00:d3d:e9c2:1b3f:2aea',
    });
  }

  // Budgets / Ceilings
  getBudgets(ordinanceId?: string): CommandBudget[] {
    const budgets = this.get(STORAGE_KEYS.BUDGETS, INITIAL_BUDGETS);
    if (ordinanceId) {
      return budgets.filter((b) => b.ordinanceId === ordinanceId);
    }
    return budgets;
  }

  updateBudget(budget: CommandBudget, user: User, reason?: string): void {
    const budgets = this.getBudgets();
    const index = budgets.findIndex((b) => b.id === budget.id || (b.commandId === budget.commandId && b.ordinanceId === budget.ordinanceId));
    if (index >= 0) {
      const prev = budgets[index];
      budgets[index] = {
        ...budgets[index],
        ...budget,
        availableBalance: budget.budgetAmount - (budgets[index].committedAmount + budgets[index].executedAmount),
      };
      this.set(STORAGE_KEYS.BUDGETS, budgets);

      this.logAudit({
        userName: user.name,
        userRole: user.role,
        action: 'editar',
        recordId: `tetos #${budget.commandId}`,
        description: `Ajuste de cota do ${budget.commandId}: ${budget.plannedJoes} JOEs (R$ ${budget.budgetAmount.toFixed(2)}). ${reason || ''}`,
        ipAddress: '2804:6788:4015:7c00:d3d:e9c2:1b3f:2aea',
      });
    }
  }

  saveAllBudgets(updatedBudgets: CommandBudget[], ordinanceId: string, user: User): void {
    const allBudgets = this.getBudgets();
    const otherBudgets = allBudgets.filter((b) => b.ordinanceId !== ordinanceId);

    const merged = [
      ...otherBudgets,
      ...updatedBudgets.map((b) => ({
        ...b,
        availableBalance: b.budgetAmount - (b.committedAmount + b.executedAmount),
      })),
    ];
    this.set(STORAGE_KEYS.BUDGETS, merged);

    this.logAudit({
      userName: user.name,
      userRole: user.role,
      action: 'salvar_tetos',
      recordId: `tetos #${ordinanceId}`,
      description: `Atualização em lote dos tetos da Portaria. Total de JOEs e limites financeiros redefinidos.`,
      ipAddress: '2804:6788:4015:7c00:d3d:e9c2:1b3f:2aea',
    });
  }

  // Recalculate Budgets based on operations
  recalculateBudgets(ordinanceId: string): void {
    const operations = this.getOperations().filter((op) => op.ordinanceId === ordinanceId);
    const budgets = this.getBudgets();

    const updatedBudgets = budgets.map((b) => {
      if (b.ordinanceId !== ordinanceId) return b;

      const cmdOps = operations.filter(
        (op) => op.commandId === b.commandId || op.commandId === b.commandId.replace(' - Direção Setorial', '')
      );

      const executedAmount = cmdOps.reduce((sum, o) => sum + o.totalValue, 0);
      const usedJoesCount = cmdOps.reduce((sum, o) => sum + o.officersCount, 0);
      const availableBalance = Math.max(0, b.budgetAmount - executedAmount);

      return {
        ...b,
        committedAmount: 0,
        executedAmount,
        availableBalance,
        usedJoesCount,
      };
    });

    this.set(STORAGE_KEYS.BUDGETS, updatedBudgets);
  }

  // Operations / JOE Launches
  getOperations(): OperationLaunch[] {
    return this.get(STORAGE_KEYS.OPERATIONS, INITIAL_OPERATIONS);
  }

  saveOperation(operation: OperationLaunch, user: User): { success: boolean; message?: string } {
    const operations = this.getOperations();
    const index = operations.findIndex((op) => op.id === operation.id);
    const isNew = index < 0;

    const opToSave: OperationLaunch = {
      ...operation,
      id: operation.id || `op-${Date.now()}`,
      createdAt: isNew ? new Date().toISOString() : operation.createdAt,
      updatedAt: new Date().toISOString(),
    };

    if (index >= 0) {
      operations[index] = opToSave;
    } else {
      operations.unshift(opToSave);
    }

    this.set(STORAGE_KEYS.OPERATIONS, operations);
    this.recalculateBudgets(opToSave.ordinanceId);

    const recIndex = isNew ? operations.length : operations.length - index;
    this.logAudit({
      userName: user.name,
      userRole: user.role,
      action: isNew ? 'criar' : 'editar',
      recordId: `lancamentos #${recIndex}`,
      description: `${opToSave.eventName} · ${opToSave.officersCount} JOEs · R$ ${opToSave.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      ipAddress: '2804:6788:4015:7c00:d3d:e9c2:1b3f:2aea',
    });

    return { success: true };
  }

  deleteOperation(operationId: string, user: User): { success: boolean; message?: string } {
    const operations = this.getOperations();
    const opIndex = operations.findIndex((o) => o.id === operationId);
    if (opIndex < 0) return { success: false, message: 'Operação não encontrada.' };

    const op = operations[opIndex];
    const filtered = operations.filter((o) => o.id !== operationId);
    this.set(STORAGE_KEYS.OPERATIONS, filtered);
    this.recalculateBudgets(op.ordinanceId);

    this.logAudit({
      userName: user.name,
      userRole: user.role,
      action: 'excluir',
      recordId: `lancamentos #${operations.length - opIndex}`,
      description: `${op.eventName} · ${op.officersCount} JOEs`,
      ipAddress: '181.191.89.202',
    });

    return { success: true };
  }

  updateOperationStatus(
    operationId: string,
    newStatus: OperationStatus,
    user: User,
    notes?: string,
    feedback?: string
  ): { success: boolean } {
    const operations = this.getOperations();
    const op = operations.find((o) => o.id === operationId);
    if (!op) return { success: false };

    op.status = newStatus;
    op.updatedAt = new Date().toISOString();
    if (feedback) op.correctionFeedback = feedback;
    if (notes) op.notes = notes;

    this.set(STORAGE_KEYS.OPERATIONS, operations);
    this.recalculateBudgets(op.ordinanceId);

    return { success: true };
  }

  // Police Officers
  getOfficers(): PoliceOfficer[] {
    return this.get(STORAGE_KEYS.OFFICERS, INITIAL_OFFICERS);
  }

  saveOfficer(officer: PoliceOfficer, user: User): void {
    const officers = this.getOfficers();
    const index = officers.findIndex((o) => o.id === officer.id);
    if (index >= 0) {
      officers[index] = officer;
    } else {
      officers.unshift(officer);
    }
    this.set(STORAGE_KEYS.OFFICERS, officers);
  }

  // Weekly Consolidation Batches
  getBatches(): WeeklyBatchConsolidation[] {
    return this.get(STORAGE_KEYS.BATCHES, INITIAL_BATCHES);
  }

  createWeeklyBatch(
    batchData: Omit<WeeklyBatchConsolidation, 'id' | 'createdAt'>,
    user: User
  ): WeeklyBatchConsolidation {
    const batches = this.getBatches();
    const newBatch: WeeklyBatchConsolidation = {
      ...batchData,
      id: `batch-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    batches.unshift(newBatch);
    this.set(STORAGE_KEYS.BATCHES, batches);
    return newBatch;
  }

  // Irregularities
  getIrregularities(): Irregularity[] {
    return this.get(STORAGE_KEYS.IRREGULARITIES, INITIAL_IRREGULARITIES);
  }

  saveIrregularity(irregularity: Irregularity, user: User): void {
    const list = this.getIrregularities();
    const index = list.findIndex((i) => i.id === irregularity.id);
    if (index >= 0) {
      list[index] = { ...irregularity, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({
        ...irregularity,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    this.set(STORAGE_KEYS.IRREGULARITIES, list);
  }

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    return this.get(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  }

  logAudit(entry: {
    userName: string;
    userRole?: string;
    action: AuditLog['action'];
    recordId: string;
    description: string;
    ipAddress?: string;
    module?: AuditLog['module'];
    previousValue?: string;
    newValue?: string;
  }): void {
    const logs = this.getAuditLogs();
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: formattedDate,
      userName: entry.userName,
      userRole: entry.userRole,
      action: entry.action,
      recordId: entry.recordId,
      description: entry.description,
      ipAddress: entry.ipAddress || '2804:6788:4015:7c00:d3d:e9c2:1b3f:2aea',
      module: entry.module || 'SISTEMA',
      previousValue: entry.previousValue,
      newValue: entry.newValue,
    };
    logs.unshift(newLog);
    this.set(STORAGE_KEYS.AUDIT_LOGS, logs.slice(0, 500));
  }

  resetToDemoData(): void {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    window.location.reload();
  }
}

export const storageService = new StorageService();
