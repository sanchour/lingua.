// Printable monthly progress report (6-17, F1166, F1510, F1608).
// Elegant bookish layout designed for on-screen review and window.print() saving as PDF.

import { Printer, X } from 'lucide-react';
import { Button } from '@/design/primitives';

export interface MonthlyReportData {
  languageName: string;
  monthName: string;
  year: number;
  knownWords: number;
  newWordsMonth: number;
  hoursStudiedMonth: number;
  booksReadMonth: number;
  conversationsHeldMonth: number;
  currentStreak: number;
  stampsUnlocked: string[];
  skillsSummary: Array<{ name: string; hours: number; accuracy: number }>;
  recentReflection?: string;
}

export function MonthlyReportModal({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: MonthlyReportData;
}) {
  if (!open) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-surface p-6 shadow-2xl sm:p-8 print:max-h-none print:w-full print:p-0 print:shadow-none">
        {/* Screen controls */}
        <div className="mb-6 flex items-center justify-between border-b border-line pb-4 print:hidden">
          <div>
            <h2 className="font-serif text-[20px] font-semibold text-ink">Monthly Learning Report</h2>
            <p className="text-[13px] text-ink-soft">Print or save as a PDF for your personal records.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={Printer} onClick={handlePrint}>
              Print / Save PDF
            </Button>
            <Button variant="ghost" icon={X} onClick={onClose} aria-label="Close" />
          </div>
        </div>

        {/* Printable Document Body */}
        <article className="space-y-6 font-serif text-ink">
          {/* Document Header */}
          <header className="border-b-2 border-line-strong pb-4 text-center">
            <p className="font-sans text-[11px] font-bold tracking-widest text-ink-faint uppercase">
              Lingua · Language Learning Journal
            </p>
            <h1 className="mt-1 text-[28px] font-bold tracking-tight sm:text-[34px]">
              {data.languageName} Progress Report
            </h1>
            <p className="mt-1 text-[15px] italic text-ink-soft">
              {data.monthName} {data.year}
            </p>
          </header>

          {/* Key Figures Table */}
          <section>
            <h2 className="font-sans text-[12px] font-bold tracking-wider text-ink-faint uppercase">
              At a Glance
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-4 rounded-2xl border border-line p-4 sm:grid-cols-4">
              <div>
                <span className="block font-sans text-[11.5px] text-ink-soft">Total Known Words</span>
                <span className="text-[24px] font-semibold tabular-nums">{data.knownWords.toLocaleString()}</span>
                <span className="block font-sans text-[11px] text-sage">+{data.newWordsMonth} this month</span>
              </div>
              <div>
                <span className="block font-sans text-[11.5px] text-ink-soft">Study Time</span>
                <span className="text-[24px] font-semibold tabular-nums">{data.hoursStudiedMonth.toFixed(1)} h</span>
                <span className="block font-sans text-[11px] text-ink-faint">logged practice</span>
              </div>
              <div>
                <span className="block font-sans text-[11.5px] text-ink-soft">Books & Stories</span>
                <span className="text-[24px] font-semibold tabular-nums">{data.booksReadMonth}</span>
                <span className="block font-sans text-[11px] text-ink-faint">finished in Codex</span>
              </div>
              <div>
                <span className="block font-sans text-[11.5px] text-ink-soft">Active Streak</span>
                <span className="text-[24px] font-semibold tabular-nums">{data.currentStreak}</span>
                <span className="block font-sans text-[11px] text-ink-faint">days consistent</span>
              </div>
            </div>
          </section>

          {/* Skills Breakdown */}
          <section>
            <h2 className="font-sans text-[12px] font-bold tracking-wider text-ink-faint uppercase">
              Activity by Skill Area
            </h2>
            <div className="mt-3 overflow-hidden rounded-2xl border border-line">
              <table className="w-full text-left font-sans text-[13.5px]">
                <thead className="border-b border-line bg-raised font-bold text-ink-soft">
                  <tr>
                    <th className="p-3">Skill</th>
                    <th className="p-3 text-right">Hours</th>
                    <th className="p-3 text-right">Accuracy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.skillsSummary.map((s) => (
                    <tr key={s.name}>
                      <td className="p-3 font-medium text-ink">{s.name}</td>
                      <td className="p-3 text-right tabular-nums text-ink-soft">{s.hours.toFixed(1)} h</td>
                      <td className="p-3 text-right tabular-nums text-ink font-semibold">
                        {Math.round(s.accuracy * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Stamps Collected */}
          {data.stampsUnlocked.length > 0 && (
            <section>
              <h2 className="font-sans text-[12px] font-bold tracking-wider text-ink-faint uppercase">
                Milestones & Stamps Earned
              </h2>
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {data.stampsUnlocked.map((st) => (
                  <li
                    key={st}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line-strong bg-raised px-3 py-1 font-sans text-[12.5px] font-semibold text-ink"
                  >
                    <span>✦</span> {st}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Reflection */}
          {data.recentReflection && (
            <section className="rounded-2xl border border-line bg-raised p-4">
              <h2 className="font-sans text-[12px] font-bold tracking-wider text-ink-faint uppercase">
                Learner Reflection
              </h2>
              <blockquote className="mt-2 text-[14.5px] italic leading-relaxed text-ink-soft">
                "{data.recentReflection}"
              </blockquote>
            </section>
          )}

          {/* Document Footer */}
          <footer className="border-t border-line pt-4 text-center font-sans text-[11px] text-ink-faint">
            Generated by Lingua · Private on-device language learning · {new Date().toLocaleDateString()}
          </footer>
        </article>
      </div>
    </div>
  );
}
