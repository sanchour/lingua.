import { describe, expect, it } from 'vitest';
import {
  computeFluencyMetrics,
  parseTranscript,
  reviewConversation,
} from './review';

describe('reviewConversation', () => {
  const sampleDialogue = `
You: Hola, yo tener una pregunta sobre la ciudad.
AI: ¡Hola! Claro que sí, dime qué te gustaría saber.
You: Bueno... eh... en mi opinión hace muy bien tiempo hoy y quiero visitar el parque porque es bonito.
AI: Es un día perfecto para pasear por el parque. ¿Prefieres caminar o alquilar una bici?
You: Prefiero caminar caminar despacio.
  `.trim();

  it('parses dialogue into speaker turns with correct roles', () => {
    const turns = parseTranscript(sampleDialogue);
    expect(turns.length).toBe(5);
    expect(turns[0].speaker).toBe('learner');
    expect(turns[0].text).toContain('yo tener una pregunta');
    expect(turns[1].speaker).toBe('partner');
    expect(turns[2].speaker).toBe('learner');
  });

  it('computes fluency metrics: words, speech rate, fillers, repetitions, complexity (F0562–F0570, F0602, F0603)', () => {
    const turns = parseTranscript(sampleDialogue);
    const metrics = computeFluencyMetrics(turns, 'es');

    expect(metrics.learnerWords).toBeGreaterThan(15);
    expect(metrics.speechRateWpm).toBeGreaterThan(0);
    expect(metrics.speechDurationEstimateSeconds).toBeGreaterThan(0);

    // Filler-word tracking (F0563)
    const fillers = metrics.fillerWords.map((f) => f.word);
    expect(fillers).toContain('eh');
    expect(fillers).toContain('bueno');

    // Repeated-word tracking (F0564)
    expect(metrics.repeatedWords.some((r) => r.phrase === 'caminar caminar')).toBe(true);

    // Sentence complexity (F0565)
    expect(metrics.subordinateClauseCount).toBeGreaterThan(0);
    expect(metrics.complexityScore).toBeGreaterThan(0);

    // Hesitations & pauses (F0568, F0603)
    expect(metrics.hesitationsAndPauses).toBeGreaterThan(0);

    // Overall fluency feedback score (F0562)
    expect(metrics.fluencyScore).toBeGreaterThan(50);
    expect(metrics.overallSummary).toBeTruthy();
  });

  it('provides sentence-by-sentence analysis, essential vs stylistic corrections, and confidence (F0556–F0558, F0571–F0574, F0581)', () => {
    const review = reviewConversation(sampleDialogue, 'es');

    // Sentence-by-sentence review (F0581)
    expect(review.sentences.length).toBeGreaterThanOrEqual(3);

    // Essential grammar corrections (F0557, F0574)
    const firstSentence = review.sentences[0];
    expect(firstSentence.essentialErrors.length).toBeGreaterThan(0);
    expect(firstSentence.corrected).toContain('tengo');
    expect(firstSentence.confidence).toBe('high'); // F0573

    // Stylistic / natural alternatives (F0558, F0560)
    const secondSentence = review.sentences[1];
    expect(secondSentence.stylisticSuggestions.length + secondSentence.idiomaticAlternatives.length).toBeGreaterThan(0);

    // Corrected transcript (F0556)
    expect(review.correctedTranscript).toContain('tengo');
  });

  it('extracts vocabulary items and summary from mistakes and expressions (F0559, F0575, F0576, F0582, F0978)', () => {
    const review = reviewConversation(sampleDialogue, 'es');

    expect(review.vocabulary.length).toBeGreaterThan(0);
    const vocab = review.vocabulary[0];
    expect(vocab.term).toBeTruthy();
    expect(vocab.meaning).toBeTruthy();
    expect(vocab.context).toBeTruthy();

    expect(review.newExpressionsSummary).toContain('Identified');
  });

  it('detects French grammatical and collocation errors', () => {
    const frText = `
You: Bonjour, je avoir une question. Je veux visiter mes amis parce que il fait très beaucoup beau.
AI: Bonjour ! Avec plaisir.
    `.trim();
    const review = reviewConversation(frText, 'fr');
    expect(review.sentences.length).toBeGreaterThan(1);
    const s0 = review.sentences[0];
    expect(s0.essentialErrors.length).toBeGreaterThan(0);
    expect(s0.corrected).toContain("j'ai");

    const s1 = review.sentences[1];
    expect(s1.essentialErrors.length).toBeGreaterThan(0);
    expect(s1.corrected).toContain('rendre visite à');
  });

  it('detects German Perfekt auxiliary and prepositional errors', () => {
    const deText = `
You: Hallo! Gestern ich habe gegangen zum Markt in die Wochenende.
    `.trim();
    const review = reviewConversation(deText, 'de');
    expect(review.sentences.length).toBeGreaterThan(1);
    const s1 = review.sentences[1];
    expect(s1.essentialErrors.length).toBeGreaterThan(0);
    expect(s1.corrected).toContain('ich bin gegangen');
  });
});
