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
  /** Object whose action menu is open (after pressing E), if any. */
  actionsFor: string | null = null;
  toasts: Toast[] = [];
  /** Set by the app: what happens when the player presses E on something. */
  onInteract: (id: string) => void = () => {};
  /** Screen space the HUD covers (CSS px), so the world camera can avoid it. */
  hudInsets = { top: 0, bottom: 0 };
  /** On-screen joystick direction, each axis -1..1 (0,0 when released). Read every frame. */
  joystick = { x: 0, y: 0 };
  private layoutListeners = new Set<Listener>();

  private listeners = new Set<Listener>();
  private nextToastId = 1;

  setHudInsets(top: number, bottom: number): void {
    if (top === this.hudInsets.top && bottom === this.hudInsets.bottom) return;
    this.hudInsets = { top, bottom };
    this.layoutListeners.forEach((l) => l());
  }

  onLayout(listener: Listener): () => void {
    this.layoutListeners.add(listener);
    return () => void this.layoutListeners.delete(listener);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  }

  setPrompt(prompt: Prompt | null): void {
    if (prompt?.id === this.prompt?.id) return;
    this.prompt = prompt;
    // Walking away from an object closes its menu.
    if (this.actionsFor && this.actionsFor !== prompt?.id) this.actionsFor = null;
    this.notify();
  }

  openActions(objectId: string | null): void {
    this.actionsFor = objectId;
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
