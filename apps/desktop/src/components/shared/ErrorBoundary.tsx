import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  override render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <main className="flex min-h-[400px] items-center justify-center px-4">
          <div className="max-w-md text-center">
            <div className="text-4xl">!!!</div>
            <h2 className="mt-4 text-lg font-bold text-[var(--text-primary)]">
              Qualcosa non ha funzionato
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Ricarica la pagina o riprova piu tardi. Se il problema persiste, contatta il supporto.
            </p>
            <button
              className="mt-6 rounded-full bg-[var(--accent-primary)] px-6 py-2 text-sm font-semibold text-white"
              onClick={() => this.setState({ error: null })}
              type="button"
            >
              Riprova
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
