/**
 * Shared view-only state between the Phaser world and the DOM UI: things that
 * are not part of the saved game, such as the current interaction prompt and
 * on-screen toasts.
 */
export interface Prompt {
  id: string;
  label: string;
}

export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'good' | 'bad';
}

type Listener = () => void;

export class ViewBridge {
  prompt: Prompt | null = null;
  toasts: Toast[] = [];
  /** Set by the app: what happens when the player presses E on something. */
  onInteract: (id: string) => void = () => {};

  private listeners = new Set<Listener>();
  private nextToastId = 1;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  }

  setPrompt(prompt: Prompt | null): void {
    if (prompt?.id === this.prompt?.id) return;
    this.prompt = prompt;
    this.notify();
  }

  toast(text: string, tone: Toast['tone'] = 'info'): void {
    const toast = { id: this.nextToastId++, text, tone };
    this.toasts = [...this.toasts.slice(-2), toast];
    this.notify();
    setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.id !== toast.id);
      this.notify();
    }, 3200);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}
