// Which meaning a word has here, from the words around it. Dictionaries list senses by part of
// speech ("tarde": late (adverb) · afternoon, evening (noun)); the neighbours usually settle which
// one the sentence needs: after an article or "cada" it's a noun, after a subject pronoun or a
// negation a verb, after "muy" an adjective. Small, deliberate lists, one per language.

export type ContextPos = 'noun' | 'verb' | 'adj';

const words = (s: string) => new Set(s.split(/\s+/).filter(Boolean));

/** Articles, determiners, possessives and quantifiers: a noun follows. */
const NOUN_AFTER: Record<string, Set<string>> = {
  es: words('el la los las un una unos unas cada este esta estos estas ese esa esos esas aquel aquella mi mis tu tus su sus nuestro nuestra nuestros nuestras al del otro otra otros otras ningún ninguna algún alguna mucho mucha muchos muchas poco poca toda todo todos todas'),
  pt: words('o a os as um uma uns umas cada este esta estes estas esse essa esses essas aquele aquela meu minha meus minhas teu tua seu sua seus suas nosso nossa ao à aos às do da dos das no na nos nas pelo pela pelos pelas num numa outro outra muito muita'),
  fr: words("le la les l' un une des du au aux chaque ce cet cette ces mon ma mes ton ta tes son sa ses notre nos votre vos leur leurs quelque quelques plusieurs"),
  it: words("il lo la i gli le l' un uno una un' ogni questo questa questi queste quel quella mio mia miei mie tuo tua suo sua nostro nostra del della dello dei degli delle al alla allo ai agli alle nel nella nello nei negli nelle"),
  de: words('der die das den dem des ein eine einen einem einer eines jeder jede jedes jeden diese dieser dieses diesen mein meine meinen dein deine sein seine ihr ihre unser unsere im am zum zur vom beim ins'),
  sv: words('en ett den det de varje min mitt mina din ditt sin sitt hans hennes vår vårt denna detta dessa'),
  en: words('the a an each every my your his her its our their this that these those'),
  el: words('ο η το οι τα ένας μια μία ένα κάθε του της των τον την τη στο στη στην στον στα στις στους'),
  hu: words('a az egy minden'),
  ru: words('каждый каждая каждое каждую каждого каждой этот эта это эту мой моя моё мою твой твоя наш наша'),
};

/** Subject pronouns, object clitics, negation and mood particles: a verb follows. */
const VERB_AFTER: Record<string, Set<string>> = {
  es: words('yo tú nosotros nosotras vosotros vosotras ellos ellas se me te nos os les no ya'),
  pt: words('eu tu nós vós eles elas se me te nos vos lhe lhes não já'),
  fr: words("je j' tu il elle nous vous ils elles on ne n' se s' me m' te t' y"),
  it: words("io tu lui lei noi voi loro si mi ti ci vi non ne"),
  de: words('ich du er wir ihr man nicht'),
  sv: words('jag du han hon vi ni man inte'),
  en: words('i you he she we they to not'),
  el: words('εγώ εσύ αυτός αυτή εμείς εσείς αυτοί θα να δεν μην'),
  hu: words('nem ne'),
  ru: words('я ты он она мы вы они не'),
};

/** Intensifiers: an adjective (or adverb) follows. */
const ADJ_AFTER: Record<string, Set<string>> = {
  es: words('muy tan más menos bastante demasiado'),
  pt: words('muito tão mais menos bastante demasiado'),
  fr: words('très trop si plus moins assez'),
  it: words('molto tanto troppo più meno così'),
  de: words('sehr zu so ziemlich ganz'),
  sv: words('mycket väldigt så för ganska'),
  en: words('very too so quite rather'),
  el: words('πολύ πιο τόσο αρκετά'),
  hu: words('nagyon túl elég'),
  ru: words('очень слишком так довольно'),
};

/** The part of speech the word before calls for, or null when it doesn't say. */
export function posFromContext(lang: string, previous: string | undefined): ContextPos | null {
  if (!previous) return null;
  const p = previous.toLocaleLowerCase(lang);
  if (NOUN_AFTER[lang]?.has(p)) return 'noun';
  if (VERB_AFTER[lang]?.has(p)) return 'verb';
  if (ADJ_AFTER[lang]?.has(p)) return 'adj';
  return null;
}

export interface SenseOption {
  lemma: string;
  pos: string;
  glosses: string[];
}

/** A short gloss from a sense (the first meanings, as the tooltip shows them). */
/** A dictionary line without its notes in brackets: "dog (the species Canis familiaris (…))" → "dog". */
export function plainGloss(gloss: string): string {
  const plain = gloss
    .replace(/\s*\([^()]*\)/g, '')
    .replace(/\s*\([^()]*\)/g, '')
    .replace(/\s*\([^)]*$/, '')
    .replace(/\s+/g, ' ')
    .replace(/[\s,;:]+$/, '')
    .trim();
  return plain || gloss.trim();
}

export function shortGloss(glosses: string[], max = 60): string {
  const list = glosses.map(plainGloss).filter(Boolean);
  let out = list[0] ?? '';
  for (const g of list.slice(1)) {
    if (out.length + g.length + 2 > max) break;
    out += `; ${g}`;
  }
  return out.length > max ? `${out.slice(0, max - 1)}…` : out;
}

/**
 * The sense the context points to, among a form's senses (all its lemmas, in dictionary order).
 * Adjectives also accept adverbs (Spanish "muy tarde" is "very late").
 */
export function senseInContext(options: SenseOption[], pos: ContextPos | null): SenseOption | null {
  if (!pos || options.length < 2) return null;
  const wanted = pos === 'adj' ? ['adj', 'adv'] : [pos];
  for (const w of wanted) {
    const hit = options.find((o) => o.pos === w && o.glosses.length);
    if (hit) return hit;
  }
  return null;
}
