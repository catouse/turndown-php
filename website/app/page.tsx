'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { TurndownLogo } from './TurndownLogo';
import {
  playgroundExamples,
  siteContent,
  type Language,
  type Theme,
} from './site-content';

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

const selectSettings: Array<{
  key: SelectOptionKey;
  values: Array<{
    labelKey?: keyof (typeof siteContent)['en']['playground']['settings']['options'];
    value: string;
  }>;
  disabledWhen?: (options: ConversionOptions) => boolean;
}> = [
  {
    key: 'headingStyle',
    values: [
      { labelKey: 'setext', value: 'setext' },
      { labelKey: 'atx', value: 'atx' },
    ],
  },
  {
    key: 'hr',
    values: [
      { value: '* * *' },
      { value: '- - -' },
      { value: '_ _ _' },
    ],
  },
  {
    key: 'bulletListMarker',
    values: [
      { value: '*' },
      { value: '-' },
      { value: '+' },
    ],
  },
  {
    key: 'codeBlockStyle',
    values: [
      { labelKey: 'indented', value: 'indented' },
      { labelKey: 'fenced', value: 'fenced' },
    ],
  },
  {
    key: 'fence',
    values: [
      { value: '```' },
      { value: '~~~' },
    ],
    disabledWhen: (options) => options.codeBlockStyle !== 'fenced',
  },
  {
    key: 'emDelimiter',
    values: [
      { value: '_' },
      { value: '*' },
    ],
  },
  {
    key: 'strongDelimiter',
    values: [
      { value: '**' },
      { value: '__' },
    ],
  },
  {
    key: 'linkStyle',
    values: [
      { labelKey: 'inlined', value: 'inlined' },
      { labelKey: 'referenced', value: 'referenced' },
    ],
  },
  {
    key: 'linkReferenceStyle',
    values: [
      { labelKey: 'full', value: 'full' },
      { labelKey: 'collapsed', value: 'collapsed' },
      { labelKey: 'shortcut', value: 'shortcut' },
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

function getInitialLanguage(): Language {
  if (typeof document === 'undefined') return 'en';
  return document.documentElement.lang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

function getInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export default function Home() {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [html, setHtml] = useState<string>(
    () => playgroundExamples[0].html[getInitialLanguage()],
  );
  const [activeExample, setActiveExample] = useState<string>(playgroundExamples[0].id);
  const [options, setOptions] = useState<ConversionOptions>(defaultOptions);
  const [gfmEnabled, setGfmEnabled] = useState(true);
  const [copied, setCopied] = useState<CopyTarget>(null);
  const [conversion, setConversion] = useState({
    markdown: '',
    error: '',
    pending: true,
  });
  const [engineStatus, setEngineStatus] = useState<EngineStatus>('loading');
  const [runtimeUnavailable, setRuntimeUnavailable] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const latestRequestRef = useRef(0);
  const t = siteContent[language];
  const engineMessage =
    engineStatus === 'error'
      ? runtimeUnavailable
        ? t.runtime.stopped
        : t.runtime.fatal
      : t.runtime[engineStatus];

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language === 'zh' ? 'zh-CN' : 'en';
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    document.title = t.meta.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t.meta.description);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#080b18' : '#f5f6fb');

    try {
      window.localStorage.setItem('turndown-language', language);
      window.localStorage.setItem('turndown-theme', theme);
    } catch {
      // The controls still work when browser storage is unavailable.
    }
  }, [language, t.meta.description, t.meta.title, theme]);

  useEffect(() => {
    const worker = new Worker(new URL('../workers/turndown.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<RuntimeMessage>) => {
      const message = event.data;

      if (message.type === 'status') {
        setEngineStatus(message.status);
        return;
      }

      if (message.type === 'fatal-error') {
        setEngineStatus('error');
        setRuntimeUnavailable(false);
        setConversion({ markdown: '', error: message.error, pending: false });
        return;
      }

      if (message.requestId !== latestRequestRef.current) return;

      if (message.type === 'conversion-error') {
        setConversion({ markdown: '', error: message.error, pending: false });
      } else {
        setConversion({ markdown: message.markdown, error: '', pending: false });
      }

      setRuntimeUnavailable(false);
      setEngineStatus('ready');
    };

    worker.onerror = () => {
      setEngineStatus('error');
      setRuntimeUnavailable(true);
      setConversion({
        markdown: '',
        error: '',
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
      setRuntimeUnavailable(false);
      setEngineStatus((current) => (current === 'loading' ? current : 'converting'));
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
    const example = playgroundExamples.find((item) => item.id === id);
    if (!example) return;
    setHtml(example.html[language]);
    setActiveExample(id);
  }

  function changeLanguage(nextLanguage: Language) {
    if (nextLanguage === language) return;

    const example = playgroundExamples.find((item) => item.id === activeExample);
    if (example) {
      setHtml(example.html[nextLanguage]);
    }
    setLanguage(nextLanguage);
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
    loadExample(playgroundExamples[0].id);
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label={t.navigation.home}>
          <TurndownLogo className="brand-logo" />
          <span>Turndown PHP</span>
        </a>
        <div className="site-header-actions">
          <nav aria-label={t.navigation.aria}>
            <a href="#playground">{t.navigation.playground}</a>
            <a href="#api">{t.navigation.api}</a>
            <a
              href="https://github.com/catouse/turndown-php"
              target="_blank"
              rel="noreferrer"
            >
              GitHub <span aria-hidden="true">↗</span>
            </a>
          </nav>
          <div className="preference-controls">
            <div
              className="language-switch"
              role="group"
              aria-label={t.controls.language}
            >
              <button
                className={language === 'en' ? 'active' : ''}
                type="button"
                aria-pressed={language === 'en'}
                onClick={() => changeLanguage('en')}
              >
                EN
              </button>
              <button
                className={language === 'zh' ? 'active' : ''}
                type="button"
                aria-pressed={language === 'zh'}
                onClick={() => changeLanguage('zh')}
              >
                中文
              </button>
            </div>
            <button
              className="theme-switch"
              type="button"
              aria-label={theme === 'dark' ? t.controls.useLight : t.controls.useDark}
              title={theme === 'dark' ? t.controls.useLight : t.controls.useDark}
              onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            >
              <span className="theme-swatch" aria-hidden="true" />
              {theme === 'dark' ? t.controls.light : t.controls.dark}
            </button>
          </div>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy">
          <p className="eyebrow"><span /> {t.hero.eyebrow}</p>
          <h1>{t.hero.title} <em>{t.hero.emphasis}</em></h1>
          <p className="hero-intro">{t.hero.intro}</p>
          <div className="hero-actions">
            <a className="primary-action" href="#playground">
              {t.hero.tryConverter} <span>↓</span>
            </a>
            <a
              className="secondary-action"
              href="https://github.com/catouse/turndown-php"
              target="_blank"
              rel="noreferrer"
            >
              {t.hero.readDocs} <span>↗</span>
            </a>
          </div>
          <div className="install-command" aria-label={t.hero.installAria}>
            <span className="prompt" aria-hidden="true">$</span>
            <code>composer require catouse/turndown-php</code>
            <button
              type="button"
              onClick={() => copyText('composer require catouse/turndown-php', 'install')}
              aria-label={t.hero.copyInstall}
            >
              {copied === 'install' ? t.hero.copied : t.hero.copy}
            </button>
          </div>
        </div>

        <div className="hero-aside" aria-label={t.hero.highlightsAria}>
          <p className="hero-aside-label">{t.hero.signal}</p>
          <div>
            <strong>7.2.4</strong>
            <span>
              <a
                className="hero-aside-link"
                href="https://github.com/mixmark-io/turndown"
                target="_blank"
                rel="noreferrer"
              >
                {t.hero.compatibility}
              </a>
            </span>
          </div>
          <div><strong>PHP 8.1+</strong><span>{t.hero.php}</span></div>
          <div><strong>GFM</strong><span>{t.hero.gfm}</span></div>
          <div><strong>MIT</strong><span>{t.hero.license}</span></div>
        </div>
      </section>

      <section className="playground" id="playground" aria-labelledby="playground-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span /> {t.playground.eyebrow}</p>
            <h2 id="playground-title">{t.playground.title}</h2>
          </div>
          <p>{t.playground.intro}</p>
        </div>

        <div className="example-bar" aria-label={t.playground.examplesAria}>
          <div className="example-tabs" role="group" aria-label={t.playground.loadExampleAria}>
            <span>{t.playground.examples}</span>
            {playgroundExamples.map((example) => (
              <button
                className={activeExample === example.id ? 'active' : ''}
                key={example.id}
                type="button"
                onClick={() => loadExample(example.id)}
                aria-pressed={activeExample === example.id}
              >
                {example.label[language]}
              </button>
            ))}
          </div>
          <div className="example-actions">
            <button type="button" onClick={() => { setHtml(''); setActiveExample(''); }}>
              {t.playground.clear}
            </button>
            <button type="button" onClick={resetPlayground}>{t.playground.reset}</button>
          </div>
        </div>

        <div className="converter-shell">
          <div className="editor-panel editor-input">
            <div className="panel-toolbar">
              <div className="panel-title">
                <span className="status-dot violet" />
                <label htmlFor="html-input">{t.playground.html}</label>
              </div>
              <span>
                {html.length.toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}{' '}
                {t.playground.chars}
              </span>
            </div>
            <textarea
              id="html-input"
              value={html}
              onChange={(event) => { setHtml(event.target.value); setActiveExample(''); }}
              spellCheck={false}
              aria-describedby="html-hint"
              placeholder={t.playground.placeholder}
            />
            <p className="sr-only" id="html-hint">{t.playground.htmlHint}</p>
          </div>

          <div className="conversion-arrow" aria-hidden="true">→</div>

          <div className="editor-panel editor-output">
            <div className="panel-toolbar">
              <div className="panel-title">
                <span className={`status-dot ${engineStatus === 'error' ? 'error' : 'lime'}`} />
                <label htmlFor="markdown-output">{t.playground.markdown}</label>
              </div>
              <div className="panel-actions">
                <span className={`engine-badge ${engineStatus}`}>{engineMessage}</span>
                <button
                  type="button"
                  onClick={() => copyText(conversion.markdown, 'markdown')}
                  disabled={conversion.pending || !conversion.markdown}
                >
                  {copied === 'markdown'
                    ? t.playground.copiedOutput
                    : t.playground.copyOutput}
                </button>
              </div>
            </div>
            <textarea
              id="markdown-output"
              value={
                (runtimeUnavailable ? t.runtime.unavailable : conversion.error) ||
                conversion.markdown ||
                (conversion.pending ? t.playground.runtimePending : '')
              }
              readOnly
              spellCheck={false}
              aria-busy={conversion.pending}
              aria-invalid={runtimeUnavailable || Boolean(conversion.error)}
            />
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-intro">
            <div>
              <p className="settings-kicker">{t.playground.settings.kicker}</p>
              <h3>{t.playground.settings.title}</h3>
            </div>
            <p>{t.playground.settings.intro}</p>
          </div>

          <div className="settings-grid">
            {selectSettings.map((setting) => {
              const disabled = setting.disabledWhen?.(options) ?? false;
              return (
                <label className={disabled ? 'setting disabled' : 'setting'} key={setting.key}>
                  <span>
                    {t.playground.settings.fields[setting.key]}
                    <small>{setting.key}</small>
                  </span>
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
                      <option key={value.value} value={value.value}>
                        {value.labelKey
                          ? t.playground.settings.options[value.labelKey]
                          : value.value}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}

            <label className="setting switch-setting">
              <span>{t.playground.settings.gfm}<small>use(new Gfm())</small></span>
              <input
                type="checkbox"
                checked={gfmEnabled}
                onChange={(event) => setGfmEnabled(event.target.checked)}
              />
              <i aria-hidden="true" />
            </label>

            <label className="setting switch-setting">
              <span>{t.playground.settings.preformattedCode}<small>preformattedCode</small></span>
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
              {t.playground.engineNoteBefore}{' '}
              <a href="https://github.com/seanmorris/php-wasm" target="_blank" rel="noreferrer">
                seanmorris/php-wasm
              </a>{language === 'en' ? '.' : ''} {t.playground.engineNoteAfter}
            </span>
          </p>
        </div>
      </section>

      <section className="proof-section" aria-labelledby="why-title">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow"><span /> {t.proof.eyebrow}</p>
            <h2 id="why-title">{t.proof.title}</h2>
          </div>
          <p>{t.proof.intro}</p>
        </div>

        <div className="feature-grid">
          {t.proof.features.map((feature, index) => (
            <article key={feature.title}>
              <span className="feature-number">{String(index + 1).padStart(2, '0')}</span>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
              <strong>{feature.tag}</strong>
            </article>
          ))}
        </div>

        <div className="pipeline" aria-label={t.proof.pipelineAria}>
          {t.proof.pipeline.map((step, index) => (
            <Fragment key={step.title}>
              {index > 0 && <b aria-hidden="true">→</b>}
              <div>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{step.title}</strong>
                <small>{step.detail}</small>
              </div>
            </Fragment>
          ))}
        </div>
      </section>

      <section className="api-section" id="api" aria-labelledby="api-title">
        <div className="api-copy">
          <p className="eyebrow"><span /> {t.api.eyebrow}</p>
          <h2 id="api-title">{t.api.title}</h2>
          <p>{t.api.intro}</p>
          <ul>
            {t.api.steps.map((step, index) => (
              <li key={step}><span>{index + 1}</span> {step}</li>
            ))}
          </ul>
          <a
            href="https://github.com/catouse/turndown-php#usage"
            target="_blank"
            rel="noreferrer"
          >
            {t.api.explore} <span>↗</span>
          </a>
        </div>

        <div className="code-card">
          <div className="code-toolbar">
            <div><span /> <span /> <span /></div>
            <p>example.php</p>
            <button type="button" onClick={() => copyText(phpExample, 'php')}>
              {copied === 'php' ? t.api.copiedCode : t.api.copyCode}
            </button>
          </div>
          <pre><code>{phpExample}</code></pre>
        </div>
      </section>

      <aside className="security-note">
        <div className="security-mark" aria-hidden="true">!</div>
        <div>
          <p className="settings-kicker">{t.security.kicker}</p>
          <h2>{t.security.title}</h2>
        </div>
        <p>{t.security.body}</p>
        <a
          href="https://github.com/catouse/turndown-php#parsing-and-security"
          target="_blank"
          rel="noreferrer"
        >
          {t.security.link} <span>↗</span>
        </a>
      </aside>

      <footer>
        <div className="footer-brand">
          <TurndownLogo className="brand-logo" />
          <div><strong>Turndown PHP</strong><p>{t.footer.tagline}</p></div>
        </div>
        <div className="footer-links">
          <a href="https://github.com/catouse/turndown-php" target="_blank" rel="noreferrer">GitHub</a>
          <a href="https://packagist.org/packages/catouse/turndown-php" target="_blank" rel="noreferrer">Packagist</a>
          <a href="https://github.com/catouse/turndown-php/blob/main/README.zh-CN.md" target="_blank" rel="noreferrer">{t.footer.chineseDocs}</a>
          <a href="https://github.com/catouse/turndown-php/blob/main/LICENSE" target="_blank" rel="noreferrer">{t.footer.license}</a>
        </div>
        <p className="footer-note">{t.footer.note}</p>
      </footer>

      <span className="copy-status sr-only" role="status" aria-live="polite">
        {copied ? t.clipboardStatus : ''}
      </span>
    </main>
  );
}
