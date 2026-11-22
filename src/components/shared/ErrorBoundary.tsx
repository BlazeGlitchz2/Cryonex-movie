import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { RotateCcw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      "ErrorBoundary caught a render crash:",
      error,
      info.componentStack,
    );
  }

  render(): ReactNode {
    if (this.state.error === null) {
      return this.props.children;
    }

    return (
      <div className="mx-auto flex min-h-[70vh] max-w-7xl flex-col items-center justify-center px-4 py-10 text-center">
        <div
          role="alert"
          className="material-card flex w-full max-w-md flex-col items-center gap-3 rounded-hero px-6 py-10"
        >
          <h1 className="font-display text-xl font-bold text-ink">
            Something went wrong in this view.
          </h1>
          <p className="text-sm leading-relaxed text-ink-dim">
            {this.state.error.message}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            {/* full reload is the recovery: a crashed render tree cannot be trusted */}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex h-11 items-center gap-2 rounded-xl bg-accent px-7 text-sm font-semibold text-canvas transition duration-[250ms] ease-in-out hover:bg-white/80 active:scale-[0.96]"
            >
              <RotateCcw size={20} aria-hidden="true" />
              Reload view
            </button>
            <a
              href="/"
              className="flex h-11 items-center rounded-xl bg-white/10 px-7 text-sm font-semibold text-ink transition-colors duration-[250ms] ease-in-out hover:bg-white/20"
            >
              Go home
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
