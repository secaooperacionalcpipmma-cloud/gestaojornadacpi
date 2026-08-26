import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure pdfjs worker
try {
  // Use worker CDN or fallback
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
} catch (e) {
  console.warn('PDF Worker initialization notice:', e);
}

export interface ExtractedFileResult {
  fileName: string;
  fileType: 'PDF' | 'EXCEL' | 'WORD' | 'TEXT' | 'DESCONHECIDO';
  fileSizeBytes: number;
  text: string;
  pageCount?: number;
  sheetCount?: number;
  warnings?: string[];
}

/**
 * Extracts plain text from PDF ArrayBuffer
 */
export async function extractTextFromPdf(arrayBuffer: ArrayBuffer, fileName: string): Promise<ExtractedFileResult> {
  const warnings: string[] = [];
  let fullText = '';
  let numPages = 0;

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: false,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    numPages = pdf.numPages;

    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        let lastY: number | null = null;
        let pageStr = '';

        for (const item of textContent.items) {
          if ('str' in item) {
            const transform = item.transform;
            const currentY = transform ? transform[5] : null;

            if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 5) {
              pageStr += '\n';
            } else if (pageStr.length > 0 && !pageStr.endsWith(' ') && !pageStr.endsWith('\n')) {
              pageStr += ' ';
            }

            pageStr += item.str;
            lastY = currentY;
          }
        }

        if (pageStr.trim().length > 0) {
          pageTexts.push(`--- PÁGINA ${pageNum} ---\n${pageStr.trim()}`);
        }
      } catch (pageErr) {
        warnings.push(`Não foi possível extrair página ${pageNum}: ${String(pageErr)}`);
      }
    }

    fullText = pageTexts.join('\n\n');

    // Fallback: If text is empty (scanned image inside PDF), extract binary strings as best effort
    if (fullText.trim().length === 0) {
      warnings.push('O PDF parece ser uma imagem digitalizada sem camada OCR. Extração direta aplicada.');
      const decoder = new TextDecoder('latin1');
      const rawString = decoder.decode(arrayBuffer);
      // Clean string
      const asciiMatches = rawString.match(/[\x20-\x7E\xA0-\xFF]{4,}/g);
      if (asciiMatches && asciiMatches.length > 0) {
        fullText = asciiMatches.join(' ');
      }
    }
  } catch (err) {
    console.error('Erro ao ler PDF:', err);
    warnings.push(`Erro no leitor PDF: ${String(err)}`);
  }

  return {
    fileName,
    fileType: 'PDF',
    fileSizeBytes: arrayBuffer.byteLength,
    text: fullText,
    pageCount: numPages,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Extracts plain text from Excel ArrayBuffer (.xlsx, .xls, .csv, .ods)
 */
export async function extractTextFromExcel(arrayBuffer: ArrayBuffer, fileName: string): Promise<ExtractedFileResult> {
  const warnings: string[] = [];
  let fullText = '';
  let sheetCount = 0;

  try {
    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true,
      cellNF: true,
      cellText: true,
    });

    sheetCount = workbook.SheetNames.length;
    const sheetTexts: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) continue;

      // Convert to CSV style text with tabular alignment
      const csvContent = XLSX.utils.sheet_to_csv(worksheet, {
        FS: ' | ',
        RS: '\n',
        blankrows: false,
      });

      if (csvContent.trim().length > 0) {
        sheetTexts.push(`=== ABA / PLANILHA: ${sheetName} ===\n${csvContent}`);
      }
    }

    fullText = sheetTexts.join('\n\n');
  } catch (err) {
    console.error('Erro ao ler Excel:', err);
    warnings.push(`Erro ao processar planilha: ${String(err)}`);
  }

  return {
    fileName,
    fileType: 'EXCEL',
    fileSizeBytes: arrayBuffer.byteLength,
    text: fullText,
    sheetCount,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Extracts plain text from Word Document (.docx)
 */
export async function extractTextFromWord(arrayBuffer: ArrayBuffer, fileName: string): Promise<ExtractedFileResult> {
  const warnings: string[] = [];
  let fullText = '';

  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    fullText = result.value || '';

    if (result.messages && result.messages.length > 0) {
      result.messages.forEach((m) => warnings.push(m.message));
    }
  } catch (err) {
    console.error('Erro ao ler Word (.docx):', err);
    // Fallback: If .doc (binary Word 97-2004)
    warnings.push('Tentando extração de texto para formato Word legado.');
    const decoder = new TextDecoder('latin1');
    const rawString = decoder.decode(arrayBuffer);
    const asciiMatches = rawString.match(/[\x20-\x7E\xA0-\xFF]{4,}/g);
    if (asciiMatches && asciiMatches.length > 0) {
      fullText = asciiMatches.join(' ');
    }
  }

  return {
    fileName,
    fileType: 'WORD',
    fileSizeBytes: arrayBuffer.byteLength,
    text: fullText,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Master Smart File Extractor accepting PDF, Excel, Word, and Text
 */
export async function extractTextFromAnyFile(file: File): Promise<ExtractedFileResult> {
  const fileName = file.name;
  const lowerName = fileName.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();

  if (lowerName.endsWith('.pdf')) {
    return extractTextFromPdf(arrayBuffer, fileName);
  }

  if (
    lowerName.endsWith('.xlsx') ||
    lowerName.endsWith('.xls') ||
    lowerName.endsWith('.csv') ||
    lowerName.endsWith('.ods')
  ) {
    return extractTextFromExcel(arrayBuffer, fileName);
  }

  if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) {
    return extractTextFromWord(arrayBuffer, fileName);
  }

  // Fallback for TXT / JSON / LOG / RTF
  try {
    const decoder = new TextDecoder('utf-8');
    let text = decoder.decode(arrayBuffer);
    if (text.includes('\uFFFD')) {
      // Retry with latin1 (ISO-8859-1) common in Brazilian government systems
      const latinDecoder = new TextDecoder('latin1');
      text = latinDecoder.decode(arrayBuffer);
    }

    return {
      fileName,
      fileType: 'TEXT',
      fileSizeBytes: file.size,
      text,
    };
  } catch (err) {
    return {
      fileName,
      fileType: 'DESCONHECIDO',
      fileSizeBytes: file.size,
      text: '',
      warnings: [`Não foi possível decodificar o arquivo: ${String(err)}`],
    };
  }
}
