/** Line drawings for the ways of adding to the library (5.1-3a): a book, a comic, photos of pages. */
export function KindDrawing({ kind, className }: { kind: 'book' | 'comic' | 'photos'; className?: string }) {
  return (
    <svg viewBox="0 0 96 72" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {kind === 'book' && (
        <>
          <path d="M48 18c-8-6-20-7-32-4v44c12-3 24-2 32 4 8-6 20-7 32-4V14c-12-3-24-2-32 4Z" />
          <path d="M48 18v44" />
          <path d="M23 26c6-1 12-1 18 1M23 34c6-1 12-1 18 1M23 42c6-1 12-1 18 1M55 27c6-2 12-2 18-1M55 35c6-2 12-2 18-1" opacity=".55" />
        </>
      )}
      {kind === 'comic' && (
        <>
          <rect x="18" y="10" width="60" height="52" rx="4" />
          <path d="M18 34h60M50 10v24M40 34v28" />
          <path d="M27 17h13a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3h-7l-4 3v-3h-2a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3Z" opacity=".7" />
          <circle cx="63" cy="22" r="5" opacity=".55" />
          <path d="M50 54l6-8 5 5 4-4 7 7" opacity=".55" />
        </>
      )}
      {kind === 'photos' && (
        <>
          <rect x="30" y="8" width="40" height="52" rx="3" transform="rotate(8 50 34)" opacity=".5" />
          <rect x="24" y="12" width="40" height="52" rx="3" />
          <path d="M31 22h26M31 29h26M31 36h26M31 43h18" opacity=".6" />
          <circle cx="66" cy="54" r="9" />
          <circle cx="66" cy="54" r="3.5" />
        </>
      )}
    </svg>
  );
}
