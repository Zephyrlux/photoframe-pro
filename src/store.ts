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
  savedTemplates: FrameTemplate[];
  exportProgress: ExportProgress;
  addPhotos: (photos: PhotoItem[]) => void;
  clearPhotos: () => void;
  selectPhoto: (id: string) => void;
  setPhotoStatus: (id: string, status: PhotoStatus) => void;
  setAllPhotoStatus: (status: PhotoStatus) => void;
  updateSettings: (patch: DeepPartial<FrameSettings>) => void;
  applyTemplate: (template: FrameTemplate) => void;
  saveCurrentTemplate: (name: string) => void;
  deleteTemplate: (id: string) => void;
  importTemplates: (templates: FrameTemplate[]) => void;
  setExportProgress: (progress: Partial<ExportProgress>) => void;
}

const initialProgress: ExportProgress = {
  active: false,
  done: 0,
  total: 0,
  message: ""
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      photos: [],
      selectedId: undefined,
      settings: defaultSettings,
      savedTemplates: [],
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
      saveCurrentTemplate: (name) =>
        set((state) => {
          const trimmed = name.trim();
          if (!trimmed) return state;
          const template: FrameTemplate = {
            id: `template-${Date.now()}`,
            name: trimmed,
            description: "用户保存的当前参数组合。",
            settings: state.settings
          };
          return { savedTemplates: [...state.savedTemplates, template] };
        }),
      deleteTemplate: (id) =>
        set((state) => ({
          savedTemplates: state.savedTemplates.filter((template) => template.id !== id)
        })),
      importTemplates: (templates) =>
        set((state) => ({
          savedTemplates: [
            ...state.savedTemplates,
            ...templates.filter((template) => template.id && template.name && template.settings)
          ]
        })),
      setExportProgress: (progress) =>
        set((state) => ({
          exportProgress: { ...state.exportProgress, ...progress }
        }))
    }),
    {
      name: "photoframe-pro-settings",
      partialize: (state) => ({
        settings: state.settings,
        savedTemplates: state.savedTemplates
      })
    }
  )
);

export const allTemplates = (savedTemplates: FrameTemplate[]) => [
  ...builtInTemplates,
  ...savedTemplates
];
