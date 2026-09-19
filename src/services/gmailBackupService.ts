import { excelService } from './excelService';
import { storageService } from './storageService';
import { googleDriveBackupService } from './googleDriveBackupService';
import { User } from '../types';
import { formatCurrencyBRL } from '../utils/formatters';

export const GMAIL_BACKUP_LABEL_NAME = 'BACKUP JOE';
export const DEFAULT_BACKUP_EMAIL = 'secaooperacional.cpi.pmma@gmail.com';

const STORAGE_KEYS = {
  LAST_EMAIL_BACKUP_TIME: 'cpi_pmma_gmail_last_backup_time',
  LAST_EMAIL_RECIPIENTS: 'cpi_pmma_gmail_last_recipients',
  LAST_EMAIL_STATUS: 'cpi_pmma_gmail_last_status',
};

export interface GmailBackupResult {
  success: boolean;
  message: string;
  messageId?: string;
  recipients?: string[];
  labelName?: string;
  timestamp?: string;
  fileName?: string;
  error?: string;
}

// Convert string to UTF-8 Base64
function utf8ToBase64(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
}

// Convert ArrayBuffer or Uint8Array to standard Base64
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as any);
  }
  return btoa(binary);
}

// Convert RFC 2822 MIME string to Base64URL
function mimeToBase64Url(mime: string): string {
  return btoa(mime)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

class GmailBackupService {
  private lastBackupTime: string | null = null;
  private lastRecipients: string[] = [];
  private lastStatus: 'SUCCESS' | 'ERROR' | 'IDLE' = 'IDLE';
  private cachedLabelId: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.lastBackupTime = localStorage.getItem(STORAGE_KEYS.LAST_EMAIL_BACKUP_TIME);
      const savedRecipients = localStorage.getItem(STORAGE_KEYS.LAST_EMAIL_RECIPIENTS);
      if (savedRecipients) {
        try {
          this.lastRecipients = JSON.parse(savedRecipients);
        } catch {
          this.lastRecipients = [DEFAULT_BACKUP_EMAIL];
        }
      } else {
        this.lastRecipients = [DEFAULT_BACKUP_EMAIL];
      }
      this.lastStatus = (localStorage.getItem(STORAGE_KEYS.LAST_EMAIL_STATUS) as any) || 'IDLE';
    }
  }

  public getLastBackupTime(): string | null {
    return this.lastBackupTime;
  }

  public getLastRecipients(): string[] {
    return this.lastRecipients.length > 0 ? this.lastRecipients : [DEFAULT_BACKUP_EMAIL];
  }

  public getLastStatus(): 'SUCCESS' | 'ERROR' | 'IDLE' {
    return this.lastStatus;
  }

  // Find or automatically create the "BACKUP JOE" label in Gmail
  public async getOrCreateBackupJoeLabel(token: string): Promise<string> {
    if (this.cachedLabelId) {
      return this.cachedLabelId;
    }

    // 1. Check existing labels
    try {
      const listRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (listRes.ok) {
        const data = await listRes.json();
        const found = (data.labels || []).find(
          (l: any) =>
            l.name &&
            l.name.trim().toUpperCase() === GMAIL_BACKUP_LABEL_NAME.toUpperCase()
        );
        if (found?.id) {
          this.cachedLabelId = found.id;
          return found.id;
        }
      }
    } catch (e) {
      console.warn('Falha ao listar marcadores no Gmail:', e);
    }

    // 2. Create the BACKUP JOE label
    try {
      const createRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: GMAIL_BACKUP_LABEL_NAME,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
          color: {
            textColor: '#ffffff',
            backgroundColor: '#16a765', // Green badge in Gmail
          },
        }),
      });

      if (createRes.ok) {
        const created = await createRes.json();
        this.cachedLabelId = created.id;
        return created.id;
      }
    } catch (e) {
      console.warn('Falha ao criar marcador no Gmail:', e);
    }

    // 3. Second query check in case creation had conflict (already exists)
    try {
      const retryRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (retryRes.ok) {
        const data = await retryRes.json();
        const found = (data.labels || []).find(
          (l: any) =>
            l.name &&
            l.name.trim().toUpperCase() === GMAIL_BACKUP_LABEL_NAME.toUpperCase()
        );
        if (found?.id) {
          this.cachedLabelId = found.id;
          return found.id;
        }
      }
    } catch (e) {
      console.warn('Falha na segunda busca de marcador:', e);
    }

    return '';
  }

  // Construct official HTML email body
  private buildHtmlEmail(params: {
    readableDate: string;
    dayOfWeek: string;
    currentUser?: User;
    totalJoes: number;
    totalOps: number;
    totalAmount: number;
    fileName: string;
    ordinanceName: string;
    isTest?: boolean;
  }): string {
    const formattedAmount = formatCurrencyBRL(params.totalAmount);
    const userName = params.currentUser?.name || 'Sistema Integrado CPI/PMMA';
    const userRole = params.currentUser?.role || 'Operador';
    const tagTitle = params.isTest
      ? 'TESTE DE COMUNICAÇÃO E BACKUP'
      : 'CÓPIA DE SEGURANÇA AUTOMATIZADA';

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Backup Oficial JOE - CPI/PMMA</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 24px 0;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="max-width: 640px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); border: 1px solid #cbd5e1;">
          
          <!-- Top Header Military Theme -->
          <tr>
            <td style="background-color: #002D5A; padding: 24px; text-align: center; border-bottom: 4px solid #D97706;">
              <p style="margin: 0; font-size: 11px; letter-spacing: 2px; color: #93c5fd; font-weight: 700; text-transform: uppercase;">
                POLÍCIA MILITAR DO MARANHÃO
              </p>
              <h1 style="margin: 6px 0 0 0; font-size: 20px; color: #ffffff; font-weight: 800; letter-spacing: 0.5px;">
                COMANDO DE POLICIAMENTO DO INTERIOR (CPI)
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #e2e8f0;">
                Seção Operacional — Sistema de Gestão de JOE
              </p>
            </td>
          </tr>

          <!-- Label Tag Bar -->
          <tr>
            <td style="background-color: #f8fafc; padding: 12px 24px; border-bottom: 1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left">
                    <span style="display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; background-color: #10b981; color: #ffffff; letter-spacing: 0.5px;">
                      🏷️ MARCADOR: ${GMAIL_BACKUP_LABEL_NAME}
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b;">
                      ${tagTitle}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                Prezada Seção Operacional e Comando,
              </p>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                ${
                  params.isTest
                    ? 'Este é um <strong>e-mail de teste de disparo de backup</strong> solicitado pelo operador. A integração com o Gmail e a geração do arquivo Excel estão operando perfeitamente.'
                    : 'Uma nova alteração nos dados do Sistema JOE foi realizada. Em conformidade com as diretrizes de segurança, uma <strong>cópia completa em planilha Excel (.xlsx)</strong> foi gerada e encaminhada automaticamente em anexo a esta mensagem, catalogada sob o marcador <strong>BACKUP JOE</strong>.'
                }
              </p>

              <!-- Metrics Cards Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 13px;">
                      <tr>
                        <td width="40%" style="color: #64748b; font-weight: 600;">Data e Hora do Registro:</td>
                        <td width="60%" style="color: #0f172a; font-weight: 700;">${params.readableDate} (${params.dayOfWeek})</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 600;">Operador Responsável:</td>
                        <td style="color: #0f172a; font-weight: 700;">${userName} <span style="font-size: 11px; color: #64748b;">(${userRole})</span></td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 600;">Portaria Operacional:</td>
                        <td style="color: #0f172a; font-weight: 700;">${params.ordinanceName}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 600;">Total de Lançamentos:</td>
                        <td style="color: #0f172a; font-weight: 700;">${params.totalOps} operações ativas</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 600;">Total de JOEs Executadas:</td>
                        <td style="color: #0f172a; font-weight: 700;">${params.totalJoes} JOEs</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 600;">Valor Total Consolidado:</td>
                        <td style="color: #002D5A; font-weight: 800; font-size: 15px;">${formattedAmount}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 600;">Arquivo Anexado:</td>
                        <td style="color: #047857; font-weight: 700; font-family: monospace;">📎 ${params.fileName}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Explanation -->
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #1e40af;">
                  <strong>Importante:</strong> Esta mensagem foi classificada no marcador <strong>BACKUP JOE</strong> do Gmail. A planilha anexada contém todas as abas consolidadas: Lançamentos Detalhados, Resumo por Grande Comando (CPI e CPA/I-1 a CPA/I-9), Tetos Orçamentários e Trilha de Auditoria.
                </p>
              </div>

              <p style="margin: 0; font-size: 13px; color: #475569;">
                Atenciosamente,<br>
                <strong>Seção Operacional — Comando de Policiamento do Interior (CPI/PMMA)</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
              CPI/PMMA • Sistema de Gestão de Jornada Extraordinária (JOE) • Notificação Automática de Backup
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  // Build RFC 2822 base64url message
  private buildMimeMessage(params: {
    to: string[];
    subject: string;
    htmlBody: string;
    attachmentBuffer: ArrayBuffer | Uint8Array;
    attachmentFileName: string;
  }): string {
    const boundary = `boundary_cpi_pmma_joe_${Date.now()}`;
    const subjectEncoded = `=?UTF-8?B?${utf8ToBase64(params.subject)}?=`;
    const recipients = params.to.join(', ');

    const mimeParts = [
      `From: me`,
      `To: ${recipients}`,
      `Subject: ${subjectEncoded}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      utf8ToBase64(params.htmlBody),
      ``,
      `--${boundary}`,
      `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; name="${params.attachmentFileName}"`,
      `Content-Disposition: attachment; filename="${params.attachmentFileName}"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      arrayBufferToBase64(params.attachmentBuffer),
      ``,
      `--${boundary}--`,
    ];

    const rawMime = mimeParts.join('\r\n');
    return mimeToBase64Url(rawMime);
  }

  // Send Backup Email (used for auto backup on alteration and manual test)
  public async sendBackupEmail(options: {
    isTest?: boolean;
    currentUser?: User;
    recipientsOverride?: string[];
  }): Promise<GmailBackupResult> {
    try {
      // 1. Obtain valid access token with Workspace scopes
      let token = googleDriveBackupService.getAccessToken();
      if (!googleDriveBackupService.isConnected() || !token) {
        token = await googleDriveBackupService.requestAuthorization(true);
      }

      if (!token) {
        throw new Error('Não foi possível obter autenticação para o envio pelo Gmail.');
      }

      // 2. Determine recipients list
      const recipients =
        options.recipientsOverride && options.recipientsOverride.length > 0
          ? options.recipientsOverride
          : storageService.getBackupEmails();

      if (!recipients || recipients.length === 0) {
        throw new Error('Nenhum e-mail de destino cadastrado para o envio do backup.');
      }

      // 3. Generate Complete Excel Backup (.xlsx)
      const operations = storageService.getOperations();
      const ordinance = storageService.getActiveOrdinance();
      const ordinanceName = ordinance
        ? `Portaria nº ${ordinance.number || ordinance.name || '001'} (${ordinance.startDate || ''} a ${ordinance.endDate || ''})`
        : 'Portaria Vigente';

      const {
        buffer,
        fileName,
        dayOfWeek,
        readableDate,
        totalAmount,
        totalJoes,
      } = await excelService.generateCompleteBackupBuffer(
        operations,
        ordinance,
        options.currentUser
      );

      // 4. Build Email Content
      const subject = options.isTest
        ? `[${GMAIL_BACKUP_LABEL_NAME}] TESTE: Relatório Oficial JOE CPI/PMMA - ${dayOfWeek} (${readableDate})`
        : `[${GMAIL_BACKUP_LABEL_NAME}] Backup Automático JOE CPI/PMMA - ${dayOfWeek} (${readableDate})`;

      const htmlBody = this.buildHtmlEmail({
        readableDate,
        dayOfWeek,
        currentUser: options.currentUser,
        totalJoes,
        totalOps: operations.length,
        totalAmount,
        fileName,
        ordinanceName,
        isTest: options.isTest,
      });

      const rawBase64Url = this.buildMimeMessage({
        to: recipients,
        subject,
        htmlBody,
        attachmentBuffer: buffer,
        attachmentFileName: fileName,
      });

      // 5. Send message via Gmail API
      const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: rawBase64Url,
        }),
      });

      if (!sendRes.ok) {
        if (sendRes.status === 401 || sendRes.status === 403) {
          // Token might lack gmail scope or expired; try refreshing with consent once
          try {
            const freshToken = await googleDriveBackupService.requestAuthorization(true);
            const retryRes = await fetch(
              'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${freshToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ raw: rawBase64Url }),
              }
            );
            if (retryRes.ok) {
              const retryData = await retryRes.json();
              await this.applyBackupJoeLabel(freshToken, retryData.id);
              return this.recordSuccess(retryData.id, recipients, fileName, readableDate);
            }
          } catch (retryErr) {
            console.warn('Falha na reautenticação do Gmail:', retryErr);
          }
        }
        const errJson = await sendRes.json().catch(() => ({}));
        throw new Error(
          errJson.error?.message ||
            `Erro ao enviar e-mail pelo Gmail (Status ${sendRes.status}).`
        );
      }

      const sendData = await sendRes.json();
      const messageId = sendData.id;

      // 6. Ensure and apply the "BACKUP JOE" label to the message
      await this.applyBackupJoeLabel(token, messageId);

      // 7. Audit log & state save
      return this.recordSuccess(messageId, recipients, fileName, readableDate, options.currentUser);
    } catch (err: any) {
      console.error('Erro no envio de backup por e-mail:', err);
      this.lastStatus = 'ERROR';
      localStorage.setItem(STORAGE_KEYS.LAST_EMAIL_STATUS, 'ERROR');

      return {
        success: false,
        message: err.message || 'Falha ao enviar backup por e-mail.',
        error: err.message,
      };
    }
  }

  // Apply the "BACKUP JOE" label to the message in Gmail
  private async applyBackupJoeLabel(token: string, messageId: string) {
    if (!messageId) return;
    try {
      const labelId = await this.getOrCreateBackupJoeLabel(token);
      if (labelId) {
        await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            addLabelIds: [labelId],
          }),
        });
      }
    } catch (labelErr) {
      console.warn('Aviso: Não foi possível aplicar o marcador BACKUP JOE no e-mail:', labelErr);
    }
  }

  private recordSuccess(
    messageId: string,
    recipients: string[],
    fileName: string,
    readableDate: string,
    currentUser?: User
  ): GmailBackupResult {
    this.lastBackupTime = readableDate;
    this.lastRecipients = recipients;
    this.lastStatus = 'SUCCESS';

    localStorage.setItem(STORAGE_KEYS.LAST_EMAIL_BACKUP_TIME, readableDate);
    localStorage.setItem(STORAGE_KEYS.LAST_EMAIL_RECIPIENTS, JSON.stringify(recipients));
    localStorage.setItem(STORAGE_KEYS.LAST_EMAIL_STATUS, 'SUCCESS');

    if (currentUser) {
      storageService.logAudit({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'BACKUP_CRIADO',
        module: 'BACKUP',
        recordId: messageId ? messageId.slice(0, 12) : 'email',
        description: `Backup em Excel enviado por e-mail para [${recipients.join(', ')}] e classificado com o marcador '${GMAIL_BACKUP_LABEL_NAME}'. Arquivo: ${fileName}`,
        ipAddress: '2804:6788:4015:7c00:d3d:e9c2:1b3f:2aea',
      });
    }

    return {
      success: true,
      message: `Cópia do backup enviada com sucesso para ${recipients.join(', ')} e salva sob o marcador '${GMAIL_BACKUP_LABEL_NAME}'!`,
      messageId,
      recipients,
      labelName: GMAIL_BACKUP_LABEL_NAME,
      fileName,
      timestamp: readableDate,
    };
  }

  // Dedicated test button helper
  public async sendTestBackupEmail(currentUser?: User): Promise<GmailBackupResult> {
    return this.sendBackupEmail({ isTest: true, currentUser });
  }

  // Automatic backup on alteration
  public async sendAutoBackupEmail(currentUser?: User): Promise<GmailBackupResult | null> {
    if (!googleDriveBackupService.isConnected()) {
      return null;
    }
    return this.sendBackupEmail({ isTest: false, currentUser });
  }
}

export const gmailBackupService = new GmailBackupService();
