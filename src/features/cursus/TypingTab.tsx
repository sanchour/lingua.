import { Keyboard } from 'lucide-react';
import { Card, EmptyState } from '@/design/primitives';

/** Cursus › Typing until keyboard practice is built (Lingua 5.1-8). */
export function TypingTab() {
  return (
    <Card>
      <EmptyState icon={Keyboard} title="Typing practice is coming">
        The language’s own letters and accents on your keyboard, with short drills.
      </EmptyState>
    </Card>
  );
}
