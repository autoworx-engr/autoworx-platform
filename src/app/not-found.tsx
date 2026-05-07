import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Page not found</h1>
      <p className="text-sm text-slate-600">That route does not exist.</p>
      <Link href="/dashboard" className="text-sm font-medium text-teal-600">
        Back to dashboard
      </Link>
    </div>
  );
}
