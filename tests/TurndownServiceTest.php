<?php

declare(strict_types=1);

namespace Catouse\Turndown\Tests;

use Catouse\Turndown\Plugin\Gfm;
use Catouse\Turndown\Plugin\Strikethrough;
use Catouse\Turndown\Tests\Support\FixtureLoader;
use Catouse\Turndown\TurndownService;
use DOMDocument;
use DOMElement;
use PHPUnit\Framework\TestCase;
use TypeError;

final class TurndownServiceTest extends TestCase
{
    public function testEmptyInput(): void
    {
        self::assertSame('', (new TurndownService())->turndown(''));
    }

    public function testUnsupportedDomNodeThrowsTypeError(): void
    {
        $document = new DOMDocument();

        $this->expectException(TypeError::class);
        (new TurndownService())->turndown($document->createTextNode('text'));
    }

    public function testSupportedDocumentAndFragmentInputs(): void
    {
        $document = new DOMDocument();
        $document->loadHTML('<p>Document</p>');

        $fragmentDocument = new DOMDocument();
        $fragment = $fragmentDocument->createDocumentFragment();
        $paragraph = $fragmentDocument->createElement('p', 'Fragment');
        $fragment->appendChild($paragraph);

        $service = new TurndownService();
        self::assertSame('Document', $service->turndown($document));
        self::assertSame('Fragment', $service->turndown($fragment));
    }

    public function testFluentExtensionApiAndRulePrecedence(): void
    {
        $service = new TurndownService();
        $rule = [
            'filter' => ['del', 's', 'strike'],
            'replacement' => static fn(string $content): string => '~~' . $content . '~~',
        ];

        self::assertSame($service, $service->addRule('strikethrough', $rule));
        self::assertSame($service, $service->keep('ins'));
        self::assertSame($service, $service->remove('mark'));
        self::assertSame($service, $service->use(static function (): void {}));
        self::assertSame('~~old~~<ins>new</ins>', $service->turndown('<del>old</del><ins>new</ins><mark>gone</mark>'));
    }

    public function testUseAcceptsCallableArrayBeforeTreatingItAsPluginList(): void
    {
        $plugin = new class {
            public function register(TurndownService $service): void
            {
                $service->addRule('mark', [
                    'filter' => 'mark',
                    'replacement' => static fn(string $content): string => '==' . $content . '==',
                ]);
            }
        };
        $service = new TurndownService();
        $service->use([$plugin, 'register']);

        self::assertSame('==value==', $service->turndown('<mark>value</mark>'));
    }

    public function testUseAcceptsMultiplePlugins(): void
    {
        $service = new TurndownService();
        $service->use([
            new Strikethrough(),
            static function (TurndownService $service): void {
                $service->addRule('insert', [
                    'filter' => 'ins',
                    'replacement' => static fn(string $content): string => '++' . $content . '++',
                ]);
            },
        ]);

        self::assertSame('~old~++new++', $service->turndown('<del>old</del><ins>new</ins>'));
    }

    public function testCustomReplacementOptions(): void
    {
        $service = new TurndownService([
            'blankReplacement' => static fn(): string => '[blank]',
            'keepReplacement' => static fn(string $content, DOMElement $node): string => '<kept>' . $content . '</kept>',
            'defaultReplacement' => static fn(string $content): string => '[' . $content . ']',
        ]);
        $service->keep('ins');

        self::assertSame('[blank]<kept>kept</kept>[default]', $service->turndown('<span> </span><ins>kept</ins><x-unknown>default</x-unknown>'));
    }

    public function testReferenceLinksResetBetweenConversions(): void
    {
        $service = new TurndownService(['linkStyle' => 'referenced']);
        $html = '<a href="https://example.com">Example</a>';
        $expected = "[Example][1]\n\n[1]: https://example.com";

        self::assertSame($expected, $service->turndown($html));
        self::assertSame($expected, $service->turndown($html));
    }

    public function testDomInputIsNotMutated(): void
    {
        $root = FixtureLoader::rootFromHtml(" <p>Hello <em>world</em></p> \n");
        $before = FixtureLoader::serialize($root);

        (new TurndownService())->turndown($root);

        self::assertSame($before, FixtureLoader::serialize($root));
    }

    public function testEscapeCanBeOverridden(): void
    {
        $service = new class extends TurndownService {
            public function escape(string $text): string
            {
                return strtoupper($text);
            }
        };

        self::assertSame('HELLO', $service->turndown('<p>Hello</p>'));
    }

    public function testUtf16SetextLength(): void
    {
        self::assertSame("🙂\n==", (new TurndownService())->turndown('<h1>🙂</h1>'));
        self::assertSame("标题\n==", (new TurndownService())->turndown('<h1>标题</h1>'));
    }

    public function testTemplateContentMatchesBrowserTurndownBehavior(): void
    {
        self::assertSame('', (new TurndownService())->turndown('<template><p>hidden</p></template>'));
    }

    public function testForeignNamespaceElementsAreNotTreatedAsHtmlElements(): void
    {
        self::assertSame(
            'xy',
            (new TurndownService())->turndown(
                '<svg><a href="https://example.com"><text>x</text></a>'
                . '<template><text>y</text></template></svg>',
            ),
        );
    }

    public function testHtmlIntegrationPointsUseHtmlSemantics(): void
    {
        $service = new TurndownService();

        self::assertSame(
            "a\n\nb",
            $service->turndown(
                '<svg><foreignObject><div>a</div><div>b</div></foreignObject></svg>',
            ),
        );
        self::assertSame(
            "a\n\nb",
            $service->turndown(
                '<math><annotation-xml encoding="text/html">'
                . '<div>a</div><div>b</div></annotation-xml></math>',
            ),
        );
    }

    public function testLargeOrderedListStartUsesJavaScriptNumberFormatting(): void
    {
        $service = new TurndownService();
        $cases = [
            '9223372036854775807' => '9223372036854776000.  item',
            '9999999999999999999' => '10000000000000000000.  item',
            '1000000000000000000000' => '1e+21.  item',
        ];

        foreach ($cases as $start => $expected) {
            self::assertSame(
                $expected,
                $service->turndown('<ol start="' . $start . '"><li>item</li></ol>'),
            );
        }

        $previousPrecision = ini_get('serialize_precision');
        self::assertNotFalse($previousPrecision);
        self::assertNotFalse(ini_set('serialize_precision', '14'));

        try {
            self::assertSame(
                '9223372036854776000.  item',
                $service->turndown('<ol start="9223372036854775807"><li>item</li></ol>'),
            );
            self::assertSame('14', ini_get('serialize_precision'));
        } finally {
            ini_set('serialize_precision', $previousPrecision);
        }
    }

    public function testEcmascriptLineSeparatorsInBlockquotesAndFences(): void
    {
        $fencedService = new TurndownService([
            'codeBlockStyle' => 'fenced',
            'fence' => '~~~',
        ]);

        foreach (["\u{2028}", "\u{2029}"] as $separator) {
            self::assertSame(
                '> a' . $separator . '> b',
                (new TurndownService())->turndown(
                    '<blockquote>a' . $separator . 'b</blockquote>',
                ),
            );
            self::assertSame(
                "~~~~\nfoo" . $separator . "~~~\nbar\n~~~~",
                $fencedService->turndown(
                    '<pre><code>foo' . $separator . "~~~\nbar</code></pre>",
                ),
            );
        }
    }

    public function testMalformedHtmlIsTolerated(): void
    {
        self::assertSame(
            '**_x_**y',
            (new TurndownService())->turndown('<b><i>x</b>y</i>'),
        );
    }

    public function testConverterDoesNotSanitizeUrlsOrKeptHtml(): void
    {
        $service = new TurndownService();
        $service->keep('script');

        self::assertSame(
            '[unsafe](javascript:evil)<script>alert(1)</script>',
            $service->turndown('<a href="javascript:evil">unsafe</a><script>alert(1)</script>'),
        );
    }

    public function testLongEscapeInput(): void
    {
        $input = str_repeat('*', 32_768);

        self::assertSame(str_repeat('\\*', 32_768), (new TurndownService())->turndown($input));
    }

    public function testGfmIsOptIn(): void
    {
        self::assertSame('deleted', (new TurndownService())->turndown('<del>deleted</del>'));

        $service = new TurndownService();
        $service->use(new Gfm());
        self::assertSame('~deleted~', $service->turndown('<del>deleted</del>'));
    }

    public function testGfmPreservesVoidContentInOtherwiseEmptyTableRow(): void
    {
        $service = new TurndownService();
        $service->use(new Gfm());

        self::assertSame(
            "| Header |\n| --- |\n| ![](image.png) |",
            $service->turndown(
                '<table><thead><tr><th>Header</th></tr></thead>'
                . '<tbody><tr><td><img src="image.png"></td></tr></tbody></table>',
            ),
        );
    }

    public function testConstructorDoesNotExposeInternalRuleCollection(): void
    {
        $service = new TurndownService(['rules' => []]);

        self::assertSame('content', $service->turndown('<p>content</p>'));
    }
}
