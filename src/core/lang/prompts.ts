// Curated Diarium writing prompts, used offline or without an AI key. Three bands by level; each
// prompt is in the language being learned, with an English line underneath.
import type { Level } from './levels';

export interface WritingPrompt {
  text: string;
  en: string;
}

type Band = 'start' | 'middle' | 'high';
const BAND: Record<Level, Band> = { A0: 'start', A1: 'start', A2: 'start', B1: 'middle', B2: 'middle', C1: 'high' };

const EN: Record<Band, string[]> = {
  start: [
    'Describe your morning today.',
    'What did you eat today? Did you like it?',
    'Write about a person in your family.',
    'What is the weather like, and what are you doing today?',
    'Describe your room or your favourite place at home.',
  ],
  middle: [
    'Tell the story of a trip you remember well.',
    'What would you change about your city, and why?',
    'Describe a book, film or series you liked recently.',
    'Write about a habit you would like to start.',
    'What did you learn this week, inside or outside lessons?',
  ],
  high: [
    'Is technology making us more or less connected? Argue your view.',
    'Describe a moment that changed how you see something.',
    'Which tradition from your culture would you explain to a stranger, and how?',
    'Write a short letter to yourself ten years from now.',
  ],
};

const PROMPTS: Record<string, Record<Band, string[]>> = {
  en: {
    start: ['Describe your morning today.', 'What did you eat today? Did you like it?', 'Write about a person in your family.', 'What is the weather like, and what are you doing today?', 'Describe your room or your favourite place at home.'],
    middle: ['Tell the story of a trip you remember well.', 'What would you change about your city, and why?', 'Describe a book, film or series you liked recently.', 'Write about a habit you would like to start.', 'What did you learn this week, inside or outside lessons?'],
    high: ['Is technology making us more or less connected? Argue your view.', 'Describe a moment that changed how you see something.', 'Which tradition from your culture would you explain to a stranger, and how?', 'Write a short letter to yourself ten years from now.'],
  },
  es: {
    start: ['Describe tu mañana de hoy.', '¿Qué has comido hoy? ¿Te ha gustado?', 'Escribe sobre una persona de tu familia.', '¿Qué tiempo hace y qué haces hoy?', 'Describe tu habitación o tu lugar favorito de casa.'],
    middle: ['Cuenta la historia de un viaje que recuerdas bien.', '¿Qué cambiarías de tu ciudad y por qué?', 'Describe un libro, una película o una serie que te gustó hace poco.', 'Escribe sobre un hábito que te gustaría empezar.', '¿Qué has aprendido esta semana, en clase o fuera de ella?'],
    high: ['¿La tecnología nos acerca o nos aleja? Defiende tu opinión.', 'Describe un momento que cambió tu forma de ver algo.', '¿Qué tradición de tu cultura le explicarías a un desconocido, y cómo?', 'Escríbete una carta breve para dentro de diez años.'],
  },
  pt: {
    start: ['Descreve a tua manhã de hoje.', 'O que comeste hoje? Gostaste?', 'Escreve sobre uma pessoa da tua família.', 'Como está o tempo e o que vais fazer hoje?', 'Descreve o teu quarto ou o teu sítio preferido em casa.'],
    middle: ['Conta a história de uma viagem de que te lembras bem.', 'O que mudarias na tua cidade, e porquê?', 'Descreve um livro, um filme ou uma série de que gostaste recentemente.', 'Escreve sobre um hábito que gostavas de começar.', 'O que aprendeste esta semana, nas aulas ou fora delas?'],
    high: ['A tecnologia aproxima-nos ou afasta-nos? Defende a tua opinião.', 'Descreve um momento que mudou a forma como vês alguma coisa.', 'Que tradição da tua cultura explicarias a um desconhecido, e como?', 'Escreve uma pequena carta a ti mesmo daqui a dez anos.'],
  },
  fr: {
    start: ['Décris ta matinée d’aujourd’hui.', 'Qu’est-ce que tu as mangé aujourd’hui ? Tu as aimé ?', 'Écris sur une personne de ta famille.', 'Quel temps fait-il, et que fais-tu aujourd’hui ?', 'Décris ta chambre ou ton endroit préféré à la maison.'],
    middle: ['Raconte un voyage dont tu te souviens bien.', 'Que changerais-tu dans ta ville, et pourquoi ?', 'Décris un livre, un film ou une série que tu as aimé récemment.', 'Écris sur une habitude que tu aimerais prendre.', 'Qu’as-tu appris cette semaine, en cours ou ailleurs ?'],
    high: ['La technologie nous rapproche-t-elle ou nous éloigne-t-elle ? Défends ton point de vue.', 'Décris un moment qui a changé ta façon de voir quelque chose.', 'Quelle tradition de ta culture expliquerais-tu à un inconnu, et comment ?', 'Écris une courte lettre à toi-même dans dix ans.'],
  },
  it: {
    start: ['Descrivi la tua mattina di oggi.', 'Che cosa hai mangiato oggi? Ti è piaciuto?', 'Scrivi di una persona della tua famiglia.', 'Che tempo fa e che cosa fai oggi?', 'Descrivi la tua camera o il tuo posto preferito in casa.'],
    middle: ['Racconta un viaggio che ricordi bene.', 'Che cosa cambieresti della tua città, e perché?', 'Descrivi un libro, un film o una serie che ti è piaciuto di recente.', 'Scrivi di un’abitudine che vorresti iniziare.', 'Che cosa hai imparato questa settimana, a lezione o fuori?'],
    high: ['La tecnologia ci avvicina o ci allontana? Difendi la tua opinione.', 'Descrivi un momento che ha cambiato il tuo modo di vedere qualcosa.', 'Quale tradizione della tua cultura spiegheresti a uno sconosciuto, e come?', 'Scrivi una breve lettera a te stesso tra dieci anni.'],
  },
  de: {
    start: ['Beschreib deinen Morgen heute.', 'Was hast du heute gegessen? Hat es dir geschmeckt?', 'Schreib über eine Person aus deiner Familie.', 'Wie ist das Wetter, und was machst du heute?', 'Beschreib dein Zimmer oder deinen Lieblingsort zu Hause.'],
    middle: ['Erzähl von einer Reise, an die du dich gut erinnerst.', 'Was würdest du an deiner Stadt ändern, und warum?', 'Beschreib ein Buch, einen Film oder eine Serie, die dir neulich gefallen hat.', 'Schreib über eine Gewohnheit, die du gern anfangen würdest.', 'Was hast du diese Woche gelernt, im Unterricht oder außerhalb?'],
    high: ['Bringt uns die Technik näher zusammen oder entfernt sie uns? Begründe deine Meinung.', 'Beschreib einen Moment, der deinen Blick auf etwas verändert hat.', 'Welche Tradition deiner Kultur würdest du einem Fremden erklären, und wie?', 'Schreib dir selbst einen kurzen Brief in zehn Jahren.'],
  },
  sv: {
    start: ['Beskriv din morgon i dag.', 'Vad har du ätit i dag? Tyckte du om det?', 'Skriv om en person i din familj.', 'Hur är vädret, och vad gör du i dag?', 'Beskriv ditt rum eller din favoritplats hemma.'],
    middle: ['Berätta om en resa som du minns väl.', 'Vad skulle du ändra i din stad, och varför?', 'Beskriv en bok, en film eller en serie som du gillade nyligen.', 'Skriv om en vana som du skulle vilja börja med.', 'Vad har du lärt dig den här veckan, på lektionen eller utanför?'],
    high: ['För tekniken oss närmare varandra eller längre ifrån varandra? Argumentera för din åsikt.', 'Beskriv ett ögonblick som förändrade hur du ser på något.', 'Vilken tradition från din kultur skulle du förklara för en främling, och hur?', 'Skriv ett kort brev till dig själv om tio år.'],
  },
  ru: {
    start: ['Опиши своё сегодняшнее утро.', 'Что ты сегодня ел? Тебе понравилось?', 'Напиши о человеке из твоей семьи.', 'Какая сегодня погода и что ты делаешь?', 'Опиши свою комнату или любимое место дома.'],
    middle: ['Расскажи о поездке, которую ты хорошо помнишь.', 'Что бы ты изменил в своём городе и почему?', 'Опиши книгу, фильм или сериал, который тебе недавно понравился.', 'Напиши о привычке, которую ты хотел бы завести.', 'Чему ты научился на этой неделе — на уроках или вне их?'],
    high: ['Технологии сближают нас или отдаляют? Аргументируй свою точку зрения.', 'Опиши момент, который изменил твой взгляд на что-то.', 'Какую традицию своей культуры ты объяснил бы незнакомцу и как?', 'Напиши короткое письмо себе через десять лет.'],
  },
  el: {
    start: ['Περίγραψε το σημερινό σου πρωινό.', 'Τι έφαγες σήμερα; Σου άρεσε;', 'Γράψε για ένα άτομο από την οικογένειά σου.', 'Τι καιρό κάνει και τι κάνεις σήμερα;', 'Περίγραψε το δωμάτιό σου ή το αγαπημένο σου μέρος στο σπίτι.'],
    middle: ['Διηγήσου ένα ταξίδι που θυμάσαι καλά.', 'Τι θα άλλαζες στην πόλη σου και γιατί;', 'Περίγραψε ένα βιβλίο, μια ταινία ή μια σειρά που σου άρεσε πρόσφατα.', 'Γράψε για μια συνήθεια που θα ήθελες να ξεκινήσεις.', 'Τι έμαθες αυτή την εβδομάδα, στο μάθημα ή έξω από αυτό;'],
    high: ['Η τεχνολογία μάς φέρνει πιο κοντά ή μας απομακρύνει; Υποστήριξε την άποψή σου.', 'Περίγραψε μια στιγμή που άλλαξε τον τρόπο που βλέπεις κάτι.', 'Ποια παράδοση του πολιτισμού σου θα εξηγούσες σε έναν άγνωστο και πώς;', 'Γράψε ένα σύντομο γράμμα στον εαυτό σου σε δέκα χρόνια.'],
  },
  hu: {
    start: ['Írd le, milyen volt a reggeled ma.', 'Mit ettél ma? Ízlett?', 'Írj a családod egyik tagjáról.', 'Milyen az idő, és mit csinálsz ma?', 'Írd le a szobádat vagy a kedvenc helyedet otthon.'],
    middle: ['Mesélj el egy utazást, amelyre jól emlékszel.', 'Mit változtatnál meg a városodban, és miért?', 'Írj egy könyvről, filmről vagy sorozatról, amely nemrég tetszett.', 'Írj egy szokásról, amelyet szívesen elkezdenél.', 'Mit tanultál ezen a héten, órán vagy azon kívül?'],
    high: ['Közelebb hoz minket a technológia, vagy eltávolít? Érvelj a véleményed mellett.', 'Írj egy pillanatról, amely megváltoztatta, hogyan látsz valamit.', 'Melyik hagyományodat magyaráznád el egy idegennek, és hogyan?', 'Írj egy rövid levelet önmagadnak tíz év múlva.'],
  },
  nl: {
    start: ['Beschrijf je ochtend van vandaag.', 'Wat heb je vandaag gegeten? Vond je het lekker?', 'Schrijf over iemand uit je familie.', 'Wat voor weer is het, en wat doe je vandaag?', 'Beschrijf je kamer of je favoriete plek in huis.'],
    middle: ['Vertel over een reis die je je goed herinnert.', 'Wat zou je aan je stad veranderen, en waarom?', 'Beschrijf een boek, film of serie die je onlangs mooi vond.', 'Schrijf over een gewoonte waarmee je zou willen beginnen.', 'Wat heb je deze week geleerd, in of buiten de les?'],
    high: ['Brengt technologie ons dichter bij elkaar of juist verder uit elkaar? Verdedig je mening.', 'Beschrijf een moment dat je kijk op iets heeft veranderd.', 'Welke traditie uit je cultuur zou je aan een vreemde uitleggen, en hoe?', 'Schrijf een korte brief aan jezelf over tien jaar.'],
  },
  nb: {
    start: ['Beskriv morgenen din i dag.', 'Hva har du spist i dag? Likte du det?', 'Skriv om en person i familien din.', 'Hvordan er været, og hva gjør du i dag?', 'Beskriv rommet ditt eller favorittstedet ditt hjemme.'],
    middle: ['Fortell om en reise du husker godt.', 'Hva ville du forandret i byen din, og hvorfor?', 'Beskriv en bok, en film eller en serie du likte nylig.', 'Skriv om en vane du gjerne vil begynne med.', 'Hva har du lært denne uka, i eller utenfor timene?'],
    high: ['Bringer teknologien oss nærmere hverandre eller lenger fra hverandre? Argumenter for synet ditt.', 'Beskriv et øyeblikk som forandret hvordan du ser på noe.', 'Hvilken tradisjon fra kulturen din ville du forklart for en fremmed, og hvordan?', 'Skriv et kort brev til deg selv om ti år.'],
  },
  tr: {
    start: ['Bugünkü sabahını anlat.', 'Bugün ne yedin? Beğendin mi?', 'Ailenden birini anlat.', 'Hava nasıl, bugün ne yapıyorsun?', 'Odanı ya da evdeki en sevdiğin yeri anlat.'],
    middle: ['İyi hatırladığın bir yolculuğu anlat.', 'Şehrinde neyi değiştirirdin, neden?', 'Son zamanlarda beğendiğin bir kitabı, filmi ya da diziyi anlat.', 'Başlamak istediğin bir alışkanlık hakkında yaz.', 'Bu hafta derste ya da ders dışında ne öğrendin?'],
    high: ['Teknoloji bizi birbirimize yaklaştırıyor mu, uzaklaştırıyor mu? Görüşünü savun.', 'Bir şeye bakışını değiştiren bir anı anlat.', 'Kültüründen hangi geleneği bir yabancıya anlatırdın, nasıl?', 'On yıl sonraki kendine kısa bir mektup yaz.'],
  },
  id: {
    start: ['Ceritakan pagimu hari ini.', 'Apa yang kamu makan hari ini? Kamu suka?', 'Tulislah tentang seseorang di keluargamu.', 'Bagaimana cuacanya, dan apa yang kamu lakukan hari ini?', 'Gambarkan kamarmu atau tempat favoritmu di rumah.'],
    middle: ['Ceritakan perjalanan yang kamu ingat dengan baik.', 'Apa yang ingin kamu ubah di kotamu, dan mengapa?', 'Ceritakan buku, film, atau serial yang kamu sukai baru-baru ini.', 'Tulislah tentang kebiasaan yang ingin kamu mulai.', 'Apa yang kamu pelajari minggu ini, di dalam atau di luar kelas?'],
    high: ['Apakah teknologi membuat kita lebih dekat atau lebih jauh? Pertahankan pendapatmu.', 'Ceritakan saat yang mengubah caramu memandang sesuatu.', 'Tradisi apa dari budayamu yang akan kamu jelaskan kepada orang asing, dan bagaimana?', 'Tulislah surat pendek untuk dirimu sepuluh tahun lagi.'],
  },
  sw: {
    start: ['Eleza asubuhi yako ya leo.', 'Umekula nini leo? Ulipenda?', 'Andika kuhusu mtu mmoja katika familia yako.', 'Hali ya hewa ikoje, na unafanya nini leo?', 'Eleza chumba chako au mahali unapopenda zaidi nyumbani.'],
    middle: ['Simulia safari unayoikumbuka vizuri.', 'Ungebadilisha nini katika mji wako, na kwa nini?', 'Eleza kitabu, filamu au tamthilia uliyoipenda hivi karibuni.', 'Andika kuhusu tabia ambayo ungependa kuanza.', 'Umejifunza nini wiki hii, darasani au nje ya darasa?'],
    high: ['Je, teknolojia inatuleta karibu zaidi au inatutenganisha? Tetea maoni yako.', 'Eleza wakati uliobadilisha jinsi unavyoona jambo fulani.', 'Ni desturi gani ya utamaduni wako ungemweleza mgeni, na vipi?', 'Andika barua fupi kwako mwenyewe miaka kumi ijayo.'],
  },
  la: {
    start: ['Describe mane tuum hodiernum.', 'Quid hodie edisti? Placuitne tibi?', 'Scribe de aliquo ex familia tua.', 'Quale est caelum, et quid hodie agis?', 'Describe cubiculum tuum aut locum domi tibi carissimum.'],
    middle: ['Narra iter quod bene meministi.', 'Quid in urbe tua mutares, et cur?', 'Describe librum, pelliculam aut seriem quae tibi nuper placuit.', 'Scribe de consuetudine quam incipere velis.', 'Quid hac hebdomade didicisti, in schola aut extra?'],
    high: ['Utrum ars technica nos coniungit an seiungit? Sententiam tuam defende.', 'Describe momentum quod mutavit quomodo rem aliquam videas.', 'Quem morem gentis tuae homini ignoto explicares, et quomodo?', 'Scribe brevem epistulam tibi ipsi post decem annos.'],
  },
  ar: {
    start: ['صف صباحك اليوم.', 'ماذا أكلت اليوم؟ هل أعجبك؟', 'اكتب عن شخص من عائلتك.', 'كيف الطقس، وماذا تفعل اليوم؟', 'صف غرفتك أو مكانك المفضل في البيت.'],
    middle: ['احكِ قصة رحلة تتذكرها جيدًا.', 'ماذا كنت ستغير في مدينتك، ولماذا؟', 'صف كتابًا أو فيلمًا أو مسلسلًا أعجبك مؤخرًا.', 'اكتب عن عادة تود أن تبدأها.', 'ماذا تعلمت هذا الأسبوع، داخل الدروس أو خارجها؟'],
    high: ['هل تقربنا التكنولوجيا من بعضنا أم تبعدنا؟ دافع عن رأيك.', 'صف لحظة غيرت نظرتك إلى شيء ما.', 'أي تقليد من ثقافتك ستشرحه لشخص غريب، وكيف؟', 'اكتب رسالة قصيرة إلى نفسك بعد عشر سنوات.'],
  },
  zh: {
    start: ['描述一下你今天的早上。', '你今天吃了什么？好吃吗？', '写一写你家里的一个人。', '今天天气怎么样？你今天做什么？', '描述一下你的房间或家里你最喜欢的地方。'],
    middle: ['讲一次你记得很清楚的旅行。', '你想改变你的城市的什么？为什么？', '介绍一本你最近喜欢的书、电影或电视剧。', '写一个你想开始养成的习惯。', '这个星期你学到了什么？课上课外都可以。'],
    high: ['科技让我们更亲近还是更疏远？说说你的观点。', '描述一个改变了你对某件事看法的时刻。', '你会向陌生人介绍你文化中的哪个传统？怎么介绍？', '给十年后的自己写一封短信。'],
  },
  ja: {
    start: ['今日の朝について書いてください。', '今日は何を食べましたか。おいしかったですか。', '家族の一人について書いてください。', '今日の天気はどうですか。今日は何をしますか。', '自分の部屋か、家で一番好きな場所について書いてください。'],
    middle: ['よく覚えている旅行について話してください。', '自分の町の何を変えたいですか。それはなぜですか。', '最近気に入った本、映画、ドラマについて書いてください。', '始めたい習慣について書いてください。', '今週、授業の中や外で何を学びましたか。'],
    high: ['テクノロジーは私たちを近づけていますか、それとも遠ざけていますか。自分の意見を述べてください。', 'ものの見方が変わった瞬間について書いてください。', '自分の文化のどんな伝統を、知らない人にどう説明しますか。', '十年後の自分に短い手紙を書いてください。'],
  },
  ko: {
    start: ['오늘 아침에 대해 써 보세요.', '오늘 무엇을 먹었어요? 맛있었어요?', '가족 중 한 사람에 대해 써 보세요.', '오늘 날씨는 어때요? 오늘 무엇을 해요?', '내 방이나 집에서 가장 좋아하는 곳을 묘사해 보세요.'],
    middle: ['잘 기억나는 여행 이야기를 해 보세요.', '내가 사는 도시에서 무엇을 바꾸고 싶어요? 왜요?', '최근에 마음에 든 책, 영화, 드라마를 소개해 보세요.', '시작하고 싶은 습관에 대해 써 보세요.', '이번 주에 수업 안팎에서 무엇을 배웠어요?'],
    high: ['기술은 우리를 더 가깝게 만들까요, 더 멀어지게 만들까요? 자신의 의견을 주장해 보세요.', '어떤 것을 보는 시각이 바뀐 순간을 묘사해 보세요.', '낯선 사람에게 우리 문화의 어떤 전통을 어떻게 설명하겠어요?', '10년 후의 나에게 짧은 편지를 써 보세요.'],
  },
};

/** Today's offline prompt: the same all day, a different one tomorrow. */
export function curatedPrompt(lang: string, level: Level, day = new Date()): WritingPrompt {
  const band = BAND[level];
  const list = PROMPTS[lang]?.[band] ?? PROMPTS.en[band];
  const dayNumber = Math.floor(day.getTime() / 86_400_000);
  const i = dayNumber % list.length;
  return { text: list[i], en: EN[band][i] };
}

/** Another prompt than the given one (the "different prompt" button). */
export function otherPrompt(lang: string, level: Level, current: string): WritingPrompt {
  const band = BAND[level];
  const list = PROMPTS[lang]?.[band] ?? PROMPTS.en[band];
  const at = list.indexOf(current);
  const i = (at + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
  return { text: list[i], en: EN[band][i] };
}
