// The standalone app: sandesigner.html, the hosted page and the downloaded file alike.
import { close, open } from './index';

// Files dropped beside the canvas shouldn't make the browser leave the page.
addEventListener('dragover', (e) => e.preventDefault());
addEventListener('drop', (e) => e.preventDefault());

// window.sandesigner.studio (and window.sandesigning.studio) lets a script or an AI agent driving the browser read and change the canvas.
void open({ standalone: true, base: './' }).then((studio) => {
  const api = { open, close, studio, version: '1.1' };
  (window as unknown as { sandesigner: object; sandesigning: object }).sandesigner = api;
  (window as unknown as { sandesigner: object; sandesigning: object }).sandesigning = api;
});
