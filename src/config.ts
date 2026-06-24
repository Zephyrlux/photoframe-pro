import type { DeepPartial, FrameSettings, FrameTemplate } from "./types";

export const defaultSettings: FrameSettings = {
  layout: "blur-poster",
  background: {
    mode: "blur",
    blur: 48,
    brightness: -14,
    opacity: 100,
    solidColor: "#FFFFFF",
    gradientFrom: "#13233D",
    gradientTo: "#10131A"
  },
  subject: {
    borderEnabled: false,
    borderColor: "#FFFFFF",
    borderWidth: 0,
    radius: 18,
    shadowEnabled: true,
    shadowStrength: 42,
    shadowBlur: 34
  },
  logo: {
    enabled: false,
    size: 90,
    opacity: 92
  },
  exif: {
    enabled: true,
    cameraOverride: "",
    lensOverride: "",
    exposureOverride: "",
    dateOverride: "",
    textColor: "#F5F7FA",
    dividerColor: "rgba(255,255,255,.26)"
  },
  export: {
    format: "jpg",
    quality: 95,
    outputDirectory: "",
    naming: "original-frame"
  }
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const makeTemplateSettings = (patch: DeepPartial<FrameSettings>): FrameSettings => ({
  ...clone(defaultSettings),
  ...patch,
  background: { ...clone(defaultSettings.background), ...patch.background },
  subject: { ...clone(defaultSettings.subject), ...patch.subject },
  logo: { ...clone(defaultSettings.logo), ...patch.logo },
  exif: { ...clone(defaultSettings.exif), ...patch.exif },
  export: { ...clone(defaultSettings.export), ...patch.export }
});

export const builtInTemplates: FrameTemplate[] = [
  {
    id: "gaussian-blur",
    name: "高斯模糊模板",
    description: "原图高斯模糊铺底，前景照片和参数文字叠放。",
    builtIn: true,
    settings: makeTemplateSettings({
      layout: "blur-poster",
      background: { mode: "blur", blur: 48, brightness: -14, opacity: 100 },
      subject: {
        borderEnabled: false,
        borderColor: "#FFFFFF",
        borderWidth: 0,
        radius: 18,
        shadowEnabled: true,
        shadowStrength: 46,
        shadowBlur: 36
      },
      logo: { enabled: false, opacity: 92, size: 90 },
      exif: {
        enabled: true,
        textColor: "#F5F7FA",
        dividerColor: "rgba(255,255,255,.26)"
      }
    })
  },
  {
    id: "bottom-border",
    name: "通用底部边框模板",
    description: "照片保持原比例，底部留出品牌、机型和参数信息。",
    builtIn: true,
    settings: makeTemplateSettings({
      layout: "bottom-border",
      background: { mode: "blur", blur: 38, brightness: -8, opacity: 100 },
      subject: {
        borderEnabled: true,
        borderColor: "#FFFFFF",
        borderWidth: 18,
        radius: 14,
        shadowEnabled: true,
        shadowStrength: 34,
        shadowBlur: 24
      },
      logo: { enabled: true, size: 118, opacity: 94 },
      exif: {
        enabled: true,
        textColor: "#111827",
        dividerColor: "#D6DAE2"
      }
    })
  },
  {
    id: "white-border",
    name: "通用白色边框模板",
    description: "经典白边相纸，适合批量统一输出。",
    builtIn: true,
    settings: makeTemplateSettings({
      layout: "photo-card",
      background: { mode: "blur", blur: 60, brightness: 0, opacity: 100 },
      subject: {
        borderEnabled: true,
        borderColor: "#FFFFFF",
        borderWidth: 20,
        radius: 18,
        shadowEnabled: true,
        shadowStrength: 32,
        shadowBlur: 22
      },
      logo: { enabled: true, opacity: 88, size: 110 },
      exif: { enabled: true, textColor: "#111827", dividerColor: "#D6DAE2" }
    })
  }
];
