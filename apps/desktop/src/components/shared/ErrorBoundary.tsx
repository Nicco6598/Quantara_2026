import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKey?: string;
};

type ErrorBoundaryState = {
  copied: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { copied: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { copied: false, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Quantara route render failed", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  override componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ copied: false, error: null });
    }
  }

  private copyErrorDetails = async () => {
    if (!this.state.error || !navigator.clipboard?.writeText) return;
    await navigator.clipboard.writeText(this.state.error.stack ?? this.state.error.message);
    this.setState({ copied: true });
  };

  override render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <main className="flex min-h-[400px] items-center justify-center px-4">
          <div className="max-w-md text-center">
            <div className="text-4xl">!!!</div>
            <h2 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
              Qualcosa non ha funzionato
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Ricarica la pagina o riprova piu tardi. Se il problema persiste, contatta il supporto.
            </p>
            {import.meta.env.DEV ? (
              <pre className="mt-4 max-h-40 overflow-auto rounded-2xl bg-[var(--bg-muted)] p-3 text-left text-xs text-[var(--danger-base)]">
                {this.state.error.message}
              </pre>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button
                className="rounded-full bg-[var(--accent-primary)] px-6 py-2 text-sm font-semibold text-[var(--text-inverse)]"
                onClick={() => this.setState({ copied: false, error: null })}
                type="button"
              >
                Riprova
              </button>
              <button
                className="rounded-full bg-[var(--bg-muted)] px-6 py-2 text-sm font-semibold text-[var(--text-primary)] ring-1 ring-[var(--border-subtle)]"
                onClick={() => window.location.reload()}
                type="button"
              >
                Ricarica app
              </button>
              <button
                className="rounded-full bg-[var(--bg-muted)] px-6 py-2 text-sm font-semibold text-[var(--text-primary)] ring-1 ring-[var(--border-subtle)]"
                onClick={this.copyErrorDetails}
                type="button"
              >
                {this.state.copied ? "Dettagli copiati" : "Copia dettagli"}
              </button>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
