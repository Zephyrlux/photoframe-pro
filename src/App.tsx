import {
  Check,
  ChevronRight,
  Download,
  FolderOpen,
  Grid2X2,
  ImagePlus,
  Import,
  Maximize2,
  Minus,
  Plus,
  Save,
  Settings,
  Trash2,
  Upload,
  ZoomIn
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import logoMark from "../photoframe_pro_design_pack/assets/logo_mark.svg";
import { ratios } from "./config";
import { allTemplates, useAppStore } from "./store";
import type { DeepPartial, FrameSettings, FrameTemplate, LogoPosition, PhotoItem } from "./types";
import type { NativeImagePayload } from "./vite-env";
import {
  createDemoPhotos,
  createPhotoFromFile,
  createPhotoFromNative,
  readFileAsDataUrl
} from "./lib/image";
import { getMimeType, getOutputSize, makeExportName, renderPhotoToCanvas } from "./lib/renderer";

const logoPositions: Array<{ id: LogoPosition; label: string }> = [
  { id: "top-left", label: "左上" },
  { id: "top-right", label: "右上" },
  { id: "bottom-left", label: "左下" },
  { id: "bottom-right", label: "右下" },
  { id: "center", label: "居中" },
  { id: "custom", label: "自定" }
];

const formatNumber = (value: number) => value.toLocaleString("en-US");

function Slider({
  label,
  value,
  min,
  max,
  suffix,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="slider-row">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <strong>
        {value}
        {suffix}
      </strong>
    </label>
  );
}

function Section({
  title,
  children,
  actions
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="setting-section">
      <header>
        <h3>{title}</h3>
        {actions}
      </header>
      {children}
    </section>
  );
}

function Toggle({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function AppHeader() {
  return (
    <header className="app-header">
      <div className="traffic-lights" aria-hidden="true">
        <span className="red" />
        <span className="yellow" />
        <span className="green" />
      </div>
      <div className="brand">
        <img src={logoMark} alt="" />
        <strong>PhotoFrame Pro</strong>
      </div>
      <nav className="toolbar" aria-label="应用工具栏">
        <button type="button">
          <Grid2X2 size={16} />
          模板库
        </button>
        <button type="button">
          <Save size={16} />
          保存模板
        </button>
        <button type="button">
          <Import size={16} />
          导入模板
        </button>
        <button type="button" aria-label="设置">
          <Settings size={17} />
        </button>
      </nav>
    </header>
  );
}

function PhotoCard({ photo, selected, onClick }: { photo: PhotoItem; selected: boolean; onClick: () => void }) {
  return (
    <button className={`photo-card ${selected ? "selected" : ""}`} type="button" onClick={onClick}>
      <img src={photo.dataUrl} alt={photo.name} />
      <span className="photo-meta">
        <strong>{photo.name}</strong>
        <small>
          {formatNumber(photo.width)} × {formatNumber(photo.height)}
        </small>
      </span>
      <span className={`status-dot ${photo.status}`} aria-label={photo.status}>
        {photo.status === "processing" ? "…" : photo.status === "error" ? "!" : <Check size={12} />}
      </span>
    </button>
  );
}

function LeftPanel({
  photos,
  selectedId,
  onImportImages,
  onImportFolder
}: {
  photos: PhotoItem[];
  selectedId?: string;
  onImportImages: () => void;
  onImportFolder: () => void;
}) {
  const { clearPhotos, selectPhoto } = useAppStore();

  return (
    <aside className="left-panel panel">
      <div className="import-actions">
        <button className="primary" type="button" onClick={onImportImages}>
          <ImagePlus size={17} />
          导入图片
        </button>
        <button type="button" onClick={onImportFolder}>
          <FolderOpen size={17} />
          导入文件夹
        </button>
      </div>

      <div className="list-head">
        <span>共 {photos.length} 张图片</span>
        <button type="button" onClick={clearPhotos}>
          <Trash2 size={14} />
          清空
        </button>
      </div>

      <div className="photo-list">
        {photos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            selected={photo.id === selectedId}
            onClick={() => selectPhoto(photo.id)}
          />
        ))}
      </div>

      <div className="list-footer">
        <button type="button" aria-label="列表视图">
          <Grid2X2 size={15} />
        </button>
        <button type="button" aria-label="紧凑视图">
          <Grid2X2 size={15} />
        </button>
        <button type="button" aria-label="缩略图比例">
          <Maximize2 size={15} />
        </button>
        <input aria-label="缩略图大小" type="range" min="48" max="120" defaultValue="78" />
      </div>
    </aside>
  );
}

function PreviewPanel({ selectedPhoto }: { selectedPhoto?: PhotoItem }) {
  const settings = useAppStore((state) => state.settings);
  const photos = useAppStore((state) => state.photos);
  const selectPhoto = useAppStore((state) => state.selectPhoto);
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const output = getOutputSize(settings);

  useEffect(() => {
    let alive = true;
    if (!selectedPhoto) {
      setPreviewUrl("");
      return undefined;
    }

    setBusy(true);
    renderPhotoToCanvas(selectedPhoto, settings)
      .then((canvas) => {
        if (!alive) return;
        setPreviewUrl(canvas.toDataURL("image/jpeg", 0.9));
      })
      .catch(() => {
        if (alive) setPreviewUrl("");
      })
      .finally(() => {
        if (alive) setBusy(false);
      });

    return () => {
      alive = false;
    };
  }, [selectedPhoto, settings]);

  return (
    <main className="preview-panel">
      <div className="preview-toolbar">
        <h2>预览</h2>
        <div className="zoom-control">
          <button type="button" aria-label="缩小">
            <Minus size={14} />
          </button>
          <span>100%</span>
          <button type="button" aria-label="放大">
            <Plus size={14} />
          </button>
          <button type="button" aria-label="全屏">
            <Maximize2 size={15} />
          </button>
        </div>
        <div className="output-size">
          输出尺寸： {output.width} × {output.height} ({settings.ratioId})
          <button type="button">修改尺寸</button>
        </div>
      </div>

      <div className="canvas-shell">
        {previewUrl ? (
          <img className={busy ? "preview-image refreshing" : "preview-image"} src={previewUrl} alt="当前输出预览" />
        ) : (
          <div className="empty-preview">拖入图片后生成预览</div>
        )}
      </div>

      <div className="thumb-strip">
        <strong>全部预览 ({photos.length})</strong>
        <div className="thumbs">
          {photos.map((photo) => (
            <button
              key={photo.id}
              className={photo.id === selectedPhoto?.id ? "thumb selected" : "thumb"}
              type="button"
              onClick={() => selectPhoto(photo.id)}
            >
              <img src={photo.dataUrl} alt={photo.name} />
            </button>
          ))}
          <button className="thumb-next" type="button" aria-label="更多预览">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </main>
  );
}

function RatioPicker({ settings, updateSettings }: { settings: FrameSettings; updateSettings: (patch: DeepPartial<FrameSettings>) => void }) {
  return (
    <Section title="比例">
      <div className="ratio-grid">
        {ratios.map((ratio) => (
          <button
            key={ratio.id}
            className={settings.ratioId === ratio.id ? "selected" : ""}
            type="button"
            onClick={() => updateSettings({ ratioId: ratio.id })}
          >
            <strong>{ratio.label}</strong>
            <small>
              {ratio.id === "custom" ? "尺寸" : `${ratio.width}×${ratio.height}`}
            </small>
          </button>
        ))}
      </div>
      {settings.ratioId === "custom" && (
        <div className="two-inputs">
          <label>
            宽度
            <input
              type="number"
              min="320"
              value={settings.customWidth}
              onChange={(event) => updateSettings({ customWidth: Number(event.target.value) })}
            />
          </label>
          <label>
            高度
            <input
              type="number"
              min="320"
              value={settings.customHeight}
              onChange={(event) => updateSettings({ customHeight: Number(event.target.value) })}
            />
          </label>
        </div>
      )}
    </Section>
  );
}

function BackgroundControls({
  settings,
  updateSettings
}: {
  settings: FrameSettings;
  updateSettings: (patch: DeepPartial<FrameSettings>) => void;
}) {
  return (
    <Section title="背景设置">
      <div className="segmented">
        <button
          className={settings.background.mode === "blur" ? "active" : ""}
          type="button"
          onClick={() => updateSettings({ background: { mode: "blur" } })}
        >
          模糊背景
        </button>
        <button
          className={settings.background.mode === "solid" ? "active" : ""}
          type="button"
          onClick={() => updateSettings({ background: { mode: "solid" } })}
        >
          纯色背景
        </button>
        <button
          className={settings.background.mode === "gradient" ? "active" : ""}
          type="button"
          onClick={() => updateSettings({ background: { mode: "gradient" } })}
        >
          渐变背景
        </button>
      </div>

      {settings.background.mode === "blur" && (
        <>
          <Slider
            label="模糊强度"
            min={0}
            max={100}
            value={settings.background.blur}
            onChange={(value) => updateSettings({ background: { blur: value } })}
          />
          <Slider
            label="亮度"
            min={-100}
            max={100}
            value={settings.background.brightness}
            onChange={(value) => updateSettings({ background: { brightness: value } })}
          />
          <Slider
            label="透明度"
            min={0}
            max={100}
            value={settings.background.opacity}
            onChange={(value) => updateSettings({ background: { opacity: value } })}
          />
        </>
      )}

      {settings.background.mode === "solid" && (
        <label className="color-row">
          背景颜色
          <input
            type="color"
            value={settings.background.solidColor}
            onChange={(event) => updateSettings({ background: { solidColor: event.target.value } })}
          />
        </label>
      )}

      {settings.background.mode === "gradient" && (
        <div className="two-inputs color-inputs">
          <label>
            起始色
            <input
              type="color"
              value={settings.background.gradientFrom}
              onChange={(event) => updateSettings({ background: { gradientFrom: event.target.value } })}
            />
          </label>
          <label>
            结束色
            <input
              type="color"
              value={settings.background.gradientTo}
              onChange={(event) => updateSettings({ background: { gradientTo: event.target.value } })}
            />
          </label>
        </div>
      )}
    </Section>
  );
}

function SubjectControls({
  settings,
  updateSettings
}: {
  settings: FrameSettings;
  updateSettings: (patch: DeepPartial<FrameSettings>) => void;
}) {
  return (
    <Section title="主体设置">
      <Slider
        label="圆角"
        min={0}
        max={80}
        value={settings.subject.radius}
        onChange={(value) => updateSettings({ subject: { radius: value } })}
      />
      <div className="check-grid">
        <Toggle
          checked={settings.subject.borderEnabled}
          label="边框"
          onChange={(checked) => updateSettings({ subject: { borderEnabled: checked } })}
        />
        <input
          aria-label="边框颜色"
          type="color"
          value={settings.subject.borderColor}
          onChange={(event) => updateSettings({ subject: { borderColor: event.target.value } })}
        />
        <Slider
          label="宽度"
          min={0}
          max={100}
          value={settings.subject.borderWidth}
          onChange={(value) => updateSettings({ subject: { borderWidth: value } })}
        />
      </div>
      <div className="check-grid">
        <Toggle
          checked={settings.subject.shadowEnabled}
          label="阴影"
          onChange={(checked) => updateSettings({ subject: { shadowEnabled: checked } })}
        />
        <Slider
          label="强度"
          min={0}
          max={100}
          value={settings.subject.shadowStrength}
          onChange={(value) => updateSettings({ subject: { shadowStrength: value } })}
        />
        <Slider
          label="模糊"
          min={0}
          max={100}
          value={settings.subject.shadowBlur}
          onChange={(value) => updateSettings({ subject: { shadowBlur: value } })}
        />
      </div>
    </Section>
  );
}

function LogoControls({
  settings,
  updateSettings,
  onSelectLogo
}: {
  settings: FrameSettings;
  updateSettings: (patch: DeepPartial<FrameSettings>) => void;
  onSelectLogo: () => void;
}) {
  return (
    <Section title="水印 / Logo">
      <Toggle
        checked={settings.logo.enabled}
        label="启用 Logo"
        onChange={(checked) => updateSettings({ logo: { enabled: checked } })}
      />
      <div className="logo-picker">
        <button type="button" onClick={onSelectLogo}>
          <Upload size={16} />
          {settings.logo.name ? settings.logo.name : "更换 Logo"}
        </button>
      </div>
      <Slider
        label="大小"
        min={40}
        max={220}
        value={settings.logo.size}
        onChange={(value) => updateSettings({ logo: { size: value } })}
      />
      <Slider
        label="不透明度"
        min={0}
        max={100}
        value={settings.logo.opacity}
        onChange={(value) => updateSettings({ logo: { opacity: value } })}
      />
      <div className="position-grid">
        {logoPositions.map((position) => (
          <button
            key={position.id}
            className={settings.logo.position === position.id ? "selected" : ""}
            type="button"
            onClick={() => updateSettings({ logo: { position: position.id } })}
          >
            {position.label}
          </button>
        ))}
      </div>
      {settings.logo.position === "custom" && (
        <>
          <Slider
            label="X"
            min={0}
            max={100}
            suffix="%"
            value={settings.logo.customX}
            onChange={(value) => updateSettings({ logo: { customX: value } })}
          />
          <Slider
            label="Y"
            min={0}
            max={100}
            suffix="%"
            value={settings.logo.customY}
            onChange={(value) => updateSettings({ logo: { customY: value } })}
          />
        </>
      )}
    </Section>
  );
}

function ExifControls({
  settings,
  selectedPhoto,
  updateSettings
}: {
  settings: FrameSettings;
  selectedPhoto?: PhotoItem;
  updateSettings: (patch: DeepPartial<FrameSettings>) => void;
}) {
  return (
    <Section
      title="EXIF 信息"
      actions={
        <Toggle
          checked={settings.exif.enabled}
          label="显示"
          onChange={(checked) => updateSettings({ exif: { enabled: checked } })}
        />
      }
    >
      <div className="exif-fields">
        <label>
          相机
          <input
            value={settings.exif.cameraOverride}
            placeholder={selectedPhoto?.exif.camera}
            onChange={(event) => updateSettings({ exif: { cameraOverride: event.target.value } })}
          />
        </label>
        <label>
          镜头
          <input
            value={settings.exif.lensOverride}
            placeholder={selectedPhoto?.exif.lens}
            onChange={(event) => updateSettings({ exif: { lensOverride: event.target.value } })}
          />
        </label>
        <label>
          参数
          <input
            value={settings.exif.exposureOverride}
            placeholder={selectedPhoto?.exif.exposure}
            onChange={(event) => updateSettings({ exif: { exposureOverride: event.target.value } })}
          />
        </label>
        <label>
          时间
          <input
            value={settings.exif.dateOverride}
            placeholder={selectedPhoto?.exif.date}
            onChange={(event) => updateSettings({ exif: { dateOverride: event.target.value } })}
          />
        </label>
      </div>
    </Section>
  );
}

function TemplateControls({
  templates,
  onExportTemplates,
  onImportTemplates
}: {
  templates: FrameTemplate[];
  onExportTemplates: () => void;
  onImportTemplates: () => void;
}) {
  const { applyTemplate, deleteTemplate, saveCurrentTemplate } = useAppStore();
  const [name, setName] = useState("");

  return (
    <Section title="模板设置">
      <div className="template-save">
        <input value={name} placeholder="模板名称" onChange={(event) => setName(event.target.value)} />
        <button
          type="button"
          onClick={() => {
            saveCurrentTemplate(name);
            setName("");
          }}
        >
          保存
        </button>
      </div>
      <div className="template-actions">
        <button type="button" onClick={onImportTemplates}>
          <Import size={15} />
          导入模板
        </button>
        <button type="button" onClick={onExportTemplates}>
          <Download size={15} />
          导出模板
        </button>
      </div>
      <div className="template-list">
        {templates.map((template) => (
          <article key={template.id} className="template-item">
            <button type="button" onClick={() => applyTemplate(template)}>
              <strong>{template.name}</strong>
              <small>{template.description}</small>
            </button>
            {!template.builtIn && (
              <button className="icon-danger" type="button" onClick={() => deleteTemplate(template.id)} aria-label="删除模板">
                <Trash2 size={14} />
              </button>
            )}
          </article>
        ))}
      </div>
    </Section>
  );
}

function SettingsPanel({
  selectedPhoto,
  onSelectLogo,
  onImportTemplates,
  onExportTemplates
}: {
  selectedPhoto?: PhotoItem;
  onSelectLogo: () => void;
  onImportTemplates: () => void;
  onExportTemplates: () => void;
}) {
  const settings = useAppStore((state) => state.settings);
  const savedTemplates = useAppStore((state) => state.savedTemplates);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const templates = useMemo(() => allTemplates(savedTemplates), [savedTemplates]);

  return (
    <aside className="right-panel panel">
      <RatioPicker settings={settings} updateSettings={updateSettings} />
      <BackgroundControls settings={settings} updateSettings={updateSettings} />
      <SubjectControls settings={settings} updateSettings={updateSettings} />
      <LogoControls settings={settings} updateSettings={updateSettings} onSelectLogo={onSelectLogo} />
      <ExifControls settings={settings} selectedPhoto={selectedPhoto} updateSettings={updateSettings} />
      <TemplateControls
        templates={templates}
        onImportTemplates={onImportTemplates}
        onExportTemplates={onExportTemplates}
      />
    </aside>
  );
}

function ExportBar({ onExport }: { onExport: () => void }) {
  const settings = useAppStore((state) => state.settings);
  const photos = useAppStore((state) => state.photos);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const progress = useAppStore((state) => state.exportProgress);

  const chooseDirectory = async () => {
    const directory = await window.photoFrameAPI?.chooseOutputDirectory();
    if (directory) updateSettings({ export: { outputDirectory: directory } });
  };

  return (
    <footer className="export-bar">
      <strong>导出设置</strong>
      <label>
        格式：
        <select
          value={settings.export.format}
          onChange={(event) => updateSettings({ export: { format: event.target.value as FrameSettings["export"]["format"] } })}
        >
          <option value="jpg">JPG</option>
          <option value="png">PNG</option>
          <option value="webp">WEBP</option>
        </select>
      </label>
      <label className="quality">
        质量：
        <input
          type="range"
          min="40"
          max="100"
          value={settings.export.quality}
          onChange={(event) => updateSettings({ export: { quality: Number(event.target.value) } })}
        />
        <span>{settings.export.quality}%</span>
      </label>
      <label className="output-dir">
        输出目录：
        <input readOnly value={settings.export.outputDirectory || "浏览器模式将直接下载"} />
        <button type="button" onClick={chooseDirectory}>
          更改
        </button>
      </label>
      <label>
        文件命名：
        <select
          value={settings.export.naming}
          onChange={(event) => updateSettings({ export: { naming: event.target.value as FrameSettings["export"]["naming"] } })}
        >
          <option value="original-frame">原文件名 + _frame</option>
          <option value="original-ratio">原文件名 + 比例</option>
          <option value="sequence">photoframe_序号</option>
        </select>
      </label>
      <small>示例：{photos[0] ? makeExportName(photos[0], settings, 0) : "DSC_0001_frame.jpg"}</small>
      <button className="export-button" type="button" disabled={progress.active || photos.length === 0} onClick={onExport}>
        <Download size={18} />
        {progress.active ? `${progress.done}/${progress.total}` : "开始批量导出"}
      </button>
      <button className="folder-button" type="button" onClick={() => progress.lastSaved && window.photoFrameAPI?.showInFolder(progress.lastSaved)}>
        <FolderOpen size={20} />
      </button>
    </footer>
  );
}

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const seededRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  const photos = useAppStore((state) => state.photos);
  const selectedId = useAppStore((state) => state.selectedId);
  const selectedPhoto = photos.find((photo) => photo.id === selectedId) ?? photos[0];
  const settings = useAppStore((state) => state.settings);
  const addPhotos = useAppStore((state) => state.addPhotos);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const importTemplates = useAppStore((state) => state.importTemplates);
  const setExportProgress = useAppStore((state) => state.setExportProgress);
  const setPhotoStatus = useAppStore((state) => state.setPhotoStatus);
  const setAllPhotoStatus = useAppStore((state) => state.setAllPhotoStatus);

  useEffect(() => {
    if (!seededRef.current && photos.length === 0) {
      seededRef.current = true;
      addPhotos(createDemoPhotos());
    }
  }, [addPhotos, photos.length]);

  const importFiles = async (files: File[]) => {
    const accepted = files.filter((file) => file.type.startsWith("image/") || /\.(jpe?g|png|webp|tiff?)$/i.test(file.name));
    if (accepted.length === 0) return;
    const imported = await Promise.all(accepted.map(createPhotoFromFile));
    addPhotos(imported);
  };

  const importNativePayloads = async (payloads: NativeImagePayload[]) => {
    if (!payloads || payloads.length === 0) return;
    const imported = await Promise.all(payloads.map(createPhotoFromNative));
    addPhotos(imported);
  };

  const handleImportImages = async () => {
    if (window.photoFrameAPI) {
      await importNativePayloads(await window.photoFrameAPI.selectImages());
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleImportFolder = async () => {
    if (window.photoFrameAPI) {
      await importNativePayloads(await window.photoFrameAPI.selectImageFolder());
    } else {
      folderInputRef.current?.setAttribute("webkitdirectory", "");
      folderInputRef.current?.click();
    }
  };

  const handleLogo = async () => {
    if (window.photoFrameAPI) {
      const logo = await window.photoFrameAPI.selectLogo();
      if (logo) updateSettings({ logo: { dataUrl: logo.dataUrl, name: logo.name, enabled: true } });
    } else {
      logoInputRef.current?.click();
    }
  };

  const handleExportTemplates = () => {
    const saved = useAppStore.getState().savedTemplates;
    const data = new Blob([JSON.stringify(saved, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = "photoframe-pro-templates.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportTemplatesFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const parsed = JSON.parse(await file.text()) as FrameTemplate[];
    importTemplates(Array.isArray(parsed) ? parsed : []);
  };

  const downloadInBrowser = (name: string, dataUrl: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = name;
    link.click();
  };

  const handleExport = async () => {
    if (photos.length === 0) return;
    setAllPhotoStatus("ready");
    setExportProgress({ active: true, done: 0, total: photos.length, message: "正在渲染导出图片" });

    try {
      let outputDirectory = settings.export.outputDirectory;
      if (window.photoFrameAPI && !outputDirectory) {
        outputDirectory = (await window.photoFrameAPI.chooseOutputDirectory()) ?? "";
        if (outputDirectory) updateSettings({ export: { outputDirectory } });
      }

      const files: Array<{ name: string; dataUrl: string }> = [];
      for (let index = 0; index < photos.length; index += 1) {
        const photo = photos[index];
        setPhotoStatus(photo.id, "processing");
        const canvas = await renderPhotoToCanvas(photo, settings);
        const mime = getMimeType(settings.export.format);
        const quality = settings.export.format === "png" ? undefined : settings.export.quality / 100;
        const dataUrl = canvas.toDataURL(mime, quality);
        const name = makeExportName(photo, settings, index);
        files.push({ name, dataUrl });
        setPhotoStatus(photo.id, "done");
        setExportProgress({ done: index + 1, message: `已渲染 ${index + 1}/${photos.length}` });
        if (!window.photoFrameAPI) downloadInBrowser(name, dataUrl);
      }

      if (window.photoFrameAPI && outputDirectory) {
        const result = await window.photoFrameAPI.saveExports({ outputDirectory, files });
        setExportProgress({
          lastSaved: result.saved[0],
          message: `已导出 ${result.saved.length} 张图片`
        });
      }
    } catch (error) {
      setExportProgress({ message: error instanceof Error ? error.message : "导出失败" });
      setAllPhotoStatus("error");
    } finally {
      setExportProgress({ active: false });
    }
  };

  return (
    <div
      className={`app ${dragging ? "dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void importFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <AppHeader />
      <div className="workspace">
        <LeftPanel
          photos={photos}
          selectedId={selectedPhoto?.id}
          onImportImages={handleImportImages}
          onImportFolder={handleImportFolder}
        />
        <PreviewPanel selectedPhoto={selectedPhoto} />
        <SettingsPanel
          selectedPhoto={selectedPhoto}
          onSelectLogo={handleLogo}
          onImportTemplates={() => templateInputRef.current?.click()}
          onExportTemplates={handleExportTemplates}
        />
      </div>
      <ExportBar onExport={handleExport} />

      <input
        ref={fileInputRef}
        className="hidden-input"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/tiff"
        multiple
        onChange={(event) => void importFiles(Array.from(event.target.files ?? []))}
      />
      <input
        ref={folderInputRef}
        className="hidden-input"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/tiff"
        multiple
        onChange={(event) => void importFiles(Array.from(event.target.files ?? []))}
      />
      <input
        ref={logoInputRef}
        className="hidden-input"
        type="file"
        accept="image/png,image/svg+xml,image/jpeg,image/webp"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          updateSettings({ logo: { dataUrl: await readFileAsDataUrl(file), name: file.name, enabled: true } });
        }}
      />
      <input
        ref={templateInputRef}
        className="hidden-input"
        type="file"
        accept="application/json"
        onChange={(event) => void handleImportTemplatesFile(event.target.files)}
      />
      <div className="drop-hint">
        <ZoomIn size={26} />
        拖放图片到这里导入
      </div>
    </div>
  );
}
