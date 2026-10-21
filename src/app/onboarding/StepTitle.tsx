import { cx } from '@/lib/cx';

export function StepTitle({ title, body, center = false }: { title: string; body: string; center?: boolean }) {
  return (
    <div className={cx('mb-7', center && 'text-center')}>
      <h1 className="font-serif text-[30px] leading-tight font-semibold tracking-tight sm:text-[36px]">{title}</h1>
      <p className="mt-2 text-[15px] text-ink-soft">{body}</p>
    </div>
  );
}
