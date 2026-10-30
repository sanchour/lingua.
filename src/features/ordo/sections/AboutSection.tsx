import { UiText, useUi } from '@/design/i18n/UiText';
import { Info } from 'lucide-react';
import { APP_VERSION } from '../groups';
import { SettingsSection } from '../SettingsSection';

const CREDITS: Array<[string, string]> = [
  ['Fonts', 'Plus Jakarta Sans, Inter, Literata, Lora, Newsreader, Merriweather, Noto Serif, Atkinson Hyperlegible (SIL Open Font License)'],
  ['Icons', 'Lucide (ISC)'],
  ['Libraries', 'React, React Router, Motion, Dexie, Zustand, JSZip, Floating UI, Workbox, PDF.js (Apache 2.0)'],
  ['Dictionaries', 'Wiktionary via kaikki.org (CC BY-SA 4.0), word frequencies from OpenSubtitles via FrequencyWords (CC BY-SA 4.0)'],
  ['News articles', 'Read on request through Jina Reader (r.jina.ai), which sees only the article’s link'],
];


export function AboutSection() {
  const translateUi = useUi();
  return (
    <SettingsSection id="about" icon={Info} title={translateUi('About Lingua')}>
      <p className="text-sm text-ink-soft"><UiText source={'Lingua {0}. Local-first: your data stays on your devices.'} values={[APP_VERSION]} /></p>
      <dl className="mt-4 space-y-2 text-sm">
        {CREDITS.map(([term, detail]) => (
          <div key={term}>
            <dt className="font-semibold">{term}</dt>
            <dd className="text-ink-soft">{detail}</dd>
          </div>
        ))}
      </dl>
    </SettingsSection>
  );
}
