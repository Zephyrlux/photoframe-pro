import {
  Check,
  Download,
  FolderOpen,
  Grid2X2,
  ImagePlus,
  Info,
  SlidersHorizontal,
  Trash2,
  ZoomIn
} from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import logoMark from "../photoframe_pro_design_pack/assets/logo_mark.svg";
import { allTemplates, useAppStore } from "./store";
import type { DeepPartial, FrameSettings, FrameTemplate, PhotoItem } from "./types";
import type { NativeImagePayload } from "./vite-env";
import { createPhotoFromFile, createPhotoFromNative } from "./lib/image";
import { getMimeType, getOutputSize, makeExportName, renderPhotoToCanvas } from "./lib/renderer";

const formatNumber = (value: number) => value.toLocaleString("en-US");
type SettingsTab = "info" | "templates" | "border";

const normalizeCameraLabel = (camera?: string) =>
  (camera ?? "")
    .replace(/^NIKON CORPORATION\s+NIKON/i, "Nikon")
    .replace(/^NIKON CORPORATION/i, "Nikon")
    .replace(/^NIKON/i, "Nikon")
    .replace(/^SONY\s+SONY/i, "Sony")
    .replace(/^SONY/i, "Sony")
    .replace(/^Canon\s+Canon/i, "Canon")
    .replace(/_2\b/g, " II")
    .trim();

const photoDetailsRows = (photo?: PhotoItem) => {
  if (!photo) return [];
  const details = photo.details;
  const dimensions = details?.dimensions || `${formatNumber(photo.width)} × ${formatNumber(photo.height)}`;
  return [
    ["文件名", details?.fileName || photo.name],
    ["文件大小", details?.fileSize || "未知"],
    ["修改时间", details?.modifiedAt || "未知"],
    ["图片尺寸", dimensions],
    ["相机厂商", details?.cameraMake || "未知"],
    ["相机型号", details?.cameraModel || normalizeCameraLabel(photo.exif.camera) || "未知"],
    ["软件", details?.software || "未知"],
    ["拍摄日期", details?.capturedAt || photo.exif.date || "未知"],
    ["闪光灯", details?.flash || "未知"],
    ["焦距", details?.focalLength || "未知"],
    ["快门", details?.shutter || "未知"],
    ["光圈", details?.aperture || "未知"],
    ["ISO", details?.iso || "未知"],
    ["镜头厂商", details?.lensMake || "未知"],
    ["镜头型号", details?.lensModel || photo.exif.lens || "未知"]
  ];
};

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
      <div className="brand">
        <img src={logoMark} alt="" />
        <strong>PhotoFrame Pro</strong>
      </div>
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

      <div className={photos.length > 0 ? "photo-list" : "photo-list empty"}>
        {photos.length > 0 ? (
          photos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              selected={photo.id === selectedId}
              onClick={() => selectPhoto(photo.id)}
            />
          ))
        ) : (
          <button className="empty-import-card" type="button" onClick={onImportImages}>
            <ImagePlus size={24} />
            <strong>导入本地图片</strong>
            <span>支持 JPG、PNG、WEBP、TIFF</span>
          </button>
        )}
      </div>

      <div className="list-footer">本地处理，不上传图片</div>
    </aside>
  );
}

function PreviewPanel({
  selectedPhoto,
  onImportImages,
  onImportFolder
}: {
  selectedPhoto?: PhotoItem;
  onImportImages: () => void;
  onImportFolder: () => void;
}) {
  const settings = useAppStore((state) => state.settings);
  const photos = useAppStore((state) => state.photos);
  const selectPhoto = useAppStore((state) => state.selectPhoto);
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const output = selectedPhoto ? getOutputSize(selectedPhoto) : null;
  const previewStyle = {
    "--preview-aspect": output ? `${output.width} / ${output.height}` : "4 / 3"
  } as CSSProperties;

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
        <div className="output-size">{output ? `输出尺寸：${formatNumber(output.width)} × ${formatNumber(output.height)}（原图比例）` : "输出尺寸：原图比例"}</div>
      </div>

      <div className="canvas-shell">
        {previewUrl ? (
          <img
            className={busy ? "preview-image refreshing" : "preview-image"}
            src={previewUrl}
            alt="当前输出预览"
            style={previewStyle}
          />
        ) : (
          <div className="empty-preview">
            <ZoomIn size={30} />
            <strong>拖入真实图片开始预览</strong>
            <span>PhotoFrame Pro 会在本地生成预览，不上传文件。</span>
            <div>
              <button className="primary" type="button" onClick={onImportImages}>
                导入图片
              </button>
              <button type="button" onClick={onImportFolder}>
                导入文件夹
              </button>
            </div>
          </div>
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
        </div>
      </div>
    </main>
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

function CameraLogoControls({
  settings,
  updateSettings
}: {
  settings: FrameSettings;
  updateSettings: (patch: DeepPartial<FrameSettings>) => void;
}) {
  return (
    <Section title="相机 Logo">
      <Toggle
        checked={settings.logo.enabled}
        label="根据 EXIF 自动显示品牌 Logo"
        onChange={(checked) => updateSettings({ logo: { enabled: checked } })}
      />
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
            placeholder={normalizeCameraLabel(selectedPhoto?.exif.camera)}
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
  templates
}: {
  templates: FrameTemplate[];
}) {
  const settings = useAppStore((state) => state.settings);
  const applyTemplate = useAppStore((state) => state.applyTemplate);

  return (
    <Section title="模板">
      <div className="template-list">
        {templates.map((template) => (
          <article key={template.id} className="template-item">
            <button
              className={settings.layout === template.settings.layout ? "selected" : ""}
              type="button"
              onClick={() => applyTemplate(template)}
            >
              <strong>{template.name}</strong>
              <small>{template.description}</small>
            </button>
          </article>
        ))}
      </div>
    </Section>
  );
}

function PhotoInfoPanel({ photo }: { photo?: PhotoItem }) {
  const rows = photoDetailsRows(photo);

  if (!photo) {
    return (
      <section className="photo-info-empty">
        <Info size={22} />
        <strong>还没有选中照片</strong>
        <span>导入图片后会在这里展示文件信息和相机参数。</span>
      </section>
    );
  }

  return (
    <Section title="基础属性">
      <div className="info-grid">
        {rows.map(([label, value]) => (
          <div className="info-row" key={label}>
            <span>{label}</span>
            <strong title={value}>{value}</strong>
          </div>
        ))}
      </div>
    </Section>
  );
}

function SettingsPanel({ selectedPhoto }: { selectedPhoto?: PhotoItem }) {
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const [tab, setTab] = useState<SettingsTab>("info");
  const templates = allTemplates();

  const tabs: Array<{ id: SettingsTab; label: string; icon: ReactNode }> = [
    { id: "info", label: "信息", icon: <Info size={15} /> },
    { id: "templates", label: "模板", icon: <Grid2X2 size={15} /> },
    { id: "border", label: "边框", icon: <SlidersHorizontal size={15} /> }
  ];

  return (
    <aside className="right-panel panel">
      <div className="panel-tabs" role="tablist" aria-label="右侧设置">
        {tabs.map((item) => (
          <button
            key={item.id}
            className={tab === item.id ? "active" : ""}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
      <div className={tab === "info" ? "panel-body info" : "panel-body"}>
        {tab === "info" && <PhotoInfoPanel photo={selectedPhoto} />}
        {tab === "templates" && <TemplateControls templates={templates} />}
        {tab === "border" && (
          <>
            <BackgroundControls settings={settings} updateSettings={updateSettings} />
            <SubjectControls settings={settings} updateSettings={updateSettings} />
            <CameraLogoControls settings={settings} updateSettings={updateSettings} />
            <ExifControls settings={settings} selectedPhoto={selectedPhoto} updateSettings={updateSettings} />
          </>
        )}
      </div>
    </aside>
  );
}

function ExportBar({ onExport }: { onExport: () => void }) {
  const settings = useAppStore((state) => state.settings);
  const photos = useAppStore((state) => state.photos);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const progress = useAppStore((state) => state.exportProgress);
  const isDesktop = Boolean(window.photoFrameAPI);

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
        <input readOnly value={settings.export.outputDirectory || (isDesktop ? "请选择输出目录" : "浏览器模式将直接下载")} />
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
  const [dragging, setDragging] = useState(false);

  const photos = useAppStore((state) => state.photos);
  const selectedId = useAppStore((state) => state.selectedId);
  const selectedPhoto = photos.find((photo) => photo.id === selectedId) ?? photos[0];
  const settings = useAppStore((state) => state.settings);
  const addPhotos = useAppStore((state) => state.addPhotos);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const setExportProgress = useAppStore((state) => state.setExportProgress);
  const setPhotoStatus = useAppStore((state) => state.setPhotoStatus);
  const setAllPhotoStatus = useAppStore((state) => state.setAllPhotoStatus);

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
        <PreviewPanel
          selectedPhoto={selectedPhoto}
          onImportImages={handleImportImages}
          onImportFolder={handleImportFolder}
        />
        <SettingsPanel selectedPhoto={selectedPhoto} />
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
      <div className="drop-hint">
        <ZoomIn size={26} />
        拖放图片到这里导入
      </div>
    </div>
  );
}
