import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationApi, reportApi } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  MessageSquare,
  FileText,
  Send,
  Loader2,
  Monitor,
  CheckCircle,
} from 'lucide-react';

export default function ConsultationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [message, setMessage] = useState('');

  const { data: consult, isLoading } = useQuery({
    queryKey: ['consultation', id],
    queryFn: () => consultationApi.get(id!).then((r) => r.data),
  });

  const sendMsg = useMutation({
    mutationFn: () => consultationApi.addMessage(id!, message),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consultation', id] });
      setMessage('');
    },
    onError: () => toast.error('Failed to send message'),
  });

  const statusMut = useMutation({
    mutationFn: (newStatus: string) => consultationApi.updateStatus(id!, newStatus),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consultation', id] });
      toast.success('Status updated');
    },
  });

  const createReport = useMutation({
    mutationFn: () =>
      reportApi.create({
        consultationId: id,
        title: `Report for ${consult?.patient?.firstName || 'Patient'} ${consult?.patient?.lastName || ''}`,
        clinicalHistory: consult?.clinicalQuestion || '',
      }),
    onSuccess: (res) => navigate(`/reports/${res.data.id}/edit`),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary py-1.5 px-3">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Consultation — {consult?.patient?.firstName} {consult?.patient?.lastName}
            </h1>
            <span
              className={
                consult?.status === 'PENDING'
                  ? 'badge-pending'
                  : consult?.status === 'IN_PROGRESS'
                  ? 'badge-progress'
                  : 'badge-completed'
              }
            >
              {consult?.status?.replace('_', ' ')}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {consult?.study?.id && (
            <Link to={`/viewer?studyId=${consult.study.id}`} className="btn-secondary">
              <Monitor className="w-4 h-4" /> View DICOM
            </Link>
          )}
          {consult?.status === 'PENDING' && (user?.role === 'DOCTOR' || user?.role === 'SUPER_ADMIN') && (
            <button onClick={() => statusMut.mutate('IN_PROGRESS')} className="btn-secondary">
              Accept Case
            </button>
          )}
          {consult?.status === 'COMPLETED' && (user?.role === 'DOCTOR' || user?.role === 'SUPER_ADMIN') && (
            <button onClick={() => statusMut.mutate('DELIVERED')} className="btn-secondary">
              <CheckCircle className="w-4 h-4" /> Mark Delivered
            </button>
          )}
          {(user?.role === 'DOCTOR' || user?.role === 'SUPER_ADMIN') && (
            <button
              onClick={() => createReport.mutate()}
              disabled={createReport.isPending}
              className="btn-primary"
            >
              {createReport.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}{' '}
              Create Report
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-slate-900 mb-3">Clinical Question</h3>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {consult?.clinicalQuestion || 'No clinical question provided'}
            </p>
          </div>
          <div className="card">
            <h3 className="font-semibold text-slate-900 mb-3">Details</h3>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Urgency</dt>
                <dd>
                  <span className={`badge-${consult?.urgency?.toLowerCase()}`}>
                    {consult?.urgency}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Created</dt>
                <dd className="text-slate-700">
                  {consult?.createdAt ? format(new Date(consult.createdAt), 'MMM d, yyyy') : '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Radiologist</dt>
                <dd className="text-slate-700">
                  {consult?.doctor
                    ? `${consult.doctor.firstName} ${consult.doctor.lastName}`
                    : 'Unassigned'}
                </dd>
              </div>
              {consult?.study && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Study</dt>
                  <dd className="text-slate-700">
                    {consult.study.modality} — {consult.study.description}
                  </dd>
                </div>
              )}
            </dl>
          </div>
          {consult?.reports?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-slate-900 mb-3">Associated Reports</h3>
              <div className="space-y-2">
                {consult.reports.map((r: any) => (
                  <button
                    key={r.id}
                    onClick={() => navigate(`/reports/${r.id}/edit`)}
                    className="w-full flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-lg text-sm border border-slate-100"
                  >
                    <span className="text-primary-700 font-medium truncate mr-2">
                      {r.title || 'View Report'}
                    </span>
                    <span className={r.status === 'DRAFT' ? 'badge-draft' : 'badge-final'}>
                      {r.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 card flex flex-col" style={{ minHeight: '420px', maxHeight: '72vh' }}>
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary-700" />
            Consultation Messages
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-0 pr-1">
            {consult?.messages?.length === 0 && (
              <p className="text-center text-slate-400 py-12 text-sm">No messages yet</p>
            )}
            {consult?.messages?.map((m: any) => {
              const isMine = m.sender.id === user?.id;
              return (
                <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                      isMine ? 'bg-primary-800 text-white' : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    <p
                      className={`text-xs font-medium mb-1 ${
                        isMine ? 'text-primary-200' : 'text-slate-500'
                      }`}
                    >
                      {m.sender.firstName} {m.sender.lastName}
                    </p>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (message.trim()) sendMsg.mutate();
                }
              }}
            />
            <button
              onClick={() => sendMsg.mutate()}
              disabled={!message.trim() || sendMsg.isPending}
              className="btn-primary px-4"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
