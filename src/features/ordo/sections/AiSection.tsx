import { useState } from 'react';
import { ExternalLink, Eye, EyeOff, Sparkles } from 'lucide-react';
import { patchSetting } from '@/data/settings';
import type { Settings } from '@/data/settings';
import { Badge, Button, Segmented, Select, ToggleRow } from '@/design/primitives';
import { listModels, LlmError, PROVIDERS } from '@/services/llm/client';
import type { Provider } from '@/services/llm/client';
import { SettingsSection } from '../SettingsSection';
import { useDraft } from '../useDraft';

interface AiSectionProps {
  llm: Settings['llm'];
  apiKeys: Settings['apiKeys'];
  translation: Settings['translation'];
}

export function AiSection({ llm, apiKeys, translation }: AiSectionProps) {
  const provider = llm.provider;
  const [key, setKey] = useDraft(apiKeys[provider], (value) => void patchSetting('apiKeys', { [provider]: value.trim() }), 400);
  const [reveal, setReveal] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const connect = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const found = await listModels(provider, key.trim());
      setModels(found);
      if (!found.includes(llm.model) && found[0]) await patchSetting('llm', { model: found[0] });
      setStatus({ ok: true, text: `Connected · ${found.length} models` });
    } catch (error) {
      setStatus({ ok: false, text: error instanceof LlmError ? error.message : 'Could not connect.' });
    } finally {
      setBusy(false);
    }
  };

  const modelOptions = (models.length ? models : llm.model ? [llm.model] : []).map((m) => ({ value: m, label: m }));
  const chain = translation.chain;
  const toggleProvider = (name: 'mymemory' | 'lingva', on: boolean) =>
    void patchSetting('translation', { chain: on ? [...new Set([...chain, name])] : chain.filter((c) => c !== name) });

  return (
    <SettingsSection
      id="ai"
      icon={Sparkles}
      title="AI & translation"
      description="Deep explanations use your own free AI key. Instant translations work offline without it."
    >
      <Segmented<Provider>
        label="AI provider"
        value={provider}
        onChange={(p) => {
          setModels([]);
          setStatus(null);
          void patchSetting('llm', { provider: p, model: '' });
        }}
        options={[
          { value: 'groq', label: 'Groq' },
          { value: 'gemini', label: 'Gemini' },
        ]}
      />

      <div className="mt-4">
        <label htmlFor="ai-key" className="mb-1.5 block text-[13px] font-bold tracking-wide text-ink-soft uppercase">
          {PROVIDERS[provider].name} API key
        </label>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              id="ai-key"
              type={reveal ? 'text' : 'password'}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="Paste your key"
              className="h-11 w-full rounded-xl border border-line bg-raised pr-11 pl-3.5 font-mono text-[14px] transition-colors hover:border-line-strong"
            />
            <button
              type="button"
              onClick={() => setReveal((r) => !r)}
              aria-label={reveal ? 'Hide key' : 'Show key'}
              className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-ink-faint hover:text-ink"
            >
              {reveal ? <EyeOff size={17} aria-hidden /> : <Eye size={17} aria-hidden />}
            </button>
          </div>
          <Button variant="secondary" onClick={() => void connect()} loading={busy} disabled={!key.trim()}>
            Connect
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]">
          <a href={PROVIDERS[provider].keyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-accent-text hover:underline">
            Get a free key <ExternalLink size={13} aria-hidden />
          </a>
          {status && <Badge tone={status.ok ? 'sage' : 'accent'}>{status.text}</Badge>}
        </div>
      </div>

      {modelOptions.length > 0 && (
        <div className="mt-4 max-w-md">
          <Select label="Model" value={llm.model} onChange={(model) => void patchSetting('llm', { model })} options={modelOptions} />
        </div>
      )}

      <p className="mt-4 text-[13px] leading-snug text-ink-soft">
        The key is stored only on this device. Words and sentences you ask about are sent to {PROVIDERS[provider].name}.
      </p>

      <div className="mt-3 divide-y divide-line border-t border-line">
        <ToggleRow
          title="Online fallback: MyMemory"
          description="For rare words missing from the offline dictionary."
          checked={chain.includes('mymemory')}
          onChange={(on) => toggleProvider('mymemory', on)}
        />
        <ToggleRow title="Online fallback: Lingva" description="A second free translator, used if MyMemory has no answer." checked={chain.includes('lingva')} onChange={(on) => toggleProvider('lingva', on)} />
      </div>
    </SettingsSection>
  );
}
