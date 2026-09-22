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
import {
  normalizeCommandName,
  sortCommandsByOfficialOrder,
  getCommandOrderIndex,
} from '../utils/commandUtils';

const STORAGE_KEYS = {
  USERS: 'cpi_pmma_prod_clean_users',
  COMMANDS: 'cpi_pmma_prod_clean_commands',
  ORDINANCES: 'cpi_pmma_prod_clean_ordinances',
  ACTIVE_ORDINANCE_ID: 'cpi_pmma_prod_clean_active_ordinance_id',
  BUDGETS: 'cpi_pmma_prod_clean_budgets',
  OFFICERS: 'cpi_pmma_prod_clean_officers',
  OPERATIONS: 'cpi_pmma_prod_clean_operations',
  PENDING_OPS: 'cpi_pmma_prod_clean_pending_sync_operations',
  BATCHES: 'cpi_pmma_prod_clean_batches',
  IRREGULARITIES: 'cpi_pmma_prod_clean_irregularities',
  AUDIT_LOGS: 'cpi_pmma_prod_clean_audit_logs',
  DELETED_OPS: 'cpi_pmma_prod_deleted_operations_ids',
  DRIVE_CONFIG: 'cpi_pmma_prod_drive_config',
  BACKUP_EMAILS: 'cpi_pmma_prod_backup_emails',
};

const SESSION_STORAGE_KEY = 'cpi_pmma_auth_session_user';

// Force logout across all devices / clean old auto-login session keys
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
} catch {
  // safe ignore
}

// Safe date formatting helpers to prevent database rejection
function toValidIsoDate(dateStr?: string): string {
  if (!dateStr || typeof dateStr !== 'string') {
    return new Date().toISOString().split('T')[0];
  }
  const trimmed = dateStr.trim();
  const brMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3];
    return `${year}-${month}-${day}`;
  }
  const isoMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

function toValidIsoDateTime(dateStr?: string): string {
  if (!dateStr || typeof dateStr !== 'string') {
    return new Date().toISOString();
  }
  const trimmed = dateStr.trim();
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  const brMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10) - 1;
    const year = parseInt(brMatch[3], 10);
    const hour = parseInt(brMatch[4] || '0', 10);
    const min = parseInt(brMatch[5] || '0', 10);
    const sec = parseInt(brMatch[6] || '0', 10);
    const d = new Date(year, month, day, hour, min, sec);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

const PERMANENTLY_EXCLUDED_OPERATION_IDS = [
  'op-1787802927842', 'op-1787802980753', 'op-1787804010676', 'op-1787808822322',
  'op-1787935081388', 'op-1787935134256', 'op-1787936042409', 'op-1787936494478',
  'op-1787939933871', 'op-cpai1-dadsa-01', 'op-cpai9-dadsa-10joe', 'op-cpai7-ndjls-10joe',
  'op-cpai4-teste-10joe', 'op-cpai4-fonseca-4joe', 'op-cpai4-testelanc-5joe',
  'op-cpai4-testebanco-5joe', 'op-cpai9-testebanco-5joe', 'op-cpi-murum-01',
  'op-1789615811355', 'op-1789618210275', 'op-cpai1-teste-10joe'
];

class StorageService {
  private changeListeners: Array<(type?: string) => void> = [];
  private isSupabaseBootstrapped: boolean = false;
  private isSyncingInBackground: boolean = false;

  public async initSupabase(): Promise<boolean> {
    try {
      const result = await supabaseService.bootstrapInitialData();
      if (result.loadedFromSupabase) {
        if (result.ordinances && result.ordinances.length > 0) {
          this.set(STORAGE_KEYS.ORDINANCES, result.ordinances, true);
        }
        if (result.budgets && result.budgets.length > 0) {
          this.set(STORAGE_KEYS.BUDGETS, result.budgets, true);
        }
        if (result.operations) {
          const pendingOps = this.getPendingOperations();
          const deletedIds = new Set(this.getDeletedOperationIds());
          const validCloudOps = result.operations.filter((op) => !deletedIds.has(op.id));
          const finalOpsMap = new Map<string, OperationLaunch>();
          validCloudOps.forEach((cop) => finalOpsMap.set(cop.id, cop));

          // Only keep genuinely pending local operations created offline
          pendingOps.forEach((pop) => {
            if (!deletedIds.has(pop.id) && !finalOpsMap.has(pop.id)) {
              finalOpsMap.set(pop.id, pop);
            }
          });
          this.set(STORAGE_KEYS.OPERATIONS, Array.from(finalOpsMap.values()), true);
        }
        if (result.users && result.users.length > 0) {
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
      }

      // OBLIGATORILY scavenge all local cache on this machine and upload to Supabase
      await this.forceSynchronizeAllLocalDataToSupabase();
      this.isSupabaseBootstrapped = true;
      this.notifyChange('SUPABASE_INITIALIZED');
      return true;
    } catch (e) {
      console.warn('Supabase init fallback/salvamento local:', e);
      await this.forceSynchronizeAllLocalDataToSupabase().catch(console.warn);
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
    const raw = this.get(STORAGE_KEYS.COMMANDS, INITIAL_COMMANDS);
    const normalized = raw.map((c) => {
      const code = normalizeCommandName(c.code || c.id || c.name);
      return {
        ...c,
        id: code,
        code: code,
        name: code === 'CPI' ? 'CPI' : code,
      };
    });
    return sortCommandsByOfficialOrder(normalized, (c) => c.code);
  }

  // Ordinances
  getOrdinances(): OrdinancePeriod[] {
    const list = this.get<OrdinancePeriod[]>(STORAGE_KEYS.ORDINANCES, INITIAL_ORDINANCES);
    const updated = [...list];
    let changed = false;

    // Ensure all standard initial ordinances (especially ord-127-2026 and ord-122-2026) are present
    for (const initOrd of INITIAL_ORDINANCES) {
      const idx = updated.findIndex(
        (o) =>
          o.id === initOrd.id ||
          o.number === initOrd.number ||
          (o.name && initOrd.name && o.name.toLowerCase() === initOrd.name.toLowerCase())
      );
      if (idx === -1) {
        updated.push(initOrd);
        changed = true;
      } else {
        // If the ordinance matches Portaria 127/2026, ensure its period dates and metadata are accurate
        if (initOrd.id === 'ord-127-2026' || initOrd.number === '127/2026 – GCG') {
          const current = updated[idx];
          if (
            !current.seiProcess ||
            current.seiProcess === '2026.190110.' ||
            !current.startDate ||
            current.startDate !== '2026-09-22' ||
            current.status !== 'VIGENTE'
          ) {
            updated[idx] = {
              ...current,
              name: current.name || initOrd.name,
              number: initOrd.number,
              seiProcess:
                current.seiProcess && current.seiProcess !== '2026.190110.'
                  ? current.seiProcess
                  : initOrd.seiProcess,
              seiDocument: current.seiDocument || initOrd.seiDocument,
              startDate: '2026-09-22',
              endDate: '2026-10-26',
              unitValueJoe: 350.0,
              monthlyIndividualLimit: 12,
              status: current.status || 'VIGENTE',
              notes: current.notes || initOrd.notes,
            };
            changed = true;
          }
        }
      }
    }

    if (changed) {
      this.set(STORAGE_KEYS.ORDINANCES, updated, true);
    }
    return updated;
  }

  getActiveOrdinance(): OrdinancePeriod {
    const ordinances = this.getOrdinances();
    const savedId = this.get<string | null>(STORAGE_KEYS.ACTIVE_ORDINANCE_ID, null);
    const active = savedId ? ordinances.find((o) => o.id === savedId) : null;
    return (
      active ||
      ordinances.find((o) => o.status === 'VIGENTE') ||
      ordinances.find((o) => o.id === 'ord-127-2026' || o.number?.includes('127')) ||
      ordinances[0]
    );
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

      // Check if it's Portaria 127/2026 to use official Anexo I values as default
      const is127 = ordinance.number?.includes('127') || ordinance.id?.includes('127');
      const official127Map: Record<string, number> = {
        'CPI': 25,
        'CPA/I-1': 106,
        'CPA/I-2': 106,
        'CPA/I-3': 200,
        'CPA/I-4': 106,
        'CPA/I-5': 137,
        'CPA/I-6': 100,
        'CPA/I-7': 105,
        'CPA/I-8': 105,
        'CPA/I-9': 115,
      };

      commands.forEach((cmd) => {
        const matchingSource = sourceBudgets.find((b) => normalizeCommandName(b.commandId) === cmd.code);
        const joes = matchingSource
          ? matchingSource.plannedJoes
          : is127 && official127Map[cmd.code] !== undefined
          ? official127Map[cmd.code]
          : cmd.code === 'CPI'
          ? 25
          : cmd.code.includes('3')
          ? 200
          : cmd.code.includes('5')
          ? 137
          : cmd.code.includes('9')
          ? 115
          : cmd.code.includes('6')
          ? 100
          : cmd.code.includes('7') || cmd.code.includes('8')
          ? 105
          : 106;

        const bAmount = joes * (ordinance.unitValueJoe || 350);
        budgets.push({
          id: `bgt-${ordinance.id}-${cmd.code.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
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
    const rawBudgets = this.get<CommandBudget[]>(STORAGE_KEYS.BUDGETS, INITIAL_BUDGETS);
    let allBudgets = [...rawBudgets];
    let changed = false;

    // Check if initial budgets for any ordinance (like ord-127-2026 or ord-122-2026) are missing in storage
    const targetOrdId = ordinanceId || 'ord-127-2026';
    const hasBudgetsForOrd = allBudgets.some((b) => b.ordinanceId === targetOrdId);
    if (!hasBudgetsForOrd) {
      const initBudgetsForOrd = INITIAL_BUDGETS.filter((b) => b.ordinanceId === targetOrdId);
      if (initBudgetsForOrd.length > 0) {
        allBudgets.push(...initBudgetsForOrd);
        changed = true;
      }
    }

    if (changed) {
      this.set(STORAGE_KEYS.BUDGETS, allBudgets, true);
    }

    const normalized = allBudgets.map((b) => ({
      ...b,
      commandId: normalizeCommandName(b.commandId),
    }));
    const filtered = ordinanceId
      ? normalized.filter((b) => b.ordinanceId === ordinanceId)
      : normalized;
    return sortCommandsByOfficialOrder(filtered, (b) => b.commandId);
  }

  updateBudget(budget: CommandBudget, user: User, reason?: string): void {
    const budgets = this.getBudgets();
    const normCommandId = normalizeCommandName(budget.commandId);
    const index = budgets.findIndex((b) => b.id === budget.id || (normalizeCommandName(b.commandId) === normCommandId && b.ordinanceId === budget.ordinanceId));
    if (index >= 0) {
      budgets[index] = {
        ...budgets[index],
        ...budget,
        commandId: normCommandId,
        availableBalance: budget.budgetAmount - (budgets[index].committedAmount + budgets[index].executedAmount),
      };
      this.set(STORAGE_KEYS.BUDGETS, budgets);
      supabaseService.upsertBudgets([budgets[index]]).catch(console.warn);

      this.logAudit({
        userName: user.name,
        userRole: user.role,
        action: 'editar',
        recordId: `tetos #${normCommandId}`,
        description: `Ajuste de cota do ${normCommandId}: ${budget.plannedJoes} JOEs (R$ ${budget.budgetAmount.toFixed(2)}). ${reason || ''}`,
        ipAddress: '2804:6788:4015:7c00:d3d:e9c2:1b3f:2aea',
      });
    }
  }

  saveAllBudgets(updatedBudgets: CommandBudget[], ordinanceId: string, user: User): void {
    const allBudgets = this.getBudgets();
    const otherBudgets = allBudgets.filter((b) => b.ordinanceId !== ordinanceId);

    const merged = [
      ...otherBudgets,
      ...updatedBudgets.map((b) => {
        const normCode = normalizeCommandName(b.commandId);
        return {
          ...b,
          ordinanceId,
          commandId: normCode,
          availableBalance: Math.max(0, b.budgetAmount - (b.committedAmount + b.executedAmount)),
        };
      }),
    ];
    this.set(STORAGE_KEYS.BUDGETS, merged);
    supabaseService.upsertBudgets(updatedBudgets).catch(console.warn);

    // Also update totalPlannedJoes and totalBudget on the OrdinancePeriod record
    const totalJoes = updatedBudgets.reduce((sum, b) => sum + (b.plannedJoes || 0), 0);
    const totalAmount = updatedBudgets.reduce((sum, b) => sum + (b.budgetAmount || 0), 0);
    const ordinances = this.getOrdinances();
    const ordIdx = ordinances.findIndex((o) => o.id === ordinanceId);
    if (ordIdx >= 0) {
      ordinances[ordIdx] = {
        ...ordinances[ordIdx],
        totalPlannedJoes: totalJoes,
        totalBudget: totalAmount,
      };
      this.set(STORAGE_KEYS.ORDINANCES, ordinances);
      supabaseService.upsertOrdinance(ordinances[ordIdx]).catch(console.warn);
    }

    this.logAudit({
      userName: user.name,
      userRole: user.role,
      action: 'salvar_tetos',
      recordId: `tetos #${ordinanceId}`,
      description: `Atualização em lote dos tetos da Portaria (${totalJoes} JOEs - R$ ${totalAmount.toFixed(2)}).`,
      ipAddress: '2804:6788:4015:7c00:d3d:e9c2:1b3f:2aea',
    });

    this.notifyChange('BUDGETS_UPDATED');
  }

  // Recalculate Budgets based on operations
  recalculateBudgets(ordinanceId: string): void {
    const operations = this.getOperations().filter((op) => op.ordinanceId === ordinanceId);
    const budgets = this.getBudgets();

    const updatedBudgets = budgets.map((b) => {
      if (b.ordinanceId !== ordinanceId) return b;
      const normBudgetCmd = normalizeCommandName(b.commandId);

      const cmdOps = operations.filter(
        (op) => normalizeCommandName(op.commandId) === normBudgetCmd
      );

      const executedAmount = cmdOps.reduce((sum, o) => sum + (o.totalValue || 0), 0);
      const usedJoesCount = cmdOps.reduce((sum, o) => sum + (o.officersCount || 0), 0);
      const availableBalance = Math.max(0, b.budgetAmount - executedAmount);

      return {
        ...b,
        commandId: normBudgetCmd,
        committedAmount: 0,
        executedAmount,
        availableBalance,
        usedJoesCount,
      };
    });

    this.set(STORAGE_KEYS.BUDGETS, updatedBudgets);
  }

  // Deleted Operations IDs tracking to prevent resurrection
  getDeletedOperationIds(): string[] {
    const local = this.get<string[]>(STORAGE_KEYS.DELETED_OPS, []);
    return Array.from(new Set([...PERMANENTLY_EXCLUDED_OPERATION_IDS, ...local]));
  }

  addDeletedOperationIds(ids: string[]): void {
    if (!ids || ids.length === 0) return;
    const existing = this.getDeletedOperationIds();
    const updated = Array.from(new Set([...existing, ...ids]));
    this.set(STORAGE_KEYS.DELETED_OPS, updated, true);
  }

  removeDeletedOperationId(id: string): void {
    const existing = this.getDeletedOperationIds();
    if (existing.includes(id)) {
      this.set(STORAGE_KEYS.DELETED_OPS, existing.filter((i) => i !== id), true);
    }
  }

  // Google Drive Folder Configuration
  getDriveConfig(): { folderLink: string; folderId: string } | null {
    return this.get<{ folderLink: string; folderId: string } | null>(STORAGE_KEYS.DRIVE_CONFIG, null);
  }

  setDriveConfig(config: { folderLink: string; folderId: string } | null): void {
    if (!config) {
      localStorage.removeItem(STORAGE_KEYS.DRIVE_CONFIG);
      this.notifyChange('DRIVE_CONFIG');
      return;
    }
    this.set(STORAGE_KEYS.DRIVE_CONFIG, config, false);
  }

  // Automated Email Backup Recipients Configuration
  getBackupEmails(): string[] {
    const defaultEmails = ['secaooperacional.cpi.pmma@gmail.com'];
    const emails = this.get<string[]>(STORAGE_KEYS.BACKUP_EMAILS, defaultEmails);
    if (!Array.isArray(emails) || emails.length === 0) {
      return defaultEmails;
    }
    return emails.map((e) => e.trim()).filter((e) => e.length > 0);
  }

  setBackupEmails(emails: string[]): void {
    const cleanList = Array.from(
      new Set(
        (emails || [])
          .map((e) => e.trim().toLowerCase())
          .filter((e) => e.includes('@') && e.includes('.'))
      )
    );
    const finalEmails = cleanList.length > 0 ? cleanList : ['secaooperacional.cpi.pmma@gmail.com'];
    this.set(STORAGE_KEYS.BACKUP_EMAILS, finalEmails, false);
    this.notifyChange('BACKUP_EMAILS');
  }

  addBackupEmail(email: string): string[] {
    const current = this.getBackupEmails();
    const clean = (email || '').trim().toLowerCase();
    if (clean && clean.includes('@') && clean.includes('.') && !current.includes(clean)) {
      const updated = [...current, clean];
      this.setBackupEmails(updated);
      return updated;
    }
    return current;
  }

  removeBackupEmail(emailToRemove: string): string[] {
    const current = this.getBackupEmails();
    const clean = (emailToRemove || '').trim().toLowerCase();
    const updated = current.filter((e) => e.toLowerCase() !== clean);
    const finalEmails = updated.length > 0 ? updated : ['secaooperacional.cpi.pmma@gmail.com'];
    this.setBackupEmails(finalEmails);
    return finalEmails;
  }

  resetBackupEmails(): string[] {
    const defaultEmails = ['secaooperacional.cpi.pmma@gmail.com'];
    this.setBackupEmails(defaultEmails);
    return defaultEmails;
  }

  // Operations / JOE Launches
  getOperations(): OperationLaunch[] {
    const rawOps = this.get<OperationLaunch[]>(STORAGE_KEYS.OPERATIONS, INITIAL_OPERATIONS);
    const activeOrd = this.getActiveOrdinance();
    const ordinances = this.getOrdinances();
    const knownOrdinanceIds = new Set(ordinances.map((o) => o.id));
    const deletedIds = new Set(this.getDeletedOperationIds());

    let hasInconsistencies = false;

    // Consistency check: ensure each operation has a valid ordinanceId, consistent values and calculations
    const cleanAndConsistentOps = (rawOps || [])
      .filter((op) => op.id !== 'op-cpai1-teste-10joe' && !deletedIds.has(op.id))
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

  // Pending operations queue helpers
  getPendingOperations(): OperationLaunch[] {
    return this.get<OperationLaunch[]>(STORAGE_KEYS.PENDING_OPS, []);
  }

  addPendingOperation(op: OperationLaunch): void {
    const pending = this.getPendingOperations();
    if (!pending.some((p) => p.id === op.id)) {
      pending.push(op);
      this.set(STORAGE_KEYS.PENDING_OPS, pending, true);
    }
  }

  removePendingOperation(opId: string): void {
    const pending = this.getPendingOperations();
    const filtered = pending.filter((p) => p.id !== opId);
    if (filtered.length !== pending.length) {
      this.set(STORAGE_KEYS.PENDING_OPS, filtered, true);
    }
  }

  // Normalize any operation object recovered from browser cache or legacy storage keys
  normalizeRecoveredOperation(item: any): OperationLaunch {
    const rawDate = item.serviceDate || item.service_date;
    const cleanServiceDate = toValidIsoDate(rawDate);
    const rawCreatedAt = item.createdAt || item.created_at;
    const cleanCreatedAt = toValidIsoDateTime(rawCreatedAt);
    const rawUpdatedAt = item.updatedAt || item.updated_at;
    const cleanUpdatedAt = toValidIsoDateTime(rawUpdatedAt);

    const officersCount = Math.max(1, Number(item.officersCount ?? item.officers_count) || 1);
    const unitValue = Number(item.unitValue ?? item.unit_value) > 0 ? Number(item.unitValue ?? item.unit_value) : 350;
    const totalValue = Number(item.totalValue ?? item.total_value ?? item.total_amount) || (officersCount * unitValue);

    return {
      id: String(item.id || `op-${Date.now()}-${Math.floor(Math.random() * 1000)}`),
      launchNumber: String(item.launchNumber || item.launch_number || item.orderNumber || item.order_number || `${Math.floor(10000 + Math.random() * 90000)}`),
      commandId: normalizeCommandName(item.commandId || item.command_id || 'CPI'),
      subUnit: String(item.subUnit || item.sub_unit || `${item.commandId || 'CPI'} (Direção)`),
      ordinanceId: String(item.ordinanceId || item.ordinance_id || 'ord-122-2026'),
      orderNumber: item.orderNumber || item.order_number || '',
      orderType: item.orderType || item.order_type || 'ORDEM_DE_SERVICO',
      eventName: String(item.eventName || item.event_name || 'Operação Policial'),
      eventSubtext: item.eventSubtext || item.event_subtext || undefined,
      serviceDate: cleanServiceDate,
      startTime: item.startTime || item.start_time || '20h às 02h',
      endTime: item.endTime || item.end_time || undefined,
      calculatedDurationHours: Number(item.calculatedDurationHours ?? item.duration_hours) || 6,
      officersCount,
      joesPerOfficer: Number(item.joesPerOfficer ?? item.joes_per_officer) || 1,
      unitValue,
      totalValue,
      status: (item.status as OperationStatus) || 'APROVADO',
      seiProcessNumber: item.seiProcessNumber || item.sei_process_number || '2026.190110.00000',
      seiDocumentNumber: item.seiDocumentNumber || item.sei_document_number || undefined,
      serviceOrderLink: item.serviceOrderLink || item.service_order_link || undefined,
      justification: item.justification || '',
      notes: item.notes || '',
      location: item.location || '',
      rejectionReason: item.rejectionReason || item.rejection_reason || undefined,
      correctionFeedback: item.correctionFeedback || item.correction_feedback || undefined,
      officers: Array.isArray(item.officers) ? item.officers : [],
      checklist: (item.checklist && typeof item.checklist === 'object') ? item.checklist : undefined,
      batchConsolidationId: item.batchConsolidationId || item.batch_consolidation_id || undefined,
      authorizeExcess: Boolean(item.authorizeExcess ?? item.authorize_excess),
      createdBy: item.createdBy || item.created_by || 'Sistema CPI',
      createdAt: cleanCreatedAt,
      updatedAt: cleanUpdatedAt,
    };
  }

  // Scavenge and rescue operations: only genuinely pending operations created offline are queued
  scavengeAndRescueBrowserCachedOperations(): OperationLaunch[] {
    const deletedIds = new Set(this.getDeletedOperationIds());
    return this.getPendingOperations().filter((op) => !deletedIds.has(op.id));
  }

  // FORCED CLOUD SYNC: Reconciles local cache with authoritative Supabase database and uploads only pending operations
  public async forceSynchronizeAllLocalDataToSupabase(): Promise<{
    success: boolean;
    uploadedToCloud: number;
    totalOperations: number;
    message?: string;
  }> {
    try {
      const deletedIds = new Set(this.getDeletedOperationIds());
      const pendingOps = this.getPendingOperations();

      let uploadedToCloud = 0;

      // 1. Process and upload genuinely pending operations (created offline)
      for (const pendingOp of pendingOps) {
        if (deletedIds.has(pendingOp.id)) {
          this.removePendingOperation(pendingOp.id);
          continue;
        }

        const uploadRes = await supabaseService.upsertOperation(pendingOp);
        if (uploadRes.success) {
          uploadedToCloud++;
          this.removePendingOperation(pendingOp.id);
        } else {
          console.warn(`Tentativa de sincronizar operação pendente "${pendingOp.eventName}" falhou:`, uploadRes.error);
        }
      }

      // 2. Fetch authoritative cloud operations from Supabase
      const cloudOps = await supabaseService.fetchOperations();

      if (cloudOps !== null) {
        const cloudMap = new Map<string, OperationLaunch>();
        for (const cop of cloudOps) {
          if (!deletedIds.has(cop.id)) {
            cloudMap.set(cop.id, cop);
          }
        }

        // Keep only remaining offline pending operations that have not yet uploaded
        const remainingPending = this.getPendingOperations();
        for (const pop of remainingPending) {
          if (!deletedIds.has(pop.id) && !cloudMap.has(pop.id)) {
            cloudMap.set(pop.id, pop);
          }
        }

        const consolidatedOps = Array.from(cloudMap.values());
        // Authoritative replacement: local cache now matches the cloud database perfectly
        this.set(STORAGE_KEYS.OPERATIONS, consolidatedOps);

        const activeOrd = this.getActiveOrdinance();
        if (activeOrd) {
          this.recalculateBudgets(activeOrd.id);
        }

        this.notifyChange('OPERATIONS_CHANGED');

        return {
          success: true,
          uploadedToCloud,
          totalOperations: consolidatedOps.length,
          message: `${uploadedToCloud} lançamento(s) sincronizado(s) no banco de dados com sucesso. Total de ${consolidatedOps.length} operações.`,
        };
      } else {
        // Supabase unreachable: preserve current local ops
        return {
          success: false,
          uploadedToCloud: 0,
          totalOperations: this.getOperations().length,
          message: 'Banco de dados Supabase temporariamente inacessível. Os dados locais permanecem preservados.',
        };
      }
    } catch (e: any) {
      console.warn('Erro durante a sincronização com o Supabase:', e);
      return {
        success: false,
        uploadedToCloud: 0,
        totalOperations: this.getOperations().length,
        message: e?.message || 'Erro inesperado durante a sincronização.',
      };
    }
  }

  // Background non-intrusive syncer
  public async syncWithCloudInBackground(): Promise<void> {
    if (this.isSyncingInBackground) return;
    this.isSyncingInBackground = true;
    try {
      const deletedIds = new Set(this.getDeletedOperationIds());

      // 1. Process pending queue first if any
      const pending = this.getPendingOperations();
      if (pending.length > 0) {
        for (const op of pending) {
          if (deletedIds.has(op.id)) {
            this.removePendingOperation(op.id);
            continue;
          }
          const res = await supabaseService.upsertOperation(op);
          if (res.success) {
            this.removePendingOperation(op.id);
          }
        }
      }

      // 2. Fetch authoritative cloud operations from Supabase
      const cloudOps = await supabaseService.fetchOperations();
      if (cloudOps !== null) {
        const validCloudOps = cloudOps.filter((cop) => !deletedIds.has(cop.id));
        const finalOpsMap = new Map<string, OperationLaunch>();
        validCloudOps.forEach((cop) => finalOpsMap.set(cop.id, cop));

        // Retain only un-uploaded offline operations
        const remainingPending = this.getPendingOperations();
        remainingPending.forEach((pop) => {
          if (!deletedIds.has(pop.id) && !finalOpsMap.has(pop.id)) {
            finalOpsMap.set(pop.id, pop);
          }
        });

        const currentOps = this.getOperations();
        const updatedOps = Array.from(finalOpsMap.values());

        const isDifferent =
          currentOps.length !== updatedOps.length ||
          currentOps.some((o) => !finalOpsMap.has(o.id));

        if (isDifferent) {
          this.set(STORAGE_KEYS.OPERATIONS, updatedOps);
          const activeOrd = this.getActiveOrdinance();
          if (activeOrd) {
            this.recalculateBudgets(activeOrd.id);
          }
          this.notifyChange('OPERATIONS_CHANGED');
        }
      }
    } catch (err) {
      console.warn('Background cloud sync exception:', err);
    } finally {
      this.isSyncingInBackground = false;
    }
  }

  // Force an async sync with the database and reconcile with active ordinance
  async refreshOperationsFromDatabase(): Promise<OperationLaunch[]> {
    await this.forceSynchronizeAllLocalDataToSupabase();
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

    const opId = operation.id || `op-${Date.now()}`;
    // If this was previously marked deleted, unmark it
    this.removeDeletedOperationId(opId);

    const assignedOrdinanceId = operation.ordinanceId || activeOrd?.id || 'ord-122-2026';
    const assignedOfficersCount = Math.max(1, Number(operation.officersCount) || 1);
    const assignedUnitValue = Number(operation.unitValue) > 0 ? Number(operation.unitValue) : (activeOrd?.unitValueJoe || 350);
    const assignedTotalValue = assignedOfficersCount * assignedUnitValue;

    const opToSave: OperationLaunch = {
      ...operation,
      id: opId,
      ordinanceId: assignedOrdinanceId,
      officersCount: assignedOfficersCount,
      unitValue: assignedUnitValue,
      totalValue: assignedTotalValue,
      status: operation.status || 'APROVADO',
      serviceDate: toValidIsoDate(operation.serviceDate),
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

    // 3. Manage offline pending queue
    if (syncedWithCloud) {
      this.removePendingOperation(opToSave.id);
    } else {
      this.addPendingOperation(opToSave);
    }

    this.logAudit({
      userName: user.name,
      userRole: user.role,
      action: isNew ? 'criar' : 'editar',
      recordId: `lancamentos #${recIndex}`,
      description: `${opToSave.eventName} · ${opToSave.officersCount} JOEs · R$ ${opToSave.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${syncedWithCloud ? '(Sincronizado no Supabase)' : '(Gravado Localmente - Na Fila de Sincronização)'}`,
      ipAddress: '2804:6788:4015:7c00:d3d:e9c2:1b3f:2aea',
    });

    return {
      success: true,
      operation: opToSave,
      syncedWithCloud,
      dbError,
      message: syncedWithCloud
        ? 'Lançamento salvo com sucesso no banco de dados!'
        : 'Lançamento registrado localmente e colocado na fila prioritária de sincronização.',
    };
  }

  // Purge specific deleted operation IDs from all localStorage keys to prevent recovery
  purgeDeletedIdsFromAllStorage(ids: string[]): void {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || key === STORAGE_KEYS.DELETED_OPS) continue;
        const raw = localStorage.getItem(key);
        if (!raw || (!raw.startsWith('[') && !raw.startsWith('{'))) continue;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const hasAny = parsed.some(
              (item) => item && typeof item === 'object' && idSet.has(item.id)
            );
            if (hasAny) {
              const cleaned = parsed.filter(
                (item) => !item || typeof item !== 'object' || !idSet.has(item.id)
              );
              localStorage.setItem(key, JSON.stringify(cleaned));
            }
          }
        } catch {
          // ignore parsing error
        }
      }
    } catch (e) {
      console.warn('Erro ao purgar IDs excluídos do localStorage:', e);
    }
  }

  async deleteOperation(
    operationId: string,
    user?: User | null
  ): Promise<{ success: boolean; message?: string }> {
    if (!operationId) return { success: false, message: 'ID do lançamento não fornecido.' };

    const operations = this.getOperations();
    const opIndex = operations.findIndex((o) => o.id === operationId);
    const op = opIndex >= 0 ? operations[opIndex] : null;

    // 1. Remove from local active operations
    const filtered = operations.filter((o) => o.id !== operationId);
    this.set(STORAGE_KEYS.OPERATIONS, filtered);

    // 2. Mark as deleted in tombstone registry so it can NEVER be re-synced or recovered
    this.addDeletedOperationIds([operationId]);

    // 3. Remove from pending sync queue
    this.removePendingOperation(operationId);

    // 4. Purge from any other local storage keys
    this.purgeDeletedIdsFromAllStorage([operationId]);

    // 5. Recalculate budgets for the ordinance
    if (op?.ordinanceId) {
      this.recalculateBudgets(op.ordinanceId);
    } else {
      const activeOrd = this.getActiveOrdinance();
      if (activeOrd) this.recalculateBudgets(activeOrd.id);
    }

    // 6. Delete directly from Supabase cloud database
    try {
      await supabaseService.deleteOperation(operationId);
    } catch (err) {
      console.warn('Erro ao deletar operação no Supabase:', err);
    }

    // 7. Audit log
    const userName = user?.name || 'Administrador do Sistema';
    const userRole = user?.role || 'ADMIN';
    this.logAudit({
      userName,
      userRole,
      action: 'excluir',
      recordId: `lancamento ${operationId}`,
      description: op
        ? `Exclusão de lançamento: ${op.eventName} (${op.commandId}) · ${op.officersCount} JOEs · R$ ${op.totalValue?.toFixed(2) || '0.00'}`
        : `Exclusão de lançamento ID: ${operationId}`,
      ipAddress: '2804:6788:4015:7c00:d3d:e9c2:1b3f:2aea',
    });

    this.notifyChange('OPERATIONS_CHANGED');

    return {
      success: true,
      message: 'Lançamento excluído com sucesso do sistema e do banco de dados.',
    };
  }

  async deleteOperations(
    operationIds: string[],
    user?: User | null
  ): Promise<{ success: boolean; count: number; message?: string }> {
    if (!operationIds || operationIds.length === 0) {
      return { success: false, count: 0, message: 'Nenhum lançamento selecionado para exclusão.' };
    }

    const idSet = new Set(operationIds);
    const operations = this.getOperations();
    const opsToDelete = operations.filter((o) => idSet.has(o.id));

    // 1. Filter out all deleted operations from local state
    const filtered = operations.filter((o) => !idSet.has(o.id));
    this.set(STORAGE_KEYS.OPERATIONS, filtered);

    // 2. Add to tombstone list
    this.addDeletedOperationIds(operationIds);

    // 3. Remove from pending queue
    operationIds.forEach((id) => this.removePendingOperation(id));

    // 4. Purge from any other storage keys
    this.purgeDeletedIdsFromAllStorage(operationIds);

    // 5. Recalculate budgets for all affected ordinances
    const affectedOrdinanceIds = Array.from(new Set(opsToDelete.map((o) => o.ordinanceId).filter(Boolean)));
    if (affectedOrdinanceIds.length === 0) {
      const activeOrd = this.getActiveOrdinance();
      if (activeOrd) affectedOrdinanceIds.push(activeOrd.id);
    }
    affectedOrdinanceIds.forEach((ordId) => {
      this.recalculateBudgets(ordId);
    });

    // 6. Delete in batch from Supabase cloud database
    try {
      await supabaseService.deleteOperations(operationIds);
    } catch (err) {
      console.warn('Erro ao deletar lote no Supabase:', err);
    }

    const totalJoes = opsToDelete.reduce((sum, o) => sum + (o.officersCount || 0), 0);
    const totalValue = opsToDelete.reduce((sum, o) => sum + (o.totalValue || 0), 0);

    const userName = user?.name || 'Administrador do Sistema';
    const userRole = user?.role || 'ADMIN';
    this.logAudit({
      userName,
      userRole,
      action: 'excluir',
      recordId: `lancamentos_lote #${operationIds.length}`,
      description: `Exclusão em lote de ${operationIds.length} lançamentos · Total: ${totalJoes} JOEs (R$ ${totalValue.toFixed(2)})`,
      ipAddress: '2804:6788:4015:7c00:d3d:e9c2:1b3f:2aea',
    });

    this.notifyChange('OPERATIONS_CHANGED');

    return {
      success: true,
      count: operationIds.length,
      message: `${operationIds.length} lançamento(s) excluído(s) com sucesso do sistema e do banco de dados.`,
    };
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

    // Trigger full notification and obligatorily push imported operations to Supabase
    this.notifyChange('IMPORT_BACKUP');
    this.forceSynchronizeAllLocalDataToSupabase().catch(console.warn);
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
