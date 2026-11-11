import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bridgeApi } from '../lib/api';
import toast from 'react-hot-toast';
import {
  Wifi,
  WifiOff,
  AlertCircle,
  RefreshCw,
  Settings,
  Download,
  Loader2,
  Activity,
} from 'lucide-react';

export default function BridgePage() {
  const qc = useQueryClient();
  const { data: bridge, isLoading } = useQuery({
    queryKey: ['bridge'],
    queryFn: () => bridgeApi.status().then((r) => r.data),
  });
  const [config, setConfig] = useState({
    aeTitleLocal: 'RADIOLOQ',
    pacsHost: 'localhost',
    pacsPort: '4242',
  });

  useEffect(() => {
    if (bridge && bridge.aeTitleLocal) {
      setConfig({
        aeTitleLocal: bridge.aeTitleLocal || 'RADIOLOQ',
        pacsHost: bridge.pacsHost || 'localhost',
        pacsPort: String(bridge.pacsPort || 4242),
      });
    }
  }, [bridge]);

  const configMut = useMutation({
    mutationFn: () => bridgeApi.config(config),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bridge'] });
      toast.success('Bridge configuration saved');
    },
    onError: () => toast.error('Failed to save configuration'),
  });

  const testMut = useMutation({
    mutationFn: () => bridgeApi.test().then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['bridge'] });
      if (res.connected) {
        toast.success(res.detail || 'DICOM Server Connected!');
      } else {
        toast.error(res.detail || 'Could not connect to DICOM server');
      }
    },
    onError: () => toast.error('Connection test failed'),
  });

  const statusColor: Record<string, string> = {
    CONNECTED: 'text-emerald-600 bg-emerald-50',
    DISCONNECTED: 'text-slate-500 bg-slate-100',
    SYNCING: 'text-blue-600 bg-blue-50',
    ERROR: 'text-red-600 bg-red-50',
    NOT_CONFIGURED: 'text-slate-400 bg-slate-100',
  };
  const StatusIcon =
    bridge?.status === 'CONNECTED'
      ? Wifi
      : bridge?.status === 'ERROR'
      ? AlertCircle
      : WifiOff;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Wifi className="w-6 h-6 text-primary-700" /> Clinic PACS Bridge
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Connect your clinic's local PACS / Orthanc DICOM server to the Radioloq cloud
        </p>
      </div>

      {/* Status Card */}
      <div className="card mb-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  statusColor[bridge?.status || 'NOT_CONFIGURED'] || 'bg-slate-100'
                }`}
              >
                <StatusIcon className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {bridge?.status?.replace('_', ' ') || 'Not Configured'}
                </h2>
                <p className="text-slate-500 text-sm">
                  {bridge?.lastSync
                    ? `Last sync: ${new Date(bridge.lastSync).toLocaleString()}`
                    : 'Never synced'}
                </p>
                {bridge?.studiesSynced > 0 && (
                  <p className="text-sm text-emerald-600">
                    {bridge.studiesSynced} studies synced
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => testMut.mutate()}
                disabled={testMut.isPending}
                className="btn-primary"
              >
                {testMut.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Activity className="w-4 h-4" />
                )}
                Test Orthanc Connection
              </button>
              <button
                onClick={() => qc.invalidateQueries({ queryKey: ['bridge'] })}
                className="btn-secondary"
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'AE Title', value: bridge?.aeTitleLocal || 'RADIOLOQ' },
          { label: 'PACS Host', value: bridge?.pacsHost || '—' },
          { label: 'PACS Port', value: bridge?.pacsPort || '4242' },
        ].map((s) => (
          <div key={s.label} className="card text-center">
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="text-lg font-bold text-slate-900 mt-1 font-mono">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Config Form */}
      <div className="card mb-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary-700" /> DICOM / PACS Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="label">Local AE Title</label>
            <input
              className="input font-mono"
              value={config.aeTitleLocal}
              onChange={(e) => setConfig((c) => ({ ...c, aeTitleLocal: e.target.value }))}
              placeholder="RADIOLOQ"
            />
          </div>
          <div>
            <label className="label">PACS Host</label>
            <input
              className="input"
              value={config.pacsHost}
              onChange={(e) => setConfig((c) => ({ ...c, pacsHost: e.target.value }))}
              placeholder="192.168.1.100"
            />
          </div>
          <div>
            <label className="label">PACS Port</label>
            <input
              className="input"
              type="number"
              value={config.pacsPort}
              onChange={(e) => setConfig((c) => ({ ...c, pacsPort: e.target.value }))}
              placeholder="4242"
            />
          </div>
        </div>
        <button
          onClick={() => configMut.mutate()}
          disabled={configMut.isPending}
          className="btn-primary"
        >
          {configMut.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Settings className="w-4 h-4" />
          )}{' '}
          Save Configuration
        </button>
      </div>

      {/* Error Log */}
      {bridge?.errorLog && (
        <div className="card mb-6 bg-slate-900 text-slate-200 border-slate-800">
          <h3 className="text-sm font-semibold mb-2 text-red-400">Recent Sync Log</h3>
          <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto">
            {bridge.errorLog}
          </pre>
        </div>
      )}

      {/* Orthanc Info */}
      <div className="card bg-primary-50 border-primary-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-primary-900">
              Orthanc Local DICOM Bridge
            </h3>
            <p className="text-sm text-primary-700 mt-1">
              Point your clinic modality or PACS to AE Title <code className="font-mono font-bold">RADIOLOQ</code> on port <code className="font-mono font-bold">4242</code>, or run <code className="font-mono">docker-compose up -d</code> locally.
            </p>
          </div>
          <a
            href="https://www.orthanc-server.com/download.php"
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
          >
            <Download className="w-4 h-4" /> Orthanc Server
          </a>
        </div>
      </div>
    </div>
  );
}
