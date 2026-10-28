// Mundus, the guide: from what the learner did this week, their level and what they enjoy, where to
// go next and why. Pure: the screens gather the signals (features/mundus/useGuide.ts) and draw this.
import type { Level } from '@/core/lang/levels';
import { tipOfTheDay } from '@/core/mundus/tips';
import type { Tip } from '@/core/mundus/tips';
import { withinReach } from '@/core/mundus/types';
import type { Pick, PickGroup, PickLevel, Picks } from '@/core/mundus/types';
import type { Enjoyment } from '@/data/settings';

/** The ways into a language that the guide balances. */
export type Lane = 'read' | 'listen' | 'watch' | 'words' | 'write' | 'speak';
export const LANES: Lane[] = ['read', 'listen', 'watch', 'words', 'write', 'speak'];
/** Minutes per lane over the last seven days. */
export type Week = Record<Lane, number>;

export const LANE_NAME: Record<Lane, string> = { read: 'Read', listen: 'Listen', watch: 'Watch', words: 'Words', write: 'Write', speak: 'Speak' };
const NOUN: Record<Lane, string> = { read: 'reading', listen: 'listening', watch: 'watching', words: 'word practice', write: 'writing', speak: 'speaking' };

/** Activity sessions (`ActivitySession.type`) by lane. */
export const SESSION_LANE: Record<string, Lane> = { read: 'read', listen: 'listen', sing: 'listen', watch: 'watch', review: 'words', ludus: 'words', write: 'write', speak: 'speak' };
const ENJOY_LANE: Record<Enjoyment, Lane> = { reading: 'read', listening: 'listen', music: 'listen', watching: 'watch', writing: 'write', speaking: 'speak', cards: 'words' };
/** Lanes the guide steers toward only for those who said they enjoy them (talking happens in the learner's own AI app, so Lingua can't time it). */
const OPT_IN: Lane[] = ['write', 'speak'];

export const emptyWeek = (): Week => ({ read: 0, listen: 0, watch: 0, words: 0, write: 0, speak: 0 });

export interface Steer {
  /** Where to go next. */
  lane: Lane;
  /** start: barely begun this week · quiet: nothing in this lane yet · balance: the quietest lane · asked: the learner said so. */
  why: 'start' | 'quiet' | 'balance' | 'asked';
  /** The lane with the most time this week. */
  top?: Lane;
}

/**
 * The lane to steer toward: the quietest part of the week, leaning toward what the learner enjoys
 * (writing and speaking only count for those who said they like them). A week barely begun starts
 * with the favourite.
 */
export function steer(week: Week, enjoys: readonly Enjoyment[]): Steer {
  const liked = [...new Set(enjoys.map((e) => ENJOY_LANE[e]))];
  const total = LANES.reduce((n, l) => n + week[l], 0);
  if (total < 10) return { lane: liked[0] ?? 'listen', why: 'start' };
  const top = LANES.reduce((a, b) => (week[b] > week[a] ? b : a));
  const pool = LANES.filter((l) => l !== top && (!OPT_IN.includes(l) || liked.includes(l)));
  const pull = (l: Lane) => (liked.includes(l) ? 0.12 - liked.indexOf(l) * 0.02 : 0);
  const score = (l: Lane) => week[l] / total - pull(l);
  const lane = pool.reduce((a, b) => (score(b) < score(a) ? b : a));
  return { lane, why: week[lane] === 0 ? 'quiet' : 'balance', top };
}

// ── Stages ─────────────────────────────────────────────────────────────────

export interface Stage {
  id: 'start' | 'feet' | 'open' | 'deep';
  name: string;
  /** The first level of the stage, as shown on the path. */
  from: PickLevel;
  line: string;
}

export const STAGES: Stage[] = [
  { id: 'start', name: 'Starting out', from: 'A1', line: 'Sounds, first words and the joy of a whole sentence understood.' },
  { id: 'feet', name: 'Finding your feet', from: 'A2', line: 'Slow podcasts, short books and series with subtitles.' },
  { id: 'open', name: 'Opening up', from: 'B1', line: 'Real series, the news and your first novels.' },
  { id: 'deep', name: 'Going deep', from: 'B2', line: 'Anything you like, at full speed.' },
];

export function stageIndex(level: Level): number {
  return level === 'A0' || level === 'A1' ? 0 : level === 'A2' ? 1 : level === 'B1' ? 2 : 3;
}

const ORDER: PickLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

/** The level a "beyond the app" tip suits (most suit anyone). */
const TIP_LEVEL: Record<string, PickLevel> = {
  cook: 'A2', walk: 'A2', cafe: 'A2', meal: 'A2', radio: 'A2', memo: 'A2', game: 'A2', dub: 'A2',
  wiki: 'B1', trip: 'B1', partner: 'B1',
};
export const tipLevel = (tip: { id: string }): PickLevel => TIP_LEVEL[tip.id] ?? 'A1';

/** Tips for the learner's stage now, and those that open up later. */
export function tipsByReach(tips: readonly Tip[], level: Level): { now: Tip[]; later: Tip[] } {
  const now: Tip[] = [];
  const later: Tip[] = [];
  for (const t of tips) (withinReach(tipLevel(t), level) ? now : later).push(t);
  return { now, later };
}

// ── Picks by lane ──────────────────────────────────────────────────────────

const LANE_GROUPS: Record<Lane, PickGroup[]> = { read: ['books'], listen: ['podcasts'], watch: ['series', 'films', 'youtube'], words: [], write: [], speak: [] };

/** A pick for the lane within reach, a different one each day. */
export function lanePick(picks: Picks | null, lane: Lane, level: Level, day: number): { pick: Pick; group: PickGroup } | undefined {
  if (!picks) return undefined;
  const pool = LANE_GROUPS[lane].flatMap((group) => picks[group].filter((p) => withinReach(p.level, level)).map((pick) => ({ pick, group })));
  return pool.length ? pool[day % pool.length] : undefined;
}

/** Picks one level beyond reach: what the next stage opens up. */
export function nextLevelPicks(picks: Picks | null, level: Level, count = 4): Array<{ pick: Pick; group: PickGroup }> {
  if (!picks) return [];
  const reach = Math.max(1, ORDER.indexOf(level as PickLevel) + 1);
  const next = ORDER[reach + 1];
  if (!next) return [];
  const groups: PickGroup[] = ['series', 'books', 'films', 'podcasts'];
  const lists = groups.map((group) => picks[group].filter((p) => p.level === next).map((pick) => ({ pick, group })));
  // Round-robin across kinds, so a stage is shown by more than its films.
  const out: Array<{ pick: Pick; group: PickGroup }> = [];
  for (let i = 0; out.length < count && lists.some((l) => l[i]); i++) for (const l of lists) if (l[i] && out.length < count) out.push(l[i]);
  return out;
}

// ── Next steps ─────────────────────────────────────────────────────────────

export type Step =
  | { key: string; type: 'pick'; lane: Lane; pick: Pick; group: PickGroup; reason: string; minutes?: number }
  | { key: string; type: 'room'; lane: Lane; title: string; to: string; action: string; reason: string; minutes?: number }
  | { key: string; type: 'tip'; tip: Tip; reason: string; minutes?: number }
  | { key: string; type: 'grammar'; title: string; to: string; reason: string; minutes?: number };

// ── Replies (5.2-7): what the learner says back to Mundus, kept for the day ──

export interface Replies {
  /** The day they belong to (YYYY-MM-DD); another day starts again. */
  date: string;
  /** "I'd rather listen": the lane the learner asked for. */
  lane?: Lane;
  /** "Something shorter": five-minute steps. */
  short?: boolean;
  /** How many times "Not today" was said: each moves the day's picks along. */
  skips: number;
  /** The reply Mundus answers in its line. */
  last?: 'lane' | 'short' | 'why' | 'skip';
}

export const noReplies = (date: string): Replies => ({ date, skips: 0 });

/** The lanes a learner can ask for instead (the ones Mundus finds things for). */
export const ASKABLE: Lane[] = ['read', 'listen', 'watch'];
const ASK_VERB: Partial<Record<Lane, string>> = { read: 'read', listen: 'listen to', watch: 'watch' };
export const askLabel = (lane: Lane) => `I’d rather ${lane}`;

export type Say = { kind: 'lane'; lane: Lane } | { kind: 'short' } | { kind: 'why' } | { kind: 'skip' } | { kind: 'reset' };

/** What a reply changes in the replies kept for the day. */
export function reply(prev: Replies, say: Say, date: string): Replies {
  const base = prev.date === date ? prev : noReplies(date);
  switch (say.kind) {
    case 'lane':
      return { ...base, lane: say.lane, last: 'lane' };
    case 'short':
      return { ...base, short: !base.short, last: base.short ? undefined : 'short' };
    case 'why':
      return { ...base, last: 'why' };
    case 'skip':
      return { ...base, skips: base.skips + 1, last: 'skip' };
    case 'reset':
      return noReplies(date);
  }
}

export interface GuideInput {
  level: Level;
  enjoys: readonly Enjoyment[];
  week: Week;
  picks: Picks | null;
  tips: readonly Tip[];
  /** Tips done on an earlier day (today's stay put once ticked). */
  doneTips: ReadonlySet<string>;
  /** Whether the learner has anything in each room yet. */
  used: { codex: boolean; sonus: boolean; visio: boolean; thesaurus: boolean };
  grammar?: { id: string; title: string };
  /** What the learner read or watched last this week, so a speak or write step can be about it. */
  recent?: { title: string; lane: 'read' | 'watch' | 'listen' };
  /** Days since the epoch: picks and tips rotate daily. */
  day: number;
  /** What the learner said back today (5.2-7). */
  replies?: Replies;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function steerReason(s: Steer): string {
  if (s.why === 'asked') return `You asked for something to ${ASK_VERB[s.lane] ?? s.lane} today.`;
  if (s.why === 'start') return 'A good way to begin the week, with what you enjoy.';
  if (s.why === 'quiet') return `Lots of ${NOUN[s.top!]} this week and no ${NOUN[s.lane]} yet.`;
  return `${cap(NOUN[s.lane])} has been the quietest part of your week.`;
}

/** Where a lane goes when there is no pick for it (or it isn't about picks). */
const LANE_ROOM: Record<Lane, { title: string; to: string; action: string }> = {
  read: { title: 'Read today’s news', to: '/codex/new?way=news', action: 'Open the news' },
  listen: { title: 'Find a podcast you like', to: '/sonus?tab=podcasts', action: 'Browse podcasts' },
  watch: { title: 'Find a series on your services', to: '/sonus?tab=streaming', action: 'Open Services' },
  words: { title: 'Take a ready-made deck', to: '/thesaurus?tab=discover', action: 'Choose a deck' },
  write: { title: 'Write five lines in Diarium', to: '/mentis/diarium', action: 'Open Diarium' },
  speak: { title: 'Talk for five minutes in Sermo', to: '/mentis/sermo', action: 'Open Sermo' },
};

/** The lane's room step; speaking and writing are about what the learner read or watched this week when there is something. */
export function laneRoom(lane: Lane, recent?: GuideInput['recent']): { title: string; to: string; action: string } {
  if (recent && lane === 'speak') return { title: `Talk about ${recent.title} for five minutes`, to: `/mentis/sermo?topic=${encodeURIComponent(recent.title)}`, action: 'Open Sermo' };
  if (recent && lane === 'write') return { title: `Write three lines about ${recent.title}`, to: `/mentis/diarium?about=${encodeURIComponent(recent.title)}`, action: 'Open Diarium' };
  return LANE_ROOM[lane];
}

const FIRST_TIME: Array<{ room: keyof GuideInput['used']; lane: Lane; title: string; to: string; action: string; reason: string }> = [
  { room: 'visio', lane: 'watch', title: 'Watch something with its subtitles', to: '/sonus?tab=streaming', action: 'Open Streaming', reason: 'You haven’t watched anything in Sonus et Visio yet: with subtitles, a series becomes a lesson.' },
  { room: 'sonus', lane: 'listen', title: 'Follow a podcast', to: '/sonus?tab=podcasts', action: 'Open Sonus et Visio', reason: 'Nothing to listen to yet: a podcast at your level fits into a walk or the dishes.' },
  { room: 'codex', lane: 'read', title: 'Put something on your shelf', to: '/codex/new', action: 'Open Codex', reason: 'Codex is empty: an article or a short book, and every word is a tap away.' },
  { room: 'thesaurus', lane: 'words', title: 'Start your first deck', to: '/thesaurus?tab=discover', action: 'Open Thesaurus', reason: 'No decks yet: the most common words make everything else easier.' },
];

/**
 * Three next steps: something to enjoy in the lane the week needs, something to try away from the
 * screen, and a way to grow (the next grammar topic, a room not tried yet, or a stretch).
 */
export function nextSteps(input: GuideInput): Step[] {
  const r = input.replies;
  const s = guideSteer(input);
  // "Not today" moves the day's picks and tips along, so what comes up is something else.
  const day = input.day + (r?.skips ?? 0);
  const short = Boolean(r?.short);
  const steps: Step[] = [];
  const pick = short ? undefined : lanePick(input.picks, s.lane, input.level, day);
  const why = steerReason(s);
  if (pick) steps.push({ key: `pick:${pick.pick.title}`, type: 'pick', lane: s.lane, ...pick, reason: why });
  else steps.push({ key: `room:${s.lane}`, type: 'room', lane: s.lane, ...(short ? SHORT_ROOM[s.lane] : laneRoom(s.lane, input.recent)), reason: short ? `Five minutes is enough. ${why}` : why });

  const { now } = tipsByReach(input.tips, input.level);
  const tip = tipOfTheDay(now, input.doneTips, day);
  if (tip) steps.push({ key: `tip:${tip.id}`, type: 'tip', tip, reason: 'Something to try away from the screen today.' });

  const fresh = FIRST_TIME.find((f) => !input.used[f.room] && f.lane !== s.lane);
  if (input.grammar && (!fresh || input.day % 2 === 0)) {
    steps.push({ key: `grammar:${input.grammar.id}`, type: 'grammar', title: input.grammar.title, to: `/cursus/grammatica/${encodeURIComponent(input.grammar.id)}`, reason: 'Your next topic in Grammatica: a few examples, then try it.' });
  } else if (fresh) {
    steps.push({ key: `room:${fresh.room}`, type: 'room', lane: fresh.lane, title: fresh.title, to: fresh.to, action: fresh.action, reason: fresh.reason });
  } else {
    const stretch = nextLevelPicks(input.picks, input.level, 8)[day % 8];
    if (stretch) steps.push({ key: `pick:${stretch.pick.title}`, type: 'pick', lane: stretch.group === 'books' ? 'read' : stretch.group === 'podcasts' ? 'listen' : 'watch', ...stretch, reason: `A stretch: it’s ${stretch.pick.level}, a step above you. Worth a try.` });
  }
  return short ? steps.map((st) => ({ ...st, minutes: 5 })) : steps;
}

/** The steer the guide follows: what the learner asked for, else the quietest part of the week. */
export function guideSteer(input: { week: Week; enjoys: readonly Enjoyment[]; replies?: Replies }): Steer {
  const s = steer(input.week, input.enjoys);
  return input.replies?.lane ? { lane: input.replies.lane, why: 'asked', top: s.top } : s;
}

/** The five-minute way into each lane, for "Something shorter". */
const SHORT_ROOM: Record<Lane, { title: string; to: string; action: string }> = {
  read: { title: 'Read one short article', to: '/codex/new?way=news', action: 'Open the news' },
  listen: { title: 'Five minutes of a podcast', to: '/sonus?tab=podcasts', action: 'Open podcasts' },
  watch: { title: 'One short clip, with subtitles', to: '/visio', action: 'Open Visio' },
  words: { title: 'Five minutes of review', to: '/thesaurus', action: 'Review words' },
  write: { title: 'Write three lines', to: '/mentis/diarium', action: 'Open Diarium' },
  speak: { title: 'Say it out loud for five minutes', to: '/mentis/sermo', action: 'Open Sermo' },
};

/** Mundus's line after a reply (5.2-7); the day's note until the learner says something. */
export function replyLine(replies: Replies | undefined, s: Steer, note: string): string {
  switch (replies?.last) {
    case 'lane':
      return `Gladly: something to ${ASK_VERB[s.lane] ?? s.lane}. The steps below follow.`;
    case 'short':
      return 'Five minutes is enough. Here are the short ways in.';
    case 'why':
      return s.why === 'asked' ? `${steerReason(s)} The steps below follow it.` : `${steerReason(s)} It fills in what the rest of the week leaves out.`;
    case 'skip':
      return 'Not today, then. Here is something else.';
    default:
      return note;
  }
}

/** The guide's note at the top: how the week went, and where the learner stands. */
export function guideNote(week: Week, s: Steer, langName: string): string {
  const total = Math.round(LANES.reduce((n, l) => n + week[l], 0));
  if (s.why === 'start') return `A fresh week of ${langName}. Here’s where to go next, picked for your level and what you enjoy.`;
  const mostly = s.top ? `, mostly ${NOUN[s.top]}` : '';
  return `${total} minutes of ${langName} this week${mostly}. Next, a little ${NOUN[s.lane]}: it fills in what the rest leaves out.`;
}
