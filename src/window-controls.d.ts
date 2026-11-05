export {};

declare global {
  interface Window {
    windowControls: {
      minimize: () => void;
      toggleMaximize: () => void;
      close: () => void;
    };
    desktopUpdater: {
      configure: (configuration: { signedIn: boolean }) => Promise<null>;
      onStatus: (callback: (status: {
        status: "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error";
        version?: string;
        percent?: number;
        message?: string;
      }) => void) => () => void;
    };
  }
}
