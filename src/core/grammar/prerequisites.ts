import type { Grammar, Topic } from './types';
import { findTopic } from './types';

/** Get the prerequisites for a topic. */
export function getPrerequisites(grammar: Grammar, topic: Topic): Topic[] {
  if (topic.prerequisites && topic.prerequisites.length > 0) {
    return topic.prerequisites
      .map((id) => findTopic(grammar, id))
      .filter((t): t is Topic => t !== undefined);
  }

  // Heuristic: if topic has related topics at an earlier CEFR level, treat earlier ones as prerequisites
  const LEVEL_ORDER: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5 };
  const topicRank = LEVEL_ORDER[topic.level] ?? 1;

  if (topic.related && topic.related.length > 0) {
    const earlierRelated = topic.related
      .map((id) => findTopic(grammar, id))
      .filter((t): t is Topic => t !== undefined && (LEVEL_ORDER[t.level] ?? 1) < topicRank);
    if (earlierRelated.length > 0) return earlierRelated;
  }

  return [];
}

/** Check which prerequisites are met vs missing. */
export function checkPrerequisites(
  grammar: Grammar,
  topic: Topic,
  learnedTopicIds: Set<string>,
): { ready: boolean; met: Topic[]; missing: Topic[] } {
  const prereqs = getPrerequisites(grammar, topic);
  const met: Topic[] = [];
  const missing: Topic[] = [];

  for (const p of prereqs) {
    if (learnedTopicIds.has(p.id)) {
      met.push(p);
    } else {
      missing.push(p);
    }
  }

  return {
    ready: missing.length === 0,
    met,
    missing,
  };
}
