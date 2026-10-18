import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';

// Self-hosted fonts (work offline). Each file only downloads when its characters are used.
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/inter';
import '@fontsource-variable/literata';
import '@fontsource-variable/lora';
import '@fontsource-variable/newsreader';
import '@fontsource-variable/merriweather';
import '@fontsource-variable/noto-serif';
import '@fontsource-variable/comfortaa';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './styles/index.css';

import { router } from './app/router';
import { installPaletteStyles } from './design/palettes';

// The chosen theme's colours before the first render (index.html already set data-palette).
installPaletteStyles();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
