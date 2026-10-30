import { createContext, createElement, Fragment, isValidElement, useContext } from 'react';
import type { ReactNode } from 'react';
import { englishSource, interpolate, message } from '@/core/i18n/messages';
export const UiLocale = createContext('en');
export function useUi() {
  const locale = useContext(UiLocale);
  return (source: string, values: readonly unknown[] = []) => interpolate(message(locale, source), values);
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
  const parts = message(locale, source).split(/(\{\d+\})/g).map((part, i) => /^\{\d+\}$/.test(part) ? createElement(Fragment, { key: i }, values[Number(part.slice(1, -1))]) : locale === 'en' ? part : <span key={i} lang={locale} dir="auto" title={english}>{part}</span>);
  return createElement(Fragment, null, ...parts);
}
