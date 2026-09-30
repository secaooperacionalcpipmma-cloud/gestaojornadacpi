export interface ExtractedJoeData {
  commandId: string;
  subUnit: string;
  eventName: string;
  orderType: 'ORDEM_DE_SERVICO' | 'ORDEM_DE_OPERACAO';
  orderNumber: string;
  seiProcessNumber: string;
  serviceDate: string;
  startTime: string;
  endTime: string;
  officersCount: number;
  unitValue: number;
  totalValue: number;
  justification: string;
  location: string;
  missingFields: string[];
  isComplete: boolean;
  rawSummary: string;
}

export interface OcrJoeResponse {
  success: boolean;
  data?: ExtractedJoeData;
  error?: string;
}

export const FIELD_LABELS: Record<string, string> = {
  commandId: 'Comando de Área (CPA/I)',
  subUnit: 'Unidade Subordinada (BPM / CI)',
  eventName: 'Nome do Evento / Operação',
  orderType: 'Tipo de Ordem (OS ou OO)',
  orderNumber: 'Número da Ordem de Serviço / Operação',
  seiProcessNumber: 'Número do Processo SEI',
  serviceDate: 'Data do Serviço',
  startTime: 'Horário Inicial',
  endTime: 'Horário Final',
  officersCount: 'Efetivo Solicitado (JOEs)',
  unitValue: 'Valor Unitário (R$)',
  totalValue: 'Valor Total (R$)',
  justification: 'Justificativa da JOE',
};

class OcrJoeService {
  /**
   * Envia o print / imagem codificado em base64 para a API server-side
   * alimentada pelo Gemini 3.8 Flash para extração automatizada de campos.
   */
  async extractJoeFromPrint(
    imageBase64: string,
    options?: {
      mimeType?: string;
      unitValueJoe?: number;
      ordinanceNumber?: string;
    }
  ): Promise<OcrJoeResponse> {
    try {
      const response = await fetch('/api/ocr-joe-print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64,
          mimeType: options?.mimeType || 'image/png',
          unitValueJoe: options?.unitValueJoe || 350,
          ordinanceNumber: options?.ordinanceNumber || '127/2026',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error || `Erro no servidor (${response.status}): ${response.statusText}`,
        };
      }

      const result = await response.json();
      return result;
    } catch (err: any) {
      console.error('Falha ao comunicar com API de OCR:', err);
      return {
        success: false,
        error: err.message || 'Falha na comunicação de rede com o serviço de OCR inteligente.',
      };
    }
  }

  /**
   * Converte arquivo File ou Blob em Base64 Data URL
   */
  fileToBase64(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Falha ao converter arquivo para base64.'));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Extrai imagem do clipboard se disponível
   */
  async getImageFromClipboard(event: ClipboardEvent): Promise<File | null> {
    const items = event.clipboardData?.items;
    if (!items) return null;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) return file;
      }
    }
    return null;
  }
}

export const ocrJoeService = new OcrJoeService();
