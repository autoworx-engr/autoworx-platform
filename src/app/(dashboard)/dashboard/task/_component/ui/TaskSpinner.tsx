export default function TaskSpinner() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
    </div>
  );
}
