import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { LogoMark } from '@/app/shells/Wordmark';
import { spring } from '@/design/motion';

/** The fine line drawings' shared stroke. */
const LINE = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** An open book, drawn in one fine line. */
function OpenBook() {
  return (
    <svg viewBox="0 0 240 130" className="h-auto w-[300px] text-ink-soft" aria-hidden>
      <path {...LINE} d="M120 30C96 16 58 14 22 22V114C58 106 96 108 120 122C144 108 182 106 218 114V22C182 14 144 16 120 30Z" />
      <path {...LINE} d="M120 30V122" />
      {[44, 56, 68, 80, 92].map((y, i) => (
        <g key={y} opacity={0.55}>
          <path {...LINE} strokeWidth={1} d={`M38 ${y - 6}C${60} ${y - 10} ${84} ${y - 9} ${104} ${y - 2 - i * 0.2}`} />
          <path {...LINE} strokeWidth={1} d={`M136 ${y - 2 - i * 0.2}C${156} ${y - 9} ${180} ${y - 10} ${202} ${y - 6}`} />
        </g>
      ))}
      <path {...LINE} className="text-accent" stroke="currentColor" d="M170 4V40L178 34L186 40V6" />
    </svg>
  );
}

/** Three small vignettes in the same line: a page you can tap, a deck of cards, headphones and a frame. */
const VIGNETTES = [
  {
    title: 'Read anything',
    text: 'Books, articles and comics, with every word a tap away.',
    draw: (
      <>
        <rect {...LINE} x={14} y={6} width={44} height={56} rx={4} />
        {[18, 26, 34, 42, 50].map((y) => (
          <path key={y} {...LINE} strokeWidth={1} opacity={0.5} d={`M22 ${y}H${y === 34 ? 32 : 50}`} />
        ))}
        <rect x={34} y={31} width={16} height={6} rx={2} className="fill-accent/25" />
        <path {...LINE} className="text-accent" d="M44 40l3 9 2.5-3.5 4.5 4" />
      </>
    ),
  },
  {
    title: 'Keep every word',
    text: 'Your words become cards that come back just in time.',
    draw: (
      <>
        <rect {...LINE} x={22} y={10} width={36} height={48} rx={5} transform="rotate(10 40 34)" opacity={0.45} />
        <rect {...LINE} x={18} y={10} width={36} height={48} rx={5} transform="rotate(-4 36 34)" />
        <path {...LINE} strokeWidth={1} d="M26 30H46M28 38H44" opacity={0.55} transform="rotate(-4 36 34)" />
        <path {...LINE} className="text-accent" d="M30 22l3 3 6-6" transform="rotate(-4 36 34)" />
      </>
    ),
  },
  {
    title: 'Listen and watch',
    text: 'Podcasts, radio, films and shows, with text that follows.',
    draw: (
      <>
        <rect {...LINE} x={30} y={14} width={34} height={26} rx={3} opacity={0.6} />
        <path {...LINE} strokeWidth={1} d="M43 22v10l8-5z" opacity={0.6} />
        <path {...LINE} d="M10 48V40C10 28 18 20 28 20S46 28 46 40V48" />
        <rect {...LINE} x={7} y={44} width={9} height={14} rx={3} />
        <rect {...LINE} x={40} y={44} width={9} height={14} rx={3} />
        <path {...LINE} className="text-accent" d="M54 50c3-2 3-6 0-8M58 53c6-4 6-12 0-16" />
      </>
    ),
  },
];

/** What to call you (5.1-2b): one line, bookish and minimal. Enter moves on. */
export function NamePage({ name, onName, onEnter }: { name: string; onName: (name: string) => void; onEnter: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <LogoMark size={48} />
      <h1 className="mt-6 font-serif text-[40px] leading-[1.15] font-semibold tracking-tight">First things first.</h1>
      <p className="mt-2 text-[16.5px] text-ink-soft">What should we call you?</p>
      <input
        ref={input}
        value={name}
        onChange={(e) => onName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onEnter()}
        maxLength={40}
        autoComplete="given-name"
        aria-label="Your name"
        placeholder="Your name"
        className="mt-10 w-full max-w-sm border-b-2 border-line-strong bg-transparent pb-2 text-center font-serif text-[32px] transition-colors outline-none placeholder:text-ink-faint/50 focus:border-accent"
      />
      <p className="mt-3 text-[12.5px] text-ink-faint">It stays on this device. We just like to be polite.</p>
    </div>
  );
}

/** A line to smile at, picked by the name so it stays the same going back and forth. */
const QUIPS = [
  'Fair warning: you may start dreaming in another language.',
  'Your future self is already showing off about this.',
  'Put the kettle on. This is the start of a beautiful friendship.',
  'Somewhere, a grammar book just sighed with relief.',
];

/** Welcome, by name (5.1-2b): one funny line and the open book. */
export function WelcomePage({ name }: { name: string }) {
  const quip = QUIPS[[...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % QUIPS.length];
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.soft, delay: 0.1 }} className="max-w-2xl font-serif text-[44px] leading-[1.12] font-semibold tracking-tight text-balance">
        Welcome, {name.trim() || 'friend'}.
      </motion.h1>
      <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.soft, delay: 0.35 }} className="mt-3 max-w-md text-[16.5px] leading-relaxed text-ink-soft italic">
        {quip}
      </motion.p>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.55 }} className="mt-10">
        <OpenBook />
      </motion.div>
    </div>
  );
}

/** See what Lingua can do (5.1-2b): three things it does, in one fine line each. */
export function AboutPage() {
  return (
    <div className="py-6">
      <h1 className="text-center font-serif text-[36px] leading-tight font-semibold tracking-tight">See what Lingua can do</h1>
      <p className="mt-2 text-center text-[16px] text-ink-soft">Learn a language by living in it. Three things, done well.</p>
      <div className="mt-12 grid grid-cols-3 gap-10">
        {VIGNETTES.map((v, i) => (
          <motion.div key={v.title} className="flex flex-col items-center text-center" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.soft, delay: 0.08 * i }}>
            <svg viewBox="0 0 72 68" className="h-auto w-[120px] text-ink-soft" aria-hidden>
              {v.draw}
            </svg>
            <h2 className="mt-5 font-serif text-[20px] font-semibold">{v.title}</h2>
            <p className="mt-1.5 max-w-[15rem] text-[14px] leading-relaxed text-ink-soft">{v.text}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
