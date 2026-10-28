// Runs in the page itself, before the player: it watches the subtitle files the player loads (fetch and XMLHttpRequest) and passes a copy
// of each to the content script. It never touches the video or its stream.
(() => {
  const LIKELY = /timedtext|\.vtt\b|\.ttml|\.dfxp|\.srt\b|subtitle|caption|textstream|[?&]o=\d/i;
  const LIMIT = 3_000_000;
  const post = (url, body) => {
    if (typeof body !== 'string' || body.length > LIMIT) return;
    const head = body.slice(0, 400).trimStart();
    const looks = head.startsWith('WEBVTT') || (head.startsWith('{') && /"events"\s*:/.test(body.slice(0, 4000))) || /<tt[\s>]/.test(head) || (/<\?xml/.test(head) && /\bbegin=/.test(body.slice(0, 6000)));
    if (looks) window.postMessage({ source: 'lingua-ext-subs', url: String(url), body }, window.location.origin);
  };

  const realFetch = window.fetch;
  window.fetch = function (input, init) {
    const result = realFetch.apply(this, arguments);
    try {
      const url = typeof input === 'string' ? input : input && input.url;
      result.then((response) => {
        const type = response.headers.get('content-type') || '';
        if (LIKELY.test(url || '') || /vtt|ttml|xml|json/.test(type)) response.clone().text().then((text) => post(response.url || url, text), () => {});
      }, () => {});
    } catch {
      // Never get in the player's way.
    }
    return result;
  };

  const open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    try {
      this.addEventListener('load', () => {
        if ((this.responseType === '' || this.responseType === 'text') && (LIKELY.test(String(url)) || /vtt|ttml|xml|json/.test(this.getResponseHeader('content-type') || ''))) post(url, this.responseText);
      });
    } catch {
      // Same.
    }
    return open.apply(this, arguments);
  };
})();
