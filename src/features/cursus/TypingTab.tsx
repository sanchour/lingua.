import { Keyboard } from 'lucide-react';
import { useApp } from '@/app/context';
import { useTypingData, useTypingRow } from '@/data/typing';
import { Card, EmptyState } from '@/design/primitives';
import { TypingPractice } from './typing/TypingPractice';

/** Cursus › Typing (Lingua 5.1-4a): keyboard practice in the language's own letters, for the core languages. */
export function TypingTab() {
  const { language } = useApp();
  const data = useTypingData(language.id);
  const row = useTypingRow(language.id);
  if (data === undefined || !row) return null;
  if (!data) {
    return (
      <Card>
        <EmptyState icon={Keyboard} title="Typing practice is for the core languages">
          French, Spanish, German, Russian, Arabic and Mandarin each have their own letters and keyboard to practise.
        </EmptyState>
      </Card>
    );
  }
  return <TypingPractice key={language.id} lang={language.id} data={data} saved={row} />;
}
