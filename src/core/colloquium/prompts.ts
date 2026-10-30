// Sermo's prompts: a scene and how the conversation should go, written in the language so the
// AI answers in it from the first line. The core twenty have their own wording; beta languages get
// the English one, which names the language. The scenes themselves (scenes/) are written in English:
// the first ten have a sentence in each language, the rest go in as English inside the language's frame.
import { getLanguage } from '@/core/lang/languages';
import type { Level } from '@/core/lang/levels';
import { getScene } from './scenes';
import type { Scene } from './scenes';

export { asScene, getScene, sceneOfTheDay, scenesFor, SCENES } from './scenes';

/** The scenes with their own sentence in each language (Lingua 5.1's ten). */
const TRANSLATED = ['cafe', 'market', 'way', 'meet', 'day', 'doctor', 'hotel', 'interview', 'story', 'debate'] as const;
type TranslatedId = (typeof TRANSLATED)[number];
const isTranslated = (id: string): id is TranslatedId => (TRANSLATED as readonly string[]).includes(id);

export type ConversationMode = 'scenario' | 'free' | 'tutor' | 'immersion';

export interface ConversationStyles {
  /** Conversations with interruptions and follow-up questions (F0551). */
  interruptions?: boolean;
  /** Conversations where the AI doesn’t automatically understand everything (F0552). */
  feignMisunderstanding?: boolean;
  /** Conversation with limited target-language assistance (F0553). */
  limitedAssistance?: boolean;
  /** Conversation where the AI uses only vocabulary the learner probably knows (F0554). */
  cappedVocabulary?: boolean;
  /** Conversation with gradual introduction of new expressions (F0555). */
  gradualNewWords?: boolean;
  /** Multi-character conversations (F0549) / group conversation simulation (F0550). */
  multiCharacter?: boolean;
  /** Conversation with branching outcomes (F0548). */
  branchingOutcomes?: boolean;
  /** Conversation focused on pronunciation (F0520). */
  pronunciationFocus?: boolean;
  /** Oral grammar drills (F0260). */
  oralGrammarFocus?: boolean;
}

/** Lines added in Lingua 5.2-6 and Lingua 6 (6-11), written for the core languages; others use the English ones. */
interface Extra {
  /** Leads into a scene written in English. */
  scene: string;
  goals: string;
  /** Corrections at the end instead of after each answer. */
  end: string;
  help: string;
  minutes: string;
  freeMode?: string;
  tutorMode?: string;
  immersionMode?: string;
  styleInterruptions?: string;
  styleMisunderstanding?: string;
  styleLimitedAssistance?: string;
  styleCappedVocab?: string;
  styleGradualWords?: string;
  styleMultiCharacter?: string;
  styleBranching?: string;
  stylePronunciation?: string;
  styleOralGrammar?: string;
}

const EN_EXTRA: Extra = {
  scene: 'Here is the scene, written in English so I understand it, but speak only {name} with me: {scene}',
  goals: 'What I want to manage (in English): {goals}.',
  end: 'Don’t interrupt me with corrections; when we finish, list my mistakes with the right forms.',
  help: 'If I get stuck, offer me two or three words or the start of a sentence I could use.',
  minutes: 'Let’s talk for about {minutes} minutes, then end the scene and tell me how I did.',
  freeMode: 'We don’t need a fixed scenario: let’s have a spontaneous free-flowing conversation about whatever comes up.',
  tutorMode: 'Act as a patient language tutor: guide our dialogue, teach and explain key vocabulary and grammar rules as they arise, and ask questions to help me practice.',
  immersionMode: 'Full immersion: speak strictly in {name} with minimal assistance, never switch to English or provide direct translations unless I am completely stuck, and push me to work through misunderstandings myself.',
  styleInterruptions: 'React naturally with realistic conversational interruptions and spontaneous follow-up questions instead of waiting for long turns.',
  styleMisunderstanding: 'Don’t automatically understand everything: if my grammar, phrasing, or pronunciation is unclear, feign misunderstanding and ask me to rephrase or clarify.',
  styleLimitedAssistance: 'Provide minimal assistance: don’t translate into English, and push me to circumlocute and describe unknown words in {name}.',
  styleCappedVocab: 'Cap your vocabulary: use only words an early learner at my level would know, avoiding obscure idioms and overly complex sentence structures.',
  styleGradualWords: 'Introduce new expressions gradually—at most one new expression per turn—and explain it briefly in context.',
  styleMultiCharacter: 'Simulate a group conversation: play two or three distinct characters with different speaking styles and perspectives who talk with each other and with me.',
  styleBranching: 'Create a branching conversation where every choice and response I give branches into different narrative outcomes.',
  stylePronunciation: 'Focus closely on my pronunciation, phonetic rhythm, and oral delivery; point out any awkward sounds or rhythm issues.',
  styleOralGrammar: 'Conduct oral grammar drills: ask rapid-fire questions that require me to practice and form the target grammar patterns in my spoken responses.',
};

const EXTRAS: Record<string, Extra> = {
  es: {
    scene: 'Esta es la escena, escrita en inglés para que la entienda, pero háblame solo en español: {scene}',
    goals: 'Lo que quiero conseguir (en inglés): {goals}.',
    end: 'No me interrumpas para corregirme; al terminar, haz una lista de mis errores con la forma correcta.',
    help: 'Si me atasco, ofréceme dos o tres palabras o el comienzo de una frase.',
    minutes: 'Hablemos unos {minutes} minutos; después termina la escena y dime cómo lo he hecho.',
    freeMode: 'No necesitamos un escenario fijo: tengamos una conversación libre y espontánea sobre cualquier tema.',
    tutorMode: 'Actúa como un tutor paciente: guía nuestro diálogo, explícame vocabulario y reglas gramaticales cuando surjan, y hazme preguntas para practicar.',
    immersionMode: 'Inmersión total: habla estrictamente en español con mínima ayuda, sin traducir al inglés, y anímame a resolver los malentendidos por mí mismo.',
    styleInterruptions: 'Reacciona de forma natural con interrupciones conversacionales y preguntas de seguimiento espontáneas.',
    styleMisunderstanding: 'No entiendas todo automáticamente: si cometo errores o mi frase no queda clara, finge no entender y pídeme que la reformule.',
    styleLimitedAssistance: 'Ayuda mínima: no recurras al inglés y anímame a explicar las palabras difíciles con perífrasis en español.',
    styleCappedVocab: 'Limita tu vocabulario: utiliza únicamente palabras adecuadas a mi nivel, evitando modismos oscuros y estructuras complejas.',
    styleGradualWords: 'Introduce nuevas expresiones de forma gradual: como máximo una por turno, explicándola en su contexto.',
    styleMultiCharacter: 'Simula una conversación en grupo: interpreta a dos o tres personajes distintos que interactúen entre sí y conmigo.',
    styleBranching: 'Crea una conversación interactiva con decisiones bifurcadas donde mis respuestas cambien el rumbo de la historia.',
    stylePronunciation: 'Presta especial atención a mi pronunciación y ritmo oral; señala cualquier sonido o entonación poco natural.',
    styleOralGrammar: 'Haz ejercicios orales de gramática: hazme preguntas rápidas que me obliguen a emplear la estructura gramatical elegida.',
  },
  fr: {
    scene: 'Voici la scène, écrite en anglais pour que je la comprenne, mais parle-moi uniquement en français : {scene}',
    goals: 'Ce que je veux réussir (en anglais) : {goals}.',
    end: 'Ne m’interromps pas pour me corriger ; à la fin, fais la liste de mes fautes avec la bonne forme.',
    help: 'Si je bloque, propose-moi deux ou trois mots ou un début de phrase.',
    minutes: 'Parlons environ {minutes} minutes, puis termine la scène et dis-moi comment je m’en suis sorti.',
    freeMode: 'Pas besoin de scénario fixe : ayons une conversation libre et spontanée sur n’importe quel sujet.',
    tutorMode: 'Agis comme un tuteur bienveillant : guide notre dialogue, explique-moi le vocabulaire et la grammaire au fil de l’eau, et pose-moi des questions d’entraînement.',
    immersionMode: 'Immersion totale : parle exclusivement en français avec une aide minimale, sans traduire en anglais, et pousse-moi à surmonter les incompréhensions moi-même.',
    styleInterruptions: 'Réagis naturellement avec de vraies interruptions et des relances spontanées au lieu d’attendre de longues tirades.',
    styleMisunderstanding: 'Ne comprends pas tout du premier coup : si ma phrase est inexacte ou confuse, feins de ne pas comprendre et demande-moi de reformuler.',
    styleLimitedAssistance: 'Aide minimale : ne traduis pas en anglais et pousse-moi à contourner la difficulté en français.',
    styleCappedVocab: 'Limite ton vocabulaire : utilise uniquement des mots courants adaptés à mon niveau, sans tournures rares.',
    styleGradualWords: 'Introduis de nouvelles expressions progressivement : une seule par réplique au maximum, en l’expliquant en contexte.',
    styleMultiCharacter: 'Simule une conversation de groupe : incarne deux ou trois personnages distincts qui échangent entre eux et avec moi.',
    styleBranching: 'Crée une histoire à embranchements où chaque réponse et décision influence la suite des événements.',
    stylePronunciation: 'Accorde une attention particulière à ma prononciation, au rythme et aux liaisons ; signale tout manque de naturel.',
    styleOralGrammar: 'Mène des exercices oraux de grammaire : pose-moi des questions vives exigeant la structure ciblée dans mes réponses.',
  },
  de: {
    scene: 'Hier ist die Szene, auf Englisch, damit ich sie verstehe, aber sprich mit mir nur Deutsch: {scene}',
    goals: 'Was ich schaffen möchte (auf Englisch): {goals}.',
    end: 'Unterbrich mich nicht mit Korrekturen; liste am Ende meine Fehler mit der richtigen Form auf.',
    help: 'Wenn ich nicht weiterweiß, biete mir zwei oder drei Wörter oder einen Satzanfang an.',
    minutes: 'Lass uns etwa {minutes} Minuten sprechen; beende dann die Szene und sag mir, wie es lief.',
    freeMode: 'Wir brauchen kein festes Szenario: lass uns ein spontanes, freies Gespräch über beliebige Themen führen.',
    tutorMode: 'Handle wie ein geduldiger Sprachtutor: leite das Gespräch, erkläre mir Vokabeln und Grammatikregeln, und stelle mir Übungsfragen.',
    immersionMode: 'Vollständige Immersion: sprich ausschließlich Deutsch mit minimaler Hilfe, wechsle nicht ins Englische, und lass mich Unklarheiten selbst umschreiben.',
    styleInterruptions: 'Reagiere natürlich mit Zwischenbemerkungen und spontanen Nachfragen statt langer Monologe.',
    styleMisunderstanding: 'Verstehe nicht automatisch alles: wenn mein Satz unklar oder fehlerhaft ist, tu so als würdest du mich nicht verstehen und bitte mich um Neuformulierung.',
    styleLimitedAssistance: 'Minimale Hilfe: verzichte auf Englisch und fordere mich auf, unbekannte Wörter auf Deutsch zu umschreiben.',
    styleCappedVocab: 'Begrenze deinen Wortschatz: verwende nur für mein Niveau typische Wörter und verzichte auf seltene Redewendungen.',
    styleGradualWords: 'Führe neue Ausdrücke behutsam ein: höchstens eine neue Redewendung pro Runde, im Kontext erklärt.',
    styleMultiCharacter: 'Simuliere ein Gruppengespräch: spiele zwei oder drei verschiedene Charaktere mit eigener Sprechweise.',
    styleBranching: 'Erstelle eine verzweigte Handlung, in der meine Entscheidungen und Antworten den Fortgang direkt bestimmen.',
    stylePronunciation: 'Achte genau auf meine Aussprache, Betonung und Satzmelodie; weise mich auf unklare Laute hin.',
    styleOralGrammar: 'Führe mündliche Grammatikübungen durch: stelle mir gezielte Fragen, die die Zielstruktur in der Antwort fordern.',
  },
  ru: {
    scene: 'Вот сцена — по-английски, чтобы я её понял, но говори со мной только по-русски: {scene}',
    goals: 'Что я хочу сделать (по-английски): {goals}.',
    end: 'Не перебивай меня исправлениями; в конце перечисли мои ошибки с правильными формами.',
    help: 'Если я застряну, предложи мне два-три слова или начало фразы.',
    minutes: 'Давай поговорим минут {minutes}, потом закончи сцену и скажи, как у меня получилось.',
    freeMode: 'Нам не нужен фиксированный сценарий: давай просто свободно и спонтанно поговорим на любую тему.',
    tutorMode: 'Веди себя как терпеливый преподаватель: направляй диалог, объясняй грамматику и слова и задавай тренировочные вопросы.',
    immersionMode: 'Полное погружение: говори только по-русски с минимальной помощью, не переходи на английский и помогай мне подбирать описания самостоятельно.',
    styleInterruptions: 'Реагируй живо, с естественными перебиваниями и спонтанными встречными вопросами.',
    styleMisunderstanding: 'Не понимай всё автоматически: если фраза грамматически неточна или неясна, покажи непонимание и попроси перефразировать.',
    styleLimitedAssistance: 'Минимум подсказок: без английского языка, побуждай меня объяснять незнакомые слова по-русски.',
    styleCappedVocab: 'Ограничь словарный запас: используй только слова моего уровня, избегая редких идиом.',
    styleGradualWords: 'Вводи новые выражения постепенно: не больше одного за реплику, поясняя его в контексте.',
    styleMultiCharacter: 'Смоделируй разговор в группе: играй двух-трёх разных персонажей со своими характерами.',
    styleBranching: 'Строй интерактивную ветвящуюся историю, где мои решения определяют развитие сюжета.',
    stylePronunciation: 'Обращай особое внимание на моё произношение, ударение и интонацию; указывай на неточности.',
    styleOralGrammar: 'Проводи устные грамматические разминки: задавай вопросы, вынуждающие меня строить ответы с нужной конструкцией.',
  },
  ar: {
    scene: 'هذا هو المشهد، مكتوبًا بالإنجليزية لأفهمه، لكن تكلّم معي بالعربية فقط: {scene}',
    goals: 'ما أريد أن أحققه (بالإنجليزية): {goals}.',
    end: 'لا تقاطعني بالتصحيحات؛ وفي النهاية اذكر أخطائي مع الصيغة الصحيحة.',
    help: 'إذا توقفت، فاقترح عليّ كلمتين أو ثلاثًا أو بداية جملة.',
    minutes: 'لنتحدث مدة {minutes} دقائق تقريبًا، ثم أنهِ المشهد وأخبرني كيف كان أدائي.',
    freeMode: 'لا نحتاج إلى مشهد محدد: لنتحدث بحرية وعفوية عن أي موضوع.',
    tutorMode: 'تصرّف كمعلم لغة صبور: وجّه الحديث، واشرح المفردات والقواعد عند الحاجة، واطرح أسئلة للممارسة.',
    immersionMode: 'انغماس كامل: تكلّم بالعربية فقط وبأقل قدر من المساعدة، ولا تنتقل للإنجليزية، وشجعني على توضيح أفكاري بنفسي.',
    styleInterruptions: 'تفاعل بعفوية مع مقاطعات طبيعية وأسئلة متابعة واقعية.',
    styleMisunderstanding: 'لا تفهم كل شيء تلقائيًا: إذا كانت صياغتي غير واضحة، أظهر عدم الفهم واطلب مني إعادة الصياغة.',
    styleLimitedAssistance: 'مساعدة محدودة: لا تستخدم الإنجليزية وحفّزني على شرح الكلمات الصعبة بالعربية.',
    styleCappedVocab: 'اقتصر على مفردات تناسب مستواي، وتجنب التراكيب المعقدة والأمثال الغامضة.',
    styleGradualWords: 'أدخل تعبيرات جديدة تدريجيًا: تعبير واحد فقط في كل رد مع شرحه في السياق.',
    styleMultiCharacter: 'حاكِ محادثة جماعية: مثّل شخصيتين أو ثلاثًا بطباع وطرق كلام مختلفة.',
    styleBranching: 'اصنع قصة ذات مسارات متفرعة تعتمد نهايتها على اختياراتي وإجاباتي.',
    stylePronunciation: 'ركّز على نطقي ومخارج الحروف والتنغيم؛ ونبّهني إلى الأخطاء الصوتية.',
    styleOralGrammar: 'أجرِ تدريبات نحوية شفهية: اطرح أسئلة سريعة تتطلب استخدام القاعدة المطلوبة.',
  },
  zh: {
    scene: '这是场景，用英文写的，方便我理解，但请你只用中文跟我说话：{scene}',
    goals: '我想做到的事（英文）：{goals}。',
    end: '聊天时不要打断我来纠错；结束后，把我的错误列出来，并给出正确的说法。',
    help: '如果我卡住了，给我两三个词或者一句话的开头。',
    minutes: '我们聊大约{minutes}分钟，然后结束这个场景，告诉我表现得怎么样。',
    freeMode: '我们不需要固定场景：就轻松自如地随心聊聊任何话题吧。',
    tutorMode: '请扮演一位耐心的语言导师：引导对话，遇到生词或语法时适时点拨，多提问让我练习。',
    immersionMode: '全中文沉浸：全程只说中文，尽量少给英文翻译或提示，鼓励我自己用中文把意思表达清楚。',
    styleInterruptions: '对话时更自然一些，适度插话和追问，而不是每次都等我说一大段。',
    styleMisunderstanding: '不要自动理解一切：如果我的语法或用词不准确，请假装听不懂，让我换种方式重新说一遍。',
    styleLimitedAssistance: '给予有限的帮助：不直接给英文翻译，引导我用中文打比方或用已知的简单词描述。',
    styleCappedVocab: '控制词汇难度：尽量只使用符合我水平的常用词汇，避免生僻成语和过于复杂的长句。',
    styleGradualWords: '循序渐进地引入新词新表达：每次回复最多引入一个新说法，并在语境中顺带解释。',
    styleMultiCharacter: '模拟群聊场景：扮演两三个性格和说话风格不同的人物，他们之间互相交流也跟我对话。',
    styleBranching: '进行分支式互动对话：我的每个选择和回答都会带来不同的剧情走向与结局。',
    stylePronunciation: '重点关注我的发音、语调和节奏：指出听起来不够自然的地方。',
    styleOralGrammar: '进行口语语法快练：提出连珠炮式的简短问题，要求我必须用指定的语法句型来回答。',
  },
};

/** A scene in English: the setting, who plays whom, and the goals. */
const sceneInEnglish = (s: Scene) => `${s.setting} You play ${s.ai}; ${s.you === 'yourself' ? 'I play myself' : `I am ${s.you}`}. My goals: ${s.goals.join('; ')}.`;

interface Kit {
  open: string;
  level: string;
  correct: string;
  slow: string;
  words: string;
  grammar: string;
  /** Instead of the scene: talk about something the learner read or watched. */
  about: string;
  voice: string;
  start: string;
  scenes: Record<TranslatedId, string>;
}

const EN: Kit = {
  open: 'Let’s practise {name}. You’re my conversation partner and you speak only {name}.',
  level: 'My level is {level}: use words and sentences that suit it.',
  correct: 'After each of my answers, briefly correct my mistakes, then carry on.',
  slow: 'Speak slowly and simply, in short sentences.',
  words: 'Try to use these words I’m learning: {words}.',
  grammar: 'Help me practise this: {topic}.',
  about: 'Let’s talk about “{about}”: ask me what it’s about and what I thought of it.',
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
    about: 'Hablemos de «{about}»: pregúntame de qué trata y qué me pareció.',
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
    about: 'Parlons de « {about} » : demande-moi de quoi ça parle et ce que j’en ai pensé.',
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
    about: 'Lass uns über „{about}“ sprechen: Frag mich, worum es geht und wie ich es fand.',
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
    about: 'Parliamo di «{about}»: chiedimi di cosa parla e cosa ne ho pensato.',
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
    about: 'Vamos falar sobre «{about}»: pergunte-me do que se trata e o que achei.',
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
    about: 'Давай поговорим о «{about}»: спроси меня, о чём это и что я об этом думаю.',
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
    about: 'Ας μιλήσουμε για το «{about}»: ρώτα με για τι πρόκειται και τι γνώμη έχω.',
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
    about: 'Vi pratar om ”{about}”: fråga mig vad det handlar om och vad jag tyckte.',
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
    about: 'Beszélgessünk erről: „{about}”. Kérdezd meg, miről szól, és mit gondolok róla.',
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
    about: 'Laten we het hebben over ‘{about}’: vraag me waar het over gaat en wat ik ervan vond.',
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
    about: 'La oss snakke om «{about}»: spør meg hva det handler om og hva jeg syntes.',
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
    about: '“{about}” hakkında konuşalım: bana neyle ilgili olduğunu ve ne düşündüğümü sor.',
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
    about: 'Ayo kita bicara tentang “{about}”: tanyakan padaku isinya tentang apa dan apa pendapatku.',
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
    about: 'Tuzungumze kuhusu “{about}”: niulize inahusu nini na nilionaje.',
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
    about: 'De «{about}» colloquamur: interroga me quid narret et quid de eo sentiam.',
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
    about: 'لنتحدث عن «{about}»: اسألني عمّ يدور وما رأيي فيه.',
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
    about: '我们来聊聊《{about}》：问问我它讲的是什么，我觉得怎么样。',
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
    about: '「{about}」について話しましょう。どんな内容か、私がどう思ったかを聞いてください。',
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
    about: '‘{about}’에 대해 이야기해요. 무슨 내용인지, 제가 어떻게 생각했는지 물어봐 주세요.',
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
  /** A scene's id (scenes/). */
  scene: string;
  level: Level;
  /** Conversation mode (F0548–F0555): 'scenario' (default), 'free', 'tutor', 'immersion'. */
  mode?: ConversationMode;
  /** Conversational constraints and styles (F0520, F0260, F0548–F0555). */
  styles?: ConversationStyles;
  /** Correct my mistakes after each answer (true or 'live'), all at the end ('end'), or not at all. */
  correct: boolean | 'live' | 'end';
  /** Speak slowly and simply. */
  slow: boolean;
  /** Offer words when I'm stuck. */
  help?: boolean;
  /** How long to talk, in minutes. */
  minutes?: number;
  /** A voice chat (short turns) or a text chat. */
  voice: boolean;
  /** Words due for review, to weave in. */
  words: string[];
  /** The grammar topic being learned, when Grammatica has one. */
  topic?: string;
  /** Something read or watched to talk about, in place of the scene (Diarium's "Talk about this", Mentis's prompt). */
  about?: string;
}

/** Whether the prompt is written in the language itself (the core twenty) or in English. */
export const promptInLanguage = (lang: string): boolean => lang === 'en' || lang in KITS;

/** The prompt to paste into an AI, in the language when Lingua has its wording. */
export function buildPrompt(lang: string, o: PromptOptions): string {
  const kit = KITS[lang] ?? EN;
  const extra = EXTRAS[lang] ?? EN_EXTRA;
  const getExtra = (key: keyof Extra): string => (EXTRAS[lang] && EXTRAS[lang][key]) || EN_EXTRA[key] || '';
  const name = getLanguage(lang)?.name ?? lang;
  const level = o.level === 'A0' ? 'A1' : o.level;
  const scene = getScene(o.scene) ?? getScene('cafe')!;
  const fill = (s: string) =>
    s
      .replaceAll('{name}', name)
      .replaceAll('{level}', level)
      .replaceAll('{words}', o.words.join(LIST_SEPARATOR[lang] ?? ', '))
      .replaceAll('{topic}', o.topic ?? '')
      .replaceAll('{about}', o.about ?? '')
      .replaceAll('{minutes}', String(o.minutes ?? ''))
      .replaceAll('{goals}', scene.goals.join('; '))
      .replaceAll('{scene}', sceneInEnglish(scene));

  const convMode = o.mode ?? 'scenario';

  // The first ten scenes in the language, with their goals; the others in English inside the language's frame.
  let sceneLines: string[];
  if (o.about) {
    sceneLines = [kit.about];
  } else if (convMode === 'free') {
    sceneLines = [getExtra('freeMode')];
  } else if (isTranslated(scene.id)) {
    sceneLines = [kit.scenes[scene.id], extra.goals];
  } else {
    sceneLines = [extra.scene];
  }

  const modeLine =
    convMode === 'tutor' ? getExtra('tutorMode') :
    convMode === 'immersion' ? getExtra('immersionMode') :
    undefined;

  const st = o.styles ?? {};
  const styleLines = [
    st.interruptions && getExtra('styleInterruptions'),
    st.feignMisunderstanding && getExtra('styleMisunderstanding'),
    st.limitedAssistance && getExtra('styleLimitedAssistance'),
    st.cappedVocabulary && getExtra('styleCappedVocab'),
    st.gradualNewWords && getExtra('styleGradualWords'),
    st.multiCharacter && getExtra('styleMultiCharacter'),
    st.branchingOutcomes && getExtra('styleBranching'),
    st.pronunciationFocus && getExtra('stylePronunciation'),
    st.oralGrammarFocus && getExtra('styleOralGrammar'),
  ].filter((s): s is string => Boolean(s));

  const parts = [
    kit.open,
    ...sceneLines,
    modeLine,
    kit.level,
    o.slow && kit.slow,
    o.correct === 'end' ? extra.end : o.correct && kit.correct,
    o.help && extra.help,
    o.words.length > 0 && kit.words,
    o.topic && kit.grammar,
    o.voice && kit.voice,
    o.minutes && extra.minutes,
    ...styleLines,
    kit.start,
  ].filter((p): p is string => Boolean(p));
  return parts.map(fill).join(UNSPACED.has(lang) ? '' : ' ');
}
