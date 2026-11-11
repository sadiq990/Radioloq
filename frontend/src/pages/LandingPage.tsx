import { Link } from 'react-router-dom';
import { Radio, Mic, Monitor, FileText, Wifi, Users, ArrowRight, ShieldCheck } from 'lucide-react';

const features = [
  {
    icon: Monitor,
    title: 'Web DICOM Viewer',
    desc: 'Browser-based medical image viewing powered by Cornerstone3D with window/level presets, zoom, pan, measurements, and multi-slice stack scrolling.',
  },
  {
    icon: Mic,
    title: 'Voice AI Reporting',
    desc: 'Dictate radiology findings naturally via microphone or browser speech — AI transcribes and structures them into Clinical History, Technique, Findings, and Impression.',
  },
  {
    icon: FileText,
    title: 'Reports & Templates',
    desc: 'Create, edit, version, finalize, and export diagnostic reports as clinic-branded PDF or Microsoft Word (.docx) documents.',
  },
  {
    icon: Users,
    title: 'Online Consultations',
    desc: 'End-to-end consultation queue with urgency tagging (Routine / Urgent / STAT), linked DICOM studies, and doctor-patient messaging threads.',
  },
  {
    icon: Wifi,
    title: 'Clinic PACS Bridge',
    desc: 'Connect your clinic PACS / Orthanc DICOM server with AE Title configuration, live connectivity checks, and sync logs.',
  },
  {
    icon: ShieldCheck,
    title: 'Doctor Directory',
    desc: 'Search verified radiologists by subspecialty and clinic affiliation, and request second opinions in a few clicks.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Radio className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Radioloq</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-slate-300 hover:text-white text-sm font-medium transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="bg-primary-700 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-primary-900/50 border border-primary-700/70 rounded-full px-4 py-1.5 text-primary-300 text-sm mb-6">
          <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
          Digital Radiology Workspace · DICOM · Voice AI · Consultations
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
          The Modern Workspace for{' '}
          <span className="text-primary-400">Digital Radiology</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10">
          Review DICOM imaging in the browser, dictate structured reports with AI, collaborate on
          consultations, and connect your clinic PACS — all in one unified platform.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="bg-primary-700 hover:bg-primary-600 text-white px-8 py-3.5 rounded-xl font-semibold text-base transition-colors inline-flex items-center gap-2"
          >
            Create Account <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/login"
            className="bg-white/10 hover:bg-white/20 text-white px-8 py-3.5 rounded-xl font-semibold text-base transition-colors"
          >
            Sign In to Workspace
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-slate-800/50 border border-slate-700/80 rounded-2xl p-6 hover:border-primary-500/70 transition-colors"
            >
              <div className="w-12 h-12 bg-primary-900/70 rounded-xl flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-primary-400" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center text-slate-500 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Radio className="w-4 h-4 text-primary-400" />
          <span className="font-semibold text-slate-300">Radioloq</span>
        </div>
        <p>© {new Date().getFullYear()} Radioloq Platform. Built with Open DICOM Standards.</p>
      </footer>
    </div>
  );
}
