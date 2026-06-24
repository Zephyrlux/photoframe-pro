import type { DeepPartial, FrameSettings, FrameTemplate, RatioPreset } from "./types";

export const ratios: RatioPreset[] = [
  { id: "1:1", label: "1:1", width: 1080, height: 1080 },
  { id: "4:5", label: "4:5", width: 1080, height: 1350 },
  { id: "9:16", label: "9:16", width: 1080, height: 1920 },
  { id: "3:4", label: "3:4", width: 1080, height: 1440 },
  { id: "custom", label: "自定义", width: 1080, height: 1350 }
];

export const defaultSettings: FrameSettings = {
  ratioId: "4:5",
  customWidth: 1080,
  customHeight: 1350,
  background: {
    mode: "blur",
    blur: 60,
    brightness: 0,
    opacity: 100,
    solidColor: "#FFFFFF",
    gradientFrom: "#13233D",
    gradientTo: "#10131A"
  },
  subject: {
    borderEnabled: true,
    borderColor: "#FFFFFF",
    borderWidth: 20,
    radius: 20,
    shadowEnabled: true,
    shadowStrength: 30,
    shadowBlur: 20
  },
  logo: {
    enabled: true,
    size: 120,
    opacity: 80,
    position: "bottom-right",
    customX: 50,
    customY: 50
  },
  exif: {
    enabled: true,
    cameraOverride: "",
    lensOverride: "",
    exposureOverride: "",
    dateOverride: "",
    textColor: "#111827",
    dividerColor: "#D6DAE2"
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
    id: "photography-white",
    name: "摄影白边模板",
    description: "白色相纸边框、EXIF 底栏和右下 Logo。",
    builtIn: true,
    settings: makeTemplateSettings({})
  },
  {
    id: "xiaohongshu-blur",
    name: "小红书 4:5 模糊背景",
    description: "强模糊背景、柔和阴影，适合竖图发布。",
    builtIn: true,
    settings: makeTemplateSettings({
      ratioId: "4:5",
      background: { blur: 76, brightness: -6, opacity: 100 },
      subject: { borderWidth: 18, radius: 26, shadowStrength: 42, shadowBlur: 26 },
      logo: { size: 96, opacity: 64 }
    })
  },
  {
    id: "product-clean",
    name: "商品图白底模板",
    description: "纯白底、轻边框，适合电商统一尺寸。",
    builtIn: true,
    settings: makeTemplateSettings({
      ratioId: "1:1",
      background: { mode: "solid", solidColor: "#FFFFFF" },
      subject: {
        borderEnabled: true,
        borderColor: "#FFFFFF",
        borderWidth: 36,
        radius: 10,
        shadowEnabled: true,
        shadowStrength: 14,
        shadowBlur: 18
      },
      logo: { enabled: true, opacity: 45, size: 88, position: "top-right" },
      exif: { enabled: false }
    })
  },
  {
    id: "black-premium",
    name: "黑色高级感模板",
    description: "暗色渐变背景、黑色相纸和浅色 EXIF。",
    builtIn: true,
    settings: makeTemplateSettings({
      background: {
        mode: "gradient",
        gradientFrom: "#07080C",
        gradientTo: "#1A2130"
      },
      subject: {
        borderEnabled: true,
        borderColor: "#050608",
        borderWidth: 24,
        radius: 16,
        shadowStrength: 52,
        shadowBlur: 30
      },
      exif: {
        enabled: true,
        textColor: "#F5F7FA",
        dividerColor: "#303642"
      },
      logo: { opacity: 72, size: 110 }
    })
  }
];
