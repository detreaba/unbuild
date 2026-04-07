"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
      <p className="text-muted mb-6 text-sm">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
