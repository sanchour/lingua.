import type { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { Badge, Card } from '@/design/primitives';
import { spring } from '@/design/motion';

interface ComingSoonProps {
  phase: number;
  title: string;
  body: string;
  features: Array<{ icon: LucideIcon; text: string }>;
}

/** Placeholder for sections that are built in a later phase. */
export function ComingSoon({ phase, title, body, features }: ComingSoonProps) {
  return (
    <Card className="p-6 md:p-8">
      <Badge tone="accent">Arrives in Phase {phase}</Badge>
      <h2 className="mt-3 font-serif text-2xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-prose leading-relaxed text-ink-soft">{body}</p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {features.map(({ icon: Icon, text }, i) => (
          <motion.li
            key={text}
            className="flex items-start gap-3 rounded-2xl border border-line/60 bg-raised p-4"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.soft, delay: 0.04 * i }}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sage-soft text-sage-text">
              <Icon size={18} aria-hidden />
            </span>
            <span className="pt-1.5 text-[15px] leading-snug">{text}</span>
          </motion.li>
        ))}
      </ul>
    </Card>
  );
}
