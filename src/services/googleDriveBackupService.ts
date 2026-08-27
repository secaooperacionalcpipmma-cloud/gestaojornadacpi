import {
  SystemBackupPayload,
  DriveBackupFileMeta,
  DriveSyncStatus,
  User,
} from '../types';
import { storageService } from './storageService';

const TARGET_GOOGLE_EMAIL = 'secaooperacional.cpi.pmma@gmail.com';
const DRIVE_FOLDER_NAME = 'BACKUP_SISTEMA_JOE_CPI_PMMA';
const MASTER_BACKUP_FILE_NAME = 'backup_sistema_joe_cpi_pmma.json';
const DRIVE_SCOPES = 'https://www.googleapis.com/auth/drive.file';

const STORAGE_KEYS = {
  DRIVE_ACCESS_TOKEN: 'cpi_pmma_gdrive_access_token',
  DRIVE_TOKEN_EXPIRES_AT: 'cpi_pmma_gdrive_token_expires_at',
  DRIVE_FOLDER_ID: 'cpi_pmma_gdrive_folder_id',
  DRIVE_MASTER_FILE_ID: 'cpi_pmma_gdrive_master_file_id',
  LAST_BACKUP_TIME: 'cpi_pmma_gdrive_last_backup_time',
  LAST_BACKUP_NAME: 'cpi_pmma_gdrive_last_backup_name',
  AUTO_BACKUP_ENABLED: 'cpi_pmma_gdrive_auto_backup_enabled',
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            hint?: string;
            prompt?: string;
            callback: (response: {
              access_token?: string;
              error?: string;
              expires_in?: number;
            }) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

class GoogleDriveBackupService {
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private folderId: string | null = null;
  private syncStatus: DriveSyncStatus = 'IDLE';
  private lastBackupTime: string | null = null;
  private lastBackupName: string | null = null;
  private autoBackupDebounceTimer: any = null;
  private statusListeners: Array<(status: DriveSyncStatus, lastTime: string | null) => void> = [];
  private isAutoBackupEnabled: boolean = true;

  private masterFileId: string | null = null;

  constructor() {
    this.loadCachedCredentials();
  }

  private loadCachedCredentials() {
    try {
      this.accessToken = localStorage.getItem(STORAGE_KEYS.DRIVE_ACCESS_TOKEN);
      const expires = localStorage.getItem(STORAGE_KEYS.DRIVE_TOKEN_EXPIRES_AT);
      this.tokenExpiresAt = expires ? parseInt(expires, 10) : 0;
      this.folderId = localStorage.getItem(STORAGE_KEYS.DRIVE_FOLDER_ID);
      this.masterFileId = localStorage.getItem(STORAGE_KEYS.DRIVE_MASTER_FILE_ID);
      this.lastBackupTime = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP_TIME);
      this.lastBackupName = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP_NAME);
      const autoPref = localStorage.getItem(STORAGE_KEYS.AUTO_BACKUP_ENABLED);
      this.isAutoBackupEnabled = autoPref !== 'false';

      // Check if token is expired (allow 2 min margin)
      if (this.accessToken && Date.now() > this.tokenExpiresAt - 120000) {
        this.accessToken = null;
      }
    } catch {
      // ignore
    }
  }

  // Subscribe to status updates for UI badges/toasts
  public onStatusChange(callback: (status: DriveSyncStatus, lastTime: string | null) => void) {
    this.statusListeners.push(callback);
    callback(this.syncStatus, this.lastBackupTime);
    return () => {
      this.statusListeners = this.statusListeners.filter((cb) => cb !== callback);
    };
  }

  private setStatus(status: DriveSyncStatus) {
    this.syncStatus = status;
    this.statusListeners.forEach((cb) => cb(status, this.lastBackupTime));
  }

  public getStatus(): DriveSyncStatus {
    return this.syncStatus;
  }

  public getLastBackupTime(): string | null {
    return this.lastBackupTime;
  }

  public getLastBackupName(): string | null {
    return this.lastBackupName;
  }

  public isAutoBackup(): boolean {
    return this.isAutoBackupEnabled;
  }

  public setAutoBackup(enabled: boolean) {
    this.isAutoBackupEnabled = enabled;
    localStorage.setItem(STORAGE_KEYS.AUTO_BACKUP_ENABLED, String(enabled));
  }

  public isConnected(): boolean {
    return !!(this.accessToken && Date.now() < this.tokenExpiresAt - 60000);
  }

  public getTargetEmail(): string {
    return TARGET_GOOGLE_EMAIL;
  }

  // Authorize using Google Identity Services (GIS)
  public async requestAuthorization(interactive: boolean = true): Promise<string> {
    if (this.isConnected() && this.accessToken) {
      return this.accessToken;
    }

    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
        // GIS script might still be loading, wait a moment
        setTimeout(() => {
          if (!window.google?.accounts?.oauth2) {
            reject(
              new Error(
                'Google Identity Services (GSI) não foi carregado. Verifique a conexão com a internet.'
              )
            );
            return;
          }
          this.initiateOAuthFlow(interactive, resolve, reject);
        }, 600);
        return;
      }

      this.initiateOAuthFlow(interactive, resolve, reject);
    });
  }

  private initiateOAuthFlow(
    interactive: boolean,
    resolve: (token: string) => void,
    reject: (reason: any) => void
  ) {
    try {
      // In Vite AI Studio, client ID is injected into VITE_GOOGLE_CLIENT_ID or fallback
      const clientId =
        (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
        '303123603441-ai-studio-client.apps.googleusercontent.com';

      const tokenClient = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: DRIVE_SCOPES,
        hint: TARGET_GOOGLE_EMAIL,
        prompt: interactive ? 'consent' : '',
        callback: (resp) => {
          if (resp.error || !resp.access_token) {
            this.setStatus('UNAUTHENTICATED');
            reject(new Error(resp.error || 'Permissão não concedida pelo usuário.'));
            return;
          }

          this.accessToken = resp.access_token;
          const expiresIn = resp.expires_in || 3600;
          this.tokenExpiresAt = Date.now() + expiresIn * 1000;

          localStorage.setItem(STORAGE_KEYS.DRIVE_ACCESS_TOKEN, this.accessToken);
          localStorage.setItem(
            STORAGE_KEYS.DRIVE_TOKEN_EXPIRES_AT,
            this.tokenExpiresAt.toString()
          );

          this.setStatus('IDLE');
          resolve(this.accessToken);
        },
      });

      tokenClient.requestAccessToken({ prompt: interactive ? 'consent' : '' });
    } catch (e: any) {
      reject(e);
    }
  }

  // Disconnect Google Drive
  public disconnect() {
    this.accessToken = null;
    this.tokenExpiresAt = 0;
    this.folderId = null;
    this.masterFileId = null;
    localStorage.removeItem(STORAGE_KEYS.DRIVE_ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.DRIVE_TOKEN_EXPIRES_AT);
    localStorage.removeItem(STORAGE_KEYS.DRIVE_FOLDER_ID);
    localStorage.removeItem(STORAGE_KEYS.DRIVE_MASTER_FILE_ID);
    this.setStatus('UNAUTHENTICATED');
  }

  // Ensure Backup Folder exists in Google Drive
  private async getOrCreateBackupFolder(token: string): Promise<string> {
    if (this.folderId) {
      return this.folderId;
    }

    try {
      // 1. Search for folder
      const query = `name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          query
        )}&fields=files(id,name)&spaces=drive`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          this.folderId = searchData.files[0].id;
          localStorage.setItem(STORAGE_KEYS.DRIVE_FOLDER_ID, this.folderId!);
          return this.folderId!;
        }
      }

      // 2. Create folder if not found
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: DRIVE_FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder',
          description:
            'Pasta oficial de backups automáticos e manuais do Sistema de Controle de JOE - CPI/PMMA',
        }),
      });

      if (!createRes.ok) {
        throw new Error('Falha ao criar pasta de backups no Google Drive.');
      }

      const createData = await createRes.json();
      this.folderId = createData.id;
      localStorage.setItem(STORAGE_KEYS.DRIVE_FOLDER_ID, this.folderId!);
      return this.folderId!;
    } catch (err) {
      console.warn('Erro ao verificar/criar pasta no Drive, usando raiz:', err);
      return 'root';
    }
  }

  // Generate full system backup payload
  public generateBackupPayload(currentUser?: User): SystemBackupPayload {
    const rawPayload = storageService.exportFullBackup(currentUser);
    return {
      version: '3.0.0',
      systemName: 'Controle e Auditoria de JOE - CPI/PMMA (Portaria nº 122/2026)',
      targetAccountEmail: TARGET_GOOGLE_EMAIL,
      createdAt: new Date().toISOString(),
      generatedBy: currentUser ? `${currentUser.name} (${currentUser.login || currentUser.role})` : 'Sistema Automático CPI',
      summary: {
        usersCount: rawPayload.users.length,
        ordinancesCount: rawPayload.ordinances.length,
        operationsCount: rawPayload.operations.length,
        budgetsCount: rawPayload.budgets.length,
        commandsCount: rawPayload.commands.length,
        officersCount: rawPayload.officers.length,
        batchesCount: rawPayload.batches.length,
        irregularitiesCount: rawPayload.irregularities.length,
        auditLogsCount: rawPayload.auditLogs.length,
      },
      data: rawPayload,
    };
  }

  // Find existing master backup file in Drive to overwrite instead of creating duplicates
  private async findExistingMasterBackupFile(
    token: string,
    folderId: string
  ): Promise<{ fileId: string | null; duplicateFileIds: string[] }> {
    try {
      // 1. Verify cached master file ID if available
      if (this.masterFileId) {
        try {
          const checkRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${this.masterFileId}?fields=id,name,trashed,parents`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (checkRes.ok) {
            const data = await checkRes.json();
            if (!data.trashed && Array.isArray(data.parents) && data.parents.includes(folderId)) {
              return { fileId: this.masterFileId, duplicateFileIds: [] };
            }
          }
        } catch {
          // continue to search
        }
      }

      // 2. Query folder for existing json backup files
      const query = `'${folderId}' in parents and trashed=false`;
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          query
        )}&fields=files(id,name,modifiedTime,createdTime)&orderBy=modifiedTime desc&pageSize=20`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!searchRes.ok) {
        return { fileId: null, duplicateFileIds: [] };
      }

      const searchData = await searchRes.json();
      const files: any[] = searchData.files || [];

      if (files.length === 0) {
        return { fileId: null, duplicateFileIds: [] };
      }

      // Primary file to overwrite is the most recent backup
      const primaryFile = files[0];
      const duplicates = files.slice(1).map((f) => f.id);

      this.masterFileId = primaryFile.id;
      localStorage.setItem(STORAGE_KEYS.DRIVE_MASTER_FILE_ID, primaryFile.id);

      // Clean up older duplicate backup files if any exist to maintain a single file
      if (duplicates.length > 0) {
        duplicates.forEach((dupId) => {
          fetch(`https://www.googleapis.com/drive/v3/files/${dupId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {});
        });
      }

      return { fileId: primaryFile.id, duplicateFileIds: duplicates };
    } catch (e) {
      console.warn('Erro ao buscar arquivo mestre de backup no Drive:', e);
      return { fileId: null, duplicateFileIds: [] };
    }
  }

  // Upload or Overwrite Backup on Google Drive
  public async uploadBackupToDrive(
    currentUser?: User,
    isManual: boolean = false
  ): Promise<{ success: boolean; fileId?: string; fileName?: string; isOverwritten?: boolean; message?: string }> {
    this.setStatus('SYNCING');

    try {
      // Ensure token
      let token = this.accessToken;
      if (!this.isConnected()) {
        if (isManual) {
          token = await this.requestAuthorization(true);
        } else {
          // In auto mode, if not authenticated, skip silently
          try {
            token = await this.requestAuthorization(false);
          } catch {
            this.setStatus('UNAUTHENTICATED');
            return {
              success: false,
              message: 'Conta do Google Drive não conectada. Conecte para ativar o auto-salvamento.',
            };
          }
        }
      }

      if (!token) {
        this.setStatus('UNAUTHENTICATED');
        return { success: false, message: 'Google Drive não autorizado.' };
      }

      const folderId = await this.getOrCreateBackupFolder(token);
      const { fileId: existingFileId } = await this.findExistingMasterBackupFile(token, folderId);
      const payload = this.generateBackupPayload(currentUser);
      const jsonContent = JSON.stringify(payload, null, 2);

      const fileName = MASTER_BACKUP_FILE_NAME;

      // Multipart boundary
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const metadata: any = {
        name: fileName,
        mimeType: 'application/json',
        description: `Backup Único Oficial do Sistema JOE - CPI/PMMA | ${
          payload.summary.operationsCount
        } Operações | ${payload.summary.ordinancesCount} Portarias | Gerado por: ${payload.generatedBy} | Atualizado em: ${new Date().toISOString()}`,
      };

      let uploadUrl: string;
      let uploadMethod: string;

      if (existingFileId) {
        // OVERWRITE existing file in Google Drive (PATCH method)
        uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`;
        uploadMethod = 'PATCH';
      } else {
        // Create initial master file (POST method)
        metadata.parents = [folderId];
        uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        uploadMethod = 'POST';
      }

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        jsonContent +
        closeDelimiter;

      const uploadRes = await fetch(uploadUrl, {
        method: uploadMethod,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      });

      if (!uploadRes.ok) {
        if (uploadRes.status === 401) {
          this.disconnect();
          throw new Error('Sessão do Google Drive expirada. Por favor, reconecte sua conta.');
        }
        const errJson = await uploadRes.json().catch(() => ({}));
        throw new Error(
          errJson.error?.message || `Erro ao salvar backup no Google Drive (HTTP ${uploadRes.status})`
        );
      }

      const fileData = await uploadRes.json();
      const savedFileId = fileData.id || existingFileId;
      if (savedFileId) {
        this.masterFileId = savedFileId;
        localStorage.setItem(STORAGE_KEYS.DRIVE_MASTER_FILE_ID, savedFileId);
      }

      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const nowFormatted = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(
        now.getHours()
      )}:${pad(now.getMinutes())}`;

      this.lastBackupTime = nowFormatted;
      this.lastBackupName = fileName;
      localStorage.setItem(STORAGE_KEYS.LAST_BACKUP_TIME, nowFormatted);
      localStorage.setItem(STORAGE_KEYS.LAST_BACKUP_NAME, fileName);

      // Audit log
      if (currentUser) {
        storageService.logAudit({
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'BACKUP_CRIADO',
          module: 'BACKUP',
          recordId: `drive-file #${savedFileId?.slice(0, 8)}`,
          description: existingFileId
            ? `Backup oficial no Google Drive sobrescrito/atualizado com sucesso (${TARGET_GOOGLE_EMAIL}): ${fileName} (${payload.summary.operationsCount} ops, ${payload.summary.usersCount} users)`
            : `Backup oficial criado no Google Drive (${TARGET_GOOGLE_EMAIL}): ${fileName} (${payload.summary.operationsCount} ops, ${payload.summary.usersCount} users)`,
          ipAddress: '2804:6788:4015:7c00:d3d:e9c2:1b3f:2aea',
        });
      }

      this.setStatus('SUCCESS');
      return {
        success: true,
        fileId: savedFileId,
        fileName,
        isOverwritten: Boolean(existingFileId),
        message: existingFileId
          ? 'Backup no Google Drive atualizado com sucesso (arquivo sobrescrito)!'
          : 'Backup inicial criado com sucesso no Google Drive!',
      };
    } catch (err: any) {
      console.error('Erro no upload para Google Drive:', err);
      this.setStatus('ERROR');
      return {
        success: false,
        message: err.message || 'Falha ao salvar backup no Google Drive.',
      };
    }
  }

  // List Backups in Google Drive
  public async listDriveBackups(): Promise<{
    success: boolean;
    files: DriveBackupFileMeta[];
    message?: string;
  }> {
    try {
      let token = this.accessToken;
      if (!this.isConnected()) {
        token = await this.requestAuthorization(true);
      }

      const folderId = await this.getOrCreateBackupFolder(token);
      const query = `'${folderId}' in parents and trashed=false`;

      const listRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          query
        )}&fields=files(id,name,size,createdTime,modifiedTime,description)&orderBy=createdTime desc&pageSize=30`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!listRes.ok) {
        if (listRes.status === 401) {
          this.disconnect();
          throw new Error('Sessão expirada. Reconecte o Google Drive.');
        }
        throw new Error('Não foi possível obter a lista de backups do Google Drive.');
      }

      const data = await listRes.json();
      const files: DriveBackupFileMeta[] = (data.files || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        size: f.size ? `${(parseInt(f.size, 10) / 1024).toFixed(1)} KB` : 'Tamanho N/A',
        createdTime: f.createdTime,
        modifiedTime: f.modifiedTime,
        description: f.description,
      }));

      return { success: true, files };
    } catch (err: any) {
      return {
        success: false,
        files: [],
        message: err.message || 'Falha ao listar backups do Google Drive.',
      };
    }
  }

  // Download backup content from Drive and return parsed payload
  public async downloadDriveBackupContent(fileId: string): Promise<{
    success: boolean;
    payload?: SystemBackupPayload;
    message?: string;
  }> {
    try {
      let token = this.accessToken;
      if (!this.isConnected()) {
        token = await this.requestAuthorization(true);
      }

      const downloadRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!downloadRes.ok) {
        throw new Error('Falha ao baixar arquivo de backup do Google Drive.');
      }

      const payload = (await downloadRes.json()) as SystemBackupPayload;
      this.validateBackupPayload(payload);

      return { success: true, payload };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Falha ao ler dados do backup.',
      };
    }
  }

  // Trigger Automatic Backup on Data Modification (Debounced)
  public scheduleAutoBackup(currentUser?: User) {
    if (!this.isAutoBackupEnabled) return;

    if (this.autoBackupDebounceTimer) {
      clearTimeout(this.autoBackupDebounceTimer);
    }

    this.setStatus('SYNCING');

    this.autoBackupDebounceTimer = setTimeout(async () => {
      if (this.isConnected()) {
        try {
          await this.uploadBackupToDrive(currentUser, false);
        } catch (err) {
          console.warn('Falha no auto-backup para Google Drive:', err);
          this.setStatus('SAVED_LOCAL');
        }
      } else {
        // Mark as saved locally, drive pending auth
        this.setStatus('SAVED_LOCAL');
      }
    }, 2000);
  }

  // Validate System Backup JSON
  public validateBackupPayload(payload: any): boolean {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Arquivo de backup inválido ou corrompido (formato JSON incorreto).');
    }

    const data: any = payload.data || payload;
    if (
      !Array.isArray(data.operations) &&
      !Array.isArray(data.budgets) &&
      !Array.isArray(data.ordinances) &&
      !Array.isArray(data.users)
    ) {
      throw new Error(
        'Estrutura incompatível. O arquivo não contém coleções válidas do Sistema de Controle de JOE.'
      );
    }

    return true;
  }

  // Restore Backup to Database (Replace All or Merge)
  public restoreBackup(
    payload: SystemBackupPayload,
    currentUser: User,
    mode: 'REPLACE_ALL' | 'MERGE' = 'REPLACE_ALL'
  ): { success: boolean; message: string } {
    try {
      this.validateBackupPayload(payload);
      const data: any = (payload as any).data || payload;

      storageService.importFullBackup(data, currentUser, mode);

      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const nowFormatted = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(
        now.getHours()
      )}:${pad(now.getMinutes())}`;

      this.lastBackupTime = nowFormatted;

      storageService.logAudit({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'BACKUP_RESTAURADO',
        module: 'BACKUP',
        recordId: `restauracao #${Date.now().toString().slice(-4)}`,
        description: `Restauração ${
          mode === 'REPLACE_ALL' ? 'Total (Substituição)' : 'Incremental (Mesclagem)'
        } de dados realizada com sucesso. Fonte: ${payload.createdAt || 'Arquivo Local'} (${
          data.operations?.length || 0
        } ops, ${data.ordinances?.length || 0} portarias)`,
        ipAddress: '2804:6788:4015:7c00:d3d:e9c2:1b3f:2aea',
      });

      return {
        success: true,
        message: `Banco de dados restaurado com sucesso! (${
          data.operations?.length || 0
        } operações, ${data.ordinances?.length || 0} portarias, ${
          data.budgets?.length || 0
        } tetos orçamentários atualizados).`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Erro ao processar restauração do banco de dados.',
      };
    }
  }

  // Download Backup JSON file to local computer
  public downloadLocalBackupFile(currentUser?: User) {
    const payload = this.generateBackupPayload(currentUser);
    const jsonString = JSON.stringify(payload, null, 2);

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateTag = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(
      now.getHours()
    )}-${pad(now.getMinutes())}`;
    const filename = `backup_sistema_joe_cpi_pmma_${dateTag}.json`;

    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (currentUser) {
      storageService.logAudit({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'BACKUP_CRIADO',
        module: 'BACKUP',
        recordId: `export-json #${Date.now().toString().slice(-4)}`,
        description: `Download de arquivo de backup offline: ${filename}`,
        ipAddress: '2804:6788:4015:7c00:d3d:e9c2:1b3f:2aea',
      });
    }
  }
}

export const googleDriveBackupService = new GoogleDriveBackupService();
