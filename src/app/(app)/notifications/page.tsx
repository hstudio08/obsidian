"use client";

export default function NotificationsPage() {
  return (
    <div className="flex flex-col w-full h-full bg-background relative overflow-y-auto pb-24">
      <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur-xl border-b border-border pt-safe">
        <div className="h-16 px-4 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Notifications</h1>
          <button className="text-sm font-semibold text-primary-500">
            Clear all
          </button>
        </div>
      </header>

      <div className="flex-1 p-4 flex flex-col items-center justify-center text-center max-w-sm mx-auto opacity-50">
        <div className="w-16 h-16 rounded-full bg-surface-hover flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
        </div>
        <h2 className="text-lg font-semibold mb-1">All caught up</h2>
        <p className="text-sm text-text-muted">When you get notifications about groups or system alerts, they'll show up here.</p>
      </div>
    </div>
  );
}
