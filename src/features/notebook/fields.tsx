import type { ReactNode } from 'react';
import { UiText } from '@/design/i18n/UiText';
export const inputClass = 'mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent';
export function Field({ title, children }: { title: string; children: ReactNode }) { return <label className="block text-sm font-medium"><UiText source={title} />{children}</label>; }
