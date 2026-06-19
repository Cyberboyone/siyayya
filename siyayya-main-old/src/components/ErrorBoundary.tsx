import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface p-4">
          <div className="max-w-md w-full glass-card p-10 rounded-[2.5rem] border border-black/5 shadow-2xl text-center flex flex-col items-center">
            <div className="h-20 w-20 rounded-3xl bg-destructive/10 flex items-center justify-center text-destructive mb-8 animate-pulse">
              <AlertCircle className="h-10 w-10" />
            </div>
            
            <h1 className="text-3xl font-black text-textPrimary tracking-tight mb-4">
              Something went wrong
            </h1>
            
            <p className="text-textSecondary font-medium mb-10 text-pretty">
              The application encountered an unexpected error. Don't worry, your data is safe.
            </p>

            <div className="flex flex-col w-full gap-3">
              <Button 
                onClick={this.handleReset}
                className="w-full bg-primary hover:bg-primaryDark text-white h-12 rounded-2xl font-black tracking-tight flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <RefreshCw className="h-4 w-4" />
                Retry Loading
              </Button>
              
              <Button 
                variant="ghost"
                onClick={this.handleGoHome}
                className="w-full h-12 rounded-2xl font-bold text-textSecondary hover:bg-muted transition-all"
              >
                <Home className="h-4 w-4 mr-2" />
                Return Home
              </Button>
            </div>

            {process.env.NODE_ENV === "development" && (
              <div className="mt-8 pt-8 border-t border-black/5 w-full">
                <p className="text-[10px] font-black uppercase tracking-widest text-textMuted mb-4">Debug Info</p>
                <pre className="text-left bg-muted p-4 rounded-xl text-[10px] font-mono overflow-auto max-h-40 text-destructive/80 border border-black/5">
                  {this.state.error?.message}
                  {"\n"}
                  {this.state.error?.stack}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
