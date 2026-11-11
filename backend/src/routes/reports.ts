import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generatePDF } from '../services/pdfService';
import { generateDocx } from '../services/docxService';

const router = Router();
router.use(authenticate);

// GET /api/reports
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, search, page = '1', limit = '20' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (req.user!.role === 'PATIENT') {
      where.consultation = { patientId: req.user!.id };
      where.status = 'FINAL';
    } else if (req.user!.role === 'DOCTOR') {
      where.doctorId = req.user!.id;
    }

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { findings: { contains: search, mode: 'insensitive' } },
        { impression: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          consultation: {
            include: { patient: { select: { id: true, firstName: true, lastName: true } } },
          },
          template: { select: { id: true, name: true, modality: true } },
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.report.count({ where }),
    ]);

    return res.json({
      reports,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error('List reports error:', err);
    return res.status(500).json({ error: 'Failed to load reports' });
  }
});

// GET /api/reports/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
      include: {
        consultation: {
          include: { patient: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialty: true,
            clinic: { select: { name: true, address: true, phone: true, email: true, logoUrl: true } },
          },
        },
        template: true,
      },
    });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    return res.json(report);
  } catch (err) {
    console.error('Get report error:', err);
    return res.status(500).json({ error: 'Failed to load report' });
  }
});

// POST /api/reports
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      consultationId,
      templateId,
      title,
      clinicalHistory,
      technique,
      findings,
      impression,
      recommendation,
    } = req.body;

    const report = await prisma.report.create({
      data: {
        consultationId: consultationId || null,
        templateId: templateId || null,
        doctorId: req.user!.id,
        title: title || 'Radiology Report',
        clinicalHistory: clinicalHistory || '',
        technique: technique || '',
        findings: findings || '',
        impression: impression || '',
        recommendation: recommendation || '',
        status: 'DRAFT',
      },
    });
    return res.status(201).json(report);
  } catch (err) {
    console.error('Create report error:', err);
    return res.status(500).json({ error: 'Failed to create report' });
  }
});

// PUT /api/reports/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      clinicalHistory,
      technique,
      findings,
      impression,
      recommendation,
      status,
      templateId,
    } = req.body;

    const existing = await prisma.report.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Report not found' });

    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(clinicalHistory !== undefined && { clinicalHistory }),
        ...(technique !== undefined && { technique }),
        ...(findings !== undefined && { findings }),
        ...(impression !== undefined && { impression }),
        ...(recommendation !== undefined && { recommendation }),
        ...(status !== undefined && { status }),
        ...(templateId !== undefined && { templateId }),
        version: { increment: 1 },
      },
    });
    return res.json(report);
  } catch (err) {
    console.error('Update report error:', err);
    return res.status(500).json({ error: 'Failed to update report' });
  }
});

// DELETE /api/reports/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.report.delete({ where: { id: req.params.id } });
    return res.json({ message: 'Report deleted' });
  } catch (err) {
    console.error('Delete report error:', err);
    return res.status(500).json({ error: 'Failed to delete report' });
  }
});

// POST /api/reports/:id/finalize
router.post('/:id/finalize', async (req: AuthRequest, res: Response) => {
  try {
    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: { status: 'FINAL' },
    });
    if (report.consultationId) {
      await prisma.consultation.update({
        where: { id: report.consultationId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    }
    return res.json(report);
  } catch (err) {
    console.error('Finalize report error:', err);
    return res.status(500).json({ error: 'Failed to finalize report' });
  }
});

// POST /api/reports/:id/export/pdf
router.post('/:id/export/pdf', async (req: AuthRequest, res: Response) => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
      include: {
        doctor: {
          select: {
            firstName: true,
            lastName: true,
            specialty: true,
            clinic: { select: { name: true, address: true, phone: true } },
          },
        },
        consultation: {
          include: { patient: { select: { firstName: true, lastName: true } } },
        },
      },
    });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const pdfBuffer = await generatePDF(report as any);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${report.id.substring(0, 8)}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF generation error:', err);
    return res.status(500).json({ error: 'PDF generation failed' });
  }
});

// POST /api/reports/:id/export/docx
router.post('/:id/export/docx', async (req: AuthRequest, res: Response) => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
      include: {
        doctor: {
          select: {
            firstName: true,
            lastName: true,
            specialty: true,
            clinic: { select: { name: true, address: true } },
          },
        },
        consultation: {
          include: { patient: { select: { firstName: true, lastName: true } } },
        },
      },
    });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const docxBuffer = await generateDocx(report as any);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', `attachment; filename="report-${report.id.substring(0, 8)}.docx"`);
    return res.send(docxBuffer);
  } catch (err) {
    console.error('DOCX generation error:', err);
    return res.status(500).json({ error: 'DOCX generation failed' });
  }
});

export default router;
