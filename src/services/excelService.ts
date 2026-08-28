import ExcelJS from 'exceljs';
import { OperationLaunch, CommandBudget, OrdinancePeriod, CommandUnit } from '../types';
import { formatCurrencyBRL } from '../utils/formatters';
import {
  normalizeCommandName,
  getCommandOrderIndex,
  OFFICIAL_COMMAND_CODES,
} from '../utils/commandUtils';

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

    const sumMap: Record<string, number> = {};
    standardCodes.forEach((code) => {
      sumMap[code] = 0;
    });

    let totalGeral = 0;
    operations.forEach((op) => {
      const formatted = normalizeCommandName(op.commandId);
      const val = Number(op.totalValue) || 0;
      totalGeral += val;
      if (sumMap[formatted] !== undefined) {
        sumMap[formatted] += val;
      } else {
        const match = standardCodes.find((sc) => normalizeCommandName(formatted) === sc);
        if (match) {
          sumMap[match] += val;
        }
      }
    });

    ws.columns = [
      { width: 4 },  // Margin column A
      { width: 28 }, // UNIDADE B
      { width: 28 }, // VALOR C
    ];

    // Blank top
    ws.addRow([]);

    // 1. Header Box: CPI
    const rowCPI = ws.addRow(['', 'CPI', '']);
    ws.mergeCells('B2:C2');
    rowCPI.getCell(2).font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0F172A' } };
    rowCPI.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    rowCPI.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    rowCPI.getCell(2).border = darkBorder;
    rowCPI.getCell(3).border = darkBorder;
    rowCPI.height = 28;

    // 2. Subheader Banner: QUADRO RESUMO CPI
    const rowBanner = ws.addRow(['', 'QUADRO RESUMO CPI', '']);
    ws.mergeCells('B3:C3');
    rowBanner.getCell(2).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    rowBanner.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    rowBanner.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    rowBanner.getCell(2).border = darkBorder;
    rowBanner.getCell(3).border = darkBorder;
    rowBanner.height = 24;

    // 3. Table Column Headers: UNIDADE / VALOR
    const rowHeaders = ws.addRow(['', 'UNIDADE', 'VALOR']);
    [2, 3].forEach((colIdx) => {
      const cell = rowHeaders.getCell(colIdx);
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      cell.border = thinBorder;
    });
    rowHeaders.height = 22;

    // 4. Rows CPAI-1 to CPAI-9
    standardCodes.forEach((code) => {
      const amount = sumMap[code];
      const row = ws.addRow(['', code, amount]);
      const cellCode = row.getCell(2);
      const cellVal = row.getCell(3);

      cellCode.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
      cellCode.alignment = { horizontal: 'center', vertical: 'middle' };
      cellCode.border = thinBorder;

      cellVal.font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
      cellVal.alignment = { horizontal: 'center', vertical: 'middle' };
      cellVal.numFmt = '"R$"\\ #,##0.00';
      cellVal.border = thinBorder;
      row.height = 20;
    });

    // 5. Total Row: TOTAL GERAL CPI
    const rowTotal = ws.addRow(['', 'TOTAL GERAL CPI', totalGeral]);
    const cellTotalLabel = rowTotal.getCell(2);
    const cellTotalVal = rowTotal.getCell(3);

    cellTotalLabel.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    cellTotalLabel.alignment = { horizontal: 'center', vertical: 'middle' };
    cellTotalLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cellTotalLabel.border = darkBorder;

    cellTotalVal.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    cellTotalVal.alignment = { horizontal: 'center', vertical: 'middle' };
    cellTotalVal.numFmt = '"R$"\\ #,##0.00';
    cellTotalVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cellTotalVal.border = darkBorder;
    rowTotal.height = 26;

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

    // --- 5. QUADRO RESUMO CPI (PRINT 02) ---
    const standardCodes = [
      'CPAI-1',
      'CPAI-2',
      'CPAI-3',
      'CPAI-4',
      'CPAI-5',
      'CPAI-6',
      'CPAI-7',
      'CPAI-8',
      'CPAI-9',
    ];

    const sumMap: Record<string, number> = {};
    standardCodes.forEach((code) => {
      sumMap[code] = 0;
    });

    let totalGeralCPI = 0;
    sortedOps.forEach((op) => {
      const formatted = formatCommandDisplay(op.commandId);
      const val = Number(op.totalValue) || 0;
      totalGeralCPI += val;
      if (sumMap[formatted] !== undefined) {
        sumMap[formatted] += val;
      } else {
        const match = standardCodes.find((sc) => formatted.includes(sc.replace('CPAI-', '')));
        if (match) {
          sumMap[match] += val;
        }
      }
    });

    // Centered columns for summary table
    const startCol = Math.max(Math.floor(activeCols.length / 2) - 1, 2);
    const endCol = startCol + 1;

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
    cellCPI.border = darkBorder;
    ws.getCell(startRowIdx, endCol).border = darkBorder;

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
    cellBanner.border = darkBorder;
    ws.getCell(bannerRowIdx, endCol).border = darkBorder;

    // Columns UNIDADE / VALOR
    const rowResumoHeaders = ws.addRow([]);
    rowResumoHeaders.height = 22;
    const cellH1 = rowResumoHeaders.getCell(startCol);
    const cellH2 = rowResumoHeaders.getCell(endCol);

    cellH1.value = 'UNIDADE';
    cellH1.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cellH1.alignment = { horizontal: 'center', vertical: 'middle' };
    cellH1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cellH1.border = thinBorder;

    cellH2.value = 'VALOR';
    cellH2.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cellH2.alignment = { horizontal: 'center', vertical: 'middle' };
    cellH2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cellH2.border = thinBorder;

    // Rows CPAI-1 to CPAI-9
    standardCodes.forEach((code) => {
      const amount = sumMap[code];
      const row = ws.addRow([]);
      row.height = 20;

      const c1 = row.getCell(startCol);
      const c2 = row.getCell(endCol);

      c1.value = code;
      c1.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
      c1.alignment = { horizontal: 'center', vertical: 'middle' };
      c1.border = thinBorder;

      c2.value = amount;
      c2.font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
      c2.alignment = { horizontal: 'center', vertical: 'middle' };
      c2.numFmt = '"R$"\\ #,##0.00';
      c2.border = thinBorder;
    });

    // TOTAL GERAL CPI
    const rowFinalTotal = ws.addRow([]);
    rowFinalTotal.height = 26;
    const cTotalLabel = rowFinalTotal.getCell(startCol);
    const cTotalVal = rowFinalTotal.getCell(endCol);

    cTotalLabel.value = 'TOTAL GERAL CPI';
    cTotalLabel.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    cTotalLabel.alignment = { horizontal: 'center', vertical: 'middle' };
    cTotalLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cTotalLabel.border = darkBorder;

    cTotalVal.value = totalGeralCPI;
    cTotalVal.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    cTotalVal.alignment = { horizontal: 'center', vertical: 'middle' };
    cTotalVal.numFmt = '"R$"\\ #,##0.00';
    cTotalVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cTotalVal.border = darkBorder;

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
};
