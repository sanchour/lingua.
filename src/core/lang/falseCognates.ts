// False cognates (6-1c): words that look like an English word and are not related to it, though the two sound as if they might be
// (not the same as a false friend, which has a different meaning but may well be related). Hand-made, only where the unrelatedness is certain.
export interface FalseCognate {
  /** The English word it looks like. */
  looks: string;
  /** Where each really comes from, in a line. */
  note: string;
}

export const FALSE_COGNATES: Record<string, Record<string, FalseCognate>> = {
  es: {
    mucho: { looks: 'much', note: 'Spanish “mucho” comes from Latin multum; English “much” from Old English micel. Same meaning, no relation.' },
    haber: { looks: 'have', note: 'Spanish “haber” comes from Latin habere; English “have” from Old English habban. They look like cousins and are not.' },
    sin: { looks: 'sin', note: 'Spanish “sin” (without) comes from Latin sine; English “sin” from Old English synn.' },
    once: { looks: 'once', note: 'Spanish “once” (eleven) comes from Latin undecim; English “once” is “one” with a case ending.' },
  },
  fr: {
    pour: { looks: 'pour', note: 'French “pour” (for) comes from Latin pro; English “pour” is from Old French, an unrelated word.' },
    main: { looks: 'main', note: 'French “main” (hand) comes from Latin manus; English “main” from Old English mægen, strength.' },
    but: { looks: 'but', note: 'French “but” (goal) is a word of its own; English “but” comes from Old English butan.' },
    pain: { looks: 'pain', note: 'French “pain” (bread) comes from Latin panis; English “pain” from Latin poena, via Old French peine.' },
  },
  de: {
    bad: { looks: 'bad', note: 'German “Bad” (bath) is from Proto-Germanic *badą; English “bad” is of unknown origin. No relation.' },
    rat: { looks: 'rat', note: 'German “Rat” (advice) belongs with “raten” (to advise); English “rat” is an animal’s name with another origin.' },
    arm: { looks: 'arm', note: 'German “arm” (poor) and English “arm” are unrelated; the English limb is German “Arm”, and that one is related.' },
    wand: { looks: 'wand', note: 'German “Wand” (wall) belongs with “winden” (to wind); English “wand” comes from Old Norse vǫndr.' },
    kind: { looks: 'kind', note: 'German “Kind” (child) is related to “kin” and “to be born”; English “kind” (nice) comes from Old English gecynde.' },
  },
};

export const falseCognateOf = (lang: string, word: string): FalseCognate | undefined => FALSE_COGNATES[lang]?.[word.toLocaleLowerCase()];
