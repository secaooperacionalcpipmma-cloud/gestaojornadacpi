import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OperationLaunch, CommandBudget, WeeklyBatchConsolidation, OrdinancePeriod, CommandUnit } from '../types';
import { LegislationDocument, CpiExecutiveSummary } from '../data/legislationData';
import { formatCurrencyBRL, formatInteger } from '../utils/formatters';
import { formatCommandDisplay, sortOperationsOfficial } from './excelService';

export const pdfService = {
  // Official Portaria PDF Generator (Primeiro Anexo)
  generateOfficialPortariaPDF(docData: LegislationDocument): void {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 18;
    const printableWidth = pageWidth - margin * 2;

    const addHeaderAndFooter = (pageNum: number, totalPages: number) => {
      // Top Institutional Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('GOVERNO DO ESTADO DO MARANHÃO', pageWidth / 2, 14, { align: 'center' });
      doc.setFontSize(9);
      doc.text('POLÍCIA MILITAR DO MARANHÃO', pageWidth / 2, 19, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(0, 45, 90);
      doc.text(docData.ordinanceNumber, pageWidth / 2, 25, { align: 'center' });

      // Thin separator
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(margin, 28, pageWidth - margin, 28);

      // Footer
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      const seiText = `Portaria SEI (${docData.seiDocument || '016909457'}) · Processo SEI ${docData.seiProcess || '2026.190110.35458'}`;
      doc.text(seiText, margin, pageHeight - 8);
      doc.text(`Página ${pageNum}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    };

    let y = 34;

    // Preamble & Description
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const splitPreamble = doc.splitTextToSize(docData.preamble, printableWidth);
    doc.text(splitPreamble, margin, y);
    y += splitPreamble.length * 4.2 + 4;

    // Considerations
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);

    docData.considerations.forEach((cons) => {
      const splitCons = doc.splitTextToSize(cons, printableWidth);
      if (y + splitCons.length * 3.8 > pageHeight - 20) {
        doc.addPage();
        y = 34;
      }
      doc.text(splitCons, margin, y);
      y += splitCons.length * 3.8 + 2;
    });

    // RESOLVE text
    if (y + 12 > pageHeight - 20) {
      doc.addPage();
      y = 34;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 45, 90);
    doc.text('RESOLVE:', margin, y + 2);
    y += 8;

    // Chapters & Articles
    docData.chapters.forEach((chap) => {
      if (y + 16 > pageHeight - 20) {
        doc.addPage();
        y = 34;
      }

      // Chapter title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`${chap.number} — ${chap.title}`, margin, y);
      y += 5.5;

      chap.articles.forEach((art) => {
        const fullArtText = `${art.number} ${art.text}`;
        const splitArt = doc.splitTextToSize(fullArtText, printableWidth);

        if (y + splitArt.length * 3.8 > pageHeight - 20) {
          doc.addPage();
          y = 34;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(art.number, margin, y);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        const artBodyText = doc.splitTextToSize(art.text, printableWidth - 14);
        doc.text(artBodyText, margin + 14, y);
        y += artBodyText.length * 3.8 + 1.5;

        // Items (I, II, III...)
        if (art.items && art.items.length > 0) {
          art.items.forEach((item) => {
            const splitItem = doc.splitTextToSize(item, printableWidth - 10);
            if (y + splitItem.length * 3.6 > pageHeight - 20) {
              doc.addPage();
              y = 34;
            }
            doc.text(splitItem, margin + 8, y);
            y += splitItem.length * 3.6 + 1;
          });
        }

        // Paragraphs (§ 1º, § 2º, Parágrafo único...)
        if (art.paragraphs && art.paragraphs.length > 0) {
          art.paragraphs.forEach((p) => {
            const splitP = doc.splitTextToSize(p, printableWidth - 6);
            if (y + splitP.length * 3.6 > pageHeight - 20) {
              doc.addPage();
              y = 34;
            }
            doc.setFont('helvetica', 'italic');
            doc.text(splitP, margin + 6, y);
            doc.setFont('helvetica', 'normal');
            y += splitP.length * 3.6 + 1.5;
          });
        }

        y += 2;
      });

      y += 3;
    });

    // Signatory
    if (y + 35 > pageHeight - 20) {
      doc.addPage();
      y = 34;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('DÊ-SE CIÊNCIA, PUBLIQUE-SE E CUMPRA-SE.', pageWidth / 2, y + 4, { align: 'center' });
    y += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${docData.signatory.location}, ${docData.signatory.date}`, pageWidth / 2, y, { align: 'center' });
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(docData.signatory.name, pageWidth / 2, y, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(docData.signatory.role, pageWidth / 2, y + 4, { align: 'center' });

    // ANEXO I - TABELAS DE COTAS
    doc.addPage();
    y = 34;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 45, 90);
    doc.text('ANEXO I', pageWidth / 2, y, { align: 'center' });
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`QUADRO DE PLANEJAMENTO E CONTROLE ORÇAMENTÁRIO DA JOE — PERÍODO: ${docData.period}`, pageWidth / 2, y + 5, { align: 'center' });

    y += 12;

    docData.annexes[0]?.commands.forEach((cmd) => {
      const rows = cmd.rows.map((r) => [r.unit, formatInteger(r.plannedJoes), formatCurrencyBRL(r.amount)]);
      rows.push(['QUANTIDADE TOTAL', formatInteger(cmd.totalJoes), formatCurrencyBRL(cmd.totalAmount)]);

      autoTable(doc, {
        startY: y,
        head: [[{ content: cmd.commandName, colSpan: 3, styles: { fillColor: [0, 45, 90], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } }], ['COMANDO / UNIDADE', 'QTD TOTAL DE JOES', 'VALOR EM REAIS']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 8, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 7.5, halign: 'center' },
        columnStyles: {
          0: { cellWidth: 90, halign: 'center' },
          1: { cellWidth: 42, halign: 'center' },
          2: { cellWidth: 42, halign: 'center' },
        },
        margin: { left: margin, right: margin },
      });

      y = (doc as any).lastAutoTable.finalY + 8;
      if (y > pageHeight - 35) {
        doc.addPage();
        y = 34;
      }
    });

    // Add page numbers
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addHeaderAndFooter(i, totalPages);
    }

    doc.save(`PORTARIA_PMMA_${docData.ordinanceNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  },

  // Official CPI Normative Manual & Summary Guide PDF (Segundo Anexo)
  generateCpiSummaryManualPDF(summary: CpiExecutiveSummary): void {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 14;
    const printableWidth = pageWidth - margin * 2;

    const addHeaderAndFooter = (pageNum: number, totalPages: number) => {
      // Header Bar
      doc.setFillColor(0, 45, 90);
      doc.rect(0, 0, pageWidth, 20, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text('GOVERNO DO ESTADO DO MARANHÃO — POLÍCIA MILITAR DO MARANHÃO', pageWidth / 2, 7, { align: 'center' });
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text('COMANDO DE POLICIAMENTO DO INTERIOR (CPI) · GRANDE COMANDO', pageWidth / 2, 12, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(`INSTRUÇÃO NORMATIVA E GUIA OPERACIONAL · ${summary.ordinanceNumber}`, pageWidth / 2, 16.5, { align: 'center' });

      // Footer
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`PMMA · Comando de Policiamento do Interior (CPI) · ${summary.ordinanceNumber}`, margin, pageHeight - 6);
      doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
    };

    // PAGE 1
    let y = 26;

    // Title Card
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, y, printableWidth, 12, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('MANUAL NORMATIVO: ATRIBUIÇÕES DO CPI E REQUISITOS DA JOE', pageWidth / 2, y + 5, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text('Regras de Autorização, Escalonamento, Execução, Limites Individuais, Fiscalização e Prestação de Contas', pageWidth / 2, y + 9.5, { align: 'center' });
    y += 16;

    // Section 1: PARÂMETROS ESSENCIAIS DA JOE
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 45, 90);
    doc.text('1. PARÂMETROS ESSENCIAIS DA JOE (ARTS. 2º, 3º E 8º)', margin, y);
    y += 3.5;

    // 4 Parameter cards
    const cardW = (printableWidth - 6) / 4;
    const params = [
      { label: 'DURAÇÃO DA JORNADA', val: 'Até 06 Horas', sub: 'Turno contínuo extraordinário' },
      { label: 'VALOR UNITÁRIO', val: summary.parameters.unitValue.split(' ')[1] ? `R$ ${summary.parameters.unitValue.split(' ')[1]}` : 'R$ 350,00', sub: 'Por jornada / toda a semana' },
      { label: 'LIMITE MENSAL POR PM', val: 'Máx. 12 JOEs', sub: 'Teto legal intransponível' },
      { label: 'REGIME DE EXECUÇÃO', val: 'Horário de Folga', sub: 'Vedada sobreposição ordinária' },
    ];

    params.forEach((p, idx) => {
      const cx = margin + idx * (cardW + 2);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(cx, y, cardW, 14, 1, 1, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(p.label, cx + cardW / 2, y + 3.8, { align: 'center' });

      doc.setFontSize(8);
      doc.setTextColor(0, 45, 90);
      doc.text(p.val, cx + cardW / 2, y + 8.5, { align: 'center' });

      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(p.sub, cx + cardW / 2, y + 12, { align: 'center' });
    });

    y += 16.5;

    // Concept box
    doc.setFillColor(238, 242, 255);
    doc.setDrawColor(199, 210, 254);
    doc.roundedRect(margin, y, printableWidth, 9, 1, 1, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(67, 56, 202);
    doc.text('Conceito Legal de JOE (Art. 2º):', margin + 3, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(30, 41, 59);
    const conceptText = 'É a jornada efetivamente cumprida pelo policial militar em período distinto de sua jornada ordinária de serviço e de seu expediente regular. É expressamente vedado utilizar a JOE para remunerar serviço ordinário, complementar escala de rotina ou substituir folga.';
    doc.text(doc.splitTextToSize(conceptText, printableWidth - 6), margin + 3, y + 7);
    y += 12;

    // Section 2: OBRIGATORIEDADES PARA PLANEJAMENTO, AUTORIZAÇÃO E VALIDAÇÃO
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 45, 90);
    doc.text('2. OBRIGATORIEDADES PARA PLANEJAMENTO, AUTORIZAÇÃO E VALIDAÇÃO (SEI)', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text('A autorização e posterior pagamento da JOE dependem da estrita observância do rito formal via SEI em três fases consecutivas:', margin, y + 4);
    y += 6.5;

    // 2-Column layout for Phase 1 and Phase 2
    const colW = (printableWidth - 3) / 2;

    // Phase 1 Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, colW, 46, 1, 1, 'FD');
    doc.setFillColor(0, 45, 90);
    doc.roundedRect(margin, y, colW, 5.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text('Fase 1: Solicitação Prévia e Autorização (Arts. 1º e 4º)', margin + 3, y + 3.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(30, 41, 59);
    let py1 = y + 8;
    summary.seiPhases[0]?.requirements.forEach((req) => {
      const splitReq = doc.splitTextToSize(`• ${req}`, colW - 5);
      doc.text(splitReq, margin + 2.5, py1);
      py1 += splitReq.length * 2.8 + 1;
    });

    // Phase 2 Box
    const cx2 = margin + colW + 3;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(cx2, y, colW, 46, 1, 1, 'FD');
    doc.setFillColor(0, 45, 90);
    doc.roundedRect(cx2, y, colW, 5.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text('Fase 2: Escala Extraordinária Prévia (Art. 6º)', cx2 + 3, y + 3.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(30, 41, 59);
    let py2 = y + 8;
    summary.seiPhases[1]?.requirements.forEach((req) => {
      const splitReq = doc.splitTextToSize(`• ${req}`, colW - 5);
      doc.text(splitReq, cx2 + 2.5, py2);
      py2 += splitReq.length * 2.8 + 1.2;
    });

    y += 49;

    // Phase 3 Box (Full width)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, printableWidth, 34, 1, 1, 'FD');
    doc.setFillColor(0, 45, 90);
    doc.roundedRect(margin, y, printableWidth, 5.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text('Fase 3: Comprovação, Fiscalização e Liquidação (Arts. 9º, 10 e 11)', margin + 3, y + 3.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(30, 41, 59);
    let py3 = y + 8;
    summary.seiPhases[2]?.requirements.forEach((req, idx) => {
      const splitReq = doc.splitTextToSize(`${idx + 1}. ${req}`, printableWidth - 6);
      doc.text(splitReq, margin + 3, py3);
      py3 += splitReq.length * 2.8 + 1.2;
    });

    y += 37;

    // Section 3: VEDAÇÕES E IMPEDIMENTOS ABSOLUTOS
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(254, 202, 202);
    doc.roundedRect(margin, y, printableWidth, 31, 1, 1, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(185, 28, 28);
    doc.text('3. VEDAÇÕES E IMPEDIMENTOS ABSOLUTOS (ART. 7º)', margin + 3, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(153, 27, 27);
    let impY = y + 8;
    summary.impediments.items.forEach((item) => {
      const splitImp = doc.splitTextToSize(`• ${item}`, printableWidth - 8);
      doc.text(splitImp, margin + 3, impY);
      impY += splitImp.length * 2.6 + 1;
    });

    // PAGE 2
    doc.addPage();
    y = 26;

    // Section 4: ATRIBUIÇÕES DO CPI COMO GRANDE COMANDO (ART. 13)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 45, 90);
    doc.text('4. ATRIBUIÇÕES DO CPI COMO GRANDE COMANDO (ART. 13)', margin, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(summary.cpiDuties.intro, margin, y, { maxWidth: printableWidth });
    y += 7;

    summary.cpiDuties.responsibilities.forEach((resp) => {
      doc.setFillColor(resp.highlight ? 254 : 248, resp.highlight ? 242 : 250, resp.highlight ? 242 : 252);
      doc.setDrawColor(resp.highlight ? 239 : 203, resp.highlight ? 68 : 213, resp.highlight ? 68 : 225);
      doc.roundedRect(margin, y, printableWidth, 12, 1, 1, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(resp.highlight ? 185 : 0, resp.highlight ? 28 : 45, resp.highlight ? 28 : 90);
      doc.text(`• ${resp.title} (${resp.articles}):`, margin + 3, y + 4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(30, 41, 59);
      const splitDesc = doc.splitTextToSize(resp.description, printableWidth - 6);
      doc.text(splitDesc, margin + 3, y + 7.5);

      y += 14;
    });

    y += 2;

    // Section 5: QUADRO DE COTAS ORÇAMENTÁRIAS DO CPI (ANEXO I)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 45, 90);
    doc.text(`5. QUADRO DE COTAS ORÇAMENTÁRIAS DO CPI (ANEXO I — ${summary.period})`, margin, y);
    y += 3.5;

    const quotaRows = summary.quotaTable.map((q) => [q.unit, formatInteger(q.joes), formatCurrencyBRL(q.amount)]);
    quotaRows.push(['TOTAL GERAL DO CPI', formatInteger(summary.totalJoes), formatCurrencyBRL(summary.totalAmount)]);

    autoTable(doc, {
      startY: y,
      head: [['SUBUNIDADE / COMANDO DE ÁREA SUBORDINADO', 'QTD. TOTAL DE JOES', 'VALOR EM REAIS (R$)']],
      body: quotaRows,
      theme: 'grid',
      headStyles: { fillColor: [0, 45, 90], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 6.5, halign: 'center' },
      columnStyles: {
        0: { cellWidth: 100, halign: 'center' },
        1: { cellWidth: 41, halign: 'center' },
        2: { cellWidth: 41, halign: 'center' },
      },
      footStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7, halign: 'center' },
      margin: { left: margin, right: margin },
    });

    const finalTableY = (doc as any).lastAutoTable?.finalY || 240;

    // Footer note
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    const legalNote = `Base Legal & Responsabilidade: ${summary.ordinanceNumber} (Processo SEI ${summary.seiProcess} / Doc. SEI nº ${summary.seiDocNumber}). Informações falsas ou indevidas sujeitam os agentes a sanções administrativas, disciplinares, civis e penais, além da restituição ao erário (Art. 16).`;
    doc.text(doc.splitTextToSize(legalNote, printableWidth), margin, finalTableY + 6);

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addHeaderAndFooter(i, totalPages);
    }

    doc.save(`MANUAL_RESUMO_CPI_${summary.ordinanceNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  },

  // Official CPI Report Generator (Unified / Detailed / Summary)
  generateOfficialCPIReportPDF(
    operations: OperationLaunch[],
    ordinance: OrdinancePeriod | null,
    reportType: 'UNIFIED' | 'DETAILED' | 'SUMMARY_CPI' = 'UNIFIED',
    customColumns?: { id: string; label: string; getter: (op: OperationLaunch) => any }[]
  ): void {
    const isPortrait = reportType === 'SUMMARY_CPI';
    const doc = new jsPDF(isPortrait ? 'portrait' : 'landscape', 'mm', 'a4');
    const pageWidth = isPortrait ? 210 : 297;

    // 1. Sort operations strictly in official ascending order: CPI first, then CPAI-1 to CPAI-9
    const sortedOps = sortOperationsOfficial(operations);

    // Header Institutional PMMA (Deep Navy #002D5A)
    doc.setFillColor(0, 45, 90);
    doc.rect(0, 0, pageWidth, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text('GOVERNO DO ESTADO DO MARANHÃO — POLÍCIA MILITAR DO MARANHÃO', pageWidth / 2, 7.5, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('COMANDO DE POLICIAMENTO DO INTERIOR (CPI)', pageWidth / 2, 13, { align: 'center' });
    doc.setFontSize(7.5);
    const ordStr = ordinance?.number ? `PORTARIA Nº ${ordinance.number}` : 'PORTARIA EM VIGOR';
    const seiStr = ordinance?.seiProcess ? ` • PROCESSO SEI: ${ordinance.seiProcess}` : '';
    doc.text(`RELATÓRIO DE JORNADA OPERACIONAL EXTRAORDINÁRIA (JOE) • ${ordStr}${seiStr}`, pageWidth / 2, 18, { align: 'center' });

    // Subheader info
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} | Total de Registros: ${sortedOps.length}`,
      14,
      28
    );

    let currentY = 32;

    // 1. PLANILHA DETALHADA (IF UNIFIED OR DETAILED)
    if (reportType === 'UNIFIED' || reportType === 'DETAILED') {
      const defaultCols = [
        { id: 'command', label: 'COMANDO', getter: (op: OperationLaunch) => formatCommandDisplay(op.commandId), halign: 'center' as const, width: 18 },
        { id: 'subUnit', label: 'UNIDADE', getter: (op: OperationLaunch) => op.subUnit || formatCommandDisplay(op.commandId), halign: 'center' as const, width: 22 },
        { id: 'justification', label: 'JUSTIFICATIVA DA CRIAÇÃO DA JOE', getter: (op: OperationLaunch) => op.justification || '', halign: 'center' as const, width: 44 },
        {
          id: 'order',
          label: 'ORDEM DE SERVIÇO/OPERAÇÃO',
          getter: (op: OperationLaunch) => (op.orderNumber ? `${op.orderType === 'ORDEM_DE_OPERACAO' ? 'OO' : 'OS'} ${op.orderNumber}` : ''),
          halign: 'center' as const,
          width: 22,
        },
        { id: 'eventName', label: 'NOME DO EVENTO', getter: (op: OperationLaunch) => op.eventName || '', halign: 'center' as const, width: 34 },
        {
          id: 'date',
          label: 'DATA',
          getter: (op: OperationLaunch) => {
            if (!op.serviceDate) return '';
            const parts = op.serviceDate.split('-');
            return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : op.serviceDate;
          },
          halign: 'center' as const,
          width: 18,
        },
        {
          id: 'time',
          label: 'HORÁRIO',
          getter: (op: OperationLaunch) => op.startTime ? (op.endTime ? `${op.startTime} às ${op.endTime}` : op.startTime) : '20h às 02h',
          halign: 'center' as const,
          width: 20,
        },
        { id: 'officers', label: 'EFETIVO EMPREGADO', getter: (op: OperationLaunch) => op.officersCount?.toString() || '0', halign: 'center' as const, width: 16 },
        { id: 'unitValue', label: 'VALOR UNITÁRIO', getter: (op: OperationLaunch) => formatCurrencyBRL(op.unitValue || 350), halign: 'center' as const, width: 22 },
        { id: 'totalValue', label: 'VALOR TOTAL', getter: (op: OperationLaunch) => formatCurrencyBRL(op.totalValue || 0), halign: 'center' as const, width: 24 },
      ];

      const activeCols = customColumns
        ? customColumns.map((c) => {
            const match = defaultCols.find((d) => d.id === c.id);
            return {
              id: c.id,
              label: c.label,
              getter: (op: OperationLaunch) => {
                if (c.id === 'unitValue') return formatCurrencyBRL(op.unitValue || 350);
                if (c.id === 'totalValue') return formatCurrencyBRL(op.totalValue || 0);
                const raw = c.getter(op);
                if (typeof raw === 'number' && (c.id.includes('Value') || c.id.includes('Valor'))) {
                  return formatCurrencyBRL(raw);
                }
                return raw;
              },
              halign: 'center' as const,
              width: match?.width || 25,
            };
          })
        : defaultCols;

      const head = [activeCols.map((c) => c.label)];
      const body = sortedOps.map((op) => activeCols.map((c) => c.getter(op)));

      const totalOfficers = sortedOps.reduce((sum, o) => sum + (Number(o.officersCount) || 0), 0);
      const totalAmount = sortedOps.reduce((sum, o) => sum + (Number(o.totalValue) || 0), 0);

      const foot = [
        activeCols.map((c, idx) => {
          if (idx === 0) return 'TOTAL UNIDADE';
          if (c.id === 'officers' || c.id === 'officersCount') return totalOfficers.toString();
          if (c.id === 'totalValue') return formatCurrencyBRL(totalAmount);
          return '';
        }),
      ];

      autoTable(doc, {
        startY: currentY,
        head,
        body,
        foot,
        theme: 'grid',
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontSize: 7,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          lineColor: [148, 163, 184],
          lineWidth: 0.2,
        },
        bodyStyles: {
          fontSize: 6.8,
          textColor: [30, 41, 59],
          halign: 'center',
          valign: 'middle',
          lineColor: [203, 213, 225],
          lineWidth: 0.15,
        },
        columnStyles: activeCols.reduce((acc, col, idx) => {
          acc[idx] = {
            halign: 'center',
            fontStyle: col.id === 'totalValue' || col.id === 'command' ? 'bold' : 'normal',
          };
          return acc;
        }, {} as any),
        footStyles: {
          fillColor: [226, 232, 240],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 7.5,
          halign: 'center',
          valign: 'middle',
          lineColor: [148, 163, 184],
          lineWidth: 0.2,
        },
        margin: { left: 10, right: 10 },
      });

      currentY = ((doc as any).lastAutoTable?.finalY || 100) + 12;
    }

    // 2. QUADRO RESUMO CPI (IF UNIFIED OR SUMMARY_CPI)
    if (reportType === 'UNIFIED' || reportType === 'SUMMARY_CPI') {
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

      // If unified and page is nearly full, add new page
      if (reportType === 'UNIFIED' && currentY > 120) {
        doc.addPage('landscape');
        currentY = 20;
      }

      // Center the table on page
      const tableWidth = 140;
      const marginX = (pageWidth - tableWidth) / 2;

      const resumoBody = standardCodes.map((code) => [
        code,
        formatCurrencyBRL(sumMap[code] || 0),
      ]);

      autoTable(doc, {
        startY: currentY,
        margin: { left: marginX, right: marginX },
        head: [
          [{ content: 'CPI', colSpan: 2, styles: { halign: 'center', fontSize: 11, fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [15, 23, 42] } }],
          [{ content: 'QUADRO RESUMO CPI', colSpan: 2, styles: { halign: 'center', fontSize: 9.5, fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }],
          ['UNIDADE', 'VALOR'],
        ],
        body: resumoBody,
        foot: [['TOTAL GERAL CPI', formatCurrencyBRL(totalGeralCPI)]],
        theme: 'grid',
        headStyles: {
          fillColor: [226, 232, 240],
          textColor: [15, 23, 42],
          fontSize: 8.5,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          lineColor: [30, 41, 59],
          lineWidth: 0.3,
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [15, 23, 42],
          halign: 'center',
          valign: 'middle',
          lineColor: [148, 163, 184],
          lineWidth: 0.2,
        },
        columnStyles: {
          0: { halign: 'center', fontStyle: 'bold', cellWidth: 70 },
          1: { halign: 'center', fontStyle: 'normal', cellWidth: 70 },
        },
        footStyles: {
          fillColor: [226, 232, 240],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center',
          valign: 'middle',
          lineColor: [30, 41, 59],
          lineWidth: 0.3,
        },
      });
    }

    const ordNum = ordinance?.number ? ordinance.number.replace(/[^a-zA-Z0-9]/g, '_') : 'GERAL';
    const dateStamp = new Date().toISOString().split('T')[0];
    doc.save(`Relatorio_JOE_CPI_${ordNum}_${dateStamp}.pdf`);
  },

  generateOperationsReport(
    operations: OperationLaunch[],
    ordinance: OrdinancePeriod,
    _selectedCpa?: string
  ): void {
    this.generateOfficialCPIReportPDF(operations, ordinance, 'UNIFIED');
  },

  generateBudgetReport(
    budgets: CommandBudget[],
    commands: CommandUnit[],
    ordinance: OrdinancePeriod
  ): void {
    const doc = new jsPDF('portrait', 'mm', 'a4');

    // Header
    doc.setFillColor(11, 31, 58);
    doc.rect(0, 0, 210, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('POLÍCIA MILITAR DO MARANHÃO — COMANDO-GERAL', 105, 8, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('COMANDO DE POLICIAMENTO DO INTERIOR (CPI)', 105, 14, { align: 'center' });
    doc.setFontSize(8);
    doc.text(`DEMONSTRATIVO DE COTAS ORÇAMENTÁRIAS DA JOE • ${ordinance.number}`, 105, 19, { align: 'center' });

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.text(`Processo SEI: ${ordinance.seiProcess} | Vigência: ${new Date(ordinance.startDate).toLocaleDateString('pt-BR')} a ${new Date(ordinance.endDate).toLocaleDateString('pt-BR')}`, 14, 30);

    const tableData = budgets.map((b) => {
      const cmd = commands.find((c) => c.code === b.commandId);
      const percentUsed = ((b.committedAmount + b.executedAmount) / (b.budgetAmount || 1)) * 100;
      return [
        b.commandId,
        cmd ? cmd.name : b.commandId,
        b.plannedJoes.toString(),
        formatCurrencyBRL(b.budgetAmount),
        formatCurrencyBRL(b.committedAmount + b.executedAmount),
        formatCurrencyBRL(b.availableBalance),
        `${percentUsed.toFixed(1)}%`,
        b.availableBalance > 0 ? 'REGULAR' : 'ESGOTADO',
      ];
    });

    const totalBudget = budgets.reduce((s, b) => s + b.budgetAmount, 0);
    const totalSpent = budgets.reduce((s, b) => s + b.committedAmount + b.executedAmount, 0);
    const totalBalance = budgets.reduce((s, b) => s + b.availableBalance, 0);
    const totalJoes = budgets.reduce((s, b) => s + b.plannedJoes, 0);

    autoTable(doc, {
      startY: 35,
      head: [
        [
          'SIGLA',
          'COMANDO SUBORDINADO',
          'QTD JOES',
          'ORÇAMENTO',
          'GASTO/COMPR.',
          'SALDO DISPONÍVEL',
          '% UTIL.',
          'SITUAÇÃO',
        ],
      ],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59],
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
        1: { cellWidth: 46, halign: 'center' },
        2: { halign: 'center', cellWidth: 18 },
        3: { halign: 'center', fontStyle: 'bold', cellWidth: 26 },
        4: { halign: 'center', cellWidth: 24 },
        5: { halign: 'center', fontStyle: 'bold', cellWidth: 26 },
        6: { halign: 'center', cellWidth: 16 },
        7: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
      },
      foot: [
        [
          'TOTAL GERAL',
          'COMANDO DO INTERIOR',
          totalJoes.toString(),
          formatCurrencyBRL(totalBudget),
          formatCurrencyBRL(totalSpent),
          formatCurrencyBRL(totalBalance),
          `${((totalSpent / (totalBudget || 1)) * 100).toFixed(1)}%`,
          'CONSOLIDADO',
        ],
      ],
      footStyles: {
        fillColor: [226, 232, 240],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 160;
    doc.setFontSize(8);
    doc.text(
      'Base Legal: Art. 5º e 13, II da Portaria nº 122/2026-GCG. Informações sujeitas a auditoria no SEI.',
      14,
      finalY + 10
    );

    doc.save(`CPI-PMMA_Demonstrativo_Orcamentario_${new Date().toISOString().split('T')[0]}.pdf`);
  },

  generateWeeklyConsolidationPDF(
    batch: WeeklyBatchConsolidation,
    _operations: OperationLaunch[],
    _ordinance: OrdinancePeriod
  ): void {
    const doc = new jsPDF('portrait', 'mm', 'a4');

    // Header
    doc.setFillColor(11, 31, 58);
    doc.rect(0, 0, 210, 26, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('GOVERNO DO ESTADO DO MARANHÃO — POLÍCIA MILITAR DO MARANHÃO', 105, 7, { align: 'center' });
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text('COMANDO DE POLICIAMENTO DO INTERIOR (CPI) • PAGADORIA-DGP', 105, 13, { align: 'center' });
    doc.setFontSize(8);
    doc.text('ENCAMINHAMENTO SEMANAL DE JOE — ART. 13, INCISO V DA PORTARIA Nº 122/2026-GCG', 105, 19, { align: 'center' });
    doc.text(`OBRIGATORIEDADE DE TERÇA-FEIRA • PROCESSO SEI: ${batch.seiProcess}`, 105, 23, { align: 'center' });

    // Details box
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Lote Consolidado: ${batch.batchNumber}`, 14, 33);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data de Fechamento: ${new Date(batch.consolidationDate).toLocaleDateString('pt-BR')} (Terça-feira)`, 14, 38);
    doc.text(`Período Operacional da Semana: ${new Date(batch.weekStartDate).toLocaleDateString('pt-BR')} a ${new Date(batch.weekEndDate).toLocaleDateString('pt-BR')}`, 14, 43);
    doc.text(`Despacho SEI: ${batch.seiDispatchNumber}`, 14, 48);

    doc.setFont('helvetica', 'bold');
    doc.text(`Total Liquidado: ${formatCurrencyBRL(batch.totalFinancialAmount)} (${batch.totalJoesCount} JOEs)`, 120, 38);
    doc.text(`Responsável: ${batch.responsibleUser}`, 120, 43);

    // Summary by CPA table
    const cpaRows = batch.cpaBreakdown.map((c) => [
      c.commandId,
      c.operationsCount.toString(),
      c.officersCount.toString(),
      c.joesCount.toString(),
      formatCurrencyBRL(c.amount),
    ]);

    autoTable(doc, {
      startY: 53,
      head: [['COMANDO DE ÁREA (CPA/I)', 'QTD OPERAÇÕES', 'EFETIVO EMPREGADO', 'TOTAL JOES', 'VALOR TOTAL']],
      body: cpaRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8, halign: 'center' },
      bodyStyles: { fontSize: 8, halign: 'center' },
      foot: [
        [
          'TOTAL SEMANAL',
          batch.totalOperationsCount.toString(),
          batch.totalOfficersCount.toString(),
          batch.totalJoesCount.toString(),
          formatCurrencyBRL(batch.totalFinancialAmount),
        ],
      ],
      footStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8, halign: 'center' },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 120;

    // Declaration block
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'DECLARAÇÃO DO CPI: Certifico que todas as operações constantes neste lote foram devidamente fiscalizadas no SEI, conferidos os RENE, confirmada a compatibilidade com a cota orçamentária e atestada a inexistência de sobreposição com escalas ordinárias ou impedimentos funcionais.',
      14,
      finalY + 8,
      { maxWidth: 182 }
    );

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('__________________________________________________________', 105, finalY + 32, { align: 'center' });
    doc.text('Comandante do Policiamento do Interior (CPI)', 105, finalY + 37, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('Encaminhado à Diretoria de Gestão de Pessoas / Pagadoria-DGP', 105, finalY + 42, { align: 'center' });

    doc.save(`CPI-PMMA_Consolidacao_Semanal_${batch.batchNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  },

  generateRenePDF(operation: OperationLaunch, _ordinance: OrdinancePeriod): void {
    const doc = new jsPDF('portrait', 'mm', 'a4');

    // Header
    doc.setFillColor(11, 31, 58);
    doc.rect(0, 0, 210, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('POLÍCIA MILITAR DO MARANHÃO — COMANDO DE POLICIAMENTO DO INTERIOR', 105, 8, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('RENE — RELATÓRIO DE EXECUÇÃO DE JORNADA OPERACIONAL EXTRAORDINÁRIA', 105, 14, { align: 'center' });
    doc.setFontSize(8);
    doc.text(`BASE LEGAL: ART. 10 DA PORTARIA Nº 122/2026-GCG • SEI: ${operation.seiProcessNumber}`, 105, 19, { align: 'center' });

    // Mission Summary
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('1. DADOS DA OPERAÇÃO / SERVIÇO EXTRAORDINÁRIO', 14, 31);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Comando de Área: ${operation.commandId}`, 14, 37);
    doc.text(`Unidade Policial Militar: ${operation.subUnit}`, 80, 37);
    doc.text(`Lançamento nº: ${operation.launchNumber}`, 150, 37);

    doc.text(`Ordem de Serviço/Operação: ${operation.orderType === 'ORDEM_DE_OPERACAO' ? 'OO' : 'OS'} nº ${operation.orderNumber}`, 14, 43);
    doc.text(`Nome do Evento: ${operation.eventName}`, 80, 43);

    doc.text(`Data da Missão: ${new Date(operation.serviceDate + 'T00:00:00').toLocaleDateString('pt-BR')}`, 14, 49);
    doc.text(`Horário de Execução: ${operation.startTime} às ${operation.endTime} (${operation.calculatedDurationHours} Horas)`, 80, 49);
    doc.text(`Local: ${operation.location}`, 14, 55);

    doc.text(`Justificativa Operacional: ${operation.justification}`, 14, 61, { maxWidth: 182 });

    // Nominal Roster Table
    doc.setFont('helvetica', 'bold');
    doc.text('2. EFETIVO EMPREGADO E ESCALA NOMINAL COMPROVADA', 14, 74);

    const officerRows = operation.officers.length > 0
      ? operation.officers.map((off, idx) => [
          (idx + 1).toString(),
          off.rank,
          off.officerName,
          off.registration,
          off.cpf,
          off.roleInMission || 'Patrulheiro',
          formatCurrencyBRL(off.value),
        ])
      : Array.from({ length: operation.officersCount }).map((_, idx) => [
          (idx + 1).toString(),
          'Sd / Cb / Sgt PM',
          `Policial Militar Designado ${idx + 1}`,
          `2${idx}4.${idx}12-0`,
          `***.***.***-${idx}0`,
          'Patrulheiro Escala JOE',
          formatCurrencyBRL(operation.unitValue),
        ]);

    autoTable(doc, {
      startY: 77,
      head: [['ITEM', 'POSTO/GRAD', 'NOME COMPLETO', 'MATRÍCULA', 'CPF', 'FUNÇÃO NA MISSÃO', 'VALOR JOE']],
      body: officerRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 7.5, halign: 'center' },
      bodyStyles: { fontSize: 7.5, halign: 'center' },
      foot: [
        [
          'TOTAL',
          '',
          `${operation.officersCount} Policiais Militares`,
          '',
          '',
          `${operation.officersCount * operation.joesPerOfficer} JOE(s)`,
          formatCurrencyBRL(operation.totalValue),
        ],
      ],
      footStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8, halign: 'center' },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 160;

    // Declarations & Signatures as per Art. 10 and 11
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(
      'DECLARAÇÃO INSTITUCIONAL (Art. 10 e 11 da Portaria 122/2026-GCG): Certificamos que os militares constantes desta relação cumpriram integralmente a jornada extraordinária em período de folga, sem sobreposição com escala ordinária, tendo sido verificado o controle de frequência e registro no CIOPS/sistema operacional.',
      14,
      finalY + 8,
      { maxWidth: 182 }
    );

    // Three mandatory signatures
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');

    doc.text('____________________________________', 35, finalY + 28, { align: 'center' });
    doc.text('Oficial Responsável / Fiscal', 35, finalY + 32, { align: 'center' });

    doc.text('____________________________________', 105, finalY + 28, { align: 'center' });
    doc.text('Chefe P/1 da UPM', 105, finalY + 32, { align: 'center' });

    doc.text('____________________________________', 175, finalY + 28, { align: 'center' });
    doc.text('Comandante da UPM', 175, finalY + 32, { align: 'center' });

    doc.save(`RENE_${operation.launchNumber}_${operation.subUnit.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  },
};
