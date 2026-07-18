import { Component } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, RefreshCw } from "lucide-react";

import Button from "./Button";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught:", error, info);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback({
        error: this.state.error,
        retry: this.handleRetry,
      });
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div
          className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"
          role="alert"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertTriangle size={28} aria-hidden />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Something went wrong
          </h1>
          <p className="mt-2 text-slate-500">
            {this.state.error?.message ||
              "An unexpected error occurred. You can retry or return home."}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button onClick={this.handleRetry}>
              <RefreshCw size={16} aria-hidden />
              Retry
            </Button>
            <Link to="/">
              <Button variant="outline">Go home</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
