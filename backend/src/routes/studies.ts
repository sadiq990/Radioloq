import { Router, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(authenticate);

const dicomUploadDir = path.resolve(process.cwd(), 'uploads', 'dicom');
fs.mkdirSync(dicomUploadDir, { recursive: true });

const upload = multer({
  dest: dicomUploadDir,
  limits: { fileSize: 500 * 1024 * 1024 },
});

// GET /api/studies
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', modality, search } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (req.user!.role !== 'SUPER_ADMIN') {
      where.uploadedById = req.user!.id;
    }
    if (modality) where.modality = modality;
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { patientName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [studies, total] = await Promise.all([
      prisma.study.findMany({
        where,
        include: { series: true },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.study.count({ where }),
    ]);

    return res.json({
      studies,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error('List studies error:', err);
    return res.status(500).json({ error: 'Failed to load studies' });
  }
});

// GET /api/studies/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const study = await prisma.study.findUnique({
      where: { id: req.params.id },
      include: {
        series: true,
        uploadedBy: { select: { firstName: true, lastName: true } },
      },
    });
    if (!study) return res.status(404).json({ error: 'Study not found' });

    let files: string[] = [];
    if (study.storagePath && fs.existsSync(study.storagePath)) {
      files = fs
        .readdirSync(study.storagePath)
        .filter((f) => !f.startsWith('.'))
        .sort();
    }

    return res.json({ ...study, files });
  } catch (err) {
    console.error('Get study error:', err);
    return res.status(500).json({ error: 'Failed to load study' });
  }
});

// GET /api/studies/:id/files/:filename - Stream DICOM file for Cornerstone3D
router.get('/:id/files/:filename', async (req: AuthRequest, res: Response) => {
  try {
    const study = await prisma.study.findUnique({ where: { id: req.params.id } });
    if (!study || !study.storagePath) {
      return res.status(404).json({ error: 'Study files not found' });
    }

    const safeName = path.basename(req.params.filename);
    const filePath = path.join(study.storagePath, safeName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.setHeader('Content-Type', 'application/dicom');
    return res.sendFile(filePath);
  } catch (err) {
    console.error('Serve DICOM file error:', err);
    return res.status(500).json({ error: 'Failed to stream DICOM file' });
  }
});

// POST /api/studies/upload
router.post('/upload', upload.array('files', 100), async (req: AuthRequest, res: Response) => {
  try {
    const { description, patientName, patientId, modality } = req.body;
    const files = (req.files as Express.Multer.File[]) || [];
    const studyUid = uuidv4();
    const studyFolder = path.join(dicomUploadDir, studyUid);
    fs.mkdirSync(studyFolder, { recursive: true });

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const safeOriginal = path.basename(f.originalname || `slice-${i + 1}.dcm`);
      const target = path.join(studyFolder, `${String(i + 1).padStart(4, '0')}-${safeOriginal}`);
      fs.renameSync(f.path, target);
    }

    const study = await prisma.study.create({
      data: {
        studyUid,
        description: description || (files.length > 0 ? files[0].originalname : 'Uploaded Study'),
        patientName: patientName || 'Anonymous Patient',
        patientId: patientId || null,
        modality: modality || 'CT',
        storagePath: studyFolder,
        uploadedById: req.user!.id,
        studyDate: new Date(),
        series: {
          create: {
            seriesUid: uuidv4(),
            description: `${modality || 'CT'} Primary Series`,
            modality: modality || 'CT',
            numInstances: files.length,
          },
        },
      },
      include: { series: true },
    });

    return res.status(201).json(study);
  } catch (err) {
    console.error('Upload study error:', err);
    return res.status(500).json({ error: 'Study upload failed' });
  }
});

// DELETE /api/studies/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const study = await prisma.study.findUnique({ where: { id: req.params.id } });
    if (study?.storagePath && fs.existsSync(study.storagePath)) {
      fs.rmSync(study.storagePath, { recursive: true, force: true });
    }
    await prisma.study.delete({ where: { id: req.params.id } });
    return res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Delete study error:', err);
    return res.status(500).json({ error: 'Failed to delete study' });
  }
});

export default router;
