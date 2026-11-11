import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/consultations
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, urgency, page = '1', limit = '20' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;
    const { id: userId, role } = req.user!;

    const where: any = {};
    if (status) where.status = status;
    if (urgency) where.urgency = urgency;
    if (role === 'DOCTOR') {
      where.OR = [{ doctorId: userId }, { doctorId: null }];
    } else if (role === 'PATIENT') {
      where.patientId = userId;
    }

    const [consultations, total] = await Promise.all([
      prisma.consultation.findMany({
        where,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, email: true } },
          doctor: { select: { id: true, firstName: true, lastName: true, specialty: true } },
          study: { select: { id: true, description: true, modality: true } },
          reports: { select: { id: true, status: true, title: true } },
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.consultation.count({ where }),
    ]);

    return res.json({
      consultations,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error('List consultations error:', err);
    return res.status(500).json({ error: 'Failed to load consultations' });
  }
});

// GET /api/consultations/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const consultation = await prisma.consultation.findUnique({
      where: { id: req.params.id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        doctor: { select: { id: true, firstName: true, lastName: true, specialty: true } },
        study: { include: { series: true } },
        messages: {
          include: { sender: { select: { id: true, firstName: true, lastName: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        reports: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!consultation) return res.status(404).json({ error: 'Consultation not found' });
    return res.json(consultation);
  } catch (err) {
    console.error('Get consultation error:', err);
    return res.status(500).json({ error: 'Failed to load consultation' });
  }
});

// POST /api/consultations
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { doctorId, studyId, clinicalQuestion, urgency, notes, patientId } = req.body;
    const effectivePatientId = req.user!.role === 'PATIENT' ? req.user!.id : patientId || req.user!.id;
    const effectiveDoctorId = doctorId || (req.user!.role === 'DOCTOR' ? req.user!.id : null);

    const consultation = await prisma.consultation.create({
      data: {
        patientId: effectivePatientId,
        doctorId: effectiveDoctorId,
        studyId: studyId || null,
        clinicalQuestion: clinicalQuestion || '',
        notes: notes || null,
        urgency: urgency || 'ROUTINE',
        status: 'PENDING',
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        doctor: { select: { id: true, firstName: true, lastName: true, specialty: true } },
        study: { select: { id: true, description: true, modality: true } },
      },
    });
    return res.status(201).json(consultation);
  } catch (err) {
    console.error('Create consultation error:', err);
    return res.status(500).json({ error: 'Failed to create consultation' });
  }
});

// PUT /api/consultations/:id/status
router.put('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const allowed = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED', 'CANCELLED'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const data: any = { status };
    if (status === 'IN_PROGRESS' && req.user!.role === 'DOCTOR') {
      data.doctorId = req.user!.id;
    }
    if (status === 'COMPLETED' || status === 'DELIVERED') {
      data.completedAt = new Date();
    }
    const consultation = await prisma.consultation.update({
      where: { id: req.params.id },
      data,
    });
    return res.json(consultation);
  } catch (err) {
    console.error('Update consultation status error:', err);
    return res.status(500).json({ error: 'Failed to update status' });
  }
});

// POST /api/consultations/:id/messages
router.post('/:id/messages', async (req: AuthRequest, res: Response) => {
  try {
    const content = req.body.content?.trim();
    if (!content) return res.status(400).json({ error: 'Message content cannot be empty' });

    const message = await prisma.message.create({
      data: {
        consultationId: req.params.id,
        senderId: req.user!.id,
        content,
      },
      include: { sender: { select: { id: true, firstName: true, lastName: true, role: true } } },
    });
    return res.status(201).json(message);
  } catch (err) {
    console.error('Add message error:', err);
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET /api/consultations/:id/messages
router.get('/:id/messages', async (req: AuthRequest, res: Response) => {
  try {
    const messages = await prisma.message.findMany({
      where: { consultationId: req.params.id },
      include: { sender: { select: { id: true, firstName: true, lastName: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return res.json(messages);
  } catch (err) {
    console.error('Get messages error:', err);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;
