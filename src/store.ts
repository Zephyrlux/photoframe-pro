import { create } from "zustand";
import { persist } from "zustand/middleware";
import { builtInTemplates, defaultSettings } from "./config";
import type {
  DeepPartial,
  ExportProgress,
  FrameSettings,
  FrameTemplate,
  PhotoItem,
  PhotoStatus
} from "./types";

const mergeDeep = <T extends Record<string, unknown>>(base: T, patch: DeepPartial<T>): T => {
  const output: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof output[key] === "object" &&
      output[key] !== null
    ) {
      output[key] = mergeDeep(output[key] as Record<string, unknown>, value as DeepPartial<Record<string, unknown>>);
    } else if (value !== undefined) {
      output[key] = value;
    }
  }
  return output as T;
};

interface AppStore {
  photos: PhotoItem[];
  selectedId?: string;
  settings: FrameSettings;
  exportProgress: ExportProgress;
  addPhotos: (photos: PhotoItem[]) => void;
  clearPhotos: () => void;
  selectPhoto: (id: string) => void;
  setPhotoStatus: (id: string, status: PhotoStatus) => void;
  setAllPhotoStatus: (status: PhotoStatus) => void;
  updateSettings: (patch: DeepPartial<FrameSettings>) => void;
  applyTemplate: (template: FrameTemplate) => void;
  setExportProgress: (progress: Partial<ExportProgress>) => void;
}

const initialProgress: ExportProgress = {
  active: false,
  done: 0,
  total: 0,
  message: ""
};

type PersistedAppState = {
  settings: FrameSettings;
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      photos: [],
      selectedId: undefined,
      settings: defaultSettings,
      exportProgress: initialProgress,
      addPhotos: (incoming) =>
        set((state) => {
          const existing = new Set(state.photos.map((photo) => `${photo.name}:${photo.width}x${photo.height}`));
          const unique = incoming.filter((photo) => !existing.has(`${photo.name}:${photo.width}x${photo.height}`));
          return {
            photos: [...state.photos, ...unique],
            selectedId: state.selectedId ?? unique[0]?.id ?? state.photos[0]?.id
          };
        }),
      clearPhotos: () => set({ photos: [], selectedId: undefined }),
      selectPhoto: (id) => set({ selectedId: id }),
      setPhotoStatus: (id, status) =>
        set((state) => ({
          photos: state.photos.map((photo) => (photo.id === id ? { ...photo, status } : photo))
        })),
      setAllPhotoStatus: (status) =>
        set((state) => ({
          photos: state.photos.map((photo) => ({ ...photo, status }))
        })),
      updateSettings: (patch) =>
        set((state) => ({
          settings: mergeDeep(
            state.settings as unknown as Record<string, unknown>,
            patch as DeepPartial<Record<string, unknown>>
          ) as unknown as FrameSettings
        })),
      applyTemplate: (template) =>
        set({
          settings: mergeDeep(
            get().settings as unknown as Record<string, unknown>,
            template.settings as unknown as DeepPartial<Record<string, unknown>>
          ) as unknown as FrameSettings
        }),
      setExportProgress: (progress) =>
        set((state) => ({
          exportProgress: { ...state.exportProgress, ...progress }
        }))
    }),
    {
      name: "photoframe-pro-settings",
      version: 4,
      migrate: (persisted, version) => {
        const saved = persisted as Partial<PersistedAppState> | undefined;
        const settings = mergeDeep(
          defaultSettings as unknown as Record<string, unknown>,
          (saved?.settings ?? {}) as unknown as DeepPartial<Record<string, unknown>>
        ) as unknown as FrameSettings;

        if (version < 2) {
          settings.layout = settings.layout ?? "blur-poster";
          settings.exif = {
            ...settings.exif,
            textColor: "#F5F7FA",
            dividerColor: "rgba(255,255,255,.26)"
          };
        }

        if (version < 3) {
          settings.logo = { ...settings.logo, enabled: true };
          if (settings.layout === "blur-poster") {
            settings.exif = {
              ...settings.exif,
              textColor: "#F5F7FA",
              dividerColor: "rgba(255,255,255,.26)"
            };
          }
        }

        if (version < 4 && settings.layout === "blur-poster") {
          settings.background = { ...settings.background, mode: "blur", blur: 48, brightness: -14, opacity: 100 };
          settings.subject = {
            ...settings.subject,
            borderEnabled: false,
            borderWidth: 0,
            radius: 18,
            shadowEnabled: true,
            shadowStrength: 46,
            shadowBlur: 36
          };
          settings.logo = { ...settings.logo, enabled: false, size: 90, opacity: 92 };
          settings.exif = {
            ...settings.exif,
            textColor: "#F5F7FA",
            dividerColor: "rgba(255,255,255,.26)"
          };
        }

        return {
          settings
        };
      },
      merge: (persisted, current) => {
        const saved = persisted as Partial<PersistedAppState> | undefined;
        return {
          ...current,
          settings: mergeDeep(
            defaultSettings as unknown as Record<string, unknown>,
            (saved?.settings ?? {}) as unknown as DeepPartial<Record<string, unknown>>
          ) as unknown as FrameSettings,
          photos: current.photos,
          selectedId: current.selectedId,
          exportProgress: current.exportProgress
        };
      },
      partialize: (state) => ({
        settings: state.settings
      })
    }
  )
);

export const allTemplates = () => builtInTemplates;
