import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studyApi } from '../lib/api';
import { Link } from 'react-router-dom';
import { FolderOpen, Upload, Trash2, Monitor, Loader2, X, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function StudiesPage() {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [modalityFilter, setModalityFilter] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [meta, setMeta] = useState({ patientName: '', description: '', modality: 'CT' });

  const { data, isLoading } = useQuery({
    queryKey: ['studies', modalityFilter, search],
    queryFn: () =>
      studyApi
        .list({
          ...(modalityFilter && { modality: modalityFilter }),
          ...(search && { search }),
        })
        .then((r) => r.data),
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) {
      return toast.error('Select at least one DICOM file');
    }
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(selectedFiles).forEach((f) => fd.append('files', f));
      fd.append('patientName', meta.patientName || 'Anonymous Patient');
      fd.append('description', meta.description || selectedFiles[0].name);
      fd.append('modality', meta.modality);
      await studyApi.upload(fd);
      qc.invalidateQueries({ queryKey: ['studies'] });
      toast.success(`${selectedFiles.length} file(s) uploaded`);
      setModalOpen(false);
      setSelectedFiles(null);
      setMeta({ patientName: '', description: '', modality: 'CT' });
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const deleteMut = useMutation({
    mutationFn: (id: string) => studyApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['studies'] });
      toast.success('Study deleted');
    },
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-primary-700" />
            Studies
          </h1>
          <p className="text-slate-500 mt-1 text-sm">{data?.total ?? 0} studies archived</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Upload className="w-4 h-4" /> Upload DICOM Study
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search by patient or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-44"
          value={modalityFilter}
          onChange={(e) => setModalityFilter(e.target.value)}
        >
          <option value="">All Modalities</option>
          <option value="CT">CT</option>
          <option value="MRI">MRI</option>
          <option value="XR">X-Ray</option>
          <option value="US">Ultrasound</option>
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
                  {['Description', 'Patient', 'Modality', 'Date', 'Instances', 'Actions'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(!data?.studies || data.studies.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-slate-400">
                      No studies uploaded yet. Click "Upload DICOM Study" to get started.
                    </td>
                  </tr>
                )}
                {data?.studies?.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">
                        {s.description || 'Unnamed Study'}
                      </p>
                      <p className="text-xs text-slate-400 font-mono">
                        {s.studyUid.substring(0, 12)}...
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{s.patientName || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="badge-progress">{s.modality || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {s.studyDate ? format(new Date(s.studyDate), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {s.series?.[0]?.numInstances ?? 0} slices
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          to={`/viewer?studyId=${s.id}`}
                          className="p-1.5 text-slate-500 hover:text-primary-700 hover:bg-primary-50 rounded-md"
                          title="Open in DICOM Viewer"
                        >
                          <Monitor className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => deleteMut.mutate(s.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                          title="Delete Study"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Upload DICOM Study</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="label">Patient Name</label>
                <input
                  className="input"
                  value={meta.patientName}
                  onChange={(e) => setMeta({ ...meta, patientName: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Modality</label>
                  <select
                    className="input"
                    value={meta.modality}
                    onChange={(e) => setMeta({ ...meta, modality: e.target.value })}
                  >
                    <option value="CT">CT</option>
                    <option value="MRI">MRI</option>
                    <option value="XR">X-Ray</option>
                    <option value="US">Ultrasound</option>
                  </select>
                </div>
                <div>
                  <label className="label">Study Description</label>
                  <input
                    className="input"
                    value={meta.description}
                    onChange={(e) => setMeta({ ...meta, description: e.target.value })}
                    placeholder="CT Brain"
                  />
                </div>
              </div>
              <div>
                <label className="label">DICOM Files (.dcm)</label>
                <input
                  type="file"
                  multiple
                  accept=".dcm,application/dicom"
                  onChange={(e) => setSelectedFiles(e.target.files)}
                  className="input"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={uploading} className="btn-primary">
                  {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {uploading ? 'Uploading...' : 'Upload Study'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
