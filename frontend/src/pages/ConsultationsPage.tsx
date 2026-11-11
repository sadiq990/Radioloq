import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { consultationApi, userApi, studyApi } from '../lib/api';
import { format } from 'date-fns';
import { Search, Plus, ChevronRight, Loader2, X, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

const statusFilter = ['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED'];

export default function ConsultationsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    doctorId: '',
    studyId: '',
    urgency: 'ROUTINE',
    clinicalQuestion: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['consultations', status],
    queryFn: () =>
      consultationApi.list(status !== 'ALL' ? { status } : {}).then((r) => r.data),
  });

  const { data: doctorsData } = useQuery({
    queryKey: ['doctors-select'],
    queryFn: () => userApi.getDoctors({ limit: 50 }).then((r) => r.data),
    enabled: modalOpen,
  });

  const { data: studiesData } = useQuery({
    queryKey: ['studies-select'],
    queryFn: () => studyApi.list({ limit: 50 }).then((r) => r.data),
    enabled: modalOpen,
  });

  const createMut = useMutation({
    mutationFn: () => consultationApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consultations'] });
      toast.success('Consultation created');
      setModalOpen(false);
      setForm({ doctorId: '', studyId: '', urgency: 'ROUTINE', clinicalQuestion: '' });
    },
    onError: () => toast.error('Failed to create consultation'),
  });

  const filtered =
    data?.consultations?.filter((c: any) => {
      if (!search) return true;
      const name = `${c.patient?.firstName || ''} ${c.patient?.lastName || ''} ${c.clinicalQuestion || ''}`.toLowerCase();
      return name.includes(search.toLowerCase());
    }) ?? [];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary-700" />
            Consultations
          </h1>
          <p className="text-slate-500 mt-1 text-sm">{data?.total ?? 0} total cases</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Consultation
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search patients or clinical notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {statusFilter.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  status === s
                    ? 'bg-primary-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">No consultations found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Patient', 'Study', 'Date', 'Urgency', 'Status', 'Reports', ''].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">
                        {c.patient?.firstName} {c.patient?.lastName}
                      </p>
                      <p className="text-xs text-slate-400">{c.patient?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {c.study ? `${c.study.modality} — ${c.study.description}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {format(new Date(c.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge-${c.urgency?.toLowerCase()}`}>{c.urgency}</span>
                    </td>
                    <td className="px-4 py-3">
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
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {c.reports?.length ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/consultations/${c.id}`}
                        className="text-primary-700 hover:text-primary-900 inline-flex items-center gap-1 text-sm font-medium"
                      >
                        Open <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Consultation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Request Radiology Consultation</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Assign Radiologist (optional)</label>
                <select
                  className="input"
                  value={form.doctorId}
                  onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
                >
                  <option value="">Any available specialist</option>
                  {doctorsData?.doctors?.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.firstName} {d.lastName} {d.specialty ? `(${d.specialty})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Attach DICOM Study (optional)</label>
                <select
                  className="input"
                  value={form.studyId}
                  onChange={(e) => setForm({ ...form, studyId: e.target.value })}
                >
                  <option value="">No study attached</option>
                  {studiesData?.studies?.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.modality} — {s.description} ({s.patientName})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Urgency</label>
                <select
                  className="input"
                  value={form.urgency}
                  onChange={(e) => setForm({ ...form, urgency: e.target.value })}
                >
                  <option value="ROUTINE">Routine</option>
                  <option value="URGENT">Urgent</option>
                  <option value="STAT">STAT (Immediate)</option>
                </select>
              </div>
              <div>
                <label className="label">Clinical History & Question</label>
                <textarea
                  className="input min-h-[100px]"
                  placeholder="Describe symptoms, history, and specific diagnostic question..."
                  value={form.clinicalQuestion}
                  onChange={(e) => setForm({ ...form, clinicalQuestion: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={() => createMut.mutate()}
                  disabled={createMut.isPending || !form.clinicalQuestion.trim()}
                  className="btn-primary"
                >
                  {createMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
