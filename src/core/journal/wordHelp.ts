import { tokenize } from '@/core/text/tokenizer';

export const tokenAt = (text: string, offset: number, lang: string) => tokenize(text, lang).find((t) => t.isWord && t.start <= offset && offset < t.start + t.text.length)?.text;
