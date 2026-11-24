import { useEffect, useState } from 'preact/hooks';
import { Session } from '../app/Session';
import { createNewGameState, type GameState } from '../sim/core/state';
import { CharacterCreation } from './CharacterCreation';
import { TitleScreen } from './TitleScreen';
import { Hud } from './Hud';
import { RotateNotice } from './RotateNotice';

export function App({ gameRoot }: { gameRoot: HTMLElement }) {
  const [session, setSession] = useState<Session | null>(null);
  const [creating, setCreating] = useState(false);

  const begin = (state: GameState) => {
    const s = new Session(state);
    s.start(gameRoot);
    // Save immediately so a brand-new game survives a refresh before day two.
    void s.autosaver.saveNow();
    setCreating(false);
    setSession(s);
  };

  useEffect(() => () => session?.stop(), [session]);

  let screen;
  if (!session && creating) {
    screen = (
      <CharacterCreation
        onBack={() => setCreating(false)}
        onCreate={(setup) => begin(createNewGameState((Math.random() * 2 ** 32) >>> 0, setup))}
      />
    );
  } else if (!session) {
    screen = <TitleScreen onContinue={begin} onNewGame={() => setCreating(true)} />;
  } else {
    screen = <Hud session={session} onQuitToTitle={() => setSession(null)} />;
  }
  return (
    <>
      {screen}
      <RotateNotice />
    </>
  );
}
