import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = (p: string) => bcrypt.hash(p, 12);

  // Create a clinic
  const clinic = await prisma.clinic.upsert({
    where: { id: 'clinic-1' },
    update: {},
    create: {
      id: 'clinic-1',
      name: 'Radioloq Medical Center',
      address: '123 Medical Ave, Healthcare City',
      phone: '+1-555-0100',
      email: 'info@radioloqclinic.com',
    },
  });

  // Create doctor
  const doctor = await prisma.user.upsert({
    where: { email: 'doctor@radioloq.com' },
    update: {},
    create: {
      email: 'doctor@radioloq.com',
      passwordHash: await hash('password123'),
      role: UserRole.DOCTOR,
      firstName: 'Dr. James',
      lastName: 'Wilson',
      specialty: 'Radiology',
      isVerified: true,
      clinicId: clinic.id,
    },
  });

  // Create patient
  const patient = await prisma.user.upsert({
    where: { email: 'patient@radioloq.com' },
    update: {},
    create: {
      email: 'patient@radioloq.com',
      passwordHash: await hash('password123'),
      role: UserRole.PATIENT,
      firstName: 'John',
      lastName: 'Doe',
      isVerified: true,
    },
  });

  // Create admin
  await prisma.user.upsert({
    where: { email: 'admin@radioloq.com' },
    update: {},
    create: {
      email: 'admin@radioloq.com',
      passwordHash: await hash('password123'),
      role: UserRole.SUPER_ADMIN,
      firstName: 'Admin',
      lastName: 'User',
      isVerified: true,
    },
  });

  // Create default templates
  const templateData = [
    {
      name: 'CT Brain',
      modality: 'CT',
      bodyPart: 'Brain',
      content: {
        clinicalHistory: '',
        technique: 'Non-contrast CT of the brain was performed.',
        findings:
          'The brain parenchyma shows normal attenuation. No acute intracranial hemorrhage, mass lesion, or midline shift. The ventricles and sulci are normal in size. No extra-axial fluid collections. The osseous structures are intact.',
        impression: 'No acute intracranial abnormality.',
      },
    },
    {
      name: 'CT Chest',
      modality: 'CT',
      bodyPart: 'Chest',
      content: {
        clinicalHistory: '',
        technique: 'CT of the chest was performed with IV contrast.',
        findings:
          'The lungs are clear. No pleural effusion or pneumothorax. The mediastinum is unremarkable. No lymphadenopathy. The heart is normal in size. The osseous structures are intact.',
        impression: 'No acute cardiopulmonary abnormality.',
      },
    },
    {
      name: 'Chest X-Ray',
      modality: 'XR',
      bodyPart: 'Chest',
      content: {
        clinicalHistory: '',
        technique: 'PA and lateral views of the chest.',
        findings:
          'The lungs are clear. No pleural effusion or pneumothorax. Cardiac silhouette is normal in size. The mediastinum is unremarkable. Osseous structures are intact.',
        impression: 'No acute cardiopulmonary process.',
      },
    },
    {
      name: 'MRI Brain',
      modality: 'MRI',
      bodyPart: 'Brain',
      content: {
        clinicalHistory: '',
        technique:
          'MRI of the brain was performed with and without contrast, including T1, T2, FLAIR, DWI, and post-contrast T1 sequences.',
        findings:
          'No acute infarct on diffusion-weighted imaging. No abnormal enhancement. White matter signal is normal. The ventricles and sulci are appropriate for age. No mass effect or midline shift.',
        impression: 'Normal MRI brain.',
      },
    },
    {
      name: 'Abdominal Ultrasound',
      modality: 'US',
      bodyPart: 'Abdomen',
      content: {
        clinicalHistory: '',
        technique: 'Real-time grayscale and Doppler ultrasound of the abdomen.',
        findings:
          'Liver: Normal size and echogenicity. No focal lesions. No biliary ductal dilatation.\nGallbladder: Normal. No cholelithiasis or wall thickening.\nSpleen: Normal size and echogenicity.\nPancreas: Visualized portions appear normal.\nKidneys: Normal size and echogenicity bilaterally. No hydronephrosis or calculi.',
        impression: 'Normal abdominal ultrasound.',
      },
    },
  ];

  for (const tmpl of templateData) {
    await prisma.template.create({
      data: {
        ...tmpl,
        isGlobal: true,
        createdById: doctor.id,
      },
    });
  }

  // Create a sample consultation
  const consultation = await prisma.consultation.create({
    data: {
      patientId: patient.id,
      doctorId: doctor.id,
      clinicalQuestion:
        'Patient presents with persistent headache for 2 weeks. Rule out intracranial pathology.',
      urgency: 'ROUTINE',
      status: 'PENDING',
    },
  });

  console.log('✅ Seed completed:', {
    clinic,
    doctor: doctor.email,
    patient: patient.email,
    consultation: consultation.id,
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
