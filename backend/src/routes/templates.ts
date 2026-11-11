import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/templates
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const templates = await prisma.template.findMany({
      where: { OR: [{ isGlobal: true }, { createdById: req.user!.id }] },
      include: { createdBy: { select: { firstName: true, lastName: true } } },
      orderBy: [{ isGlobal: 'desc' }, { name: 'asc' }],
    });
    return res.json(templates);
  } catch (err) {
    console.error('List templates error:', err);
    return res.status(500).json({ error: 'Failed to load templates' });
  }
});

// GET /api/templates/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const tmpl = await prisma.template.findUnique({ where: { id: req.params.id } });
    if (!tmpl) return res.status(404).json({ error: 'Template not found' });
    return res.json(tmpl);
  } catch (err) {
    console.error('Get template error:', err);
    return res.status(500).json({ error: 'Failed to load template' });
  }
});

// POST /api/templates
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, modality, bodyPart, description, content } = req.body;
    if (!name) return res.status(400).json({ error: 'Template name is required' });
    const tmpl = await prisma.template.create({
      data: {
        name,
        modality: modality || null,
        bodyPart: bodyPart || null,
        description: description || null,
        content: content || {},
        createdById: req.user!.id,
      },
    });
    return res.status(201).json(tmpl);
  } catch (err) {
    console.error('Create template error:', err);
    return res.status(500).json({ error: 'Failed to create template' });
  }
});

// PUT /api/templates/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, modality, bodyPart, description, content } = req.body;
    const tmpl = await prisma.template.update({
      where: { id: req.params.id },
      data: { name, modality, bodyPart, description, content },
    });
    return res.json(tmpl);
  } catch (err) {
    console.error('Update template error:', err);
    return res.status(500).json({ error: 'Failed to update template' });
  }
});

// DELETE /api/templates/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.template.delete({ where: { id: req.params.id } });
    return res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Delete template error:', err);
    return res.status(500).json({ error: 'Failed to delete template' });
  }
});

export default router;
