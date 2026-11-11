import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/bridge/status
router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { clinicId: true },
    });

    if (!user?.clinicId) {
      return res.json({ status: 'NOT_CONFIGURED', message: 'No clinic assigned to this account' });
    }

    let bridge = await prisma.bridgeConnection.findUnique({
      where: { clinicId: user.clinicId },
    });
    if (!bridge) {
      bridge = await prisma.bridgeConnection.create({
        data: { clinicId: user.clinicId },
      });
    }
    return res.json(bridge);
  } catch (err) {
    console.error('Bridge status error:', err);
    return res.status(500).json({ error: 'Failed to load bridge status' });
  }
});

// PUT /api/bridge/config
router.put('/config', async (req: AuthRequest, res: Response) => {
  try {
    let user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, clinicId: true, firstName: true, lastName: true },
    });

    let clinicId = user?.clinicId;
    if (!clinicId) {
      const clinic = await prisma.clinic.create({
        data: { name: `${user?.firstName || 'Radiology'} Clinic` },
      });
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { clinicId: clinic.id },
      });
      clinicId = clinic.id;
    }

    const { aeTitleLocal, pacsHost, pacsPort } = req.body;
    const bridge = await prisma.bridgeConnection.upsert({
      where: { clinicId },
      update: {
        aeTitleLocal: aeTitleLocal || 'RADIOLOQ',
        pacsHost: pacsHost || null,
        pacsPort: parseInt(pacsPort) || 4242,
      },
      create: {
        clinicId,
        aeTitleLocal: aeTitleLocal || 'RADIOLOQ',
        pacsHost: pacsHost || null,
        pacsPort: parseInt(pacsPort) || 4242,
      },
    });
    return res.json(bridge);
  } catch (err) {
    console.error('Bridge config error:', err);
    return res.status(500).json({ error: 'Failed to save bridge config' });
  }
});

// POST /api/bridge/test - Check Orthanc / PACS availability
router.post('/test', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { clinicId: true },
    });
    if (!user?.clinicId) {
      return res.status(400).json({ error: 'Configure bridge settings first' });
    }

    const orthancUrl = process.env.ORTHANC_URL || 'http://localhost:8042';
    let connected = false;
    let detail = '';

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const resp = await fetch(`${orthancUrl}/system`, { signal: controller.signal });
      clearTimeout(timeout);
      if (resp.ok) {
        const info: any = await resp.json();
        connected = true;
        detail = `Connected to Orthanc ${info?.Version || ''} (Name: ${info?.Name || 'Radioloq'})`;
      } else {
        detail = `Orthanc returned HTTP ${resp.status}`;
      }
    } catch (e: any) {
      detail = `Unable to reach DICOM server at ${orthancUrl}: ${e.message}`;
    }

    const bridge = await prisma.bridgeConnection.update({
      where: { clinicId: user.clinicId },
      data: {
        status: connected ? 'CONNECTED' : 'ERROR',
        lastSync: connected ? new Date() : undefined,
        errorLog: connected ? null : `[${new Date().toISOString()}] ${detail}`,
      },
    });

    return res.json({ bridge, connected, detail });
  } catch (err) {
    console.error('Bridge test error:', err);
    return res.status(500).json({ error: 'Bridge test failed' });
  }
});

// GET /api/bridge/logs
router.get('/logs', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { clinicId: true },
    });
    if (!user?.clinicId) return res.json({ errorLog: '', lastSync: null, studiesSynced: 0 });
    const bridge = await prisma.bridgeConnection.findUnique({
      where: { clinicId: user.clinicId },
    });
    return res.json({
      errorLog: bridge?.errorLog || '',
      lastSync: bridge?.lastSync || null,
      studiesSynced: bridge?.studiesSynced || 0,
    });
  } catch (err) {
    console.error('Bridge logs error:', err);
    return res.status(500).json({ error: 'Failed to load logs' });
  }
});

export default router;
