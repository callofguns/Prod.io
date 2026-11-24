import { useEffect, useRef, useState } from 'preact/hooks';
import type { GameState } from '../sim/core/state';
import { describeSave, fromSaveFile, saveFileName, toSaveFile } from '../save/transfer';
import { shareOrDownload } from './saveShare';
import { settings, type Settings } from '../app/settings';
import { APP_VERSION } from '../version';

function Option<T extends string | number | boolean>({ label, hint, options, value, onChange }: {
  label: string;
  hint?: string;
  options: { value: T; name: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const id = `set-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div class="set-row">
      <div class="set-label">
        <span id={id}>{label}</span>
        {hint && <span class="set-hint">{hint}</span>}
      </div>
      <div class="choices" role="radiogroup" aria-labelledby={id}>
        {options.map((o) => (
          <button key={String(o.value)} class="key wide" role="radio"
            aria-checked={o.value === value} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
            <span class="led" />
            {o.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export interface SaveData {
  /** The current save, or null if there isn't one. */
  exportState: () => Promise<GameState | null>;
  /** Only offered on the title screen, so a running game can't overwrite it. */
  importState?: (state: GameState) => Promise<void>;
}

function SaveDataSection({ data }: { data: SaveData }) {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<GameState | null>(null);
  const [current, setCurrent] = useState<GameState | null>(null);

  const exportSave = async () => {
    const state = await data.exportState();
    if (!state) return setMessage('There is no save to export yet.');
    const result = await shareOrDownload(saveFileName(state), toSaveFile(state));
    setMessage(result === 'cancelled' ? null : `Exported ${describeSave(state)}.`);
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const state = fromSaveFile(await file.text());
      setCurrent(await data.exportState());
      setPending(state);
      setMessage(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      if (input.current) input.current.value = '';
    }
  };

  return (
    <>
      <p class="silk menu-group">Save data</p>
      <p class="menu-note">
        Back up your game, or move it between Safari and the home-screen app (an iPhone keeps their saves separate).
      </p>
      {pending ? (
        <div class="save-confirm">
          <p>
            Import <strong>{describeSave(pending)}</strong>?{current ? <> This replaces your current save ({describeSave(current)}).</> : null}
          </p>
          <div class="menu-actions">
            <button class="key wide light" onClick={() => setPending(null)}>Cancel</button>
            <button class="key wide danger" onClick={async () => {
              await data.importState!(pending);
              setPending(null);
              setMessage(`Imported ${describeSave(pending)}. Press Continue to play it.`);
            }}>Replace save</button>
          </div>
        </div>
      ) : (
        <div class="save-buttons">
          <button class="key wide" onClick={exportSave}>Export save</button>
          {data.importState ? (
            <>
              <button class="key wide light" onClick={() => input.current?.click()}>Import save</button>
              <input ref={input} type="file" accept="application/json,.json" hidden onChange={(e) => pickFile(e.currentTarget.files?.[0])} />
            </>
          ) : (
            <span class="menu-note">To import a save, open Settings from the title screen.</span>
          )}
        </div>
      )}
      {message && <p class="save-message" role="status">{message}</p>}
    </>
  );
}

/** Per-browser preferences, reachable from the title screen and the pause menu. */
export function SettingsPanel({ onClose, saveData }: { onClose: () => void; saveData?: SaveData }) {
  const [s, setS] = useState<Settings>(settings.get());
  useEffect(() => settings.subscribe(setS), []);
  const set = (patch: Partial<Settings>) => settings.update(patch);

  return (
    <section class="menu chassis screws interactive" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <p class="silk">Prod.io · {APP_VERSION}</p>
      <h2 id="settings-title" class="menu-title">Settings</h2>

      <p class="silk menu-group">Display</p>
      <Option label="World zoom" hint="Auto picks the largest size that fits your window."
        options={[{ value: 'auto', name: 'Auto' }, { value: 2, name: '2×' }, { value: 3, name: '3×' }, { value: 4, name: '4×' }]}
        value={s.zoom} onChange={(zoom) => set({ zoom })} />
      <Option label="Control hints" hint="Tips on how to walk and use things."
        options={[{ value: true, name: 'Show' }, { value: false, name: 'Hide' }]}
        value={s.showHints} onChange={(showHints) => set({ showHints })} />
      <Option label="Reduce motion"
        options={[{ value: 'system', name: 'Match system' }, { value: 'reduce', name: 'On' }, { value: 'full', name: 'Off' }]}
        value={s.motion} onChange={(motion) => set({ motion })} />

      <p class="silk menu-group">Sound</p>
      <Option label="Volume" hint="The beat maker and everything else you hear."
        options={[{ value: 0, name: 'Off' }, { value: 0.25, name: '25%' }, { value: 0.5, name: '50%' }, { value: 0.8, name: '80%' }, { value: 1, name: '100%' }]}
        value={s.volume} onChange={(volume) => set({ volume })} />

      <p class="silk menu-group">Controls</p>
      <Option label="On-screen joystick" hint="For touch screens. Tapping where to walk always works too."
        options={[{ value: false, name: 'Off' }, { value: true, name: 'On' }]}
        value={s.joystick} onChange={(joystick) => set({ joystick })} />
      <Option label="Developer tools" hint="Shows a DBG button for the debug panel (no keyboard needed)."
        options={[{ value: false, name: 'Off' }, { value: true, name: 'On' }]}
        value={s.devTools} onChange={(devTools) => set({ devTools })} />

      <p class="silk menu-group">Gameplay</p>
      <Option label="Pause when you leave the tab" hint="Opens the pause menu if you switch windows."
        options={[{ value: true, name: 'On' }, { value: false, name: 'Off' }]}
        value={s.pauseOnBlur} onChange={(pauseOnBlur) => set({ pauseOnBlur })} />

      {saveData && <SaveDataSection data={saveData} />}

      <p class="menu-note">Settings are saved in this browser.</p>

      <div class="menu-actions">
        <button class="key wide light" onClick={() => settings.reset()}>Reset to defaults</button>
        <button class="key wide" autoFocus onClick={onClose}>Done</button>
      </div>
    </section>
  );
}
