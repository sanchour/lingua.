import { UiText, useUi } from '@/design/i18n/UiText';
import { useEffect, useMemo, useState } from 'react';
import { Hand, HardDrive, PanelBottom, Share2, Smartphone, Type } from 'lucide-react';
import { getLanguage, LANGUAGES } from '@/core/lang/languages';
import { isSegmenterSupported, tokenize } from '@/core/text/tokenizer';
import { useLayout } from '@/design/hooks/useLayout';
import { useLongPress } from '@/design/hooks/useLongPress';
import { Badge, Button, Drawer } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { formatBytes } from '@/lib/format';
import { canShareFile, shareFile } from '@/services/files/files';
import { getStorageInfo, requestPersistence } from '@/services/storage/persist';
import type { StorageInfo } from '@/services/storage/persist';
import { Facts, LabCard } from './LabCard';
import { useLabReport } from './report';

function readSafeAreas(): Record<'top' | 'right' | 'bottom' | 'left', number> {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.append(probe);
  const cs = getComputedStyle(probe);
  const out = { top: parseFloat(cs.paddingTop), right: parseFloat(cs.paddingRight), bottom: parseFloat(cs.paddingBottom), left: parseFloat(cs.paddingLeft) };
  probe.remove();
  return out;
}

export function EnvironmentCard() {
  const translateUi = useUi();
  const { layout, pointer } = useLayout();
  const record = useLabReport((s) => s.record);
  const env = useMemo(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return {
      standalone,
      layout,
      pointer,
      viewport: `${window.innerWidth}×${window.innerHeight}`,
      pixelRatio: Math.round(window.devicePixelRatio * 100) / 100,
      safeArea: readSafeAreas(),
      secureContext: window.isSecureContext,
      serviceWorker: Boolean(navigator.serviceWorker?.controller),
      segmenter: isSegmenterSupported(),
      userAgent: navigator.userAgent,
    };
  }, [layout, pointer]);

  useEffect(() => record('environment', env), [env, record]);

  const sa = env.safeArea;
  return (
    <LabCard icon={Smartphone} title={translateUi('This device')}>
      <Facts
        rows={[
          ['Opened as', env.standalone ? 'Installed app' : 'Browser tab'],
          ['Layout', `${env.layout === 'wide' ? 'Desktop (sidebar)' : 'Phone (tab bar)'} · ${env.pointer === 'fine' ? 'mouse' : 'touch'}`],
          ['Viewport', `${env.viewport} @${env.pixelRatio}x`],
          ['Safe areas', `top ${sa.top} · bottom ${sa.bottom} · left ${sa.left} · right ${sa.right}`],
          ['Offline support', env.serviceWorker ? 'Active' : env.secureContext ? 'Not active yet (reload once)' : 'Needs HTTPS'],
          ['Word splitting', env.segmenter ? 'Intl.Segmenter available' : 'Missing'],
        ]}
      />
    </LabCard>
  );
}

export function StorageCard() {
  const translateUi = useUi();
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const [requested, setRequested] = useState<boolean | null>(null);
  const record = useLabReport((s) => s.record);

  useEffect(() => {
    void getStorageInfo().then((i) => {
      setInfo(i);
      record('storage', i);
    });
  }, [record]);

  return (
    <LabCard icon={HardDrive} title={translateUi('Storage')} description={translateUi('Whether the browser promises to keep Lingua’s data.')}>
      {info && (
        <Facts
          rows={[
            ['Used', formatBytes(info.usage)],
            ['Available', formatBytes(info.quota)],
            ['Protected', info.persisted ? 'Yes' : 'No'],
          ]}
        />
      )}
      <div className="mt-3 flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            const granted = await requestPersistence();
            setRequested(granted);
            record('persistRequest', granted);
            setInfo(await getStorageInfo());
          }}
        ><UiText source={'Request protection'} /></Button>
        {requested !== null && <Badge tone={requested ? 'sage' : 'accent'}>{requested ? translateUi('Granted') : translateUi('Declined')}</Badge>}
      </div>
    </LabCard>
  );
}

export function ShareCard() {
  const translateUi = useUi();
  const [result, setResult] = useState<string | null>(null);
  const record = useLabReport((s) => s.record);
  const file = useMemo(() => new File(['Hello from Lingua.\n'], 'lingua-share-test.txt', { type: 'text/plain' }), []);
  const supported = typeof navigator.canShare === 'function' && canShareFile(file);

  return (
    <LabCard icon={Share2} title={translateUi('Share sheet')} description={translateUi('Used to send backups to AirDrop or Files.')}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!supported}
          onClick={async () => {
            try {
              const r = await shareFile(file, 'Lingua share test');
              setResult(r === 'shared' ? 'Shared' : 'Cancelled');
              record('shareFiles', r);
            } catch (error) {
              setResult(`Failed: ${(error as Error).message}`);
              record('shareFiles', 'failed');
            }
          }}
        ><UiText source={'Share a test file'} /></Button>
        <Badge tone={supported ? 'sage' : 'neutral'}>{supported ? translateUi('Supported') : translateUi('Not supported here')}</Badge>
        {result && <span className="text-sm text-ink-soft">{result}</span>}
      </div>
    </LabCard>
  );
}

const STRESS_SAMPLE = 'Я́ люблю́ чита́ть кни́ги.';

export function WordsCard({ lang }: { lang: string }) {
  const translateUi = useUi();
  const [text, setText] = useState(() => `${getLanguage(lang)?.sample ?? LANGUAGES[0].sample} ${lang === 'ru' ? STRESS_SAMPLE : ''}`.trim());
  const tokens = useMemo(() => tokenize(text, lang), [text, lang]);
  const words = tokens.filter((t) => t.isWord);

  return (
    <LabCard icon={Type} title={translateUi('Words & scripts')} description={translateUi('How Lingua splits text into words for the reader. Tap a word to see its saved form.')}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        lang={lang}
        className="w-full resize-y rounded-xl border border-line bg-raised px-3.5 py-2.5 font-serif text-[16px] leading-relaxed"
      />
      <div className="mt-3 flex flex-wrap gap-1.5" lang={lang}>
        {words.map((t, i) => (
          <span key={i} title={t.norm} className="rounded-lg bg-surface px-2 py-1 font-serif text-[15px]">
            {t.text}
            {t.norm !== t.text && <span className="ml-1.5 font-sans text-[11px] text-ink-faint">{t.norm}</span>}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[13px] text-ink-soft"><UiText source={'{0} words'} values={[words.length]} /></p>
    </LabCard>
  );
}

const SHEET_ROWS = Array.from({ length: 24 }, (_, i) => i + 1);

export function SheetCard() {
  const translateUi = useUi();
  const [open, setOpen] = useState(false);
  const { layout } = useLayout();
  return (
    <LabCard
      icon={PanelBottom}
      title={translateUi('Drawers & sheets')}
      description={
        layout === 'wide'
          ? translateUi('Opens as a slide-over panel on wide screens. Esc or a click outside closes it.')
          : translateUi('Drag the handle down to dismiss; the list inside should scroll without moving the page behind.')
      }
    >
      <Button variant="secondary" onClick={() => setOpen(true)}><UiText source={'Open {0}'} values={[layout === 'wide' ? <UiText source={'slide-over'} /> : <UiText source={'bottom sheet'} />]} /></Button>
      <Drawer open={open} onClose={() => setOpen(false)} title={translateUi('Word details')} description={translateUi('A sample of how the word drawer will feel.')}>
        <ul className="divide-y divide-line">
          {SHEET_ROWS.map((n) => (
            <li key={n} className="py-3 text-[15px]"><UiText source={'Row {0}'} values={[n]} /></li>
          ))}
        </ul>
      </Drawer>
    </LabCard>
  );
}

export function LongPressCard() {
  const translateUi = useUi();
  const [taps, setTaps] = useState(0);
  const [presses, setPresses] = useState(0);
  const [flash, setFlash] = useState(false);
  const record = useLabReport((s) => s.record);
  const handlers = useLongPress(
    () => {
      setPresses((n) => n + 1);
      record('longPress', true);
      setFlash(true);
      window.setTimeout(() => setFlash(false), 400);
    },
    { onTap: () => setTaps((n) => n + 1) },
  );

  return (
    <LabCard icon={Hand} title={translateUi('Long-press')} description={translateUi('Hold the word. No copy menu or text selection should appear.')}>
      <div className="flex flex-wrap items-center gap-4">
        <span
          {...handlers}
          className={cx(
            'no-callout cursor-pointer rounded-xl px-4 py-2 font-serif text-2xl transition-[background-color,transform] duration-200',
            flash ? 'scale-105 bg-accent-soft' : 'bg-surface',
          )}
        >
          слово · λέξη
        </span>
        <span className="text-sm text-ink-soft"><UiText source={'Taps: {0} · Long-presses: {1}'} values={[<strong className="text-ink">{taps}</strong>, <strong className="text-ink">{presses}</strong>]} /></span>
      </div>
    </LabCard>
  );
}
