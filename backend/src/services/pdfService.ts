import fs from 'fs';
import puppeteer from 'puppeteer-core';
import PDFDocument from 'pdfkit';

interface ReportData {
  id: string;
  title: string;
  clinicalHistory?: string | null;
  technique?: string | null;
  findings?: string | null;
  impression?: string | null;
  recommendation?: string | null;
  createdAt: Date;
  doctor: {
    firstName: string;
    lastName: string;
    specialty?: string | null;
    clinic?: { name?: string | null; address?: string | null; phone?: string | null } | null;
  };
  consultation?: { patient?: { firstName: string; lastName: string } | null } | null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function findBrowserExecutable(): string | undefined {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ].filter(Boolean) as string[];

  return candidates.find((p) => fs.existsSync(p));
}

function generatePdfKitFallback(report: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const patientName = report.consultation?.patient
      ? `${report.consultation.patient.firstName} ${report.consultation.patient.lastName}`
      : 'N/A';

    doc.fontSize(18).fillColor('#1E40AF').text(report.doctor.clinic?.name || 'Radioloq Medical Center');
    doc.fontSize(9).fillColor('#64748b').text(report.doctor.clinic?.address || 'Medical Imaging & Radiology');
    doc.moveDown(1);
    doc.fontSize(15).fillColor('#1E40AF').text(report.title, { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(10).fillColor('#1e293b');
    doc.text(`Patient: ${patientName}`);
    doc.text(
      `Radiologist: ${report.doctor.firstName} ${report.doctor.lastName} (${report.doctor.specialty || 'Radiology'})`
    );
    doc.text(`Date: ${new Date(report.createdAt).toLocaleDateString()}`);
    doc.text(`Report ID: ${report.id.substring(0, 8).toUpperCase()}`);
    doc.moveDown(1);

    const sections: [string, string | null | undefined][] = [
      ['CLINICAL HISTORY', report.clinicalHistory],
      ['TECHNIQUE', report.technique],
      ['FINDINGS', report.findings],
      ['IMPRESSION', report.impression],
      ['RECOMMENDATION', report.recommendation],
    ];

    for (const [heading, content] of sections) {
      if (content) {
        doc.fontSize(11).fillColor('#1E40AF').text(heading);
        doc.moveDown(0.25);
        doc.fontSize(10).fillColor('#1e293b').text(content);
        doc.moveDown(0.8);
      }
    }

    doc.moveDown(2);
    doc.text('____________________________________');
    doc.text(`${report.doctor.firstName} ${report.doctor.lastName}`);
    doc.fontSize(9).fillColor('#64748b').text(report.doctor.specialty || 'Radiologist');

    doc.end();
  });
}

export async function generatePDF(report: ReportData): Promise<Buffer> {
  const executablePath = findBrowserExecutable();
  if (!executablePath) {
    return generatePdfKitFallback(report);
  }

  const patientName = report.consultation?.patient
    ? `${report.consultation.patient.firstName} ${report.consultation.patient.lastName}`
    : 'N/A';

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #1a1a1a; font-size: 12px; }
  .header { border-bottom: 2px solid #1E40AF; padding-bottom: 16px; margin-bottom: 24px; }
  .clinic-name { font-size: 20px; font-weight: bold; color: #1E40AF; }
  .clinic-info { color: #666; font-size: 10px; margin-top: 4px; }
  .title { font-size: 16px; font-weight: bold; margin: 20px 0 16px; text-align: center; color: #1E40AF; }
  .meta { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; margin-bottom: 20px; display: flex; justify-content: space-between; }
  .meta div { font-size: 11px; }
  .meta .label { font-weight: bold; color: #64748b; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 12px; font-weight: bold; color: #1E40AF; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px; }
  .section-content { line-height: 1.6; white-space: pre-wrap; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #666; }
  .signature { margin-top: 40px; }
  .signature-line { border-bottom: 1px solid #333; width: 200px; margin-bottom: 4px; }
</style>
</head>
<body>
  <div class="header">
    <div class="clinic-name">${escapeHtml(report.doctor.clinic?.name || 'Radioloq Medical Center')}</div>
    <div class="clinic-info">${escapeHtml(report.doctor.clinic?.address || 'Medical Imaging & Radiology')}</div>
  </div>
  <div class="title">${escapeHtml(report.title)}</div>
  <div class="meta">
    <div><div class="label">Patient</div><div>${escapeHtml(patientName)}</div></div>
    <div><div class="label">Radiologist</div><div>${escapeHtml(`${report.doctor.firstName} ${report.doctor.lastName}`)}</div><div>${escapeHtml(report.doctor.specialty || 'Radiology')}</div></div>
    <div><div class="label">Report Date</div><div>${new Date(report.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div></div>
    <div><div class="label">Report ID</div><div>${escapeHtml(report.id.substring(0, 8).toUpperCase())}</div></div>
  </div>
  ${report.clinicalHistory ? `<div class="section"><div class="section-title">Clinical History</div><div class="section-content">${escapeHtml(report.clinicalHistory)}</div></div>` : ''}
  ${report.technique ? `<div class="section"><div class="section-title">Technique</div><div class="section-content">${escapeHtml(report.technique)}</div></div>` : ''}
  ${report.findings ? `<div class="section"><div class="section-title">Findings</div><div class="section-content">${escapeHtml(report.findings)}</div></div>` : ''}
  ${report.impression ? `<div class="section"><div class="section-title">Impression</div><div class="section-content">${escapeHtml(report.impression)}</div></div>` : ''}
  ${report.recommendation ? `<div class="section"><div class="section-title">Recommendation</div><div class="section-content">${escapeHtml(report.recommendation)}</div></div>` : ''}
  <div class="signature">
    <div class="signature-line"></div>
    <div>${escapeHtml(`${report.doctor.firstName} ${report.doctor.lastName}`)}</div>
    <div>${escapeHtml(report.doctor.specialty || 'Radiologist')}</div>
  </div>
  <div class="footer">
    <div>Radioloq Platform — Confidential Medical Report</div>
    <div>Generated: ${new Date().toISOString()}</div>
  </div>
</body>
</html>`;

  try {
    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
        printBackground: true,
      });
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.warn('Puppeteer failed, falling back to PDFKit:', err);
    return generatePdfKitFallback(report);
  }
}
