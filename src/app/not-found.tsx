import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <h2 className="text-2xl font-bold mb-2">Page not found</h2>
      <p className="text-muted mb-6 text-sm">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}
