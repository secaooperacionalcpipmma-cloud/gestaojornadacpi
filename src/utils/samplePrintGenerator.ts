/**
 * Utilitário para gerar uma imagem realista de exemplo de tela do sistema SEI / PMMA
 * contendo uma Solicitação de JOE para demonstração e análise pelo usuário.
 */

export interface SampleJoeData {
  cpa: string;
  unidade: string;
  cidade: string;
  processoSei: string;
  ordemServico: string;
  evento: string;
  dataServico: string;
  horario: string;
  efetivo: number;
  valorUnitario: number;
  total: number;
  justificativa: string;
}

export const OFFICIAL_EXAMPLE_DATA: SampleJoeData = {
  cpa: 'CPA/I-4',
  unidade: '2º BPM',
  cidade: 'Caxias/MA',
  processoSei: '2026.190110.37509/2026-81',
  ordemServico: 'OS nº 145/2026-2º BPM',
  evento: 'Operação Cidade Segura - Policiamento Ostensivo Noturno',
  dataServico: '2026-10-12',
  horario: '20:00 às 02:00',
  efetivo: 6,
  valorUnitario: 350,
  total: 2100,
  justificativa: 'Intensificação do policiamento ostensivo preventivo e repressivo visando coibir Crimes Violentos Letais Intencionais (CVLI) e Crimes Violentos contra o Patrimônio (CVP).',
};

/**
 * Renderiza uma tela oficial estilizada simulando o SEI / PMMA em canvas
 * e retorna como base64 data URL PNG pronta para envio ao OCR.
 */
export function generateSampleScreenDataUrl(customData?: Partial<SampleJoeData>): string {
  const data: SampleJoeData = { ...OFFICIAL_EXAMPLE_DATA, ...customData };

  const width = 1200;
  const height = 820;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  // Top SEI Navigation Bar
  ctx.fillStyle = '#002D5A';
  ctx.fillRect(0, 0, width, 55);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('SEI / PMMA - Sistema Eletrônico de Informações', 24, 34);

  ctx.fillStyle = '#7EC2E8';
  ctx.font = '13px monospace';
  ctx.fillText(`Processo nº ${data.processoSei}`, width - 360, 34);

  // Document Breadcrumb & Header Box
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(30, 75, width - 60, 715);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.strokeRect(30, 75, width - 60, 715);

  // Watermark or Brasao simulated top
  ctx.fillStyle = '#002D5A';
  ctx.textAlign = 'center';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('GOVERNO DO ESTADO DO MARANHÃO', width / 2, 115);
  ctx.fillText('POLÍCIA MILITAR DO MARANHÃO - COMANDO GERAL', width / 2, 137);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('COMANDO DE POLICIAMENTO DO INTERIOR - CPI', width / 2, 159);
  ctx.fillText(`COMANDO DE POLICIAMENTO DE ÁREA DO INTERIOR 4 - ${data.cpa}`, width / 2, 180);
  ctx.fillText(`${data.unidade} - BATALHÃO DE POLÍCIA MILITAR (${data.cidade})`, width / 2, 201);

  // Divider
  ctx.strokeStyle = '#CBD5E1';
  ctx.beginPath();
  ctx.moveTo(60, 220);
  ctx.lineTo(width - 60, 220);
  ctx.stroke();

  // Document Title
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('SOLICITAÇÃO DE JORNADA OPERACIONAL EXTRAORDINÁRIA (JOE)', width / 2, 255);
  ctx.textAlign = 'left';

  // Info Grid / Table
  const startX = 60;
  const startY = 285;
  const colW1 = 300;
  const colW2 = width - 120 - colW1;
  const rowH = 42;

  const rows = [
    { label: 'PROCESSO SEI:', value: data.processoSei, highlight: true },
    { label: 'COMANDO DE ÁREA / UNIDADE:', value: `${data.cpa} — ${data.unidade} (${data.cidade})`, highlight: false },
    { label: 'ORDEM DE SERVIÇO / OPERAÇÃO:', value: data.ordemServico, highlight: true },
    { label: 'EVENTO / OPERAÇÃO POLICIAL:', value: data.evento, highlight: false },
    { label: 'DATA DO SERVIÇO / TURNO:', value: `${data.dataServico.split('-').reverse().join('/')} (Horário: ${data.horario})`, highlight: false },
    { label: 'EFETIVO SOLICITADO:', value: `${data.efetivo} (seis) Policiais Militares`, highlight: true },
    { label: 'VALOR UNITÁRIO DA JOE:', value: `R$ ${data.valorUnitario.toFixed(2).replace('.', ',')} (Portaria nº 127/2026)`, highlight: false },
    { label: 'VALOR TOTAL ESTIMADO:', value: `R$ ${data.total.toFixed(2).replace('.', ',')} (calculado: ${data.efetivo} x R$ ${data.valorUnitario.toFixed(2).replace('.', ',')})`, highlight: true },
    { label: 'LOCALIDADE DA MISSÃO:', value: `Município de ${data.cidade}`, highlight: false },
  ];

  rows.forEach((r, idx) => {
    const y = startY + idx * rowH;
    ctx.fillStyle = idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
    ctx.fillRect(startX, y, width - 120, rowH);

    ctx.strokeStyle = '#E2E8F0';
    ctx.strokeRect(startX, y, width - 120, rowH);

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(r.label, startX + 16, y + 26);

    ctx.fillStyle = r.highlight ? '#002D5A' : '#1E293B';
    ctx.font = r.highlight ? 'bold 13px sans-serif' : '13px sans-serif';
    ctx.fillText(r.value, startX + colW1, y + 26);
  });

  // Justification Section
  const justY = startY + rows.length * rowH + 15;
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(startX, justY, width - 120, 95);
  ctx.strokeStyle = '#CBD5E1';
  ctx.strokeRect(startX, justY, width - 120, 95);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('JUSTIFICATIVA DA JOE:', startX + 16, justY + 24);

  ctx.fillStyle = '#334155';
  ctx.font = '12px sans-serif';
  // wrap text
  ctx.fillText(data.justificativa.substring(0, 120), startX + 16, justY + 48);
  ctx.fillText(data.justificativa.substring(120), startX + 16, justY + 70);

  // Digital Signatures Footer
  const signY = justY + 115;
  ctx.fillStyle = '#64748B';
  ctx.font = '11px sans-serif';
  ctx.fillText('Documento assinado eletronicamente por Comandante da Unidade em 25/09/2026 às 11:32.', startX + 16, signY);
  ctx.fillText('Autenticidade verificável no endereço do SEI-MA informando o código CRC e Processo acima.', startX + 16, signY + 18);

  return canvas.toDataURL('image/png');
}
