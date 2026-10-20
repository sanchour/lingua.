// Colloquium's prompts: a scene and how the conversation should go, written in the language so the
// AI answers in it from the first line. The core twenty have their own wording; beta languages get
// the English one, which names the language.
import { getLanguage } from '@/core/lang/languages';
import type { Level } from '@/core/lang/levels';

export const SCENES = ['cafe', 'market', 'way', 'meet', 'day', 'doctor', 'hotel', 'interview', 'story', 'debate'] as const;
export type SceneId = (typeof SCENES)[number];

/** How each scene is named in the app, and the level it starts to work at. */
export const SCENE_INFO: Record<SceneId, { title: string; detail: string; from: 'A1' | 'A2' | 'B1' }> = {
  cafe: { title: 'At a café', detail: 'Order something, ask what’s good', from: 'A1' },
  market: { title: 'At the market', detail: 'Prices, amounts, a little haggling', from: 'A1' },
  way: { title: 'Asking the way', detail: 'Directions in a city you don’t know', from: 'A1' },
  meet: { title: 'Meeting someone', detail: 'Who you are, where from, what you like', from: 'A1' },
  day: { title: 'Your day', detail: 'What you did and what’s next', from: 'A1' },
  doctor: { title: 'At the doctor’s', detail: 'Say what hurts and understand advice', from: 'A2' },
  hotel: { title: 'Checking in', detail: 'A room, a problem, a request', from: 'A2' },
  interview: { title: 'A job interview', detail: 'Talk about yourself and your work', from: 'B1' },
  story: { title: 'A story together', detail: 'One line each, wherever it goes', from: 'B1' },
  debate: { title: 'A friendly debate', detail: 'Take a side and argue it', from: 'B1' },
};

const RANK: Record<Level | 'A1' | 'A2' | 'B1', number> = { A0: 1, A1: 1, A2: 2, B1: 3, B2: 4, C1: 5 };

/** The scenes that work at a level (a beginner gets the A1 ones). */
export const scenesFor = (level: Level): SceneId[] => SCENES.filter((id) => RANK[SCENE_INFO[id].from] <= RANK[level]);

/** One scene a day, turning through those that fit the level. */
export const sceneOfTheDay = (level: Level, day: number): SceneId => {
  const fits = scenesFor(level);
  return fits[((day % fits.length) + fits.length) % fits.length];
};

const isScene = (v: unknown): v is SceneId => typeof v === 'string' && (SCENES as readonly string[]).includes(v);
export const asScene = (v: unknown): SceneId | undefined => (isScene(v) ? v : undefined);

interface Kit {
  open: string;
  level: string;
  correct: string;
  slow: string;
  words: string;
  grammar: string;
  voice: string;
  start: string;
  scenes: Record<SceneId, string>;
}

const EN: Kit = {
  open: 'Let’s practise {name}. You’re my conversation partner and you speak only {name}.',
  level: 'My level is {level}: use words and sentences that suit it.',
  correct: 'After each of my answers, briefly correct my mistakes, then carry on.',
  slow: 'Speak slowly and simply, in short sentences.',
  words: 'Try to use these words I’m learning: {words}.',
  grammar: 'Help me practise this: {topic}.',
  voice: 'We’re talking out loud, so keep your turns short.',
  start: 'Begin now with your first line.',
  scenes: {
    cafe: 'We’re in a café: you’re the waiter and I’m ordering.',
    market: 'We’re at a market: you sell fruit and vegetables and I’m buying.',
    way: 'I’m lost in your city and ask you the way.',
    meet: 'We’ve just met at a party: let’s get to know each other.',
    day: 'Ask me about my day and my plans.',
    doctor: 'You’re a doctor and I’ve come to see you because I feel unwell.',
    hotel: 'You work at a hotel reception and I’m checking in.',
    interview: 'You’re interviewing me for a job I want.',
    story: 'Let’s tell a story together, one line each in turn.',
    debate: 'Let’s have a friendly debate: pick a topic and take one side; I’ll take the other.',
  },
};

const KITS: Record<string, Kit> = {
  es: {
    open: 'Practiquemos español. Eres mi compañero de conversación y solo hablas en español.',
    level: 'Mi nivel es {level}: usa palabras y frases adecuadas para ese nivel.',
    correct: 'Después de cada respuesta mía, corrige brevemente mis errores y luego sigue con la conversación.',
    slow: 'Habla despacio y con sencillez, en frases cortas.',
    words: 'Intenta usar estas palabras que estoy aprendiendo: {words}.',
    grammar: 'Ayúdame a practicar esto: {topic}.',
    voice: 'Hablamos en voz alta, así que haz turnos cortos.',
    start: 'Empieza tú ahora con la primera frase.',
    scenes: {
      cafe: 'Estamos en una cafetería: tú eres el camarero y yo pido algo.',
      market: 'Estamos en un mercado: tú vendes fruta y verdura y yo compro.',
      way: 'Estoy perdido en tu ciudad y te pregunto cómo llegar a un sitio.',
      meet: 'Acabamos de conocernos en una fiesta: vamos a conocernos mejor.',
      day: 'Pregúntame por mi día y por mis planes.',
      doctor: 'Eres médico y vengo a tu consulta porque no me encuentro bien.',
      hotel: 'Trabajas en la recepción de un hotel y yo llego para registrarme.',
      interview: 'Me haces una entrevista para un trabajo que quiero.',
      story: 'Contemos una historia juntos, una frase cada uno por turno.',
      debate: 'Hagamos un debate amistoso: elige un tema y defiende una postura; yo defenderé la contraria.',
    },
  },
  fr: {
    open: 'Pratiquons le français. Tu es mon partenaire de conversation et tu ne parles qu’en français.',
    level: 'Mon niveau est {level} : utilise des mots et des phrases adaptés à ce niveau.',
    correct: 'Après chacune de mes réponses, corrige brièvement mes fautes, puis continue la conversation.',
    slow: 'Parle lentement et simplement, avec des phrases courtes.',
    words: 'Essaie d’utiliser ces mots que j’apprends : {words}.',
    grammar: 'Aide-moi à pratiquer ceci : {topic}.',
    voice: 'Nous parlons à voix haute, alors fais des répliques courtes.',
    start: 'Commence maintenant avec la première réplique.',
    scenes: {
      cafe: 'Nous sommes dans un café : tu es le serveur et je commande.',
      market: 'Nous sommes au marché : tu vends des fruits et des légumes et j’achète.',
      way: 'Je suis perdu dans ta ville et je te demande mon chemin.',
      meet: 'On vient de se rencontrer à une fête : faisons connaissance.',
      day: 'Demande-moi comment s’est passée ma journée et ce que je prévois.',
      doctor: 'Tu es médecin et je viens te voir parce que je ne me sens pas bien.',
      hotel: 'Tu travailles à la réception d’un hôtel et j’arrive pour m’enregistrer.',
      interview: 'Tu me fais passer un entretien pour un poste que je veux.',
      story: 'Racontons une histoire ensemble, une phrase chacun à son tour.',
      debate: 'Faisons un débat amical : choisis un sujet et défends un point de vue ; je défendrai l’autre.',
    },
  },
  de: {
    open: 'Lass uns Deutsch üben. Du bist mein Gesprächspartner und sprichst nur Deutsch.',
    level: 'Mein Niveau ist {level}: Verwende Wörter und Sätze, die dazu passen.',
    correct: 'Korrigiere nach jeder meiner Antworten kurz meine Fehler und mach dann mit dem Gespräch weiter.',
    slow: 'Sprich langsam und einfach, in kurzen Sätzen.',
    words: 'Versuche, diese Wörter zu benutzen, die ich gerade lerne: {words}.',
    grammar: 'Hilf mir, das hier zu üben: {topic}.',
    voice: 'Wir sprechen laut miteinander, also halte deine Antworten kurz.',
    start: 'Fang jetzt mit dem ersten Satz an.',
    scenes: {
      cafe: 'Wir sind in einem Café: Du bist der Kellner und ich bestelle.',
      market: 'Wir sind auf dem Markt: Du verkaufst Obst und Gemüse und ich kaufe ein.',
      way: 'Ich habe mich in deiner Stadt verlaufen und frage dich nach dem Weg.',
      meet: 'Wir haben uns gerade auf einer Party kennengelernt: Lass uns ins Gespräch kommen.',
      day: 'Frag mich nach meinem Tag und nach meinen Plänen.',
      doctor: 'Du bist Arzt und ich komme zu dir, weil es mir nicht gut geht.',
      hotel: 'Du arbeitest an der Hotelrezeption und ich checke ein.',
      interview: 'Du führst mit mir ein Vorstellungsgespräch für eine Stelle, die ich haben möchte.',
      story: 'Lass uns zusammen eine Geschichte erzählen, abwechselnd Satz für Satz.',
      debate: 'Lass uns freundlich diskutieren: Wähle ein Thema und vertritt eine Seite, ich vertrete die andere.',
    },
  },
  it: {
    open: 'Facciamo pratica di italiano. Sei il mio compagno di conversazione e parli solo in italiano.',
    level: 'Il mio livello è {level}: usa parole e frasi adatte a questo livello.',
    correct: 'Dopo ogni mia risposta, correggi brevemente i miei errori e poi continua la conversazione.',
    slow: 'Parla lentamente e in modo semplice, con frasi brevi.',
    words: 'Prova a usare queste parole che sto imparando: {words}.',
    grammar: 'Aiutami a esercitarmi su questo: {topic}.',
    voice: 'Parliamo ad alta voce, quindi fai battute brevi.',
    start: 'Comincia adesso con la prima battuta.',
    scenes: {
      cafe: 'Siamo in un bar: tu sei il cameriere e io ordino.',
      market: 'Siamo al mercato: tu vendi frutta e verdura e io compro.',
      way: 'Mi sono perso nella tua città e ti chiedo la strada.',
      meet: 'Ci siamo appena conosciuti a una festa: facciamo conoscenza.',
      day: 'Chiedimi della mia giornata e dei miei programmi.',
      doctor: 'Sei un medico e vengo da te perché non mi sento bene.',
      hotel: 'Lavori alla reception di un albergo e io faccio il check-in.',
      interview: 'Mi fai un colloquio per un lavoro che desidero.',
      story: 'Raccontiamo una storia insieme, una frase a testa.',
      debate: 'Facciamo un dibattito amichevole: scegli un tema e sostieni una posizione; io sosterrò l’altra.',
    },
  },
  pt: {
    open: 'Vamos praticar português. Você é meu parceiro de conversa e só fala em português.',
    level: 'Meu nível é {level}: use palavras e frases adequadas a esse nível.',
    correct: 'Depois de cada resposta minha, corrija brevemente os meus erros e depois continue a conversa.',
    slow: 'Fale devagar e de forma simples, com frases curtas.',
    words: 'Tente usar estas palavras que estou aprendendo: {words}.',
    grammar: 'Me ajude a praticar isto: {topic}.',
    voice: 'Estamos falando em voz alta, então fale pouco de cada vez.',
    start: 'Comece agora com a primeira fala.',
    scenes: {
      cafe: 'Estamos num café: você é o garçom e eu faço o pedido.',
      market: 'Estamos numa feira: você vende frutas e legumes e eu compro.',
      way: 'Estou perdido na sua cidade e pergunto como chegar a um lugar.',
      meet: 'Acabamos de nos conhecer numa festa: vamos nos conhecer melhor.',
      day: 'Pergunte sobre o meu dia e os meus planos.',
      doctor: 'Você é médico e eu vim à consulta porque não estou me sentindo bem.',
      hotel: 'Você trabalha na recepção de um hotel e eu estou fazendo o check-in.',
      interview: 'Você está me entrevistando para um emprego que eu quero.',
      story: 'Vamos contar uma história juntos, cada um uma frase por vez.',
      debate: 'Vamos fazer um debate amigável: escolha um tema e defenda um lado; eu defendo o outro.',
    },
  },
  ru: {
    open: 'Давай попрактикуемся в русском. Ты мой собеседник и говоришь только по-русски.',
    level: 'Мой уровень — {level}: используй слова и фразы, подходящие для этого уровня.',
    correct: 'После каждого моего ответа коротко исправляй мои ошибки, а потом продолжай разговор.',
    slow: 'Говори медленно и просто, короткими фразами.',
    words: 'Постарайся использовать слова, которые я сейчас учу: {words}.',
    grammar: 'Помоги мне потренировать вот это: {topic}.',
    voice: 'Мы говорим вслух, так что отвечай коротко.',
    start: 'Начни разговор первой репликой.',
    scenes: {
      cafe: 'Мы в кафе: ты официант, а я делаю заказ.',
      market: 'Мы на рынке: ты продаёшь фрукты и овощи, а я покупаю.',
      way: 'Я заблудился в твоём городе и спрашиваю у тебя дорогу.',
      meet: 'Мы только что познакомились на вечеринке: давай узнаем друг друга получше.',
      day: 'Спроси меня, как прошёл мой день и какие у меня планы.',
      doctor: 'Ты врач, и я пришёл к тебе, потому что плохо себя чувствую.',
      hotel: 'Ты работаешь на ресепшене гостиницы, а я заселяюсь.',
      interview: 'Ты проводишь со мной собеседование на работу, которую я хочу получить.',
      story: 'Давай вместе сочиним историю, по очереди, по одной фразе.',
      debate: 'Давай устроим дружеский спор: выбери тему и защищай одну сторону, а я буду защищать другую.',
    },
  },
  el: {
    open: 'Ας εξασκηθούμε στα ελληνικά. Είσαι ο συνομιλητής μου και μιλάς μόνο ελληνικά.',
    level: 'Το επίπεδό μου είναι {level}: χρησιμοποίησε λέξεις και φράσεις που του ταιριάζουν.',
    correct: 'Μετά από κάθε απάντησή μου, διόρθωσε σύντομα τα λάθη μου και μετά συνέχισε τη συζήτηση.',
    slow: 'Μίλα αργά και απλά, με σύντομες προτάσεις.',
    words: 'Προσπάθησε να χρησιμοποιήσεις αυτές τις λέξεις που μαθαίνω: {words}.',
    grammar: 'Βοήθησέ με να εξασκηθώ σε αυτό: {topic}.',
    voice: 'Μιλάμε φωναχτά, οπότε κάνε σύντομες ατάκες.',
    start: 'Ξεκίνα τώρα με την πρώτη σου ατάκα.',
    scenes: {
      cafe: 'Είμαστε σε ένα καφέ: εσύ είσαι ο σερβιτόρος κι εγώ παραγγέλνω.',
      market: 'Είμαστε στη λαϊκή: εσύ πουλάς φρούτα και λαχανικά κι εγώ ψωνίζω.',
      way: 'Έχω χαθεί στην πόλη σου και σε ρωτάω πώς να πάω κάπου.',
      meet: 'Μόλις γνωριστήκαμε σε ένα πάρτι: ας γνωριστούμε καλύτερα.',
      day: 'Ρώτα με για τη μέρα μου και για τα σχέδιά μου.',
      doctor: 'Είσαι γιατρός κι έρχομαι στο ιατρείο σου γιατί δεν νιώθω καλά.',
      hotel: 'Δουλεύεις στη ρεσεψιόν ενός ξενοδοχείου κι εγώ κάνω check-in.',
      interview: 'Μου παίρνεις συνέντευξη για μια δουλειά που θέλω.',
      story: 'Ας πούμε μαζί μια ιστορία, μια πρόταση ο καθένας με τη σειρά.',
      debate: 'Ας κάνουμε μια φιλική αντιπαράθεση: διάλεξε ένα θέμα και υποστήριξε μια άποψη· εγώ θα υποστηρίξω την αντίθετη.',
    },
  },
  sv: {
    open: 'Vi övar svenska. Du är min samtalspartner och pratar bara svenska.',
    level: 'Min nivå är {level}: använd ord och meningar som passar den.',
    correct: 'Rätta kort mina fel efter varje svar jag ger, och fortsätt sedan samtalet.',
    slow: 'Prata långsamt och enkelt, i korta meningar.',
    words: 'Försök att använda de här orden som jag håller på att lära mig: {words}.',
    grammar: 'Hjälp mig att öva på det här: {topic}.',
    voice: 'Vi pratar högt, så håll dina repliker korta.',
    start: 'Börja nu med den första repliken.',
    scenes: {
      cafe: 'Vi är på ett kafé: du är servitör och jag beställer.',
      market: 'Vi är på en marknad: du säljer frukt och grönsaker och jag handlar.',
      way: 'Jag har gått vilse i din stad och frågar dig om vägen.',
      meet: 'Vi har precis träffats på en fest: låt oss lära känna varandra.',
      day: 'Fråga mig om min dag och vad jag har för planer.',
      doctor: 'Du är läkare och jag kommer till dig för att jag inte mår bra.',
      hotel: 'Du jobbar i receptionen på ett hotell och jag checkar in.',
      interview: 'Du intervjuar mig för ett jobb som jag vill ha.',
      story: 'Låt oss berätta en historia tillsammans, en mening var.',
      debate: 'Låt oss ha en vänlig debatt: välj ett ämne och försvara en sida, så tar jag den andra.',
    },
  },
  hu: {
    open: 'Gyakoroljuk együtt a magyart. Te vagy a beszélgetőtársam, és csak magyarul beszélsz.',
    level: 'A szintem {level}: ehhez illő szavakat és mondatokat használj.',
    correct: 'Minden válaszom után röviden javítsd ki a hibáimat, aztán folytasd a beszélgetést.',
    slow: 'Beszélj lassan és egyszerűen, rövid mondatokban.',
    words: 'Próbáld használni ezeket a szavakat, amelyeket most tanulok: {words}.',
    grammar: 'Segíts gyakorolni ezt: {topic}.',
    voice: 'Hangosan beszélgetünk, ezért röviden válaszolj.',
    start: 'Most kezdd te az első mondattal.',
    scenes: {
      cafe: 'Egy kávézóban vagyunk: te vagy a pincér, én pedig rendelek.',
      market: 'A piacon vagyunk: te zöldséget és gyümölcsöt árulsz, én pedig vásárolok.',
      way: 'Eltévedtem a városodban, és megkérdezem tőled az utat.',
      meet: 'Most ismerkedtünk meg egy bulin: ismerjük meg jobban egymást.',
      day: 'Kérdezz a napomról és a terveimről.',
      doctor: 'Orvos vagy, és azért jövök hozzád, mert rosszul érzem magam.',
      hotel: 'Egy szálloda recepcióján dolgozol, én pedig bejelentkezem.',
      interview: 'Állásinterjút készítesz velem egy munkára, amelyet szeretnék megkapni.',
      story: 'Meséljünk el együtt egy történetet, felváltva, mondatonként.',
      debate: 'Vitatkozzunk barátságosan: válassz egy témát, és képviselj egy álláspontot, én a másikat.',
    },
  },
  nl: {
    open: 'Laten we Nederlands oefenen. Jij bent mijn gesprekspartner en je spreekt alleen Nederlands.',
    level: 'Mijn niveau is {level}: gebruik woorden en zinnen die daarbij passen.',
    correct: 'Verbeter na elk antwoord van mij kort mijn fouten en ga dan verder met het gesprek.',
    slow: 'Praat langzaam en eenvoudig, in korte zinnen.',
    words: 'Probeer deze woorden te gebruiken die ik aan het leren ben: {words}.',
    grammar: 'Help me dit te oefenen: {topic}.',
    voice: 'We praten hardop, dus houd je beurten kort.',
    start: 'Begin nu met de eerste zin.',
    scenes: {
      cafe: 'We zitten in een café: jij bent de ober en ik bestel.',
      market: 'We zijn op de markt: jij verkoopt groente en fruit en ik koop.',
      way: 'Ik ben verdwaald in jouw stad en vraag je de weg.',
      meet: 'We hebben elkaar net op een feestje ontmoet: laten we kennismaken.',
      day: 'Vraag me naar mijn dag en naar mijn plannen.',
      doctor: 'Jij bent huisarts en ik kom bij je omdat ik me niet lekker voel.',
      hotel: 'Jij werkt bij de receptie van een hotel en ik check in.',
      interview: 'Jij houdt een sollicitatiegesprek met mij voor een baan die ik graag wil.',
      story: 'Laten we samen een verhaal vertellen, om de beurt een zin.',
      debate: 'Laten we vriendschappelijk debatteren: kies een onderwerp en verdedig één kant, dan verdedig ik de andere.',
    },
  },
  nb: {
    open: 'La oss øve på norsk. Du er samtalepartneren min og snakker bare norsk.',
    level: 'Nivået mitt er {level}: bruk ord og setninger som passer til det.',
    correct: 'Rett kort feilene mine etter hvert svar jeg gir, og fortsett så samtalen.',
    slow: 'Snakk sakte og enkelt, i korte setninger.',
    words: 'Prøv å bruke disse ordene som jeg lærer nå: {words}.',
    grammar: 'Hjelp meg å øve på dette: {topic}.',
    voice: 'Vi snakker høyt, så hold replikkene dine korte.',
    start: 'Begynn nå med den første replikken.',
    scenes: {
      cafe: 'Vi er på en kafé: du er servitør, og jeg bestiller.',
      market: 'Vi er på et marked: du selger frukt og grønnsaker, og jeg handler.',
      way: 'Jeg har gått meg vill i byen din og spør deg om veien.',
      meet: 'Vi har nettopp møttes på en fest: la oss bli kjent.',
      day: 'Spør meg om dagen min og om planene mine.',
      doctor: 'Du er lege, og jeg kommer til deg fordi jeg ikke føler meg bra.',
      hotel: 'Du jobber i resepsjonen på et hotell, og jeg sjekker inn.',
      interview: 'Du intervjuer meg til en jobb jeg gjerne vil ha.',
      story: 'La oss fortelle en historie sammen, én setning hver.',
      debate: 'La oss ha en vennlig debatt: velg et tema og forsvar én side, så tar jeg den andre.',
    },
  },
  tr: {
    open: 'Hadi Türkçe pratik yapalım. Sen benim sohbet arkadaşımsın ve sadece Türkçe konuşuyorsun.',
    level: 'Seviyem {level}: bu seviyeye uygun kelimeler ve cümleler kullan.',
    correct: 'Her cevabımdan sonra hatalarımı kısaca düzelt, sonra sohbete devam et.',
    slow: 'Yavaş ve basit konuş, kısa cümleler kur.',
    words: 'Şu an öğrendiğim bu kelimeleri kullanmaya çalış: {words}.',
    grammar: 'Şunu çalışmama yardım et: {topic}.',
    voice: 'Sesli konuşuyoruz, o yüzden kısa konuş.',
    start: 'Şimdi ilk cümleyle sen başla.',
    scenes: {
      cafe: 'Bir kafedeyiz: sen garsonsun, ben sipariş veriyorum.',
      market: 'Pazardayız: sen meyve ve sebze satıyorsun, ben alışveriş yapıyorum.',
      way: 'Şehrinde kayboldum ve sana yolu soruyorum.',
      meet: 'Bir partide yeni tanıştık: hadi birbirimizi tanıyalım.',
      day: 'Bana günümü ve planlarımı sor.',
      doctor: 'Sen doktorsun, kendimi iyi hissetmediğim için sana geldim.',
      hotel: 'Bir otelin resepsiyonunda çalışıyorsun, ben de giriş yapıyorum.',
      interview: 'İstediğim bir iş için benimle mülakat yapıyorsun.',
      story: 'Birlikte bir hikâye anlatalım, sırayla birer cümle.',
      debate: 'Dostça bir tartışma yapalım: bir konu seç ve bir tarafı savun, ben de diğerini savunayım.',
    },
  },
  id: {
    open: 'Ayo kita latihan bahasa Indonesia. Kamu teman ngobrolku dan hanya berbicara dalam bahasa Indonesia.',
    level: 'Tingkatku {level}: gunakan kata dan kalimat yang sesuai dengan tingkat itu.',
    correct: 'Setelah setiap jawabanku, koreksi kesalahanku secara singkat, lalu lanjutkan percakapan.',
    slow: 'Bicaralah pelan-pelan dan sederhana, dengan kalimat pendek.',
    words: 'Coba pakai kata-kata yang sedang aku pelajari ini: {words}.',
    grammar: 'Bantu aku berlatih ini: {topic}.',
    voice: 'Kita berbicara dengan suara, jadi jawablah dengan singkat.',
    start: 'Mulailah sekarang dengan kalimat pertama.',
    scenes: {
      cafe: 'Kita di sebuah kafe: kamu pelayannya dan aku memesan.',
      market: 'Kita di pasar: kamu menjual buah dan sayur, dan aku berbelanja.',
      way: 'Aku tersesat di kotamu dan bertanya jalan kepadamu.',
      meet: 'Kita baru saja berkenalan di sebuah pesta: ayo saling mengenal.',
      day: 'Tanyakan tentang hariku dan rencana-rencanaku.',
      doctor: 'Kamu dokter, dan aku datang karena merasa tidak enak badan.',
      hotel: 'Kamu bekerja di resepsionis hotel dan aku mau check-in.',
      interview: 'Kamu mewawancaraiku untuk pekerjaan yang aku inginkan.',
      story: 'Ayo bercerita bersama, bergantian satu kalimat.',
      debate: 'Ayo berdebat dengan santai: pilih topik dan bela satu pihak, aku akan membela pihak lainnya.',
    },
  },
  sw: {
    open: 'Tujizoeze Kiswahili. Wewe ni mwenzangu wa mazungumzo na unazungumza Kiswahili tu.',
    level: 'Kiwango changu ni {level}: tumia maneno na sentensi zinazofaa kiwango hicho.',
    correct: 'Baada ya kila jibu langu, sahihisha makosa yangu kwa ufupi, kisha endelea na mazungumzo.',
    slow: 'Ongea polepole na kwa urahisi, kwa sentensi fupi.',
    words: 'Jaribu kutumia maneno haya ninayojifunza: {words}.',
    grammar: 'Nisaidie kufanya mazoezi ya hili: {topic}.',
    voice: 'Tunazungumza kwa sauti, kwa hiyo jibu kwa ufupi.',
    start: 'Anza sasa kwa sentensi ya kwanza.',
    scenes: {
      cafe: 'Tuko kwenye mkahawa: wewe ni mhudumu na mimi ninaagiza.',
      market: 'Tuko sokoni: wewe unauza matunda na mboga, na mimi ninanunua.',
      way: 'Nimepotea katika mji wako na ninakuuliza njia.',
      meet: 'Tumekutana sasa hivi kwenye sherehe: tufahamiane.',
      day: 'Niulize kuhusu siku yangu na mipango yangu.',
      doctor: 'Wewe ni daktari, na nimekuja kwako kwa sababu sijisikii vizuri.',
      hotel: 'Unafanya kazi mapokezi ya hoteli na mimi ninajiandikisha.',
      interview: 'Unanihoji kwa ajili ya kazi ninayoitaka.',
      story: 'Tusimulie hadithi pamoja, kila mmoja sentensi moja kwa zamu.',
      debate: 'Tufanye mjadala wa kirafiki: chagua mada na utetee upande mmoja, nami nitatetea upande mwingine.',
    },
  },
  la: {
    open: 'Latine colloquamur. Tu es socius meus in colloquio et tantum Latine loqueris.',
    level: 'Gradus meus est {level}: verbis et sententiis utere quae ei conveniunt.',
    correct: 'Post singula mea responsa errata mea breviter corrige, deinde colloquium perge.',
    slow: 'Lente et simpliciter loquere, brevibus sententiis.',
    words: 'Conare his verbis uti quae nunc disco: {words}.',
    grammar: 'Adiuva me hoc exercere: {topic}.',
    voice: 'Voce loquimur, itaque breviter responde.',
    start: 'Incipe nunc prima sententia.',
    scenes: {
      cafe: 'In caupona sumus: tu minister es, ego cibum et potum posco.',
      market: 'In foro sumus: tu poma et holera vendis, ego emo.',
      way: 'In urbe tua erravi et viam ex te quaero.',
      meet: 'Modo in convivio convenimus: inter nos cognoscamus.',
      day: 'Interroga me de die meo et de consiliis meis.',
      doctor: 'Medicus es, et ad te venio quod male me habeo.',
      hotel: 'In hospitio laboras, et ego advenio ut cubiculum accipiam.',
      interview: 'Me interrogas de munere quod cupio.',
      story: 'Fabulam una narremus, singulas sententias vicissim.',
      debate: 'Amice disputemus: elige rem et unam partem defende; ego alteram defendam.',
    },
  },
  ar: {
    open: 'لنتدرّب على العربية. أنت شريكي في المحادثة ولا تتكلم إلا بالعربية الفصحى.',
    level: 'مستواي {level}: استخدم كلمات وجملًا تناسب هذا المستوى.',
    correct: 'بعد كل إجابة مني، صحّح أخطائي باختصار، ثم تابع المحادثة.',
    slow: 'تكلّم ببطء وببساطة، بجمل قصيرة.',
    words: 'حاول أن تستخدم هذه الكلمات التي أتعلمها: {words}.',
    grammar: 'ساعدني على التدرّب على هذا: {topic}.',
    voice: 'نحن نتحدث بصوت عالٍ، فاجعل كلامك قصيرًا.',
    start: 'ابدأ الآن بالجملة الأولى.',
    scenes: {
      cafe: 'نحن في مقهى: أنت النادل وأنا أطلب.',
      market: 'نحن في السوق: أنت تبيع الفواكه والخضار وأنا أشتري.',
      way: 'ضللتُ الطريق في مدينتك وأسألك كيف أصل إلى مكان ما.',
      meet: 'تعارفنا للتو في حفلة: لنتعرّف على بعضنا أكثر.',
      day: 'اسألني عن يومي وعن خططي.',
      doctor: 'أنت طبيب وقد جئت إليك لأنني لا أشعر أنني بخير.',
      hotel: 'أنت تعمل في استقبال فندق وأنا أسجّل دخولي.',
      interview: 'أنت تجري معي مقابلة لوظيفة أريدها.',
      story: 'لنحكِ قصة معًا، جملة لكلٍّ منا بالتناوب.',
      debate: 'لنتناقش بودّ: اختر موضوعًا ودافع عن رأي، وسأدافع عن الرأي الآخر.',
    },
  },
  zh: {
    open: '我们来练习中文吧。你是我的对话伙伴，只说中文。',
    level: '我的水平是{level}，请使用适合这个水平的词语和句子。',
    correct: '我每次回答以后，请简单地纠正我的错误，然后继续对话。',
    slow: '请说得慢一点、简单一点，用短句。',
    words: '请尽量用上我正在学的这些词：{words}。',
    grammar: '请帮我练习这个：{topic}。',
    voice: '我们是口头对话，所以每次请说得短一点。',
    start: '现在请你先说第一句。',
    scenes: {
      cafe: '我们在一家咖啡馆：你是服务员，我来点东西。',
      market: '我们在菜市场：你卖水果和蔬菜，我来买。',
      way: '我在你的城市迷路了，向你问路。',
      meet: '我们刚在一个聚会上认识，来互相了解一下吧。',
      day: '问问我今天过得怎么样，还有我的计划。',
      doctor: '你是医生，我身体不舒服，来找你看病。',
      hotel: '你在酒店前台工作，我来办理入住。',
      interview: '你在面试我，这是一份我很想要的工作。',
      story: '我们一起编一个故事，每人轮流说一句。',
      debate: '我们来一场友好的辩论：你选一个话题，支持一方，我支持另一方。',
    },
  },
  ja: {
    open: '日本語の練習をしましょう。あなたは私の会話の相手で、日本語だけで話します。',
    level: '私のレベルは{level}です。このレベルに合った言葉と文を使ってください。',
    correct: '私が答えるたびに、間違いを短く直してから、会話を続けてください。',
    slow: 'ゆっくり、簡単に、短い文で話してください。',
    words: '私が今勉強しているこの言葉を使ってみてください：{words}。',
    grammar: 'これを練習するのを手伝ってください：{topic}。',
    voice: '声で話しているので、一回の発言は短くしてください。',
    start: '今、最初の一言から始めてください。',
    scenes: {
      cafe: 'カフェにいます。あなたは店員で、私が注文します。',
      market: '市場にいます。あなたは果物と野菜を売っていて、私が買います。',
      way: 'あなたの町で道に迷ったので、道を聞きます。',
      meet: 'パーティーで知り合ったばかりです。お互いのことを知りましょう。',
      day: '私の一日とこれからの予定について聞いてください。',
      doctor: 'あなたは医者で、私は具合が悪いので診察に来ました。',
      hotel: 'あなたはホテルのフロントで働いていて、私がチェックインします。',
      interview: '私が希望する仕事の面接を、あなたがしてください。',
      story: '一緒に物語を作りましょう。一文ずつ交代で話します。',
      debate: '友好的な討論をしましょう。テーマを選んで一方の立場をとってください。私は反対の立場をとります。',
    },
  },
  ko: {
    open: '한국어 연습을 해요. 당신은 제 대화 상대이고 한국어로만 말해요.',
    level: '제 수준은 {level} 정도예요. 이 수준에 맞는 단어와 문장을 써 주세요.',
    correct: '제가 대답할 때마다 틀린 부분을 짧게 고쳐 주고, 대화를 계속해 주세요.',
    slow: '천천히, 쉽게, 짧은 문장으로 말해 주세요.',
    words: '제가 지금 배우고 있는 이 단어들을 써 보세요: {words}.',
    grammar: '이것을 연습하도록 도와주세요: {topic}.',
    voice: '소리 내어 대화하고 있으니까 짧게 말해 주세요.',
    start: '지금 첫 마디로 시작해 주세요.',
    scenes: {
      cafe: '우리는 카페에 있어요. 당신은 직원이고 저는 주문해요.',
      market: '우리는 시장에 있어요. 당신은 과일과 채소를 팔고 저는 사요.',
      way: '저는 당신의 도시에서 길을 잃어서 길을 물어봐요.',
      meet: '우리는 방금 파티에서 만났어요. 서로 알아가 봐요.',
      day: '제 하루와 앞으로의 계획에 대해 물어봐 주세요.',
      doctor: '당신은 의사이고, 저는 몸이 안 좋아서 진료를 받으러 왔어요.',
      hotel: '당신은 호텔 프런트에서 일하고 저는 체크인해요.',
      interview: '제가 원하는 일자리 면접을 당신이 봐 주세요.',
      story: '같이 이야기를 만들어 봐요. 한 문장씩 번갈아 가며 말해요.',
      debate: '친근하게 토론해 봐요. 주제를 하나 골라서 한쪽 입장을 맡아 주세요. 저는 반대쪽을 맡을게요.',
    },
  },
};

/** Written without spaces between sentences. */
const UNSPACED = new Set(['zh', 'ja', 'yue']);
const LIST_SEPARATOR: Record<string, string> = { zh: '、', ja: '、', yue: '、', ar: '، ', fa: '، ' };

export interface PromptOptions {
  scene: SceneId;
  level: Level;
  /** Correct my mistakes after each answer. */
  correct: boolean;
  /** Speak slowly and simply. */
  slow: boolean;
  /** A voice chat (short turns) or a text chat. */
  voice: boolean;
  /** Words due for review, to weave in. */
  words: string[];
  /** The grammar topic being learned, when Grammatica has one. */
  topic?: string;
}

/** Whether the prompt is written in the language itself (the core twenty) or in English. */
export const promptInLanguage = (lang: string): boolean => lang === 'en' || lang in KITS;

/** The prompt to paste into an AI, in the language when Lingua has its wording. */
export function buildPrompt(lang: string, o: PromptOptions): string {
  const kit = KITS[lang] ?? EN;
  const name = getLanguage(lang)?.name ?? lang;
  const level = o.level === 'A0' ? 'A1' : o.level;
  const fill = (s: string) =>
    s
      .replaceAll('{name}', name)
      .replaceAll('{level}', level)
      .replaceAll('{words}', o.words.join(LIST_SEPARATOR[lang] ?? ', '))
      .replaceAll('{topic}', o.topic ?? '');
  const parts = [
    kit.open,
    kit.scenes[o.scene],
    kit.level,
    o.slow && kit.slow,
    o.correct && kit.correct,
    o.words.length > 0 && kit.words,
    o.topic && kit.grammar,
    o.voice && kit.voice,
    kit.start,
  ].filter((p): p is string => Boolean(p));
  return parts.map(fill).join(UNSPACED.has(lang) ? '' : ' ');
}
