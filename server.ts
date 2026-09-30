import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Support large image payloads (screenshots can be high resolution)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Full CORS support for cross-origin and iframe requests in AI Studio
app.use((req: Request, res: Response, next) => {
  const origin = req.headers.origin || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Initialize GoogleGenAI SDK according to system guidelines
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// PMMA / CPI Command & Subunit Mapping for precision detection
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

// API Endpoint for OCR / Multimodal Extraction of JOE solicitations
app.post(['/api/ocr-joe-print', '/api/ocr-joe-print/', '*/ocr-joe-print'], async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageBase64, mimeType = 'image/png', unitValueJoe = 350, ordinanceNumber = '127/2026' } = req.body;

    if (!imageBase64) {
      res.status(400).json({
        success: false,
        error: 'Nenhuma imagem foi enviada para processamento.',
      });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({
        success: false,
        error: 'A chave da API Gemini não está configurada no servidor (GEMINI_API_KEY).',
      });
      return;
    }

    // Clean base64 string if it contains prefix
    let cleanBase64 = imageBase64;
    let detectedMime = mimeType;
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
11. "unitValue": Valor unitário da JOE em Reais (o padrão da Portaria ${ordinanceNumber} é R$ ${unitValueJoe}).
12. "totalValue": Valor total em Reais. Se não constar, calcule como officersCount * unitValue.
13. "justification": Justificativa da criação da JOE mencionada no documento/print.
14. "location": Município ou local da operação (ex: "Caxias/MA", "Bacabal/MA").
15. "missingFields": Lista contendo os nomes dos campos essenciais que NÃO foram encontrados ou estão ilegíveis/incompletos no print. Campos essenciais: "commandId", "subUnit", "eventName", "orderNumber", "seiProcessNumber", "serviceDate", "officersCount". Se todos foram identificados, retorne lista vazia [].
16. "rawSummary": Breve resumo de uma frase do que foi identificado no print.`;

    const userPrompt = `Analise atentamente a imagem da solicitação de JOE anexada e extraia todos os campos requeridos em formato JSON estrito conforme o schema.`;

    const candidateModels = [
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
      'gemini-flash-latest',
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
        console.warn(`Model ${modelName} failed or unavailable:`, err.message);
        lastError = err;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('Não foi possível obter resposta de nenhum dos modelos Gemini disponíveis.');
    }

    const textOutput = response.text.trim();
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(textOutput);
    } catch (parseErr) {
      console.error('Error parsing Gemini JSON output:', parseErr, textOutput);
      res.status(500).json({
        success: false,
        error: 'Não foi possível interpretar a resposta estruturada da IA.',
        raw: textOutput,
      });
      return;
    }

    // Verify and refine mapping with local map
    let detectedCmd = parsedData.commandId || '';
    const detectedSubUnit = parsedData.subUnit || '';

    // If subunit is found but command is missing or mismatched, find from mapping
    if (detectedSubUnit) {
      for (const [cmdKey, subunits] of Object.entries(COMMAND_SUBUNITS_MAP)) {
        if (subunits.some((s) => s.toLowerCase().includes(detectedSubUnit.toLowerCase()) || detectedSubUnit.toLowerCase().includes(s.toLowerCase()))) {
          detectedCmd = cmdKey;
          break;
        }
      }
    }

    // Normalize unitValue & totalValue
    const unitVal = Number(parsedData.unitValue) > 0 ? Number(parsedData.unitValue) : Number(unitValueJoe) || 350;
    const officers = Math.max(0, Number(parsedData.officersCount) || 0);
    const totalVal = Number(parsedData.totalValue) > 0 ? Number(parsedData.totalValue) : officers * unitVal;

    // Determine missing mandatory fields accurately
    const missing: string[] = [];
    if (!detectedCmd) missing.push('commandId');
    if (!detectedSubUnit) missing.push('subUnit');
    if (!parsedData.eventName || parsedData.eventName === '-') missing.push('eventName');
    if (!parsedData.orderNumber || parsedData.orderNumber === '-') missing.push('orderNumber');
    if (!parsedData.seiProcessNumber || parsedData.seiProcessNumber === '-' || parsedData.seiProcessNumber === '00000') missing.push('seiProcessNumber');
    if (!parsedData.serviceDate || parsedData.serviceDate.length < 8) missing.push('serviceDate');
    if (!officers || officers <= 0) missing.push('officersCount');

    res.json({
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
    });
  } catch (err: any) {
    console.error('OCR Extraction Error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Erro durante a análise do print por inteligência artificial.',
    });
  }
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, port: 3000, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[JOE CPI] Server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
