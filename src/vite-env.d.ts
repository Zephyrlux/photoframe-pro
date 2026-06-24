/// <reference types="vite/client" />

export interface NativeImagePayload {
  name: string;
  path?: string;
  size?: number;
  modifiedAt?: string;
  dataUrl: string;
}

export interface NativeSavePayload {
  outputDirectory: string;
  files: Array<{ name: string; dataUrl: string }>;
}

declare global {
  interface Window {
    photoFrameAPI?: {
      selectImages: () => Promise<NativeImagePayload[]>;
      selectImageFolder: () => Promise<NativeImagePayload[]>;
      chooseOutputDirectory: () => Promise<string | null>;
      saveExports: (payload: NativeSavePayload) => Promise<{ saved: string[] }>;
      showInFolder: (filePath: string) => Promise<void>;
    };
  }
}
