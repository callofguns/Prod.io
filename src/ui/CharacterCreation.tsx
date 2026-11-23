import { useEffect, useRef, useState } from 'preact/hooks';
import {
  CLOTHING_COLORS, DEFAULT_LOOK_CHOICE, HAIR_COLORS, HAIR_STYLES, SKIN_TONES, TOP_STYLES,
  type LookChoice, type Swatch,
} from '../content/looks';
import { BACKGROUNDS, type Background } from '../content/backgrounds';
import { SKILLS } from '../content/skills';
import { formatMoney } from '../sim/core/money';
import type { NewGameSetup } from '../sim/core/state';
import { CHAR_FRAMES, CHAR_H, CHAR_W, CHAR_DIRS, paintCharacterSheet } from '../game/art/characterArt';
import { Lcd } from './components/Lcd';

const NAME_MAX = 24;
const ALIAS_MAX = 20;
const PREVIEW_SCALE = 8;
/** Preview turns: front, right, back, left. */
const TURNS = [
  { dir: 'down', flip: false, label: 'front' },
  { dir: 'side', flip: false, label: 'right side' },
  { dir: 'up', flip: false, label: 'back' },
  { dir: 'side', flip: true, label: 'left side' },
] as const;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function Preview({ look }: { look: LookChoice }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [turn, setTurn] = useState(0);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (reducedMotion()) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % 4), 220);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    const sheet = paintCharacterSheet(look);
    const t = TURNS[turn]!;
    const walk = [0, 1, 0, 2][frame]!;
    const sx = (CHAR_DIRS.indexOf(t.dir) * CHAR_FRAMES + walk) * CHAR_W;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, CHAR_W, CHAR_H);
    ctx.save();
    if (t.flip) {
      ctx.translate(CHAR_W, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(sheet, sx, 0, CHAR_W, CHAR_H, 0, 0, CHAR_W, CHAR_H);
    ctx.restore();
  }, [look, turn, frame]);

  return (
    <div class="cc-preview">
      <div class="cc-stage">
        <canvas
          ref={canvas}
          width={CHAR_W}
          height={CHAR_H}
          style={{ width: `${CHAR_W * PREVIEW_SCALE}px`, height: `${CHAR_H * PREVIEW_SCALE}px` }}
          role="img"
          aria-label={`Your character, ${TURNS[turn]!.label} view`}
        />
      </div>
      <div class="cc-turn">
        <button class="key" aria-label="Turn left" onClick={() => setTurn((t) => (t + 3) % 4)}>◀</button>
        <span class="silk">Turn</span>
        <button class="key" aria-label="Turn right" onClick={() => setTurn((t) => (t + 1) % 4)}>▶</button>
      </div>
    </div>
  );
}

function Swatches({ label, options, value, onChange }: {
  label: string; options: Swatch[]; value: string; onChange: (id: string) => void;
}) {
  return (
    <div class="cc-field">
      <p class="silk" id={`sw-${label}`}>{label}</p>
      <div class="swatches" role="radiogroup" aria-labelledby={`sw-${label}`}>
        {options.map((o) => (
          <button
            key={o.id}
            class="swatch"
            role="radio"
            aria-checked={o.id === value}
            aria-label={o.name}
            title={o.name}
            style={{ '--swatch': o.color }}
            onClick={() => onChange(o.id)}
          />
        ))}
      </div>
    </div>
  );
}

function Choices<T extends string>({ label, options, value, onChange }: {
  label: string; options: readonly { id: T; name: string }[]; value: T; onChange: (id: T) => void;
}) {
  return (
    <div class="cc-field">
      <p class="silk" id={`ch-${label}`}>{label}</p>
      <div class="choices" role="radiogroup" aria-labelledby={`ch-${label}`}>
        {options.map((o) => (
          <button key={o.id} class="key wide" role="radio" aria-checked={o.id === value} aria-pressed={o.id === value} onClick={() => onChange(o.id)}>
            <span class="led" />
            {o.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function BackgroundCard({ bg, selected, onSelect }: { bg: Background; selected: boolean; onSelect: () => void }) {
  const top = SKILLS.map((s) => ({ ...s, value: bg.skills[s.id] ?? 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);
  const debt = bg.debts.reduce((sum, d) => sum + d.balance, 0);
  return (
    <button class="bg-card" role="radio" aria-checked={selected} onClick={onSelect}>
      <span class="bg-led" aria-hidden="true" />
      <span class="bg-name">{bg.name}</span>
      <span class="bg-summary">{bg.summary}</span>
      <span class="bg-money">
        <span><span class="silk">Cash</span>{formatMoney(bg.cash)}</span>
        <span><span class="silk">Debt</span>{debt ? formatMoney(debt) : 'None'}</span>
      </span>
      <span class="bg-skills">
        {top.map((s) => (
          <span key={s.id} class="bg-skill"><span>{s.short}</span><span>{s.value}</span></span>
        ))}
      </span>
      <span class="bg-notes">{bg.notes.join(' · ')}</span>
    </button>
  );
}

function randomLook(): LookChoice {
  const any = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]!;
  return {
    skin: any(SKIN_TONES).id,
    hairStyle: any(HAIR_STYLES).id,
    hairColor: any(HAIR_COLORS.slice(0, 4)).id,
    top: any(TOP_STYLES).id,
    topColor: any(CLOTHING_COLORS).id,
    pantsColor: any(CLOTHING_COLORS).id,
  };
}

interface Props {
  onCreate: (setup: NewGameSetup) => void;
  onBack: () => void;
}

export function CharacterCreation({ onCreate, onBack }: Props) {
  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [look, setLook] = useState<LookChoice>(DEFAULT_LOOK_CHOICE);
  const [background, setBackground] = useState<Background['id']>(BACKGROUNDS[0]!.id);
  const set = <K extends keyof LookChoice>(key: K) => (value: LookChoice[K]) => setLook((l) => ({ ...l, [key]: value }));

  const trimmedName = name.trim();
  const trimmedAlias = alias.trim();
  const ready = trimmedName.length > 0 && trimmedAlias.length > 0;

  return (
    <div class="screen">
      <main class="cc chassis screws interactive">
        <header class="cc-head">
          <p class="silk">New producer</p>
          <Lcd text={trimmedAlias ? trimmedAlias.toUpperCase() : 'YOUR ALIAS'} class="cc-marquee" label="Producer alias" />
        </header>

        <div class="cc-body">
          <Preview look={look} />

          <div class="cc-form">
            <div class="cc-names">
              <label class="cc-field">
                <span class="silk">Name</span>
                <input class="lcd-input" value={name} maxLength={NAME_MAX} autoFocus
                  placeholder="Your name" onInput={(e) => setName(e.currentTarget.value)} />
              </label>
              <label class="cc-field">
                <span class="silk">Producer alias</span>
                <input class="lcd-input" value={alias} maxLength={ALIAS_MAX}
                  placeholder="e.g. Lil Loop" onInput={(e) => setAlias(e.currentTarget.value)} />
              </label>
            </div>
            <Swatches label="Skin" options={SKIN_TONES} value={look.skin} onChange={set('skin')} />
            <Choices label="Hair" options={HAIR_STYLES} value={look.hairStyle} onChange={set('hairStyle')} />
            <Swatches label="Hair colour" options={HAIR_COLORS} value={look.hairColor} onChange={set('hairColor')} />
            <div class="cc-row">
              <Choices label="Top" options={TOP_STYLES} value={look.top} onChange={set('top')} />
              <button class="key wide light cc-random" onClick={() => setLook(randomLook())}>Randomize look</button>
            </div>
            <Swatches label="Top colour" options={CLOTHING_COLORS} value={look.topColor} onChange={set('topColor')} />
            <Swatches label="Pants colour" options={CLOTHING_COLORS} value={look.pantsColor} onChange={set('pantsColor')} />
          </div>
        </div>

        <section class="cc-backgrounds">
          <p class="silk" id="bg-label">Background · sets your starting skills, cash and debt</p>
          <div class="bg-grid" role="radiogroup" aria-labelledby="bg-label">
            {BACKGROUNDS.map((bg) => (
              <BackgroundCard key={bg.id} bg={bg} selected={bg.id === background} onSelect={() => setBackground(bg.id)} />
            ))}
          </div>
        </section>

        <footer class="cc-foot">
          <button class="key wide light" onClick={onBack}>Back</button>
          {!ready && <p class="cc-hint">Enter a name and a producer alias to start.</p>}
          <button
            class="key wide"
            disabled={!ready}
            onClick={() => onCreate({ name: trimmedName, alias: trimmedAlias, look, background })}
          >
            Start your career
          </button>
        </footer>
      </main>
    </div>
  );
}
