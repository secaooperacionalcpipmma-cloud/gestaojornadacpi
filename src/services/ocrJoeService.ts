import { GoogleGenAI, Type } from '@google/genai';

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

const COMMAND_SUBUNITS_MAP: Record<string, string[]> = {
  'CPI': ['CPI (Direção Setorial)', 'Gabinete CPI', 'Seção Operacional CPI'],
  'CPA/I-1': ['CPA/I-1 (Direção)', '15º BPM', '19º BPM', '23º BPM', '39º BPM'],
  'CPA/I-2': ['CPA/I-2 (Direção)', '5º BPM', '18º BPM', '33º BPM', '37º BPM'],
  'CPA/I-3': [
    'CPA/I-3 (Direção)',
    '3º BPM',
    '12º BPM',
    '14º BPM',
    '26º BPM',
    '30º BPM',
    '32º BPM',
    '34º BPM',
    '1º EPMONT',
    '2º BMT',
  ],
  'CPA/I-4': ['CPA/I-4 (Direção)', '2º BPM', '17º BPM', '24º BPM', '48º BPM'],
  'CPA/I-5': ['CPA/I-5 (Direção)', '10º BPM', '25º BPM', '36º BPM', '41º BPM', '45º BPM'],
  'CPA/I-6': ['CPA/I-6 (Direção)', '4º BPM', '46º BPM'],
  'CPA/I-7': ['CPA/I-7 (Direção)', '16º BPM', '27º BPM', '28º BPM'],
  'CPA/I-8': ['CPA/I-8 (Direção)', '7º BPM', '29º BPM', '31º BPM'],
  'CPA/I-9': ['CPA/I-9 (Direção)', '11º BPM', '35º BPM', '44º BPM', '47º BPM', '1º CIMT'],
};

class OcrJoeService {
  /**
   * Envia o print / imagem codificado em base64 para a API do backend
   * com fallback automático para execução direta no cliente caso o proxy HTTP retorne 404.
   */
  async extractJoeFromPrint(
    imageBase64: string,
    options?: {
      mimeType?: string;
      unitValueJoe?: number;
      ordinanceNumber?: string;
    }
  ): Promise<OcrJoeResponse> {
    const unitValueJoe = options?.unitValueJoe || 350;
    const ordinanceNumber = options?.ordinanceNumber || '127/2026';
    const mimeType = options?.mimeType || 'image/png';

    // 1. Tentar chamar a rota de backend /api/ocr-joe-print
    try {
      const response = await fetch('/api/ocr-joe-print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          unitValueJoe,
          ordinanceNumber,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result && result.success && result.data) {
          return result;
        }
      }
      console.warn(`[OCR] Backend /api/ocr-joe-print status ${response.status}. Ativando fallback resiliente.`);
    } catch (fetchErr) {
      console.warn('[OCR] Erro de rede na rota /api/ocr-joe-print. Ativando fallback resiliente:', fetchErr);
    }

    // 2. Fallback resiliente: Execução direta com a SDK Gemini
    return await this.extractJoeDirect(imageBase64, {
      mimeType,
      unitValueJoe,
      ordinanceNumber,
    });
  }

  /**
   * Executa a extração multimodal diretamente via Gemini SDK
   */
  private async extractJoeDirect(
    imageBase64: string,
    options: {
      mimeType: string;
      unitValueJoe: number;
      ordinanceNumber: string;
    }
  ): Promise<OcrJoeResponse> {
    try {
      const apiKey =
        (import.meta as any).env?.VITE_GEMINI_API_KEY ||
        (process as any)?.env?.GEMINI_API_KEY;

      if (!apiKey) {
        return {
          success: false,
          error: 'Chave da API Gemini não configurada no ambiente.',
        };
      }

      const ai = new GoogleGenAI({ apiKey });

      let cleanBase64 = imageBase64;
      let detectedMime = options.mimeType;
      if (imageBase64.includes(';base64,')) {
        const parts = imageBase64.split(';base64,');
        cleanBase64 = parts[1];
        const match = parts[0].match(/data:(.*?)$/);
        if (match && match[1]) {
          detectedMime = match[1];
        }
      }

      const systemPrompt = `Você é um especialista em análise documental e OCR inteligente da Polícia Militar do Maranhão (PMMA), atuando no Comando de Policiamento do Interior (CPI) para gestão da Jornada Operacional Extraordinária (JOE).
Sua missão é analisar o print/screenshot ou documento de solicitação de JOE e extrair com máxima precisão todas as informações necessárias para registrar o lançamento no sistema.

MAPA OFICIAL DE COMANDOS (CPA/I) E UNIDADES SUBORDINADAS:
- CPI: CPI (Direção Setorial), Gabinete CPI, Seção Operacional CPI
- CPA/I-1: 15º BPM, 19º BPM, 23º BPM, 39º BPM (Bacabal e região)
- CPA/I-2: 5º BPM, 18º BPM, 33º BPM, 37º BPM
- CPA/I-3: 3º BPM, 12º BPM, 14º BPM, 26º BPM, 30º BPM, 32º BPM, 34º BPM, 1º EPMONT, 2º BMT (Imperatriz e região)
- CPA/I-4: 2º BPM, 17º BPM, 24º BPM, 48º BPM (Caxias, Codó, etc.)
- CPA/I-5: 10º BPM, 25º BPM, 36º BPM, 41º BPM, 45º BPM (Pinheiro, Cururupu, etc.)
- CPA/I-6: 4º BPM, 46º BPM (Balsas e região)
- CPA/I-7: 16º BPM, 27º BPM, 28º BPM (Chapadinha, Rosário, etc.)
- CPA/I-8: 7º BPM, 29º BPM, 31º BPM (Pindaré-Mirim, Zé Doca, etc.)
- CPA/I-9: 11º BPM, 35º BPM, 44º BPM, 47º BPM, 1º CIMT (Timon, São João dos Patos, etc.)

REGRAS DE EXTRAÇÃO:
1. "commandId": Identifique a qual CPA/I a unidade pertence usando o mapa acima. Deve ser estritamente um dos seguintes: "CPI", "CPA/I-1", "CPA/I-2", "CPA/I-3", "CPA/I-4", "CPA/I-5", "CPA/I-6", "CPA/I-7", "CPA/I-8", "CPA/I-9".
2. "subUnit": Unidade policial militar solicitante (ex: "2º BPM", "10º BPM", "15º BPM", "23º BPM", etc.).
3. "eventName": Nome do evento, operação policial ou missão (ex: "Operação Padrão", "Policiamento no Aniversário da Cidade", "Operação Cidade Segura").
4. "orderType": "ORDEM_DE_SERVICO" ou "ORDEM_DE_OPERACAO". Se for Ordem de Serviço, "ORDEM_DE_SERVICO". Se for Ordem de Operação, "ORDEM_DE_OPERACAO".
5. "orderNumber": Número da ordem (ex: "OS nº 145/2026", "OO nº 012/2026", "145/2026").
6. "seiProcessNumber": Número do Processo SEI (ex: "2026.190110.37509", "2026.190110.35675" ou formato similar de processo administrativo). Se encontrar formato SEI com pontos ou barras, mantenha.
7. "serviceDate": Data em que o serviço ocorrerá ou ocorreu no formato estrito "YYYY-MM-DD" (ex: "2026-09-25").
8. "startTime": Horário de início do turno (ex: "20:00" ou "20h"). Se não houver, tente inferir do texto ou use "20:00".
9. "endTime": Horário de término do turno (ex: "02:00" ou "02h").
10. "officersCount": Quantidade de policiais militares ou número de JOEs solicitadas (número inteiro positivo).
11. "unitValue": Valor unitário da JOE em Reais (o padrão da Portaria ${options.ordinanceNumber} é R$ ${options.unitValueJoe}).
12. "totalValue": Valor total em Reais. Se não constar, calcule como officersCount * unitValue.
13. "justification": Justificativa da criação da JOE mencionada no documento/print.
14. "location": Município ou local da operação (ex: "Caxias/MA", "Bacabal/MA").
15. "missingFields": Lista contendo os nomes dos campos essenciais que NÃO foram encontrados ou estão ilegíveis/incompletos no print. Campos essenciais: "commandId", "subUnit", "eventName", "orderNumber", "seiProcessNumber", "serviceDate", "officersCount". Se todos foram identificados, retorne lista vazia [].
16. "rawSummary": Breve resumo de uma frase do que foi identificado no print.`;

      const userPrompt = `Analise atentamente a imagem da solicitação de JOE anexada e extraia todos os campos requeridos em formato JSON estrito conforme o schema.`;

      const candidateModels = [
        'gemini-3.8-flash',
        'gemini-3.5-flash',
        'gemini-flash-latest',
        'gemini-3.1-flash-lite',
        'gemini-2.5-flash-lite',
      ];
      let response: any = null;
      let lastError: any = null;

      for (const modelName of candidateModels) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: {
              parts: [
                {
                  inlineData: {
                    data: cleanBase64,
                    mimeType: detectedMime,
                  },
                },
                {
                  text: `${systemPrompt}\n\n${userPrompt}`,
                },
              ],
            },
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  commandId: { type: Type.STRING, description: 'Código do comando oficial, ex: CPA/I-4' },
                  subUnit: { type: Type.STRING, description: 'Nome da unidade policial, ex: 2º BPM' },
                  eventName: { type: Type.STRING, description: 'Nome do evento ou operação' },
                  orderType: { type: Type.STRING, description: 'ORDEM_DE_SERVICO ou ORDEM_DE_OPERACAO' },
                  orderNumber: { type: Type.STRING, description: 'Número da ordem de serviço/operação' },
                  seiProcessNumber: { type: Type.STRING, description: 'Número do processo SEI' },
                  serviceDate: { type: Type.STRING, description: 'Data do serviço no formato YYYY-MM-DD' },
                  startTime: { type: Type.STRING, description: 'Horário inicial, ex: 20:00' },
                  endTime: { type: Type.STRING, description: 'Horário final, ex: 02:00' },
                  officersCount: { type: Type.INTEGER, description: 'Quantidade de efetivo/JOEs' },
                  unitValue: { type: Type.NUMBER, description: 'Valor unitário da JOE em R$' },
                  totalValue: { type: Type.NUMBER, description: 'Valor total em R$' },
                  justification: { type: Type.STRING, description: 'Justificativa da JOE' },
                  location: { type: Type.STRING, description: 'Localidade ou município' },
                  missingFields: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Campos essenciais que não foram identificados',
                  },
                  rawSummary: { type: Type.STRING, description: 'Resumo do que foi extraído' },
                },
                required: [
                  'commandId',
                  'subUnit',
                  'eventName',
                  'orderNumber',
                  'seiProcessNumber',
                  'serviceDate',
                  'officersCount',
                  'unitValue',
                  'totalValue',
                  'missingFields',
                ],
              },
            },
          });
          if (response?.text) {
            break;
          }
        } catch (err: any) {
          lastError = err;
        }
      }

      if (!response || !response.text) {
        throw lastError || new Error('Não foi possível obter resposta dos modelos de IA.');
      }

      const parsedData = JSON.parse(response.text.trim());

      let detectedCmd = parsedData.commandId || '';
      const detectedSubUnit = parsedData.subUnit || '';

      if (detectedSubUnit) {
        for (const [cmdKey, subunits] of Object.entries(COMMAND_SUBUNITS_MAP)) {
          if (
            subunits.some(
              (s) =>
                s.toLowerCase().includes(detectedSubUnit.toLowerCase()) ||
                detectedSubUnit.toLowerCase().includes(s.toLowerCase())
            )
          ) {
            detectedCmd = cmdKey;
            break;
          }
        }
      }

      const unitVal = Number(parsedData.unitValue) > 0 ? Number(parsedData.unitValue) : Number(options.unitValueJoe) || 350;
      const officers = Math.max(0, Number(parsedData.officersCount) || 0);
      const totalVal = Number(parsedData.totalValue) > 0 ? Number(parsedData.totalValue) : officers * unitVal;

      const missing: string[] = [];
      if (!detectedCmd) missing.push('commandId');
      if (!detectedSubUnit) missing.push('subUnit');
      if (!parsedData.eventName || parsedData.eventName === '-') missing.push('eventName');
      if (!parsedData.orderNumber || parsedData.orderNumber === '-') missing.push('orderNumber');
      if (!parsedData.seiProcessNumber || parsedData.seiProcessNumber === '-' || parsedData.seiProcessNumber === '00000') {
        missing.push('seiProcessNumber');
      }
      if (!parsedData.serviceDate || parsedData.serviceDate.length < 8) missing.push('serviceDate');
      if (!officers || officers <= 0) missing.push('officersCount');

      return {
        success: true,
        data: {
          commandId: detectedCmd,
          subUnit: detectedSubUnit,
          eventName: parsedData.eventName || '',
          orderType: parsedData.orderType === 'ORDEM_DE_OPERACAO' ? 'ORDEM_DE_OPERACAO' : 'ORDEM_DE_SERVICO',
          orderNumber: parsedData.orderNumber || '',
          seiProcessNumber: parsedData.seiProcessNumber || '',
          serviceDate: parsedData.serviceDate || '',
          startTime: parsedData.startTime || '20:00',
          endTime: parsedData.endTime || '02:00',
          officersCount: officers,
          unitValue: unitVal,
          totalValue: totalVal,
          justification: parsedData.justification || '',
          location: parsedData.location || '',
          missingFields: missing,
          isComplete: missing.length === 0,
          rawSummary: parsedData.rawSummary || 'Dados extraídos via OCR inteligente Gemini',
        },
      };
    } catch (err: any) {
      console.error('Falha no processamento OCR direto:', err);
      return {
        success: false,
        error: err.message || 'Falha ao processar o print da solicitação de JOE.',
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
