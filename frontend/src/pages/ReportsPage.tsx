import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { reportApi, templateApi } from '../lib/api';
import { format } from 'date-fns';
import {
  FileText,
  Download,
  Edit,
  Loader2,
  Plus,
  Trash2,
  Search,
  LayoutTemplate,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'reports' | 'templates'>('reports');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tmplModal, setTmplModal] = useState(false);
  const [tmplForm, setTmplForm] = useState({
    name: '',
    modality: 'CT',
    bodyPart: '',
    technique: '',
    findings: '',
    impression: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['reports', statusFilter, search],
    queryFn: () =>
      reportApi
        .list({
          ...(statusFilter && { status: statusFilter }),
          ...(search && { search }),
        })
        .then((r) => r.data),
  });

  const { data: templates, isLoading: tmplLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templateApi.list().then((r) => r.data),
  });

  const createBlankReport = useMutation({
    mutationFn: () => reportApi.create({ title: 'New Radiology Report' }),
    onSuccess: (res) => navigate(`/reports/${res.data.id}/edit`),
    onError: () => toast.error('Could not create report'),
  });

  const deleteReport = useMutation({
    mutationFn: (id: string) => reportApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report deleted');
    },
  });

  const createTemplate = useMutation({
    mutationFn: () =>
      templateApi.create({
        name: tmplForm.name,
        modality: tmplForm.modality,
        bodyPart: tmplForm.bodyPart,
        content: {
          clinicalHistory: '',
          technique: tmplForm.technique,
          findings: tmplForm.findings,
          impression: tmplForm.impression,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template created');
      setTmplModal(false);
      setTmplForm({
        name: '',
        modality: 'CT',
        bodyPart: '',
        technique: '',
        findings: '',
        impression: '',
      });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: (id: string) => templateApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template deleted');
    },
  });

  const exportPdf = async (id: string) => {
    try {
      const { data: blob } = await reportApi.exportPdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${id.substring(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch {
      toast.error('PDF export failed');
    }
  };

  const exportDocx = async (id: string) => {
    try {
      const { data: blob } = await reportApi.exportDocx(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${id.substring(0, 8)}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Word doc downloaded');
    } catch {
      toast.error('DOCX export failed');
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary-700" />
            Reports & Templates
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {data?.total ?? 0} reports · {templates?.length ?? 0} templates
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/voice" className="btn-secondary">
            Voice AI Dictation
          </Link>
          <button
            onClick={() => createBlankReport.mutate()}
            disabled={createBlankReport.isPending}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" /> New Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200 pb-3">
        <button
          onClick={() => setTab('reports')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'reports'
              ? 'bg-primary-800 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Reports ({data?.total ?? 0})
        </button>
        <button
          onClick={() => setTab('templates')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
            tab === 'templates'
              ? 'bg-primary-800 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <LayoutTemplate className="w-4 h-4" /> Templates ({templates?.length ?? 0})
        </button>
      </div>

      {tab === 'reports' ? (
        <>
          <div className="card mb-6 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Search report titles or findings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input w-44"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="FINAL">Final</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div className="card p-0 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Title', 'Patient', 'Date', 'Version', 'Status', 'Actions'].map((h) => (
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
                    {(!data?.reports || data.reports.length === 0) && (
                      <tr>
                        <td colSpan={6} className="px-4 py-16 text-center text-slate-400">
                          No reports found. Create one via Voice AI or New Report.
                        </td>
                      </tr>
                    )}
                    {data?.reports?.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <Link
                            to={`/reports/${r.id}/edit`}
                            className="text-sm font-medium text-slate-900 hover:text-primary-700"
                          >
                            {r.title}
                          </Link>
                          {r.template && (
                            <p className="text-xs text-slate-400">{r.template.name}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {r.consultation?.patient
                            ? `${r.consultation.patient.firstName} ${r.consultation.patient.lastName}`
                            : 'Standalone'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {format(new Date(r.createdAt), 'MMM d, yyyy')}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                          v{r.version}
                        </td>
                        <td className="px-4 py-3">
                          <span className={r.status === 'DRAFT' ? 'badge-draft' : 'badge-final'}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Link
                              to={`/reports/${r.id}/edit`}
                              className="p-1.5 text-slate-500 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => exportPdf(r.id)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Export PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => exportDocx(r.id)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Export Word (.docx)"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            {r.status === 'DRAFT' && (
                              <button
                                onClick={() => deleteReport.mutate(r.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Delete Draft"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setTmplModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> New Template
            </button>
          </div>
          {tmplLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates?.map((t: any) => (
                <div key={t.id} className="card flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900">{t.name}</h3>
                      <span className="badge-progress">{t.modality || 'General'}</span>
                    </div>
                    {t.bodyPart && (
                      <p className="text-xs text-slate-500 mb-2">Region: {t.bodyPart}</p>
                    )}
                    <p className="text-xs text-slate-600 line-clamp-3">
                      {t.content?.findings || t.content?.technique || 'Custom radiology template'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                    <span className="text-[11px] text-slate-400">
                      {t.isGlobal ? 'Global Standard' : 'Personal'}
                    </span>
                    {!t.isGlobal && (
                      <button
                        onClick={() => deleteTemplate.mutate(t.id)}
                        className="text-xs text-red-600 hover:underline inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Template Modal */}
      {tmplModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Create Report Template</h2>
              <button onClick={() => setTmplModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Template Name</label>
                <input
                  className="input"
                  value={tmplForm.name}
                  onChange={(e) => setTmplForm({ ...tmplForm, name: e.target.value })}
                  placeholder="e.g. CT Abdomen with Contrast"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Modality</label>
                  <select
                    className="input"
                    value={tmplForm.modality}
                    onChange={(e) => setTmplForm({ ...tmplForm, modality: e.target.value })}
                  >
                    <option value="CT">CT</option>
                    <option value="MRI">MRI</option>
                    <option value="XR">X-Ray</option>
                    <option value="US">Ultrasound</option>
                  </select>
                </div>
                <div>
                  <label className="label">Body Part</label>
                  <input
                    className="input"
                    value={tmplForm.bodyPart}
                    onChange={(e) => setTmplForm({ ...tmplForm, bodyPart: e.target.value })}
                    placeholder="Abdomen, Spine..."
                  />
                </div>
              </div>
              <div>
                <label className="label">Default Technique</label>
                <textarea
                  className="input min-h-[60px]"
                  value={tmplForm.technique}
                  onChange={(e) => setTmplForm({ ...tmplForm, technique: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Default Findings</label>
                <textarea
                  className="input min-h-[90px]"
                  value={tmplForm.findings}
                  onChange={(e) => setTmplForm({ ...tmplForm, findings: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Default Impression</label>
                <textarea
                  className="input min-h-[60px]"
                  value={tmplForm.impression}
                  onChange={(e) => setTmplForm({ ...tmplForm, impression: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setTmplModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={() => createTemplate.mutate()}
                  disabled={!tmplForm.name.trim() || createTemplate.isPending}
                  className="btn-primary"
                >
                  Save Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
