import { Flag as FlagIcon } from 'lucide-react';
import { LANGUAGES } from '@/core/lang/languages';
import { Flag, flagName } from '@/design/flags';
import { LabCard } from './LabCard';

/** Every flag at the sizes the app uses, to check them on this screen. */
export function FlagsCard() {
  const codes = [...new Set(LANGUAGES.flatMap((l) => l.flags))];
  return (
    <LabCard icon={FlagIcon} title="Flags" description={`${codes.length} flags for ${LANGUAGES.length} languages, at 36, 24 and 18 px.`}>
      <ul className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
        {codes.map((code) => (
          <li key={code} className="flex min-w-0 items-center gap-2">
            <Flag code={code} width={36} />
            <Flag code={code} width={24} />
            <Flag code={code} width={18} />
            <span className="truncate text-[13px] text-ink-soft">{flagName(code)}</span>
          </li>
        ))}
      </ul>
    </LabCard>
  );
}
