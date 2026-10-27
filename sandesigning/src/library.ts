// What Sandesigning offers ready-made: device sizes, widget outlines for laying out a screen, fonts, and starter
// templates built from them.
import { uid } from './model';
import type { FrameNode, SNode, TextNode, WidgetNode } from './model';

export const DEVICES: { id: string; name: string; w: number; h: number }[] = [
  { id: 'desktop', name: 'Desktop', w: 1440, h: 900 },
  { id: 'laptop', name: 'Laptop', w: 1366, h: 768 },
  { id: 'small', name: 'Small desktop', w: 1280, h: 800 },
  { id: 'tablet', name: 'Tablet', w: 834, h: 1194 },
  { id: 'phone', name: 'Phone', w: 390, h: 844 },
  { id: 'android', name: 'Android', w: 412, h: 915 },
  { id: 'square', name: 'Square post', w: 1080, h: 1080 },
];

/** Outlines for laying out a screen before it is drawn: the label says what it is. */
export const WIDGETS: { id: string; name: string; w: number; h: number }[] = [
  { id: 'button', name: 'Button', w: 140, h: 44 },
  { id: 'input', name: 'Input', w: 280, h: 44 },
  { id: 'search', name: 'Search', w: 320, h: 40 },
  { id: 'card', name: 'Card', w: 320, h: 200 },
  { id: 'nav', name: 'Top bar', w: 1440, h: 64 },
  { id: 'sidebar', name: 'Sidebar', w: 240, h: 836 },
  { id: 'tabbar', name: 'Tab bar', w: 390, h: 80 },
  { id: 'list', name: 'List', w: 360, h: 240 },
  { id: 'table', name: 'Table', w: 720, h: 280 },
  { id: 'image', name: 'Picture', w: 320, h: 200 },
  { id: 'video', name: 'Video', w: 480, h: 270 },
  { id: 'chart', name: 'Chart', w: 480, h: 260 },
  { id: 'heading', name: 'Heading', w: 360, h: 40 },
  { id: 'text', name: 'Text block', w: 360, h: 72 },
  { id: 'toggle', name: 'Toggle', w: 52, h: 30 },
  { id: 'checkbox', name: 'Checkbox', w: 160, h: 24 },
  { id: 'slider', name: 'Slider', w: 240, h: 24 },
  { id: 'chip', name: 'Chip', w: 96, h: 32 },
  { id: 'avatar', name: 'Avatar', w: 48, h: 48 },
  { id: 'icon', name: 'Icon spot', w: 32, h: 32 },
  { id: 'modal', name: 'Dialog', w: 480, h: 320 },
  { id: 'tabs', name: 'Tabs', w: 420, h: 44 },
];

export const SYSTEM_FONTS = ['system-ui', 'Segoe UI', 'Arial', 'Helvetica', 'Verdana', 'Trebuchet MS', 'Georgia', 'Times New Roman', 'Courier New'];

/** Google Fonts, loaded the first time they are used (when online); the weights each has. */
export const WEB_FONTS: Record<string, string> = {
  Inter: '400;500;600;700;800',
  Roboto: '400;500;700',
  'Open Sans': '400;500;600;700',
  Lato: '400;700',
  Montserrat: '400;500;600;700;800',
  Poppins: '400;500;600;700',
  Nunito: '400;600;700;800',
  'DM Sans': '400;500;600;700',
  Manrope: '400;500;600;700;800',
  'Plus Jakarta Sans': '400;500;600;700;800',
  'Space Grotesk': '400;500;600;700',
  'Work Sans': '400;500;600;700',
  Outfit: '400;500;600;700',
  Rubik: '400;500;600;700',
  'IBM Plex Sans': '400;500;600;700',
  'Playfair Display': '400;600;700;800',
  Lora: '400;500;600;700',
  Merriweather: '400;700',
  'EB Garamond': '400;500;600;700',
  Fraunces: '400;600;700',
  'Libre Baskerville': '400;700',
  Oswald: '400;500;600;700',
  'Bebas Neue': '',
  'JetBrains Mono': '400;500;700',
  'Fira Code': '400;500;700',
  Caveat: '400;700',
  'Patrick Hand': '',
};

const loaded = new Set<string>();

/** Adds a Google Font to the page (fonts can't be declared inside a shadow root). */
export const loadFont = (family: string) => {
  if (!(family in WEB_FONTS) || loaded.has(family) || typeof document === 'undefined') return;
  loaded.add(family);
  const weights = WEB_FONTS[family];
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}${weights ? `:wght@${weights}` : ''}&display=swap`;
  document.head.appendChild(link);
};

export const fontStack = (family: string) => `${family === 'system-ui' ? 'system-ui' : `"${family}"`}, system-ui, -apple-system, "Segoe UI", sans-serif`;

// ——— Templates ———

const frame = (name: string, w: number, h: number, device?: string): FrameNode => ({ id: uid(), type: 'frame', name, x: 0, y: 0, w, h, fill: '#ffffff', clip: true, device });

const widget = (parent: FrameNode, kind: string, label: string, x: number, y: number, w: number, h: number): WidgetNode => ({ id: uid(), type: 'widget', widget: kind, label, x, y, w, h, parent: parent.id });

const text = (parent: FrameNode, words: string, x: number, y: number, size: number, weight = 400, color = '#111827'): TextNode => ({
  id: uid(),
  type: 'text',
  text: words,
  x,
  y,
  w: Math.round(words.length * size * 0.55),
  h: Math.round(size * 1.3),
  font: 'Inter',
  size,
  weight,
  color,
  align: 'left',
  lineHeight: 1.3,
  auto: true,
  parent: parent.id,
});

const repeat = <T>(n: number, f: (i: number) => T): T[] => Array.from({ length: n }, (_, i) => f(i));

export const TEMPLATES: { id: string; name: string; note: string; make: () => SNode[] }[] = [
  {
    id: 'desktop-app',
    name: 'Desktop app',
    note: 'Sidebar, top bar, cards and a list',
    make: () => {
      const f = frame('Desktop app', 1440, 900, 'desktop');
      return [
        f,
        widget(f, 'sidebar', 'Sidebar', 0, 0, 240, 900),
        widget(f, 'nav', 'Top bar', 240, 0, 1200, 64),
        text(f, 'Good morning', 288, 104, 32, 700),
        text(f, 'Here is where you left off.', 288, 150, 16, 400, '#6b7280'),
        ...repeat(3, (i) => widget(f, 'card', `Card ${i + 1}`, 288 + i * 368, 200, 344, 200)),
        widget(f, 'list', 'Recent', 288, 440, 1080, 300),
      ];
    },
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    note: 'Numbers, a chart and a table',
    make: () => {
      const f = frame('Dashboard', 1440, 900, 'desktop');
      return [
        f,
        widget(f, 'sidebar', 'Sidebar', 0, 0, 240, 900),
        text(f, 'Overview', 288, 40, 28, 700),
        widget(f, 'search', 'Search', 1072, 36, 320, 40),
        ...repeat(4, (i) => widget(f, 'card', ['Users', 'Revenue', 'Sessions', 'Growth'][i], 288 + i * 278, 108, 254, 120)),
        widget(f, 'chart', 'Chart', 288, 256, 700, 300),
        widget(f, 'list', 'Activity', 1012, 256, 380, 300),
        widget(f, 'table', 'Table', 288, 584, 1104, 268),
      ];
    },
  },
  {
    id: 'settings',
    name: 'Settings',
    note: 'Sections with switches',
    make: () => {
      const f = frame('Settings', 1440, 900, 'desktop');
      return [
        f,
        widget(f, 'sidebar', 'Sections', 0, 0, 280, 900),
        text(f, 'Settings', 340, 48, 32, 700),
        ...repeat(5, (i) => [text(f, ['Notifications', 'Dark mode', 'Sounds', 'Daily reminder', 'Auto-play'][i], 340, 140 + i * 72, 17, 500), widget(f, 'toggle', 'Toggle', 1060, 136 + i * 72, 52, 30)]).flat(),
        widget(f, 'button', 'Save', 340, 520, 140, 44),
      ];
    },
  },
  {
    id: 'landing',
    name: 'Landing page',
    note: 'Hero, features and a footer',
    make: () => {
      const f = frame('Landing page', 1440, 1700, 'desktop');
      return [
        f,
        widget(f, 'nav', 'Navigation', 0, 0, 1440, 72),
        text(f, 'A headline that says it all', 120, 180, 56, 800),
        text(f, 'One sentence on what it does and who it is for.', 120, 270, 20, 400, '#4b5563'),
        widget(f, 'button', 'Get started', 120, 330, 160, 52),
        widget(f, 'button', 'Learn more', 296, 330, 160, 52),
        widget(f, 'image', 'Hero picture', 780, 140, 540, 400),
        text(f, 'Features', 120, 660, 36, 700),
        ...repeat(3, (i) => widget(f, 'card', `Feature ${i + 1}`, 120 + i * 412, 730, 380, 260)),
        widget(f, 'card', 'Quote from a customer', 120, 1060, 1200, 220),
        widget(f, 'nav', 'Footer', 0, 1540, 1440, 160),
      ];
    },
  },
  {
    id: 'phone-app',
    name: 'Phone app',
    note: 'Header, search, a list and tabs',
    make: () => {
      const f = frame('Phone app', 390, 844, 'phone');
      return [
        f,
        widget(f, 'nav', 'Header', 0, 0, 390, 96),
        widget(f, 'search', 'Search', 16, 112, 358, 44),
        ...repeat(5, (i) => widget(f, 'card', `Item ${i + 1}`, 16, 172 + i * 104, 358, 92)),
        widget(f, 'tabbar', 'Tab bar', 0, 764, 390, 80),
      ];
    },
  },
  {
    id: 'sign-in',
    name: 'Sign in',
    note: 'A form on a phone',
    make: () => {
      const f = frame('Sign in', 390, 844, 'phone');
      return [
        f,
        widget(f, 'avatar', 'Logo', 163, 140, 64, 64),
        text(f, 'Welcome back', 24, 240, 28, 700),
        widget(f, 'input', 'Email', 24, 310, 342, 48),
        widget(f, 'input', 'Password', 24, 374, 342, 48),
        widget(f, 'button', 'Sign in', 24, 450, 342, 52),
        text(f, 'Forgot your password?', 24, 524, 15, 500, '#4f46e5'),
      ];
    },
  },
  {
    id: 'browser',
    name: 'Browser window',
    note: 'An empty page with an address bar',
    make: () => {
      const f = frame('Browser window', 1280, 800, 'small');
      return [f, widget(f, 'search', 'https://', 0, 0, 1280, 44)];
    },
  },
];
