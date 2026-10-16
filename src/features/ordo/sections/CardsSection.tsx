import { SquareStack } from 'lucide-react';
import type { Settings } from '@/data/settings';
import { cx } from '@/lib/cx';
import { cardLookProps } from '@/features/thesaurus/common/cardLook';
import { CardLookPanel } from '@/features/thesaurus/common/CardLookPanel';
import { SettingsSection } from '../SettingsSection';

/** "Library" in each language, with its article: a bookish word for the preview card. */
const SAMPLE: Record<string, [article: string, word: string]> = {
  en: ['', 'library'],
  es: ['la', 'biblioteca'],
  ru: ['', 'библиоте́ка'],
  pt: ['a', 'biblioteca'],
  fr: ['la', 'bibliothèque'],
  el: ['η', 'βιβλιοθήκη'],
  de: ['die', 'Bibliothek'],
  it: ['la', 'biblioteca'],
  sv: ['ett', 'bibliotek'],
  hu: ['', 'könyvtár'],
};

export function CardsSection({ look, lang }: { look: Settings['cards']; lang: string }) {
  const [article, word] = SAMPLE[lang] ?? SAMPLE.en;
  const props = cardLookProps(look);
  const face = 'flashcard flex aspect-[3/2] flex-col items-center justify-center overflow-hidden rounded-2xl border border-line px-4 text-center shadow-elev-1';
  return (
    <SettingsSection id="cards" icon={SquareStack} title="Flashcards" description="Make your cards your own. The study screen’s Aa button changes this too.">
      <div className="mb-6 grid grid-cols-2 gap-3" aria-hidden>
        <div {...props} className={face}>
          <p lang={lang} className="text-[calc(1.6rem*var(--card-scale,1))] leading-tight font-semibold">
            {article && <span className="font-normal text-ink-faint">{article} </span>}
            {word}
          </p>
        </div>
        <div {...props} className={cx(face, 'gap-1')}>
          <p lang={lang} className="text-[calc(0.95rem*var(--card-scale,1))] font-semibold">
            {word}
          </p>
          <p className="text-[calc(1.35rem*var(--card-scale,1))] font-semibold text-accent-text">library</p>
        </div>
      </div>
      <CardLookPanel look={look} />
    </SettingsSection>
  );
}
