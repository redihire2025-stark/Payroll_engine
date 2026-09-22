export function FullScreenSpinner() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-bg">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
    </div>
  );
}
