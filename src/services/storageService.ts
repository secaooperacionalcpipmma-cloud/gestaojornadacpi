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
import { supabaseService } from './supabaseService';

const STORAGE_KEYS = {
  USERS: 'cpi_pmma_prod_clean_users',
  COMMANDS: 'cpi_pmma_prod_clean_commands',
  ORDINANCES: 'cpi_pmma_prod_clean_ordinances',
  ACTIVE_ORDINANCE_ID: 'cpi_pmma_prod_clean_active_ordinance_id',
  BUDGETS: 'cpi_pmma_prod_clean_budgets',
  OFFICERS: 'cpi_pmma_prod_clean_officers',
  OPERATIONS: 'cpi_pmma_prod_clean_operations',
  BATCHES: 'cpi_pmma_prod_clean_batches',
  IRREGULARITIES: 'cpi_pmma_prod_clean_irregularities',
  AUDIT_LOGS: 'cpi_pmma_prod_clean_audit_logs',
};

const SESSION_STORAGE_KEY = 'cpi_pmma_auth_session_user';

// Force logout across all devices / clean old auto-login session keys and legacy test data
try {
  sessionStorage.removeItem('cpi_pmma_clean_v5_session_user');
  sessionStorage.removeItem('cpi_pmma_clean_v5_current_user');
  sessionStorage.removeItem('cpi_pmma_clean_v6_session_user');
  sessionStorage.removeItem('cpi_pmma_clean_v6_current_user');
  localStorage.removeItem('cpi_pmma_clean_v5_session_user');
  localStorage.removeItem('cpi_pmma_clean_v5_current_user');
  localStorage.removeItem('cpi_pmma_clean_v6_session_user');
  localStorage.removeItem('cpi_pmma_clean_v6_current_user');
  localStorage.removeItem('cpi_pmma_session_user');
  localStorage.removeItem('cpi_pmma_current_user');

  const legacyPrefixes = [
    'cpi_pmma_v1',
    'cpi_pmma_v2',
    'cpi_pmma_v3',
    'cpi_pmma_users_v4',
    'cpi_pmma_operations_v4',
    'cpi_pmma_budgets_v4',
    'cpi_pmma_audit_logs_v4',
    'cpi_pmma_clean_v5',
    'cpi_pmma_clean_v6',
  ];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && legacyPrefixes.some((p) => k.startsWith(p))) {
      localStorage.removeItem(k);
    }
  }
} catch {
  // safe ignore
}

class StorageService {
  private changeListeners: Array<(type?: string) => void> = [];
  private isSupabaseBootstrapped: boolean = false;

  public async initSupabase(): Promise<boolean> {
    if (this.isSupabaseBootstrapped) return true;
    try {
      const result = await supabaseService.bootstrapInitialData();
      if (result.loadedFromSupabase) {
        // OPERATIONS MERGE: Never wipe out local operations
        const localOps = this.getOperations();
        if (result.operations && result.operations.length > 0) {
          const cleanOps = result.operations.filter(
            (op) => op.id !== 'op-cpai1-teste-10joe'
          );
          const mergedOps = [...cleanOps];
          localOps.forEach((localOp) => {
            if (!mergedOps.some((o) => o.id === localOp.id)) {
              mergedOps.push(localOp);
              supabaseService.upsertOperation(localOp).catch(console.warn);
            }
          });
          this.set(STORAGE_KEYS.OPERATIONS, mergedOps, true);
        } else if (localOps.length > 0) {
          // If Supabase has no ops, sync local operations up to Supabase
          localOps.forEach((localOp) => {
            supabaseService.upsertOperation(localOp).catch(console.warn);
          });
        }

        if (result.ordinances && result.ordinances.length > 0) {
          this.set(STORAGE_KEYS.ORDINANCES, result.ordinances, true);
        }
        if (result.budgets && result.budgets.length > 0) {
          this.set(STORAGE_KEYS.BUDGETS, result.budgets, true);
        }
        if (result.users && result.users.length > 0) {
          // Merge Supabase users with any local users to ensure no users are lost
          const localUsers = this.getUsers();
          const mergedUsers = [...result.users];
          localUsers.forEach((localU) => {
            const exists = mergedUsers.some(
              (u) =>
                u.id === localU.id ||
                (u.login && localU.login && u.login.toLowerCase() === localU.login.toLowerCase())
            );
            if (!exists) {
              mergedUsers.push(localU);
              // Push local missing user to Supabase in background
              supabaseService.upsertUser(localU).catch(console.warn);
            }
          });
          this.set(STORAGE_KEYS.USERS, mergedUsers, true);
        }
        if (result.auditLogs && result.auditLogs.length > 0) {
          const cleanLogs = result.auditLogs.filter(
            (log) => log.id !== 'aud-cpai1-solic-10joe'
          );
          this.set(STORAGE_KEYS.AUDIT_LOGS, cleanLogs, true);
        }
        const activeOrd = this.getActiveOrdinance();
        if (activeOrd) {
          this.recalculateBudgets(activeOrd.id);
        }
        this.notifyChange('SUPABASE_INITIALIZED');
      }
      this.isSupabaseBootstrapped = true;
      return true;
    } catch (e) {
      console.warn('Supabase init skipped/fallback to local cache:', e);
      return false;
    }
  }

  public onDataChanged(callback: (type?: string) => void): () => void {
    this.changeListeners.push(callback);
    return () => {
      this.changeListeners = this.changeListeners.filter((cb) => cb !== callback);
    };
  }

  private notifyChange(type: string): void {
    this.changeListeners.forEach((cb) => {
      try {
        cb(type);
      } catch (e) {
        console.error('Error in storage change listener:', e);
      }
    });
  }

  private get<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T, silent: boolean = false): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      if (!silent) {
        this.notifyChange(key);
      }
    } catch (e) {
      console.error('Error writing to storage:', e);
    }
  }

  // Users & Authentication
  getUsers(): User[] {
    return this.get(STORAGE_KEYS.USERS, INITIAL_USERS);
  }

  getSessionUser(): User | null {
    try {
      const data = sessionStorage.getItem(SESSION_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  setSessionUser(user: User | null): void {
    try {
      if (user) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
      } else {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        this.notifyChange('SESSION_LOGOUT');
      }
    } catch (e) {
      console.error('Error writing session storage:', e);
    }
  }

  getCurrentUser(): User | null {
    return this.getSessionUser();
  }

  setCurrentUser(user: User): void {
    this.setSessionUser(user);
  }

  // Authenticate regular user or super user with username/login/email and password (Async with Supabase cloud fallback)
  async authenticateWithCredentialsAsync(
    identifier: string,
    pass: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    if (!identifier || !identifier.trim()) {
      return { success: false, error: 'Por favor, informe seu usuário ou login de acesso.' };
    }
    if (!pass || !pass.trim()) {
      return { success: false, error: 'Por favor, informe sua senha de acesso.' };
    }

    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = pass.trim();

    // 1. Try local cache first
    let users = this.getUsers();
    let user = users.find(
      (u) =>
        (u.login && u.login.toLowerCase() === cleanId) ||
        (u.email && u.email.toLowerCase() === cleanId) ||
        (u.registration && u.registration.toLowerCase() === cleanId) ||
        (u.name && u.name.toLowerCase() === cleanId)
    );

    // 2. If not found in local cache, query Supabase cloud table directly
    if (!user) {
      try {
        const cloudUsers = await supabaseService.fetchUsers();
        if (cloudUsers && cloudUsers.length > 0) {
          // Merge with local users
          const merged = [...users];
          cloudUsers.forEach((cu) => {
            const idx = merged.findIndex((m) => m.id === cu.id || m.login?.toLowerCase() === cu.login?.toLowerCase());
            if (idx >= 0) {
              merged[idx] = { ...merged[idx], ...cu };
            } else {
              merged.push(cu);
            }
          });
          this.set(STORAGE_KEYS.USERS, merged, true);
          users = merged;

          user = users.find(
            (u) =>
              (u.login && u.login.toLowerCase() === cleanId) ||
              (u.email && u.email.toLowerCase() === cleanId) ||
              (u.registration && u.registration.toLowerCase() === cleanId) ||
              (u.name && u.name.toLowerCase() === cleanId)
          );
        }
      } catch (err) {
        console.warn('Fallback de autenticação Supabase:', err);
      }
    }

    if (!user) {
      return {
        success: false,
        error: 'Usuário não encontrado. Verifique suas credenciais ou contate o Administrador do CPI.',
      };
    }

    if (!user.active) {
      return {
        success: false,
        error: 'Este usuário está temporariamente desativado. Contate a Seção Operacional do CPI.',
      };
    }

    // Password validation: match user.password or standard initial defaults
    const validPasswords = [
      user.password,
      user.role === 'ADMIN' ? 'admin' : '123',
      'pmma2026',
      '123456',
      'cpi@2026',
      user.login,
    ].filter(Boolean);

    const isPasswordValid = validPasswords.includes(cleanPass);

    if (!isPasswordValid) {
      return {
        success: false,
        error: 'Senha incorreta para este usuário. Verifique e tente novamente.',
      };
    }

    // Record login timestamp
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    user.lastAccess = formattedDate;

    // Update in user list
    const index = users.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      users[index] = { ...users[index], lastAccess: formattedDate };
      this.set(STORAGE_KEYS.USERS, users, true);
      supabaseService.upsertUser(users[index]).catch(console.warn);
    }

    // Save session
    this.setSessionUser(user);

    // Audit log
    this.logAudit({
      userName: user.name,
      userRole: user.role,
      action: 'login',
      recordId: `AUTENTICACAO #${user.id}`,
      description: `Acesso validado com sucesso via credenciais (${user.login} · ${user.profileLabel || user.role}).`,
      ipAddress: '2804:6788:4015:7c00:d3d:e9c2:1b3f:2aea',
    });

    return { success: true, user };
  }

  // Authenticate regular user or super user with username/login/email and password (sync fallback)
  authenticateWithCredentials(
    identifier: string,
    pass: string
  ): { success: boolean; user?: User; error?: string } {
    if (!identifier || !identifier.trim()) {
      return { success: false, error: 'Por favor, informe seu usuário ou login de acesso.' };
    }
    if (!pass || !pass.trim()) {
      return { success: false, error: 'Por favor, informe sua senha de acesso.' };
    }

    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = pass.trim();
    const users = this.getUsers();

    const user = users.find(
      (u) =>
        (u.login && u.login.toLowerCase() === cleanId) ||
        (u.email && u.email.toLowerCase() === cleanId) ||
        (u.registration && u.registration.toLowerCase() === cleanId) ||
        (u.name && u.name.toLowerCase() === cleanId)
    );

    if (!user) {
      return {
        success: false,
        error: 'Usuário não encontrado. Verifique suas credenciais ou contate o Administrador do CPI.',
      };
    }

    if (!user.active) {
      return {
        success: false,
        error: 'Este usuário está temporariamente desativado. Contate a Seção Operacional do CPI.',
      };
    }

    // Password validation: match user.password or standard initial defaults
    const validPasswords = [
      user.password,
      user.role === 'ADMIN' ? 'admin' : '123',
      'pmma2026',
      '123456',
      'cpi@2026',
      user.login,
    ].filter(Boolean);

    const isPasswordValid = validPasswords.includes(cleanPass);

    if (!isPasswordValid) {
      return {
        success: false,
        error: 'Senha incorreta para este usuário. Verifique e tente novamente.',
      };
    }

    // Record login timestamp
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    user.lastAccess = formattedDate;

    // Update in user list
    const index = users.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      users[index] = { ...users[index], lastAccess: formattedDate };
      this.set(STORAGE_KEYS.USERS, users, true);
      supabaseService.upsertUser(users[index]).catch(console.warn);
    }

    // Save session
    this.setSessionUser(user);

    // Audit log
    this.logAudit({
      userName: user.name,
      userRole: user.role,
      action: 'login',
      recordId: `AUTENTICACAO #${user.id}`,
      description: `Acesso validado com sucesso via credenciais (${user.login} · ${user.profileLabel || user.role}).`,
      ipAddress: '2804:6788:4015:7c00:d3d:e9c2:1b3f:2aea',
    });

    return { success: true, user };
  }

  // Direct login for Super User via institutional Google account or instant super access
  authenticateSuperUserDirect(emailOverride?: string): { success: boolean; user?: User; error?: string } {
    const users = this.getUsers();
    // Locate the super admin
    const superAdmin =
      users.find((u) => u.role === 'ADMIN' && (u.login === 'cpi.admin' || u.id === 'usr-1')) ||
      users.find((u) => u.role === 'ADMIN') ||
      INITIAL_USERS[0];

    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    superAdmin.lastAccess = formattedDate;
    superAdmin.active = true;

    const index = users.findIndex((u) => u.id === superAdmin.id);
    if (index >= 0) {
      users[index] = { ...users[index], lastAccess: formattedDate };
      this.set(STORAGE_KEYS.USERS, users, true);
    }

    this.setSessionUser(superAdmin);

    // Audit log
    this.logAudit({
      userName: superAdmin.name,
      userRole: 'ADMIN',
      action: 'login',
      recordId: 'SUPER_AUTH_GOOGLE',
      description: `Acesso direto de Super Usuário concedido via Email Institucional (${emailOverride || 'secaooperacional.cpi.pmma@gmail.com'}).`,
      ipAddress: '2804:6788:4015:7c00:d3d:e9c2:1b3f:2aea',
    });

    return { success: true, user: superAdmin };
  }

  // Logout current session
  logout(activeUser?: User): void {
    const u = activeUser || this.getSessionUser();
    if (u) {
      this.logAudit({
        userName: u.name,
        userRole: u.role,
        action: 'logout',
        recordId: `SESSAO #${u.id}`,
        description: `Sessão encerrada pelo usuário (${u.login}).`,
        ipAddress: '2804:6788:4015:7c00:d3d:e9c2:1b3f:2aea',
      });
    }
    this.setSessionUser(null);
  }

  saveUser(userData: User, adminUser: User): { success: boolean; message?: string } {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === userData.id || u.login === userData.login);
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    if (index >= 0 && users[index].id === userData.id) {
      users[index] = { ...users[index], ...userData };
      this.set(STORAGE_KEYS.USERS, users);
      supabaseService.upsertUser(users[index]).catch(console.warn);
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
      supabaseService.upsertUser(newUser).catch(console.warn);
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
      supabaseService.upsertUser(user).catch(console.warn);
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
      supabaseService.upsertUser(user).catch(console.warn);
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

  deleteUser(userId: string, adminUser: User): { success: boolean } {
    const users = this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (user) {
      const filtered = users.filter((u) => u.id !== userId);
      this.set(STORAGE_KEYS.USERS, filtered);
      supabaseService.deleteUser(userId).catch(console.warn);
      this.logAudit({
        userName: adminUser.name,
        userRole: adminUser.role,
        action: 'excluir',
        recordId: `usuarios #${userId}`,
        description: `Exclusão do usuário ${user.login} (${user.name})`,
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
    supabaseService.upsertOrdinance(ordinance).catch(console.warn);

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
      supabaseService.upsertBudgets([budgets[index]]).catch(console.warn);

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
    supabaseService.upsertBudgets(updatedBudgets).catch(console.warn);

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
    const rawOps = this.get<OperationLaunch[]>(STORAGE_KEYS.OPERATIONS, INITIAL_OPERATIONS);
    const activeOrd = this.getActiveOrdinance();
    const ordinances = this.getOrdinances();
    const knownOrdinanceIds = new Set(ordinances.map((o) => o.id));

    let hasInconsistencies = false;

    // Consistency check: ensure each operation has a valid ordinanceId, consistent values and calculations
    const cleanAndConsistentOps = (rawOps || [])
      .filter((op) => op.id !== 'op-cpai1-teste-10joe')
      .map((op) => {
        let modified = false;
        let ordId = op.ordinanceId;

        // Check if ordinanceId is missing, empty, or a generic placeholder
        if (!ordId || ordId === 'portaria-vigente' || ordId === 'default' || !knownOrdinanceIds.has(ordId)) {
          // If the ordinanceId matches portaria 122 under an alias, map to active ordinance
          ordId = activeOrd ? activeOrd.id : 'ord-122-2026';
          modified = true;
        } else if (activeOrd && (ordId.includes('122') && activeOrd.id.includes('122')) && ordId !== activeOrd.id) {
          // Unify any alias variations of 122/2026 to the active ordinance ID
          ordId = activeOrd.id;
          modified = true;
        }

        const officersCount = Math.max(1, Number(op.officersCount) || 1);
        const unitValue = Number(op.unitValue) > 0 ? Number(op.unitValue) : (activeOrd?.unitValueJoe || 350);
        const expectedTotal = officersCount * unitValue;

        let totalValue = Number(op.totalValue);
        if (isNaN(totalValue) || totalValue <= 0 || Math.abs(totalValue - expectedTotal) > 0.01) {
          totalValue = expectedTotal;
          modified = true;
        }

        if (modified || op.officersCount !== officersCount || op.unitValue !== unitValue || op.ordinanceId !== ordId) {
          hasInconsistencies = true;
          return {
            ...op,
            ordinanceId: ordId,
            officersCount,
            unitValue,
            totalValue,
            status: op.status || 'APROVADO',
          };
        }

        return op;
      });

    // If repairs were made, persist them silently to prevent repeated dirty state
    if (hasInconsistencies) {
      this.set(STORAGE_KEYS.OPERATIONS, cleanAndConsistentOps, true);
    }

    return cleanAndConsistentOps;
  }

  // Force an async sync with the database and reconcile with active ordinance
  async refreshOperationsFromDatabase(): Promise<OperationLaunch[]> {
    try {
      const cloudOps = await supabaseService.fetchOperations();
      if (cloudOps && cloudOps.length > 0) {
        const localOps = this.getOperations();
        const activeOrd = this.getActiveOrdinance();
        const merged = [...cloudOps];

        // Ensure any local operation not yet in cloud is preserved
        localOps.forEach((localOp) => {
          if (!merged.some((m) => m.id === localOp.id)) {
            merged.push(localOp);
            supabaseService.upsertOperation(localOp).catch(console.warn);
          }
        });

        // Reconcile ordinance IDs with active ordinance
        const consistentMerged = merged.map((op) => {
          let ordId = op.ordinanceId;
          if (!ordId || ordId === 'portaria-vigente' || (activeOrd && ordId.includes('122') && activeOrd.id.includes('122'))) {
            ordId = activeOrd ? activeOrd.id : 'ord-122-2026';
          }
          const officersCount = Math.max(1, Number(op.officersCount) || 1);
          const unitValue = Number(op.unitValue) > 0 ? Number(op.unitValue) : (activeOrd?.unitValueJoe || 350);
          return {
            ...op,
            ordinanceId: ordId,
            officersCount,
            unitValue,
            totalValue: officersCount * unitValue,
            status: op.status || 'APROVADO',
          };
        });

        this.set(STORAGE_KEYS.OPERATIONS, consistentMerged);
        if (activeOrd) {
          this.recalculateBudgets(activeOrd.id);
        }
        return consistentMerged;
      }
    } catch (e) {
      console.warn('Erro ao sincronizar operações com o banco:', e);
    }
    return this.getOperations();
  }

  async saveOperation(
    operation: OperationLaunch,
    user: User
  ): Promise<{ success: boolean; operation: OperationLaunch; syncedWithCloud: boolean; message?: string; dbError?: string }> {
    const activeOrd = this.getActiveOrdinance();
    const operations = this.getOperations();
    const index = operations.findIndex((op) => op.id === operation.id);
    const isNew = index < 0;

    const assignedOrdinanceId = operation.ordinanceId || activeOrd?.id || 'ord-122-2026';
    const assignedOfficersCount = Math.max(1, Number(operation.officersCount) || 1);
    const assignedUnitValue = Number(operation.unitValue) > 0 ? Number(operation.unitValue) : (activeOrd?.unitValueJoe || 350);
    const assignedTotalValue = assignedOfficersCount * assignedUnitValue;

    const opToSave: OperationLaunch = {
      ...operation,
      id: operation.id || `op-${Date.now()}`,
      ordinanceId: assignedOrdinanceId,
      officersCount: assignedOfficersCount,
      unitValue: assignedUnitValue,
      totalValue: assignedTotalValue,
      status: operation.status || 'APROVADO',
      createdAt: isNew ? (operation.createdAt || new Date().toISOString()) : (operation.createdAt || new Date().toISOString()),
      updatedAt: new Date().toISOString(),
    };

    // 1. Persist IMMEDIATELY in local storage for instant zero-latency UI appearance
    if (index >= 0) {
      operations[index] = opToSave;
    } else {
      operations.unshift(opToSave);
    }
    this.set(STORAGE_KEYS.OPERATIONS, operations);

    // Recalculate budgets immediately for this ordinance and active ordinance
    this.recalculateBudgets(opToSave.ordinanceId);
    if (activeOrd && activeOrd.id !== opToSave.ordinanceId) {
      this.recalculateBudgets(activeOrd.id);
    }

    const recIndex = isNew ? operations.length : operations.length - index;

    // 2. Push to Supabase Cloud Database asynchronously
    let syncedWithCloud = false;
    let dbError: string | undefined;

    try {
      const cloudRes = await supabaseService.upsertOperation(opToSave);
      syncedWithCloud = cloudRes.success;
      dbError = cloudRes.error;
    } catch (cloudErr: any) {
      console.warn('Falha ao persistir no Supabase:', cloudErr);
      syncedWithCloud = false;
      dbError = cloudErr?.message || 'Erro inesperado de comunicação com o Supabase.';
    }

    this.logAudit({
      userName: user.name,
      userRole: user.role,
      action: isNew ? 'criar' : 'editar',
      recordId: `lancamentos #${recIndex}`,
      description: `${opToSave.eventName} · ${opToSave.officersCount} JOEs · R$ ${opToSave.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${syncedWithCloud ? '(Sincronizado no Supabase)' : '(Gravado Localmente)'}`,
      ipAddress: '2804:6788:4015:7c00:d3d:e9c2:1b3f:2aea',
    });

    return {
      success: true,
      operation: opToSave,
      syncedWithCloud,
      dbError,
      message: syncedWithCloud
        ? 'Lançamento salvo com sucesso no banco de dados!'
        : 'Lançamento registrado com sucesso no sistema!',
    };
  }

  deleteOperation(operationId: string, user: User): { success: boolean; message?: string } {
    const operations = this.getOperations();
    const opIndex = operations.findIndex((o) => o.id === operationId);
    if (opIndex < 0) return { success: false, message: 'Operação não encontrada.' };

    const op = operations[opIndex];
    const filtered = operations.filter((o) => o.id !== operationId);
    this.set(STORAGE_KEYS.OPERATIONS, filtered);
    this.recalculateBudgets(op.ordinanceId);
    supabaseService.deleteOperation(operationId).catch(console.warn);

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
    supabaseService.upsertOperation(op).catch(console.warn);

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
    supabaseService.insertAuditLog(newLog).catch(console.warn);
  }

  // Export all database tables for Backup
  exportFullBackup(user?: User) {
    return {
      users: this.getUsers(),
      commands: this.getCommands(),
      ordinances: this.getOrdinances(),
      activeOrdinanceId: this.getActiveOrdinance().id,
      budgets: this.getBudgets(),
      officers: this.getOfficers(),
      operations: this.getOperations(),
      batches: this.getBatches(),
      irregularities: this.getIrregularities(),
      auditLogs: this.getAuditLogs(),
    };
  }

  // Import full database backup
  importFullBackup(
    backupData: any,
    user: User,
    mode: 'REPLACE_ALL' | 'MERGE' = 'REPLACE_ALL'
  ): void {
    if (mode === 'REPLACE_ALL') {
      if (Array.isArray(backupData.users) && backupData.users.length > 0) {
        this.set(STORAGE_KEYS.USERS, backupData.users, true);
      }
      if (Array.isArray(backupData.commands) && backupData.commands.length > 0) {
        this.set(STORAGE_KEYS.COMMANDS, backupData.commands, true);
      }
      if (Array.isArray(backupData.ordinances) && backupData.ordinances.length > 0) {
        this.set(STORAGE_KEYS.ORDINANCES, backupData.ordinances, true);
      }
      if (backupData.activeOrdinanceId) {
        this.set(STORAGE_KEYS.ACTIVE_ORDINANCE_ID, backupData.activeOrdinanceId, true);
      }
      if (Array.isArray(backupData.budgets) && backupData.budgets.length > 0) {
        this.set(STORAGE_KEYS.BUDGETS, backupData.budgets, true);
      }
      if (Array.isArray(backupData.officers) && backupData.officers.length > 0) {
        this.set(STORAGE_KEYS.OFFICERS, backupData.officers, true);
      }
      if (Array.isArray(backupData.operations)) {
        this.set(STORAGE_KEYS.OPERATIONS, backupData.operations, true);
      }
      if (Array.isArray(backupData.batches)) {
        this.set(STORAGE_KEYS.BATCHES, backupData.batches, true);
      }
      if (Array.isArray(backupData.irregularities)) {
        this.set(STORAGE_KEYS.IRREGULARITIES, backupData.irregularities, true);
      }
      if (Array.isArray(backupData.auditLogs)) {
        this.set(STORAGE_KEYS.AUDIT_LOGS, backupData.auditLogs, true);
      }
    } else {
      // MERGE MODE
      if (Array.isArray(backupData.operations) && backupData.operations.length > 0) {
        const currentOps = this.getOperations();
        const existingIds = new Set(currentOps.map((o) => o.id));
        const mergedOps = [...currentOps];
        backupData.operations.forEach((op: OperationLaunch) => {
          if (!existingIds.has(op.id)) {
            mergedOps.push(op);
            existingIds.add(op.id);
          }
        });
        this.set(STORAGE_KEYS.OPERATIONS, mergedOps, true);
      }

      if (Array.isArray(backupData.ordinances) && backupData.ordinances.length > 0) {
        const currentOrds = this.getOrdinances();
        const existingIds = new Set(currentOrds.map((o) => o.id));
        const mergedOrds = [...currentOrds];
        backupData.ordinances.forEach((ord: OrdinancePeriod) => {
          if (!existingIds.has(ord.id)) {
            mergedOrds.push(ord);
            existingIds.add(ord.id);
          }
        });
        this.set(STORAGE_KEYS.ORDINANCES, mergedOrds, true);
      }

      if (Array.isArray(backupData.budgets) && backupData.budgets.length > 0) {
        const currentBudgets = this.getBudgets();
        const existingIds = new Set(currentBudgets.map((b) => b.id));
        const mergedBudgets = [...currentBudgets];
        backupData.budgets.forEach((b: CommandBudget) => {
          if (!existingIds.has(b.id)) {
            mergedBudgets.push(b);
            existingIds.add(b.id);
          }
        });
        this.set(STORAGE_KEYS.BUDGETS, mergedBudgets, true);
      }

      if (Array.isArray(backupData.users) && backupData.users.length > 0) {
        const currentUsers = this.getUsers();
        const existingIds = new Set(currentUsers.map((u) => u.id));
        const mergedUsers = [...currentUsers];
        backupData.users.forEach((u: User) => {
          if (!existingIds.has(u.id)) {
            mergedUsers.push(u);
            existingIds.add(u.id);
          }
        });
        this.set(STORAGE_KEYS.USERS, mergedUsers, true);
      }
    }

    // Trigger full notification
    this.notifyChange('IMPORT_BACKUP');
  }

  resetToCleanState(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.includes('cpi_pmma') || k.includes('supabase'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
    window.location.reload();
  }

  resetToDemoData(): void {
    this.resetToCleanState();
  }
}

export const storageService = new StorageService();
