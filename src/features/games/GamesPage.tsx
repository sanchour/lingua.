import { UiText, useUi } from '@/design/i18n/UiText';
// Thesaurus › Games (6-21): the shelf of games played on the learner's own words, and each game on its own address. The words are
// the same ones Practice draws on; a game that cannot be made from them says what is missing instead of opening empty.
import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { Link, useParams } from 'react-router';
import { Gamepad2, Trophy } from 'lucide-react';
import { clock } from '@/core/games/bests';
import type { Best } from '@/core/games/bests';
import { GAME_GROUPS, GAMES as ALL_GAMES, gameById } from '@/core/games/defs';
import type { GameDef, GameGroup } from '@/core/games/defs';
import { canPlay } from '@/core/games/source';
import type { GameItem, GameSource } from '@/core/games/source';
import { getLanguage } from '@/core/lang/languages';
import { gameSource, useBests } from '@/data/games';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { buttonClasses, Card, EmptyState } from '@/design/primitives';
import { Anagram } from './Anagram';
import { Clues } from './Clues';
import { Hangman } from './Hangman';
import { Hunt } from './Hunt';
import { Ladder } from './Ladder';
import { MissingLetters } from './MissingLetters';
import { WordSearch } from './WordSearch';

interface ScreenProps {
  lang: string;
  def: GameDef;
  items: GameItem[];
  best?: Best;
}

/** The screen of each game that has one; a game without one is not on the shelf yet. */
const SCREENS: Record<string, ComponentType<ScreenProps>> = { hangman: Hangman, anagram: Anagram, missing: MissingLetters, clues: Clues, wordsearch: WordSearch, hunt: Hunt, ladder: Ladder };
const GAMES = ALL_GAMES.filter((g) => g.id in SCREENS);

export default function GamesPage() {
  const translateUi = useUi();
  const { language } = useApp();
  const lang = language.id;
  const name = getLanguage(lang)?.name ?? lang;
  const gameId = useParams().game;
  const def = gameById(gameId);
  const bests = useBests(lang);
  const [source, setSource] = useState<GameSource | null>(null);

  useEffect(() => {
    let alive = true;
    setSource(null);
    void gameSource(lang).then((i) => alive && setSource(i));
    return () => {
      alive = false;
    };
  }, [lang]);

  if (gameId && !(def && def.id in SCREENS))
    return (
      <EmptyState icon={Gamepad2} title={translateUi('No such game')} action={<Link to="/thesaurus/games" className={buttonClasses('secondary', 'md')}><UiText source={'All games'} /></Link>}><UiText source={'That game is not on the shelf.'} /></EmptyState>
    );

  if (def) {
    if (!source) return <p className="p-10 text-ink-soft"><UiText source={'Looking at your words…'} /></p>;
    const can = canPlay(def, source, lang, translateUi);
    if (!can.ok)
      return (
        <EmptyState icon={Gamepad2} title={translateUi('{0} can’t be made yet', [def.title])} action={<Link to="/thesaurus/games" className={buttonClasses('secondary', 'md')}><UiText source={'All games'} /></Link>}>
          <UiText source={can.reason} />
        </EmptyState>
      );
    const Screen = SCREENS[def.id];
    return <Screen key={`${lang}:${def.id}`} lang={lang} def={def} items={source.items} best={bests?.[def.id]} />;
  }

  const played = GAMES.filter((g) => bests?.[g.id]);
  const section = (group: GameGroup) => {
    const games = GAMES.filter((g) => g.group === group);
    if (!games.length) return null;
    return (
      <section key={group} className="mt-8" aria-label={translateUi(GAME_GROUPS[group].title)}>
        <h2 className="mb-3 text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase"><UiText source={GAME_GROUPS[group].title} /></h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {games.map((g) => {
            const can = source ? canPlay(g, source, lang, translateUi) : null;
            const best = bests?.[g.id];
            return (
              <Card key={g.id} className="flex flex-col p-5">
                <p className="font-serif text-lg font-semibold"><UiText source={g.title} /></p>
                <p className="mt-1 flex-1 text-[14px] leading-snug text-ink-soft"><UiText source={g.detail} /></p>
                {best && (
                  <p className="mt-3 text-[13px] text-ink-soft"><UiText source={'Best: {0} stars in {1}'} values={[best.stars, clock(best.ms)]} /></p>
                )}
                {!can ? (
                  <p className="mt-4 text-[12.5px] text-ink-faint"><UiText source={'Looking at your words…'} /></p>
                ) : can.ok ? (
                  <Link to={`/thesaurus/games/${g.id}`} className={buttonClasses('primary', 'sm') + ' mt-4 self-start'}>
                    {best ? translateUi('Play again') : translateUi('Play')}
                  </Link>
                ) : (
                  <p className="mt-4 text-[12.5px] leading-snug text-ink-faint"><UiText source={can.reason} /></p>
                )}
              </Card>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <>
      <PageHeader englishTitle="Games" title={translateUi('Games')} eyebrow={translateUi('{0}, played on your words', [name])} />
      <p className="max-w-2xl text-[15px] leading-relaxed text-ink-soft"><UiText source={'Games made from the words in your decks. They never change when a card comes back; what you do is kept in your record, and your best round is kept here.{0}{1}'} values={[' ', <Link to="/thesaurus" className="font-semibold text-ink underline decoration-line-strong underline-offset-4"><UiText source={'Back to Thesaurus'} /></Link>]} /></p>
      <Card className="mt-6 p-5">
        <div className="flex items-center gap-2">
          <Trophy size={17} className="text-sage-text" aria-hidden />
          <h2 className="text-[13px] font-bold tracking-wide text-ink-soft uppercase"><UiText source={'Your bests'} /></h2>
        </div>
        {played.length ? (
          <ul className="mt-3 divide-y divide-line/70">
            {played.map((g) => (
              <li key={g.id} className="flex items-baseline justify-between gap-4 py-2 text-[14px]">
                <Link to={`/thesaurus/games/${g.id}`} className="font-semibold hover:underline">
                  <UiText source={g.title} />
                </Link>
                <span className="text-ink-soft tabular-nums"><UiText source={'{0} stars · {1} · {2} {3}'} values={[bests![g.id].stars, clock(bests![g.id].ms), bests![g.id].plays, bests![g.id].plays === 1 ? <UiText source={'round'} /> : <UiText source={'rounds'} />]} /></span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[14px] text-ink-soft"><UiText source={'Play a round and your best is kept here.'} /></p>
        )}
      </Card>
      {(Object.keys(GAME_GROUPS) as GameGroup[]).map(section)}
    </>
  );
}
