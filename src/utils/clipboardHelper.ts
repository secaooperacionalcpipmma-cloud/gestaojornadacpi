/**
 * Utilitário para Cópia Formatada de Tabelas e Relatórios para Word / Google Docs / SEI / Excel
 * Gera HTML estruturado com estilos inline e compatibilidade total MSO (Microsoft Office),
 * mantendo alinhamentos, bordas, cores de cabeçalho, tipografia, larguras e formatação de valores em R$.
 */

import { formatCurrencyBRL, formatInteger } from './formatters';
import { OperationLaunch, OrdinancePeriod } from '../types';

export interface ReportColumnConfig {
  id: string;
  tableHeader: string;
  getter: (op: OperationLaunch) => string | number;
}

export interface QuadroResumoItem {
  code: string;
  amount: number;
}

export interface QuadroResumoData {
  rows: QuadroResumoItem[];
  totalGeral: number;
}

/**
 * Executa a cópia de HTML formatado + Texto plano para a área de transferência.
 * Permite colar diretamente com todas as cores, grades e fontes no Microsoft Word, Google Docs e SEI.
 */
export async function copyFormattedHtmlToClipboard(htmlContent: string, plainText: string): Promise<boolean> {
  const fullHtmlDocument = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="generator" content="CPI PMMA - Gestão JOE">
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 10pt; color: #1e293b; }
  table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; font-family: Calibri, Arial, sans-serif; font-size: 9.5pt; }
  th, td { border: 1px solid #94a3b8; padding: 6px 8px; }
  th { background-color: #002D5A; color: #ffffff; font-weight: bold; text-align: center; text-transform: uppercase; }
  .total-row { background-color: #e2e8f0; font-weight: bold; }
</style>
</head>
<body>
${htmlContent}
</body>
</html>`;

  // Tentativa 1: API moderna ClipboardItem (suporta HTML e texto plano simultâneos)
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof window !== 'undefined' && window.ClipboardItem) {
    try {
      const htmlBlob = new Blob([fullHtmlDocument], { type: 'text/html' });
      const textBlob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
      const data = [
        new window.ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        }),
      ];
      await navigator.clipboard.write(data);
      return true;
    } catch (err) {
      console.warn('Falha no navigator.clipboard.write com ClipboardItem, tentando fallback DOM:', err);
    }
  }

  // Tentativa 2: Fallback com elemento DOM temporário e execCommand('copy')
  try {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.contentEditable = 'true';
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.opacity = '0';
    tempDiv.style.pointerEvents = 'none';
    document.body.appendChild(tempDiv);

    const range = document.createRange();
    range.selectNodeContents(tempDiv);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
      const success = document.execCommand('copy');
      selection.removeAllRanges();
      document.body.removeChild(tempDiv);
      if (success) return true;
    } else {
      document.body.removeChild(tempDiv);
    }
  } catch (err) {
    console.warn('Falha no fallback de cópia DOM:', err);
  }

  // Tentativa 3: Texto plano direto via navigator.clipboard.writeText
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(plainText);
      return true;
    } catch (err) {
      console.error('Falha geral ao copiar texto:', err);
      return false;
    }
  }

  return false;
}

/**
 * Gera o HTML completo da Planilha Detalhada de Lançamentos com estilos inline compatíveis com Word
 */
export function buildDetailedTableHtml(
  operations: OperationLaunch[],
  columns: ReportColumnConfig[],
  ordinance?: OrdinancePeriod,
  totalOfficers = 0,
  totalAmount = 0
): { html: string; plain: string } {
  const ordName = ordinance?.name || ordinance?.number || 'Portaria Vigente';

  let html = `
  <div style="font-family: Calibri, Arial, sans-serif; font-size: 10pt; color: #1e293b; margin-bottom: 24px;">
    <div style="text-align: center; margin-bottom: 12px;">
      <h3 style="margin: 0 0 4px 0; font-size: 12pt; color: #002D5A; text-transform: uppercase; font-weight: bold; font-family: Calibri, Arial, sans-serif;">
        POLÍCIA MILITAR DO MARANHÃO — COMANDO DE POLICIAMENTO DO INTERIOR (CPI)
      </h3>
      <p style="margin: 0; font-size: 9.5pt; color: #334155; font-weight: bold; font-family: Calibri, Arial, sans-serif;">
        PLANILHA DETALHADA DE LANÇAMENTOS DE JOE • ${ordName}
      </p>
    </div>

    <table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 9.5pt; border: 1.5pt solid #002D5A; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
      <thead>
        <tr style="background-color: #002D5A; color: #ffffff;">
  `;

  let plain = `POLÍCIA MILITAR DO MARANHÃO — COMANDO DE POLICIAMENTO DO INTERIOR (CPI)\n`;
  plain += `PLANILHA DETALHADA DE LANÇAMENTOS DE JOE • ${ordName}\n\n`;

  // Cabeçalhos
  const headerTexts: string[] = [];
  columns.forEach((col) => {
    headerTexts.push(col.tableHeader);
    html += `
      <th style="padding: 8px 6px; border: 1px solid #1e293b; background-color: #002D5A; text-align: center; font-weight: bold; font-size: 9pt; color: #ffffff; text-transform: uppercase; font-family: Calibri, Arial, sans-serif;">
        ${col.tableHeader}
      </th>`;
  });
  html += `</tr></thead><tbody>`;
  plain += headerTexts.join('\t') + '\n';

  // Linhas da tabela
  if (operations.length === 0) {
    html += `
      <tr>
        <td colspan="${columns.length}" style="padding: 16px; text-align: center; color: #64748b; border: 1px solid #cbd5e1; font-style: italic;">
          Nenhum registro encontrado para os filtros selecionados.
        </td>
      </tr>`;
    plain += `Nenhum registro encontrado.\n`;
  } else {
    operations.forEach((op, index) => {
      const bgColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
      html += `<tr style="background-color: ${bgColor};">`;
      const rowTexts: string[] = [];

      columns.forEach((col) => {
        const val = col.getter(op);
        let displayVal: string;
        if (typeof val === 'number') {
          if (col.id === 'totalValue' || col.id === 'unitValue') {
            displayVal = formatCurrencyBRL(val);
          } else if (col.id === 'officersCount') {
            displayVal = formatInteger(val);
          } else {
            displayVal = String(val);
          }
        } else {
          displayVal = String(val !== undefined && val !== null ? val : '-');
        }

        rowTexts.push(displayVal);

        const isBold = col.id === 'totalValue' || col.id === 'unitValue' || col.id === 'officersCount' || col.id === 'commandId';
        const fontWeight = isBold ? 'font-weight: bold;' : 'font-weight: normal;';
        const textColor = col.id === 'totalValue' ? 'color: #002D5A;' : 'color: #1e293b;';
        const textAlign = col.id === 'justification' || col.id === 'eventName' ? 'text-align: left;' : 'text-align: center;';

        html += `
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; ${textAlign} font-size: 9pt; ${fontWeight} ${textColor} font-family: Calibri, Arial, sans-serif;">
            ${displayVal}
          </td>`;
      });

      html += `</tr>`;
      plain += rowTexts.join('\t') + '\n';
    });
  }

  // Linha de Total Geral (TOTAL UNIDADE)
  if (operations.length > 0) {
    html += `
      <tr style="background-color: #e2e8f0; font-weight: bold; border-top: 2pt solid #002D5A;">
    `;
    const totalRowTexts: string[] = [];

    columns.forEach((col, idx) => {
      if (idx === 0) {
        html += `
          <td style="padding: 8px 6px; border: 1px solid #94a3b8; background-color: #e2e8f0; text-align: center; font-weight: bold; color: #0f172a; text-transform: uppercase; font-size: 9.5pt; font-family: Calibri, Arial, sans-serif;">
            TOTAL UNIDADE
          </td>`;
        totalRowTexts.push('TOTAL UNIDADE');
      } else if (col.id === 'totalValue') {
        const formatted = formatCurrencyBRL(totalAmount);
        html += `
          <td style="padding: 8px 6px; border: 1px solid #94a3b8; background-color: #e2e8f0; text-align: center; font-weight: bold; color: #002D5A; font-size: 9.5pt; font-family: Calibri, Arial, sans-serif;">
            ${formatted}
          </td>`;
        totalRowTexts.push(formatted);
      } else if (col.id === 'officersCount') {
        const formatted = formatInteger(totalOfficers);
        html += `
          <td style="padding: 8px 6px; border: 1px solid #94a3b8; background-color: #e2e8f0; text-align: center; font-weight: bold; color: #0f172a; font-size: 9.5pt; font-family: Calibri, Arial, sans-serif;">
            ${formatted}
          </td>`;
        totalRowTexts.push(formatted);
      } else {
        html += `<td style="padding: 8px 6px; border: 1px solid #94a3b8; background-color: #e2e8f0; text-align: center; font-family: Calibri, Arial, sans-serif;">-</td>`;
        totalRowTexts.push('-');
      }
    });

    html += `</tr>`;
    plain += totalRowTexts.join('\t') + '\n';
  }

  html += `</tbody></table></div>`;

  return { html, plain };
}

/**
 * Gera o HTML do Quadro Resumo Geral do CPI com estilos inline compatíveis com Word
 */
export function buildQuadroResumoHtml(
  quadroResumoData: QuadroResumoData,
  ordinance?: OrdinancePeriod
): { html: string; plain: string } {
  const ordName = ordinance?.name || ordinance?.number || 'Portaria Vigente';

  let html = `
  <div style="font-family: Calibri, Arial, sans-serif; font-size: 10pt; color: #1e293b; max-width: 480px; margin: 0 auto 20px auto;">
    <table border="2" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 9.5pt; border: 2pt solid #000000; text-align: center; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
      <thead>
        <tr>
          <th colspan="2" style="background-color: #ffffff; color: #000000; padding: 8px; font-size: 13pt; font-weight: bold; text-align: center; border-bottom: 2pt solid #000000; letter-spacing: 2px; font-family: Calibri, Arial, sans-serif;">
            CPI
          </th>
        </tr>
        <tr>
          <th colspan="2" style="background-color: #f1f5f9; color: #0f172a; padding: 6px; font-size: 10pt; font-weight: bold; text-align: center; border-bottom: 2pt solid #000000; text-transform: uppercase; letter-spacing: 1px; font-family: Calibri, Arial, sans-serif;">
            QUADRO RESUMO CPI
          </th>
        </tr>
        <tr style="background-color: #e2e8f0; color: #0f172a;">
          <th style="padding: 6px 12px; border: 1px solid #64748b; background-color: #e2e8f0; text-align: center; font-weight: bold; font-size: 9pt; width: 50%; text-transform: uppercase; font-family: Calibri, Arial, sans-serif;">
            UNIDADE
          </th>
          <th style="padding: 6px 12px; border: 1px solid #64748b; background-color: #e2e8f0; text-align: center; font-weight: bold; font-size: 9pt; width: 50%; text-transform: uppercase; font-family: Calibri, Arial, sans-serif;">
            VALOR
          </th>
        </tr>
      </thead>
      <tbody>
  `;

  let plain = `CPI\nQUADRO RESUMO CPI • ${ordName}\n\nUNIDADE\tVALOR\n`;

  quadroResumoData.rows.forEach((row, idx) => {
    const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
    const formattedAmount = row.amount > 0 ? formatCurrencyBRL(row.amount) : 'R$ 0,00';
    html += `
      <tr style="background-color: ${bg};">
        <td style="padding: 6px 12px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #0f172a; font-family: Calibri, Arial, sans-serif;">
          ${row.code}
        </td>
        <td style="padding: 6px 12px; border: 1px solid #cbd5e1; text-align: center; color: #0f172a; font-family: Calibri, Arial, sans-serif;">
          ${formattedAmount}
        </td>
      </tr>`;
    plain += `${row.code}\t${formattedAmount}\n`;
  });

  const formattedTotal = formatCurrencyBRL(quadroResumoData.totalGeral);
  html += `
      <tr style="background-color: #e2e8f0; font-weight: bold; border-top: 2pt solid #000000;">
        <td style="padding: 8px 12px; border: 1px solid #475569; background-color: #e2e8f0; text-align: center; font-weight: bold; font-size: 9.5pt; color: #000000; text-transform: uppercase; font-family: Calibri, Arial, sans-serif;">
          TOTAL GERAL CPI
        </td>
        <td style="padding: 8px 12px; border: 1px solid #475569; background-color: #e2e8f0; text-align: center; font-weight: bold; font-size: 9.5pt; color: #000000; font-family: Calibri, Arial, sans-serif;">
          ${formattedTotal}
        </td>
      </tr>
    </tbody>
  </table>
  </div>
  `;

  plain += `TOTAL GERAL CPI\t${formattedTotal}\n`;

  return { html, plain };
}

/**
 * Gera o Relatório Integrado Completo (Planilha Detalhada + Espaço + Quadro Resumo CPI)
 */
export function buildUnifiedReportHtml(
  operations: OperationLaunch[],
  columns: ReportColumnConfig[],
  quadroResumoData: QuadroResumoData,
  ordinance?: OrdinancePeriod,
  totalOfficers = 0,
  totalAmount = 0
): { html: string; plain: string } {
  const detailed = buildDetailedTableHtml(operations, columns, ordinance, totalOfficers, totalAmount);
  const resumo = buildQuadroResumoHtml(quadroResumoData, ordinance);

  const html = `
  <div style="font-family: Calibri, Arial, sans-serif; color: #1e293b;">
    ${detailed.html}
    <div style="margin: 32px 0 24px 0; border-top: 1px dashed #94a3b8; padding-top: 16px; text-align: center;">
      <p style="margin: 0; font-size: 9pt; color: #64748b; font-style: italic; font-family: Calibri, Arial, sans-serif;">
        — Quadro Resumo Consolidado do Comando de Policiamento do Interior (CPI) —
      </p>
    </div>
    ${resumo.html}
  </div>
  `;

  const plain = `${detailed.plain}\n----------------------------------------\n\n${resumo.plain}`;

  return { html, plain };
}

