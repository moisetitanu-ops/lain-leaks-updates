import { useCallback, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ChevronRight,
  Bot,
  Construction,
  Crown,
  Copy,
  Download,
  FileCode2,
  Gem,
  Globe2,
  Keyboard,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  Minus,
  NotebookPen,
  PackageOpen,
  ScrollText,
  SlidersHorizontal,
  Square,
  UserRound,
  Wrench,
  Unplug,
  X,
} from "lucide-react";
import { supabase, supabaseConfigurationError } from "./supabase";

type DesktopUpdateStatus = Parameters<Parameters<typeof window.desktopUpdater.onStatus>[0]>[0];

const navigation = [
  { label: "Cords", icon: Unplug },
  { label: "Selfbots", icon: Bot },
  { label: "Macros", icon: Keyboard },
  { label: "Notepads", icon: NotebookPen },
  { label: "Presets", icon: SlidersHorizontal },
  { label: "Badge Maximizer", icon: Gem },
  { label: "Update Logs", icon: ScrollText },
  { label: "Access Keys", icon: KeyRound },
] as const;

type Page = (typeof navigation)[number]["label"];

type CordCategory = "premium" | "free";
type DownloadCategory = "cords" | "macros" | "selfbots" | "bots" | "notepads" | "presets" | "badge-maximizer";
type DownloadFile = {
  id: string;
  title: string;
  description: string;
  category: DownloadCategory;
  filename: string;
  storage_path: string;
  access_level: CordCategory;
  variant: string | null;
  created_at: string;
};
type RegistrationKeyRecord = {
  key_id: string;
  key_name: string;
  created_at: string;
  expires_at: string;
  redeemed_at: string | null;
  revoked_at: string | null;
};
type RegistrationKeyDuration = "24h" | "7d" | "30d" | "365d";

let clickAudioContext: AudioContext | null = null;

function playClickSound() {
  const AudioContextConstructor = window.AudioContext;
  if (!AudioContextConstructor) return;

  clickAudioContext ??= new AudioContextConstructor();
  const context = clickAudioContext;
  if (context.state === "suspended") void context.resume();

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(620, now);
  oscillator.frequency.exponentialRampToValueAtTime(430, now + 0.045);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.06);
  oscillator.addEventListener("ended", () => {
    oscillator.disconnect();
    gain.disconnect();
  }, { once: true });
}

function WindowTitlebar() {
  return (
    <header className="window-titlebar">
      <div className="window-drag-region" onDoubleClick={() => window.windowControls.toggleMaximize()}>
      </div>
      <div className="titlebar-brand" aria-label="Lain Leaks">
        <span>Lain</span> <strong>LEAKS</strong>
      </div>
      <div className="window-controls">
        <button className="window-control" aria-label="Minimize" onClick={() => window.windowControls.minimize()}>
          <Minus size={13} strokeWidth={1.5} />
        </button>
        <button className="window-control" aria-label="Maximize or restore" onClick={() => window.windowControls.toggleMaximize()}>
          <Square size={11} strokeWidth={1.4} />
        </button>
        <button className="window-control close-control" aria-label="Close" onClick={() => window.windowControls.close()}>
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}

function Sidebar({
  activePage,
  onNavigate,
  email,
  isAdmin,
  onSignOut,
  signOutError,
}: {
  activePage: Page;
  onNavigate: (page: Page) => void;
  email: string;
  isAdmin: boolean;
  onSignOut: () => void;
  signOutError: string | null;
}) {
  const visibleNavigation = navigation.filter(({ label }) => label !== "Access Keys" || isAdmin);

  return (
    <aside className="sidebar">
      <div className="workspace-title"><span><Wrench size={13} strokeWidth={1.8} aria-hidden="true" /> TOOLS</span><small>{String(visibleNavigation.length).padStart(2, "0")}</small></div>
      <nav className="nav-list" aria-label="Main navigation">
        {visibleNavigation.map(({ label, icon: Icon }) => (
          <button
            className={`nav-item ${activePage === label ? "selected" : ""}`}
            key={label}
            onClick={() => onNavigate(label)}
            aria-current={activePage === label ? "page" : undefined}
          >
            <Icon size={17} strokeWidth={1.7} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-account">
          <span title={email}>{email}</span>
          <button type="button" onClick={onSignOut} aria-label="Sign out">
            <LogOut size={14} />
            <span>Sign out</span>
          </button>
          {signOutError && <p role="alert">{signOutError}</p>}
        </div>
        <div className="sidebar-divider" />
        <div className="community-links">
          <a href="https://discord.gg/beefro" target="_blank" rel="noreferrer" className="community-link">
            <DiscordIcon />
            <span>discord.gg/beefro</span>
          </a>
          <a href="https://chatpacking.baby" target="_blank" rel="noreferrer" className="community-link">
            <Globe2 size={16} strokeWidth={1.7} />
            <span>chatpacking.baby</span>
          </a>
        </div>
      </div>
    </aside>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<DesktopUpdateStatus | null>(null);

  useEffect(() => {
    function handleUiClick(event: MouseEvent) {
      if (!event.isTrusted || !(event.target instanceof Element)) return;
      if (event.target.closest("button, a[href], input, select, [role='button'], [role='tab']")) {
        playClickSound();
      }
    }

    document.addEventListener("click", handleUiClick);
    return () => document.removeEventListener("click", handleUiClick);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
      setAuthError(null);
    });

    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) setAuthError(error.message);
        setSession(data.session);
        setAuthLoading(false);
      })
      .catch((error: unknown) => {
        setAuthError(error instanceof Error ? error.message : "Unable to restore the saved session.");
        setAuthLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => window.desktopUpdater.onStatus(setUpdateStatus), []);

  useEffect(() => {
    void window.desktopUpdater.configure({
      signedIn: Boolean(session),
    }).catch((error: unknown) => {
      setUpdateStatus({
        status: "error",
        message: error instanceof Error ? error.message : "Unable to configure app updates.",
      });
    });
  }, [session]);

  if (authLoading) {
    return (
      <main className="app-shell">
        <WindowTitlebar />
        <UpdateNotice status={updateStatus} />
        <div className="auth-layout">
          <div className="auth-main"><LoaderCircle className="auth-loading-icon" size={24} /></div>
        </div>
      </main>
    );
  }

  if (!session) {
    return <AuthScreen initialError={authError} updateStatus={updateStatus} />;
  }

  return (
    <>
      <UpdateNotice status={updateStatus} />
      <Workspace session={session} />
    </>
  );
}

function UpdateNotice({ status }: { status: DesktopUpdateStatus | null }) {
  if (!status || status.status === "not-available") return null;

  const text = status.status === "checking"
    ? "Checking for app updates..."
    : status.status === "available"
      ? `Update ${status.version ?? ""} found. Downloading...`
      : status.status === "downloading"
        ? `Downloading app update... ${Math.floor(status.percent ?? 0)}%`
        : status.status === "downloaded"
          ? `Update ${status.version ?? ""} is ready and will install when you close the app.`
          : `Unable to update the app: ${status.message ?? "Please try again later."}`;

  return (
    <div className={`update-notice ${status.status === "error" ? "update-notice-error" : ""}`} role={status.status === "error" ? "alert" : "status"}>
      {text}
    </div>
  );
}

function AuthScreen({ initialError, updateStatus }: { initialError: string | null; updateStatus: DesktopUpdateStatus | null }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [registrationKey, setRegistrationKey] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setBusy(true);
    setError(null);
    setMessage("");

    try {
      if (mode === "register") {
        const { data: keyStatus, error: keyValidationError } = await supabase.rpc("validate_registration_key", {
          p_key: registrationKey.trim(),
        });
        if (keyValidationError) throw keyValidationError;
        if (typeof keyStatus !== "string") {
          throw new Error("Unable to validate the registration key. Please try again.");
        }
        if (keyStatus !== "valid") {
          const keyErrors: Record<string, string> = {
            invalid: "Your key is invalid.",
            expired: "Your key has expired.",
            revoked: "Your key has been revoked.",
          };
          throw new Error(keyErrors[keyStatus] ?? "Unable to validate the registration key. Please try again.");
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { username: username.trim(), registration_key: registrationKey.trim() } },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setMessage("Check your email to confirm your account, then sign in.");
        } else {
          setMessage("Your account is ready.");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <WindowTitlebar />
      <UpdateNotice status={updateStatus} />
      <div className="auth-layout">
        <div className="auth-main">
          <section className="auth-card" aria-labelledby="auth-title">
            <div className="auth-branding">
              <span className="auth-brand-name">lain <span>leaks</span></span>
            </div>
            <header className="auth-heading">
              <h2 id="auth-title">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
              <p className="auth-description">Sign in to acces Lain Leaks.</p>
            </header>

            {supabaseConfigurationError ? (
              <p className="auth-message" role="alert">{supabaseConfigurationError}</p>
            ) : (
              <>
                <div className="auth-tabs" data-mode={mode}>
                  <button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(null); setMessage(""); }}>
                    Sign in
                  </button>
                  <button type="button" className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(null); setMessage(""); }}>
                    Register
                  </button>
                </div>

                <form className={`auth-form ${mode === "login" ? "login-form" : "register-form"}`} onSubmit={submit}>
                  {mode === "register" && (
                    <>
                      <label className="auth-field">
                        Username
                        <span className="auth-input-wrap">
                          <UserRound size={15} aria-hidden="true" />
                          <input
                            autoComplete="username"
                            required
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            placeholder="Your username"
                          />
                        </span>
                      </label>
                      <label className="auth-field">
                        Registration key
                        <span className="auth-input-wrap">
                          <KeyRound size={15} aria-hidden="true" />
                          <input
                            autoComplete="off"
                            autoCapitalize="none"
                            spellCheck={false}
                            required
                            value={registrationKey}
                            onChange={(event) => setRegistrationKey(event.target.value)}
                            placeholder="Enter your one-time key"
                          />
                        </span>
                      </label>
                    </>
                  )}
                  <label className="auth-field">
                    Email
                    <span className="auth-input-wrap">
                      <Mail size={15} aria-hidden="true" />
                      <input
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                      />
                    </span>
                  </label>
                  <label className="auth-field">
                    Password
                    <span className="auth-input-wrap">
                      <LockKeyhole size={15} aria-hidden="true" />
                      <input
                        type="password"
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        required
                        minLength={8}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="At least 8 characters"
                      />
                    </span>
                  </label>
                  {error && <p className="auth-message" role="alert">{error}</p>}
                  {message && <p className="auth-success" role="status">{message}</p>}
                  <button className="auth-submit" type="submit" disabled={busy}>
                    {busy && <LoaderCircle size={14} className="auth-submit-spinner" />}
                    {busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function Workspace({ session }: { session: Session }) {
  const [activePage, setActivePage] = useState<Page>("Cords");
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [downloads, setDownloads] = useState<DownloadFile[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const activeTool = navigation.find((tool) => tool.label === activePage);
  const ActiveIcon = activeTool?.icon ?? Construction;
  const isAdmin = session.user.app_metadata.role === "admin";

  const loadCatalog = useCallback(async () => {
    if (!supabase) {
      setCatalogError(supabaseConfigurationError ?? "Supabase is not configured.");
      setCatalogLoading(false);
      return;
    }

    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const { data, error } = await supabase
  .from("download_files")
  .select("id, title, description, category, filename, storage_path, access_level, variant, created_at")
  .order("created_at", { ascending: false });
      if (error) throw error;
      setDownloads(data ?? []);
    } catch (error: unknown) {
      setCatalogError(error instanceof Error ? error.message : "Unable to load the download catalog.");
      setDownloads([]);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  async function downloadFile(file: DownloadFile) {
    if (!supabase) return;
    setDownloadingId(file.id);
    setDownloadError(null);

    try {
      const { data, error } = await supabase.storage
        .from("downloads")
        .createSignedUrl(file.storage_path, 60, { download: file.filename });
      if (error) throw error;

      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = file.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: unknown) {
      setDownloadError(error instanceof Error ? error.message : `Unable to download ${file.filename}.`);
    } finally {
      setDownloadingId(null);
    }
  }

  async function signOut() {
    if (!supabase) return;
    setSignOutError(null);
    const { error } = await supabase.auth.signOut();
    if (error) setSignOutError(error.message);
  }

  return (
    <main className="app-shell">
      <WindowTitlebar />
      <div className="app-body">
        <Sidebar
          activePage={activePage}
          onNavigate={setActivePage}
          email={session.user.email ?? "Signed in"}
          isAdmin={isAdmin}
          onSignOut={() => { void signOut(); }}
          signOutError={signOutError}
        />
        <section className="content" aria-live="polite" key={activePage}>
          <header className="content-topbar">
            <div className="content-breadcrumb">
              <span>TOOLS</span>
              <ChevronRight size={13} />
              <strong>{activePage.toUpperCase()}</strong>
            </div>
          </header>
          <div className="workspace-stage">
            <div className="workspace-atmosphere" aria-hidden="true" />
            {downloadError && <p className="catalog-feedback" role="alert">{downloadError}</p>}
            {activePage === "Cords" ? (
              <CordLibrary
                downloads={downloads.filter((file) => file.category === "cords")}
                loading={catalogLoading}
                error={catalogError}
                onRetry={() => { void loadCatalog(); }}
                onDownload={(file) => { void downloadFile(file); }}
                downloadingId={downloadingId}
              />
            ) : activePage === "Selfbots" ? (
              <DownloadLibrary
                heading={<>Browse <span>selfbots.</span></>}
                description="Use them at your own risk."
                icon={<Bot size={21} strokeWidth={1.6} />}
                downloads={downloads.filter((file) => file.category === "selfbots")}
                loading={catalogLoading}
                error={catalogError}
                onRetry={() => { void loadCatalog(); }}
                onDownload={(file) => { void downloadFile(file); }}
                downloadingId={downloadingId}
              />
            ) : activePage === "Macros" ? (
              <DownloadLibrary
                heading={<>Browse <span>macros.</span></>}
                description="Python scripts and utilities."
                icon={<FileCode2 size={21} strokeWidth={1.6} />}
                downloads={downloads.filter((file) => file.category === "macros")}
                loading={catalogLoading}
                error={catalogError}
                onRetry={() => { void loadCatalog(); }}
                onDownload={(file) => { void downloadFile(file); }}
                downloadingId={downloadingId}
              />
            ) : activePage === "Notepads" ? (
              <DownloadLibrary
                heading={<>Browse <span>notepads.</span></>}
                description="Notepad files and templates."
                icon={<NotebookPen size={21} strokeWidth={1.6} />}
                downloads={downloads.filter((file) => file.category === "notepads")}
                loading={catalogLoading}
                error={catalogError}
                onRetry={() => { void loadCatalog(); }}
                onDownload={(file) => { void downloadFile(file); }}
                downloadingId={downloadingId}
              />
            ) : activePage === "Presets" ? (
              <DownloadLibrary
                heading={<>Browse <span>presets.</span></>}
                description="Preset files for discord chatpacking."
                icon={<SlidersHorizontal size={21} strokeWidth={1.6} />}
                downloads={downloads.filter((file) => file.category === "presets")}
                loading={catalogLoading}
                error={catalogError}
                onRetry={() => { void loadCatalog(); }}
                onDownload={(file) => { void downloadFile(file); }}
                downloadingId={downloadingId}
              />
            ) : activePage === "Badge Maximizer" ? (
              <DownloadLibrary
                heading={<>Badge <span>Maximizer.</span></>}
                icon={<Gem size={21} strokeWidth={1.6} />}
                downloads={downloads.filter((file) => file.category === "badge-maximizer")}
                loading={catalogLoading}
                error={catalogError}
                onRetry={() => { void loadCatalog(); }}
                onDownload={(file) => { void downloadFile(file); }}
                downloadingId={downloadingId}
              />
            ) : activePage === "Update Logs" ? (
              <UpdateLogLibrary
                downloads={downloads}
                loading={catalogLoading}
                error={catalogError}
                onRetry={() => { void loadCatalog(); }}
              />
            ) : activePage === "Access Keys" && isAdmin ? (
              <RegistrationKeyManagement />
            ) : (
              <>
                <span className="workspace-watermark" aria-hidden="true"><ActiveIcon size={220} strokeWidth={0.65} /></span>
                <article className="construction-card">
                  <div className="construction-art" aria-hidden="true">
                    <span className="construction-icon"><ActiveIcon size={29} strokeWidth={1.55} /></span>
                  </div>
                  <p className="construction-eyebrow">PAGE IN DEVELOPMENT</p>
                  <h1>{activePage} <span>is taking shape rn</span></h1>
                </article>
              </>
            )}
            <footer className="workspace-footer">
              <span>LAIN LEAKS</span>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}

function CordLibrary({
  downloads,
  loading,
  error,
  onRetry,
  onDownload,
  downloadingId,
}: {
  downloads: DownloadFile[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onDownload: (file: DownloadFile) => void;
  downloadingId: string | null;
}) {
  const groupedDownloads = Array.from(
    downloads.reduce((groups, file) => {
      const group = groups.get(file.title) ?? [];
      group.push(file);
      groups.set(file.title, group);
      return groups;
    }, new Map<string, DownloadFile[]>()),
  );

  return (
    <section className="cord-library" aria-label="Cord downloads">
      <header className="cord-library-header">
        <div>
          <h1>Find your next <span>cord.</span></h1>
          <p className="cord-library-description">Custom cords, get what you like</p>
        </div>
      </header>

      {loading ? (
        <p className="catalog-status" role="status"><LoaderCircle size={15} /> Loading files...</p>
      ) : error ? (
        <CatalogError error={error} onRetry={onRetry} />
      ) : groupedDownloads.length > 0 ? (
        <div className="cord-download-list">
          {groupedDownloads.map(([title, files]) => {
            return (
              <article className="cord-download-card" key={title}>
                <span className="cord-download-icon"><PackageOpen size={21} strokeWidth={1.6} /></span>
                <div className="cord-download-details">
                  <h2>{title}</h2>
                </div>
                <div className="cord-download-actions">
                  {files.map((file) => (
                    <DownloadButton
                      key={file.id}
                      file={file}
                      label={file.variant ?? file.filename}
                      onDownload={onDownload}
                      downloadingId={downloadingId}
                    />
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="cord-empty-state">
          <span className="cord-empty-icon"><PackageOpen size={23} strokeWidth={1.5} /></span>
          <p className="cord-empty-label">CORD LIBRARY</p>
          <h2>Nothing here just yet.</h2>
          <p>Cord downloads will show up here once they’re added.</p>
        </div>
      )}
    </section>
  );
}

function DownloadLibrary({
  heading,
  description,
  icon,
  downloads,
  loading,
  error,
  onRetry,
  onDownload,
  downloadingId,
}: {
  heading: ReactNode;
  description?: string;
  icon: ReactNode;
  downloads: DownloadFile[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onDownload: (file: DownloadFile) => void;
  downloadingId: string | null;
}) {
  return (
    <section className="cord-library" aria-label="File downloads">
      <header className="cord-library-header">
        <div>
          <h1>{heading}</h1>
          {description && <p className="cord-library-description">{description}</p>}
        </div>
      </header>

      <DownloadList
        downloads={downloads}
        loading={loading}
        error={error}
        onRetry={onRetry}
        onDownload={onDownload}
        downloadingId={downloadingId}
        icon={icon}
      />
    </section>
  );
}

function DownloadList({
  downloads,
  loading,
  error,
  onRetry,
  onDownload,
  downloadingId,
  icon,
}: {
  downloads: DownloadFile[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onDownload: (file: DownloadFile) => void;
  downloadingId: string | null;
  icon: ReactNode;
}) {
  if (loading) return <p className="catalog-status" role="status"><LoaderCircle size={15} /> Loading files...</p>;
  if (error) return <CatalogError error={error} onRetry={onRetry} />;
  if (downloads.length === 0) {
    return (
      <div className="cord-empty-state">
        <span className="cord-empty-icon">{icon}</span>
        <p className="cord-empty-label">DOWNLOAD LIBRARY</p>
        <h2>Nothing here just yet.</h2>
        <p>Files will appear here after they are added to the Supabase catalog.</p>
      </div>
    );
  }

  return (
    <div className="cord-download-list">
      {downloads.map((file) => (
        <article className="cord-download-card macro-download-card" key={file.id}>
          <span className="cord-download-icon">{icon}</span>
          <div className="cord-download-details">
            {file.access_level === "premium" && (
              <div className="cord-download-meta"><span className="cord-download-badge"><Crown size={11} /> PREMIUM</span></div>
            )}
            <h2>{file.title}</h2>
          </div>
          <DownloadButton file={file} onDownload={onDownload} downloadingId={downloadingId} />
        </article>
      ))}
    </div>
  );
}

function DownloadButton({
  file,
  label = "Download",
  onDownload,
  downloadingId,
}: {
  file: DownloadFile;
  label?: string;
  onDownload: (file: DownloadFile) => void;
  downloadingId: string | null;
}) {
  const busy = downloadingId === file.id;
  return (
    <button
      className="cord-download-button cord-download-compact"
      type="button"
      disabled={downloadingId !== null}
      onClick={() => onDownload(file)}
      aria-label={`Download ${file.filename}`}
    >
      {busy ? <LoaderCircle size={14} className="auth-submit-spinner" /> : <Download size={14} />}
      <span>{busy ? "Downloading..." : label}</span>
    </button>
  );
}

function CatalogError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="cord-empty-state" role="alert">
      <p className="catalog-error-title">Could not load the catalog</p>
      <p>{error}</p>
      <button className="cord-download-button cord-download-compact" type="button" onClick={onRetry}>Try again</button>
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseRegistrationKeyRows(value: unknown): RegistrationKeyRecord[] {
  if (!Array.isArray(value)) throw new Error("The registration key list returned an unexpected response.");

  return value.map((row): RegistrationKeyRecord => {
    if (
      !isRecord(row)
      || typeof row.key_id !== "string"
      || typeof row.key_name !== "string"
      || typeof row.created_at !== "string"
      || typeof row.expires_at !== "string"
      || !(typeof row.redeemed_at === "string" || row.redeemed_at === null)
      || !(typeof row.revoked_at === "string" || row.revoked_at === null)
    ) {
      throw new Error("The registration key list contains an invalid entry.");
    }

    return {
      key_id: row.key_id,
      key_name: row.key_name,
      created_at: row.created_at,
      expires_at: row.expires_at,
      redeemed_at: row.redeemed_at,
      revoked_at: row.revoked_at,
    };
  });
}

function formatTimeRemaining(expiresAt: string, now: number): string {
  const remainingMilliseconds = new Date(expiresAt).getTime() - now;
  if (!Number.isFinite(remainingMilliseconds) || remainingMilliseconds <= 0) return "Expired";

  const totalMinutes = Math.ceil(remainingMilliseconds / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

function RegistrationKeyManagement() {
  const [keyName, setKeyName] = useState("");
  const [duration, setDuration] = useState<RegistrationKeyDuration>("24h");
  const [keys, setKeys] = useState<RegistrationKeyRecord[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    if (!supabase) {
      setError(supabaseConfigurationError ?? "Supabase is not configured.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: listError } = await supabase.rpc("admin_list_registration_keys");
      if (listError) throw listError;
      setKeys(parseRegistrationKeyRows(data));
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load registration keys.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  async function createKey() {
    if (!supabase || !keyName.trim()) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    setNewKey(null);
    try {
      const { data, error: createError } = await supabase.rpc("admin_create_registration_key", {
        p_name: keyName.trim(),
        p_duration: duration,
      });
      if (createError) throw createError;
      if (typeof data !== "string") throw new Error("Supabase returned an invalid registration key.");
      setNewKey(data);
      setKeyName("");
      setMessage("Key created. Copy it now; it will not be shown again.");
      await loadKeys();
    } catch (createError: unknown) {
      setError(createError instanceof Error ? createError.message : "Unable to create the registration key.");
    } finally {
      setBusy(false);
    }
  }

  async function copyKey() {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setMessage("Registration key copied.");
    } catch (copyError: unknown) {
      setError(copyError instanceof Error ? copyError.message : "Clipboard access failed. Select and copy the key manually.");
    }
  }

  async function revokeKey(keyId: string) {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const { error: revokeError } = await supabase.rpc("admin_revoke_registration_key", {
        p_key_id: keyId,
      });
      if (revokeError) throw revokeError;
      setMessage("Registration key revoked.");
      await loadKeys();
    } catch (revokeError: unknown) {
      setError(revokeError instanceof Error ? revokeError.message : "Unable to revoke the registration key.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="cord-library key-management" aria-label="Registration key management">
      <header className="cord-library-header">
        <div>
          <h1>Access <span>keys.</span></h1>
          <p className="cord-library-description">Create one-time registration keys for invited users.</p>
        </div>
      </header>

      <div className="key-management-card">
        <div className="key-management-form">
          <label className="auth-field" htmlFor="key-name">
            Key name
            <input
              id="key-name"
              className="key-name-input"
              value={keyName}
              onChange={(event) => setKeyName(event.target.value)}
              placeholder="For example: Creator invite"
              maxLength={80}
              required
            />
          </label>
          <label className="auth-field" htmlFor="key-duration">
            Key expires after
            <select
              id="key-duration"
              className="key-duration-select"
              value={duration}
              onChange={(event) => setDuration(event.target.value as RegistrationKeyDuration)}
            >
              <option value="24h">24 hours</option>
              <option value="7d">7 days</option>
              <option value="30d">1 month (30 days)</option>
              <option value="365d">1 year (365 days)</option>
            </select>
          </label>
          <button className="auth-submit key-create-button" type="button" disabled={busy || !keyName.trim()} onClick={() => { void createKey(); }}>
            {busy && <LoaderCircle size={14} className="auth-submit-spinner" />}
            {busy ? "Please wait..." : "Generate key"}
          </button>
        </div>

        {newKey && (
          <div className="key-created-panel">
            <label className="auth-field" htmlFor="created-registration-key">New key — shown only once</label>
            <div className="key-created-row">
              <input id="created-registration-key" value={newKey} readOnly onFocus={(event) => event.currentTarget.select()} />
              <button className="cord-download-button cord-download-compact" type="button" onClick={() => { void copyKey(); }}>
                <Copy size={14} />
                <span>Copy</span>
              </button>
            </div>
          </div>
        )}

        {error && <p className="auth-message key-feedback" role="alert">{error}</p>}
        {message && <p className="auth-success key-feedback" role="status">{message}</p>}
      </div>

      <div className="key-list-heading">
        <h2>Recent keys</h2>
        <button className="key-refresh-button" type="button" disabled={loading || busy} onClick={() => { void loadKeys(); }}>
          {loading ? <LoaderCircle size={13} className="auth-submit-spinner" /> : "Refresh"}
        </button>
      </div>

      {loading ? (
        <p className="catalog-status" role="status"><LoaderCircle size={15} /> Loading keys...</p>
      ) : keys.length === 0 ? (
        <div className="cord-empty-state key-empty-state"><h2>No keys created yet.</h2></div>
      ) : (
        <div className="key-list">
          {keys.map((key) => {
            const expired = new Date(key.expires_at).getTime() <= now;
            const status = key.revoked_at ? "Revoked" : key.redeemed_at ? "Used" : expired ? "Expired" : "Active";
            return (
              <article className="key-list-item" key={key.key_id}>
                <div>
                  <h3>{key.key_name}</h3>
                  <strong>{status}</strong>
                  {key.redeemed_at && <span>Used at {new Date(key.redeemed_at).toLocaleString()}</span>}
                  <span>
                    Expires {new Date(key.expires_at).toLocaleString()}
                    {!expired && ` · ${formatTimeRemaining(key.expires_at, now)}`}
                  </span>
                </div>
                {!key.redeemed_at && !key.revoked_at && !expired && (
                  <button className="key-revoke-button" type="button" disabled={busy} onClick={() => { void revokeKey(key.key_id); }}>
                    Revoke
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function UpdateLogLibrary({
  downloads,
  loading,
  error,
  onRetry,
}: {
  downloads: DownloadFile[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const categoryLabels: Record<DownloadCategory, string> = {
    cords: "CORDS",
    macros: "MACROS",
    selfbots: "SELFBOTS",
    bots: "SELFBOTS",
    notepads: "NOTEPADS",
    presets: "PRESETS",
    "badge-maximizer": "BADGE MAXIMIZER",
  };
  const updates = Array.from(downloads.reduce((days, file) => {
    const date = new Date(file.created_at).toISOString().slice(0, 10);
    const releases = days.get(date) ?? new Map<DownloadCategory, DownloadFile[]>();
    const categoryFiles = releases.get(file.category) ?? [];
    categoryFiles.push(file);
    releases.set(file.category, categoryFiles);
    days.set(date, releases);
    return days;
  }, new Map<string, Map<DownloadCategory, DownloadFile[]>>()));

  return (
    <section className="cord-library update-log-library" aria-label="Update logs">
      <header className="cord-library-header update-log-header">
        <div>
          <p className="update-log-eyebrow">THE ARCHIVE</p>
          <h1>Update <span>logs.</span></h1>
          <p className="cord-library-description">Stay up to date with the latest changes, new leaks, improvements, and bug fixes.</p>
        </div>
      </header>

      {loading ? <p className="catalog-status" role="status"><LoaderCircle size={15} /> Loading updates...</p> : error ? (
        <CatalogError error={error} onRetry={onRetry} />
      ) : updates.length === 0 ? (
        <div className="cord-empty-state update-log-empty">
          <span className="cord-empty-icon"><ScrollText size={23} strokeWidth={1.5} /></span>
          <h2>No updates yet.</h2>
          <p>New catalog files will appear here automatically.</p>
        </div>
      ) : (
        <div className="update-log-list">
          {updates.map(([date, releases]) => {
            const displayDate = new Date(`${date}T00:00:00`);
            return (
              <article className="update-log-day" key={date}>
                <time className="update-log-date" dateTime={date}>
                  <span>{displayDate.toLocaleDateString(undefined, { day: "2-digit" })}</span>
                  <span>{displayDate.toLocaleDateString(undefined, { month: "short", year: "numeric" }).toUpperCase()}</span>
                </time>
                <div className="update-log-releases">
                  {Array.from(releases).map(([category, files]) => (
                    <section className="update-log-release" key={category}>
                      <div className="update-log-release-heading">
                        <span className="update-log-category">{categoryLabels[category]}</span>
                        <h2>{files.length === 1 ? "File added" : "Files added"}</h2>
                      </div>
                      <div className="update-log-files">
                        {files.map((file) => <span key={file.id}>{file.filename}</span>)}
                      </div>
                    </section>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DiscordIcon() {
  return (
    <svg className="discord-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.73 5.36a18.3 18.3 0 0 0-4.52-1.4.07.07 0 0 0-.07.04c-.2.36-.42.83-.58 1.2a16.9 16.9 0 0 0-5.12 0c-.16-.38-.39-.84-.59-1.2a.07.07 0 0 0-.07-.04 18.2 18.2 0 0 0-4.52 1.4.06.06 0 0 0-.03.03C1.35 9.56.56 13.63.96 17.65c0 .02.01.04.03.05a18.4 18.4 0 0 0 5.54 2.8.07.07 0 0 0 .08-.03c.43-.59.81-1.22 1.14-1.88a.07.07 0 0 0-.04-.1 12.1 12.1 0 0 1-1.73-.82.07.07 0 0 1-.01-.11l.35-.27a.07.07 0 0 1 .07-.01c3.63 1.66 7.57 1.66 11.16 0a.07.07 0 0 1 .07.01l.35.27a.07.07 0 0 1-.01.11c-.55.32-1.13.6-1.73.82a.07.07 0 0 0-.04.1c.34.66.72 1.29 1.14 1.88a.07.07 0 0 0 .08.03 18.4 18.4 0 0 0 5.55-2.8.07.07 0 0 0 .03-.05c.47-4.64-.79-8.67-3.34-12.26a.06.06 0 0 0-.03-.03ZM8.1 14.72c-1.09 0-1.99-1-1.99-2.22s.88-2.22 1.99-2.22 2 .99 1.99 2.22c0 1.23-.88 2.22-1.99 2.22Zm7.8 0c-1.09 0-1.99-1-1.99-2.22s.88-2.22 1.99-2.22 2 .99 1.99 2.22c0 1.23-.87 2.22-1.99 2.22Z" />
    </svg>
  );
}

export default App;
