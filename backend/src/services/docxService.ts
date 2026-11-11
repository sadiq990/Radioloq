import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

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
    clinic?: { name?: string | null } | null;
  };
  consultation?: { patient?: { firstName: string; lastName: string } | null } | null;
}

function section(title: string, content: string | null | undefined): Paragraph[] {
  if (!content) return [];
  return [
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 300, after: 100 },
    }),
    new Paragraph({
      text: content,
      spacing: { after: 200 },
    }),
  ];
}

export async function generateDocx(report: ReportData): Promise<Buffer> {
  const patientName = report.consultation?.patient
    ? `${report.consultation.patient.firstName} ${report.consultation.patient.lastName}`
    : 'N/A';

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: report.doctor.clinic?.name || 'Radioloq Medical Center',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: report.title,
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `Patient: ${patientName}`, bold: true })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Radiologist: ${report.doctor.firstName} ${report.doctor.lastName}`,
                bold: true,
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: `Specialty: ${report.doctor.specialty || 'Radiology'}`,
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: `Date: ${new Date(report.createdAt).toLocaleDateString()}`,
            spacing: { after: 300 },
          }),
          ...section('Clinical History', report.clinicalHistory),
          ...section('Technique', report.technique),
          ...section('Findings', report.findings),
          ...section('Impression', report.impression),
          ...section('Recommendation', report.recommendation),
          new Paragraph({ text: '_'.repeat(40), spacing: { before: 600, after: 100 } }),
          new Paragraph({
            text: `${report.doctor.firstName} ${report.doctor.lastName}`,
            spacing: { after: 50 },
          }),
          new Paragraph({ text: report.doctor.specialty || 'Radiologist' }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
