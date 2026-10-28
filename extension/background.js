// Relays a request from a video site to an open Lingua tab and back. Lingua stays the only place words are looked up and saved.
const LINGUA = ['https://sanchour.github.io/lingua./*', 'http://localhost/*', 'http://127.0.0.1/*'];

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== 'lingua:request') return false;
  (async () => {
    const tabs = await chrome.tabs.query({ url: LINGUA });
    if (!tabs.length) return { ok: false, error: 'no-lingua' };
    // The tab that was used last is the one being learned in.
    tabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
    try {
      return await chrome.tabs.sendMessage(tabs[0].id, { type: 'lingua:forward', payload: message.payload });
    } catch {
      return { ok: false, error: 'no-lingua' };
    }
  })().then(sendResponse);
  return true;
});
