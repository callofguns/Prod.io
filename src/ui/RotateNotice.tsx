/** Phones play in landscape. Shown by CSS only while a phone is upright. */
export function RotateNotice() {
  return (
    <div class="rotate-notice" role="alert">
      <div class="rotate-card chassis screws">
        <svg class="rotate-icon" viewBox="0 0 64 64" aria-hidden="true">
          <rect x="22" y="8" width="20" height="36" rx="4" class="rotate-phone" />
          <rect x="10" y="30" width="36" height="20" rx="4" class="rotate-phone landscape" />
          <path d="M50 14a14 14 0 0 1 4 12" class="rotate-arrow" />
          <path d="M51 27l3-1 1-3" class="rotate-arrow" />
        </svg>
        <p class="silk">Prod.io plays in landscape</p>
        <p class="rotate-text">Turn your phone sideways to keep playing.</p>
      </div>
    </div>
  );
}
