import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-xl font-semibold">Sign-in error</h1>
      <p className="max-w-md text-center text-sm text-slate-600">
        Something went wrong while authenticating. Try again or contact your
        administrator.
      </p>
      <Link href="/login" className="text-sm font-medium text-teal-600">
        Back to login
      </Link>
    </div>
  );
}
