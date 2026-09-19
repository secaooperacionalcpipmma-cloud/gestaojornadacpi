import {
  SystemBackupPayload,
  DriveBackupFileMeta,
  DriveSyncStatus,
  User,
} from '../types';
import { storageService } from './storageService';
import { excelService } from './excelService';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const TARGET_GOOGLE_EMAIL = 'secaooperacional.cpi.pmma@gmail.com';
export const TARGET_DRIVE_FOLDER_ID = '1rk7Urwzl1uyoJGNDPT23VTbFTzlNcQQP';
export const TARGET_DRIVE_FOLDER_LINK = 'https://drive.google.com/drive/folders/1rk7Urwzl1uyoJGNDPT23VTbFTzlNcQQP?usp=sharing';
export const DRIVE_FOLDER_NAME = 'BACKUP_SISTEMA_JOE_CPI_PMMA';
export const DRIVE_SCOPES =
  'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify';
export const WORKSPACE_SCOPES = DRIVE_SCOPES;

export function extractDriveFolderId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  // match /folders/([a-zA-Z0-9_-]+)
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    return folderMatch[1].split('?')[0];
  }
  // match id=([a-zA-Z0-9_-]+)
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return idMatch[1].split('&')[0];
  }
  // match /d/([a-zA-Z0-9_-]+)
  const dMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (dMatch && dMatch[1]) {
    return dMatch[1].split('?')[0];
  }
  // If it's just the ID directly (alphanumeric, dashes, underscores) without slashes
  if (/^[a-zA-Z0-9_-]{15,}$/.test(trimmed)) {
    return trimmed;
  }
  // Query strings fallback
  if (trimmed.includes('drive.google.com')) {
    const parts = trimmed.split('/');
    const last = parts[parts.length - 1]?.split('?')[0];
    if (last && last.length > 10) return last;
  }
  return trimmed;
}

export function buildDriveFolderLink(folderIdOrUrl: string): string {
  const trimmed = (folderIdOrUrl || '').trim();
  if (!trimmed) return TARGET_DRIVE_FOLDER_LINK;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const folderId = extractDriveFolderId(trimmed);
  return `https://drive.google.com/drive/folders/${folderId || trimmed}?usp=sharing`;
}

const GOOGLE_CLIENT_ID =
  (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
  '328695075161-g149lmt5mus0dd3lfo8rg8bmg5sckh46.apps.googleusercontent.com';

let firebaseAuth: any = null;
let driveGoogleProvider: any = null;

try {
  const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  firebaseAuth = getAuth(firebaseApp);
  driveGoogleProvider = new GoogleAuthProvider();
  driveGoogleProvider.addScope('https://www.googleapis.com/auth/drive.file');
  driveGoogleProvider.addScope('https://www.googleapis.com/auth/drive.metadata.readonly');
  driveGoogleProvider.addScope('https://www.googleapis.com/auth/gmail.send');
  driveGoogleProvider.addScope('https://www.googleapis.com/auth/gmail.modify');
  driveGoogleProvider.setCustomParameters({
    login_hint: TARGET_GOOGLE_EMAIL,
    prompt: 'consent',
  });
} catch (e) {
  console.warn('Aviso na inicialização do Firebase Auth:', e);
}

const STORAGE_KEYS = {
  DRIVE_ACCESS_TOKEN: 'cpi_pmma_gdrive_access_token',
  DRIVE_TOKEN_EXPIRES_AT: 'cpi_pmma_gdrive_token_expires_at',
  DRIVE_FOLDER_ID: 'cpi_pmma_gdrive_folder_id',
  DRIVE_FOLDER_LINK: 'cpi_pmma_gdrive_folder_link',
  LAST_BACKUP_TIME: 'cpi_pmma_gdrive_last_backup_time',
  LAST_BACKUP_NAME: 'cpi_pmma_gdrive_last_backup_name',
  LAST_BACKUP_DAY: 'cpi_pmma_gdrive_last_backup_day',
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
  private folderId: string = TARGET_DRIVE_FOLDER_ID;
  private folderLink: string = TARGET_DRIVE_FOLDER_LINK;
  private syncStatus: DriveSyncStatus = 'IDLE';
  private lastBackupTime: string | null = null;
  private lastBackupName: string | null = null;
  private lastBackupDay: string | null = null;
  private autoBackupDebounceTimer: any = null;
  private statusListeners: Array<(status: DriveSyncStatus, lastTime: string | null) => void> = [];
  private isAutoBackupEnabled: boolean = true;

  constructor() {
    this.loadCachedCredentials();
  }

  private loadCachedCredentials() {
    try {
      this.accessToken = localStorage.getItem(STORAGE_KEYS.DRIVE_ACCESS_TOKEN);
      const expires = localStorage.getItem(STORAGE_KEYS.DRIVE_TOKEN_EXPIRES_AT);
      this.tokenExpiresAt = expires ? parseInt(expires, 10) : 0;

      // 1. Check storageService database configuration
      const driveConfig = storageService.getDriveConfig();
      if (driveConfig?.folderId && driveConfig?.folderLink) {
        this.folderId = driveConfig.folderId;
        this.folderLink = driveConfig.folderLink;
      } else {
        const savedId = localStorage.getItem(STORAGE_KEYS.DRIVE_FOLDER_ID);
        const savedLink = localStorage.getItem(STORAGE_KEYS.DRIVE_FOLDER_LINK);
        this.folderId = savedId || TARGET_DRIVE_FOLDER_ID;
        this.folderLink = savedLink || (savedId ? buildDriveFolderLink(savedId) : TARGET_DRIVE_FOLDER_LINK);
      }

      this.lastBackupTime = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP_TIME);
      this.lastBackupName = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP_NAME);
      this.lastBackupDay = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP_DAY);
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

  public getLastBackupDay(): string | null {
    return this.lastBackupDay;
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

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public getTargetEmail(): string {
    return TARGET_GOOGLE_EMAIL;
  }

  public getTargetFolderLink(): string {
    return this.folderLink || TARGET_DRIVE_FOLDER_LINK;
  }

  public getTargetFolderId(): string {
    return this.folderId || TARGET_DRIVE_FOLDER_ID;
  }

  public isCustomFolder(): boolean {
    const currentId = this.getTargetFolderId();
    const currentLink = this.getTargetFolderLink();
    return currentId !== TARGET_DRIVE_FOLDER_ID || currentLink !== TARGET_DRIVE_FOLDER_LINK;
  }

  public setTargetFolder(
    linkOrId: string,
    currentUser?: User
  ): { folderId: string; folderLink: string } {
    const raw = (linkOrId || '').trim();
    if (!raw) {
      return this.resetTargetFolder(currentUser);
    }

    const folderId = extractDriveFolderId(raw);
    const folderLink = buildDriveFolderLink(raw.startsWith('http') ? raw : folderId);

    this.folderId = folderId;
    this.folderLink = folderLink;

    localStorage.setItem(STORAGE_KEYS.DRIVE_FOLDER_ID, folderId);
    localStorage.setItem(STORAGE_KEYS.DRIVE_FOLDER_LINK, folderLink);
    storageService.setDriveConfig({ folderLink, folderId });

    if (currentUser) {
      storageService.logAudit({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'SISTEMA_CONFIG_ALTERADA',
        module: 'SISTEMA',
        recordId: folderId.slice(0, 12),
        description: `Link da Pasta Oficial de Backup no Google Drive atualizado para: ${folderLink} (ID: ${folderId})`,
        ipAddress: '2804:6788:4015:7c00:d3d:e9c2:1b3f:2aea',
      });
    }

    return { folderId, folderLink };
  }

  public resetTargetFolder(currentUser?: User): { folderId: string; folderLink: string } {
    this.folderId = TARGET_DRIVE_FOLDER_ID;
    this.folderLink = TARGET_DRIVE_FOLDER_LINK;

    localStorage.removeItem(STORAGE_KEYS.DRIVE_FOLDER_ID);
    localStorage.removeItem(STORAGE_KEYS.DRIVE_FOLDER_LINK);
    storageService.setDriveConfig(null);

    if (currentUser) {
      storageService.logAudit({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'SISTEMA_CONFIG_ALTERADA',
        module: 'SISTEMA',
        recordId: TARGET_DRIVE_FOLDER_ID.slice(0, 12),
        description: `Link da Pasta de Backup no Google Drive restaurado para o padrão original: ${TARGET_DRIVE_FOLDER_LINK}`,
        ipAddress: '2804:6788:4015:7c00:d3d:e9c2:1b3f:2aea',
      });
    }

    return { folderId: this.folderId, folderLink: this.folderLink };
  }

  public getCurrentOrigin(): string {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }

  public setManualAccessToken(token: string) {
    const cleanToken = token.trim();
    if (!cleanToken) return;
    this.accessToken = cleanToken;
    this.tokenExpiresAt = Date.now() + 3600 * 1000;
    localStorage.setItem(STORAGE_KEYS.DRIVE_ACCESS_TOKEN, this.accessToken);
    localStorage.setItem(STORAGE_KEYS.DRIVE_TOKEN_EXPIRES_AT, this.tokenExpiresAt.toString());
    this.setStatus('IDLE');
  }

  // Authorize using Firebase Auth Popup (official) or Google Identity Services (GIS)
  public async requestAuthorization(interactive: boolean = true): Promise<string> {
    if (this.isConnected() && this.accessToken) {
      return this.accessToken;
    }

    // 1. Primary: Firebase Auth Popup (mandated for Google Workspace integrations in AI Studio)
    if (firebaseAuth && driveGoogleProvider) {
      try {
        this.setStatus('SYNCING');
        const result = await signInWithPopup(firebaseAuth, driveGoogleProvider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          this.accessToken = credential.accessToken;
          this.tokenExpiresAt = Date.now() + 3550 * 1000;

          localStorage.setItem(STORAGE_KEYS.DRIVE_ACCESS_TOKEN, this.accessToken);
          localStorage.setItem(
            STORAGE_KEYS.DRIVE_TOKEN_EXPIRES_AT,
            this.tokenExpiresAt.toString()
          );

          this.setStatus('IDLE');
          return this.accessToken;
        }
      } catch (fbError: any) {
        console.warn('Tentativa via Firebase Auth:', fbError);
        if (fbError.code === 'auth/popup-closed-by-user') {
          this.setStatus('UNAUTHENTICATED');
          throw new Error('A janela de login do Google foi fechada antes de autorizar.');
        }
        if (fbError.code === 'auth/cancelled-popup-request') {
          this.setStatus('UNAUTHENTICATED');
          throw new Error('A requisição de login foi cancelada.');
        }
        if (fbError.code === 'auth/unauthorized-domain') {
          console.warn('Domínio ainda não listado no Firebase Auth:', window.location.origin);
        }
      }
    }

    // 2. Secondary fallback: Google Identity Services (GIS)
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
        // Wait a moment in case GIS script is finishing load
        setTimeout(() => {
          if (!window.google?.accounts?.oauth2) {
            reject(
              new Error(
                'Serviço de autenticação do Google não disponível no momento. Verifique sua conexão.'
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
      const tokenClient = window.google!.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: DRIVE_SCOPES,
        hint: TARGET_GOOGLE_EMAIL,
        prompt: interactive ? 'consent' : '',
        callback: (resp) => {
          if (resp.error || !resp.access_token) {
            this.setStatus('UNAUTHENTICATED');
            const errStr = String(resp.error || '');
            if (errStr.includes('origin_mismatch') || errStr.includes('access_denied')) {
              reject(
                new Error(
                  `Erro de Origem (origin_mismatch): A URL atual (${window.location.origin}) precisa estar nas Origens JavaScript Autorizadas do Google Cloud Console.`
                )
              );
              return;
            }
            reject(new Error(resp.error || 'Permissão não concedida pelo usuário no Google Drive.'));
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
      const errStr = String(e?.message || e || '');
      if (errStr.includes('origin_mismatch')) {
        reject(
          new Error(
            `Erro de Origem (origin_mismatch): A URL atual (${window.location.origin}) precisa estar autorizada no Google Cloud Console.`
          )
        );
        return;
      }
      reject(e);
    }
  }

  // Disconnect Google Drive
  public disconnect() {
    this.accessToken = null;
    this.tokenExpiresAt = 0;
    localStorage.removeItem(STORAGE_KEYS.DRIVE_ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.DRIVE_TOKEN_EXPIRES_AT);
    this.setStatus('UNAUTHENTICATED');
  }

  // Ensure Target Folder is accessible, or create fallback
  private async resolveTargetFolder(token: string): Promise<string> {
    const currentTargetId = this.getTargetFolderId();

    // 1. First priority: Check if specified target folder exists and is accessible
    try {
      const checkRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${currentTargetId}?fields=id,name,trashed,mimeType`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (checkRes.ok) {
        const folderData = await checkRes.json();
        if (!folderData.trashed) {
          this.folderId = currentTargetId;
          localStorage.setItem(STORAGE_KEYS.DRIVE_FOLDER_ID, this.folderId);
          return this.folderId;
        }
      }
    } catch (err) {
      console.warn('Verificando pasta de destino designada:', err);
    }

    // 2. Second priority: Search for folder by name
    try {
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
          localStorage.setItem(STORAGE_KEYS.DRIVE_FOLDER_ID, this.folderId);
          return this.folderId;
        }
      }
    } catch {
      // continue
    }

    // 3. Fallback: try current target folder ID directly
    return currentTargetId;
  }

  // Upload Complete Excel Backup (.xlsx) to Google Drive Folder
  public async uploadBackupToDrive(
    currentUser?: User,
    isManual: boolean = false
  ): Promise<{
    success: boolean;
    fileId?: string;
    fileName?: string;
    dayOfWeek?: string;
    readableDate?: string;
    webViewLink?: string;
    message?: string;
  }> {
    this.setStatus('SYNCING');

    try {
      let token = this.accessToken;
      if (!this.isConnected()) {
        if (isManual) {
          token = await this.requestAuthorization(true);
        } else {
          try {
            token = await this.requestAuthorization(false);
          } catch {
            this.setStatus('UNAUTHENTICATED');
            return {
              success: false,
              message: 'Google Drive requer autorização para salvar o backup.',
            };
          }
        }
      }

      if (!token) {
        this.setStatus('UNAUTHENTICATED');
        return { success: false, message: 'Google Drive não autorizado.' };
      }

      const folderId = await this.resolveTargetFolder(token);

      // Generate the official complete report workbook in Excel
      const operations = storageService.getOperations();
      const ordinance = storageService.getActiveOrdinance();

      const {
        buffer,
        fileName,
        dayOfWeek,
        readableDate,
        totalAmount,
        totalJoes,
      } = await excelService.generateCompleteBackupBuffer(operations, ordinance, currentUser);

      // Multipart upload of the .xlsx file to the designated Google Drive folder
      const boundary = '-------314159265358979323846';
      const metadata = {
        name: fileName,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        parents: [folderId],
        description: `Relatório Completo de Backup Oficial CPI/PMMA | Salvo em: ${readableDate} | ${operations.length} Operações | ${totalJoes} JOEs | Valor Total: R$ ${totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Pasta: ${folderId}`,
      };

      const metadataString = JSON.stringify(metadata);
      const postBlob = new Blob(
        [
          `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadataString}\r\n--${boundary}\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`,
          buffer,
          `\r\n--${boundary}--`,
        ],
        { type: `multipart/related; boundary=${boundary}` }
      );

      let uploadRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,size',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: postBlob,
        }
      );

      // If specified folder rejected upload due to permissions, retry saving to user's Drive root or create local folder
      if (!uploadRes.ok && (uploadRes.status === 403 || uploadRes.status === 404)) {
        console.warn('Pasta designada inacessível com o token atual. Tentando salvar na raiz ou pasta criada...');
        const fallbackMeta = { ...metadata, parents: [] };
        const fallbackBlob = new Blob(
          [
            `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(fallbackMeta)}\r\n--${boundary}\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`,
            buffer,
            `\r\n--${boundary}--`,
          ],
          { type: `multipart/related; boundary=${boundary}` }
        );

        uploadRes = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,size',
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: fallbackBlob,
          }
        );
      }

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
      const savedFileId = fileData.id;

      this.lastBackupTime = readableDate;
      this.lastBackupName = fileName;
      this.lastBackupDay = dayOfWeek;
      localStorage.setItem(STORAGE_KEYS.LAST_BACKUP_TIME, readableDate);
      localStorage.setItem(STORAGE_KEYS.LAST_BACKUP_NAME, fileName);
      localStorage.setItem(STORAGE_KEYS.LAST_BACKUP_DAY, dayOfWeek);

      // Audit log
      if (currentUser) {
        storageService.logAudit({
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'BACKUP_CRIADO',
          module: 'BACKUP',
          recordId: `drive #${savedFileId?.slice(0, 8)}`,
          description: `Backup oficial em Excel (.xlsx) salvo com sucesso no Google Drive: ${fileName} (${readableDate}, ${operations.length} operações). Pasta: ${folderId}`,
          ipAddress: '2804:6788:4015:7c00:d3d:e9c2:1b3f:2aea',
        });
      }

      this.setStatus('SUCCESS');

      // Also trigger email backup automatically
      import('./gmailBackupService')
        .then(({ gmailBackupService }) => {
          gmailBackupService
            .sendAutoBackupEmail(currentUser)
            .catch((e) => console.warn('Aviso no envio de backup por e-mail:', e));
        })
        .catch(() => {});

      return {
        success: true,
        fileId: savedFileId,
        fileName,
        dayOfWeek,
        readableDate,
        webViewLink: fileData.webViewLink || this.getTargetFolderLink(),
        message: `Relatório Completo de Backup salvo no Google Drive com sucesso (${fileName})!`,
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

  // Trigger Automatic Backup on Data Modification (Debounced to avoid excessive writes)
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
        this.setStatus('SAVED_LOCAL');
      }
    }, 2500);
  }

  // List Backups in Google Drive Folder (both Excel .xlsx and legacy .json)
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

      const folderId = await this.resolveTargetFolder(token);
      const query = `'${folderId}' in parents and trashed=false`;

      const listRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          query
        )}&fields=files(id,name,size,createdTime,modifiedTime,description,mimeType,webViewLink,webContentLink)&orderBy=createdTime desc&pageSize=50`,
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
      const files: DriveBackupFileMeta[] = (data.files || []).map((f: any) => {
        // Extract day of week if present in filename or compute from createdTime
        let dayOfWeek: string | undefined;
        const daysPt = [
          'Domingo',
          'Segunda-Feira',
          'Terça-Feira',
          'Quarta-Feira',
          'Quinta-Feira',
          'Sexta-Feira',
          'Sábado',
        ];
        if (f.name) {
          const match = daysPt.find((d) => f.name.toLowerCase().includes(d.toLowerCase()));
          if (match) dayOfWeek = match;
        }
        if (!dayOfWeek && f.createdTime) {
          const d = new Date(f.createdTime);
          dayOfWeek = daysPt[d.getDay()];
        }

        return {
          id: f.id,
          name: f.name,
          size: f.size ? `${(parseInt(f.size, 10) / 1024).toFixed(1)} KB` : 'N/A',
          createdTime: f.createdTime,
          modifiedTime: f.modifiedTime,
          description: f.description,
          mimeType: f.mimeType,
          webViewLink: f.webViewLink,
          webContentLink: f.webContentLink,
          dayOfWeek,
        };
      });

      return { success: true, files };
    } catch (err: any) {
      return {
        success: false,
        files: [],
        message: err.message || 'Falha ao listar backups do Google Drive.',
      };
    }
  }

  // Download backup content from Drive (either raw blob or JSON payload)
  public async downloadDriveBackupFile(fileId: string, fileName: string): Promise<void> {
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

    const blob = await downloadRes.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Download backup content from Drive and return parsed JSON payload
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

  // Download Local Excel Backup immediately
  public async downloadLocalExcelBackup(currentUser?: User): Promise<void> {
    const operations = storageService.getOperations();
    const ordinance = storageService.getActiveOrdinance();
    const { buffer, fileName, readableDate } = await excelService.generateCompleteBackupBuffer(
      operations,
      ordinance,
      currentUser
    );

    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
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
        recordId: `local-excel #${Date.now().toString().slice(-4)}`,
        description: `Download local de Relatório Completo de Backup em Excel: ${fileName} (${readableDate})`,
        ipAddress: '2804:6788:4015:7c00:d3d:e9c2:1b3f:2aea',
      });
    }
  }

  // Generate full system backup payload (JSON format for system replication)
  public generateBackupPayload(currentUser?: User): SystemBackupPayload {
    const rawPayload = storageService.exportFullBackup(currentUser);
    return {
      version: '3.0.0',
      systemName: 'Controle e Auditoria de JOE - CPI/PMMA (Portaria nº 122/2026)',
      targetAccountEmail: TARGET_GOOGLE_EMAIL,
      createdAt: new Date().toISOString(),
      generatedBy: currentUser
        ? `${currentUser.name} (${currentUser.login || currentUser.role})`
        : 'Sistema Automático CPI',
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

  // Download legacy Backup JSON file to local computer
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

  // Load Google Picker API script dynamically
  public async loadPickerApi(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).google?.picker) {
        resolve();
        return;
      }

      const checkAndLoad = () => {
        if ((window as any).gapi?.load) {
          (window as any).gapi.load('picker', {
            callback: () => resolve(),
            onerror: () => reject(new Error('Falha ao carregar a biblioteca Google Picker.')),
          });
          return true;
        }
        return false;
      };

      if (checkAndLoad()) return;

      let script = document.querySelector('script[src="https://apis.google.com/js/api.js"]') as HTMLScriptElement;
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }

      let count = 0;
      const timer = setInterval(() => {
        count++;
        if (checkAndLoad()) {
          clearInterval(timer);
        } else if (count > 30) {
          clearInterval(timer);
          reject(new Error('Tempo limite ao carregar biblioteca Google Picker.'));
        }
      }, 200);
    });
  }

  // Open official Google Picker widget
  public async openGooglePicker(
    onPicked: (doc: {
      id: string;
      name: string;
      mimeType?: string;
      url?: string;
      sizeBytes?: number;
    }) => void,
    onCancel?: () => void
  ): Promise<void> {
    let token = this.accessToken;
    if (!this.isConnected()) {
      token = await this.requestAuthorization(true);
    }
    if (!token) {
      throw new Error('Token de acesso do Google Drive não disponível para o Google Picker.');
    }

    await this.loadPickerApi();

    const googleObj = (window as any).google;
    if (!googleObj?.picker) {
      throw new Error('Google Picker não está disponível no navegador.');
    }

    // Official origin calculation pattern
    const pickerOrigin =
      window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0
        ? window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1]
        : window.location.origin;

    const docsView = new googleObj.picker.DocsView(googleObj.picker.ViewId.DOCS)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(false);

    const spreadsheetsView = new googleObj.picker.DocsView(googleObj.picker.ViewId.SPREADSHEETS);

    const builder = new googleObj.picker.PickerBuilder()
      .addView(docsView)
      .addView(spreadsheetsView)
      .addView(new googleObj.picker.DocsUploadView())
      .setOAuthToken(token)
      .setOrigin(pickerOrigin)
      .setTitle('Google Drive - Selecionar Arquivo ou Relatório JOE')
      .setCallback((data: any) => {
        if (data.action === googleObj.picker.Action.PICKED) {
          const doc = data.docs?.[0];
          if (doc) {
            onPicked({
              id: doc.id,
              name: doc.name,
              mimeType: doc.mimeType,
              url: doc.url,
              sizeBytes: doc.sizeBytes,
            });
          }
        } else if (data.action === googleObj.picker.Action.CANCEL) {
          if (onCancel) onCancel();
        }
      });

    const picker = builder.build();
    picker.setVisible(true);
  }
}

export const googleDriveBackupService = new GoogleDriveBackupService();
