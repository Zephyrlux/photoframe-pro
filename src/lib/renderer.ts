import { ratios } from "../config";
import type { ExifDisplay, FrameSettings, PhotoItem } from "../types";
import { loadImageElement } from "./image";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const getOutputSize = (settings: FrameSettings) => {
  if (settings.ratioId === "custom") {
    return {
      width: Math.max(320, Math.round(settings.customWidth)),
      height: Math.max(320, Math.round(settings.customHeight))
    };
  }

  const ratio = ratios.find((item) => item.id === settings.ratioId) ?? ratios[1];
  return { width: ratio.width, height: ratio.height };
};

const contain = (sourceW: number, sourceH: number, boxW: number, boxH: number): Rect => {
  const scale = Math.min(boxW / sourceW, boxH / sourceH);
  const w = sourceW * scale;
  const h = sourceH * scale;
  return { x: (boxW - w) / 2, y: (boxH - h) / 2, w, h };
};

const cover = (sourceW: number, sourceH: number, boxW: number, boxH: number): Rect => {
  const scale = Math.max(boxW / sourceW, boxH / sourceH);
  const w = sourceW * scale;
  const h = sourceH * scale;
  return { x: (boxW - w) / 2, y: (boxH - h) / 2, w, h };
};

const roundedRect = (ctx: CanvasRenderingContext2D, rect: Rect, radius: number) => {
  const r = Math.min(radius, rect.w / 2, rect.h / 2);
  ctx.beginPath();
  ctx.moveTo(rect.x + r, rect.y);
  ctx.arcTo(rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + rect.h, r);
  ctx.arcTo(rect.x + rect.w, rect.y + rect.h, rect.x, rect.y + rect.h, r);
  ctx.arcTo(rect.x, rect.y + rect.h, rect.x, rect.y, r);
  ctx.arcTo(rect.x, rect.y, rect.x + rect.w, rect.y, r);
  ctx.closePath();
};

const hexToRgb = (hex: string) => {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
};

const readableColor = (background: string) => {
  const { r, g, b } = hexToRgb(background);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.55 ? "#111827" : "#F5F7FA";
};

const drawBackground = (ctx: CanvasRenderingContext2D, image: HTMLImageElement, settings: FrameSettings, width: number, height: number) => {
  const bg = settings.background;
  if (bg.mode === "solid") {
    ctx.fillStyle = bg.solidColor;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (bg.mode === "gradient") {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, bg.gradientFrom);
    gradient.addColorStop(1, bg.gradientTo);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  ctx.fillStyle = "#0F1115";
  ctx.fillRect(0, 0, width, height);
  const pad = Math.max(80, bg.blur * 2.5);
  const rect = cover(image.naturalWidth, image.naturalHeight, width + pad * 2, height + pad * 2);
  ctx.save();
  ctx.filter = `blur(${bg.blur}px) brightness(${clamp(100 + bg.brightness, 10, 190)}%) opacity(${clamp(bg.opacity, 0, 100)}%)`;
  ctx.drawImage(image, rect.x - pad, rect.y - pad, rect.w, rect.h);
  ctx.restore();
};

const getExif = (photo: PhotoItem, settings: FrameSettings): ExifDisplay => ({
  camera: settings.exif.cameraOverride || photo.exif.camera,
  lens: settings.exif.lensOverride || photo.exif.lens,
  exposure: settings.exif.exposureOverride || photo.exif.exposure,
  date: settings.exif.dateOverride || photo.exif.date
});

const normalizeCameraName = (camera: string) =>
  camera
    .replace(/^NIKON CORPORATION\s+NIKON/i, "Nikon")
    .replace(/^NIKON CORPORATION/i, "Nikon")
    .replace(/^NIKON/i, "Nikon")
    .replace(/^SONY\s+SONY/i, "Sony")
    .replace(/^SONY/i, "Sony")
    .replace(/^Canon\s+Canon/i, "Canon")
    .replace(/_2\b/g, " II")
    .trim();

const fitText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = "…";
  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (ctx.measureText(`${text.slice(0, mid)}${ellipsis}`).width <= maxWidth) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return `${text.slice(0, Math.max(0, low)).trimEnd()}${ellipsis}`;
};

const drawDefaultLogo = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, color: string) => {
  const mark = width * 0.26;
  const radius = mark * 0.24;
  const gradient = ctx.createLinearGradient(x, y, x + mark, y + mark);
  gradient.addColorStop(0, "#FF8A3D");
  gradient.addColorStop(0.48, "#8B5CF6");
  gradient.addColorStop(1, "#1677FF");
  ctx.fillStyle = gradient;
  roundedRect(ctx, { x, y: y + mark * 0.08, w: mark, h: mark * 0.78 }, radius);
  ctx.fill();

  ctx.fillStyle = "rgba(16,19,26,.88)";
  roundedRect(ctx, { x: x + mark * 0.23, y: y + mark * 0.24, w: mark * 0.54, h: mark * 0.38 }, radius * 0.52);
  ctx.fill();
  ctx.fillStyle = "#F5F7FA";
  ctx.beginPath();
  ctx.arc(x + mark * 0.5, y + mark * 0.43, mark * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1677FF";
  ctx.beginPath();
  ctx.arc(x + mark * 0.5, y + mark * 0.43, mark * 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  ctx.font = `700 ${Math.max(11, width * 0.092)}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillText("PHOTOFRAME", x + mark + width * 0.055, y + width * 0.04);
  ctx.font = `600 ${Math.max(8, width * 0.064)}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillStyle = color === "#111827" ? "#1677FF" : "#A9C7FF";
  ctx.fillText("PRO", x + mark + width * 0.055, y + width * 0.165);
};

const drawLogo = async (
  ctx: CanvasRenderingContext2D,
  settings: FrameSettings,
  canvas: Rect,
  card: Rect,
  imageRect: Rect,
  infoRect: Rect | null,
  textColor: string
) => {
  if (!settings.logo.enabled) return;

  const logoWidth = Math.round((canvas.w * settings.logo.size) / 1000);
  const logoHeight = Math.round(logoWidth * 0.32);
  const gutter = Math.max(18, canvas.w * 0.022);
  let x = card.x + gutter;
  let y = card.y + gutter;

  const area = infoRect && settings.logo.position === "bottom-right" ? infoRect : imageRect;

  if (settings.logo.position === "top-right") {
    x = area.x + area.w - logoWidth - gutter;
    y = area.y + gutter;
  } else if (settings.logo.position === "bottom-left") {
    x = area.x + gutter;
    y = area.y + area.h - logoHeight - gutter;
  } else if (settings.logo.position === "bottom-right") {
    x = area.x + area.w - logoWidth - gutter;
    y = area.y + area.h - logoHeight - gutter;
  } else if (settings.logo.position === "center") {
    x = area.x + area.w / 2 - logoWidth / 2;
    y = area.y + area.h / 2 - logoHeight / 2;
  } else if (settings.logo.position === "custom") {
    x = (settings.logo.customX / 100) * canvas.w - logoWidth / 2;
    y = (settings.logo.customY / 100) * canvas.h - logoHeight / 2;
  }

  ctx.save();
  ctx.globalAlpha = clamp(settings.logo.opacity, 0, 100) / 100;
  if (settings.logo.dataUrl) {
    try {
      const logo = await loadImageElement(settings.logo.dataUrl);
      const ratio = logo.naturalHeight / logo.naturalWidth;
      ctx.drawImage(logo, x, y, logoWidth, logoWidth * ratio);
    } catch {
      drawDefaultLogo(ctx, x, y, logoWidth, textColor);
    }
  } else {
    drawDefaultLogo(ctx, x, y, logoWidth, textColor);
  }
  ctx.restore();
};

const drawExif = (
  ctx: CanvasRenderingContext2D,
  photo: PhotoItem,
  settings: FrameSettings,
  infoRect: Rect,
  textColor: string
) => {
  if (!settings.exif.enabled) return;

  const exif = getExif(photo, settings);
  const titleSize = Math.max(20, Math.min(34, infoRect.w * 0.032));
  const bodySize = Math.max(14, Math.min(21, infoRect.w * 0.02));
  const smallSize = Math.max(12, Math.min(17, infoRect.w * 0.016));
  const paddingX = Math.max(24, infoRect.w * 0.034);
  const paddingY = Math.max(18, infoRect.h * 0.2);
  const gutter = Math.max(18, infoRect.w * 0.024);
  const logoReserve =
    settings.logo.enabled && settings.logo.position === "bottom-right"
      ? Math.max(118, (infoRect.w * settings.logo.size) / 720)
      : 0;
  const dividerX = infoRect.x + infoRect.w - paddingX - logoReserve - gutter;
  const rightBlockX = Math.max(infoRect.x + infoRect.w * 0.48, dividerX - infoRect.w * 0.25);
  const leftMax = Math.max(120, rightBlockX - (infoRect.x + paddingX) - gutter);
  const rightMax = Math.max(96, dividerX - rightBlockX - gutter);

  ctx.fillStyle = textColor;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.font = `700 ${titleSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillText(fitText(ctx, normalizeCameraName(exif.camera), leftMax), infoRect.x + paddingX, infoRect.y + paddingY);

  ctx.font = `400 ${bodySize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillText(fitText(ctx, exif.lens, leftMax), infoRect.x + paddingX, infoRect.y + paddingY + titleSize + 12);

  ctx.font = `500 ${smallSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillText(fitText(ctx, exif.exposure, rightMax), rightBlockX, infoRect.y + paddingY + 4);
  ctx.fillText(fitText(ctx, exif.date, rightMax), rightBlockX, infoRect.y + paddingY + smallSize + 20);

  ctx.strokeStyle = settings.exif.dividerColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(dividerX, infoRect.y + infoRect.h * 0.25);
  ctx.lineTo(dividerX, infoRect.y + infoRect.h * 0.75);
  ctx.stroke();
};

export const renderPhotoToCanvas = async (photo: PhotoItem, settings: FrameSettings) => {
  const image = await loadImageElement(photo.dataUrl);
  const { width, height } = getOutputSize(settings);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("当前浏览器不支持 Canvas。");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  drawBackground(ctx, image, settings, width, height);

  const margin = Math.round(Math.min(width, height) * 0.08);
  const borderWidth = settings.subject.borderEnabled ? settings.subject.borderWidth : 0;
  const infoHeight = settings.exif.enabled ? Math.round(height * 0.118) : 0;
  const maxImageW = width - margin * 2 - borderWidth * 2;
  const maxImageH = height - margin * 2 - borderWidth * 2 - infoHeight;
  const fit = contain(image.naturalWidth, image.naturalHeight, maxImageW, maxImageH);
  const baseImageY = (height - fit.h - infoHeight) / 2;
  const portraitOutputBias = height > width ? height * 0.055 : 0;
  const imageRect = {
    x: Math.round((width - fit.w) / 2),
    y: Math.round(Math.max(margin + borderWidth, baseImageY - portraitOutputBias)),
    w: Math.round(fit.w),
    h: Math.round(fit.h)
  };
  const card = {
    x: imageRect.x - borderWidth,
    y: imageRect.y - borderWidth,
    w: imageRect.w + borderWidth * 2,
    h: imageRect.h + borderWidth * 2 + infoHeight
  };
  const radius = settings.subject.radius;
  const textColor = settings.exif.textColor || readableColor(settings.subject.borderColor);

  ctx.save();
  if (settings.subject.shadowEnabled) {
    ctx.shadowColor = `rgba(0, 0, 0, ${clamp(settings.subject.shadowStrength, 0, 100) / 140})`;
    ctx.shadowBlur = settings.subject.shadowBlur;
    ctx.shadowOffsetY = Math.max(8, settings.subject.shadowStrength / 2);
  }
  ctx.fillStyle = settings.subject.borderEnabled || settings.exif.enabled ? settings.subject.borderColor : "transparent";
  roundedRect(ctx, card, radius + borderWidth * 0.6);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundedRect(ctx, imageRect, radius);
  ctx.clip();
  ctx.drawImage(image, imageRect.x, imageRect.y, imageRect.w, imageRect.h);
  ctx.restore();

  const infoRect = settings.exif.enabled
    ? {
        x: card.x,
        y: imageRect.y + imageRect.h,
        w: card.w,
        h: infoHeight + borderWidth
      }
    : null;

  if (infoRect) {
    drawExif(ctx, photo, settings, infoRect, textColor);
  }

  await drawLogo(ctx, settings, { x: 0, y: 0, w: width, h: height }, card, imageRect, infoRect, textColor);

  return canvas;
};

export const getMimeType = (format: FrameSettings["export"]["format"]) => {
  if (format === "png") return "image/png";
  if (format === "webp") return "image/webp";
  return "image/jpeg";
};

export const makeExportName = (photo: PhotoItem, settings: FrameSettings, index: number) => {
  const ext = settings.export.format === "jpg" ? "jpg" : settings.export.format;
  const base = photo.name.replace(/\.[^.]+$/, "");
  if (settings.export.naming === "sequence") return `photoframe_${String(index + 1).padStart(3, "0")}.${ext}`;
  if (settings.export.naming === "original-ratio") return `${base}_${settings.ratioId.replace(":", "x")}.${ext}`;
  return `${base}_frame.${ext}`;
};
