// Relays a request from a video site (or a selection on any page) to an open Lingua tab and back. Lingua stays the only place words are looked up and saved.
const LINGUA = ['https://sanchour.github.io/lingua./*', 'http://localhost/*', 'http://127.0.0.1/*'];

async function relay(payload) {
  const tabs = await chrome.tabs.query({ url: LINGUA });
  if (!tabs.length) return { ok: false, error: 'no-lingua' };
  // The tab that was used last is the one being learned in.
  tabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
  try {
    return await chrome.tabs.sendMessage(tabs[0].id, { type: 'lingua:forward', payload });
  } catch {
    return { ok: false, error: 'no-lingua' };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== 'lingua:request') return false;
  relay(message.payload).then(sendResponse);
  return true;
});

// "Send to Lingua": the selected text of any page becomes a text in Codex, in the language being learned.
chrome.runtime.onInstalled.addListener(() => chrome.contextMenus.create({ id: 'lingua-send', title: 'Send selection to Lingua', contexts: ['selection'] }));
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'lingua-send' || !info.selectionText) return;
  const reply = await relay({ type: 'text', title: (tab && tab.title) || '', text: info.selectionText });
  // The badge says how it went: a tick, or a mark when no Lingua tab is open.
  chrome.action.setBadgeText({ text: reply && reply.ok ? '✓' : '!' });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000);
});
