"use client";

import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto px-4">
        <h1 className="text-9xl font-bold text-gray-300">404</h1>
        <h2 className="text-2xl font-semibold text-gray-900 mt-4">
          Page not found
        </h2>
        <p className="text-gray-500 mt-2">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 border px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
