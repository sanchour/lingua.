// The word graph's worker, from the main thread (6-29 G4): one worker for the session, asked by message.
import type { GraphWorkerReply, GraphWorkerRequest } from '@/workers/graph.worker';
import GraphWorker from '@/workers/graph.worker?worker';

type Request = GraphWorkerRequest extends infer R ? (R extends { id: number } ? Omit<R, 'id'> : never) : never;
let worker: Worker | null = null;
let next = 0;
const waiting = new Map<number, { resolve: (reply: GraphWorkerReply) => void; reject: (error: Error) => void }>();
const ready = new Set<string>();

function ask(request: Request): Promise<GraphWorkerReply> {
  if (!worker) {
    worker = new GraphWorker();
    worker.onmessage = (event: MessageEvent<GraphWorkerReply>) => {
      const reply = event.data, wait = waiting.get(reply.id);
      waiting.delete(reply.id);
      if (reply.type === 'error') wait?.reject(new Error(reply.message));
      else wait?.resolve(reply);
    };
  }
  const id = ++next;
  return new Promise((resolve, reject) => {
    waiting.set(id, { resolve, reject });
    worker!.postMessage({ ...request, id } as GraphWorkerRequest);
  });
}

/** Builds the atlas again if the words changed (the cached scene in `graphLayouts` updates), and returns how well each word
 *  is known now, by key. */
export async function refreshAtlas(lang: string): Promise<{ built: boolean; memory: Record<string, number>; ms: number }> {
  const reply = await ask({ type: 'atlas', lang });
  if (reply.type !== 'atlas') throw new Error('The word graph could not be built.');
  return reply;
}

/** True once the made-from index of a language has been built this session. */
export const madeFromReady = (lang: string) => ready.has(lang);

/** The words made from each key (whose `parts` name it). The first call reads the whole dictionary in the worker. */
export async function madeFromOf(lang: string, keys: readonly string[]): Promise<Record<string, string[]>> {
  const reply = await ask({ type: 'madeFrom', lang, keys: [...keys] });
  if (reply.type !== 'madeFrom') throw new Error('The word graph could not be built.');
  ready.add(lang);
  return reply.made;
}
