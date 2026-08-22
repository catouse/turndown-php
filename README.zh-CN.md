# Turndown PHP

![Turndown PHP 封面：将 HTML 转换为 Markdown](assets/turndown-php-cover.png)

[English](README.md) | **简体中文** | [繁體中文](README.zh-TW.md)

> 🌐 **[访问 Turndown PHP 项目网站 →](https://catouse.github.io/turndown-php/)**

Turndown PHP 是一个面向 PHP 8.1+、可配置的 HTML 转 Markdown 转换器。它是一个独立的 PHP 移植版本，兼容 [Turndown 7.2.4](https://github.com/mixmark-io/turndown/tree/fb7a865ef5eba4081dfd4e20a894a61ef7a2edca)，并包含[官方 GFM 插件](https://github.com/mixmark-io/turndown-plugin-gfm/tree/61a981b8c6aaec73bbb8a844d9f8686d0d5f066e)的 PHP 移植实现。

## 安装

此包要求 PHP 8.1 或更高版本，并启用 DOM 和 Mbstring 扩展：

```bash
composer require catouse/turndown-php
```

## 使用

```php
<?php

use Catouse\Turndown\TurndownService;

$service = new TurndownService([
    'headingStyle' => 'atx',
]);

$markdown = $service->turndown('<h1>Hello world!</h1>');

// # Hello world!
```

`turndown()` 可以接收 HTML 字符串，也可以接收以下受支持的 DOM 节点类型：`DOMDocument`、`DOMDocumentFragment` 或 `DOMElement`：

```php
$document = new DOMDocument();
$document->loadHTML('<div><p>Hello <strong>world</strong>.</p></div>');

$markdown = $service->turndown($document);
```

## 选项

选项通过构造函数传入。默认值与 Turndown 7.2.4 保持一致：

| 选项 | 可选值 | 默认值 |
| --- | --- | --- |
| `headingStyle` | `setext`、`atx` | `setext` |
| `hr` | Markdown 主题分隔线 | `* * *` |
| `bulletListMarker` | `-`、`+`、`*` | `*` |
| `codeBlockStyle` | `indented`、`fenced` | `indented` |
| `fence` | `` ``` `` 或 `~~~` | `` ``` `` |
| `emDelimiter` | `_`、`*` | `_` |
| `strongDelimiter` | `**`、`__` | `**` |
| `linkStyle` | `inlined`、`referenced` | `inlined` |
| `linkReferenceStyle` | `full`、`collapsed`、`shortcut` | `full` |
| `preformattedCode` | `bool` | `false` |
| `br` | 在 `<br>` 换行符前插入的 Markdown | 两个空格 |

高级选项 `blankReplacement`、`keepReplacement` 和 `defaultReplacement` 接受以下形式的回调：

```php
function (string $content, DOMElement $node, array $options): string
```

选项采用宽松合并策略：未知键会被保留，并传给自定义过滤器和替换函数。无效值不会被规范化，因此内置选项应使用文档列出的值。

## 规则

可以使用小写标签名、标签名列表或可调用的过滤器添加自定义规则：

```php
$service->addRule('strikethrough', [
    'filter' => ['del', 's', 'strike'],
    'replacement' => static function (
        string $content,
        \DOMElement $node,
        array $options,
    ): string {
        return '~'.$content.'~';
    },
]);
```

规则具有以下结构：

```php
array{
    filter: string|list<string>|callable,
    replacement: callable,
    append?: callable
}
```

过滤器回调会接收 `DOMElement $node` 和合并后的选项数组。替换回调会接收 `string $content`、`DOMElement $node` 和合并后的选项。可选的 `append` 回调会接收合并后的选项，并在转换结束后追加内容。

规则优先级与 Turndown 一致：空白元素、后添加的规则、内置 CommonMark 规则、保留的元素、移除的元素，最后是默认规则。

```php
$service
    ->keep(['del', 'ins'])
    ->remove('script');
```

`keep()` 会以序列化 HTML 的形式保留匹配元素。`remove()` 会移除匹配元素及其内容。两者都接受与规则相同的字符串、列表或可调用过滤器。

## GFM 插件

`Gfm` 会一并启用高亮围栏代码块、删除线、表格和任务列表项：

```php
use Catouse\Turndown\Plugin\Gfm;

$service->use(new Gfm());
```

每个插件也可以单独启用，或通过可迭代对象批量启用：

```php
use Catouse\Turndown\Plugin\Strikethrough;
use Catouse\Turndown\Plugin\Tables;

$service->use([
    new Tables(),
    new Strikethrough(),
]);
```

`Catouse\Turndown\Plugin` 命名空间提供以下可调用插件类：`Gfm`、`HighlightedCodeBlock`、`Strikethrough`、`Tables` 和 `TaskListItems`。

## 公共 API

主要类是 `Catouse\Turndown\TurndownService`。该类有意不声明为 `final`，应用可以通过继承定制转义等行为。

```php
__construct(array $options = [])
turndown(string|DOMNode $input): string
addRule(string $key, array $rule): static
keep(string|array|callable $filter): static
remove(string|array|callable $filter): static
use(callable|iterable $plugin): static
escape(string $text): string
```

配置方法会返回服务实例，支持链式调用。插件可以是接收服务实例的可调用对象，也可以是由此类可调用对象组成的可迭代对象。

## 解析与安全

字符串输入使用 [Masterminds HTML5-PHP](https://github.com/Masterminds/html5-php) 解析，而 JavaScript 版 Turndown 使用浏览器 DOM 或 Domino。因此，在畸形标记恢复、命名空间、实体解码、自动生成的包装元素、空白处理，以及 `keep()` 所保留 HTML 的序列化方面，结果可能存在差异。特别是 Masterminds 明确说明其对部分[插入模式和收养机构算法](https://github.com/Masterminds/html5-php#known-issues-or-things-we-designed-against-the-spec)的支持有限。传入受支持的 DOM 节点时，将直接使用调用方解析器生成的树。本项目以有效 HTML 的等价行为为目标，并通过固定版本的官方测试样例进行验证，但不承诺对畸形 HTML 实现逐字节一致的解析结果。

此库是转换器，不是内容净化工具。它不会验证 URL scheme，也不保证输入 HTML、保留的原始 HTML 或生成的 Markdown 可以安全渲染。请根据应用的威胁模型清理不受信任的输入；将生成的 Markdown 重新渲染为 HTML 时，也应将其视为不受信任的内容。

## 开发

安装开发依赖并运行完整的验证套件：

```bash
composer install
composer check
```

`composer check` 会验证 `composer.json`、检查代码风格、以最高级别运行 PHPStan，并执行 PHPUnit 测试套件。CI 会在 PHP 8.1 至 8.5 上，分别使用最低版本和最新版本的依赖运行测试。此库有意不提交 `composer.lock`。

## 许可证与署名

Turndown PHP 使用 [MIT 许可证](LICENSE)发布。上游项目和依赖项的署名信息请参阅 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
