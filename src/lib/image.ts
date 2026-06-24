import exifr from "exifr";
import type { NativeImagePayload } from "../vite-env";
import type { ExifDisplay, PhotoDetails, PhotoItem } from "../types";

const fallbackExif: ExifDisplay = {
  camera: "Sony A7R V",
  lens: "FE 24-70mm F2.8 GM II",
  exposure: "70mm | f/2.8 | 1/250s | ISO100",
  date: "2024-03-16 18:20:35"
};

const scenicNames = [
  "DSC_0001.jpg",
  "DSC_0002.jpg",
  "DSC_0003.jpg",
  "DSC_0004.jpg",
  "DSC_0005.jpg",
  "DSC_0006.jpg",
  "DSC_0007.jpg",
  "DSC_0008.jpg",
  "DSC_0009.jpg",
  "DSC_0010.jpg",
  "DSC_0011.jpg",
  "DSC_0012.jpg"
];

interface ParsedPhotoMetadata {
  exif: ExifDisplay;
  details: PhotoDetails;
}

export const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

export const loadImageElement = (dataUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片无法加载。"));
    image.src = dataUrl;
  });

export const dataUrlToArrayBuffer = async (dataUrl: string) => {
  const response = await fetch(dataUrl);
  return response.arrayBuffer();
};

export const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("文件读取失败。"));
    reader.readAsDataURL(file);
  });

const formatDate = (value?: Date | string | number) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}:${pad(date.getSeconds())}`;
};

const formatFileSize = (bytes?: number) => {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatExposure = (seconds?: number) => {
  if (!seconds) return "";
  if (seconds >= 1) return `${seconds.toFixed(seconds % 1 === 0 ? 0 : 1)}s`;
  return `1/${Math.round(1 / seconds)}s`;
};

const formatFocalLength = (value: unknown) => {
  const focal = Number(value);
  if (!Number.isFinite(focal) || focal <= 0) return "";
  return `${Math.round(focal)}mm`;
};

const formatAperture = (value: unknown) => {
  const aperture = Number(value);
  if (!Number.isFinite(aperture) || aperture <= 0) return "";
  return `f/${aperture.toFixed(1).replace(".0", "")}`;
};

const formatIso = (value: unknown) => {
  const iso = Number(value);
  if (!Number.isFinite(iso) || iso <= 0) return "";
  return `ISO ${Math.round(iso)}`;
};

const cleanExifText = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();

const formatFlash = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("FlashFired" in record) return record.FlashFired ? "开启" : "关闭";
    if ("fired" in record) return record.fired ? "开启" : "关闭";
  }

  const text = cleanExifText(value);
  if (text === "0") return "关闭";
  if (text === "1") return "开启";
  return text;
};

const normalizeMake = (value: unknown) => {
  const make = cleanExifText(value);
  if (/^NIKON CORPORATION$/i.test(make)) return "Nikon";
  if (/^SONY$/i.test(make)) return "Sony";
  if (/^CANON$/i.test(make)) return "Canon";
  return make.replace(/\bCORPORATION\b/gi, "").trim() || make;
};

const normalizeModel = (value: unknown) =>
  cleanExifText(value)
    .replace(/^NIKON/i, "Nikon")
    .replace(/^SONY/i, "Sony")
    .replace(/^CANON/i, "Canon")
    .replace(/_2\b/g, " II");

const formatCamera = (makeValue: unknown, modelValue: unknown) => {
  const make = normalizeMake(makeValue);
  const model = normalizeModel(modelValue);
  if (make && model.toLowerCase().startsWith(make.toLowerCase())) return model;
  return [make, model].filter(Boolean).join(" ").trim();
};

const emptyDetails = (fileName = "", fileSize = "", modifiedAt = "", dimensions = ""): PhotoDetails => ({
  fileName,
  fileSize,
  modifiedAt,
  dimensions,
  cameraMake: "",
  cameraModel: "",
  software: "",
  capturedAt: "",
  flash: "",
  focalLength: "",
  shutter: "",
  aperture: "",
  iso: "",
  lensMake: "",
  lensModel: ""
});

const parseExif = async (arrayBuffer: ArrayBuffer): Promise<ParsedPhotoMetadata> => {
  try {
    const meta = await exifr.parse(arrayBuffer, {
      tiff: true,
      exif: true,
      gps: false,
      interop: false,
      translateKeys: true,
      translateValues: false,
      reviveValues: true
    });

    if (!meta) return { exif: fallbackExif, details: emptyDetails() };

    const camera = formatCamera(meta.Make, meta.Model) || fallbackExif.camera;
    const lens = cleanExifText(meta.LensModel || meta.Lens) || fallbackExif.lens;
    const focal = formatFocalLength(meta.FocalLength);
    const aperture = formatAperture(meta.FNumber);
    const shutter = formatExposure(Number(meta.ExposureTime));
    const iso = formatIso(meta.ISO).replace("ISO ", "ISO");
    const exposure = [focal, aperture, shutter, iso].filter(Boolean).join(" | ") || fallbackExif.exposure;
    const date = formatDate(meta.DateTimeOriginal || meta.CreateDate || meta.ModifyDate) || fallbackExif.date;
    const details = emptyDetails();
    details.cameraMake = cleanExifText(meta.Make);
    details.cameraModel = cleanExifText(meta.Model);
    details.software = cleanExifText(meta.Software);
    details.capturedAt = date;
    details.flash = formatFlash(meta.Flash) || cleanExifText(meta.FlashpixVersion);
    details.focalLength = focal;
    details.shutter = shutter;
    details.aperture = aperture;
    details.iso = formatIso(meta.ISO);
    details.lensMake = cleanExifText(meta.LensMake);
    details.lensModel = lens;

    return { exif: { camera, lens, exposure, date }, details };
  } catch {
    return { exif: fallbackExif, details: emptyDetails() };
  }
};

const finalizeDetails = (
  details: PhotoDetails,
  fileName: string,
  fileSize: string,
  modifiedAt: string,
  width: number,
  height: number
): PhotoDetails => ({
  ...details,
  fileName,
  fileSize,
  modifiedAt,
  dimensions: `${formatNumber(width)} × ${formatNumber(height)}`
});

const formatNumber = (value: number) => value.toLocaleString("en-US");

export const createPhotoFromFile = async (file: File): Promise<PhotoItem> => {
  const dataUrl = await readFileAsDataUrl(file);
  const [image, metadata] = await Promise.all([
    loadImageElement(dataUrl),
    file.arrayBuffer().then(parseExif)
  ]);

  return {
    id: uid(),
    name: file.name,
    dataUrl,
    width: image.naturalWidth,
    height: image.naturalHeight,
    status: "ready",
    exif: metadata.exif,
    details: finalizeDetails(
      metadata.details,
      file.name,
      formatFileSize(file.size),
      formatDate(file.lastModified),
      image.naturalWidth,
      image.naturalHeight
    )
  };
};

export const createPhotoFromNative = async (payload: NativeImagePayload): Promise<PhotoItem> => {
  const [image, metadata] = await Promise.all([
    loadImageElement(payload.dataUrl),
    dataUrlToArrayBuffer(payload.dataUrl).then(parseExif)
  ]);

  return {
    id: uid(),
    name: payload.name,
    dataUrl: payload.dataUrl,
    width: image.naturalWidth,
    height: image.naturalHeight,
    status: "ready",
    exif: metadata.exif,
    details: finalizeDetails(
      metadata.details,
      payload.name,
      formatFileSize(payload.size),
      formatDate(payload.modifiedAt),
      image.naturalWidth,
      image.naturalHeight
    ),
    sourcePath: payload.path
  };
};

const drawMountain = (ctx: CanvasRenderingContext2D, width: number, height: number, seed: number) => {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, seed % 2 ? "#7FA7D8" : "#A7C2E9");
  sky.addColorStop(0.5, seed % 2 ? "#F5CCB4" : "#E7D2B9");
  sky.addColorStop(1, "#263B54");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = seed % 3 ? "#223348" : "#35465F";
  ctx.beginPath();
  ctx.moveTo(120, height * 0.72);
  ctx.lineTo(width * 0.52, height * 0.18);
  ctx.lineTo(width - 130, height * 0.72);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,.78)";
  ctx.beginPath();
  ctx.moveTo(width * 0.52, height * 0.18);
  ctx.lineTo(width * 0.42, height * 0.45);
  ctx.lineTo(width * 0.56, height * 0.36);
  ctx.lineTo(width * 0.66, height * 0.48);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(26,36,50,.72)";
  for (let i = 0; i < 12; i += 1) {
    const x = i * 130 - 30;
    ctx.beginPath();
    ctx.moveTo(x, height * 0.76);
    ctx.lineTo(x + 95, height * (0.55 + (i % 4) * 0.02));
    ctx.lineTo(x + 190, height * 0.76);
    ctx.closePath();
    ctx.fill();
  }

  const water = ctx.createLinearGradient(0, height * 0.66, 0, height);
  water.addColorStop(0, "rgba(27,42,58,.74)");
  water.addColorStop(1, "rgba(18,28,44,.96)");
  ctx.fillStyle = water;
  ctx.fillRect(0, height * 0.66, width, height * 0.34);

  ctx.save();
  ctx.translate(0, height * 1.34);
  ctx.scale(1, -0.54);
  ctx.globalAlpha = 0.32;
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.restore();

  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(255,173,74,.68)";
  for (let i = 0; i < 18; i += 1) {
    ctx.fillRect(180 + i * 38, height * 0.69 + (i % 3) * 3, 18, 5);
  }
};

const drawFlowers = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#2C4F3F");
  bg.addColorStop(0.55, "#D3B16F");
  bg.addColorStop(1, "#18291F");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 38; i += 1) {
    const x = (i * 97) % width;
    const y = height * 0.45 + ((i * 43) % 330);
    const r = 22 + (i % 5) * 5;
    ctx.strokeStyle = "rgba(30,77,45,.7)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, height);
    ctx.quadraticCurveTo(x - 28, y + 70, x, y);
    ctx.stroke();

    for (let p = 0; p < 10; p += 1) {
      const angle = (Math.PI * 2 * p) / 10;
      ctx.fillStyle = i % 2 ? "#F6D54B" : "#F4E7D7";
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(angle) * r, y + Math.sin(angle) * r, r * 0.38, r * 0.18, angle, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#6E4319";
    ctx.beginPath();
    ctx.arc(x, y, r * 0.34, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawCity = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#162747");
  bg.addColorStop(0.58, "#F2A35B");
  bg.addColorStop(1, "#18202F");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 24; i += 1) {
    const w = 34 + (i % 4) * 22;
    const h = 180 + (i % 7) * 55;
    const x = i * 52 - 20;
    ctx.fillStyle = i % 2 ? "#1C2637" : "#25334B";
    ctx.fillRect(x, height - h, w, h);
    ctx.fillStyle = "rgba(255,206,111,.58)";
    for (let y = height - h + 24; y < height - 30; y += 34) {
      ctx.fillRect(x + 9, y, 8, 12);
      ctx.fillRect(x + 26, y, 8, 12);
    }
  }

  ctx.fillStyle = "rgba(255,255,255,.86)";
  ctx.beginPath();
  ctx.arc(width * 0.76, height * 0.22, 38, 0, Math.PI * 2);
  ctx.fill();
};

const drawAurora = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  ctx.fillStyle = "#071425";
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 120; i += 1) {
    ctx.fillStyle = `rgba(255,255,255,${0.25 + (i % 7) * 0.06})`;
    ctx.fillRect((i * 83) % width, (i * 47) % Math.round(height * 0.52), 2, 2);
  }
  for (let i = 0; i < 5; i += 1) {
    const grad = ctx.createLinearGradient(0, height * 0.12, width, height * 0.56);
    grad.addColorStop(0, "rgba(34,197,94,0)");
    grad.addColorStop(0.45, i % 2 ? "rgba(90,220,170,.42)" : "rgba(47,150,255,.36)");
    grad.addColorStop(1, "rgba(34,197,94,0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 54 - i * 6;
    ctx.beginPath();
    ctx.moveTo(-80, height * (0.3 + i * 0.06));
    ctx.bezierCurveTo(width * 0.24, height * 0.05, width * 0.55, height * 0.56, width + 60, height * 0.22);
    ctx.stroke();
  }

  ctx.fillStyle = "#111B29";
  ctx.beginPath();
  ctx.moveTo(0, height * 0.76);
  ctx.lineTo(width * 0.22, height * 0.57);
  ctx.lineTo(width * 0.48, height * 0.78);
  ctx.lineTo(width * 0.74, height * 0.54);
  ctx.lineTo(width, height * 0.7);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();
};

const createDemoDataUrl = (index: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const variant = index % 4;
  if (variant === 0) drawMountain(ctx, canvas.width, canvas.height, index);
  if (variant === 1) drawAurora(ctx, canvas.width, canvas.height);
  if (variant === 2) drawFlowers(ctx, canvas.width, canvas.height);
  if (variant === 3) drawCity(ctx, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", 0.92);
};

export const createDemoPhotos = (): PhotoItem[] =>
  scenicNames.map((name, index) => ({
    id: uid(),
    name,
    dataUrl: createDemoDataUrl(index),
    width: 6000,
    height: 4000,
    status: index < 8 ? "done" : "ready",
    exif: {
      ...fallbackExif,
      camera: index % 3 === 0 ? "Sony A7R V" : index % 3 === 1 ? "Canon EOS R5" : "Nikon Z8",
      exposure: index % 2 === 0 ? "70mm | f/2.8 | 1/250s | ISO100" : "35mm | f/4 | 1/500s | ISO200"
    },
    details: {
      ...emptyDetails(name, "示例图片", "示例数据", "6,000 × 4,000"),
      cameraMake: index % 3 === 0 ? "Sony" : index % 3 === 1 ? "Canon" : "Nikon",
      cameraModel: index % 3 === 0 ? "A7R V" : index % 3 === 1 ? "EOS R5" : "Z8",
      capturedAt: fallbackExif.date,
      focalLength: index % 2 === 0 ? "70mm" : "35mm",
      shutter: index % 2 === 0 ? "1/250s" : "1/500s",
      aperture: index % 2 === 0 ? "f/2.8" : "f/4",
      iso: index % 2 === 0 ? "ISO 100" : "ISO 200",
      lensModel: fallbackExif.lens
    }
  }));
