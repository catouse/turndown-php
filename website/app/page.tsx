'use client';

import { useEffect, useRef, useState } from 'react';
import { TurndownLogo } from './TurndownLogo';

type ConversionOptions = {
  headingStyle: 'setext' | 'atx';
  hr: '* * *' | '- - -' | '_ _ _';
  bulletListMarker: '*' | '-' | '+';
  codeBlockStyle: 'indented' | 'fenced';
  fence: '```' | '~~~';
  emDelimiter: '_' | '*';
  strongDelimiter: '**' | '__';
  linkStyle: 'inlined' | 'referenced';
  linkReferenceStyle: 'full' | 'collapsed' | 'shortcut';
  preformattedCode: boolean;
};

type SelectOptionKey = Exclude<keyof ConversionOptions, 'preformattedCode'>;
type CopyTarget = 'install' | 'markdown' | 'php' | null;
type EngineStatus = 'loading' | 'ready' | 'converting' | 'error';

type RuntimeMessage =
  | {
      type: 'status';
      status: 'loading' | 'ready';
      message: string;
      phpVersion?: string;
    }
  | { type: 'result'; requestId: number; markdown: string }
  | { type: 'conversion-error'; requestId: number; error: string }
  | { type: 'fatal-error'; error: string };

const defaultOptions: ConversionOptions = {
  headingStyle: 'setext',
  hr: '* * *',
  bulletListMarker: '*',
  codeBlockStyle: 'indented',
  fence: '```',
  emDelimiter: '_',
  strongDelimiter: '**',
  linkStyle: 'inlined',
  linkReferenceStyle: 'full',
  preformattedCode: false,
};

const examples = [
  {
    id: 'product',
    label: 'Product brief',
    html: `<article>
  <h1>Ship cleaner content</h1>
  <p>Turn <strong>HTML</strong> into portable, readable Markdown.</p>
  <h2>Release checklist</h2>
  <ul>
    <li><input type="checkbox" checked> Confirm the content model</li>
    <li><input type="checkbox"> Publish the migration guide</li>
  </ul>
  <blockquote>Good tools make the simple path obvious.</blockquote>
  <p>Read the <a href="https://github.com/catouse/turndown-php">source on GitHub</a>.</p>
</article>`,
  },
  {
    id: 'docs',
    label: 'PHP docs',
    html: `<section>
  <h1>Quick start</h1>
  <p>Install the package with Composer, then create a service.</p>
  <pre><code class="language-php">use Catouse\\Turndown\\TurndownService;

$service = new TurndownService([
    'headingStyle' => 'atx',
]);

echo $service->turndown($html);</code></pre>
  <p><em>Tip:</em> enable the GFM plugin when your content contains tables.</p>
</section>`,
  },
  {
    id: 'gfm',
    label: 'GFM table',
    html: `<article>
  <h1>Compatibility snapshot</h1>
  <table>
    <thead><tr><th>Feature</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td>Tables</td><td><strong>Ready</strong></td></tr>
      <tr><td>Task lists</td><td><strong>Ready</strong></td></tr>
      <tr><td>Strikethrough</td><td><del>Planned</del> Ready</td></tr>
    </tbody>
  </table>
</article>`,
  },
];

const selectSettings: Array<{
  key: SelectOptionKey;
  label: string;
  values: Array<{ label: string; value: string }>;
  disabledWhen?: (options: ConversionOptions) => boolean;
}> = [
  {
    key: 'headingStyle',
    label: 'Heading style',
    values: [
      { label: 'Setext', value: 'setext' },
      { label: 'ATX', value: 'atx' },
    ],
  },
  {
    key: 'hr',
    label: 'Horizontal rule',
    values: [
      { label: '* * *', value: '* * *' },
      { label: '- - -', value: '- - -' },
      { label: '_ _ _', value: '_ _ _' },
    ],
  },
  {
    key: 'bulletListMarker',
    label: 'Bullet marker',
    values: [
      { label: '*', value: '*' },
      { label: '-', value: '-' },
      { label: '+', value: '+' },
    ],
  },
  {
    key: 'codeBlockStyle',
    label: 'Code blocks',
    values: [
      { label: 'Indented', value: 'indented' },
      { label: 'Fenced', value: 'fenced' },
    ],
  },
  {
    key: 'fence',
    label: 'Fence marker',
    values: [
      { label: '```', value: '```' },
      { label: '~~~', value: '~~~' },
    ],
    disabledWhen: (options) => options.codeBlockStyle !== 'fenced',
  },
  {
    key: 'emDelimiter',
    label: 'Emphasis',
    values: [
      { label: '_', value: '_' },
      { label: '*', value: '*' },
    ],
  },
  {
    key: 'strongDelimiter',
    label: 'Strong',
    values: [
      { label: '**', value: '**' },
      { label: '__', value: '__' },
    ],
  },
  {
    key: 'linkStyle',
    label: 'Links',
    values: [
      { label: 'Inline', value: 'inlined' },
      { label: 'Referenced', value: 'referenced' },
    ],
  },
  {
    key: 'linkReferenceStyle',
    label: 'Link references',
    values: [
      { label: 'Full', value: 'full' },
      { label: 'Collapsed', value: 'collapsed' },
      { label: 'Shortcut', value: 'shortcut' },
    ],
    disabledWhen: (options) => options.linkStyle !== 'referenced',
  },
];

const phpExample = `<?php

use Catouse\\Turndown\\Plugin\\Gfm;
use Catouse\\Turndown\\TurndownService;

$service = new TurndownService([
    'headingStyle' => 'atx',
    'codeBlockStyle' => 'fenced',
]);

$service->use(new Gfm());

$markdown = $service->turndown($html);`;

export default function Home() {
  const [html, setHtml] = useState(examples[0].html);
  const [activeExample, setActiveExample] = useState(examples[0].id);
  const [options, setOptions] = useState<ConversionOptions>(defaultOptions);
  const [gfmEnabled, setGfmEnabled] = useState(true);
  const [copied, setCopied] = useState<CopyTarget>(null);
  const [conversion, setConversion] = useState({
    markdown: '',
    error: '',
    pending: true,
  });
  const [engine, setEngine] = useState<{ status: EngineStatus; message: string }>({
    status: 'loading',
    message: 'Starting PHP 8.4 in your browser…',
  });
  const workerRef = useRef<Worker | null>(null);
  const latestRequestRef = useRef(0);

  useEffect(() => {
    const worker = new Worker(new URL('../workers/turndown.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<RuntimeMessage>) => {
      const message = event.data;

      if (message.type === 'status') {
        setEngine({ status: message.status, message: message.message });
        return;
      }

      if (message.type === 'fatal-error') {
        setEngine({ status: 'error', message: 'PHP/WASM could not start.' });
        setConversion({ markdown: '', error: message.error, pending: false });
        return;
      }

      if (message.requestId !== latestRequestRef.current) return;

      if (message.type === 'conversion-error') {
        setConversion({ markdown: '', error: message.error, pending: false });
      } else {
        setConversion({ markdown: message.markdown, error: '', pending: false });
      }

      setEngine({ status: 'ready', message: 'PHP 8.4 WASM · turndown-php' });
    };

    worker.onerror = () => {
      setEngine({ status: 'error', message: 'PHP/WASM worker stopped.' });
      setConversion({
        markdown: '',
        error: 'The browser could not run the PHP conversion worker.',
        pending: false,
      });
    };

    worker.postMessage({ type: 'initialize' });

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    const timer = window.setTimeout(() => {
      setConversion((current) => ({
        markdown: html ? current.markdown : '',
        error: '',
        pending: true,
      }));
      setEngine((current) =>
        current.status === 'loading'
          ? current
          : { status: 'converting', message: 'Converting with turndown-php…' },
      );
      workerRef.current?.postMessage({
        type: 'convert',
        requestId,
        html,
        options,
        gfmEnabled,
      });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [gfmEnabled, html, options]);

  function updateOption<Key extends keyof ConversionOptions>(
    key: Key,
    value: ConversionOptions[Key],
  ) {
    setOptions((current) => ({ ...current, [key]: value }));
  }

  function loadExample(id: string) {
    const example = examples.find((item) => item.id === id);
    if (!example) return;
    setHtml(example.html);
    setActiveExample(id);
  }

  async function copyText(text: string, target: Exclude<CopyTarget, null>) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(target);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  }

  function resetPlayground() {
    setOptions(defaultOptions);
    setGfmEnabled(true);
    loadExample(examples[0].id);
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Turndown PHP home">
          <TurndownLogo className="brand-logo" />
          <span>Turndown PHP</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#playground">Playground</a>
          <a href="#api">API</a>
          <a
            href="https://github.com/catouse/turndown-php"
            target="_blank"
            rel="noreferrer"
          >
            GitHub <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy">
          <p className="eyebrow"><span /> HTML in. Markdown out.</p>
          <h1>A precise Turndown port, built for <em>PHP.</em></h1>
          <p className="hero-intro">
            Convert unruly HTML into clean Markdown with a familiar API,
            configurable rules, and official GFM plugins.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#playground">Try the converter <span>↓</span></a>
            <a
              className="secondary-action"
              href="https://github.com/catouse/turndown-php"
              target="_blank"
              rel="noreferrer"
            >
              Read the docs <span>↗</span>
            </a>
          </div>
          <div className="install-command" aria-label="Composer installation command">
            <span className="prompt" aria-hidden="true">$</span>
            <code>composer require catouse/turndown-php</code>
            <button
              type="button"
              onClick={() => copyText('composer require catouse/turndown-php', 'install')}
              aria-label="Copy Composer installation command"
            >
              {copied === 'install' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="hero-aside" aria-label="Project highlights">
          <p className="hero-aside-label">Project signal</p>
          <div><strong>7.2.4</strong><span>Turndown compatibility target</span></div>
          <div><strong>PHP 8.1+</strong><span>Modern PHP, no framework required</span></div>
          <div><strong>GFM</strong><span>Tables, tasks, strike &amp; fenced code</span></div>
          <div><strong>MIT</strong><span>Open source and production-friendly</span></div>
        </div>
      </section>

      <section className="playground" id="playground" aria-labelledby="playground-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span /> Live playground</p>
            <h2 id="playground-title">Make some Markdown</h2>
          </div>
          <p>
            Paste HTML on the left. Once PHP loads, tune the rules below and
            the Markdown updates on the right.
          </p>
        </div>

        <div className="example-bar" aria-label="Playground examples">
          <div className="example-tabs" role="group" aria-label="Load an example">
            <span>Examples</span>
            {examples.map((example) => (
              <button
                className={activeExample === example.id ? 'active' : ''}
                key={example.id}
                type="button"
                onClick={() => loadExample(example.id)}
                aria-pressed={activeExample === example.id}
              >
                {example.label}
              </button>
            ))}
          </div>
          <div className="example-actions">
            <button type="button" onClick={() => { setHtml(''); setActiveExample(''); }}>Clear</button>
            <button type="button" onClick={resetPlayground}>Reset</button>
          </div>
        </div>

        <div className="converter-shell">
          <div className="editor-panel editor-input">
            <div className="panel-toolbar">
              <div className="panel-title">
                <span className="status-dot violet" />
                <label htmlFor="html-input">HTML</label>
              </div>
              <span>{html.length.toLocaleString()} chars</span>
            </div>
            <textarea
              id="html-input"
              value={html}
              onChange={(event) => { setHtml(event.target.value); setActiveExample(''); }}
              spellCheck={false}
              aria-describedby="html-hint"
              placeholder="Paste HTML here…"
            />
            <p className="sr-only" id="html-hint">Enter HTML to convert it to Markdown.</p>
          </div>

          <div className="conversion-arrow" aria-hidden="true">→</div>

          <div className="editor-panel editor-output">
            <div className="panel-toolbar">
              <div className="panel-title">
                <span className={`status-dot ${engine.status === 'error' ? 'error' : 'lime'}`} />
                <label htmlFor="markdown-output">Markdown</label>
              </div>
              <div className="panel-actions">
                <span className={`engine-badge ${engine.status}`}>{engine.message}</span>
                <button
                  type="button"
                  onClick={() => copyText(conversion.markdown, 'markdown')}
                  disabled={conversion.pending || !conversion.markdown}
                >
                  {copied === 'markdown' ? 'Copied!' : 'Copy output'}
                </button>
              </div>
            </div>
            <textarea
              id="markdown-output"
              value={
                conversion.error ||
                conversion.markdown ||
                (conversion.pending ? 'Starting the PHP 8.4 runtime…' : '')
              }
              readOnly
              spellCheck={false}
              aria-busy={conversion.pending}
              aria-invalid={Boolean(conversion.error)}
            />
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-intro">
            <div>
              <p className="settings-kicker">Conversion settings</p>
              <h3>Shape the output</h3>
            </div>
            <p>Defaults mirror Turndown 7.2.4. Disabled controls do not apply to the current mode.</p>
          </div>

          <div className="settings-grid">
            {selectSettings.map((setting) => {
              const disabled = setting.disabledWhen?.(options) ?? false;
              return (
                <label className={disabled ? 'setting disabled' : 'setting'} key={setting.key}>
                  <span>{setting.label}<small>{setting.key}</small></span>
                  <select
                    value={String(options[setting.key])}
                    disabled={disabled}
                    onChange={(event) =>
                      updateOption(
                        setting.key,
                        event.target.value as ConversionOptions[typeof setting.key],
                      )
                    }
                  >
                    {setting.values.map((value) => (
                      <option key={value.value} value={value.value}>{value.label}</option>
                    ))}
                  </select>
                </label>
              );
            })}

            <label className="setting switch-setting">
              <span>GFM plugins<small>use(new Gfm())</small></span>
              <input
                type="checkbox"
                checked={gfmEnabled}
                onChange={(event) => setGfmEnabled(event.target.checked)}
              />
              <i aria-hidden="true" />
            </label>

            <label className="setting switch-setting">
              <span>Preformatted code<small>preformattedCode</small></span>
              <input
                type="checkbox"
                checked={options.preformattedCode}
                onChange={(event) => updateOption('preformattedCode', event.target.checked)}
              />
              <i aria-hidden="true" />
            </label>
          </div>

          <p className="engine-note">
            <span aria-hidden="true">i</span>
            <span className="engine-note-copy">
              This preview runs the actual PHP package inside PHP 8.4, compiled for the browser by{' '}
              <a href="https://github.com/seanmorris/php-wasm" target="_blank" rel="noreferrer">
                seanmorris/php-wasm
              </a>. Your HTML is converted locally and never sent to a server.
            </span>
          </p>
        </div>
      </section>

      <section className="proof-section" aria-labelledby="why-title">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow"><span /> Why Turndown PHP</p>
            <h2 id="why-title">Familiar rules. Native runtime.</h2>
          </div>
          <p>Designed for migrations, publishing pipelines, imports, and anywhere HTML needs a cleaner exit.</p>
        </div>

        <div className="feature-grid">
          <article>
            <span className="feature-number">01</span>
            <h3>Compatibility, pinned</h3>
            <p>Targets Turndown 7.2.4 behavior and exercises both string and DOM input against pinned upstream fixtures.</p>
            <strong>Predictable upgrades</strong>
          </article>
          <article>
            <span className="feature-number">02</span>
            <h3>GFM, included</h3>
            <p>Bring tables, highlighted fenced code, task-list items, and strikethrough into one fluent plugin call.</p>
            <strong>Official plugin ports</strong>
          </article>
          <article>
            <span className="feature-number">03</span>
            <h3>Rules, composable</h3>
            <p>Add rules, keep selected HTML, remove unwanted nodes, or supply callbacks without leaving PHP.</p>
            <strong>Built to extend</strong>
          </article>
        </div>

        <div className="pipeline" aria-label="Conversion pipeline">
          <div><span>01</span><strong>HTML</strong><small>String or DOM node</small></div>
          <b aria-hidden="true">→</b>
          <div><span>02</span><strong>Parse</strong><small>HTML5 document tree</small></div>
          <b aria-hidden="true">→</b>
          <div><span>03</span><strong>Rules</strong><small>CommonMark + plugins</small></div>
          <b aria-hidden="true">→</b>
          <div><span>04</span><strong>Markdown</strong><small>Portable plain text</small></div>
        </div>
      </section>

      <section className="api-section" id="api" aria-labelledby="api-title">
        <div className="api-copy">
          <p className="eyebrow"><span /> Three steps</p>
          <h2 id="api-title">From install to output in under a minute.</h2>
          <p>
            No framework and no service dependency. Install with Composer,
            configure the converter, then pass it HTML.
          </p>
          <ul>
            <li><span>1</span> Requires PHP 8.1, DOM, and Mbstring</li>
            <li><span>2</span> Accepts HTML strings or supported DOM nodes</li>
            <li><span>3</span> Returns Markdown as a plain string</li>
          </ul>
          <a
            href="https://github.com/catouse/turndown-php#usage"
            target="_blank"
            rel="noreferrer"
          >
            Explore the full API <span>↗</span>
          </a>
        </div>

        <div className="code-card">
          <div className="code-toolbar">
            <div><span /> <span /> <span /></div>
            <p>example.php</p>
            <button type="button" onClick={() => copyText(phpExample, 'php')}>
              {copied === 'php' ? 'Copied!' : 'Copy code'}
            </button>
          </div>
          <pre><code>{phpExample}</code></pre>
        </div>
      </section>

      <aside className="security-note">
        <div className="security-mark" aria-hidden="true">!</div>
        <div>
          <p className="settings-kicker">A clear boundary</p>
          <h2>Conversion is not sanitization.</h2>
        </div>
        <p>
          Treat generated Markdown as untrusted when rendering it back to HTML.
          Sanitize untrusted input according to your application&apos;s threat model.
        </p>
        <a
          href="https://github.com/catouse/turndown-php#parsing-and-security"
          target="_blank"
          rel="noreferrer"
        >
          Security notes <span>↗</span>
        </a>
      </aside>

      <footer>
        <div className="footer-brand">
          <TurndownLogo className="brand-logo" />
          <div><strong>Turndown PHP</strong><p>HTML to Markdown, without leaving PHP.</p></div>
        </div>
        <div className="footer-links">
          <a href="https://github.com/catouse/turndown-php" target="_blank" rel="noreferrer">GitHub</a>
          <a href="https://packagist.org/packages/catouse/turndown-php" target="_blank" rel="noreferrer">Packagist</a>
          <a href="https://github.com/catouse/turndown-php/blob/main/README.zh-CN.md" target="_blank" rel="noreferrer">中文文档</a>
          <a href="https://github.com/catouse/turndown-php/blob/main/LICENSE" target="_blank" rel="noreferrer">MIT License</a>
        </div>
        <p className="footer-note">Independent PHP port. Turndown is © Dom Christie.</p>
      </footer>

      <span className="copy-status sr-only" role="status" aria-live="polite">
        {copied ? 'Copied to clipboard.' : ''}
      </span>
    </main>
  );
}
