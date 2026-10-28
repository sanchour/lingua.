// Lingua 5/6 moved rooms (Cursus, Mentis, Settings). Every old address keeps working:
// links in notes, bookmarks, other sessions' work and the installed app's history land on the new one.

/**
 * The new address for an old one, or null when it hasn't moved. `search` is the query with its "?"
 * ('' when there is none); a query the old page understood travels along.
 */
/** The kind of pick each of Explore's old shelves held. */
const SHELF_KIND: Record<string, string> = { watch: 'series', read: 'books', listen: 'podcasts', radio: 'radio', play: 'games' };

export function movedPath(pathname: string, search = ''): string | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(search);
  const keep = (to: string) => (search && search !== '?' ? `${to}${search}` : to);

  // Grammatica and its alphabets live in Cursus.
  if (path === '/grammatica/letters' || path.startsWith('/grammatica/letters/')) return keep(`/cursus/alphabets${path.slice('/grammatica/letters'.length)}`);
  if (path === '/grammatica' || path.startsWith('/grammatica/')) return keep(`/cursus${path}`);

  // Mundus's Explore and Every pick became Explore in Explora (5.2-7); the old shelves and kinds open the matching kind.
  if (path === '/mentis/explore' || path === '/mentis/picks') {
    const shelf = params.get('shelf');
    if (shelf === 'words') return '/explora?tab=words';
    if (shelf === 'beyond') return '/mentis/try';
    const kind = path === '/mentis/picks' ? params.get('kind') : (shelf && SHELF_KIND[shelf]) || null;
    return kind ? `/explora?kind=${encodeURIComponent(kind)}` : '/explora';
  }

  // Mundus, Colloquium (now Sermo) and Diarium are the three tabs of Mentis.
  if (path === '/mundus' || path.startsWith('/mundus/')) return movedPath(`/mentis${path.slice('/mundus'.length)}`, search) ?? keep(`/mentis${path.slice('/mundus'.length)}`);
  if (path === '/colloquium' || path.startsWith('/colloquium/')) return keep(`/mentis/sermo${path.slice('/colloquium'.length)}`);
  if (path === '/codex' && params.get('tab') === 'diarium') return '/mentis/diarium';
  if (path.startsWith('/codex/diarium/')) return `/mentis/diarium${path.slice('/codex/diarium'.length)}`;

  // Ordo is called Settings again.
  if (path === '/ordo' || path.startsWith('/ordo/')) return keep(`/settings${path.slice('/ordo'.length)}`);
  return null;
}

/** A room's tabs share one page, so moving between them animates the tab, not the whole page. */
export function roomKey(pathname: string): string | null {
  const m = /^\/(cursus|mentis)(?:\/(?:course|grammatica|alphabets|typing|explore|picks|try|sermo|diarium))?\/?$/.exec(pathname);
  return m ? `/${m[1]}` : null;
}
