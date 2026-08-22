'use client';

import { ArrowRightDownIcon } from '@solar-icons/react/linear/arrow-right-down';
import { ArrowRightUpIcon } from '@solar-icons/react/linear/arrow-right-up';
import { BookMinimalisticIcon } from '@solar-icons/react/linear/book-minimalistic';
import { CheckCircleIcon } from '@solar-icons/react/linear/check-circle';
import { Code2Icon } from '@solar-icons/react/linear/code-2';
import { CopyIcon } from '@solar-icons/react/linear/copy';
import { CpuBoltIcon } from '@solar-icons/react/linear/cpu-bolt';
import { EyeIcon } from '@solar-icons/react/linear/eye';
import { MoonIcon } from '@solar-icons/react/linear/moon';
import { RestartIcon } from '@solar-icons/react/linear/restart';
import { ShieldWarningIcon } from '@solar-icons/react/linear/shield-warning';
import { SunIcon } from '@solar-icons/react/linear/sun';
import { TrashBinMinimalisticIcon } from '@solar-icons/react/linear/trash-bin-minimalistic';
import { useEffect, useRef, useState, type UIEvent } from 'react';
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
type RuntimeTarget = 'playground' | 'hero';
type InputView = 'html' | 'preview';

type RuntimeMessage =
  | {
      type: 'status';
      status: 'loading' | 'ready';
      message: string;
      phpVersion?: string;
    }
  | { type: 'result'; target: RuntimeTarget; requestId: number; markdown: string }
  | { type: 'conversion-error'; target: RuntimeTarget; requestId: number; error: string }
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

const heroPreviews: Record<Language, { html: string }> = {
  en: {
    html: `<article>
  <h1>Ship clean content</h1>
  <p><strong>HTML</strong> becomes portable.</p>
</article>`,
  },
  zh: {
    html: `<article>
  <h1>发布干净内容</h1>
  <p><strong>HTML</strong> 变得易于移植。</p>
</article>`,
  },
};

function createHtmlPreviewDocument(html: string, language: Language): string {
  const documentLanguage = language === 'zh' ? 'zh-CN' : 'en';

  return `<!doctype html>
<html lang="${documentLanguage}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; media-src data: blob:; style-src 'unsafe-inline'; font-src data:">
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 28px; background: #f6f7f3; color: #1b201d; font: 16px/1.6 ui-sans-serif, system-ui, sans-serif; overflow-wrap: anywhere; }
    img, video, svg { max-width: 100%; height: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px 10px; border: 1px solid #c9cec8; text-align: left; }
    pre { overflow: auto; padding: 16px; border-radius: 8px; background: #e9ece6; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    blockquote { margin-inline: 0; padding-inline-start: 16px; border-inline-start: 3px solid #4c852e; color: #555d58; }
    a { color: #356f1f; pointer-events: none; }
    input { accent-color: #4c852e; }
  </style>
</head>
<body>${html}</body>
</html>`;
}

function CopyActionIcon({ copied }: { copied: boolean }) {
  const Icon = copied ? CheckCircleIcon : CopyIcon;

  return (
    <Icon
      className="ui-icon"
      size={15}
      strokeWidth={1.8}
      aria-hidden
    />
  );
}

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
  const [heroHtml, setHeroHtml] = useState<string>(
    () => heroPreviews[getInitialLanguage()].html,
  );
  // Keep the rendered child stable while typing so React preserves the selection.
  const [heroEditorSeed, setHeroEditorSeed] = useState<string>(
    () => heroPreviews[getInitialLanguage()].html,
  );
  const [activeExample, setActiveExample] = useState<string>(playgroundExamples[0].id);
  const [inputView, setInputView] = useState<InputView>('html');
  const [options, setOptions] = useState<ConversionOptions>(defaultOptions);
  const [gfmEnabled, setGfmEnabled] = useState(true);
  const [copied, setCopied] = useState<CopyTarget>(null);
  const [conversion, setConversion] = useState({
    markdown: '',
    error: '',
    pending: true,
  });
  const [heroConversion, setHeroConversion] = useState({
    markdown: '',
    error: '',
    pending: true,
  });
  const [engineStatus, setEngineStatus] = useState<EngineStatus>('loading');
  const [runtimeUnavailable, setRuntimeUnavailable] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const latestRequestRef = useRef<Record<RuntimeTarget, number>>({
    playground: 0,
    hero: 0,
  });
  const syntaxHighlighterReadyRef = useRef(false);
  const htmlHighlightRef = useRef<HTMLPreElement | null>(null);
  const t = siteContent[language];
  const engineMessage =
    engineStatus === 'error'
      ? runtimeUnavailable
        ? t.runtime.stopped
        : t.runtime.fatal
      : t.runtime[engineStatus];
  const heroMarkdown = runtimeUnavailable
    ? t.runtime.stopped
    : heroConversion.error ||
      (heroConversion.pending && !heroConversion.markdown
        ? t.playground.runtimePending
        : heroConversion.markdown);
  const heroRuntimeLabel =
    engineStatus === 'error'
      ? t.hero.previewUnavailable
      : engineStatus === 'loading'
        ? t.hero.previewStarting
        : engineStatus === 'converting'
          ? t.hero.previewConverting
          : t.hero.previewLive;
  const markdownOutput =
    (runtimeUnavailable ? t.runtime.unavailable : conversion.error) ||
    conversion.markdown ||
    (conversion.pending ? t.playground.runtimePending : '');

  useEffect(() => {
    if (!('highlights' in CSS)) return;

    const highlighterUrl = new URL(
      'vendor/microlighter/microlighter.min.js',
      document.baseURI,
    );

    let active = true;

    void import(/* @vite-ignore */ highlighterUrl.href)
      .then(() => {
        if (active) {
          syntaxHighlighterReadyRef.current = true;
          document.dispatchEvent(new Event('syntax-highlight'));
        }
      })
      .catch(() => {
        // Plain code remains readable when syntax highlighting is unavailable.
      });

    return () => {
      active = false;
      syntaxHighlighterReadyRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!syntaxHighlighterReadyRef.current) return;

    const frame = window.requestAnimationFrame(() => {
      document.dispatchEvent(new Event('syntax-highlight'));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [heroConversion.markdown, heroHtml, html, inputView, language, markdownOutput]);

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
        setHeroConversion({ markdown: '', error: message.error, pending: false });
        return;
      }

      if (message.requestId !== latestRequestRef.current[message.target]) return;

      const setTargetConversion =
        message.target === 'hero' ? setHeroConversion : setConversion;

      if (message.type === 'conversion-error') {
        setTargetConversion({ markdown: '', error: message.error, pending: false });
      } else {
        setTargetConversion({ markdown: message.markdown, error: '', pending: false });
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
      setHeroConversion({
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
    const requestId = latestRequestRef.current.playground + 1;
    latestRequestRef.current.playground = requestId;
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
        target: 'playground',
        requestId,
        html,
        options,
        gfmEnabled,
      });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [gfmEnabled, html, options]);

  useEffect(() => {
    const requestId = latestRequestRef.current.hero + 1;
    latestRequestRef.current.hero = requestId;
    const timer = window.setTimeout(() => {
      setHeroConversion((current) => ({
        markdown: heroHtml ? current.markdown : '',
        error: '',
        pending: true,
      }));
      setRuntimeUnavailable(false);
      setEngineStatus((current) => (current === 'loading' ? current : 'converting'));
      workerRef.current?.postMessage({
        type: 'convert',
        target: 'hero',
        requestId,
        html: heroHtml,
        options,
        gfmEnabled,
      });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [gfmEnabled, heroHtml, options]);

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
    const nextHeroHtml = heroPreviews[nextLanguage].html;
    setHeroEditorSeed(nextHeroHtml);
    setHeroHtml(nextHeroHtml);
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

  function syncHtmlEditorScroll(event: UIEvent<HTMLTextAreaElement>) {
    const highlight = htmlHighlightRef.current;
    if (!highlight) return;

    highlight.scrollTop = event.currentTarget.scrollTop;
    highlight.scrollLeft = event.currentTarget.scrollLeft;
  }

  return (
    <main data-syntax-theme="tokyo-night">
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
              GitHub
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
              {theme === 'dark' ? (
                <SunIcon className="ui-icon" size={15} strokeWidth={1.8} aria-hidden />
              ) : (
                <MoonIcon className="ui-icon" size={15} strokeWidth={1.8} aria-hidden />
              )}
              {theme === 'dark' ? t.controls.light : t.controls.dark}
            </button>
          </div>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="hero-eyebrow">{t.hero.eyebrow}</p>
          <h1>{t.hero.title} <em>{t.hero.emphasis}</em></h1>
          <p className="hero-intro">{t.hero.intro}</p>
          <div className="hero-actions">
            <a className="primary-action" href="#playground">
              {t.hero.tryConverter}
              <ArrowRightDownIcon
                className="ui-icon"
                size={17}
                strokeWidth={1.8}
                aria-hidden
              />
            </a>
            <a
              className="secondary-action"
              href="https://github.com/catouse/turndown-php"
              target="_blank"
              rel="noreferrer"
            >
              <BookMinimalisticIcon
                className="ui-icon"
                size={16}
                strokeWidth={1.8}
                aria-hidden
              />
              {t.hero.readDocs}
            </a>
          </div>
        </div>

        <div className="hero-preview" aria-label={t.hero.highlightsAria}>
          <div className="hero-preview-labels" aria-hidden="true">
            <span>{t.hero.previewInput}</span>
            <span>{t.hero.previewOutput}</span>
          </div>
          <div className="hero-preview-code">
            <pre>
              <code
                className="language-html"
                contentEditable="plaintext-only"
                suppressContentEditableWarning
                role="textbox"
                aria-label={t.hero.previewInput}
                aria-multiline="true"
                spellCheck={false}
                onInput={(event) => setHeroHtml(event.currentTarget.textContent ?? '')}
              >
                {heroEditorSeed}
              </code>
            </pre>
            <pre
              aria-label={t.hero.previewOutput}
              aria-live="polite"
              aria-busy={heroConversion.pending}
            >
              <code className="language-markdown">{heroMarkdown}</code>
            </pre>
          </div>
          <div className="hero-preview-footer">
            <p>{t.hero.previewCaption}</p>
            <span
              className={`hero-preview-status ${engineStatus}`}
              aria-live="polite"
            >
              <CpuBoltIcon
                className="ui-icon"
                size={13}
                strokeWidth={1.8}
                aria-hidden
              />
              {heroRuntimeLabel}
            </span>
          </div>
        </div>
      </section>

      <section className="install-rail" aria-label={t.hero.highlightsAria}>
        <div className="install-rail-command">
          <p>{t.hero.installLabel}</p>
          <div className="install-command" aria-label={t.hero.installAria}>
            <span className="prompt" aria-hidden="true">$</span>
            <pre>
              <code>
                {'composer require '}
                <strong>catouse/turndown-php</strong>
              </code>
            </pre>
            <button
              type="button"
              onClick={() => copyText('composer require catouse/turndown-php', 'install')}
              aria-label={t.hero.copyInstall}
            >
              <CopyActionIcon copied={copied === 'install'} />
              {copied === 'install' ? t.hero.copied : t.hero.copy}
            </button>
          </div>
        </div>

        <dl className="project-facts">
          <div>
            <dt>7.2.4</dt>
            <dd>
              <a
                href="https://github.com/mixmark-io/turndown"
                target="_blank"
                rel="noreferrer"
              >
                {t.hero.compatibility}
              </a>
            </dd>
          </div>
          <div><dt>PHP 8.1+</dt><dd>{t.hero.php}</dd></div>
          <div><dt>GFM</dt><dd>{t.hero.gfm}</dd></div>
          <div><dt>MIT</dt><dd>{t.hero.license}</dd></div>
        </dl>
      </section>

      <section className="playground" id="playground" aria-labelledby="playground-title">
        <div className="section-intro">
          <h2 id="playground-title">{t.playground.title}</h2>
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
              <TrashBinMinimalisticIcon
                className="ui-icon"
                size={15}
                strokeWidth={1.8}
                aria-hidden
              />
              {t.playground.clear}
            </button>
            <button type="button" onClick={resetPlayground}>
              <RestartIcon
                className="ui-icon"
                size={15}
                strokeWidth={1.8}
                aria-hidden
              />
              {t.playground.reset}
            </button>
          </div>
        </div>

        <div className="converter-shell">
          <div className="editor-panel editor-input">
            <div className="panel-toolbar">
              <div
                className="panel-view-tabs"
                role="group"
                aria-label={t.playground.inputViewAria}
              >
                <button
                  className={inputView === 'html' ? 'active' : ''}
                  type="button"
                  aria-pressed={inputView === 'html'}
                  onClick={() => setInputView('html')}
                >
                  <Code2Icon
                    className="ui-icon"
                    size={15}
                    strokeWidth={1.8}
                    aria-hidden
                  />
                  {t.playground.html}
                </button>
                <button
                  className={inputView === 'preview' ? 'active' : ''}
                  type="button"
                  aria-pressed={inputView === 'preview'}
                  onClick={() => setInputView('preview')}
                >
                  <EyeIcon
                    className="ui-icon"
                    size={15}
                    strokeWidth={1.8}
                    aria-hidden
                  />
                  {t.playground.preview}
                </button>
              </div>
              <span className="panel-counter">
                {inputView === 'html'
                  ? `${html.length.toLocaleString(
                      language === 'zh' ? 'zh-CN' : 'en-US',
                    )} ${t.playground.chars}`
                  : t.playground.previewGuard}
              </span>
            </div>
            {inputView === 'html' ? (
              <div className="editor-code-input">
                <pre ref={htmlHighlightRef} aria-hidden="true">
                  <code className="language-html">{html}</code>
                </pre>
                <textarea
                  id="html-input"
                  value={html}
                  onChange={(event) => {
                    setHtml(event.target.value);
                    setActiveExample('');
                  }}
                  onScroll={syncHtmlEditorScroll}
                  spellCheck={false}
                  aria-describedby="html-hint"
                  placeholder={t.playground.placeholder}
                />
              </div>
            ) : (
              <div className="html-render-preview">
                <iframe
                  title={t.playground.previewTitle}
                  srcDoc={createHtmlPreviewDocument(html, language)}
                  sandbox=""
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <p className="sr-only" id="html-hint">{t.playground.htmlHint}</p>
          </div>

          <div className="editor-panel editor-output">
            <div className="panel-toolbar">
              <span className="panel-heading" id="markdown-output-label">
                {t.playground.markdown}
              </span>
              <div className="panel-actions">
                <span className={`engine-badge ${engineStatus}`}>
                  <CpuBoltIcon
                    className="ui-icon"
                    size={13}
                    strokeWidth={1.8}
                    aria-hidden
                  />
                  <span>{engineMessage}</span>
                </span>
                <button
                  type="button"
                  onClick={() => copyText(conversion.markdown, 'markdown')}
                  disabled={conversion.pending || !conversion.markdown}
                >
                  <CopyActionIcon copied={copied === 'markdown'} />
                  {copied === 'markdown'
                    ? t.playground.copiedOutput
                    : t.playground.copyOutput}
                </button>
              </div>
            </div>
            <pre
              className={`editor-code-output ${
                runtimeUnavailable || conversion.error ? 'error' : ''
              }`}
              id="markdown-output"
              tabIndex={0}
              aria-labelledby="markdown-output-label"
              aria-busy={conversion.pending}
              aria-invalid={runtimeUnavailable || Boolean(conversion.error)}
            >
              <code className="language-markdown">{markdownOutput}</code>
            </pre>
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
        <div className="section-intro">
          <h2 id="why-title">{t.proof.title}</h2>
          <p>{t.proof.intro}</p>
        </div>

        <div className="proof-layout">
          <article className="proof-lead">
            <p className="proof-version">7.2.4</p>
            <h3>{t.proof.features[0].title}</h3>
            <p>{t.proof.features[0].body}</p>
            <strong>{t.proof.features[0].tag}</strong>
          </article>

          <div className="proof-list">
            {t.proof.features.slice(1).map((feature) => (
              <article key={feature.title}>
                <div>
                  <h3>{feature.title}</h3>
                  <strong>{feature.tag}</strong>
                </div>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="pipeline" aria-label={t.proof.pipelineAria}>
          {t.proof.pipeline.map((step) => (
            <div key={step.title}>
              <strong>{step.title}</strong>
              <small>{step.detail}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="api-section" id="api" aria-labelledby="api-title">
        <div className="api-copy">
          <h2 id="api-title">{t.api.title}</h2>
          <p>{t.api.intro}</p>
          <ul>
            {t.api.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
          <a
            href="https://github.com/catouse/turndown-php#usage"
            target="_blank"
            rel="noreferrer"
          >
            {t.api.explore}
            <ArrowRightUpIcon
              className="ui-icon"
              size={16}
              strokeWidth={1.8}
              aria-hidden
            />
          </a>
        </div>

        <div className="code-card">
          <div className="code-toolbar">
            <p>example.php</p>
            <button type="button" onClick={() => copyText(phpExample, 'php')}>
              <CopyActionIcon copied={copied === 'php'} />
              {copied === 'php' ? t.api.copiedCode : t.api.copyCode}
            </button>
          </div>
          <pre><code className="language-php">{phpExample}</code></pre>
        </div>
      </section>

      <aside className="security-note" aria-labelledby="security-title">
        <ShieldWarningIcon
          className="ui-icon security-icon"
          size={22}
          strokeWidth={1.8}
          aria-hidden
        />
        <div>
          <strong id="security-title">{t.security.title}</strong>
          <p>{t.security.body}</p>
        </div>
        <a
          href="https://github.com/catouse/turndown-php#parsing-and-security"
          target="_blank"
          rel="noreferrer"
        >
          {t.security.link}
          <ArrowRightUpIcon
            className="ui-icon"
            size={15}
            strokeWidth={1.8}
            aria-hidden
          />
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
          <a href="https://solar-icons.vercel.app/" target="_blank" rel="noreferrer">{t.footer.icons}</a>
        </div>
        <p className="footer-note">{t.footer.note}</p>
      </footer>

      <span className="copy-status sr-only" role="status" aria-live="polite">
        {copied ? t.clipboardStatus : ''}
      </span>
    </main>
  );
}
