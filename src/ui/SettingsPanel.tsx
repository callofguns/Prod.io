import { useEffect, useState } from 'preact/hooks';
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

/** Per-browser preferences, reachable from the title screen and the pause menu. */
export function SettingsPanel({ onClose }: { onClose: () => void }) {
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
      <Option label="Control hints" hint="The key guide in the bottom-left corner."
        options={[{ value: true, name: 'Show' }, { value: false, name: 'Hide' }]}
        value={s.showHints} onChange={(showHints) => set({ showHints })} />
      <Option label="Reduce motion"
        options={[{ value: 'system', name: 'Match system' }, { value: 'reduce', name: 'On' }, { value: 'full', name: 'Off' }]}
        value={s.motion} onChange={(motion) => set({ motion })} />

      <p class="silk menu-group">Gameplay</p>
      <Option label="Pause when you leave the tab" hint="Opens the pause menu if you switch windows."
        options={[{ value: true, name: 'On' }, { value: false, name: 'Off' }]}
        value={s.pauseOnBlur} onChange={(pauseOnBlur) => set({ pauseOnBlur })} />

      <p class="menu-note">Sound settings arrive with the beat maker. Settings are saved in this browser.</p>

      <div class="menu-actions">
        <button class="key wide light" onClick={() => settings.reset()}>Reset to defaults</button>
        <button class="key wide" autoFocus onClick={onClose}>Done</button>
      </div>
    </section>
  );
}
