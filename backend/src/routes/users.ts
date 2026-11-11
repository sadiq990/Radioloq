import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const safeUserSelect = {
  id: true,
  email: true,
  role: true,
  firstName: true,
  lastName: true,
  specialty: true,
  phone: true,
  bio: true,
  avatarUrl: true,
  isVerified: true,
  isActive: true,
  clinicId: true,
  clinic: true,
  createdAt: true,
  updatedAt: true,
};

// GET /api/users/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: safeUserSelect,
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err) {
    console.error('Get me error:', err);
    return res.status(500).json({ error: 'Failed to load profile' });
  }
});

// PUT /api/users/me
router.put('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, specialty, phone, bio } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(specialty !== undefined && { specialty }),
        ...(phone !== undefined && { phone }),
        ...(bio !== undefined && { bio }),
      },
      select: safeUserSelect,
    });
    return res.json(user);
  } catch (err) {
    console.error('Update me error:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/users/me/password
router.put('/me/password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Current password and new password (min 8 chars) are required' });
    }
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Update password error:', err);
    return res.status(500).json({ error: 'Failed to update password' });
  }
});

// PUT /api/users/me/clinic
router.put('/me/clinic', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, address, phone, email, website } = req.body;
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { clinicId: true },
    });

    if (currentUser?.clinicId) {
      const clinic = await prisma.clinic.update({
        where: { id: currentUser.clinicId },
        data: { name, address, phone, email, website },
      });
      return res.json(clinic);
    } else {
      if (!name) return res.status(400).json({ error: 'Clinic name is required' });
      const clinic = await prisma.clinic.create({
        data: { name, address, phone, email, website },
      });
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { clinicId: clinic.id },
      });
      return res.json(clinic);
    }
  } catch (err) {
    console.error('Update clinic error:', err);
    return res.status(500).json({ error: 'Failed to update clinic info' });
  }
});

// GET /api/users/doctors - Public doctor directory
router.get('/doctors', async (req: Request, res: Response) => {
  try {
    const { specialty, search, page = '1', limit = '20' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { role: 'DOCTOR', isActive: true };
    if (specialty) where.specialty = { contains: specialty, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { specialty: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [doctors, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          specialty: true,
          bio: true,
          avatarUrl: true,
          clinic: { select: { name: true, address: true } },
        },
        skip,
        take: limitNum,
        orderBy: { firstName: 'asc' },
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      doctors,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error('Doctors directory error:', err);
    return res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

// GET /api/users/doctors/:id
router.get('/doctors/:id', async (req: Request, res: Response) => {
  try {
    const doctor = await prisma.user.findFirst({
      where: { id: req.params.id, role: 'DOCTOR', isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        specialty: true,
        bio: true,
        avatarUrl: true,
        clinic: { select: { name: true, address: true, phone: true } },
      },
    });
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    return res.json(doctor);
  } catch (err) {
    console.error('Get doctor error:', err);
    return res.status(500).json({ error: 'Failed to load doctor' });
  }
});

export default router;
