# Turndown PHP

![Turndown PHP 封面：將 HTML 轉換為 Markdown](assets/turndown-php-cover.png)

[English](README.md) | [简体中文](README.zh-CN.md) | **繁體中文**

> 🌐 **[瀏覽 Turndown PHP 專案網站 →](https://turndown-php.catou.se/)**

Turndown PHP 是一個適用於 PHP 8.1+、可設定的 HTML 轉 Markdown 轉換器。它是獨立的 PHP 移植版本，相容於 [Turndown 7.2.4](https://github.com/mixmark-io/turndown/tree/fb7a865ef5eba4081dfd4e20a894a61ef7a2edca)，並包含[官方 GFM 外掛](https://github.com/mixmark-io/turndown-plugin-gfm/tree/61a981b8c6aaec73bbb8a844d9f8686d0d5f066e)的 PHP 移植實作。

## 安裝

此套件需要 PHP 8.1 或更新版本，並啟用 DOM 和 Mbstring 擴充功能：

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

`turndown()` 可以接收 HTML 字串，也可以接收以下支援的 DOM 節點類型：`DOMDocument`、`DOMDocumentFragment` 或 `DOMElement`：

```php
$document = new DOMDocument();
$document->loadHTML('<div><p>Hello <strong>world</strong>.</p></div>');

$markdown = $service->turndown($document);
```

## 選項

選項透過建構函式傳入。預設值與 Turndown 7.2.4 保持一致：

| 選項 | 可選值 | 預設值 |
| --- | --- | --- |
| `headingStyle` | `setext`、`atx` | `setext` |
| `hr` | Markdown 主題分隔線 | `* * *` |
| `bulletListMarker` | `-`、`+`、`*` | `*` |
| `codeBlockStyle` | `indented`、`fenced` | `indented` |
| `fence` | `` ``` `` 或 `~~~` | `` ``` `` |
| `emDelimiter` | `_`、`*` | `_` |
| `strongDelimiter` | `**`、`__` | `**` |
| `linkStyle` | `inlined`、`referenced` | `inlined` |
| `linkReferenceStyle` | `full`、`collapsed`、`shortcut` | `full` |
| `preformattedCode` | `bool` | `false` |
| `br` | 在 `<br>` 換行符號前插入的 Markdown | 兩個空格 |

進階選項 `blankReplacement`、`keepReplacement` 和 `defaultReplacement` 接受以下形式的回呼函式：

```php
function (string $content, DOMElement $node, array $options): string
```

選項採用寬鬆合併策略：未知鍵會被保留，並傳給自訂過濾器和替換函式。無效值不會被正規化，因此內建選項應使用文件列出的值。

## 規則

可以使用小寫標籤名稱、標籤名稱清單或可呼叫的過濾器新增自訂規則：

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

規則具有以下結構：

```php
array{
    filter: string|list<string>|callable,
    replacement: callable,
    append?: callable
}
```

過濾器回呼函式會接收 `DOMElement $node` 和合併後的選項陣列。替換回呼函式會接收 `string $content`、`DOMElement $node` 和合併後的選項。選用的 `append` 回呼函式會接收合併後的選項，並在轉換結束後附加內容。

規則優先順序與 Turndown 一致：空白元素、後新增的規則、內建 CommonMark 規則、保留的元素、移除的元素，最後是預設規則。

```php
$service
    ->keep(['del', 'ins'])
    ->remove('script');
```

`keep()` 會以序列化 HTML 的形式保留符合的元素。`remove()` 會移除符合的元素及其內容。兩者都接受與規則相同的字串、清單或可呼叫過濾器。

## GFM 外掛

`Gfm` 會一併啟用醒目提示的圍欄程式碼區塊、刪除線、表格和工作清單項目：

```php
use Catouse\Turndown\Plugin\Gfm;

$service->use(new Gfm());
```

每個外掛也可以個別啟用，或透過可迭代物件批次啟用：

```php
use Catouse\Turndown\Plugin\Strikethrough;
use Catouse\Turndown\Plugin\Tables;

$service->use([
    new Tables(),
    new Strikethrough(),
]);
```

`Catouse\Turndown\Plugin` 命名空間提供以下可呼叫的外掛類別：`Gfm`、`HighlightedCodeBlock`、`Strikethrough`、`Tables` 和 `TaskListItems`。

## 公開 API

主要類別是 `Catouse\Turndown\TurndownService`。此類別刻意不宣告為 `final`，應用程式可以透過繼承自訂跳脫等行為。

```php
__construct(array $options = [])
turndown(string|DOMNode $input): string
addRule(string $key, array $rule): static
keep(string|array|callable $filter): static
remove(string|array|callable $filter): static
use(callable|iterable $plugin): static
escape(string $text): string
```

設定方法會傳回服務實例，支援鏈式呼叫。外掛可以是接收服務實例的可呼叫物件，也可以是由此類可呼叫物件組成的可迭代物件。

## 解析與安全

字串輸入使用 [Masterminds HTML5-PHP](https://github.com/Masterminds/html5-php) 解析，而 JavaScript 版 Turndown 使用瀏覽器 DOM 或 Domino。因此，在格式錯誤的標記復原、命名空間、實體解碼、自動產生的包裝元素、空白處理，以及 `keep()` 所保留 HTML 的序列化方面，結果可能有所差異。特別是 Masterminds 明確說明其對部分[插入模式和收養機構演算法](https://github.com/Masterminds/html5-php#known-issues-or-things-we-designed-against-the-spec)的支援有限。傳入支援的 DOM 節點時，將直接使用呼叫端解析器產生的樹狀結構。本專案以有效 HTML 的等價行為為目標，並透過固定版本的官方測試案例進行驗證，但不保證對格式錯誤的 HTML 實作逐位元組一致的解析結果。

此程式庫是轉換器，不是內容淨化工具。它不會驗證 URL scheme，也不保證輸入 HTML、保留的原始 HTML 或產生的 Markdown 可以安全轉譯。請根據應用程式的威脅模型清理不受信任的輸入；將產生的 Markdown 重新轉譯為 HTML 時，也應將其視為不受信任的內容。

## 開發

安裝開發相依套件並執行完整的驗證套件：

```bash
composer install
composer check
```

`composer check` 會驗證 `composer.json`、檢查程式碼風格、以最高層級執行 PHPStan，並執行 PHPUnit 測試套件。CI 會在 PHP 8.1 至 8.5 上，分別使用最低版本和最新版本的相依套件執行測試。此程式庫刻意不提交 `composer.lock`。

## 授權與署名

Turndown PHP 使用 [MIT 授權](LICENSE)發布。上游專案和相依套件的署名資訊請參閱 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
