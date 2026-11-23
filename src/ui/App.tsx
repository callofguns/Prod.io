import { useEffect, useState } from 'preact/hooks';
import { Session } from '../app/Session';
import { createNewGameState, type GameState } from '../sim/core/state';
import { TitleScreen } from './TitleScreen';
import { Hud } from './Hud';

export function App({ gameRoot }: { gameRoot: HTMLElement }) {
  const [session, setSession] = useState<Session | null>(null);

  const begin = (state: GameState) => {
    const s = new Session(state);
    s.start(gameRoot);
    // Save immediately so a brand-new game survives a refresh before day two.
    void s.autosaver.saveNow();
    setSession(s);
  };

  useEffect(() => () => session?.stop(), [session]);

  if (!session) {
    return (
      <TitleScreen
        onContinue={begin}
        onNewGame={() => begin(createNewGameState((Math.random() * 2 ** 32) >>> 0))}
      />
    );
  }
  return <Hud session={session} onQuitToTitle={() => setSession(null)} />;
}
