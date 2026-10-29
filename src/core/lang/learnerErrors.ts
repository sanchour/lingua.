// Mistakes learners (English speakers above all) keep making with a word (6-1c): spellings that sound alike, and uses the mother
// tongue gets wrong. Hand-made for the languages with the most to say; the entry page shows the note under the word.
export const LEARNER_ERRORS: Record<string, Record<string, string>> = {
  es: {
    hecho: 'Often written “echo”. “Hecho” is the past participle of “hacer” (done; a fact); “echo” is “I throw” (from “echar”).',
    haber: 'Not “a ver” (let’s see): “haber” is to have as a helper (“he comido”) and “there is” (“hay”).',
    ahí: 'Not “hay” (there is) and not “ay” (oh!): “ahí” means there, in that place.',
    sí: 'With the accent it means yes (and “himself”); without it, “si” means if.',
    si: 'Without the accent it means if; with it, “sí” means yes.',
    él: 'With the accent it means he; “el” (the) has none.',
    tú: 'With the accent it means you; “tu” (your) has none.',
    mí: 'With the accent it means me (“para mí”); “mi” (my) has none.',
    qué: 'With the accent it asks (what?); “que” (that, which) has none.',
    por: 'It gives the cause or the way (“gracias por la ayuda”, “por la calle”); “para” gives the aim or the destination.',
    para: 'It gives the aim, the destination or the deadline (“para ti”, “para mañana”); “por” gives the cause or the way.',
    problema: 'Masculine, although it ends in -a: “el problema”, as “el tema”, “el día”, “el mapa”.',
    agua: 'Feminine, but takes “el” in the singular for the sound: “el agua fría” (the adjective stays feminine), “las aguas”.',
    tener: 'Used for age and for states English makes with “to be”: “tengo hambre”, “tengo veinte años” (not “estoy hambre”).',
    ser: 'What something is, always: “es médico”, “es alto”. Where it is or how it is now takes “estar”.',
    estar: 'Where it is and how it is now: “está en casa”, “está cansado”. What something is takes “ser”.',
  },
  fr: {
    à: 'With the accent it is a preposition (to, at); “a” without it is the verb “avoir” (has).',
    a: 'Without the accent it is the verb “avoir” (“il a”, he has); “à” with the accent is to, at.',
    ou: 'Without the accent it means or; “où” with it means where.',
    où: 'With the accent it means where; “ou” without it means or.',
    et: 'It means and; “est” (is) sounds the same.',
    ce: 'It means this (“ce livre”); “se” goes with reflexive verbs (“il se lave”).',
    ses: 'It means his, her (“ses amis”); “ces” means these.',
    son: 'It means his, her (“son livre”); “sont” (they are) sounds the same.',
    on: 'It means one, we; “ont” (they have) sounds the same.',
    la: 'It means the (“la maison”); “là” with the accent means there.',
    là: 'With the accent it means there; “la” without it means the.',
    être: 'Most verbs make the perfect with “avoir”; “être” is for the verbs of movement and the reflexive ones: “je suis allé”, “elle s’est levée”.',
    depuis: 'With the present, for something still going on: “j’habite ici depuis deux ans” (I have lived here for two years).',
  },
  de: {
    das: 'The neuter “the” or “that”; “dass” (with two s) opens a clause: “ich weiß, dass du kommst”.',
    dass: 'It opens a clause (“ich weiß, dass …”); the neuter “the” or “that” is “das”.',
    seit: 'It means since, for; “seid” (you are, plural) sounds the same.',
    wieder: 'It means again; “wider” (against) sounds the same.',
    wollen: 'To want, not a future: “ich will essen” is “I want to eat”. The future is made with “werden”.',
    kein: 'It makes “ein-” and bare nouns negative: “ich habe kein Auto”. “Nicht” negates the rest: “ich komme nicht”.',
  },
  ru: {
    идти: 'On foot, in one direction, now; for a vehicle it is “ехать”, and for a habit or a round trip “ходить”/“ездить”.',
    ехать: 'By vehicle, in one direction, now; on foot it is “идти”.',
    знать: 'To know a fact or a person; to know how to do something is “уметь”.',
    быть: 'There is no “to be” in the present: “я студент”, not “я есть студент”.',
    нет: 'It means no, and there is none (“у меня нет времени”); “не” is the not before a verb: “я не знаю”.',
  },
};

export const learnerErrorOf = (lang: string, word: string): string | undefined => LEARNER_ERRORS[lang]?.[word.toLocaleLowerCase()];
