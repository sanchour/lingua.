import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Check, ChevronDown, ExternalLink, Eye, EyeOff, KeyRound } from 'lucide-react';
import { getLanguage } from '@/core/lang/languages';
import { COUNTRIES, countryName, servicesFor } from '@/core/mundus/services';
import type { StreamingService } from '@/core/mundus/services';
import { patchSetting } from '@/data/settings';
import { Button, Card, Select } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { useLiveLists, useStreaming } from '@/features/mundus/hooks';
import { ServiceMark } from '@/features/mundus/ServiceBadge';
import { checkToken, isV3Key, posterUrl } from '@/services/mundus/tmdb';
import type { TmdbTitle } from '@/services/mundus/tmdb';
import { TitleSheet } from './TitleSheet';
import type { SheetTitle } from './TitleSheet';

const label = 'text-[12px] font-bold tracking-[0.14em] text-ink-faint uppercase';
const enter = (i: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { ...spring.soft, delay: 0.03 * Math.min(i, 12) } });

/**
 * Visio › Services (Lingua 3.0-7): the streaming services you have and your country; with a free
 * TMDB key, live lists of series and films made in the language that stream on them, with posters.
 * Each title opens in its service's app, and its subtitles can be added to Visio.
 */
export function ServicesTab({ lang }: { lang: string }) {
  const { services, country, token } = useStreaming();
  const name = getLanguage(lang)?.name ?? lang;
  const [sheet, setSheet] = useState<SheetTitle | null>(null);
  const lists = useLiveLists(lang, country, services, token);

  return (
    <div className="space-y-10">
      <ChooseServices lang={lang} services={services} country={country} />
      {token ? (
        services.length ? (
          <>
            <TitleGrid title={`Series in ${name}`} titles={lists.tv} loading={lists.loading} error={lists.error} onOpen={(t) => setSheet({ tmdb: t })} country={country} />
            <TitleGrid title={`Films in ${name}`} titles={lists.movie} loading={lists.loading} error={null} onOpen={(t) => setSheet({ tmdb: t })} country={country} />
          </>
        ) : null
      ) : (
        <TmdbInvite />
      )}
      {token && <TmdbConnected />}
      <TitleSheet lang={lang} title={sheet} onClose={() => setSheet(null)} />
    </div>
  );
}

function ChooseServices({ lang, services, country }: { lang: string; services: string[]; country: string }) {
  const [more, setMore] = useState(false);
  const { main, more: rest } = useMemo(() => servicesFor(lang, country, services), [lang, country, services]);
  const toggle = (id: string) => void patchSetting('streaming', { services: services.includes(id) ? services.filter((s) => s !== id) : [...services, id] });
  const countries = useMemo(
    () =>
      [...new Set<string>([...COUNTRIES, country])]
        .map((c) => ({ value: c, label: countryName(c) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [country],
  );

  return (
    <section aria-label="Your services">
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-[22px] font-semibold">Your services</h2>
          <p className="mt-1 max-w-xl text-[14px] text-ink-soft">Tap the ones you have. Mundus’s picks and the lists below show what’s on them.</p>
        </div>
        <div className="w-full sm:w-60">
          <Select label="Your country" value={country} onChange={(c) => void patchSetting('streaming', { country: c })} options={countries} />
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {main.map((s, i) => (
          <motion.li key={s.id} {...enter(i)}>
            <ServiceToggle service={s} on={services.includes(s.id)} onToggle={() => toggle(s.id)} />
          </motion.li>
        ))}
      </ul>
      {rest.length > 0 && (
        <>
          <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="hit mt-3 inline-flex items-center gap-1 text-[13.5px] font-semibold text-ink-soft hover:text-ink">
            {more ? 'Fewer services' : `More services (${rest.length})`} <ChevronDown size={15} className={cx('transition-transform', more && 'rotate-180')} aria-hidden />
          </button>
          {more && (
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {rest.map((s) => (
                <li key={s.id}>
                  <ServiceToggle service={s} on={services.includes(s.id)} onToggle={() => toggle(s.id)} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function ServiceToggle({ service, on, onToggle }: { service: StreamingService; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={cx(
        'no-callout flex h-14 w-full items-center gap-3 rounded-2xl border px-3 text-left transition-[background-color,border-color,transform] duration-150 active:scale-[0.98]',
        on ? 'border-sage/60 bg-sage-soft' : 'border-line/70 bg-surface hover:border-line-strong',
      )}
    >
      <ServiceMark service={service} size={30} />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-[14px] leading-tight font-semibold">{service.name}</span>
        {service.free && <span className="block text-[11.5px] font-semibold text-ink-faint">Free</span>}
      </span>
      <span className={cx('grid size-5 shrink-0 place-items-center rounded-full border-2', on ? 'border-sage bg-sage text-on-accent' : 'border-line-strong')}>
        {on && <Check size={12} strokeWidth={3} aria-hidden />}
      </span>
    </button>
  );
}

function TitleGrid({ title, titles, loading, error, onOpen, country }: { title: string; titles: TmdbTitle[]; loading: boolean; error: string | null; onOpen: (t: TmdbTitle) => void; country: string }) {
  return (
    <section aria-label={title}>
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="font-serif text-[22px] font-semibold">{title}</h2>
        <span className="text-[13px] font-semibold text-ink-faint">on your services in {countryName(country)}</span>
      </div>
      {error ? (
        <p className="text-[14.5px] text-ink-soft">{error}</p>
      ) : loading && !titles.length ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="aspect-[2/3] animate-pulse rounded-2xl bg-sunken" />
          ))}
        </div>
      ) : titles.length ? (
        <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-6">
          {titles.slice(0, 18).map((t, i) => (
            <motion.li key={t.id} {...enter(i)}>
              <button type="button" onClick={() => onOpen(t)} className="group block w-full text-left">
                <Poster title={t} />
                <span className="mt-2 line-clamp-2 block text-[13.5px] leading-snug font-semibold">{t.title}</span>
                {t.year && <span className="block text-[12px] text-ink-faint tabular-nums">{t.year}</span>}
              </button>
            </motion.li>
          ))}
        </ul>
      ) : (
        <p className="text-[14.5px] text-ink-soft">Nothing made in this language on your services here right now. Add another service above, or try the free ones.</p>
      )}
    </section>
  );
}

function Poster({ title }: { title: TmdbTitle }) {
  const src = posterUrl(title.posterPath, 'w342');
  return src ? (
    <img src={src} alt="" loading="lazy" decoding="async" className="aspect-[2/3] w-full rounded-2xl object-cover shadow-elev-1 transition-transform duration-200 group-hover:-translate-y-0.5" />
  ) : (
    <span className="grid aspect-[2/3] w-full place-items-center rounded-2xl bg-sunken p-2 text-center font-serif text-[14px] font-semibold text-ink-soft">{title.title}</span>
  );
}

function TmdbInvite() {
  const [token, setToken] = useState('');
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const connect = async () => {
    const value = token.trim();
    if (isV3Key(value)) {
      setStatus('That’s TMDB’s short “API Key”. Lingua needs the long “API Read Access Token” from the same page, so the key travels in a header and never in a web address.');
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      if (await checkToken(value)) await patchSetting('apiKeys', { tmdb: value });
      else setStatus('TMDB didn’t accept that token. Copy the whole “API Read Access Token” (it starts with eyJ).');
    } catch {
      setStatus('TMDB couldn’t be reached. Check the connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5 sm:p-7">
      <div className="flex items-start gap-4">
        <span className="hidden size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-text sm:grid" aria-hidden>
          <KeyRound size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={label}>Live lists</p>
          <h2 className="mt-1 font-serif text-[22px] leading-snug font-semibold">See what’s on your services, in the language</h2>
          <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-ink-soft">
            With a free key from TMDB (The Movie Database), Visio lists series and films made in the language that stream on your services in your country, with posters, and Mundus shows where each pick
            is on. The key stays on this device.
          </p>
          <ol className="mt-3 space-y-1 text-[14px] text-ink-soft">
            <li>1. Make a free account at themoviedb.org.</li>
            <li>2. Settings › API: ask for a free developer key (personal use).</li>
            <li>3. Copy the “API Read Access Token” and paste it here.</li>
          </ol>
          <div className="mt-4 flex gap-2">
            <div className="relative min-w-0 flex-1">
              <label htmlFor="tmdb-token" className="sr-only">
                TMDB API Read Access Token
              </label>
              <input
                id="tmdb-token"
                type={reveal ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && token.trim() && void connect()}
                autoComplete="off"
                spellCheck={false}
                placeholder="eyJhbGciOi…"
                className="h-11 w-full rounded-xl border border-line bg-raised pr-11 pl-3.5 font-mono text-[14px] transition-colors hover:border-line-strong"
              />
              <button type="button" onClick={() => setReveal((r) => !r)} aria-label={reveal ? 'Hide token' : 'Show token'} className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-ink-faint hover:text-ink">
                {reveal ? <EyeOff size={17} aria-hidden /> : <Eye size={17} aria-hidden />}
              </button>
            </div>
            <Button variant="secondary" onClick={() => void connect()} loading={busy} disabled={!token.trim()}>
              Connect
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]">
            <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" className="hit inline-flex items-center gap-1 font-semibold text-accent-text hover:underline">
              TMDB’s API settings <ExternalLink size={13} aria-hidden />
            </a>
          </div>
          {status && <p className="mt-3 text-[13.5px] font-semibold text-accent-text">{status}</p>}
        </div>
      </div>
    </Card>
  );
}

function TmdbConnected() {
  return (
    <p className="flex flex-wrap items-center gap-2 text-[13px] text-ink-faint">
      Lists and posters from TMDB (The Movie Database); where to watch comes from JustWatch through TMDB.
      <button type="button" onClick={() => void patchSetting('apiKeys', { tmdb: '' })} className="hit font-semibold text-ink-soft underline-offset-2 hover:underline">
        Remove the TMDB key
      </button>
    </p>
  );
}
