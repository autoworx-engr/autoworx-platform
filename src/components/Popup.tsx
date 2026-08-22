export default function Popup({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-70">
      <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 transform rounded-md border bg-background">
        {children}
      </div>
    </div>
  );
}
