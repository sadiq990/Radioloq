import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { consultationApi, reportApi, studyApi } from '../lib/api';
import { Link } from 'react-router-dom';
import {
  Activity,
  FileText,
  Clock,
  CheckCircle,
  ArrowRight,
  Plus,
  Mic,
  Monitor,
  FolderOpen,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';

function StatCard({ label, value, icon: Icon, color, sub }: any) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-900">{value ?? '—'}</div>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: consultsData } = useQuery({
    queryKey: ['consultations-dash'],
    queryFn: () => consultationApi.list({ limit: 5 }).then((r) => r.data),
  });
  const { data: reportsData } = useQuery({
    queryKey: ['reports-dash'],
    queryFn: () => reportApi.list({ limit: 5 }).then((r) => r.data),
  });
  const { data: studiesData } = useQuery({
    queryKey: ['studies-dash'],
    queryFn: () => studyApi.list({ limit: 5 }).then((r) => r.data),
  });

  const pending =
    consultsData?.consultations?.filter((c: any) => c.status === 'PENDING').length ?? 0;
  const completed =
    consultsData?.consultations?.filter(
      (c: any) => c.status === 'COMPLETED' || c.status === 'DELIVERED'
    ).length ?? 0;
  const totalReports = reportsData?.total ?? 0;
  const draftReports =
    reportsData?.reports?.filter((r: any) => r.status === 'DRAFT').length ?? 0;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.firstName}
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/viewer" className="btn-secondary">
            <Monitor className="w-4 h-4" /> Open DICOM Viewer
          </Link>
          <Link to="/consultations" className="btn-primary">
            <Plus className="w-4 h-4" /> New Consultation
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Pending Consultations"
          value={pending}
          icon={Clock}
          color="bg-amber-500"
          sub="Awaiting review"
        />
        <StatCard
          label="Completed Cases"
          value={completed}
          icon={CheckCircle}
          color="bg-emerald-500"
          sub="Completed or delivered"
        />
        <StatCard
          label="Reports"
          value={totalReports}
          icon={FileText}
          color="bg-primary-800"
          sub={`${draftReports} drafts`}
        />
        <StatCard
          label="Uploaded Studies"
          value={studiesData?.total ?? 0}
          icon={FolderOpen}
          color="bg-purple-600"
          sub="DICOM studies"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Link
          to="/voice"
          className="card p-4 hover:border-primary-300 transition-colors flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Voice AI</p>
            <p className="text-xs text-slate-500">Dictate report</p>
          </div>
        </Link>
        <Link
          to="/viewer"
          className="card p-4 hover:border-primary-300 transition-colors flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">DICOM Viewer</p>
            <p className="text-xs text-slate-500">Inspect scans</p>
          </div>
        </Link>
        <Link
          to="/studies"
          className="card p-4 hover:border-primary-300 transition-colors flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Upload Study</p>
            <p className="text-xs text-slate-500">Manage DICOM</p>
          </div>
        </Link>
        <Link
          to="/directory"
          className="card p-4 hover:border-primary-300 transition-colors flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Specialists</p>
            <p className="text-xs text-slate-500">Doctor directory</p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Consultations */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary-700" />
              Recent Consultations
            </h2>
            <Link
              to="/consultations"
              className="text-sm text-primary-700 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {(!consultsData?.consultations || consultsData.consultations.length === 0) && (
              <p className="text-slate-400 text-sm text-center py-8">No consultations yet</p>
            )}
            {consultsData?.consultations?.map((c: any) => (
              <Link
                key={c.id}
                to={`/consultations/${c.id}`}
                className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {c.patient?.firstName} {c.patient?.lastName}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {format(new Date(c.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge-${c.urgency?.toLowerCase()}`}>{c.urgency}</span>
                  <span
                    className={
                      c.status === 'PENDING'
                        ? 'badge-pending'
                        : c.status === 'IN_PROGRESS'
                        ? 'badge-progress'
                        : 'badge-completed'
                    }
                  >
                    {c.status.replace('_', ' ')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Reports */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary-700" />
              Recent Reports
            </h2>
            <Link
              to="/reports"
              className="text-sm text-primary-700 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {(!reportsData?.reports || reportsData.reports.length === 0) && (
              <p className="text-slate-400 text-sm text-center py-8">No reports yet</p>
            )}
            {reportsData?.reports?.map((r: any) => (
              <Link
                key={r.id}
                to={`/reports/${r.id}/edit`}
                className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{r.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {format(new Date(r.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
                <span className={r.status === 'DRAFT' ? 'badge-draft' : 'badge-final'}>
                  {r.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
