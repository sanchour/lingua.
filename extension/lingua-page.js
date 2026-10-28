// Runs on Lingua's own pages: hands a request from the extension to the app (window messages, same origin) and returns its answer.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== 'lingua:forward') return false;
  const id = crypto.randomUUID();
  const done = (reply) => {
    window.removeEventListener('message', onMessage);
    clearTimeout(timer);
    sendResponse(reply);
  };
  const onMessage = (event) => {
    if (event.source === window && event.data && event.data.source === 'lingua-app' && event.data.id === id) done(event.data.reply);
  };
  const timer = setTimeout(() => done({ ok: false, error: 'timeout' }), 6000);
  window.addEventListener('message', onMessage);
  window.postMessage({ source: 'lingua-extension', id, request: message.payload }, window.location.origin);
  return true;
});
