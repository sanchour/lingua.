// The standalone app: sandesigning.html, the hosted page and the downloaded file alike.
import { close, open } from './index';

// Files dropped beside the canvas shouldn't make the browser leave the page.
addEventListener('dragover', (e) => e.preventDefault());
addEventListener('drop', (e) => e.preventDefault());

// window.sandesigning.studio lets a script or an AI agent driving the browser read and change the canvas.
void open({ standalone: true, base: './' }).then((studio) => ((window as unknown as { sandesigning: object }).sandesigning = { open, close, studio }));
