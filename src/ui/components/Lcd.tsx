import type { ComponentChildren } from 'preact';

/** Unlit segments: every glyph becomes "8" except punctuation, like a real segment display. */
const ghostOf = (text: string) => text.replace(/[A-Za-z0-9]/g, '8');

interface LcdProps {
  text: string;
  class?: string;
  label?: string;
  children?: ComponentChildren;
}

export function Lcd({ text, class: cls = '', label, children }: LcdProps) {
  return (
    <div class={`lcd ${cls}`} role="status" aria-label={label ? `${label}: ${text}` : text}>
      <span class="ghost" aria-hidden="true">{ghostOf(text)}</span>
      <span class="lit" aria-hidden="true">{text}</span>
      {children}
    </div>
  );
}
