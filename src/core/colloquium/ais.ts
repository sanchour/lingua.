// The AIs Sermo opens (5.2-6), with their marks and links. The prompt is always copied first; where a site takes a
// prompt in its link (checked 2026-10-27), it opens filled in too. The link carries only the prompt: the scene, the
// level and some words, nothing personal and never a key.

export interface Ai {
  id: 'chatgpt' | 'claude' | 'gemini' | 'copilot' | 'grok';
  name: string;
  /** The App Store icon (looked up in Apple's directory on 2026-10-27), as a path for marks.ts's appIconUrl. */
  icon: string;
  /** Where its voice button is, for a voice conversation. */
  voice: string;
  /** The link for a prompt; without `fills`, the site's start page. */
  link: (prompt: string) => string;
  /** Whether the link fills the prompt in. */
  fills: boolean;
}

export const AIS: Ai[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    icon: 'Purple211/v4/42/3b/1d/423b1d61-1b55-0bca-d3b9-1ce597c7b4b0/AppIcon-0-0-1x_U007epad-0-0-0-1-0-85-220.png',
    voice: 'the voice button by the message box',
    link: (p) => `https://chatgpt.com/?q=${encodeURIComponent(p)}`,
    fills: true,
  },
  {
    id: 'claude',
    name: 'Claude',
    icon: 'Purple221/v4/eb/00/7c/eb007c0a-a26e-eb3e-9f89-cb1c37049237/AppIcon-0-0-1x_U007epad-0-1-85-220.png',
    voice: 'the voice button in the message box',
    link: (p) => `https://claude.ai/new?q=${encodeURIComponent(p)}`,
    fills: true,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    icon: 'Purple221/v4/30/06/62/300662ce-cd91-f109-8ca9-ca1517193f61/AppIcon-0-0-1x_U007epad-0-0-0-1-0-0-0-0-85-220.png',
    voice: 'Gemini Live, the wave button',
    link: () => 'https://gemini.google.com/app',
    fills: false,
  },
  {
    id: 'copilot',
    name: 'Copilot',
    icon: 'Purple211/v4/37/d4/7c/37d47cd5-4589-dd66-d248-780f0be78127/AppIcon-0-0-1x_U007epad-0-1-0-0-sRGB-0-85-220.png',
    voice: 'the microphone, for Copilot Voice',
    link: (p) => `https://copilot.microsoft.com/?q=${encodeURIComponent(p)}`,
    fills: true,
  },
  {
    id: 'grok',
    name: 'Grok',
    icon: 'Purple221/v4/95/ab/e5/95abe584-d6a4-96b0-94f4-cbfd1e77240e/AppIcon-0-0-1x_U007epad-0-0-0-1-0-0-0-85-220.png',
    voice: 'the voice button by the message box',
    link: (p) => `https://grok.com/?q=${encodeURIComponent(p)}`,
    fills: true,
  },
];
