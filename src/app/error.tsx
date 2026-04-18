"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mt-6">
          Something went wrong
        </h1>
        <p className="text-gray-500 mt-2">
          We apologize for the inconvenience. Please try again or contact
          support if the problem persists.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 mt-2 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center mt-6">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 border px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
