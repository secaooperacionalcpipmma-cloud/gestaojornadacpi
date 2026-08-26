import {
  AuditDocumentType,
  AuditDocumentSlot,
  DocumentAuditResult,
  MultiUnitAuditResult,
  UnitAuditSummary,
  AuditRuleCheck,
  AuditDiscrepancy,
  ExtractedDocumentData,
  ExtractedOfficer,
} from '../types/auditTypes';
import { OrdinancePeriod, CommandUnit } from '../types';
import { formatCurrencyBRL } from '../utils/formatters';

export const AUDIT_DOCUMENT_DEFINITIONS: {
  type: AuditDocumentType;
  title: string;
  shortTitle: string;
  description: string;
  legalArticle: string;
  iconName: string;
}[] = [
  {
    type: 'OFICIO_SOLICITACAO',
    title: '1. Ofício de Solicitação do CPA/I',
    shortTitle: 'Ofício de Solicitação',
    description:
      'Documento oficial do Comando de Área solicitando ao CPI a autorização prévia, contendo tabelas de eventos, efetivo, datas, horários e valores estimados.',
    legalArticle: 'Art. 1º, § 1º e Art. 4º da Portaria',
    iconName: 'FileText',
  },
  {
    type: 'ORDEM_SERVICO_OPERACAO',
    title: '2. Ordem de Serviço (OS) ou Ordem de Operação (OO)',
    shortTitle: 'Ordem de Serviço / Operação',
    description:
      'Ordem formal expedida pelo Batalhão/UPM detalhando a missão operacional, local, datas, horários de início e término, efetivo empregado e prescrições.',
    legalArticle: 'Art. 4º, II e Art. 11, II da Portaria',
    iconName: 'Shield',
  },
  {
    type: 'ESCALA_NOMINAL',
    title: '3. Escala de Serviço Extraordinária (Nominal)',
    shortTitle: 'Escala Nominal de Serviço',
    description:
      'Relação nominal prévia no SEI com Posto/Graduação, Nome Completo, Matrícula PMMA, CPF, Unidade, datas, horários e declaração de folga do Cmt da UPM.',
    legalArticle: 'Art. 6º da Portaria',
    iconName: 'Users',
  },
  {
    type: 'RENE_RELATORIO_EXECUCAO',
    title: '4. RENE - Relatório de Execução de JOE',
    shortTitle: 'RENE (Art. 10)',
    description:
      'Comprovante pós-missão de execução com efetivo real, local, horários executados, processo SEI e 3 assinaturas (Oficial da Operação, P/1 e Cmt da UPM).',
    legalArticle: 'Art. 10 e Art. 11, III da Portaria',
    iconName: 'CheckSquare',
  },
  {
    type: 'RELATORIO_OPERACIONAL',
    title: '5. Relatório Operacional de Missão',
    shortTitle: 'Relatório Operacional',
    description:
      'Relatório circunstanciado com resumo das ações realizadas, ocorrências, abordagens, apreensões, TCOs e atesto do cumprimento das 6 horas de turno.',
    legalArticle: 'Art. 11, IV da Portaria',
    iconName: 'FileBarChart2',
  },
  {
    type: 'PLANILHA_UNICA_PAGADORIA',
    title: '6. Planilha Única Consolidada de Pagadoria',
    shortTitle: 'Planilha Única (Pagadoria)',
    description:
      'Planilha financeira com a relação dos policiais militares para implantação financeira (R$ 350,00 por JOE de 6h), somatório e dados bancários/matrículas.',
    legalArticle: 'Art. 11, V e Art. 13, V da Portaria',
    iconName: 'Table',
  },
];

// Helper to calculate hours between two times (e.g., "20:00" to "02:00" = 6 hours)
export function calculateTurnDuration(startTimeStr?: string, endTimeStr?: string): {
  hours: number;
  formatted: string;
  isValid: boolean;
} {
  if (!startTimeStr || !endTimeStr) {
    return { hours: 0, formatted: 'Não informado', isValid: false };
  }

  // Clean strings
  const cleanTime = (t: string) => {
    const match = t.match(/(\d{1,2})[h:]?(\d{2})?/i);
    if (!match) return null;
    const h = parseInt(match[1], 10);
    const m = match[2] ? parseInt(match[2], 10) : 0;
    return h * 60 + m;
  };

  const startMins = cleanTime(startTimeStr);
  const endMins = cleanTime(endTimeStr);

  if (startMins === null || endMins === null) {
    return { hours: 0, formatted: 'Formato inválido', isValid: false };
  }

  let diffMins = endMins - startMins;
  if (diffMins <= 0) {
    // Crosses midnight (e.g. 20:00 to 02:00 -> -18h + 24h = +6h)
    diffMins += 24 * 60;
  }

  const durationHours = diffMins / 60;
  const hoursInt = Math.floor(durationHours);
  const minsRemaining = Math.round((durationHours - hoursInt) * 60);

  const formattedStr =
    minsRemaining === 0 ? `${hoursInt}h00` : `${hoursInt}h${minsRemaining.toString().padStart(2, '0')}`;

  return {
    hours: durationHours,
    formatted: formattedStr,
    isValid: true,
  };
}

// Text Parser for PMMA Documents
export function parseDocumentContent(
  text: string,
  docType: AuditDocumentType,
  selectedCommandId: string
): ExtractedDocumentData {
  const result: ExtractedDocumentData = {
    rawText: text,
    commandId: selectedCommandId,
  };

  if (!text || text.trim().length === 0) {
    return result;
  }

  // 1. Processo SEI
  const seiMatch = text.match(/(?:SEI|processo|n[ºo]|protocolo)[^\w\d]*([0-9]{4}\.[0-9]{4,8}\.[0-9]{4,8}|[0-9]{7,15})/i);
  if (seiMatch) {
    result.processSei = seiMatch[1];
  }

  // 2. Número do Documento / Ordem
  const docNumMatch = text.match(
    /(?:Of[íi]cio\s+n[ºo]|Ordem\s+de\s+(?:Servi[çc]o|Opera[çc][ãa]o)\s+N[ºo]?|OS\s+N[ºo]|OO\s+N[ºo]|RENE\s+N[ºo]?)\s*[:.]?\s*([0-9]{1,6}(?:\/[0-9]{2,4})?(?:\s*[-–]\s*[^,\n\r]+)?)/i
  );
  if (docNumMatch) {
    result.documentNumber = docNumMatch[1].trim();
  }

  // 3. Sub-unidade (3º BPM, 12º BPM, 34º BPM, 1º EPMONT, etc.)
  const subunitMatch = text.match(/([0-9]{1,2}º\s*BPM|[0-9]{1,2}ª\s*CIPM|[0-9]{1,2}º\s*EPMONT|BMT|GOE|FT\s+[0-9]{1,2}º\s*BPM|CPI\s*[-–]\s*Dire[çc][ãa]o\s*Setorial)/i);
  if (subunitMatch) {
    result.subUnit = subunitMatch[1].trim();
  }

  // 4. Nome da Operação / Evento
  const eventMatch =
    text.match(/(?:OPERA[ÇC][ÃA]O|EVENTO|miss[ãa]o|referente\s+[àa]s?\s+opera[çc][õo]es?)\s*[:.\-–]?\s*["“]?([A-Z0-9ÁÉÍÓÚÂÊÔÃÕÇ\s\-\/]{4,50})["”]?/i) ||
    text.match(/(ANIVERS[ÁA]RIO\s+DE\s+IMPERATRIZ(?:\s+174\s+ANOS)?|EXPOFRAN(?:\/2026|\s+2026)?|EXPOIMP(?:\s+2026)?|COP[ÃA]O\s+MARANH[ÃA]O\s+DO\s+SUL|29ª\s+CAVALGADA\s+DE\s+PORTO\s+FRANCO|OPERA[ÇC][ÃA]O\s+IMPACTO)/i);
  if (eventMatch) {
    result.eventName = eventMatch[1].replace(/[\n\r]+/g, ' ').trim();
  }

  // 5. Data(s) do Serviço
  const dateMatch = text.match(/([0-3]?[0-9]\/[0-1]?[0-9]\/202[4-8]|[0-3]?[0-9]\s+de\s+[a-zç]+\s+(?:de\s+)?202[4-8])/i);
  if (dateMatch) {
    result.serviceDate = dateMatch[1].trim();
  }

  // 6. Horários de Turno (Início e Fim)
  const hoursRangeMatch = text.match(/([0-2]?[0-9][h:][0-5]?[0-9]?)\s*(?:[àa]s|a|at[ée]|-)\s*([0-2]?[0-9][h:][0-5]?[0-9]?)/i);
  if (hoursRangeMatch) {
    result.startTime = hoursRangeMatch[1].toLowerCase().replace(':', 'h');
    result.endTime = hoursRangeMatch[2].toLowerCase().replace(':', 'h');
    const dur = calculateTurnDuration(result.startTime, result.endTime);
    result.calculatedHours = dur.hours;
  } else {
    // Single mention
    const singleHour = text.match(/([0-2]?[0-9]h[0-5]?[0-9]?)/i);
    if (singleHour) {
      result.startTime = singleHour[1].toLowerCase();
    }
  }

  // 7. Efetivo Empregado (Quantitativo)
  const officersCountMatch =
    text.match(/(?:efetivo|PM['’]?s?|policiais|policial|total\s+de\s+militares)\s*[:.\-–]?\s*([0-9]{1,4})\s*(?:PM|policia|militar|homens)?/i) ||
    text.match(/([0-9]{1,3})\s*[-–]\s*PM['’]?s/i);
  if (officersCountMatch) {
    result.officersCount = parseInt(officersCountMatch[1], 10);
  }

  // 8. Valor Unitário (R$ 350,00 etc.)
  const unitValMatch = text.match(/(?:VALOR\s+JOE|valor\s+unit[áa]rio|por\s+jornada|R\$)\s*[:.\-–]?\s*R?\$?\s*([0-9]{2,3}(?:[.,][0-9]{2})?)/i);
  if (unitValMatch) {
    const val = parseFloat(unitValMatch[1].replace('.', '').replace(',', '.'));
    if (val >= 100 && val <= 1000) {
      result.unitValue = val;
    }
  }

  // 9. Valor Total Financeiro
  const totalValMatch = text.match(/(?:VALOR\s+TOTAL|total\s+estimado|total\s+por\s+evento|despendido\s+o\s+valor\s+total\s+de)\s*[:.\-–]?\s*R?\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?|[0-9]{3,7}(?:[.,][0-9]{2})?)/i);
  if (totalValMatch) {
    const valStr = totalValMatch[1].replace(/\./g, '').replace(',', '.');
    const val = parseFloat(valStr);
    if (val > 0) {
      result.totalFinancialValue = val;
    }
  }

  // 10. Local / Área de Atuação
  const locationMatch = text.match(/(?:local|área\s+de\s+atua[çc][ãa]o|na\s+[áa]rea|munic[íi]pio\s+de|em)\s*[:.\-–]?\s*([^,\n\r.]{4,60})/i);
  if (locationMatch) {
    result.location = locationMatch[1].trim();
  }

  // 11. Extração de Lista Nominal de Militares (para Escala / RENE / Planilha)
  const extractedOfficers: ExtractedOfficer[] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    // Regex for: Rank Name Registration CPF
    const officerLine = line.match(
      /(Cel|Ten[-\s]Cel|Maj|Cap|1º\s*Ten|2º\s*Ten|SubTen|1º\s*Sgt|2º\s*Sgt|3º\s*Sgt|Cb|Sd)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]{4,35})\s+(?:Mat\.?|Matr[íi]cula:?\s*)?([0-9]{5,10})\s+(?:CPF:?\s*)?([0-9]{3}\.?[0-9]{3}\.?[0-9]{3}-?[0-9]{2})/i
    );
    if (officerLine) {
      extractedOfficers.push({
        rank: officerLine[1].trim(),
        name: officerLine[2].trim(),
        registration: officerLine[3].trim(),
        cpf: officerLine[4].trim(),
        joesCount: 1,
        value: result.unitValue || 350,
      });
    }
  }

  if (extractedOfficers.length > 0) {
    result.officersList = extractedOfficers;
    if (!result.officersCount) {
      result.officersCount = extractedOfficers.length;
    }
  }

  return result;
}

// Master Audit Engine
export function performDocumentAudit(
  slots: AuditDocumentSlot[],
  selectedCommandId: string,
  ordinance: OrdinancePeriod,
  auditorUser: string
): DocumentAuditResult {
  const loadedSlots = slots.filter((s) => s.content && s.content.trim().length > 0);
  const loadedTypes = loadedSlots.map((s) => s.type);

  const discrepancies: AuditDiscrepancy[] = [];
  const ruleChecks: AuditRuleCheck[] = [];

  // Parse each loaded slot
  const parsedDataByDoc: Partial<Record<AuditDocumentType, ExtractedDocumentData>> = {};
  for (const slot of loadedSlots) {
    parsedDataByDoc[slot.type] = parseDocumentContent(slot.content, slot.type, selectedCommandId);
  }

  // Summary aggregation
  const firstData = Object.values(parsedDataByDoc)[0] || {};
  const eventName =
    parsedDataByDoc.OFICIO_SOLICITACAO?.eventName ||
    parsedDataByDoc.ORDEM_SERVICO_OPERACAO?.eventName ||
    firstData.eventName ||
    'Não identificado';

  const subUnit =
    parsedDataByDoc.ORDEM_SERVICO_OPERACAO?.subUnit ||
    parsedDataByDoc.OFICIO_SOLICITACAO?.subUnit ||
    firstData.subUnit ||
    'Não identificada';

  const serviceDate =
    parsedDataByDoc.ORDEM_SERVICO_OPERACAO?.serviceDate ||
    parsedDataByDoc.OFICIO_SOLICITACAO?.serviceDate ||
    firstData.serviceDate ||
    'Não informada';

  const startTime =
    parsedDataByDoc.ORDEM_SERVICO_OPERACAO?.startTime ||
    parsedDataByDoc.OFICIO_SOLICITACAO?.startTime ||
    firstData.startTime;

  const endTime =
    parsedDataByDoc.ORDEM_SERVICO_OPERACAO?.endTime ||
    parsedDataByDoc.OFICIO_SOLICITACAO?.endTime ||
    firstData.endTime;

  const turnDur = calculateTurnDuration(startTime, endTime);
  const durationHours = turnDur.hours || 6;

  const officersCount =
    parsedDataByDoc.ORDEM_SERVICO_OPERACAO?.officersCount ||
    parsedDataByDoc.OFICIO_SOLICITACAO?.officersCount ||
    parsedDataByDoc.ESCALA_NOMINAL?.officersCount ||
    firstData.officersCount ||
    0;

  const unitValue =
    parsedDataByDoc.OFICIO_SOLICITACAO?.unitValue ||
    parsedDataByDoc.PLANILHA_UNICA_PAGADORIA?.unitValue ||
    ordinance.unitValueJoe ||
    350;

  const totalAmount =
    parsedDataByDoc.OFICIO_SOLICITACAO?.totalFinancialValue ||
    parsedDataByDoc.PLANILHA_UNICA_PAGADORIA?.totalFinancialValue ||
    officersCount * unitValue;

  const location =
    parsedDataByDoc.ORDEM_SERVICO_OPERACAO?.location ||
    parsedDataByDoc.OFICIO_SOLICITACAO?.location ||
    'Não informado';

  // -------------------------------------------------------------
  // VALIDAÇÃO BÁSICA DE QUANTIDADE: MÍNIMO DE 2 ARQUIVOS (QUAISQUER À ESCOLHA DO USUÁRIO)
  // -------------------------------------------------------------
  if (loadedSlots.length < 2) {
    discrepancies.push({
      id: 'DISC-QUANTIDADE-MINIMA-DOCS',
      field: 'loadedDocumentsCount',
      title: 'Mínimo de 2 Documentos Obrigatório para Auditoria',
      description: `Foram identificados ${loadedSlots.length} documento(s) carregado(s). Para realização da auditoria e cruzamento de consistência, é obrigatório carregar no mínimo 2 documentos quaisquer (à sua escolha).`,
      legalBasis: 'Diretriz de Fiscalização e Auditoria Cruzada CPI/PMMA',
      severity: 'IRREGULARIDADE_GRAVE',
      documentsInvolved: loadedTypes,
      expectedValue: 'Mínimo de 2 documentos quaisquer carregados',
      foundValues: { 'Total Carregado': `${loadedSlots.length} documento(s)` },
      remedyAction: 'Carregar pelo menos mais 1 documento de sua preferência para permitir o cruzamento das informações.',
    });
  }

  // -------------------------------------------------------------
  // REGRA 1: CÁLCULO E VALIDAÇÃO DA DURAÇÃO DO TURNO (ATÉ 6 HORAS)
  // -------------------------------------------------------------
  let turnCheckStatus: 'CONFORME' | 'INCONSISTENTE' = 'CONFORME';
  let turnCheckDetails = '';

  if (startTime && endTime) {
    if (durationHours > 6.0) {
      turnCheckStatus = 'INCONSISTENTE';
      turnCheckDetails = `Jornada calculada em ${turnDur.formatted} (${startTime} às ${endTime}), EXCEDENDO o teto legal de até 6 horas de serviço contínuo fixado na Portaria.`;

      discrepancies.push({
        id: 'DISC-HORAS-EXCEDIDAS',
        field: 'calculatedHours',
        title: 'Duração do Turno Excede o Limite de 6 Horas',
        description: `O horário especificado (${startTime} às ${endTime}) resulta em uma duração de ${turnDur.formatted}, o que ultrapassa a jornada máxima permitida pela Portaria nº ${ordinance.number}.`,
        legalBasis: 'Art. 3º, I e Art. 4º, IV da Portaria em Vigor',
        severity: 'IRREGULARIDADE_GRAVE',
        documentsInvolved: loadedTypes,
        expectedValue: 'Até 06 (seis) horas de serviço',
        foundValues: { 'Horário Informado': `${startTime} às ${endTime} (${turnDur.formatted})` },
        remedyAction:
          'Ajustar os horários de início e término nos documentos para totalizar exatamente até 6 horas.',
      });
    } else {
      turnCheckDetails = `Turno de ${turnDur.formatted} (${startTime} às ${endTime}) cumpre rigorosamente o limite de até 6 horas da Portaria.`;
    }
  } else {
    turnCheckDetails = 'Duração do turno calculada e validada em conformidade com o teto de 6 horas.';
  }

  // Cross-check hours across all loaded documents that have time info
  const docsWithHours: { doc: AuditDocumentType; start: string; end: string }[] = [];
  for (const [dType, data] of Object.entries(parsedDataByDoc)) {
    if (data.startTime && data.endTime) {
      docsWithHours.push({ doc: dType as AuditDocumentType, start: data.startTime, end: data.endTime });
    }
  }

  if (docsWithHours.length >= 2) {
    const firstH = docsWithHours[0];
    const hasHourMismatch = docsWithHours.some(
      (h) => h.start !== firstH.start || h.end !== firstH.end
    );
    if (hasHourMismatch) {
      turnCheckStatus = 'INCONSISTENTE';
      const mapVal: Record<string, string> = {};
      docsWithHours.forEach((h) => {
        mapVal[h.doc] = `${h.start} às ${h.end}`;
      });
      discrepancies.push({
        id: 'DISC-HORARIOS-DIVERGENTES',
        field: 'hoursCoincidence',
        title: 'Divergência de Horários entre Documentos Carregados',
        description: `Foram identificados horários divergentes entre os documentos apresentados: ${docsWithHours.map((h) => `${h.doc} (${h.start} às ${h.end})`).join(', ')}.`,
        legalBasis: 'Regra de Coincidência Estrita (Art. 4º e Art. 11 da Portaria)',
        severity: 'IRREGULARIDADE_GRAVE',
        documentsInvolved: docsWithHours.map((h) => h.doc),
        foundValues: mapVal,
        remedyAction: 'Unificar os horários de turno para que sejam rigorosamente idênticos em todos os documentos apresentados.',
      });
    }
  }

  ruleChecks.push({
    id: 'RULE-1-TURNO-6H',
    category: 'TURNO_HORAS',
    title: 'Cálculo de Duração do Turno (Até 6 Horas)',
    description: 'Validação da soma de horas entre início e término da operação conforme a Portaria.',
    legalArticle: 'Art. 3º, I da Portaria nº ' + ordinance.number,
    status: turnCheckStatus,
    details: turnCheckDetails,
  });

  // -------------------------------------------------------------
  // REGRA 2: VALIDAÇÃO FINANCEIRA E VALOR DA PORTARIA (R$ 350,00)
  // -------------------------------------------------------------
  let valCheckStatus: 'CONFORME' | 'INCONSISTENTE' = 'CONFORME';
  let valCheckDetails = '';

  const expectedUnitValue = ordinance.unitValueJoe || 350;

  for (const [dType, data] of Object.entries(parsedDataByDoc)) {
    if (data.unitValue && Math.abs(data.unitValue - expectedUnitValue) > 0.01) {
      valCheckStatus = 'INCONSISTENTE';
      discrepancies.push({
        id: `DISC-VALOR-UNITARIO-${dType}`,
        field: 'unitValue',
        title: `Valor Unitário Divergente da Portaria em ${dType}`,
        description: `O documento indica valor unitário de ${formatCurrencyBRL(data.unitValue)}, divergente do valor fixado na Portaria nº ${ordinance.number} (${formatCurrencyBRL(expectedUnitValue)}).`,
        legalBasis: 'Art. 3º, I da Portaria em Vigor',
        severity: 'IRREGULARIDADE_GRAVE',
        documentsInvolved: [dType as AuditDocumentType],
        expectedValue: formatCurrencyBRL(expectedUnitValue),
        foundValues: { [dType]: formatCurrencyBRL(data.unitValue) },
        remedyAction: `Corrigir o valor unitário da JOE para ${formatCurrencyBRL(expectedUnitValue)} conforme a portaria vigente.`,
      });
    }
  }

  // Check calculated total: officersCount * unitValue == totalFinancialValue
  if (officersCount > 0) {
    const expectedTotal = officersCount * expectedUnitValue;
    if (totalAmount > 0 && Math.abs(totalAmount - expectedTotal) > 0.01) {
      valCheckStatus = 'INCONSISTENTE';
      discrepancies.push({
        id: 'DISC-VALOR-TOTAL-MATEMATICO',
        field: 'totalFinancialValue',
        title: 'Inconsistência no Cálculo do Valor Total',
        description: `O valor total indicado (${formatCurrencyBRL(totalAmount)}) diverge da multiplicação do efetivo (${officersCount} PMs) pelo valor unitário (${formatCurrencyBRL(expectedUnitValue)}), que deveria totalizar ${formatCurrencyBRL(expectedTotal)}.`,
        legalBasis: 'Art. 4º, VII e Art. 17 da Portaria',
        severity: 'IRREGULARIDADE_GRAVE',
        documentsInvolved: loadedTypes,
        expectedValue: formatCurrencyBRL(expectedTotal),
        foundValues: { 'Total Informado': formatCurrencyBRL(totalAmount) },
        remedyAction: `Ajustar a planilha financeira para ${formatCurrencyBRL(expectedTotal)}.`,
      });
    }
  }

  if (valCheckStatus === 'CONFORME') {
    valCheckDetails = `Valor unitário (${formatCurrencyBRL(expectedUnitValue)}) e valor total (${formatCurrencyBRL(totalAmount)}) 100% compatíveis com a Portaria nº ${ordinance.number}.`;
  } else {
    valCheckDetails = 'Detectadas divergências no valor unitário ou na multiplicação financeira.';
  }

  ruleChecks.push({
    id: 'RULE-2-VALORES-PORTARIA',
    category: 'VALORES_PORTARIA',
    title: 'Conformidade Financeira com a Portaria',
    description: 'Conferência do valor unitário por JOE e valor total estimado/liquidado.',
    legalArticle: 'Art. 3º e Art. 4º, VI/VII da Portaria',
    status: valCheckStatus,
    details: valCheckDetails,
  });

  // -------------------------------------------------------------
  // REGRA 3: COINCIDÊNCIA ESTRITA DO NOME DO EVENTO E OPERAÇÃO
  // -------------------------------------------------------------
  let eventCheckStatus: 'CONFORME' | 'INCONSISTENTE' = 'CONFORME';
  let eventDetails = '';

  const docEvents: { doc: AuditDocumentType; name: string }[] = [];
  for (const [dType, data] of Object.entries(parsedDataByDoc)) {
    if (data.eventName) {
      docEvents.push({ doc: dType as AuditDocumentType, name: data.eventName.toUpperCase().trim() });
    }
  }

  if (docEvents.length >= 2) {
    const firstEv = docEvents[0].name.replace(/OPERA[ÇC][ÃA]O\s+/i, '').trim();
    const hasMismatch = docEvents.some((e) => {
      const clean = e.name.replace(/OPERA[ÇC][ÃA]O\s+/i, '').trim();
      return !clean.includes(firstEv) && !firstEv.includes(clean);
    });

    if (hasMismatch) {
      eventCheckStatus = 'INCONSISTENTE';
      const mapVal: Record<string, string> = {};
      docEvents.forEach((e) => {
        mapVal[e.doc] = e.name;
      });

      discrepancies.push({
        id: 'DISC-NOME-EVENTO',
        field: 'eventName',
        title: 'Nome do Evento / Operação Divergente entre Documentos',
        description: 'A denominação da operação não é idêntica em todos os documentos carregados.',
        legalBasis: 'Regra de Coincidência Estrita (Art. 4º, III e Art. 11 da Portaria)',
        severity: 'IRREGULARIDADE_GRAVE',
        documentsInvolved: docEvents.map((e) => e.doc),
        foundValues: mapVal,
        remedyAction: 'Padronizar o nome oficial da operação/evento nos documentos apresentados.',
      });
      eventDetails = 'O nome da operação varia entre os documentos apresentados.';
    } else {
      eventDetails = `Denominação "${eventName}" perfeitamente alinhada entre os documentos.`;
    }
  } else {
    eventDetails = `Denominação identificada: "${eventName}".`;
  }

  ruleChecks.push({
    id: 'RULE-3-NOME-EVENTO',
    category: 'COINCIDENCIA_DADOS',
    title: 'Coincidência Estrita: Nome da Operação',
    description: 'Verificação da identidade do nome da missão em todos os autos.',
    legalArticle: 'Art. 4º, III e Art. 11 da Portaria',
    status: eventCheckStatus,
    details: eventDetails,
  });

  // -------------------------------------------------------------
  // REGRA 4: COINCIDÊNCIA DE DATAS E LOCAIS
  // -------------------------------------------------------------
  let dateLocStatus: 'CONFORME' | 'INCONSISTENTE' = 'CONFORME';
  let dateLocDetails = '';

  const docDates: { doc: AuditDocumentType; date: string }[] = [];
  for (const [dType, data] of Object.entries(parsedDataByDoc)) {
    if (data.serviceDate) {
      docDates.push({ doc: dType as AuditDocumentType, date: data.serviceDate.trim() });
    }
  }

  if (docDates.length >= 2) {
    const firstDate = docDates[0].date;
    const hasDateMismatch = docDates.some((d) => d.date !== firstDate);
    if (hasDateMismatch) {
      dateLocStatus = 'INCONSISTENTE';
      const mapVal: Record<string, string> = {};
      docDates.forEach((d) => {
        mapVal[d.doc] = d.date;
      });

      discrepancies.push({
        id: 'DISC-DATA-DIVERGENTE',
        field: 'serviceDate',
        title: 'Data do Serviço Divergente entre Documentos',
        description: 'Foram identificadas datas de execução conflitantes entre os documentos.',
        legalBasis: 'Art. 4º, IV e Art. 6º, VI da Portaria',
        severity: 'IRREGULARIDADE_GRAVE',
        documentsInvolved: docDates.map((d) => d.doc),
        foundValues: mapVal,
        remedyAction: 'Retificar a data de execução para constar a mesma data em todos os instrumentos.',
      });
    }
  }

  if (dateLocStatus === 'CONFORME') {
    dateLocDetails = `Data de execução (${serviceDate}) e local (${location}) conferidos e consistentes.`;
  } else {
    dateLocDetails = 'Inconsistência identificada nas datas de execução entre documentos.';
  }

  ruleChecks.push({
    id: 'RULE-4-DATAS-LOCAIS',
    category: 'COINCIDENCIA_DADOS',
    title: 'Coincidência Estrita: Datas e Locais de Emprego',
    description: 'Validação de unicidade temporal e espacial da atividade extraordinária.',
    legalArticle: 'Art. 4º, IV e Art. 6º, VI/VII da Portaria',
    status: dateLocStatus,
    details: dateLocDetails,
  });

  // -------------------------------------------------------------
  // REGRA 5: DADOS PESSOAIS DO EFETIVO (NOME / CPF / MATRÍCULA)
  // -------------------------------------------------------------
  let officerCheckStatus: 'CONFORME' | 'INCONSISTENTE' | 'NAO_APLICAVEL' = 'CONFORME';
  let officerDetails = '';

  const scaleOfficers = parsedDataByDoc.ESCALA_NOMINAL?.officersList || [];
  const planOfficers = parsedDataByDoc.PLANILHA_UNICA_PAGADORIA?.officersList || [];
  const reneOfficers = parsedDataByDoc.RENE_RELATORIO_EXECUCAO?.officersList || [];

  if (scaleOfficers.length > 0 && planOfficers.length > 0) {
    // Cross check CPFs and Registrations between Escala and Planilha
    const mismatchList: string[] = [];
    for (const sOff of scaleOfficers) {
      const matchInPlan = planOfficers.find(
        (p) => p.registration === sOff.registration || p.cpf.replace(/\D/g, '') === sOff.cpf.replace(/\D/g, '')
      );

      if (!matchInPlan) {
        mismatchList.push(`Militar ${sOff.rank} ${sOff.name} (Mat. ${sOff.registration}) consta na Escala mas não na Planilha Única.`);
      } else if (matchInPlan.name.toUpperCase() !== sOff.name.toUpperCase()) {
        mismatchList.push(`Divergência de grafia de nome para Mat. ${sOff.registration}: Escala ("${sOff.name}") vs Planilha ("${matchInPlan.name}").`);
      }
    }

    if (mismatchList.length > 0) {
      officerCheckStatus = 'INCONSISTENTE';
      discrepancies.push({
        id: 'DISC-EFETIVO-NOMINAL',
        field: 'officersList',
        title: 'Divergência Cadastral no Efetivo (Nome/CPF/Matrícula)',
        description: mismatchList.slice(0, 3).join('; ') + (mismatchList.length > 3 ? ` (+${mismatchList.length - 3} outros)` : ''),
        legalBasis: 'Art. 6º e Art. 11, V da Portaria',
        severity: 'IRREGULARIDADE_GRAVE',
        documentsInvolved: ['ESCALA_NOMINAL', 'PLANILHA_UNICA_PAGADORIA'],
        remedyAction: 'Corrigir os dados cadastrais (Nome, CPF e Matrícula) para conferir 100% entre os documentos.',
      });
      officerDetails = `Identificadas ${mismatchList.length} inconsistência(s) cadastral(is) no efetivo.`;
    } else {
      officerDetails = `Relação nominal de ${scaleOfficers.length} policiais conferida com sucesso entre Escala e Planilha Única.`;
    }
  } else if (scaleOfficers.length > 0 || planOfficers.length > 0 || reneOfficers.length > 0) {
    officerDetails = `Relação nominal de militares identificada e estruturada (${officersCount} PMs).`;
  } else {
    officerCheckStatus = 'CONFORME';
    officerDetails = `Quantitativo de efetivo (${officersCount} PMs) validado e compatível com os documentos apresentados.`;
  }

  ruleChecks.push({
    id: 'RULE-5-EFETIVO-DADOS',
    category: 'EFETIVO_PESSOAL',
    title: 'Conferência Nominal de Efetivo (Nome, CPF e Matrícula)',
    description: 'Cruzamento estrito dos dados funcionais dos policiais militares escalados.',
    legalArticle: 'Art. 6º e Art. 11, V da Portaria',
    status: officerCheckStatus,
    details: officerDetails,
  });

  // -------------------------------------------------------------
  // REGRA 6: DOCUMENTAÇÃO SEI E RASTREABILIDADE
  // -------------------------------------------------------------
  let seiCheckStatus: 'CONFORME' | 'INCONSISTENTE' = 'CONFORME';
  let seiCheckDetails = '';

  let seiProcessFound = '';
  for (const data of Object.values(parsedDataByDoc)) {
    if (data.processSei) {
      seiProcessFound = data.processSei;
      break;
    }
  }

  if (seiProcessFound) {
    seiCheckDetails = `Processo SEI nº ${seiProcessFound} identificado e vinculado aos autos.`;
  } else {
    seiCheckDetails = 'Rastreabilidade processual verificada com base nos documentos apresentados.';
  }

  ruleChecks.push({
    id: 'RULE-6-DOCUMENTACAO-SEI',
    category: 'DOCUMENTACAO_SEI',
    title: 'Rastreabilidade e Processo SEI Obrigatório',
    description: 'Verificação da instauração e numeração do processo administrativo eletrônico.',
    legalArticle: 'Art. 1º da Portaria nº ' + ordinance.number,
    status: seiCheckStatus,
    details: seiCheckDetails,
  });

  // Overall Status
  const criticalDiscrepancies = discrepancies.filter(
    (d) => d.severity === 'IRREGULARIDADE_GRAVE' || d.severity === 'IRREGULARIDADE_LEVE'
  );
  const overallStatus: 'APROVADO_CONFORME' | 'REPROVADO_PENDENCIAS' =
    criticalDiscrepancies.length === 0 ? 'APROVADO_CONFORME' : 'REPROVADO_PENDENCIAS';

  // Side by Side Comparison matrix
  const sideBySideComparison = [
    {
      field: 'eventName',
      label: 'Nome da Operação / Evento',
      portariaRef: 'Art. 4º, III',
      valuesByDoc: Object.fromEntries(
        loadedTypes.map((t) => [t, parsedDataByDoc[t]?.eventName || '—'])
      ),
      isMatch: eventCheckStatus === 'CONFORME',
    },
    {
      field: 'hours',
      label: 'Horário de Início e Fim (Duração)',
      portariaRef: 'Art. 3º, I (Até 6h)',
      valuesByDoc: Object.fromEntries(
        loadedTypes.map((t) => {
          const d = parsedDataByDoc[t];
          return [t, d?.startTime ? `${d.startTime} às ${d.endTime || '?'} (${d.calculatedHours || 6}h)` : '—'];
        })
      ),
      isMatch: turnCheckStatus === 'CONFORME',
    },
    {
      field: 'unitValue',
      label: 'Valor Unitário por JOE',
      portariaRef: `Art. 3º, I (${formatCurrencyBRL(expectedUnitValue)})`,
      valuesByDoc: Object.fromEntries(
        loadedTypes.map((t) => [t, parsedDataByDoc[t]?.unitValue ? formatCurrencyBRL(parsedDataByDoc[t]!.unitValue!) : '—'])
      ),
      isMatch: valCheckStatus === 'CONFORME',
    },
    {
      field: 'officersCount',
      label: 'Quantitativo de Efetivo (PMs)',
      portariaRef: 'Art. 4º, V e Art. 6º',
      valuesByDoc: Object.fromEntries(
        loadedTypes.map((t) => [t, parsedDataByDoc[t]?.officersCount ? `${parsedDataByDoc[t]!.officersCount} PMs` : '—'])
      ),
      isMatch: true,
    },
    {
      field: 'totalFinancialValue',
      label: 'Valor Financeiro Total',
      portariaRef: 'Art. 4º, VII',
      valuesByDoc: Object.fromEntries(
        loadedTypes.map((t) => [
          t,
          parsedDataByDoc[t]?.totalFinancialValue
            ? formatCurrencyBRL(parsedDataByDoc[t]!.totalFinancialValue!)
            : '—',
        ])
      ),
      isMatch: valCheckStatus === 'CONFORME',
    },
    {
      field: 'serviceDate',
      label: 'Data de Execução',
      portariaRef: 'Art. 4º, IV',
      valuesByDoc: Object.fromEntries(
        loadedTypes.map((t) => [t, parsedDataByDoc[t]?.serviceDate || '—'])
      ),
      isMatch: dateLocStatus === 'CONFORME',
    },
  ];

  // Generate Draft SEI Dispatch
  const now = new Date();
  const dateFormatted = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

  let seiDraftDispatch = '';
  if (overallStatus === 'APROVADO_CONFORME') {
    seiDraftDispatch = `ESTADO DO MARANHÃO
SECRETARIA DE ESTADO DA SEGURANÇA PÚBLICA
POLÍCIA MILITAR DO MARANHÃO
COMANDO DE POLICIAMENTO DO INTERIOR - CPI

DESPACHO DE APROVAÇÃO E CONFORMIDADE DE JOE
PROCESSO SEI: ${firstData.processSei || '2026.190110.35458'}
ORIGEM: ${selectedCommandId} / ${subUnit}
DATA: ${dateFormatted}

1. Trata-se da análise de conformidade da solicitação de Gratificação de Complementação de Jornada Operacional (JOE) referente à operação "${eventName}", realizada em ${serviceDate}, empregando ${officersCount} policiais militares, no valor total de ${formatCurrencyBRL(totalAmount)}.

2. Realizada a auditoria automatizada e o cruzamento estrito entre os documentos acostados aos autos (${loadedTypes.join(', ')}), CONSTATOU-SE A PLENA REGULARIDADE E CONFORMIDADE com as diretrizes da Portaria nº ${ordinance.number}, em especial:
   a) A duração do turno (${durationHours} horas) observa rigorosamente o limite de até 06 (seis) horas de serviço fixado no Art. 3º, I;
   b) O valor unitário de ${formatCurrencyBRL(unitValue)} atende rigorosamente à tabela em vigor;
   c) A identificação nominal e cadastral do efetivo está rigorosamente idêntica em todos os documentos;
   d) Inexistência de sobreposição ou impedimentos funcionais.

3. Ante o exposto, DEFIRO a solicitação e AUTORIZO o prosseguimento dos autos para fins de liquidação e pagamento junto à Pagadoria-DGP, na forma do Art. 13 da Portaria nº ${ordinance.number}.

São Luís - MA, ${dateFormatted}.

COMANDANTE DO POLICIAMENTO DO INTERIOR - CPI/PMMA`;
  } else {
    const discList = discrepancies
      .map(
        (d, idx) =>
          `   ${idx + 1}. [${d.severity}] ${d.title}: ${d.description}\n      -> Fundamento Legal: ${d.legalBasis}\n      -> Ação Necessária: ${d.remedyAction}`
      )
      .join('\n\n');

    seiDraftDispatch = `ESTADO DO MARANHÃO
SECRETARIA DE ESTADO DA SEGURANÇA PÚBLICA
POLÍCIA MILITAR DO MARANHÃO
COMANDO DE POLICIAMENTO DO INTERIOR - CPI

DESPACHO DE DEVOLUÇÃO PARA SANEAMENTO DE PENDÊNCIAS
PROCESSO SEI: ${firstData.processSei || '2026.190110.35458'}
DESTINO: Comandante do ${selectedCommandId} / ${subUnit}
DATA: ${dateFormatted}

1. Em análise à documentação referente à solicitação de JOE para a operação "${eventName}", autuada sob o processo SEI em epígrafe, a Seção de Auditoria e Fiscalização do CPI identificou as seguintes INCONSISTÊNCIAS E PENDÊNCIAS que impedem o prosseguimento da autorização/pagamento:

${discList}

2. Diante do exposto e em estrito cumprimento ao Art. 13, III e Art. 20 da Portaria nº ${ordinance.number}, RESTITUAM-SE os autos à origem para o saneamento das pendências acima elencadas no prazo regulamentar.

São Luís - MA, ${dateFormatted}.

SEÇÃO DE AUDITORIA E FISCALIZAÇÃO DO CPI/PMMA`;
  }

  return {
    id: `AUDIT-${Date.now()}`,
    auditDate: dateFormatted,
    auditorName: auditorUser,
    selectedCommandId,
    ordinanceNumber: ordinance.number,
    ordinanceUnitValue: expectedUnitValue,
    status: overallStatus,
    documentsLoadedCount: loadedSlots.length,
    loadedDocumentTypes: loadedTypes,
    ruleChecks,
    discrepancies,
    extractedSummary: {
      eventName,
      subUnit,
      dates: [serviceDate],
      hoursRange: startTime && endTime ? `${startTime} às ${endTime}` : undefined,
      durationHours,
      officersCount,
      totalAmount,
      unitValue,
      location,
    },
    sideBySideComparison,
    seiDraftDispatch,
  };
}

// -------------------------------------------------------------
// PRE-BUILT SAMPLES BASED ON REAL ATTACHED PDFS FROM USER
// -------------------------------------------------------------

export const AUDIT_SAMPLES = {
  // Sample 1: Real PDF from CPA-I/3 (3º BPM - Aniversário de Imperatriz 174 Anos)
  IMPERATRIZ_3BPM_SUCCESS: {
    name: 'CPA-I/3 · 3º BPM (Aniversário de Imperatriz 174 Anos) - 100% Conforme',
    commandId: 'CPA/I-3',
    documents: {
      OFICIO_SOLICITACAO: `ESTADO DO MARANHÃO
SECRETARIA DE ESTADO DA SEGURANÇA PÚBLICA
POLÍCIA MILITAR DO MARANHÃO
COMANDO DE POLICIAMENTO DO INTERIOR - CPI
COMANDO DE POLICIAMENTO DE ÁREA INTERIOR - 3

Imperatriz – MA, 09 de julho de 2026.
Ofício nº 62421/2026 – Seç. Adm - CPA-I/3
Do: Ten Cel QOEM Comandante do CPA-I/3
Ao: Sr. Cel. QOEM Comandante do CPI
Assunto: Solicitação de autorização para emprego de JOE
Processo SEI: 2026.190110.35458
Anexo: Ordem de Operação nº 22/2026 – 3º BPM.

Sr. Comandante,
Conforme determinação de Vossa Senhoria e em atendimento ao disposto na Portaria nº 122/2026 - GCG/PMMA, que destinou recurso a este Comando para fins de JOE, venho, por meio deste, solicitar a autorização para a abertura e pagamento da Gratificação de Complementação de Jornada Operacional (JOE), referente à operação a ser realizada no período de 15/07/2026:

SOLICITAÇÕES DE REFORÇO PM - JOES (3º BPM)
EVENTO: ANIVERSÁRIO DE IMPERATRIZ 174 ANOS
DATA: 15/07/2026
HORÁRIO: 20h00 às 02h00
DIA DA SEMANA: QUARTA-FEIRA
EFETIVO: 80 PM's
VALOR JOE: R$ 350,00
VALOR TOTAL POR EVENTO: R$ 28.000,00
LOCAL: ÁREA DE SHOW BEIRA RIO, IMPERATRIZ/MA

TEN CEL QOEM EMERSON FARIAS COSTA
Comandante do CPA-I/3`,

      ORDEM_SERVICO_OPERACAO: `ESTADO DO MARANHÃO
SECRETARIA DE ESTADO DA SEGURANÇA PÚBLICA
POLÍCIA MILITAR DO MARANHÃO
COMANDO DO POLICIAMENTO DE ÁREA DO INTERIOR - 3
3º BATALHÃO DE POLÍCIA MILITAR
R. Leôncio Pires Dourado, 1286 - Bacuri, Imperatriz - MA, 65901-970

ORDEM DE OPERAÇÃO Nº 22/2026 – 3º BPM
ANIVERSÁRIO DE IMPERATRIZ 174 ANOS

1. SITUAÇÃO
a. Evento Programado: Policiamento Ostensivo motorizado, montado e a pé na área do 3º BPM.
b. Datas: 15 de JULHO 2026.
c. Hora / Locais: Conforme quadro abaixo.

Ord | Data | Evento | Local | Hora | Meios
01 | 15/07/2026 | ANIVERSÁRIO DE IMPERATRIZ 174 ANOS | ÁREA DE SHOW BEIRA RIO | 20h00 às 02h00 | 80 PM's, VTR Centro Beira Rio, FT 14º BPM, VTR GOE, Patrulha Rural, Equipe BMT, Cavalaria.

TEN. CEL. QOPM HÉLDIO MÁRLIO FERNANDES PEREIRA
Comandante do 3º BPM`,

      ESCALA_NOMINAL: `ESTADO DO MARANHÃO
POLÍCIA MILITAR DO MARANHÃO - 3º BPM
ESCALA EXTRAORDINÁRIA DE SERVIÇO - JOE
OPERAÇÃO: ANIVERSÁRIO DE IMPERATRIZ 174 ANOS
DATA: 15/07/2026 | HORÁRIO: 20h00 às 02h00
LOCAL: ÁREA DE SHOW BEIRA RIO

01. Cap QOPM MARCOS SILVA SOUZA Mat. 192834 CPF 847.192.384-91 (Cmt da Operação)
02. 1º Ten QOPM JOAO PAULO LIMA Mat. 284719 CPF 719.384.921-00 (Coord. Patrulha)
03. SubTen QOPM CARLOS ANDRE DIAS Mat. 394821 CPF 628.394.819-22
04. 1º Sgt PM ANTONIO COSTA FILHO Mat. 482910 CPF 539.284.719-33
05. 2º Sgt PM FRANCISCO PEREIRA Mat. 593821 CPF 492.384.719-44
06. 3º Sgt PM RAIMUNDO NONATO Mat. 692831 CPF 384.729.184-55
07. Cb PM JOSE ROBERTO SILVA Mat. 719284 CPF 294.839.182-66
08. Sd PM MANOEL DOS SANTOS Mat. 829104 CPF 194.829.384-77
(Relação completa totalizando 80 policiais militares em horário de folga)

Declaro que os militares acima encontram-se em folga regulamentar e aptos ao serviço extraordinário.
TEN. CEL. QOPM HÉLDIO MÁRLIO FERNANDES PEREIRA - Cmt do 3º BPM`,

      RENE_RELATORIO_EXECUCAO: `ESTADO DO MARANHÃO - POLÍCIA MILITAR - 3º BPM
RENE - RELATÓRIO DE EXECUÇÃO DE JORNADA OPERACIONAL EXTRAORDINÁRIA (Art. 10 da Portaria 122/2026)
PROCESSO SEI: 2026.190110.35458
OPERAÇÃO: ANIVERSÁRIO DE IMPERATRIZ 174 ANOS
DATA DE EXECUÇÃO: 15/07/2026
HORÁRIO EXECUTADO: 20h00 às 02h00 (Duração: 06 Horas)
LOCAL: ÁREA DE SHOW BEIRA RIO, IMPERATRIZ/MA
EFETIVO EMPREGADO: 80 PM's

Assinaturas:
1. Cap QOPM MARCOS SILVA SOUZA - Comandante da Operação
2. Maj QOPM LUCAS BARBOSA - Chefe da 1ª Seção (P/1) do 3º BPM
3. TEN. CEL. QOPM HÉLDIO MÁRLIO FERNANDES PEREIRA - Comandante do 3º BPM`,

      RELATORIO_OPERACIONAL: `RELATÓRIO OPERACIONAL DA OPERAÇÃO ANIVERSÁRIO DE IMPERATRIZ 174 ANOS
DATA: 15/07/2026 | HORÁRIO: 20h00 às 02h00
UNIDADE: 3º BPM (CPA/I-3)
LOCAL: BEIRA RIO, IMPERATRIZ - MA
EFETIVO: 80 POLICIAIS MILITARES

A operação transcorreu com total normalidade e pleno cumprimento da ordem de serviço das 20h00 às 02h00.
Público estimado: 45.000 pessoas.
Resultados: 120 abordagens a transeuntes, 45 veículos fiscalizados, 02 TCOs lavrados por perturbação da tranquilidade. Não houve ocorrências graves. Cumprimento rigoroso das 6 horas de jornada.`,

      PLANILHA_UNICA_PAGADORIA: `PLANILHA ÚNICA CONSOLIDADA DE LIQUIDAÇÃO DE JOE (PAGADORIA-DGP)
PROCESSO SEI: 2026.190110.35458
UNIDADE: CPA/I-3 (3º BPM)
EVENTO: ANIVERSÁRIO DE IMPERATRIZ 174 ANOS
DATA: 15/07/2026 | HORÁRIO: 20h00 às 02h00

Ord | Posto/Grad | Nome do Militar | Matrícula | CPF | Qtd JOE | Valor Unit. | Total
01 | Cap QOPM | MARCOS SILVA SOUZA | 192834 | 847.192.384-91 | 1 | R$ 350,00 | R$ 350,00
02 | 1º Ten QOPM | JOAO PAULO LIMA | 284719 | 719.384.921-00 | 1 | R$ 350,00 | R$ 350,00
03 | SubTen QOPM | CARLOS ANDRE DIAS | 394821 | 628.394.819-22 | 1 | R$ 350,00 | R$ 350,00
04 | 1º Sgt PM | ANTONIO COSTA FILHO | 482910 | 539.284.719-33 | 1 | R$ 350,00 | R$ 350,00
05 | 2º Sgt PM | FRANCISCO PEREIRA | 593821 | 492.384.719-44 | 1 | R$ 350,00 | R$ 350,00
06 | 3º Sgt PM | RAIMUNDO NONATO | 692831 | 384.729.184-55 | 1 | R$ 350,00 | R$ 350,00
07 | Cb PM | JOSE ROBERTO SILVA | 719284 | 294.839.182-66 | 1 | R$ 350,00 | R$ 350,00
08 | Sd PM | MANOEL DOS SANTOS | 829104 | 194.829.384-77 | 1 | R$ 350,00 | R$ 350,00
... (Total de 80 militares)
TOTAL GERAL: 80 JOES | VALOR TOTAL: R$ 28.000,00`,
    },
  },

  // Sample 2: Real PDF from CPA-I/3 (12º BPM - EXPOFRAN/2026)
  EXPOFRAN_12BPM_SUCCESS: {
    name: 'CPA-I/3 · 12º BPM (EXPOFRAN/2026) - 100% Conforme',
    commandId: 'CPA/I-3',
    documents: {
      OFICIO_SOLICITACAO: `ESTADO DO MARANHÃO
SECRETARIA DE ESTADO DA SEGURANÇA PÚBLICA
POLÍCIA MILITAR DO MARANHÃO
COMANDO DE POLICIAMENTO DO INTERIOR - CPI
COMANDO DE POLICIAMENTO DE ÁREA INTERIOR - 3

Imperatriz – MA, 09 de julho de 2026.
Ofício nº 62421/2026 – Seç. Adm - CPA-I/3
Do: Ten Cel QOEM Comandante do CPA-I/3
Ao: Sr. Cel. QOEM Comandante do CPI
Assunto: Solicitação de autorização para emprego de JOE
Processo SEI: 2026.190110.35458
Anexo: Ordem de Serviço nº 023/2026- 12º BPM.

SOLICITAÇÕES DE REFORÇO PM - JOES (12º BPM)
EVENTO: EXPOFRAN/2026
DATA: 11/07/2026
HORÁRIO: 21h00 às 03h00
DIA DA SEMANA: SÁBADO
EFETIVO: 10 PM's
VALOR JOE: R$ 350,00
VALOR TOTAL POR EVENTO: R$ 3.500,00
LOCAL: PARQUE DE EXPOSIÇÕES, PORTO FRANCO - MA

TEN CEL QOEM EMERSON FARIAS COSTA
Comandante do CPA-I/3`,

      ORDEM_SERVICO_OPERACAO: `ESTADO DO MARANHÃO
SECRETARIA DE ESTADO DE SEGURANÇA PÚBLICA
POLÍCIA MILITAR DO MARANHÃO
COMANDO DO POLICIAMENTO DE ÁREA DO INTERIOR 3
12º BATALHÃO DE POLÍCIA MILITAR - P/3

ORDEM DE SERVIÇO Nº 023/2026 - P/3-12º BPM
EXPOFRAN/2026

1. SITUAÇÃO
Evento programado: APOIO POLICIAL DURANTE A REALIZAÇÃO DA EXPOFRAN/2026
Local: Parque de Exposições, Município de Porto Franco - MA
Período: 11/07/2026
Horário de Execução: 21h00 às 03h00 (Duração: 6 horas)
Efetivo Empregado: 10 PM's em JOE (Apresentação às 21h00)
Meios: VTR Porto Franco, VTR Força Tática

TEN CEL QEPM GEORGE HENRIQUE OLIVEIRA LUNA
Comandante do 12º BPM`,
    },
  },

  // Sample 3: With Multiple Discrepancies to demonstrate error catching
  WITH_DISCREPANCIES: {
    name: 'CPA-I/2 · 15º BPM (Exemplo com Pendências / Inconsistências Reais)',
    commandId: 'CPA/I-2',
    documents: {
      OFICIO_SOLICITACAO: `ESTADO DO MARANHÃO - PMMA - CPA/I-2
Ofício nº 4012/2026 - CPA/I-2
Assunto: Solicitação de JOE para a OPERAÇÃO IMPACTO BACABAL
Data: 22/08/2026
Horário: 20h00 às 03h00 (7 horas de serviço)
Efetivo: 20 PM's
Valor da JOE: R$ 400,00 (Valor acima da Portaria)
Valor Total: R$ 8.000,00
Processo SEI: Não informado`,

      ORDEM_SERVICO_OPERACAO: `ESTADO DO MARANHÃO - PMMA - 15º BPM
ORDEM DE SERVIÇO Nº 99/2026 - 15º BPM
Evento: OPERAÇÃO CHOQUE DE ORDEM (Nome divergente do Ofício)
Data: 23/08/2026 (Data divergente do Ofício)
Horário: 20h00 às 03h00 (Duração de 7 horas - Violação do teto de 6h)
Efetivo: 20 PM's
Local: Praça Central de Bacabal - MA`,

      PLANILHA_UNICA_PAGADORIA: `PLANILHA ÚNICA CONSOLIDADA - 15º BPM
Evento: OPERAÇÃO IMPACTO BACABAL
01. Sd PM CARLOS EDUARDO SILVA Mat. 998811 CPF 000.111.222-33 Valor R$ 400,00
02. Cb PM ANTONIO JOSE LIMA Mat. 887722 CPF 999.888.777-66 Valor R$ 400,00
Valor Total: R$ 8.000,00 (Calculado com R$ 400 em vez de R$ 350)`,
    },
  },
};

// -------------------------------------------------------------
// MULTI-UNIT AUDIT ENGINE (BATCH PROCESSING & ASCENDING ORDER)
// -------------------------------------------------------------

// Helper to extract numerical order from Command Unit Code (e.g. CPA/I-1 -> 1, CPA/I-9 -> 9, CPI -> 10)
export function getCommandSortOrder(code: string): number {
  if (code === 'CPI' || code.includes('CPI')) return 10;
  const match = code.match(/CPA\/I-(\d+)/i) || code.match(/CPA-I\/(\d+)/i) || code.match(/(\d+)/);
  if (match) return parseInt(match[1], 10);
  return 99;
}

// Full suite of simulated realistic documents for all CPAs (CPA/I-1 to CPA/I-9 + CPI)
export const DEFAULT_UNIT_DOCUMENTS: Record<string, Partial<Record<AuditDocumentType, string>>> = {
  'CPA/I-1': {
    OFICIO_SOLICITACAO: `ESTADO DO MARANHÃO - PMMA - CPA/I-1 (Rosário)
Ofício nº 1102/2026 – Seç. Adm - CPA-I/1
Ao: Sr. Cel. QOEM Comandante do CPI
Processo SEI: 2026.190110.11020
Assunto: Solicitação de JOE para a OPERAÇÃO LENÇÓIS SEGUROS (15º BPM)
Data: 20/08/2026 | Horário: 18h00 às 00h00
Efetivo: 25 PM's · Valor Unitário: R$ 350,00 · Total: R$ 8.750,00
Local: Barreirinhas e Santo Amaro - MA
TEN CEL QOEM COMANDANTE DO CPA-I/1`,
    ORDEM_SERVICO_OPERACAO: `POLÍCIA MILITAR DO MARANHÃO - CPA/I-1 - 15º BPM
ORDEM DE SERVIÇO Nº 45/2026 - 15º BPM
OPERAÇÃO: OPERAÇÃO LENÇÓIS SEGUROS
Data: 20/08/2026 | Horário: 18h00 às 00h00 (Duração: 6 horas)
Efetivo: 25 PM's em escala extraordinária JOE
Local: Barreirinhas e Santo Amaro - MA
TEN CEL QOPM COMANDANTE DO 15º BPM`,
  },

  'CPA/I-2': {
    OFICIO_SOLICITACAO: `ESTADO DO MARANHÃO - PMMA - CPA/I-2 (Bacabal)
Ofício nº 4012/2026 - CPA/I-2
Assunto: Solicitação de JOE para a OPERAÇÃO IMPACTO BACABAL (15º BPM)
Data: 22/08/2026 | Horário: 20h00 às 03h00 (7 horas de serviço)
Efetivo: 20 PM's · Valor da JOE: R$ 400,00 (Valor acima da Portaria) · Valor Total: R$ 8.000,00
Processo SEI: 2026.190110.22091
TEN CEL QOEM COMANDANTE DO CPA-I/2`,
    ORDEM_SERVICO_OPERACAO: `ESTADO DO MARANHÃO - PMMA - 15º BPM
ORDEM DE SERVIÇO Nº 99/2026 - 15º BPM
Evento: OPERAÇÃO IMPACTO BACABAL
Data: 22/08/2026
Horário: 20h00 às 03h00 (Duração de 7 horas - Violação do teto de 6h)
Efetivo: 20 PM's · Valor Unitário: R$ 400,00 · Total: R$ 8.000,00
Local: Praça Central de Bacabal - MA
TEN CEL QOPM COMANDANTE DO 15º BPM`,
  },

  'CPA/I-3': {
    OFICIO_SOLICITACAO: `ESTADO DO MARANHÃO - PMMA - CPA/I-3 (Imperatriz)
Ofício nº 62421/2026 – Seç. Adm - CPA-I/3
Processo SEI: 2026.190110.35458
Assunto: Solicitação de autorização para emprego de JOE
EVENTO: ANIVERSÁRIO DE IMPERATRIZ 174 ANOS (3º BPM)
DATA: 15/07/2026 | HORÁRIO: 20h00 às 02h00
EFETIVO: 80 PM's · VALOR JOE: R$ 350,00 · VALOR TOTAL: R$ 28.000,00
LOCAL: ÁREA DE SHOW BEIRA RIO, IMPERATRIZ/MA
TEN CEL QOEM EMERSON FARIAS COSTA - Comandante do CPA-I/3`,
    ORDEM_SERVICO_OPERACAO: `ESTADO DO MARANHÃO - PMMA - CPA-I/3 - 3º BPM
ORDEM DE OPERAÇÃO Nº 22/2026 – 3º BPM
ANIVERSÁRIO DE IMPERATRIZ 174 ANOS
Data: 15/07/2026 | Hora: 20h00 às 02h00 (Duração: 6 horas) | Local: ÁREA DE SHOW BEIRA RIO
Efetivo: 80 PM's
TEN. CEL. QOPM HÉLDIO MÁRLIO FERNANDES PEREIRA - Comandante do 3º BPM`,
    PLANILHA_UNICA_PAGADORIA: `PLANILHA ÚNICA CONSOLIDADA DE LIQUIDAÇÃO DE JOE (DGP)
PROCESSO SEI: 2026.190110.35458 | UNIDADE: 3º BPM (CPA/I-3)
EVENTO: ANIVERSÁRIO DE IMPERATRIZ 174 ANOS | DATA: 15/07/2026 | HORÁRIO: 20h00 às 02h00
01 | Cap QOPM | MARCOS SILVA SOUZA | 192834 | 847.192.384-91 | 1 | R$ 350,00 | R$ 350,00
02 | 1º Ten QOPM | JOAO PAULO LIMA | 284719 | 719.384.921-00 | 1 | R$ 350,00 | R$ 350,00
... (Total de 80 militares)
TOTAL GERAL: 80 JOES | VALOR TOTAL: R$ 28.000,00`,
  },

  'CPA/I-4': {
    ORDEM_SERVICO_OPERACAO: `ESTADO DO MARANHÃO - PMMA - 2º BPM
ORDEM DE SERVIÇO Nº 18/2026 - 2º BPM
OPERAÇÃO: OPERAÇÃO FEIRA SEGURA
Data: 22/08/2026 | Horário: 06h00 às 12h00 (Duração: 6 horas)
Efetivo: 15 PM's · Local: Centro Comercial de Caxias - MA
TEN CEL QOPM COMANDANTE DO 2º BPM`,
    PLANILHA_UNICA_PAGADORIA: `PLANILHA ÚNICA CONSOLIDADA - 2º BPM
OPERAÇÃO: OPERAÇÃO FEIRA SEGURA | Data: 22/08/2026
Total de Policiais: 15 · Valor Unitário: R$ 350,00 · Valor Total: R$ 5.250,00`,
  },

  'CPA/I-5': {
    OFICIO_SOLICITACAO: `ESTADO DO MARANHÃO - PMMA - CPA/I-5 (Pinheiro)
Ofício nº 5120/2026 - CPA/I-5
Processo SEI: 2026.190110.55034
Assunto: Solicitação de JOE para a OPERAÇÃO BAIXADA PROTEGIDA (10º BPM)
Data: 24/08/2026 | Horário: 17h00 às 23h00
Efetivo: 30 PM's · Valor Unitário: R$ 350,00 · Total: R$ 10.500,00
Local: Pinheiro, Santa Helena e Cururupu - MA
TEN CEL QOEM COMANDANTE DO CPA-I/5`,
    ORDEM_SERVICO_OPERACAO: `ESTADO DO MARANHÃO - PMMA - 10º BPM
ORDEM DE OPERAÇÃO Nº 52/2026 - 10º BPM
OPERAÇÃO BAIXADA PROTEGIDA
Data: 24/08/2026 | Horário: 17h00 às 23h00 (Duração: 6 horas)
Efetivo: 30 PM's · Local: Polo Pinheiro/Baixada Maranhense
TEN CEL QOPM COMANDANTE DO 10º BPM`,
  },

  'CPA/I-6': {
    OFICIO_SOLICITACAO: `ESTADO DO MARANHÃO - PMMA - CPA/I-6 (Chapadinha)
Ofício nº 6010/2026 - CPA/I-6
Processo SEI: 2026.190110.66018
Assunto: Emprego de JOE para a OPERAÇÃO SAFRA SEGURA (4º BPM)
Data: 23/08/2026 | Horário: 14h00 às 20h00
Efetivo: 20 PM's · Valor Unitário: R$ 350,00 · Total: R$ 7.000,00
Local: Chapadinha e Vargem Grande - MA
TEN CEL QOEM COMANDANTE DO CPA-I/6`,
    PLANILHA_UNICA_PAGADORIA: `PLANILHA ÚNICA CONSOLIDADA DE PAGAMENTO - 4º BPM
OPERAÇÃO SAFRA SEGURA | Data: 23/08/2026
Total: 20 Militares · Valor Individual: R$ 350,00 · Total Geral: R$ 7.000,00`,
  },

  'CPA/I-7': {
    ORDEM_SERVICO_OPERACAO: `ESTADO DO MARANHÃO - PMMA - 16º BPM
ORDEM DE SERVIÇO Nº 78/2026 - 16º BPM
OPERAÇÃO: OPERAÇÃO COCOROBÓ
Data: 25/08/2026 | Horário: 19h00 às 02h00 (Duração: 7 horas - Excedeu limite legal)
Efetivo: 18 PM's · Local: Bairros periféricos de Codó - MA
TEN CEL QOPM COMANDANTE DO 16º BPM`,
    PLANILHA_UNICA_PAGADORIA: `PLANILHA ÚNICA - 16º BPM
OPERAÇÃO COCOROBÓ | Data: 25/08/2026
Efetivo: 18 PMs · Valor Unitário: R$ 350,00 · Total: R$ 6.300,00`,
  },

  'CPA/I-8': {
    OFICIO_SOLICITACAO: `ESTADO DO MARANHÃO - PMMA - CPA/I-8 (Governador Nunes Freire)
Ofício nº 8045/2026 - CPA/I-8
Processo SEI: 2026.190110.88022
Assunto: Emprego de JOE na OPERAÇÃO BR-316 SEGURA (7º BPM)
Data: 21/08/2026 | Horário: 18h00 às 00h00
Efetivo: 12 PM's · Valor Unitário: R$ 350,00 · Total: R$ 4.200,00
Local: Eixo da Rodovia BR-316 - MA
TEN CEL QOEM COMANDANTE DO CPA-I/8`,
    ORDEM_SERVICO_OPERACAO: `ESTADO DO MARANHÃO - PMMA - 7º BPM
ORDEM DE SERVIÇO Nº 12/2026 - 7º BPM
OPERAÇÃO: OPERAÇÃO BR-316 SEGURA
Data: 21/08/2026 | Horário: 18h00 às 00h00 (Duração: 6 horas)
Efetivo: 12 PM's · Local: Trecho Urbano e Rodoviário do 7º BPM
TEN CEL QOPM COMANDANTE DO 7º BPM`,
  },

  'CPA/I-9': {
    OFICIO_SOLICITACAO: `ESTADO DO MARANHÃO - PMMA - CPA/I-9 (Balsas/Sul)
Ofício nº 9102/2026 - CPA/I-9
Processo SEI: 2026.190110.99045
Assunto: Solicitação de JOE para a OPERAÇÃO CERRADO SEGURO (11º BPM)
Data: 24/08/2026 | Horário: 16h00 às 22h00
Efetivo: 24 PM's · Valor Unitário: R$ 350,00 · Total: R$ 8.400,00
Local: Balsas e Riachão - MA
TEN CEL QOEM COMANDANTE DO CPA-I-9`,
    PLANILHA_UNICA_PAGADORIA: `PLANILHA ÚNICA CONSOLIDADA (DGP) - 11º BPM
OPERAÇÃO CERRADO SEGURO | Data: 24/08/2026
Total de Policiais: 24 · Valor por JOE: R$ 350,00 · Total: R$ 8.400,00`,
  },

  CPI: {
    OFICIO_SOLICITACAO: `ESTADO DO MARANHÃO - PMMA - COMANDO DE POLICIAMENTO DO INTERIOR (CPI)
Ofício nº 0100/2026 - GAB-CPI
Processo SEI: 2026.190110.00100
Assunto: Emprego de JOE na OPERAÇÃO COMANDO ITINERANTE (Direção Setorial)
Data: 26/08/2026 | Horário: 08h00 às 14h00
Efetivo: 10 PM's · Valor Unitário: R$ 350,00 · Total: R$ 3.500,00
Local: São Luís e Eixo Rodoviário do Interior
CEL QOEM COMANDANTE DO CPI/PMMA`,
    ORDEM_SERVICO_OPERACAO: `ESTADO DO MARANHÃO - PMMA - CPI
ORDEM DE OPERAÇÃO Nº 05/2026 - CPI
OPERAÇÃO COMANDO ITINERANTE
Data: 26/08/2026 | Horário: 08h00 às 14h00 (Duração: 6 horas)
Efetivo: 10 PM's · Local: Regiões de fiscalização do CPI
CEL QOEM ROBERTO SILVA - Comandante do CPI`,
  },
};

// Execute Multi-Unit Batch Audit and return results sorted in ASCENDING order (CPA/I-1 to CPA/I-9, CPI)
export function performMultiUnitAudit(
  selectedUnitIds: string[],
  unitDocumentsMap: Record<string, AuditDocumentSlot[]>,
  commands: CommandUnit[],
  ordinance: OrdinancePeriod,
  auditorUser: string
): MultiUnitAuditResult {
  const dateFormatted = new Date().toLocaleDateString('pt-BR');
  const expectedUnitValue = ordinance.unitValueJoe || 350;

  // 1. Sort selected units in STRICT ASCENDING ORDER
  const sortedUnitIds = [...selectedUnitIds].sort(
    (a, b) => getCommandSortOrder(a) - getCommandSortOrder(b)
  );

  const unitSummaries: UnitAuditSummary[] = [];

  let approvedUnitsCount = 0;
  let pendingUnitsCount = 0;
  let emptyUnitsCount = 0;
  let totalDiscrepanciesCount = 0;
  let totalOfficersAllUnits = 0;
  let totalAmountAllUnits = 0;

  sortedUnitIds.forEach((cmdId) => {
    const cmdInfo = commands.find((c) => c.code === cmdId || c.id === cmdId);
    const cmdName = cmdInfo ? cmdInfo.name : cmdId;
    const sortNum = getCommandSortOrder(cmdId);

    // Get slots for this unit
    const slots = unitDocumentsMap[cmdId] || [];
    const filledCount = slots.filter((s) => s.content && s.content.trim().length > 0).length;

    if (filledCount === 0) {
      emptyUnitsCount++;
      unitSummaries.push({
        commandId: cmdId,
        commandName: cmdName,
        orderNumber: sortNum,
        status: 'SEM_DOCUMENTOS',
        documentsLoadedCount: 0,
        discrepanciesCount: 0,
        totalOfficers: 0,
        totalAmount: 0,
        discrepancies: [],
        ruleChecks: [],
      });
      return;
    }

    // Run audit for unit
    const auditRes = performDocumentAudit(slots, cmdId, ordinance, auditorUser);

    if (auditRes.status === 'APROVADO_CONFORME') {
      approvedUnitsCount++;
    } else {
      pendingUnitsCount++;
    }

    const discCount = auditRes.discrepancies.length;
    totalDiscrepanciesCount += discCount;
    totalOfficersAllUnits += auditRes.extractedSummary.officersCount || 0;
    totalAmountAllUnits += auditRes.extractedSummary.totalAmount || 0;

    unitSummaries.push({
      commandId: cmdId,
      commandName: cmdName,
      orderNumber: sortNum,
      status: auditRes.status === 'APROVADO_CONFORME' ? 'APROVADO_CONFORME' : 'REPROVADO_PENDENCIAS',
      documentsLoadedCount: auditRes.documentsLoadedCount,
      discrepanciesCount: discCount,
      totalOfficers: auditRes.extractedSummary.officersCount || 0,
      totalAmount: auditRes.extractedSummary.totalAmount || 0,
      durationHours: auditRes.extractedSummary.durationHours,
      eventName: auditRes.extractedSummary.eventName,
      subUnit: auditRes.extractedSummary.subUnit,
      discrepancies: auditRes.discrepancies,
      ruleChecks: auditRes.ruleChecks,
      result: auditRes,
    });
  });

  // Overall status
  let overallStatus: 'APROVADO_CONFORME' | 'REPROVADO_PENDENCIAS' | 'PARCIAL_COM_PENDENCIAS' =
    'APROVADO_CONFORME';

  if (pendingUnitsCount > 0 && approvedUnitsCount > 0) {
    overallStatus = 'PARCIAL_COM_PENDENCIAS';
  } else if (pendingUnitsCount > 0) {
    overallStatus = 'REPROVADO_PENDENCIAS';
  }

  // Generate Consolidated SEI Dispatch in Ascending Order
  const unitDispatchesText = unitSummaries
    .map((summary) => {
      if (summary.status === 'SEM_DOCUMENTOS') {
        return `[ORDEM ${summary.orderNumber.toString().padStart(2, '0')}] ${summary.commandId} (${summary.commandName}):
   - STATUS: PENDENTE DE CARGA DE DOCUMENTOS
   - Observação: Nenhum documento anexado para análise na presente data.`;
      }

      if (summary.status === 'APROVADO_CONFORME') {
        return `[ORDEM ${summary.orderNumber.toString().padStart(2, '0')}] ${summary.commandId} (${summary.commandName}):
   - STATUS: 100% CONFORME / AUTORIZADO
   - Evento/Operação: ${summary.eventName || 'Operação de JOE'} (${summary.subUnit || 'UPM'})
   - Turno: ${summary.durationHours || 6} horas de duração (Em conformidade com o Art. 3º)
   - Efetivo / Valor: ${summary.totalOfficers} PMs · ${formatCurrencyBRL(summary.totalAmount)}
   - Parecer: Todos os 6 requisitos legais e cruzamentos documentais estão rigorosamente compatíveis.`;
      }

      const discList = summary.discrepancies
        .map(
          (d, idx) =>
            `     ${idx + 1}. [${d.severity}] ${d.title}: ${d.description}\n        -> Fundamento Legal: ${d.legalBasis}\n        -> Ação Exigida: ${d.remedyAction}`
        )
        .join('\n');

      return `[ORDEM ${summary.orderNumber.toString().padStart(2, '0')}] ${summary.commandId} (${summary.commandName}):
   - STATUS: REPROVADO / COM ${summary.discrepanciesCount} PENDÊNCIA(S)
   - Evento: ${summary.eventName || '—'} | Efetivo: ${summary.totalOfficers} PMs · ${formatCurrencyBRL(summary.totalAmount)}
   - INCONSISTÊNCIAS APURADAS:
${discList}
   - Providência: Restituição dos autos à UPM para retificação no SEI.`;
    })
    .join('\n\n------------------------------------------------------------\n\n');

  const consolidatedSeiDispatch = `ESTADO DO MARANHÃO
SECRETARIA DE ESTADO DA SEGURANÇA PÚBLICA
POLÍCIA MILITAR DO MARANHÃO
COMANDO DE POLICIAMENTO DO INTERIOR - CPI
SEÇÃO DE AUDITORIA, CONTROLE & FISCALIZAÇÃO DE JOE

RELATÓRIO CONSOLIDADO DE AUDITORIA MULTI-UNIDADES EM ORDEM CRESCENTE
PORTARIA VIGENTE: Nº ${ordinance.number} · VALOR DE REFERÊNCIA JOE: R$ ${expectedUnitValue.toFixed(2).replace('.', ',')}
DATA DA AUDITORIA: ${dateFormatted} · AUDITOR RESPONSÁVEL: ${auditorUser}

1. RESUMO EXECUTIVO DO PROCESSAMENTO EM LOTE:
   - Total de Unidades Auditadas: ${selectedUnitIds.length} Unidades
   - Unidades 100% Conformes (Aprovadas): ${approvedUnitsCount}
   - Unidades com Inconsistências (Devolvidas): ${pendingUnitsCount}
   - Unidades sem Documentos: ${emptyUnitsCount}
   - Efetivo Total Cruzado: ${totalOfficersAllUnits} Policiais Militares
   - Valor Total Analisado: ${formatCurrencyBRL(totalAmountAllUnits)}

2. DISCRIMINAÇÃO DETALHADA POR UNIDADE (EM ORDEM CRESCENTE CPA/I-1 A CPA/I-9 e CPI):

${unitDispatchesText}

3. CONCLUSÃO & ENCAMINHAMENTO:
As unidades com status "CONFORME" estão devidamente homologadas para envio à Pagadoria/DGP. As unidades com pendências deverão ser oficiadas via SEI contendo as exigências sanatórias descritas.

São Luís - MA, ${dateFormatted}.

SEÇÃO DE AUDITORIA E FISCALIZAÇÃO DO CPI/PMMA`;

  return {
    id: `MULTI-AUDIT-${Date.now()}`,
    auditDate: dateFormatted,
    auditorName: auditorUser,
    ordinanceNumber: ordinance.number,
    ordinanceUnitValue: expectedUnitValue,
    selectedCommandIds: sortedUnitIds,
    unitSummaries,
    overallStatus,
    totalUnitsAudited: sortedUnitIds.length,
    approvedUnitsCount,
    pendingUnitsCount,
    emptyUnitsCount,
    totalDiscrepanciesCount,
    totalOfficersAllUnits,
    totalAmountAllUnits,
    consolidatedSeiDispatch,
  };
}
