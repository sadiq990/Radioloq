import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { voiceApi, reportApi, templateApi } from '../lib/api';
import toast from 'react-hot-toast';
import {
  Mic,
  Square,
  Pause,
  Play,
  Wand2,
  Save,
  FileText,
  Loader2,
  Radio,
  Sparkles,
} from 'lucide-react';

type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

interface ReportContent {
  title: string;
  clinicalHistory: string;
  technique: string;
  findings: string;
  impression: string;
  recommendation: string;
}

export default function VoiceAIPage() {
  const navigate = useNavigate();
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [liveSpeechActive, setLiveSpeechActive] = useState(false);
  const [rawText, setRawText] = useState('');
  const [report, setReport] = useState<ReportContent>({
    title: 'Voice AI Radiology Report',
    clinicalHistory: '',
    technique: '',
    findings: '',
    impression: '',
    recommendation: '',
  });
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isStructuring, setIsStructuring] = useState(false);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechRef = useRef<any>(null);

  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templateApi.list().then((r) => r.data),
  });

  const { data: voiceStatus } = useQuery({
    queryKey: ['voice-status'],
    queryFn: () => voiceApi.status().then((r) => r.data),
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (speechRef.current) speechRef.current.stop();
    };
  }, []);

  // Browser Web Speech API (Works natively in Chrome/Edge even without OpenAI API Key)
  const toggleLiveSpeech = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error('Browser live speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    if (liveSpeechActive && speechRef.current) {
      speechRef.current.stop();
      setLiveSpeechActive(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalBuffer = rawText ? rawText + ' ' : '';

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalBuffer += transcript + ' ';
        } else {
          interim += transcript;
        }
      }
      setRawText((finalBuffer + interim).trim());
    };

    recognition.onerror = (e: any) => {
      toast.error(`Speech error: ${e.error}`);
      setLiveSpeechActive(false);
    };

    recognition.onend = () => {
      setLiveSpeechActive(false);
    };

    speechRef.current = recognition;
    recognition.start();
    setLiveSpeechActive(true);
    toast.success('Live dictation started — speak now');
  };

  // MediaRecorder Audio Capture -> Whisper API
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      audioChunks.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };
      recorder.start(100);
      setRecordingState('recording');
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      toast.error('Microphone access denied');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingState('paused');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder.current?.state === 'paused') {
      mediaRecorder.current.resume();
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
      setRecordingState('recording');
    }
  };

  const stopRecording = () => {
    return new Promise<Blob>((resolve) => {
      if (!mediaRecorder.current) return;
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
        resolve(blob);
      };
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingState('stopped');
    });
  };

  const handleStopAndTranscribe = async () => {
    setIsTranscribing(true);
    try {
      const blob = await stopRecording();
      const fd = new FormData();
      fd.append('audio', blob, 'recording.webm');
      const { data } = await voiceApi.transcribe(fd);
      setRawText((prev) => (prev ? `${prev}\n${data.text}` : data.text));
      toast.success('Whisper transcription complete!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Transcription failed');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleStructure = async () => {
    if (!rawText.trim()) return toast.error('No text to structure');
    setIsStructuring(true);
    try {
      const { data } = await voiceApi.structure(rawText);
      setReport((r) => ({
        ...r,
        clinicalHistory: data.clinicalHistory || r.clinicalHistory,
        technique: data.technique || r.technique,
        findings: data.findings || r.findings,
        impression: data.impression || r.impression,
        recommendation: data.recommendation || r.recommendation,
      }));
      toast.success(
        data.mode === 'openai-gpt4o'
          ? 'Report structured with GPT-4o!'
          : 'Report structured with local parser!'
      );
    } catch {
      toast.error('Structuring failed');
    } finally {
      setIsStructuring(false);
    }
  };

  const insertSampleDictation = () => {
    setRawText(
      'Clinical history: 45-year-old patient with persistent cough and mild dyspnea. ' +
        'Technique: CT of the chest performed with intravenous contrast. ' +
        'Findings: The lungs are well aerated without focal consolidation, suspicious pulmonary nodules, or pneumothorax. No pleural effusion. The mediastinal and hilar lymph nodes are normal in size. Heart size is within normal limits. ' +
        'Impression: No acute cardiopulmonary abnormality. ' +
        'Recommendation: Clinical correlation recommended; no short-term imaging follow-up required.'
    );
  };

  const applyTemplate = (templateId: string) => {
    const tmpl = templates?.find((t: any) => t.id === templateId);
    if (tmpl?.content) {
      setReport((r) => ({
        ...r,
        title: `${tmpl.name} Report`,
        ...tmpl.content,
      }));
    }
    setSelectedTemplate(templateId);
  };

  const saveReport = useMutation({
    mutationFn: () =>
      reportApi.create({
        ...report,
        templateId: selectedTemplate || undefined,
      }),
    onSuccess: (res) => {
      toast.success('Report saved!');
      navigate(`/reports/${res.data.id}/edit`);
    },
    onError: () => toast.error('Save failed'),
  });

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Mic className="w-6 h-6 text-primary-700" /> Voice AI Reporting
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Dictate via Live Speech or Audio Recorder — AI parses your notes into a structured report
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            voiceStatus?.aiConfigured
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {voiceStatus?.aiConfigured
            ? 'OpenAI Whisper + GPT-4o Connected'
            : 'Local Live Speech + Parser Mode'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Dictation */}
        <div className="space-y-4">
          <div className="card text-center">
            <div
              className={`w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center transition-all ${
                recordingState === 'recording' || liveSpeechActive
                  ? 'bg-red-100 animate-pulse'
                  : 'bg-slate-100'
              }`}
            >
              <Mic
                className={`w-9 h-9 ${
                  recordingState === 'recording' || liveSpeechActive
                    ? 'text-red-500'
                    : 'text-slate-400'
                }`}
              />
            </div>

            {recordingState !== 'idle' && (
              <div className="text-2xl font-mono font-bold text-slate-900 mb-1">
                {formatTime(recordingTime)}
              </div>
            )}
            <p className="text-xs text-slate-500 mb-5">
              {liveSpeechActive
                ? 'Live Speech Recognition listening...'
                : recordingState === 'idle'
                ? 'Choose Live Browser Dictation (no API key needed) or Whisper Audio Recording'
                : `Audio Recorder: ${recordingState}`}
            </p>

            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={toggleLiveSpeech}
                className={
                  liveSpeechActive
                    ? 'btn-danger'
                    : 'btn-primary'
                }
              >
                <Radio className="w-4 h-4" />
                {liveSpeechActive ? 'Stop Live Speech' : 'Live Dictation (Browser)'}
              </button>

              {recordingState === 'idle' && (
                <button onClick={startRecording} className="btn-secondary">
                  <Mic className="w-4 h-4 text-red-600" /> Record Audio (Whisper)
                </button>
              )}
              {recordingState === 'recording' && (
                <>
                  <button onClick={pauseRecording} className="btn-secondary">
                    <Pause className="w-4 h-4" /> Pause
                  </button>
                  <button
                    onClick={handleStopAndTranscribe}
                    disabled={isTranscribing}
                    className="btn-primary bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isTranscribing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    Stop & Transcribe
                  </button>
                </>
              )}
              {recordingState === 'paused' && (
                <>
                  <button onClick={resumeRecording} className="btn-primary">
                    <Play className="w-4 h-4" /> Resume
                  </button>
                  <button
                    onClick={handleStopAndTranscribe}
                    disabled={isTranscribing}
                    className="btn-secondary"
                  >
                    {isTranscribing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    Stop & Transcribe
                  </button>
                </>
              )}
              {recordingState === 'stopped' && (
                <button
                  onClick={() => {
                    setRecordingState('idle');
                    setRecordingTime(0);
                  }}
                  className="btn-secondary"
                >
                  Reset Recorder
                </button>
              )}
            </div>
          </div>

          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="font-semibold text-slate-900">Raw Dictation / Transcript</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={insertSampleDictation}
                  className="btn-secondary text-xs py-1.5 px-2.5"
                >
                  <Sparkles className="w-3 h-3" /> Sample Text
                </button>
                <button
                  onClick={handleStructure}
                  disabled={!rawText.trim() || isStructuring}
                  className="btn-primary text-xs py-1.5 px-3"
                >
                  {isStructuring ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3" />
                  )}
                  Structure Report
                </button>
              </div>
            </div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Dictate or type your clinical notes here (e.g. 'Clinical history: ... Technique: ... Findings: ... Impression: ...')"
              className="input min-h-[210px] resize-y text-sm"
            />
          </div>

          <div className="card">
            <label className="label">Apply Report Template</label>
            <select
              className="input"
              value={selectedTemplate}
              onChange={(e) => applyTemplate(e.target.value)}
            >
              <option value="">Select a template...</option>
              {templates?.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.modality ? `(${t.modality})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Structured Report */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary-700" /> Structured Report
            </h3>
            <button
              onClick={() => saveReport.mutate()}
              disabled={saveReport.isPending}
              className="btn-primary text-xs py-1.5 px-3"
            >
              {saveReport.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Save className="w-3 h-3" />
              )}
              Save & Open Editor
            </button>
          </div>

          <div>
            <label className="label">Report Title</label>
            <input
              className="input font-medium"
              value={report.title}
              onChange={(e) => setReport((r) => ({ ...r, title: e.target.value }))}
            />
          </div>

          {(
            ['clinicalHistory', 'technique', 'findings', 'impression', 'recommendation'] as const
          ).map((field) => (
            <div key={field}>
              <label className="label capitalize">
                {field.replace(/([A-Z])/g, ' $1').trim()}
              </label>
              <textarea
                value={report[field]}
                onChange={(e) => setReport((r) => ({ ...r, [field]: e.target.value }))}
                className="input min-h-[78px] resize-y text-sm"
                placeholder={`Enter ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}...`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
