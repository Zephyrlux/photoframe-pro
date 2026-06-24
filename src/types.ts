export type BackgroundMode = "blur" | "solid" | "gradient";
export type LogoPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center"
  | "custom";
export type ExportFormat = "jpg" | "png" | "webp";
export type PhotoStatus = "ready" | "processing" | "done" | "error";

export interface RatioPreset {
  id: string;
  label: string;
  width: number;
  height: number;
}

export interface ExifDisplay {
  camera: string;
  lens: string;
  exposure: string;
  date: string;
}

export interface PhotoItem {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  status: PhotoStatus;
  exif: ExifDisplay;
  sourcePath?: string;
}

export interface BackgroundSettings {
  mode: BackgroundMode;
  blur: number;
  brightness: number;
  opacity: number;
  solidColor: string;
  gradientFrom: string;
  gradientTo: string;
}

export interface SubjectSettings {
  borderEnabled: boolean;
  borderColor: string;
  borderWidth: number;
  radius: number;
  shadowEnabled: boolean;
  shadowStrength: number;
  shadowBlur: number;
}

export interface LogoSettings {
  enabled: boolean;
  dataUrl?: string;
  name?: string;
  size: number;
  opacity: number;
  position: LogoPosition;
  customX: number;
  customY: number;
}

export interface ExifSettings {
  enabled: boolean;
  cameraOverride: string;
  lensOverride: string;
  exposureOverride: string;
  dateOverride: string;
  textColor: string;
  dividerColor: string;
}

export interface ExportSettings {
  format: ExportFormat;
  quality: number;
  outputDirectory: string;
  naming: "original-frame" | "original-ratio" | "sequence";
}

export interface FrameSettings {
  ratioId: string;
  customWidth: number;
  customHeight: number;
  background: BackgroundSettings;
  subject: SubjectSettings;
  logo: LogoSettings;
  exif: ExifSettings;
  export: ExportSettings;
}

export interface FrameTemplate {
  id: string;
  name: string;
  description: string;
  settings: FrameSettings;
  builtIn?: boolean;
}

export interface ExportProgress {
  active: boolean;
  done: number;
  total: number;
  message: string;
  lastSaved?: string;
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
