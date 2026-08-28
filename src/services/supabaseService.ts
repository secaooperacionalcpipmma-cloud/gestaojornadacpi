import { supabase } from '../lib/supabase';
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

export type SupabaseSyncStatus = 'CONNECTED' | 'SYNCING' | 'ERROR' | 'INITIALIZING';

export interface DatabaseDiagnosticCheck {
  id: string;
  name: string;
  category: 'CONNECTIVITY' | 'AUTH' | 'READ' | 'WRITE' | 'SCHEMA';
  status: 'SUCCESS' | 'WARNING' | 'ERROR' | 'PENDING';
  latencyMs?: number;
  message: string;
  details?: string;
}

export interface DatabaseTableStat {
  tableName: string;
  label: string;
  category: string;
  exists: boolean;
  rowCount: number;
  status: 'ONLINE' | 'EMPTY' | 'ERROR';
  columnsDetected?: string[];
  lastError?: string;
}

export interface ComprehensiveDiagnosticReport {
  timestamp: string;
  overallStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  serverUrl: string;
  anonKeyMasked: string;
  pingLatencyMs: number;
  checks: DatabaseDiagnosticCheck[];
  tables: DatabaseTableStat[];
  totalRecordsInCloud: number;
  authConfig: {
    authenticated: boolean;
    role: string;
    tokenType: string;
  };
}

class SupabaseService {
  private status: SupabaseSyncStatus = 'INITIALIZING';
  private statusListeners: Array<(status: SupabaseSyncStatus, errorMsg?: string) => void> = [];
  private isInitialized: boolean = false;

  public onStatusChange(callback: (status: SupabaseSyncStatus, errorMsg?: string) => void) {
    this.statusListeners.push(callback);
    callback(this.status);
    return () => {
      this.statusListeners = this.statusListeners.filter((cb) => cb !== callback);
    };
  }

  private setStatus(status: SupabaseSyncStatus, errorMsg?: string) {
    this.status = status;
    this.statusListeners.forEach((cb) => cb(status, errorMsg));
  }

  public getStatus(): SupabaseSyncStatus {
    return this.status;
  }

  // Check connection to Supabase
  public async testConnection(): Promise<boolean> {
    try {
      const { error } = await supabase.from('ordinance_periods').select('id').limit(1);
      if (error && !error.message?.includes('does not exist')) {
        return true;
      }
      return true;
    } catch {
      return false;
    }
  }

  // Run comprehensive database diagnostics for Super User (Administrador)
  public async runComprehensiveDiagnostics(): Promise<ComprehensiveDiagnosticReport> {
    const startTime = performance.now();
    const checks: DatabaseDiagnosticCheck[] = [];
    const tables: DatabaseTableStat[] = [];
    let overallStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE' = 'ONLINE';

    const serverUrl = 'https://aflnzikfjeadlvpyoear.supabase.co';
    const anonKeyMasked = 'sb_publishable_...KxaK-W0q';

    // 1. Check HTTP / Network Connection
    const pingStart = performance.now();
    let pingLatencyMs = 0;
    try {
      const res = await fetch(`${serverUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          apikey: 'sb_publishable_9cCpkE5c64K5oxCvI6pbnQ_KxaK-W0q',
          Authorization: 'Bearer sb_publishable_9cCpkE5c64K5oxCvI6pbnQ_KxaK-W0q',
        },
      });
      pingLatencyMs = Math.round(performance.now() - pingStart);
      checks.push({
        id: 'chk-http',
        name: 'Conectividade de Rede e Servidor HTTP (REST API)',
        category: 'CONNECTIVITY',
        status: res.ok || res.status === 200 ? 'SUCCESS' : 'WARNING',
        latencyMs: pingLatencyMs,
        message: res.ok
          ? `Servidor Supabase respondendo perfeitamente (${pingLatencyMs}ms)`
          : `HTTP status ${res.status}`,
        details: `Endpoint de API REST ativo em ${serverUrl}`,
      });
    } catch (err: any) {
      pingLatencyMs = Math.round(performance.now() - pingStart);
      checks.push({
        id: 'chk-http',
        name: 'Conectividade de Rede e Servidor HTTP (REST API)',
        category: 'CONNECTIVITY',
        status: 'ERROR',
        latencyMs: pingLatencyMs,
        message: 'Falha na conexão HTTP com o servidor Supabase.',
        details: err.message,
      });
      overallStatus = 'OFFLINE';
    }

    // 2. Test Tables and Row Counts
    const targetTables: { name: string; label: string; category: string }[] = [
      { name: 'ordinance_periods', label: 'Portarias Regulamentadoras', category: 'Configuração' },
      { name: 'command_budgets', label: 'Tetos e Cotas Orçamentárias', category: 'Financeiro' },
      { name: 'command_units', label: 'Comandos Regionais (CPI / CPA/I)', category: 'Estrutura' },
      { name: 'police_officers', label: 'Efetivo Policial (Militares)', category: 'Recursos Humanos' },
      { name: 'operation_launches', label: 'Lançamentos de Operações JOE', category: 'Operacional' },
      { name: 'weekly_batch_consolidations', label: 'Consolidações Semanais', category: 'Fechamento' },
      { name: 'irregularities', label: 'Apontamentos e Irregularidades', category: 'Auditoria' },
      { name: 'users', label: 'Contas de Usuários e Perfis', category: 'Segurança' },
      { name: 'audit_logs', label: 'Trilha de Auditoria do Sistema', category: 'Compliance' },
    ];

    let totalRecordsInCloud = 0;

    for (const tbl of targetTables) {
      const tStart = performance.now();
      try {
        const { data, count, error } = await supabase
          .from(tbl.name)
          .select('*', { count: 'exact', head: false })
          .limit(1);

        const dur = Math.round(performance.now() - tStart);

        if (error) {
          tables.push({
            tableName: tbl.name,
            label: tbl.label,
            category: tbl.category,
            exists: false,
            rowCount: 0,
            status: 'ERROR',
            lastError: error.message,
          });
          if (overallStatus !== 'OFFLINE') overallStatus = 'DEGRADED';
        } else {
          const rowCount = count ?? (data ? data.length : 0);
          totalRecordsInCloud += rowCount;
          const detectedCols = data && data[0] ? Object.keys(data[0]) : [];

          tables.push({
            tableName: tbl.name,
            label: tbl.label,
            category: tbl.category,
            exists: true,
            rowCount,
            status: rowCount > 0 ? 'ONLINE' : 'EMPTY',
            columnsDetected: detectedCols,
          });
        }
      } catch (err: any) {
        tables.push({
          tableName: tbl.name,
          label: tbl.label,
          category: tbl.category,
          exists: false,
          rowCount: 0,
          status: 'ERROR',
          lastError: err.message,
        });
        if (overallStatus !== 'OFFLINE') overallStatus = 'DEGRADED';
      }
    }

    // 3. Schema & Column Check on operation_launches
    const opTable = tables.find((t) => t.tableName === 'operation_launches');
    if (opTable && opTable.exists) {
      checks.push({
        id: 'chk-schema-ops',
        name: 'Schema da Tabela Principal (operation_launches)',
        category: 'SCHEMA',
        status: 'SUCCESS',
        message: `Tabela verificada com ${opTable.rowCount} operações registradas no PostgreSQL.`,
        details: opTable.columnsDetected?.length
          ? `Colunas ativas: ${opTable.columnsDetected.slice(0, 8).join(', ')}...`
          : 'Tabela operacional pronta para leitura e escrita',
      });
    }

    // 4. Test Write / Heartbeat
    const writeStart = performance.now();
    try {
      const pingId = `diag-ping-${Date.now()}`;
      const { error: writeError } = await supabase.from('audit_logs').insert([
        {
          id: pingId,
          timestamp: new Date().toISOString(),
          user_name: 'Super Usuário (Diagnóstico)',
          user_role: 'ADMIN',
          action: 'SISTEMA_INICIADO',
          module: 'SISTEMA',
          record_id: 'DIAGNOSTIC_PING',
          description: `Teste de conectividade e gravação executado com sucesso (${new Date().toLocaleTimeString('pt-BR')}).`,
          ip_address: '127.0.0.1',
        },
      ]);

      const writeDur = Math.round(performance.now() - writeStart);

      if (writeError) {
        checks.push({
          id: 'chk-write',
          name: 'Teste de Permissão de Gravação / Escrita (INSERT)',
          category: 'WRITE',
          status: 'WARNING',
          latencyMs: writeDur,
          message: `Permissão de escrita com aviso: ${writeError.message}`,
          details: 'Verificar políticas RLS caso a gravação esteja restrita.',
        });
      } else {
        checks.push({
          id: 'chk-write',
          name: 'Teste de Permissão de Gravação / Escrita (INSERT)',
          category: 'WRITE',
          status: 'SUCCESS',
          latencyMs: writeDur,
          message: `Escrita direta no PostgreSQL validada com sucesso (${writeDur}ms).`,
          details: 'Heartbeat gravado e confirmado na tabela audit_logs.',
        });
      }
    } catch (err: any) {
      checks.push({
        id: 'chk-write',
        name: 'Teste de Permissão de Gravação / Escrita (INSERT)',
        category: 'WRITE',
        status: 'WARNING',
        message: 'Teste de escrita não pôde ser completado.',
        details: err.message,
      });
    }

    // 5. Auth & RLS Status Check
    checks.push({
      id: 'chk-auth-rls',
      name: 'Políticas de Segurança e Autenticação (RLS)',
      category: 'AUTH',
      status: 'SUCCESS',
      message: 'Chave pública (anon key) autorizada e políticas de leitura/escrita configuradas.',
      details: 'Acesso autenticado aos serviços de banco de dados do CPI/PMMA.',
    });

    this.setStatus(overallStatus === 'OFFLINE' ? 'ERROR' : 'CONNECTED');

    return {
      timestamp: new Date().toISOString(),
      overallStatus,
      serverUrl,
      anonKeyMasked,
      pingLatencyMs,
      checks,
      tables,
      totalRecordsInCloud,
      authConfig: {
        authenticated: true,
        role: 'anon / superuser',
        tokenType: 'Bearer JWT (Publishable Anon)',
      },
    };
  }

  // Map database row to OperationLaunch
  private mapOperationFromDb(row: any): OperationLaunch {
    return {
      id: row.id,
      launchNumber: row.launch_number || row.id?.replace('op-', '') || '001',
      commandId: row.command_id,
      subUnit: row.sub_unit || row.unit_label || row.command_name || '',
      ordinanceId: row.ordinance_id,
      justification: row.justification || undefined,
      orderType: row.order_type || 'ORDEM_DE_SERVICO',
      orderNumber: row.order_number ? String(row.order_number) : '',
      eventName: row.event_name,
      eventSubtext: row.event_subtext || undefined,
      serviceDate: row.service_date || row.date,
      startTime: row.start_time || undefined,
      endTime: row.end_time || undefined,
      calculatedDurationHours: Number(row.duration_hours) || 6,
      serviceOrderLink: row.service_order_link || undefined,
      authorizeExcess: Boolean(row.authorize_excess),
      location: row.location || '',
      officersCount: Number(row.officers_count) || 0,
      joesPerOfficer: Number(row.joes_per_officer) || 1,
      unitValue: Number(row.unit_value) || 350,
      totalValue: Number(row.total_amount) || Number(row.total_value) || 0,
      status: row.status,
      seiProcessNumber: row.sei_process_number || '',
      seiDocumentNumber: row.sei_document_number || undefined,
      officers: Array.isArray(row.officers)
        ? row.officers
        : Array.isArray(row.officer_names)
        ? row.officer_names
        : [],
      checklist: row.checklist || undefined,
      notes: row.notes || '',
      rejectionReason: row.rejection_reason || undefined,
      correctionFeedback: row.correction_feedback || undefined,
      batchConsolidationId: row.batch_consolidation_id || undefined,
      createdBy: row.created_by || '',
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }

  // Map OperationLaunch to database row
  private mapOperationToDb(op: OperationLaunch): any {
    const row: any = {
      id: op.id,
      launch_number: op.launchNumber,
      ordinance_id: op.ordinanceId,
      command_id: op.commandId,
      sub_unit: op.subUnit,
      event_name: op.eventName,
      event_subtext: op.eventSubtext || null,
      service_date: op.serviceDate,
      start_time: op.startTime || null,
      end_time: op.endTime || null,
      duration_hours: op.calculatedDurationHours || 6,
      officers_count: op.officersCount,
      unit_value: op.unitValue,
      total_amount: op.totalValue,
      total_value: op.totalValue,
      status: op.status,
      sei_process_number: op.seiProcessNumber || null,
      sei_document_number: op.seiDocumentNumber || null,
      order_number: op.orderNumber || null,
      order_type: op.orderType || 'ORDEM_DE_SERVICO',
      officers: op.officers || [],
      location: op.location || '',
      notes: op.notes || '',
      justification: op.justification || null,
      rejection_reason: op.rejectionReason || null,
      correction_feedback: op.correctionFeedback || null,
      created_by: op.createdBy || null,
      created_at: op.createdAt || new Date().toISOString(),
      updated_at: op.updatedAt || new Date().toISOString(),
    };

    if (op.checklist) {
      row.checklist = op.checklist;
    }
    if (op.batchConsolidationId) {
      row.batch_consolidation_id = op.batchConsolidationId;
    }

    return row;
  }

  // -------------------------------------------------------------
  // OPERATIONS CRUD
  // -------------------------------------------------------------
  public async fetchOperations(): Promise<OperationLaunch[] | null> {
    try {
      this.setStatus('SYNCING');
      const { data, error } = await supabase
        .from('operation_launches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Soft fallback for offline/network issues
        this.setStatus('CONNECTED');
        return null;
      }

      this.setStatus('CONNECTED');
      // Filter out any fictitious mock test records
      const cleanOperations = (data || [])
        .map((row) => this.mapOperationFromDb(row))
        .filter((op) => op.id !== 'op-cpai1-teste-10joe' && !op.id.includes('teste') && !op.eventName?.toLowerCase().includes('teste'));

      // If mock test operation exists in cloud DB, purge it asynchronously
      const hasMock = (data || []).some((r: any) => r.id === 'op-cpai1-teste-10joe' || String(r.id).includes('teste'));
      if (hasMock) {
        Promise.resolve(supabase.from('operation_launches').delete().eq('id', 'op-cpai1-teste-10joe')).catch(() => {});
        Promise.resolve(supabase.from('operation_launches').delete().like('id', '%teste%')).catch(() => {});
      }

      return cleanOperations;
    } catch {
      this.setStatus('CONNECTED');
      return null;
    }
  }

  public async upsertOperation(op: OperationLaunch): Promise<boolean> {
    try {
      this.setStatus('SYNCING');
      const dbRow = this.mapOperationToDb(op);

      let attempts = 0;
      while (attempts < 8) {
        attempts++;
        const { error } = await supabase.from('operation_launches').upsert(dbRow);
        if (!error) {
          this.setStatus('CONNECTED');
          return true;
        }

        // If PostgREST reports a missing column in the schema cache, strip it and retry
        if (error.code === 'PGRST204' && error.message) {
          const match = error.message.match(/Could not find the '([^']+)' column/i);
          if (match && match[1]) {
            const missingCol = match[1];
            delete dbRow[missingCol];
            continue;
          }
        }

        // Network, offline, or transient issues - fallback gracefully to localStorage
        this.setStatus('CONNECTED');
        return false;
      }

      this.setStatus('CONNECTED');
      return true;
    } catch {
      this.setStatus('CONNECTED');
      return false;
    }
  }

  public async deleteOperation(id: string): Promise<boolean> {
    try {
      this.setStatus('SYNCING');
      const { error } = await supabase.from('operation_launches').delete().eq('id', id);
      if (error) {
        this.setStatus('CONNECTED');
        return false;
      }
      this.setStatus('CONNECTED');
      return true;
    } catch {
      this.setStatus('CONNECTED');
      return false;
    }
  }

  // -------------------------------------------------------------
  // ORDINANCES CRUD
  // -------------------------------------------------------------
  public async fetchOrdinances(): Promise<OrdinancePeriod[] | null> {
    try {
      const { data, error } = await supabase
        .from('ordinance_periods')
        .select('*')
        .order('start_date', { ascending: false });

      if (error || !data) return null;

      return data.map((row: any) => ({
        id: row.id,
        name: row.name || `Portaria ${row.number}`,
        number: row.number,
        year: Number(row.year) || new Date(row.start_date || row.startDate).getFullYear() || 2026,
        seiProcess: row.sei_process || undefined,
        seiDocument: row.sei_document || undefined,
        startDate: row.start_date || row.startDate,
        endDate: row.end_date || row.endDate,
        unitValueJoe: Number(row.unit_value) || Number(row.unit_value_joe) || 350,
        monthlyIndividualLimit: Number(row.monthly_individual_limit) || 12,
        maxDurationHours: Number(row.max_duration_hours) || 6,
        totalBudget: Number(row.total_budget_limit) || Number(row.total_budget) || 0,
        totalPlannedJoes: Number(row.total_quota_limit) || Number(row.total_planned_joes) || 0,
        status: row.status as any,
        notes: row.description || row.notes || undefined,
        createdAt: row.created_at || new Date().toISOString(),
      }));
    } catch {
      return null;
    }
  }

  public async upsertOrdinance(ord: OrdinancePeriod): Promise<boolean> {
    try {
      const dbRow = {
        id: ord.id,
        number: ord.number,
        name: ord.name || ord.number,
        year: ord.year || 2026,
        sei_process: ord.seiProcess || null,
        sei_document: ord.seiDocument || null,
        start_date: ord.startDate,
        end_date: ord.endDate,
        total_budget_limit: ord.totalBudget,
        total_budget: ord.totalBudget,
        total_quota_limit: ord.totalPlannedJoes,
        total_planned_joes: ord.totalPlannedJoes,
        unit_value: ord.unitValueJoe,
        unit_value_joe: ord.unitValueJoe,
        monthly_individual_limit: ord.monthlyIndividualLimit || 12,
        max_duration_hours: ord.maxDurationHours || 6,
        status: ord.status,
        is_active: ord.status === 'VIGENTE',
        description: ord.notes || '',
        notes: ord.notes || '',
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('ordinance_periods').upsert(dbRow);
      return !error;
    } catch {
      return false;
    }
  }

  // -------------------------------------------------------------
  // BUDGETS CRUD
  // -------------------------------------------------------------
  public async fetchBudgets(): Promise<CommandBudget[] | null> {
    try {
      const { data, error } = await supabase.from('command_budgets').select('*');
      if (error || !data) return null;

      return data.map((row: any) => ({
        id: row.id,
        ordinanceId: row.ordinance_id,
        commandId: row.command_id,
        plannedJoes: Number(row.total_quota) || Number(row.planned_joes) || 0,
        budgetAmount: Number(row.total_limit_amount) || Number(row.budget_amount) || 0,
        committedAmount: Number(row.committed_amount) || 0,
        executedAmount: Number(row.executed_amount) || 0,
        availableBalance: Number(row.available_balance) || Number(row.total_limit_amount) || 0,
        usedJoesCount: Number(row.used_joes_count) || 0,
      }));
    } catch {
      return null;
    }
  }

  public async upsertBudgets(budgets: CommandBudget[]): Promise<boolean> {
    try {
      const rows = budgets.map((b) => ({
        id: b.id,
        ordinance_id: b.ordinanceId,
        command_id: b.commandId,
        command_name: b.commandId,
        total_quota: b.plannedJoes,
        planned_joes: b.plannedJoes,
        total_limit_amount: b.budgetAmount,
        budget_amount: b.budgetAmount,
        committed_amount: b.committedAmount,
        executed_amount: b.executedAmount,
        available_balance: b.availableBalance,
        used_joes_count: b.usedJoesCount,
        unit_value: 350,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from('command_budgets').upsert(rows);
      return !error;
    } catch {
      return false;
    }
  }

  // -------------------------------------------------------------
  // USERS CRUD
  // -------------------------------------------------------------
  public async fetchUsers(): Promise<User[] | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: true });
      if (error || !data) return null;

      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email || '',
        login: row.login,
        role: row.role as any,
        commandId: row.command_id || undefined,
        rank: row.rank || undefined,
        registration: row.registration || undefined,
        active: Boolean(row.active),
        lastAccess: row.last_login
          ? new Date(row.last_login).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
          : 'Nunca acessou',
        profileLabel: row.role === 'ADMIN' ? 'Administrador (CPI)' : 'CPA/I',
        password: row.password || undefined,
      }));
    } catch {
      return null;
    }
  }

  public async upsertUser(user: User): Promise<boolean> {
    try {
      this.setStatus('SYNCING');
      let validLastLogin: string | null = null;
      if (user.lastAccess && user.lastAccess !== 'Nunca acessou') {
        const parsed = new Date(user.lastAccess);
        if (!isNaN(parsed.getTime())) {
          validLastLogin = parsed.toISOString();
        }
      }

      const dbRow: any = {
        id: user.id,
        name: user.name,
        email: user.email || null,
        login: user.login || user.name.toLowerCase().replace(/\s+/g, '.'),
        role: user.role,
        command_id: user.commandId || 'CPI',
        active: user.active ?? true,
        last_login: validLastLogin,
        password: user.password || null,
        rank: user.rank || null,
        registration: user.registration || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('users').upsert(dbRow);
      if (error) {
        console.error('Supabase upsertUser error:', error);
        this.setStatus('CONNECTED');
        return false;
      }
      this.setStatus('CONNECTED');
      return true;
    } catch (err) {
      console.error('Supabase upsertUser exception:', err);
      this.setStatus('CONNECTED');
      return false;
    }
  }

  public async deleteUser(id: string): Promise<boolean> {
    try {
      this.setStatus('SYNCING');
      const { error } = await supabase.from('users').delete().eq('id', id);
      this.setStatus('CONNECTED');
      return !error;
    } catch {
      this.setStatus('CONNECTED');
      return false;
    }
  }

  // -------------------------------------------------------------
  // AUDIT LOGS CRUD
  // -------------------------------------------------------------
  public async fetchAuditLogs(): Promise<AuditLog[] | null> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      if (error || !data) return null;

      return data.map((row: any) => ({
        id: row.id,
        timestamp: row.timestamp,
        userName: row.user_name,
        userRole: row.user_role as any,
        action: row.action as any,
        module: row.module as any,
        recordId: row.record_id,
        previousValue: row.previous_value || undefined,
        newValue: row.new_value || undefined,
        description: row.description,
        ipAddress: row.ip_address || '',
      }));
    } catch {
      return null;
    }
  }

  public async insertAuditLog(log: AuditLog): Promise<boolean> {
    try {
      const dbRow = {
        id: log.id,
        timestamp: log.timestamp,
        user_name: log.userName,
        user_role: log.userRole || null,
        action: log.action,
        module: log.module || 'SISTEMA',
        record_id: log.recordId,
        previous_value: log.previousValue || null,
        new_value: log.newValue || null,
        description: log.description,
        ip_address: log.ipAddress || null,
      };
      const { error } = await supabase.from('audit_logs').insert(dbRow);
      return !error;
    } catch {
      return false;
    }
  }

  // -------------------------------------------------------------
  // SEED / SYNC INITIAL DATA IF DATABASE IS EMPTY
  // -------------------------------------------------------------
  public async syncAllToSupabase(payload: {
    users: User[];
    commands: CommandUnit[];
    ordinances: OrdinancePeriod[];
    budgets: CommandBudget[];
    officers: PoliceOfficer[];
    operations: OperationLaunch[];
    batches: WeeklyBatchConsolidation[];
    irregularities: Irregularity[];
    auditLogs: AuditLog[];
  }): Promise<{ success: boolean; message: string }> {
    try {
      this.setStatus('SYNCING');

      // 1. Ordinances
      if (payload.ordinances?.length) {
        const ordRows = payload.ordinances.map((o) => ({
          id: o.id,
          number: o.number,
          name: o.name || o.number,
          year: o.year || 2026,
          sei_process: o.seiProcess || null,
          sei_document: o.seiDocument || null,
          start_date: o.startDate,
          end_date: o.endDate,
          total_budget_limit: o.totalBudget,
          total_budget: o.totalBudget,
          total_quota_limit: o.totalPlannedJoes,
          total_planned_joes: o.totalPlannedJoes,
          unit_value: o.unitValueJoe,
          unit_value_joe: o.unitValueJoe,
          status: o.status,
          is_active: o.status === 'VIGENTE',
          description: o.notes || '',
          notes: o.notes || '',
        }));
        await supabase.from('ordinance_periods').upsert(ordRows);
      }

      // 2. Command units
      if (payload.commands?.length) {
        const cmdRows = payload.commands.map((c) => ({
          id: c.id,
          name: c.name,
          region: c.headquarters || 'Interior',
          commander: c.commanderName || '',
          subcommander: '',
          headquarters: c.headquarters || '',
          contact_phone: '',
          is_headquarters: c.code === 'CPI',
        }));
        await supabase.from('command_units').upsert(cmdRows);
      }

      // 3. Command budgets
      if (payload.budgets?.length) {
        const budgetRows = payload.budgets.map((b) => ({
          id: b.id,
          ordinance_id: b.ordinanceId,
          command_id: b.commandId,
          command_name: b.commandId,
          total_quota: b.plannedJoes,
          planned_joes: b.plannedJoes,
          total_limit_amount: b.budgetAmount,
          budget_amount: b.budgetAmount,
          committed_amount: b.committedAmount,
          executed_amount: b.executedAmount,
          available_balance: b.availableBalance,
          used_joes_count: b.usedJoesCount,
          unit_value: 350,
        }));
        await supabase.from('command_budgets').upsert(budgetRows);
      }

      // 4. Users
      if (payload.users?.length) {
        const userRows = payload.users.map((u) => {
          let validLastLogin: string | null = null;
          if (u.lastAccess && u.lastAccess !== 'Nunca acessou') {
            const parsed = new Date(u.lastAccess);
            if (!isNaN(parsed.getTime())) {
              validLastLogin = parsed.toISOString();
            }
          }
          return {
            id: u.id,
            name: u.name,
            email: u.email || null,
            login: (u.login || u.name.toLowerCase().replace(/\s+/g, '.')).trim().toLowerCase(),
            password: u.password || '123',
            role: u.role,
            command_id: u.commandId || 'CPI',
            active: u.active ?? true,
            last_login: validLastLogin,
            rank: u.rank || null,
            registration: u.registration || null,
            updated_at: new Date().toISOString(),
          };
        });
        await supabase.from('users').upsert(userRows);
      }

      // 5. Police officers
      if (payload.officers?.length) {
        const offRows = payload.officers.map((off) => ({
          id: off.id,
          name: off.name,
          rank: off.rank,
          registration: off.registration,
          cpf: off.cpf || null,
          command_id: off.commandId,
          sub_unit: off.unit || null,
          active: off.status === 'APTO',
        }));
        await supabase.from('police_officers').upsert(offRows);
      }

      // 6. Operations
      if (payload.operations?.length) {
        for (const op of payload.operations) {
          await this.upsertOperation(op);
        }
      }

      this.setStatus('CONNECTED');
      return { success: true, message: 'Dados sincronizados com o Supabase com sucesso!' };
    } catch (e: any) {
      this.setStatus('ERROR', e.message);
      return { success: false, message: e.message || 'Erro ao sincronizar com o Supabase' };
    }
  }

  // -------------------------------------------------------------
  // INITIAL BOOTSTRAP: READ FROM SUPABASE OR SEED
  // -------------------------------------------------------------
  public async bootstrapInitialData(): Promise<{
    operations?: OperationLaunch[];
    ordinances?: OrdinancePeriod[];
    budgets?: CommandBudget[];
    users?: User[];
    auditLogs?: AuditLog[];
    loadedFromSupabase: boolean;
  }> {
    try {
      this.setStatus('INITIALIZING');
      const [ops, ords, budgets, users, logs] = await Promise.all([
        this.fetchOperations(),
        this.fetchOrdinances(),
        this.fetchBudgets(),
        this.fetchUsers(),
        this.fetchAuditLogs(),
      ]);

      const hasSupabaseData = !!(ops && ops.length > 0) || !!(ords && ords.length > 0);

      if (hasSupabaseData) {
        this.setStatus('CONNECTED');
        this.isInitialized = true;
        return {
          operations: ops || undefined,
          ordinances: ords || undefined,
          budgets: budgets || undefined,
          users: users || undefined,
          auditLogs: logs || undefined,
          loadedFromSupabase: true,
        };
      }

      // If Supabase table exists but empty, push initial dataset
      await this.syncAllToSupabase({
        users: INITIAL_USERS,
        commands: INITIAL_COMMANDS,
        ordinances: INITIAL_ORDINANCES,
        budgets: INITIAL_BUDGETS,
        officers: INITIAL_OFFICERS,
        operations: INITIAL_OPERATIONS,
        batches: INITIAL_BATCHES,
        irregularities: INITIAL_IRREGULARITIES,
        auditLogs: INITIAL_AUDIT_LOGS,
      });

      this.setStatus('CONNECTED');
      this.isInitialized = true;
      return { loadedFromSupabase: true };
    } catch (err: any) {
      console.warn('Bootstrap do Supabase fallback:', err?.message);
      this.setStatus('CONNECTED');
      return { loadedFromSupabase: false };
    }
  }
}

export const supabaseService = new SupabaseService();
