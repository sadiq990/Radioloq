import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportApi, templateApi } from '../lib/api';
import toast from 'react-hot-toast';
import { Save, CheckCircle, Download, FileText, ArrowLeft, Loader2, Eye, X } from 'lucide-react';

export default function ReportEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    clinicalHistory: '',
    technique: '',
    findings: '',
    impression: '',
    recommendation: '',
  });

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportApi.get(id!).then((r) => r.data),
  });

  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templateApi.list().then((r) => r.data),
  });

  useEffect(() => {
    if (report) {
      setForm({
        title: report.title || '',
        clinicalHistory: report.clinicalHistory || '',
        technique: report.technique || '',
        findings: report.findings || '',
        impression: report.impression || '',
        recommendation: report.recommendation || '',
      });
    }
  }, [report]);

  const set =
    (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const saveMut = useMutation({
    mutationFn: () => reportApi.update(id!, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report', id] });
      toast.success('Report saved');
    },
    onError: () => toast.error('Save failed'),
  });

  const finalizeMut = useMutation({
    mutationFn: async () => {
      await reportApi.update(id!, form);
      return reportApi.finalize(id!);
    },
    onSuccess: () => {
      toast.success('Report finalized!');
      navigate('/reports');
    },
    onError: () => toast.error('Finalize failed'),
  });

  const applyTemplate = (templateId: string) => {
    const tmpl = templates?.find((t: any) => t.id === templateId);
    if (tmpl?.content) {
      setForm((f) => ({
        ...f,
        title: f.title === 'New Radiology Report' ? `${tmpl.name} Report` : f.title,
        technique: tmpl.content.technique || f.technique,
        findings: tmpl.content.findings || f.findings,
        impression: tmpl.content.impression || f.impression,
      }));
      toast.success(`Applied "${tmpl.name}" template`);
    }
  };

  const exportPdf = async () => {
    try {
      await reportApi.update(id!, form);
      const { data: blob } = await reportApi.exportPdf(id!);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${id!.substring(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('PDF export failed');
    }
  };

  const exportDocx = async () => {
    try {
      await reportApi.update(id!, form);
      const { data: blob } = await reportApi.exportDocx(id!);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${id!.substring(0, 8)}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Word export failed');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary py-1.5 px-3">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Report Editor</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={report?.status === 'DRAFT' ? 'badge-draft' : 'badge-final'}>
                {report?.status}
              </span>
              <span className="text-xs text-slate-400 font-mono">v{report?.version || 1}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setPreviewOpen(true)} className="btn-secondary">
            <Eye className="w-4 h-4" /> Preview
          </button>
          <button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            className="btn-secondary"
          >
            {saveMut.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}{' '}
            Save Draft
          </button>
          <button onClick={exportPdf} className="btn-secondary">
            <Download className="w-4 h-4" /> PDF
          </button>
          <button onClick={exportDocx} className="btn-secondary">
            <FileText className="w-4 h-4" /> Word
          </button>
          <button
            onClick={() => finalizeMut.mutate()}
            disabled={report?.status === 'FINAL' || finalizeMut.isPending}
            className="btn-primary"
          >
            {finalizeMut.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}{' '}
            Finalize
          </button>
        </div>
      </div>

      {/* Template bar */}
      <div className="card mb-6 py-4 flex flex-wrap items-center gap-4">
        <label className="text-sm font-medium text-slate-700 whitespace-nowrap">
          Load Template:
        </label>
        <select
          className="input max-w-xs"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) applyTemplate(e.target.value);
          }}
        >
          <option value="">Choose a radiology template...</option>
          {templates?.map((t: any) => (
            <option key={t.id} value={t.id}>
              {t.name} {t.modality ? `(${t.modality})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="card space-y-5">
        <div>
          <label className="label">Report Title</label>
          <input className="input font-medium" value={form.title} onChange={set('title')} />
        </div>
        {(
          ['clinicalHistory', 'technique', 'findings', 'impression', 'recommendation'] as const
        ).map((field) => (
          <div key={field}>
            <label className="label capitalize">
              {field.replace(/([A-Z])/g, ' $1').trim()}
            </label>
            <textarea
              value={form[field]}
              onChange={set(field)}
              className="input min-h-[110px] resize-y"
            />
          </div>
        ))}
      </div>

      {/* Letterhead Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-8 my-8">
            <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-primary-800">
              <div>
                <h2 className="text-xl font-bold text-primary-800">
                  {report?.doctor?.clinic?.name || 'Radioloq Medical Center'}
                </h2>
                <p className="text-xs text-slate-500">
                  {report?.doctor?.clinic?.address || 'Medical Imaging & Radiology Department'}
                </p>
              </div>
              <button
                onClick={() => setPreviewOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-lg font-bold text-center text-primary-800 mb-6">
              {form.title || 'Radiology Report'}
            </h3>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 grid grid-cols-3 gap-4 text-xs">
              <div>
                <p className="font-semibold text-slate-500">PATIENT</p>
                <p className="text-slate-900 mt-0.5">
                  {report?.consultation?.patient
                    ? `${report.consultation.patient.firstName} ${report.consultation.patient.lastName}`
                    : 'Standalone Report'}
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-500">RADIOLOGIST</p>
                <p className="text-slate-900 mt-0.5">
                  {report?.doctor?.firstName} {report?.doctor?.lastName}
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-500">DATE</p>
                <p className="text-slate-900 mt-0.5">
                  {new Date(report?.createdAt || Date.now()).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              {[
                ['Clinical History', form.clinicalHistory],
                ['Technique', form.technique],
                ['Findings', form.findings],
                ['Impression', form.impression],
                ['Recommendation', form.recommendation],
              ].map(([label, val]) =>
                val ? (
                  <div key={label}>
                    <h4 className="text-xs font-bold uppercase text-primary-800 border-b border-slate-200 pb-1 mb-1.5">
                      {label}
                    </h4>
                    <p className="whitespace-pre-wrap text-slate-800 leading-relaxed">{val}</p>
                  </div>
                ) : null
              )}
            </div>

            <div className="mt-10 pt-6 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
              <div>
                <div className="w-48 border-b border-slate-400 mb-1" />
                <p className="font-medium text-slate-800">
                  {report?.doctor?.firstName} {report?.doctor?.lastName}
                </p>
                <p>{report?.doctor?.specialty || 'Radiologist'}</p>
              </div>
              <p>Confidential Medical Report · Radioloq</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
