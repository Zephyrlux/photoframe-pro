import type { ExifDisplay, FrameSettings, PhotoItem } from "../types";
import { loadImageElement } from "./image";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const getOutputSize = (photo: PhotoItem) => ({
  width: Math.max(320, Math.round(photo.width)),
  height: Math.max(320, Math.round(photo.height))
});

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

const detectCameraBrand = (photo: PhotoItem) => {
  const details = photo.details;
  const source = [details?.cameraMake, details?.cameraModel, details?.lensMake, photo.exif.camera]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (source.includes("nikon")) return "nikon";
  if (source.includes("sony")) return "sony";
  if (source.includes("canon")) return "canon";
  if (source.includes("fujifilm") || source.includes("fuji")) return "fujifilm";
  if (source.includes("leica")) return "leica";
  if (source.includes("panasonic") || source.includes("lumix")) return "lumix";
  if (source.includes("olympus")) return "olympus";
  if (source.includes("om digital") || source.includes("om system")) return "om";
  if (source.includes("ricoh") || source.includes("pentax")) return "ricoh";
  if (source.includes("hasselblad")) return "hasselblad";
  return "camera";
};

const brandLabel = (brand: string) =>
  ({
    nikon: "Nikon",
    sony: "SONY",
    canon: "Canon",
    fujifilm: "FUJIFILM",
    leica: "Leica",
    lumix: "LUMIX",
    olympus: "OLYMPUS",
    om: "OM SYSTEM",
    ricoh: "RICOH",
    hasselblad: "HASSELBLAD",
    camera: "CAMERA"
  })[brand] ?? "CAMERA";

const drawCameraBrandLogo = (
  ctx: CanvasRenderingContext2D,
  photo: PhotoItem,
  x: number,
  y: number,
  width: number,
  color: string
) => {
  const brand = detectCameraBrand(photo);
  const height = Math.max(18, width * 0.34);
  const label = brandLabel(brand);

  ctx.save();
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  if (brand === "nikon") {
    roundedRect(ctx, { x, y, w: width, h: height }, height * 0.08);
    ctx.fillStyle = "#FFD400";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.52)";
    ctx.lineWidth = Math.max(2, width * 0.015);
    for (let i = -2; i < 6; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x + width * (0.12 + i * 0.11), y);
      ctx.lineTo(x + width * (0.38 + i * 0.11), y + height);
      ctx.stroke();
    }
    ctx.fillStyle = "#111111";
    ctx.font = `italic 900 ${height * 0.48}px Arial, sans-serif`;
    ctx.fillText("Nikon", x + width * 0.54, y + height * 0.58);
  } else if (brand === "canon") {
    ctx.fillStyle = "#C40019";
    ctx.font = `italic 800 ${height * 0.62}px Georgia, serif`;
    ctx.fillText(label, x + width / 2, y + height * 0.56);
  } else if (brand === "leica") {
    const r = height * 0.46;
    ctx.fillStyle = "#D71920";
    ctx.beginPath();
    ctx.arc(x + width / 2, y + height / 2, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `italic 700 ${height * 0.34}px Georgia, serif`;
    ctx.fillText("Leica", x + width / 2, y + height * 0.52);
  } else if (brand === "fujifilm") {
    ctx.fillStyle = color;
    ctx.font = `900 ${height * 0.42}px Arial, sans-serif`;
    ctx.fillText("FUJI", x + width * 0.39, y + height * 0.5);
    ctx.fillStyle = "#E21B2D";
    ctx.fillRect(x + width * 0.53, y + height * 0.22, width * 0.035, height * 0.56);
    ctx.fillStyle = "#009A44";
    ctx.fillRect(x + width * 0.58, y + height * 0.22, width * 0.035, height * 0.56);
    ctx.fillStyle = color;
    ctx.fillText("FILM", x + width * 0.74, y + height * 0.5);
  } else {
    ctx.fillStyle = color;
    ctx.font = `800 ${height * 0.42}px Arial, sans-serif`;
    ctx.fillText(label, x + width / 2, y + height * 0.52);
  }

  ctx.restore();
  return height;
};

const drawLogo = async (
  ctx: CanvasRenderingContext2D,
  settings: FrameSettings,
  photo: PhotoItem,
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
  const area = infoRect ?? imageRect;
  const x = area.x + area.w - logoWidth - gutter;
  const y = area.y + area.h - logoHeight - gutter;

  ctx.save();
  ctx.globalAlpha = clamp(settings.logo.opacity, 0, 100) / 100;
  drawCameraBrandLogo(ctx, photo, x, y, logoWidth, textColor);
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
  const logoReserve = settings.logo.enabled ? Math.max(118, (infoRect.w * settings.logo.size) / 720) : 0;
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

const drawPosterText = (
  ctx: CanvasRenderingContext2D,
  photo: PhotoItem,
  settings: FrameSettings,
  imageRect: Rect,
  width: number,
  height: number
) => {
  if (!settings.exif.enabled) return;

  const exif = getExif(photo, settings);
  const details = photo.details;
  const cameraText =
    settings.exif.cameraOverride ||
    [details?.cameraMake, details?.cameraModel].filter(Boolean).join(" ") ||
    normalizeCameraName(exif.camera);
  const parameterText =
    settings.exif.exposureOverride ||
    [details?.focalLength, details?.aperture, details?.shutter, details?.iso].filter(Boolean).join(" ") ||
    exif.exposure.replace(/\s*\|\s*/g, " ");

  const titleSize = Math.max(44, Math.min(180, imageRect.w * 0.04));
  const detailSize = Math.max(22, Math.min(72, imageRect.w * 0.018));
  const captionTop = imageRect.y + imageRect.h + Math.max(18, height * 0.014);
  const maxTextWidth = Math.min(imageRect.w * 0.96, width * 0.8);
  const textColor = settings.exif.textColor === "#111827" ? "#F5F7FA" : settings.exif.textColor || "#F5F7FA";
  const dateText = settings.exif.dateOverride || details?.capturedAt || exif.date;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = textColor;
  ctx.shadowColor = "rgba(0, 0, 0, .48)";
  ctx.shadowBlur = Math.max(10, height * 0.008);
  ctx.shadowOffsetY = Math.max(3, height * 0.002);
  ctx.font = `italic 800 ${titleSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillText(fitText(ctx, cameraText.toUpperCase(), maxTextWidth), width / 2, captionTop);
  ctx.font = `600 ${detailSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillText(
    fitText(ctx, parameterText, maxTextWidth * 0.86),
    width / 2,
    captionTop + titleSize + Math.max(10, height * 0.004)
  );
  if (dateText) {
    ctx.font = `600 ${detailSize * 0.92}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillText(
      fitText(ctx, dateText, maxTextWidth * 0.74),
      width / 2,
      captionTop + titleSize + detailSize + Math.max(18, height * 0.008)
    );
  }
  ctx.restore();
};

const renderBlurPoster = async (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  photo: PhotoItem,
  settings: FrameSettings,
  width: number,
  height: number
) => {
  const darken = ctx.createLinearGradient(0, 0, 0, height);
  darken.addColorStop(0, "rgba(0, 0, 0, .08)");
  darken.addColorStop(0.55, "rgba(0, 0, 0, .02)");
  darken.addColorStop(1, "rgba(0, 0, 0, .24)");
  ctx.fillStyle = darken;
  ctx.fillRect(0, 0, width, height);

  const borderWidth = settings.subject.borderEnabled ? settings.subject.borderWidth : 0;
  const landscape = width >= height;
  const captionHeight = settings.exif.enabled ? Math.round(clamp(height * (landscape ? 0.18 : 0.15), 140, 420)) : 0;
  const maxImageW = width * (landscape ? 0.86 : 0.84) - borderWidth * 2;
  const maxImageH = height * (landscape ? 0.82 : 0.76) - borderWidth * 2;
  const fit = contain(image.naturalWidth, image.naturalHeight, maxImageW, maxImageH);
  const upwardBias = Math.round(height * (landscape ? 0.035 : 0.026));
  const imageRect = {
    x: Math.round((width - fit.w) / 2),
    y: Math.round(Math.max(height * 0.055 + borderWidth, (height - fit.h - captionHeight) / 2 - upwardBias)),
    w: Math.round(fit.w),
    h: Math.round(fit.h)
  };
  const frameRect = {
    x: imageRect.x - borderWidth,
    y: imageRect.y - borderWidth,
    w: imageRect.w + borderWidth * 2,
    h: imageRect.h + borderWidth * 2
  };
  const radius = settings.subject.radius;

  ctx.save();
  if (settings.subject.shadowEnabled) {
    ctx.shadowColor = `rgba(0, 0, 0, ${clamp(settings.subject.shadowStrength, 0, 100) / 120})`;
    ctx.shadowBlur = settings.subject.shadowBlur;
    ctx.shadowOffsetY = Math.max(10, settings.subject.shadowStrength / 2);
  }
  ctx.fillStyle = settings.subject.borderEnabled ? settings.subject.borderColor : "rgba(0, 0, 0, .08)";
  roundedRect(ctx, frameRect, radius + borderWidth * 0.55);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundedRect(ctx, imageRect, radius);
  ctx.clip();
  ctx.drawImage(image, imageRect.x, imageRect.y, imageRect.w, imageRect.h);
  ctx.restore();

  const bottomShade = ctx.createLinearGradient(0, imageRect.y + imageRect.h * 0.72, 0, height);
  bottomShade.addColorStop(0, "rgba(0, 0, 0, 0)");
  bottomShade.addColorStop(1, "rgba(0, 0, 0, .42)");
  ctx.fillStyle = bottomShade;
  ctx.fillRect(0, imageRect.y + imageRect.h * 0.65, width, height - (imageRect.y + imageRect.h * 0.65));

  drawPosterText(ctx, photo, settings, imageRect, width, height);

  if (settings.logo.enabled) {
    await drawLogo(
      ctx,
      settings,
      photo,
      { x: 0, y: 0, w: width, h: height },
      {
        x: imageRect.x,
        y: imageRect.y + imageRect.h + Math.max(10, height * 0.018),
        w: imageRect.w,
        h: Math.max(54, height * 0.08)
      },
      {
        x: imageRect.x,
        y: imageRect.y + imageRect.h + Math.max(10, height * 0.018),
        w: imageRect.w,
        h: Math.max(54, height * 0.08)
      },
      null,
      settings.exif.textColor || "#F5F7FA"
    );
  }
};

const renderBottomBorder = async (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  photo: PhotoItem,
  settings: FrameSettings,
  width: number,
  height: number
) => {
  const marginX = Math.round(width * 0.075);
  const marginY = Math.round(height * 0.075);
  const borderWidth = settings.subject.borderEnabled ? settings.subject.borderWidth : 0;
  const captionHeight = settings.exif.enabled ? Math.round(clamp(height * 0.13, 90, 260)) : 0;
  const maxImageW = width - marginX * 2 - borderWidth * 2;
  const maxImageH = height - marginY * 2 - captionHeight - borderWidth * 2;
  const fit = contain(image.naturalWidth, image.naturalHeight, maxImageW, maxImageH);
  const imageRect = {
    x: Math.round((width - fit.w) / 2),
    y: Math.round(marginY + borderWidth),
    w: Math.round(fit.w),
    h: Math.round(fit.h)
  };
  const card = {
    x: imageRect.x - borderWidth,
    y: imageRect.y - borderWidth,
    w: imageRect.w + borderWidth * 2,
    h: imageRect.h + borderWidth * 2 + captionHeight
  };
  const radius = settings.subject.radius;
  const textColor = settings.exif.textColor || "#F5F7FA";

  ctx.save();
  if (settings.subject.shadowEnabled) {
    ctx.shadowColor = `rgba(0, 0, 0, ${clamp(settings.subject.shadowStrength, 0, 100) / 145})`;
    ctx.shadowBlur = settings.subject.shadowBlur;
    ctx.shadowOffsetY = Math.max(8, settings.subject.shadowStrength / 2);
  }
  ctx.fillStyle = settings.subject.borderEnabled ? settings.subject.borderColor : "rgba(0,0,0,.26)";
  roundedRect(ctx, card, radius + borderWidth * 0.45);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundedRect(ctx, imageRect, radius);
  ctx.clip();
  ctx.drawImage(image, imageRect.x, imageRect.y, imageRect.w, imageRect.h);
  ctx.restore();

  if (settings.exif.enabled) {
    const caption = {
      x: card.x,
      y: imageRect.y + imageRect.h + borderWidth,
      w: card.w,
      h: captionHeight
    };
    drawExif(ctx, photo, settings, caption, textColor);
    await drawLogo(ctx, settings, photo, { x: 0, y: 0, w: width, h: height }, card, caption, caption, textColor);
  }
};

export const renderPhotoToCanvas = async (photo: PhotoItem, settings: FrameSettings) => {
  const image = await loadImageElement(photo.dataUrl);
  const { width, height } = getOutputSize(photo);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("当前浏览器不支持 Canvas。");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  drawBackground(ctx, image, settings, width, height);

  if ((settings.layout ?? "blur-poster") === "blur-poster") {
    await renderBlurPoster(ctx, image, photo, settings, width, height);
    return canvas;
  }

  if (settings.layout === "bottom-border") {
    await renderBottomBorder(ctx, image, photo, settings, width, height);
    return canvas;
  }

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

  await drawLogo(ctx, settings, photo, { x: 0, y: 0, w: width, h: height }, card, imageRect, infoRect, textColor);

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
  return `${base}_frame.${ext}`;
};
