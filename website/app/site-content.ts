export type Language = 'en' | 'zh';
export type Theme = 'dark' | 'light';

export const siteContent = {
  en: {
    meta: {
      title: 'Turndown PHP | HTML to Markdown for PHP',
      description:
        'A configurable HTML-to-Markdown converter for PHP 8.1+, compatible with Turndown 7.2.4 and the official GFM plugins.',
    },
    controls: {
      language: 'Language',
      theme: 'Color theme',
      dark: 'Dark',
      light: 'Light',
      useDark: 'Use dark mode',
      useLight: 'Use light mode',
    },
    navigation: {
      aria: 'Primary navigation',
      home: 'Turndown PHP home',
      playground: 'Playground',
      api: 'API',
    },
    hero: {
      eyebrow: 'HTML in. Markdown out.',
      title: 'Turndown, rebuilt for',
      emphasis: 'PHP.',
      intro:
        'Convert unruly HTML into clean Markdown with a familiar API, configurable rules, and official GFM plugins.',
      tryConverter: 'Try the converter',
      readDocs: 'Read the docs',
      previewInput: 'Source HTML',
      previewOutput: 'Result Markdown',
      previewCaption: 'Edit the HTML. PHP/WASM updates the Markdown as you type.',
      previewStarting: 'Starting PHP/WASM',
      previewConverting: 'Converting',
      previewLive: 'PHP/WASM live',
      previewUnavailable: 'PHP/WASM unavailable',
      installLabel: 'Install with Composer',
      installAria: 'Composer installation command',
      copyInstall: 'Copy Composer installation command',
      copy: 'Copy',
      copied: 'Copied',
      highlightsAria: 'Project highlights',
      signal: 'Project signal',
      compatibility: 'Turndown compatibility target',
      php: 'Modern PHP, no framework required',
      gfm: 'Tables, tasks, strike & fenced code',
      license: 'Open source and production-friendly',
    },
    playground: {
      eyebrow: 'Live playground',
      title: 'Make some Markdown',
      intro:
        'Paste HTML on the left. Once PHP loads, tune the rules below and the Markdown updates on the right.',
      examplesAria: 'Playground examples',
      loadExampleAria: 'Load an example',
      examples: 'Examples',
      clear: 'Clear',
      reset: 'Reset',
      html: 'HTML',
      inputViewAria: 'HTML input view',
      preview: 'Preview',
      previewTitle: 'Rendered HTML preview',
      previewGuard: 'Scripts and external assets disabled',
      markdown: 'Markdown',
      chars: 'chars',
      placeholder: 'Paste HTML here…',
      htmlHint: 'Enter HTML to convert it to Markdown.',
      copyOutput: 'Copy output',
      copiedOutput: 'Copied!',
      runtimePending: 'Starting the PHP 8.4 runtime…',
      settings: {
        kicker: 'Conversion settings',
        title: 'Shape the output',
        intro:
          'Defaults mirror Turndown 7.2.4. Disabled controls do not apply to the current mode.',
        fields: {
          headingStyle: 'Heading style',
          hr: 'Horizontal rule',
          bulletListMarker: 'Bullet marker',
          codeBlockStyle: 'Code blocks',
          fence: 'Fence marker',
          emDelimiter: 'Emphasis',
          strongDelimiter: 'Strong',
          linkStyle: 'Links',
          linkReferenceStyle: 'Link references',
        },
        options: {
          setext: 'Setext',
          atx: 'ATX',
          indented: 'Indented',
          fenced: 'Fenced',
          inlined: 'Inline',
          referenced: 'Referenced',
          full: 'Full',
          collapsed: 'Collapsed',
          shortcut: 'Shortcut',
        },
        gfm: 'GFM plugins',
        preformattedCode: 'Preformatted code',
      },
      engineNoteBefore:
        'This preview runs the actual PHP package inside PHP 8.4, compiled for the browser by',
      engineNoteAfter: 'Your HTML is converted locally and never sent to a server.',
    },
    runtime: {
      loading: 'Starting PHP 8.4 in your browser…',
      ready: 'PHP 8.4 WASM · turndown-php',
      converting: 'Converting with turndown-php…',
      fatal: 'PHP/WASM could not start.',
      stopped: 'PHP/WASM worker stopped.',
      unavailable: 'The browser could not run the PHP conversion worker.',
    },
    proof: {
      eyebrow: 'Why Turndown PHP',
      title: 'Familiar rules. Native runtime.',
      intro:
        'Designed for migrations, publishing pipelines, imports, and anywhere HTML needs a cleaner exit.',
      features: [
        {
          title: 'Compatibility, pinned',
          body:
            'Targets Turndown 7.2.4 behavior and exercises both string and DOM input against pinned upstream fixtures.',
          tag: 'Predictable upgrades',
        },
        {
          title: 'GFM, included',
          body:
            'Bring tables, highlighted fenced code, task-list items, and strikethrough into one fluent plugin call.',
          tag: 'Official plugin ports',
        },
        {
          title: 'Rules, composable',
          body:
            'Add rules, keep selected HTML, remove unwanted nodes, or supply callbacks without leaving PHP.',
          tag: 'Built to extend',
        },
      ],
      pipelineAria: 'Conversion pipeline',
      pipeline: [
        { title: 'HTML', detail: 'String or DOM node' },
        { title: 'Parse', detail: 'HTML5 document tree' },
        { title: 'Rules', detail: 'CommonMark + plugins' },
        { title: 'Markdown', detail: 'Portable plain text' },
      ],
    },
    api: {
      eyebrow: 'Install. Configure. Convert.',
      title: 'From install to output in under a minute.',
      intro:
        'No framework and no service dependency. Install with Composer, configure the converter, then pass it HTML.',
      steps: [
        'Requires PHP 8.1, DOM, and Mbstring',
        'Accepts HTML strings or supported DOM nodes',
        'Returns Markdown as a plain string',
      ],
      explore: 'Explore the full API',
      copyCode: 'Copy code',
      copiedCode: 'Copied!',
    },
    security: {
      kicker: 'A clear boundary',
      title: 'Conversion is not sanitization.',
      body:
        'Treat generated Markdown as untrusted when rendering it back to HTML. Sanitize untrusted input according to your application’s threat model.',
      link: 'Security notes',
    },
    footer: {
      tagline: 'HTML to Markdown, without leaving PHP.',
      chineseDocs: 'Chinese README',
      license: 'MIT License',
      icons: 'Solar Icons by 480 Design',
      note: 'Independent PHP port. Turndown is © Dom Christie.',
    },
    clipboardStatus: 'Copied to clipboard.',
  },
  zh: {
    meta: {
      title: 'Turndown PHP | PHP 的 HTML 转 Markdown 工具',
      description:
        '面向 PHP 8.1+ 的可配置 HTML 转 Markdown 工具，兼容 Turndown 7.2.4，并包含官方 GFM 插件的 PHP 移植。',
    },
    controls: {
      language: '语言',
      theme: '颜色主题',
      dark: '深色',
      light: '浅色',
      useDark: '切换为深色模式',
      useLight: '切换为浅色模式',
    },
    navigation: {
      aria: '主导航',
      home: 'Turndown PHP 首页',
      playground: '在线转换',
      api: 'API',
    },
    hero: {
      eyebrow: '输入 HTML，输出 Markdown。',
      title: 'Turndown，为',
      emphasis: 'PHP 重建。',
      intro:
        '使用熟悉的 API、可配置规则和官方 GFM 插件，将复杂 HTML 转为干净 Markdown。',
      tryConverter: '在线试用',
      readDocs: '阅读文档',
      previewInput: 'HTML 输入',
      previewOutput: 'Markdown 输出',
      previewCaption: '直接编辑 HTML，PHP/WASM 会实时更新 Markdown。',
      previewStarting: '正在启动 PHP/WASM',
      previewConverting: '正在转换',
      previewLive: 'PHP/WASM 实时转换',
      previewUnavailable: 'PHP/WASM 不可用',
      installLabel: '使用 Composer 安装',
      installAria: 'Composer 安装命令',
      copyInstall: '复制 Composer 安装命令',
      copy: '复制',
      copied: '已复制',
      highlightsAria: '项目指标',
      signal: '项目指标',
      compatibility: 'Turndown 兼容目标',
      php: '现代 PHP，无框架依赖',
      gfm: '表格、任务列表、删除线与围栏代码',
      license: '开源，可用于生产环境',
    },
    playground: {
      eyebrow: '在线转换',
      title: '在线转换',
      intro: '在左侧粘贴 HTML。PHP 加载后可调整下方规则，右侧 Markdown 会即时更新。',
      examplesAria: '转换示例',
      loadExampleAria: '载入示例',
      examples: '示例',
      clear: '清空',
      reset: '重置',
      html: 'HTML',
      inputViewAria: 'HTML 输入视图',
      preview: '预览',
      previewTitle: 'HTML 渲染预览',
      previewGuard: '脚本与外部资源已禁用',
      markdown: 'Markdown',
      chars: '字符',
      placeholder: '在此粘贴 HTML…',
      htmlHint: '输入需要转换为 Markdown 的 HTML。',
      copyOutput: '复制结果',
      copiedOutput: '已复制',
      runtimePending: '正在启动 PHP 8.4 运行环境…',
      settings: {
        kicker: '转换设置',
        title: '调整输出格式',
        intro: '默认值与 Turndown 7.2.4 一致。禁用的控件不适用于当前模式。',
        fields: {
          headingStyle: '标题样式',
          hr: '分隔线',
          bulletListMarker: '列表标记',
          codeBlockStyle: '代码块',
          fence: '围栏标记',
          emDelimiter: '斜体',
          strongDelimiter: '粗体',
          linkStyle: '链接',
          linkReferenceStyle: '引用链接',
        },
        options: {
          setext: 'Setext',
          atx: 'ATX',
          indented: '缩进',
          fenced: '围栏',
          inlined: '行内',
          referenced: '引用',
          full: '完整',
          collapsed: '折叠',
          shortcut: '简写',
        },
        gfm: 'GFM 插件',
        preformattedCode: '预格式化代码',
      },
      engineNoteBefore: '此预览会在 PHP 8.4 中运行真实的 PHP 包，浏览器运行环境由',
      engineNoteAfter: '提供。HTML 仅在本机转换，不会发送到服务器。',
    },
    runtime: {
      loading: '正在浏览器中启动 PHP 8.4…',
      ready: 'PHP 8.4 WASM · turndown-php',
      converting: '正在使用 turndown-php 转换…',
      fatal: 'PHP/WASM 无法启动。',
      stopped: 'PHP/WASM Worker 已停止。',
      unavailable: '当前浏览器无法运行 PHP 转换 Worker。',
    },
    proof: {
      eyebrow: '为什么选择 Turndown PHP',
      title: '熟悉的规则，原生的 PHP。',
      intro: '适用于内容迁移、发布流水线、数据导入，以及所有需要干净 Markdown 的场景。',
      features: [
        {
          title: '固定兼容基线',
          body: '以 Turndown 7.2.4 行为为目标，并使用上游固定测试验证字符串与 DOM 输入。',
          tag: '升级结果可预期',
        },
        {
          title: '完整支持 GFM',
          body: '通过一个流畅的插件调用支持表格、高亮围栏代码、任务列表与删除线。',
          tag: '官方插件的 PHP 移植',
        },
        {
          title: '规则可自由组合',
          body: '可添加规则、保留指定 HTML、删除不需要的节点，或直接提供回调函数。',
          tag: '便于扩展',
        },
      ],
      pipelineAria: '转换流程',
      pipeline: [
        { title: 'HTML', detail: '字符串或 DOM 节点' },
        { title: '解析', detail: 'HTML5 文档树' },
        { title: '规则', detail: 'CommonMark 与插件' },
        { title: 'Markdown', detail: '可移植纯文本' },
      ],
    },
    api: {
      eyebrow: '安装、配置、转换',
      title: '不到一分钟，从安装到输出。',
      intro: '无需框架和服务依赖。使用 Composer 安装，配置转换器，然后传入 HTML。',
      steps: [
        '需要 PHP 8.1、DOM 和 Mbstring',
        '接受 HTML 字符串或支持的 DOM 节点',
        '以纯字符串形式返回 Markdown',
      ],
      explore: '查看完整 API',
      copyCode: '复制代码',
      copiedCode: '已复制',
    },
    security: {
      kicker: '明确的边界',
      title: '转换不等于内容净化。',
      body: '将生成的 Markdown 重新渲染为 HTML 时，仍应视为不可信内容，并根据应用的威胁模型进行净化。',
      link: '安全说明',
    },
    footer: {
      tagline: 'HTML 转 Markdown，全程使用 PHP。',
      chineseDocs: '中文文档',
      license: 'MIT 许可证',
      icons: 'Solar Icons by 480 Design',
      note: '独立 PHP 移植。Turndown 原作者为 Dom Christie。',
    },
    clipboardStatus: '已复制到剪贴板。',
  },
} as const;

export const playgroundExamples = [
  {
    id: 'product',
    label: { en: 'Product brief', zh: '产品内容' },
    html: {
      en: `<article>
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
      zh: `<article>
  <h1>发布更干净的内容</h1>
  <p>将 <strong>HTML</strong> 转换为便于阅读和移植的 Markdown。</p>
  <h2>发布检查清单</h2>
  <ul>
    <li><input type="checkbox" checked> 确认内容模型</li>
    <li><input type="checkbox"> 发布迁移指南</li>
  </ul>
  <blockquote>好工具会让简单的路径清晰可见。</blockquote>
  <p>在 GitHub 上查看<a href="https://github.com/catouse/turndown-php">源代码</a>。</p>
</article>`,
    },
  },
  {
    id: 'docs',
    label: { en: 'PHP docs', zh: 'PHP 文档' },
    html: {
      en: `<section>
  <h1>Quick start</h1>
  <p>Install the package with Composer, then create a service.</p>
  <pre><code class="language-php">use Catouse\\Turndown\\TurndownService;

$service = new TurndownService([
    'headingStyle' => 'atx',
]);

echo $service->turndown($html);</code></pre>
  <p><em>Tip:</em> enable the GFM plugin when your content contains tables.</p>
</section>`,
      zh: `<section>
  <h1>快速开始</h1>
  <p>使用 Composer 安装软件包，然后创建转换服务。</p>
  <pre><code class="language-php">use Catouse\\Turndown\\TurndownService;

$service = new TurndownService([
    'headingStyle' => 'atx',
]);

echo $service->turndown($html);</code></pre>
  <p><em>提示：</em>内容包含表格时，请启用 GFM 插件。</p>
</section>`,
    },
  },
  {
    id: 'gfm',
    label: { en: 'GFM table', zh: 'GFM 表格' },
    html: {
      en: `<article>
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
      zh: `<article>
  <h1>兼容性概览</h1>
  <table>
    <thead><tr><th>功能</th><th>状态</th></tr></thead>
    <tbody>
      <tr><td>表格</td><td><strong>可用</strong></td></tr>
      <tr><td>任务列表</td><td><strong>可用</strong></td></tr>
      <tr><td>删除线</td><td><del>计划中</del> 可用</td></tr>
    </tbody>
  </table>
</article>`,
    },
  },
] as const;
