export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes?: string;
}

export interface IAutoUpdateService {
  checkForUpdates(): Promise<UpdateInfo | null>;
  downloadUpdate(): Promise<void>;
  installUpdate(): Promise<void>;
  getCurrentVersion(): string;
  onUpdateAvailable(callback: (info: UpdateInfo) => void): void;
  onUpdateDownloaded(callback: () => void): void;
  onUpdateError(callback: (error: Error) => void): void;
}


