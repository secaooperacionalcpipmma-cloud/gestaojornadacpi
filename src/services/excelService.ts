import ExcelJS from 'exceljs';
import { OperationLaunch, CommandBudget, OrdinancePeriod, CommandUnit, User } from '../types';
import { formatCurrencyBRL } from '../utils/formatters';
import {
  normalizeCommandName,
  getCommandOrderIndex,
  OFFICIAL_COMMAND_CODES,
} from '../utils/commandUtils';
import { getOfficialCotasForOrdinance } from '../utils/ordinancePeriodUtils';

// Format command display string (e.g. CPI, CPA/I-1 ... CPA/I-9)
export function formatCommandDisplay(cmdCode: string): string {
  if (!cmdCode) return '';
  return normalizeCommandName(cmdCode);
}

// Helper to determine sort rank: CPI first (0), then CPA/I-1 to CPA/I-9 (1 to 9), then others
export function getCommandSortRank(commandId: string): number {
  return getCommandOrderIndex(commandId);
}

// Function to sort operations in official ascending order: CPI -> CPA/I-1 to CPA/I-9
export function sortOperationsOfficial(ops: OperationLaunch[]): OperationLaunch[] {
  return [...ops].sort((a, b) => {
    const rankA = getCommandSortRank(a.commandId);
    const rankB = getCommandSortRank(b.commandId);
    if (rankA !== rankB) return rankA - rankB;
    if (a.serviceDate && b.serviceDate && a.serviceDate !== b.serviceDate) {
      return a.serviceDate.localeCompare(b.serviceDate);
    }
    return (a.orderNumber || '').localeCompare(b.orderNumber || '');
  });
}

// Border presets for ExcelJS
const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF94A3B8' } },
  left: { style: 'thin', color: { argb: 'FF94A3B8' } },
  bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
  right: { style: 'thin', color: { argb: 'FF94A3B8' } },
};

const darkBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'medium', color: { argb: 'FF1E293B' } },
  left: { style: 'medium', color: { argb: 'FF1E293B' } },
  bottom: { style: 'medium', color: { argb: 'FF1E293B' } },
  right: { style: 'medium', color: { argb: 'FF1E293B' } },
};

// Helper to save workbook in browser
async function saveWorkbook(workbook: ExcelJS.Workbook, filename: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export const excelService = {
  // 1. Export Quadro Resumo CPI formatado idêntico ao sistema (Print 02 / Print 04)
  async exportQuadroResumoCPI(
    operations: OperationLaunch[],
    ordinance: OrdinancePeriod | null,
    _commands?: CommandUnit[]
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Quadro Resumo CPI', {
      views: [{ showGridLines: true }],
    });

    // Standard official list CPI, CPA/I-1 to CPA/I-9
    const standardCodes = [...OFFICIAL_COMMAND_CODES];
    const officialCotas = getOfficialCotasForOrdinance(ordinance);
    const defaultDisponibilizado: Record<string, { val: number; joes: number }> = {};
    standardCodes.forEach((code) => {
      const cota = officialCotas[code] || { amount: 0, joes: 0 };
      defaultDisponibilizado[code] = { val: cota.amount, joes: cota.joes };
    });

    const sumMap: Record<string, number> = {};
    const sumJoeMap: Record<string, number> = {};
    standardCodes.forEach((code) => {
      sumMap[code] = 0;
      sumJoeMap[code] = 0;
    });

    operations.forEach((op) => {
      const formatted = normalizeCommandName(op.commandId);
      const val = Number(op.totalValue) || 0;
      const joes = Number(op.officersCount) || 0;
      if (sumMap[formatted] !== undefined) {
        sumMap[formatted] += val;
        sumJoeMap[formatted] += joes;
      } else {
        const match = standardCodes.find((sc) => normalizeCommandName(formatted) === sc);
        if (match) {
          sumMap[match] += val;
          sumJoeMap[match] += joes;
        }
      }
    });

    ws.columns = [
      { width: 4 },  // Margin column A
      { width: 16 }, // UNIDADE B
      { width: 30 }, // VALOR TOTAL DISPONIBILIZADO C
      { width: 16 }, // QUANT. JOE D
      { width: 22 }, // VALOR EXECUTADO E
      { width: 24 }, // QUANT. JOE EXECUTADA F
      { width: 22 }, // VALOR DISPONÍVEL G
      { width: 24 }, // QUANT. JOE DISPONÍVEL H
    ];

    // Blank top
    ws.addRow([]);

    // 1. Header Box: CPI
    const rowCPI = ws.addRow(['', 'CPI', '', '', '', '', '', '']);
    ws.mergeCells('B2:H2');
    rowCPI.getCell(2).font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0F172A' } };
    rowCPI.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    rowCPI.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    for (let c = 2; c <= 8; c++) rowCPI.getCell(c).border = darkBorder;
    rowCPI.height = 28;

    // 2. Subheader Banner: QUADRO RESUMO CPI
    const rowBanner = ws.addRow(['', 'QUADRO RESUMO CPI', '', '', '', '', '', '']);
    ws.mergeCells('B3:H3');
    rowBanner.getCell(2).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    rowBanner.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    rowBanner.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    for (let c = 2; c <= 8; c++) rowBanner.getCell(c).border = darkBorder;
    rowBanner.height = 24;

    // 3. Table Column Headers
    const headers = [
      '',
      'UNIDADE',
      'VALOR TOTAL DISPONIBILIZADO',
      'QUANT. JOE',
      'VALOR EXECUTADO',
      'QUANT. JOE EXECUTADA',
      'VALOR DISPONÍVEL',
      'QUANT. JOE DISPONÍVEL',
    ];
    const rowHeaders = ws.addRow(headers);
    for (let c = 2; c <= 8; c++) {
      const cell = rowHeaders.getCell(c);
      cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCBD5E1' } };
      cell.border = thinBorder;
    }
    rowHeaders.height = 26;

    let totDisp = 0;
    let totQJoe = 0;
    let totExec = 0;
    let totQExec = 0;

    // 4. Rows CPI, CPA/I-1 to CPA/I-9
    standardCodes.forEach((code) => {
      const def = defaultDisponibilizado[code] || { val: 0, joes: 0 };
      const valTotal = def.val;
      const quantJoe = def.joes;
      const valExec = sumMap[code] || 0;
      const quantExec = sumJoeMap[code] || 0;
      const valDisp = valTotal - valExec;
      const quantDisp = quantJoe - quantExec;

      totDisp += valTotal;
      totQJoe += quantJoe;
      totExec += valExec;
      totQExec += quantExec;

      const row = ws.addRow(['', code, valTotal, quantJoe, valExec, quantExec, valDisp, quantDisp]);
      row.height = 20;

      // Col B: UNIDADE
      const cellCode = row.getCell(2);
      cellCode.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
      cellCode.alignment = { horizontal: 'center', vertical: 'middle' };
      cellCode.border = thinBorder;

      // Col C: VALOR TOTAL DISPONIBILIZADO
      const cellTot = row.getCell(3);
      cellTot.font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
      cellTot.alignment = { horizontal: 'center', vertical: 'middle' };
      cellTot.numFmt = '#,##0.00';
      cellTot.border = thinBorder;

      // Col D: QUANT. JOE
      const cellQJoe = row.getCell(4);
      cellQJoe.font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
      cellQJoe.alignment = { horizontal: 'center', vertical: 'middle' };
      cellQJoe.border = thinBorder;

      // Col E: VALOR EXECUTADO
      const cellExec = row.getCell(5);
      cellExec.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      cellExec.alignment = { horizontal: 'center', vertical: 'middle' };
      cellExec.numFmt = '"R$"\\ #,##0.00';
      cellExec.border = thinBorder;

      // Col F: QUANT. JOE EXECUTADA
      const cellQExec = row.getCell(6);
      cellQExec.font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
      cellQExec.alignment = { horizontal: 'center', vertical: 'middle' };
      cellQExec.border = thinBorder;

      // Col G: VALOR DISPONÍVEL
      const cellDisp = row.getCell(7);
      cellDisp.font = {
        name: 'Arial',
        size: 10,
        bold: valDisp < 0,
        color: { argb: valDisp < 0 ? 'FFB91C1C' : 'FF0F172A' },
      };
      cellDisp.alignment = { horizontal: 'center', vertical: 'middle' };
      cellDisp.numFmt = '#,##0.00;-#,##0.00;"0,00"';
      cellDisp.border = thinBorder;

      // Col H: QUANT. JOE DISPONÍVEL
      const cellQDisp = row.getCell(8);
      cellQDisp.font = {
        name: 'Arial',
        size: 10,
        bold: quantDisp < 0,
        color: { argb: quantDisp < 0 ? 'FFB91C1C' : 'FF0F172A' },
      };
      cellQDisp.alignment = { horizontal: 'center', vertical: 'middle' };
      cellQDisp.border = thinBorder;
    });

    const totDispVal = totDisp - totExec;
    const totQDisp = totQJoe - totQExec;

    // 5. Total Row: TOTAL GERAL CPI
    const rowTotal = ws.addRow([
      '',
      'TOTAL GERAL CPI',
      totDisp,
      totQJoe,
      totExec,
      totQExec,
      totDispVal,
      totQDisp,
    ]);
    rowTotal.height = 26;

    for (let c = 2; c <= 8; c++) {
      const cell = rowTotal.getCell(c);
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCBD5E1' } };
      cell.border = darkBorder;
    }
    rowTotal.getCell(3).numFmt = '#,##0.00';
    rowTotal.getCell(5).numFmt = '"R$"\\ #,##0.00';
    rowTotal.getCell(7).numFmt = '#,##0.00;-#,##0.00;"0,00"';

    const ordNum = ordinance?.number ? ordinance.number.replace(/[^a-zA-Z0-9]/g, '_') : 'GERAL';
    const dateStamp = new Date().toISOString().split('T')[0];
    await saveWorkbook(workbook, `Quadro_Resumo_CPI_PMMA_${ordNum}_${dateStamp}.xlsx`);
  },

  // 2. Export Planilha Detalhada (Print 01) com Quadro Resumo CPI (Print 02) formatados idênticos ao sistema
  async exportDetailedOperations(
    operations: OperationLaunch[],
    ordinance?: OrdinancePeriod | null,
    customColumns?: { id: string; label: string; getter: (op: OperationLaunch) => any }[]
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Relatório JOE CPI', {
      views: [{ showGridLines: true }],
    });

    // Sort operations in official order: CPI first, then CPAI-1 to CPAI-9
    const sortedOps = sortOperationsOfficial(operations);

    const defaultCols = [
      { id: 'command', label: 'COMANDO', getter: (op: OperationLaunch) => formatCommandDisplay(op.commandId), width: 14, align: 'center' as const },
      { id: 'subUnit', label: 'UNIDADE', getter: (op: OperationLaunch) => op.subUnit || formatCommandDisplay(op.commandId), width: 22, align: 'center' as const },
      { id: 'justification', label: 'JUSTIFICATIVA DA CRIAÇÃO DA JOE', getter: (op: OperationLaunch) => op.justification || '', width: 38, align: 'center' as const },
      {
        id: 'order',
        label: 'ORDEM DE SERVIÇO/OPERAÇÃO',
        getter: (op: OperationLaunch) => (op.orderNumber ? `${op.orderType === 'ORDEM_DE_OPERACAO' ? 'OO' : 'OS'} ${op.orderNumber}` : ''),
        width: 22,
        align: 'center' as const,
      },
      {
        id: 'seiProcessNumber',
        label: 'PROCESSO SEI',
        getter: (op: OperationLaunch) => op.seiProcessNumber || '-',
        width: 22,
        align: 'center' as const,
      },
      { id: 'eventName', label: 'NOME DO EVENTO', getter: (op: OperationLaunch) => op.eventName || '', width: 28, align: 'center' as const },
      {
        id: 'date',
        label: 'DATA',
        getter: (op: OperationLaunch) => {
          if (!op.serviceDate) return '';
          const parts = op.serviceDate.split('-');
          return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : op.serviceDate;
        },
        width: 14,
        align: 'center' as const,
      },
      {
        id: 'time',
        label: 'HORÁRIO',
        getter: (op: OperationLaunch) => op.startTime ? (op.endTime ? `${op.startTime} às ${op.endTime}` : op.startTime) : '20h às 02h',
        width: 16,
        align: 'center' as const,
      },
      { id: 'officers', label: 'EFETIVO EMPREGADO', getter: (op: OperationLaunch) => Number(op.officersCount) || 0, width: 18, align: 'center' as const },
      { id: 'unitValue', label: 'VALOR UNITÁRIO', getter: (op: OperationLaunch) => Number(op.unitValue) || 350, width: 18, align: 'center' as const },
      { id: 'totalValue', label: 'VALOR TOTAL', getter: (op: OperationLaunch) => Number(op.totalValue) || 0, width: 18, align: 'center' as const },
    ];

    const activeCols = customColumns
      ? customColumns.map((c) => {
          const match = defaultCols.find((d) => d.id === c.id);
          return {
            id: c.id,
            label: c.label,
            getter: c.getter,
            width: match?.width || 20,
            align: 'center' as const,
          };
        })
      : defaultCols;

    ws.columns = activeCols.map((c) => ({
      width: c.width,
    }));

    // --- 1. CABEÇALHO TABELA DETALHADA ---
    const headerRow = ws.addRow(activeCols.map((c) => c.label));
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = thinBorder;
    });

    let totalAmount = 0;
    let totalOfficers = 0;

    // --- 2. LINHAS DE DADOS (LANÇAMENTOS ORDENADOS) ---
    sortedOps.forEach((op) => {
      totalAmount += Number(op.totalValue) || 0;
      totalOfficers += Number(op.officersCount) || 0;

      const rowValues = activeCols.map((c) => {
        if (c.id === 'unitValue') return Number(op.unitValue) || 350;
        if (c.id === 'totalValue') return Number(op.totalValue) || 0;
        if (c.id === 'officers' || c.id === 'officersCount') return Number(op.officersCount) || 0;
        return c.getter(op);
      });
      const row = ws.addRow(rowValues);
      row.height = 24;

      activeCols.forEach((col, idx) => {
        const cell = row.getCell(idx + 1);
        cell.font = { name: 'Arial', size: 9, color: { argb: 'FF1E293B' } };
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true,
        };
        cell.border = thinBorder;

        if (col.id === 'unitValue' || col.id === 'totalValue') {
          cell.numFmt = '"R$"\\ #,##0.00';
          cell.font = { name: 'Arial', size: 9, bold: col.id === 'totalValue', color: { argb: 'FF0F172A' } };
        } else if (col.id === 'officers' || col.id === 'officersCount') {
          cell.numFmt = '#,##0';
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F172A' } };
        }
      });
    });

    // --- 3. LINHA TOTAL UNIDADE (FOOTER PRINT 01) ---
    const totalRowValues = activeCols.map((c, idx) => {
      if (idx === 0) return 'TOTAL UNIDADE';
      if (c.id === 'totalValue') return totalAmount;
      if (c.id === 'officers' || c.id === 'officersCount') return totalOfficers;
      return '';
    });

    const totalRow = ws.addRow(totalRowValues);
    totalRow.height = 24;
    activeCols.forEach((col, idx) => {
      const cell = totalRow.getCell(idx + 1);
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      cell.border = thinBorder;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };

      if (col.id === 'totalValue') {
        cell.numFmt = '"R$"\\ #,##0.00';
      } else if (col.id === 'officers' || col.id === 'officersCount') {
        cell.numFmt = '#,##0';
      }
    });

    // --- 4. ESPAÇAMENTO ENTRE OS QUADROS ---
    ws.addRow([]);
    ws.addRow([]);
    ws.addRow([]);

    // --- 5. QUADRO RESUMO CPI (PRINT 02 - 7 COLUNAS OFICIAIS) ---
    const standardCodes = [...OFFICIAL_COMMAND_CODES];
    const officialCotas = getOfficialCotasForOrdinance(ordinance);
    const defaultDisponibilizado: Record<string, { val: number; joes: number }> = {};
    standardCodes.forEach((code) => {
      const cota = officialCotas[code] || { amount: 0, joes: 0 };
      defaultDisponibilizado[code] = { val: cota.amount, joes: cota.joes };
    });

    const sumMap: Record<string, number> = {};
    const sumJoeMap: Record<string, number> = {};
    standardCodes.forEach((code) => {
      sumMap[code] = 0;
      sumJoeMap[code] = 0;
    });

    sortedOps.forEach((op) => {
      const formatted = normalizeCommandName(op.commandId);
      const val = Number(op.totalValue) || 0;
      const joes = Number(op.officersCount) || 0;
      if (sumMap[formatted] !== undefined) {
        sumMap[formatted] += val;
        sumJoeMap[formatted] += joes;
      } else {
        const match = standardCodes.find((sc) => normalizeCommandName(formatted) === sc);
        if (match) {
          sumMap[match] += val;
          sumJoeMap[match] += joes;
        }
      }
    });

    const startCol = 2;
    const endCol = 8;

    // Header CPI
    const rowCPI = ws.addRow([]);
    rowCPI.height = 28;
    const startRowIdx = rowCPI.number;
    ws.mergeCells(startRowIdx, startCol, startRowIdx, endCol);
    const cellCPI = ws.getCell(startRowIdx, startCol);
    cellCPI.value = 'CPI';
    cellCPI.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0F172A' } };
    cellCPI.alignment = { horizontal: 'center', vertical: 'middle' };
    cellCPI.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    for (let c = startCol; c <= endCol; c++) ws.getCell(startRowIdx, c).border = darkBorder;

    // Subheader QUADRO RESUMO CPI
    const rowBanner = ws.addRow([]);
    rowBanner.height = 24;
    const bannerRowIdx = rowBanner.number;
    ws.mergeCells(bannerRowIdx, startCol, bannerRowIdx, endCol);
    const cellBanner = ws.getCell(bannerRowIdx, startCol);
    cellBanner.value = 'QUADRO RESUMO CPI';
    cellBanner.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    cellBanner.alignment = { horizontal: 'center', vertical: 'middle' };
    cellBanner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    for (let c = startCol; c <= endCol; c++) ws.getCell(bannerRowIdx, c).border = darkBorder;

    // Column Headers
    const rowResumoHeaders = ws.addRow([]);
    rowResumoHeaders.height = 26;
    const colLabels = [
      'UNIDADE',
      'VALOR TOTAL DISPONIBILIZADO',
      'QUANT. JOE',
      'VALOR EXECUTADO',
      'QUANT. JOE EXECUTADA',
      'VALOR DISPONÍVEL',
      'QUANT. JOE DISPONÍVEL',
    ];
    colLabels.forEach((label, idx) => {
      const cell = rowResumoHeaders.getCell(startCol + idx);
      cell.value = label;
      cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCBD5E1' } };
      cell.border = thinBorder;
    });

    let sTotDisp = 0;
    let sTotQJoe = 0;
    let sTotExec = 0;
    let sTotQExec = 0;

    // Rows CPI, CPA/I-1 to CPA/I-9
    standardCodes.forEach((code) => {
      const def = defaultDisponibilizado[code] || { val: 0, joes: 0 };
      const valTotal = def.val;
      const quantJoe = def.joes;
      const valExec = sumMap[code] || 0;
      const quantExec = sumJoeMap[code] || 0;
      const valDisp = valTotal - valExec;
      const quantDisp = quantJoe - quantExec;

      sTotDisp += valTotal;
      sTotQJoe += quantJoe;
      sTotExec += valExec;
      sTotQExec += quantExec;

      const row = ws.addRow([]);
      row.height = 20;

      const c1 = row.getCell(startCol);
      c1.value = code;
      c1.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
      c1.alignment = { horizontal: 'center', vertical: 'middle' };
      c1.border = thinBorder;

      const c2 = row.getCell(startCol + 1);
      c2.value = valTotal;
      c2.font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
      c2.alignment = { horizontal: 'center', vertical: 'middle' };
      c2.numFmt = '#,##0.00';
      c2.border = thinBorder;

      const c3 = row.getCell(startCol + 2);
      c3.value = quantJoe;
      c3.font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
      c3.alignment = { horizontal: 'center', vertical: 'middle' };
      c3.border = thinBorder;

      const c4 = row.getCell(startCol + 3);
      c4.value = valExec;
      c4.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      c4.alignment = { horizontal: 'center', vertical: 'middle' };
      c4.numFmt = '"R$"\\ #,##0.00';
      c4.border = thinBorder;

      const c5 = row.getCell(startCol + 4);
      c5.value = quantExec;
      c5.font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
      c5.alignment = { horizontal: 'center', vertical: 'middle' };
      c5.border = thinBorder;

      const c6 = row.getCell(startCol + 5);
      c6.value = valDisp;
      c6.font = {
        name: 'Arial',
        size: 10,
        bold: valDisp < 0,
        color: { argb: valDisp < 0 ? 'FFB91C1C' : 'FF0F172A' },
      };
      c6.alignment = { horizontal: 'center', vertical: 'middle' };
      c6.numFmt = '#,##0.00;-#,##0.00;"0,00"';
      c6.border = thinBorder;

      const c7 = row.getCell(startCol + 6);
      c7.value = quantDisp;
      c7.font = {
        name: 'Arial',
        size: 10,
        bold: quantDisp < 0,
        color: { argb: quantDisp < 0 ? 'FFB91C1C' : 'FF0F172A' },
      };
      c7.alignment = { horizontal: 'center', vertical: 'middle' };
      c7.border = thinBorder;
    });

    const sTotDispVal = sTotDisp - sTotExec;
    const sTotQDisp = sTotQJoe - sTotQExec;

    // TOTAL GERAL CPI
    const rowFinalTotal = ws.addRow([]);
    rowFinalTotal.height = 26;

    const totVals = [
      'TOTAL GERAL CPI',
      sTotDisp,
      sTotQJoe,
      sTotExec,
      sTotQExec,
      sTotDispVal,
      sTotQDisp,
    ];
    totVals.forEach((val, idx) => {
      const cell = rowFinalTotal.getCell(startCol + idx);
      cell.value = val;
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCBD5E1' } };
      cell.border = darkBorder;
    });
    rowFinalTotal.getCell(startCol + 1).numFmt = '#,##0.00';
    rowFinalTotal.getCell(startCol + 3).numFmt = '"R$"\\ #,##0.00';
    rowFinalTotal.getCell(startCol + 5).numFmt = '#,##0.00;-#,##0.00;"0,00"';

    const ordNum = ordinance?.number ? ordinance.number.replace(/[^a-zA-Z0-9]/g, '_') : 'GERAL';
    const dateStamp = new Date().toISOString().split('T')[0];
    await saveWorkbook(workbook, `Relatorio_JOE_Com_Quadro_Resumo_${ordNum}_${dateStamp}.xlsx`);
  },

  // 3. Export Full Multi-sheet Workbook (Both Quadro Resumo + Detalhamento)
  async exportFullReport(
    operations: OperationLaunch[],
    ordinance: OrdinancePeriod | null,
    commands: CommandUnit[]
  ): Promise<void> {
    await this.exportDetailedOperations(operations, ordinance);
  },

  // Backward compatible method for Operations Spreadsheet button
  async exportOperationsToExcel(
    operations: OperationLaunch[],
    _budgets: CommandBudget[],
    ordinance: OrdinancePeriod,
    commands: CommandUnit[]
  ): Promise<void> {
    await this.exportDetailedOperations(operations, ordinance);
  },

  // Backward compatible method for Consolidation batches
  async exportConsolidationToExcel(
    batchNumber: string,
    cpaBreakdown: any[],
    operations: OperationLaunch[]
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const wsSummary = workbook.addWorksheet('Resumo Pagadoria');
    wsSummary.columns = [
      { header: 'COMANDO', key: 'command', width: 22 },
      { header: 'QTD OPERAÇÕES', key: 'ops', width: 18 },
      { header: 'EFETIVO EMPREGADO', key: 'officers', width: 20 },
      { header: 'TOTAL JOES', key: 'joes', width: 16 },
      { header: 'VALOR TOTAL (R$)', key: 'amount', width: 22 },
    ];

    cpaBreakdown.forEach((c) => {
      wsSummary.addRow({
        command: formatCommandDisplay(c.commandId),
        ops: c.operationsCount,
        officers: c.officersCount,
        joes: c.joesCount,
        amount: formatCurrencyBRL(c.amount),
      });
    });

    const wsOps = workbook.addWorksheet('Detalhamento Operações');
    wsOps.columns = [
      { header: 'LOTE', key: 'batch', width: 16 },
      { header: 'COMANDO', key: 'cmd', width: 16 },
      { header: 'UNIDADE', key: 'unit', width: 22 },
      { header: 'EVENTO', key: 'event', width: 30 },
      { header: 'ORDEM SERVIÇO', key: 'order', width: 20 },
      { header: 'DATA', key: 'date', width: 14 },
      { header: 'HORÁRIO', key: 'time', width: 16 },
      { header: 'EFETIVO', key: 'officers', width: 12 },
      { header: 'VALOR TOTAL', key: 'total', width: 18 },
      { header: 'PROCESSO SEI', key: 'sei', width: 24 },
    ];

    operations.forEach((op) => {
      wsOps.addRow({
        batch: batchNumber,
        cmd: formatCommandDisplay(op.commandId),
        unit: op.subUnit,
        event: op.eventName,
        order: op.orderNumber,
        date: op.serviceDate,
        time: `${op.startTime} - ${op.endTime}`,
        officers: op.officersCount,
        total: formatCurrencyBRL(op.totalValue),
        sei: op.seiProcessNumber,
      });
    });

    await saveWorkbook(workbook, `CPI_Consolidacao_Pagadoria_${batchNumber.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  },

  // 4. Gerar buffer do Relatório Completo oficial de Backup em Excel contendo Data e Dia da Semana
  async generateCompleteBackupBuffer(
    operations: OperationLaunch[],
    ordinance?: OrdinancePeriod | null,
    currentUser?: User
  ): Promise<{
    buffer: ArrayBuffer;
    fileName: string;
    dayOfWeek: string;
    dateStamp: string;
    timeStamp: string;
    readableDate: string;
    totalAmount: number;
    totalJoes: number;
  }> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = currentUser?.name || 'Seção Operacional CPI/PMMA';
    workbook.lastModifiedBy = currentUser?.name || 'Sistema JOE CPI';
    workbook.created = new Date();
    workbook.modified = new Date();

    const now = new Date();
    const daysPt = [
      'Domingo',
      'Segunda-Feira',
      'Terça-Feira',
      'Quarta-Feira',
      'Quinta-Feira',
      'Sexta-Feira',
      'Sábado',
    ];
    const dayOfWeek = daysPt[now.getDay()];
    const pad = (n: number) => n.toString().padStart(2, '0');
    const day = pad(now.getDate());
    const month = pad(now.getMonth() + 1);
    const year = now.getFullYear();
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());

    const dateStamp = `${day}-${month}-${year}`;
    const timeStamp = `${hours}h${minutes}min`;
    const readableDate = `${dayOfWeek}, ${day}/${month}/${year} às ${hours}:${minutes}`;
    const fileName = `Backup_Relatorio_Completo_CPI_PMMA_${dateStamp}_${dayOfWeek}_${timeStamp}.xlsx`;

    // Sort operations in official ascending order: CPI -> CPA/I-1 to CPA/I-9
    const sortedOps = sortOperationsOfficial(operations);

    // ==========================================
    // ABA 1: QUADRO RESUMO CPI (PRINT 02 OFICIAL)
    // ==========================================
    const wsResumo = workbook.addWorksheet('Quadro Resumo CPI', {
      views: [{ showGridLines: true }],
    });

    wsResumo.columns = [
      { width: 4 },  // A
      { width: 18 }, // B: UNIDADE
      { width: 32 }, // C: VALOR TOTAL DISPONIBILIZADO
      { width: 18 }, // D: QUANT. JOE
      { width: 24 }, // E: VALOR EXECUTADO
      { width: 26 }, // F: QUANT. JOE EXECUTADA
      { width: 24 }, // G: VALOR DISPONÍVEL
      { width: 26 }, // H: QUANT. JOE DISPONÍVEL
    ];

    wsResumo.addRow([]);

    // Header CPI
    const r1 = wsResumo.addRow(['', 'CPI - COMANDO DE POLICIAMENTO DO INTERIOR', '', '', '', '', '', '']);
    wsResumo.mergeCells('B2:H2');
    r1.getCell(2).font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF0F172A' } };
    r1.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    r1.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    for (let c = 2; c <= 8; c++) r1.getCell(c).border = darkBorder;
    r1.height = 28;

    // Subheader
    const r2 = wsResumo.addRow(['', `QUADRO RESUMO OFICIAL DE EXECUÇÃO - ${ordinance?.number || 'PORTARIA Nº 127/2026'}`.toUpperCase(), '', '', '', '', '', '']);
    wsResumo.mergeCells('B3:H3');
    r2.getCell(2).font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
    r2.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    r2.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    for (let c = 2; c <= 8; c++) r2.getCell(c).border = darkBorder;
    r2.height = 24;

    // Table Header
    const rH = wsResumo.addRow([
      '',
      'UNIDADE',
      'VALOR TOTAL DISPONIBILIZADO',
      'QUANT. JOE',
      'VALOR EXECUTADO',
      'QUANT. JOE EXECUTADA',
      'VALOR DISPONÍVEL',
      'QUANT. JOE DISPONÍVEL',
    ]);
    rH.height = 26;
    for (let c = 2; c <= 8; c++) {
      const cell = rH.getCell(c);
      cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCBD5E1' } };
      cell.border = thinBorder;
    }

    const standardCodes = [...OFFICIAL_COMMAND_CODES];
    const officialCotas = getOfficialCotasForOrdinance(ordinance);
    const defaultDisponibilizado: Record<string, { val: number; joes: number }> = {};
    standardCodes.forEach((code) => {
      const cota = officialCotas[code] || { amount: 0, joes: 0 };
      defaultDisponibilizado[code] = { val: cota.amount, joes: cota.joes };
    });

    const sumMap: Record<string, number> = {};
    const sumJoeMap: Record<string, number> = {};
    standardCodes.forEach((code) => {
      sumMap[code] = 0;
      sumJoeMap[code] = 0;
    });

    sortedOps.forEach((op) => {
      const formatted = normalizeCommandName(op.commandId);
      const val = Number(op.totalValue) || 0;
      const joes = Number(op.officersCount) || 0;
      if (sumMap[formatted] !== undefined) {
        sumMap[formatted] += val;
        sumJoeMap[formatted] += joes;
      } else {
        const match = standardCodes.find((sc) => normalizeCommandName(formatted) === sc);
        if (match) {
          sumMap[match] += val;
          sumJoeMap[match] += joes;
        }
      }
    });

    let totDisp = 0;
    let totQJoe = 0;
    let totExec = 0;
    let totQExec = 0;

    standardCodes.forEach((code) => {
      const def = defaultDisponibilizado[code] || { val: 0, joes: 0 };
      const valTotal = def.val;
      const quantJoe = def.joes;
      const valExec = sumMap[code] || 0;
      const quantExec = sumJoeMap[code] || 0;
      const valDisp = valTotal - valExec;
      const quantDisp = quantJoe - quantExec;

      totDisp += valTotal;
      totQJoe += quantJoe;
      totExec += valExec;
      totQExec += quantExec;

      const row = wsResumo.addRow(['', code, valTotal, quantJoe, valExec, quantExec, valDisp, quantDisp]);
      row.height = 20;

      const cellCode = row.getCell(2);
      cellCode.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
      cellCode.alignment = { horizontal: 'center', vertical: 'middle' };
      cellCode.border = thinBorder;

      const cellTot = row.getCell(3);
      cellTot.font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
      cellTot.alignment = { horizontal: 'center', vertical: 'middle' };
      cellTot.numFmt = '#,##0.00';
      cellTot.border = thinBorder;

      const cellQJoe = row.getCell(4);
      cellQJoe.font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
      cellQJoe.alignment = { horizontal: 'center', vertical: 'middle' };
      cellQJoe.border = thinBorder;

      const cellExec = row.getCell(5);
      cellExec.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      cellExec.alignment = { horizontal: 'center', vertical: 'middle' };
      cellExec.numFmt = '"R$"\\ #,##0.00';
      cellExec.border = thinBorder;

      const cellQExec = row.getCell(6);
      cellQExec.font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
      cellQExec.alignment = { horizontal: 'center', vertical: 'middle' };
      cellQExec.border = thinBorder;

      const cellDisp = row.getCell(7);
      cellDisp.font = {
        name: 'Arial',
        size: 10,
        bold: valDisp < 0,
        color: { argb: valDisp < 0 ? 'FFB91C1C' : 'FF0F172A' },
      };
      cellDisp.alignment = { horizontal: 'center', vertical: 'middle' };
      cellDisp.numFmt = '#,##0.00;-#,##0.00;"0,00"';
      cellDisp.border = thinBorder;

      const cellQDisp = row.getCell(8);
      cellQDisp.font = {
        name: 'Arial',
        size: 10,
        bold: quantDisp < 0,
        color: { argb: quantDisp < 0 ? 'FFB91C1C' : 'FF0F172A' },
      };
      cellQDisp.alignment = { horizontal: 'center', vertical: 'middle' };
      cellQDisp.border = thinBorder;
    });

    const totDispVal = totDisp - totExec;
    const totQDisp = totQJoe - totQExec;

    // TOTAL GERAL CPI
    const rowTotResumo = wsResumo.addRow([
      '',
      'TOTAL GERAL CPI',
      totDisp,
      totQJoe,
      totExec,
      totQExec,
      totDispVal,
      totQDisp,
    ]);
    rowTotResumo.height = 26;
    for (let c = 2; c <= 8; c++) {
      const cell = rowTotResumo.getCell(c);
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCBD5E1' } };
      cell.border = darkBorder;
    }
    rowTotResumo.getCell(3).numFmt = '#,##0.00';
    rowTotResumo.getCell(5).numFmt = '"R$"\\ #,##0.00';
    rowTotResumo.getCell(7).numFmt = '#,##0.00;-#,##0.00;"0,00"';

    // ==========================================
    // ABA 2: DETALHAMENTO DAS OPERAÇÕES JOE
    // ==========================================
    const wsOps = workbook.addWorksheet('Detalhamento Operações JOE', {
      views: [{ showGridLines: true }],
    });

    const opsColumns = [
      { id: 'command', label: 'COMANDO', width: 14 },
      { id: 'subUnit', label: 'UNIDADE', width: 22 },
      { id: 'justification', label: 'JUSTIFICATIVA DA CRIAÇÃO DA JOE', width: 40 },
      { id: 'order', label: 'ORDEM DE SERVIÇO/OPERAÇÃO', width: 24 },
      { id: 'eventName', label: 'NOME DO EVENTO', width: 30 },
      { id: 'date', label: 'DATA', width: 14 },
      { id: 'time', label: 'HORÁRIO', width: 18 },
      { id: 'officers', label: 'EFETIVO EMPREGADO', width: 20 },
      { id: 'unitValue', label: 'VALOR UNITÁRIO', width: 18 },
      { id: 'totalValue', label: 'VALOR TOTAL', width: 20 },
    ];

    wsOps.columns = opsColumns.map((c) => ({ width: c.width }));

    const rOpsHead = wsOps.addRow(opsColumns.map((c) => c.label));
    rOpsHead.height = 26;
    rOpsHead.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = thinBorder;
    });

    let opsTotalAmount = 0;
    let opsTotalOfficers = 0;

    sortedOps.forEach((op) => {
      const valTot = Number(op.totalValue) || 0;
      const offCount = Number(op.officersCount) || 0;
      opsTotalAmount += valTot;
      opsTotalOfficers += offCount;

      let dateFormatted = op.serviceDate || '';
      if (dateFormatted.includes('-')) {
        const parts = dateFormatted.split('-');
        if (parts.length === 3) dateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }

      const orderStr = op.orderNumber
        ? `${op.orderType === 'ORDEM_DE_OPERACAO' ? 'OO' : 'OS'} ${op.orderNumber}`
        : '';
      const timeStr = op.startTime
        ? op.endTime
          ? `${op.startTime} às ${op.endTime}`
          : op.startTime
        : '20h às 02h';

      const row = wsOps.addRow([
        formatCommandDisplay(op.commandId),
        op.subUnit || formatCommandDisplay(op.commandId),
        op.justification || '',
        orderStr,
        op.eventName || '',
        dateFormatted,
        timeStr,
        offCount,
        Number(op.unitValue) || 350,
        valTot,
      ]);
      row.height = 24;

      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 9, color: { argb: 'FF1E293B' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = thinBorder;

        if (colNumber === 8) {
          cell.numFmt = '#,##0';
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F172A' } };
        } else if (colNumber === 9 || colNumber === 10) {
          cell.numFmt = '"R$"\\ #,##0.00';
          if (colNumber === 10) {
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F172A' } };
          }
        }
      });
    });

    // Total row in Detalhamento
    const rOpsTot = wsOps.addRow([
      'TOTAL GERAL',
      '',
      '',
      '',
      '',
      '',
      '',
      opsTotalOfficers,
      '',
      opsTotalAmount,
    ]);
    rOpsTot.height = 26;
    rOpsTot.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      cell.border = darkBorder;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };

      if (colNumber === 8) cell.numFmt = '#,##0';
      if (colNumber === 10) cell.numFmt = '"R$"\\ #,##0.00';
    });

    // ==========================================
    // ABA 3: AUDITORIA E METADADOS DO BACKUP
    // ==========================================
    const wsAudit = workbook.addWorksheet('Auditoria e Metadados', {
      views: [{ showGridLines: true }],
    });

    wsAudit.columns = [
      { width: 4 },
      { width: 32 },
      { width: 55 },
    ];

    wsAudit.addRow([]);
    const rAudTitle = wsAudit.addRow(['', 'REGISTRO OFICIAL DE BACKUP DO SISTEMA', '']);
    wsAudit.mergeCells('B2:C2');
    rAudTitle.getCell(2).font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF002D5A' } };
    rAudTitle.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    rAudTitle.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    for (let c = 2; c <= 3; c++) rAudTitle.getCell(c).border = darkBorder;
    rAudTitle.height = 28;

    const auditData = [
      ['Dia da Semana', dayOfWeek],
      ['Data de Geração', `${day}/${month}/${year}`],
      ['Horário de Salvamento', `${hours}:${minutes}:${pad(now.getSeconds())}`],
      ['Timestamp do Arquivo', `${dateStamp}_${dayOfWeek}_${timeStamp}`],
      ['Nome do Arquivo Oficial', fileName],
      ['Pasta Oficial no Google Drive', 'https://drive.google.com/drive/folders/1rk7Urwzl1uyoJGNDPT23VTbFTzlNcQQP?usp=sharing'],
      ['ID da Pasta Google Drive', '1rk7Urwzl1uyoJGNDPT23VTbFTzlNcQQP'],
      ['E-mail Oficial Vinculado', 'secaooperacional.cpi.pmma@gmail.com'],
      ['Usuário Responsável', currentUser ? `${currentUser.name} (${currentUser.role})` : 'Sistema Automático CPI'],
      ['Portaria de Referência', ordinance?.number || 'Portaria nº 127/2026 – GCG'],
      ['Total de Operações Salvas', `${sortedOps.length} operações`],
      ['Total de JOEs Empregadas', `${totQExec} JOEs`],
      ['Valor Total Executado', formatCurrencyBRL(totExec)],
      ['Teto Total Disponibilizado', formatCurrencyBRL(totDisp)],
      ['Saldo Disponível Geral', formatCurrencyBRL(totDispVal)],
    ];

    auditData.forEach(([label, val]) => {
      const r = wsAudit.addRow(['', label, val]);
      r.height = 22;
      const cLabel = r.getCell(2);
      cLabel.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF1E293B' } };
      cLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      cLabel.border = thinBorder;
      cLabel.alignment = { vertical: 'middle' };

      const cVal = r.getCell(3);
      cVal.font = { name: 'Arial', size: 9.5, color: { argb: 'FF0F172A' } };
      cVal.border = thinBorder;
      cVal.alignment = { vertical: 'middle' };
    });

    const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;

    return {
      buffer,
      fileName,
      dayOfWeek,
      dateStamp,
      timeStamp,
      readableDate,
      totalAmount: totExec,
      totalJoes: totQExec,
    };
  },
};

