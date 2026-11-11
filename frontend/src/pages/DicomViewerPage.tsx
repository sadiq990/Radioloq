import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { studyApi } from '../lib/api';
import {
  Monitor,
  Upload,
  ZoomIn,
  Move,
  Contrast,
  Ruler,
  RotateCcw,
  Contrast as InvertIcon,
  Circle,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';

type ActiveTool = 'WindowLevel' | 'Pan' | 'Zoom' | 'Length' | 'Angle' | 'EllipticalROI';

const WL_PRESETS = [
  { label: 'Default', ww: null, wc: null },
  { label: 'Brain (80/40)', ww: 80, wc: 40 },
  { label: 'Lung (1500/-600)', ww: 1500, wc: -600 },
  { label: 'Bone (2000/300)', ww: 2000, wc: 300 },
  { label: 'Abdomen (400/40)', ww: 400, wc: 40 },
];

export default function DicomViewerPage() {
  const [searchParams] = useSearchParams();
  const studyId = searchParams.get('studyId');

  const viewportRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<any>(null);
  const csRef = useRef<any>(null);
  const csToolsRef = useRef<any>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [hasImages, setHasImages] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTool, setActiveTool] = useState<ActiveTool>('WindowLevel');
  const [sliceCount, setSliceCount] = useState(0);
  const [currentSlice, setCurrentSlice] = useState(0);
  const [inverted, setInverted] = useState(false);
  const [studyMeta, setStudyMeta] = useState<{
    patientName?: string;
    modality?: string;
    description?: string;
  } | null>(null);

  const viewportId = 'RADIOLOQ_STACK_VIEWPORT';
  const renderingEngineId = 'radioloq-engine';
  const toolGroupId = 'radioloq-tools';

  useEffect(() => {
    let mounted = true;

    const initViewer = async () => {
      try {
        const cornerstone = await import('@cornerstonejs/core');
        const cornerstoneTools = await import('@cornerstonejs/tools');
        const dicomImageLoader = await import('@cornerstonejs/dicom-image-loader');

        if (!mounted) return;

        await cornerstone.init();
        await cornerstoneTools.init();
        dicomImageLoader.init({ maxWebWorkers: 1 });

        csRef.current = cornerstone;
        csToolsRef.current = cornerstoneTools;

        if (!viewportRef.current) return;

        const engine = new cornerstone.RenderingEngine(renderingEngineId);
        engineRef.current = engine;

        engine.enableElement({
          viewportId,
          type: cornerstone.Enums.ViewportType.STACK,
          element: viewportRef.current,
          defaultOptions: { background: [0, 0, 0] as [number, number, number] },
        });

        const {
          PanTool,
          ZoomTool,
          StackScrollTool,
          WindowLevelTool,
          LengthTool,
          AngleTool,
          EllipticalROITool,
          ToolGroupManager,
          Enums: ToolEnums,
        } = cornerstoneTools;

        const toolsToAdd = [
          PanTool,
          ZoomTool,
          StackScrollTool,
          WindowLevelTool,
          LengthTool,
          AngleTool,
          EllipticalROITool,
        ];
        toolsToAdd.forEach((Tool) => {
          try {
            cornerstoneTools.addTool(Tool);
          } catch {
            // tool already registered
          }
        });

        ToolGroupManager.destroyToolGroup(toolGroupId);
        const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
        if (toolGroup) {
          toolGroup.addViewport(viewportId, renderingEngineId);
          toolsToAdd.forEach((T) => toolGroup.addTool(T.toolName));

          toolGroup.setToolActive(WindowLevelTool.toolName, {
            bindings: [{ mouseButton: ToolEnums.MouseBindings.Primary }],
          });
          toolGroup.setToolActive(PanTool.toolName, {
            bindings: [{ mouseButton: ToolEnums.MouseBindings.Auxiliary }],
          });
          toolGroup.setToolActive(ZoomTool.toolName, {
            bindings: [{ mouseButton: ToolEnums.MouseBindings.Secondary }],
          });
          toolGroup.setToolActive(StackScrollTool.toolName, {
            bindings: [{ mouseButton: ToolEnums.MouseBindings.Wheel }],
          });
        }

        setIsLoaded(true);

        // If opened from Studies or Consultation with ?studyId=..., load its files
        if (studyId) {
          const { data: study } = await studyApi.get(studyId);
          setStudyMeta({
            patientName: study.patientName,
            modality: study.modality,
            description: study.description,
          });
          if (study.files && study.files.length > 0) {
            const imageIds = study.files.map(
              (f: string) => `wadouri:${studyApi.getFileUrl(studyId, f)}`
            );
            const vp = engine.getViewport(viewportId) as any;
            await vp.setStack(imageIds, 0);
            vp.render();
            setSliceCount(imageIds.length);
            setCurrentSlice(0);
            setHasImages(true);
            toast.success(`Loaded ${imageIds.length} slice(s) from study`);
          }
        }
      } catch (err) {
        console.error('Viewer init error:', err);
        toast.error('DICOM Viewer initialization error');
      }
    };

    initViewer();

    return () => {
      mounted = false;
      try {
        csToolsRef.current?.ToolGroupManager?.destroyToolGroup(toolGroupId);
        engineRef.current?.destroy();
      } catch {
        // ignore cleanup error
      }
    };
  }, [studyId]);

  const switchPrimaryTool = (tool: ActiveTool) => {
    const tools = csToolsRef.current;
    if (!tools) return;
    const toolGroup = tools.ToolGroupManager.getToolGroup(toolGroupId);
    if (!toolGroup) return;

    const map: Record<ActiveTool, string> = {
      WindowLevel: tools.WindowLevelTool.toolName,
      Pan: tools.PanTool.toolName,
      Zoom: tools.ZoomTool.toolName,
      Length: tools.LengthTool.toolName,
      Angle: tools.AngleTool.toolName,
      EllipticalROI: tools.EllipticalROITool.toolName,
    };

    // Set previous primary tools passive
    Object.values(map).forEach((name) => {
      try {
        toolGroup.setToolPassive(name);
      } catch {
        // ignore
      }
    });

    toolGroup.setToolActive(map[tool], {
      bindings: [{ mouseButton: tools.Enums.MouseBindings.Primary }],
    });
    setActiveTool(tool);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const engine = engineRef.current;
      const viewport = engine?.getViewport(viewportId);
      if (!viewport) return;

      const dicomImageLoader = await import('@cornerstonejs/dicom-image-loader');
      const sortedFiles = Array.from(files).sort((a, b) => a.name.localeCompare(b.name));
      const imageIds = sortedFiles.map((file) => dicomImageLoader.wadouri.fileManager.add(file));

      await viewport.setStack(imageIds, 0);
      viewport.render();
      setSliceCount(imageIds.length);
      setCurrentSlice(0);
      setHasImages(true);
      setStudyMeta({
        patientName: 'Local File Study',
        modality: 'DICOM',
        description: sortedFiles[0].name,
      });
      toast.success(`Loaded ${imageIds.length} DICOM file(s)`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to parse DICOM file(s). Ensure valid .dcm format.');
    }
  };

  const applyPreset = (ww: number | null, wc: number | null) => {
    const vp = engineRef.current?.getViewport(viewportId);
    const cs = csRef.current;
    if (!vp || !cs) return;
    if (ww === null || wc === null) {
      vp.resetProperties();
    } else {
      const voiRange = cs.utilities.windowLevel.toLowHighRange(ww, wc);
      vp.setProperties({ voiRange });
    }
    vp.render();
  };

  const toggleInvert = () => {
    const vp = engineRef.current?.getViewport(viewportId);
    if (!vp) return;
    const next = !inverted;
    vp.setProperties({ invert: next });
    vp.render();
    setInverted(next);
  };

  const resetViewport = () => {
    const vp = engineRef.current?.getViewport(viewportId);
    if (!vp) return;
    vp.resetProperties();
    vp.resetCamera();
    vp.render();
    setInverted(false);
  };

  const handleSliceChange = async (idx: number) => {
    const vp = engineRef.current?.getViewport(viewportId);
    if (!vp || !hasImages) return;
    await vp.setImageIdIndex(idx);
    setCurrentSlice(idx);
  };

  const toolButtons: { id: ActiveTool; label: string; icon: any }[] = [
    { id: 'WindowLevel', label: 'W/L', icon: Contrast },
    { id: 'Pan', label: 'Pan', icon: Move },
    { id: 'Zoom', label: 'Zoom', icon: ZoomIn },
    { id: 'Length', label: 'Length', icon: Ruler },
    { id: 'Angle', label: 'Angle', icon: SlidersHorizontal },
    { id: 'EllipticalROI', label: 'ROI', icon: Circle },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2 mr-3">
          <Monitor className="w-4 h-4 text-primary-400" />
          <span className="font-semibold text-sm">DICOM Viewer</span>
        </div>

        <label className="bg-primary-700 hover:bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer inline-flex items-center gap-1.5">
          <Upload className="w-3.5 h-3.5" /> Open .dcm Files
          <input
            type="file"
            multiple
            accept=".dcm,application/dicom"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
        </label>

        <div className="h-5 w-px bg-slate-700 mx-1" />

        {toolButtons.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => switchPrimaryTool(id)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
              activeTool === id
                ? 'bg-primary-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}

        <div className="h-5 w-px bg-slate-700 mx-1" />

        <select
          className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
          onChange={(e) => {
            const p = WL_PRESETS[Number(e.target.value)];
            if (p) applyPreset(p.ww, p.wc);
          }}
        >
          {WL_PRESETS.map((p, idx) => (
            <option key={p.label} value={idx}>
              Preset: {p.label}
            </option>
          ))}
        </select>

        <button
          onClick={toggleInvert}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 ${
            inverted ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <InvertIcon className="w-3.5 h-3.5" /> Invert
        </button>

        <button
          onClick={resetViewport}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 inline-flex items-center gap-1"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      {/* Viewport */}
      <div
        className="flex-1 relative overflow-hidden"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFileUpload(e.dataTransfer.files);
        }}
      >
        {!isLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-400 mb-3" />
            <p className="text-sm text-slate-400">Initializing Cornerstone3D engine...</p>
          </div>
        )}

        {isLoaded && (!hasImages || isDragging) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 pointer-events-none z-10 bg-slate-950/75">
            <Upload className="w-12 h-12 mb-3 text-primary-400 opacity-70" />
            <p className="text-lg font-medium text-slate-200">Drop DICOM (.dcm) files here</p>
            <p className="text-sm text-slate-400 mt-1">
              Supports single images or multi-slice CT/MRI series
            </p>
          </div>
        )}

        {/* Overlay Info */}
        {hasImages && studyMeta && (
          <div className="absolute top-3 left-4 z-10 pointer-events-none text-xs text-primary-300 font-mono space-y-0.5 bg-black/40 px-2.5 py-1.5 rounded">
            <div>{studyMeta.patientName}</div>
            <div>
              {studyMeta.modality} · {studyMeta.description}
            </div>
            {sliceCount > 0 && (
              <div>
                Slice {currentSlice + 1} / {sliceCount}
              </div>
            )}
          </div>
        )}

        <div
          ref={viewportRef}
          className="w-full h-full"
          style={{ background: '#000' }}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      {/* Slice Scrubber */}
      {sliceCount > 1 && (
        <div className="bg-slate-900 border-t border-slate-800 px-6 py-2.5 flex items-center gap-4">
          <span className="text-xs text-slate-400 font-mono">
            Slice {currentSlice + 1}/{sliceCount}
          </span>
          <input
            type="range"
            min={0}
            max={sliceCount - 1}
            value={currentSlice}
            onChange={(e) => handleSliceChange(Number(e.target.value))}
            className="flex-1 accent-primary-500"
          />
        </div>
      )}
    </div>
  );
}
