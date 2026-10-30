import type { UiMessage } from '@/core/i18n/types';
import { createContext, createElement, Fragment, isValidElement, useCallback, useContext } from 'react';
import type { ReactNode } from 'react';
import { englishSource, englishUiMessage, formatUiMessage, interpolate, message } from '@/core/i18n/messages';
export const UiLocale = createContext('en');
export function useUi() {
  const locale = useContext(UiLocale);
  return useCallback((source: string, values: readonly unknown[] = []) => interpolate(message(locale, source), values), [locale]);
}
function plain(value: ReactNode): string {
  if (value === null || value === undefined || typeof value === 'boolean') return '';
  if (Array.isArray(value)) return value.map(plain).join('');
  if (isValidElement<{ source?: string; values?: ReactNode[]; children?: ReactNode }>(value)) return value.props.source ? interpolate(value.props.source, value.props.values?.map(plain)) : plain(value.props.children);
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}
export function UiText({ source, values = [] }: { source: string; values?: ReactNode[] }) {
  const locale = useContext(UiLocale);
  source = englishSource(locale, source);
  const english = interpolate(source, values.map(plain));
  const occurrences = new Map<number, number>();
  const parts = message(locale, source).split(/(\{\d+\})/g).map((part, i) => {
    if (/^\{\d+\}$/.test(part)) {
      const slot = Number(part.slice(1, -1));
      const occurrence = occurrences.get(slot) ?? 0;
      occurrences.set(slot, occurrence + 1);
      return createElement(Fragment, { key: `slot-${slot}-${occurrence}` }, slot < values.length ? values[slot] : part);
    }
    return locale === 'en' ? part : <span key={`text-${i}`} lang={locale} dir="auto" title={english}>{part}</span>;
  });
  if (locale === 'ar' && values.every((value) => value == null || ['string', 'number', 'boolean'].includes(typeof value))) return <bdi lang="ar" dir="rtl" title={english}>{parts}</bdi>;
  return createElement(Fragment, null, ...parts);
}

export function UiMessageText({ message: value }: { message: string | UiMessage }) {
  const locale = useContext(UiLocale);
  const localized = formatUiMessage(locale, value);
  return locale === 'en' ? createElement(Fragment, null, localized) : <bdi lang={locale} dir={locale === 'ar' ? 'rtl' : 'auto'} title={englishUiMessage(value)}>{localized}</bdi>;
}
