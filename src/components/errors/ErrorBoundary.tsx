// Generic React error boundary. Class component is required — React still
// has no hook based equivalent. All higher level boundaries are thin wrappers
// around this one.

import { Component, ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback: (err: Error, reset: () => void) => ReactNode;
  onError?: (err: Error, info: { componentStack: string }) => void;
};

type State = { err: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error, info: { componentStack: string }) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", err, info.componentStack);
    this.props.onError?.(err, info);
  }

  reset = () => this.setState({ err: null });

  render() {
    if (this.state.err) return this.props.fallback(this.state.err, this.reset);
    return this.props.children;
  }
}
