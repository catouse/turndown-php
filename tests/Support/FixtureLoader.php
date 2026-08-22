<?php

declare(strict_types=1);

namespace Catouse\Turndown\Tests\Support;

use DOMElement;
use DOMNode;
use DOMXPath;
use Masterminds\HTML5;
use RuntimeException;

final class FixtureLoader
{
    /**
     * @return list<array{name: string, options: array<string, mixed>, html: string, dom: DOMElement, expected: string}>
     */
    public static function cases(string $path): array
    {
        $source = file_get_contents($path);
        if ($source === false) {
            throw new RuntimeException(sprintf('Unable to read fixture file: %s', $path));
        }

        $parser = self::parser(disableHtmlNamespace: true);
        $document = $parser->loadHTML($source);
        $xpath = new DOMXPath($document);
        $expectedValues = self::expectedValues($source);
        $caseNodes = $xpath->query(
            "//*[contains(concat(' ', normalize-space(@class), ' '), ' case ')]",
        );

        if ($caseNodes === false) {
            throw new RuntimeException(sprintf('Unable to query fixture file: %s', $path));
        }

        $cases = [];
        foreach ($caseNodes as $index => $caseNode) {
            if (!$caseNode instanceof DOMElement) {
                continue;
            }

            $input = self::firstByClass($xpath, $caseNode, 'input');
            $encodedOptions = $caseNode->getAttribute('data-options');

            if (!array_key_exists($index, $expectedValues)) {
                throw new RuntimeException(sprintf(
                    'Fixture %s does not contain a matching expected value.',
                    $caseNode->getAttribute('data-name'),
                ));
            }

            /** @var array<string, mixed> $options */
            $options = $encodedOptions === ''
                ? []
                : json_decode($encodedOptions, true, 512, JSON_THROW_ON_ERROR);

            $cases[] = [
                'name' => $caseNode->getAttribute('data-name'),
                'options' => $options,
                'html' => self::innerHtml($parser, $input),
                'dom' => $input,
                'expected' => $expectedValues[$index],
            ];
        }

        return $cases;
    }

    public static function rootFromHtml(string $html): DOMElement
    {
        $document = self::parser()->loadHTML(
            '<x-turndown-test id="turndown-test-root">' . $html . '</x-turndown-test>',
        );
        $root = $document->getElementById('turndown-test-root');

        if (!$root instanceof DOMElement) {
            throw new RuntimeException('Unable to create fixture DOM root.');
        }

        return $root;
    }

    public static function serialize(DOMNode $node): string
    {
        return self::parser()->saveHTML($node);
    }

    private static function parser(bool $disableHtmlNamespace = false): HTML5
    {
        return new HTML5([
            'disable_html_ns' => $disableHtmlNamespace,
            'encode_entities' => false,
            'encoding' => 'UTF-8',
        ]);
    }

    private static function firstByClass(DOMXPath $xpath, DOMElement $context, string $class): DOMElement
    {
        $nodes = $xpath->query(
            ".//*[contains(concat(' ', normalize-space(@class), ' '), ' {$class} ')]",
            $context,
        );
        $node = $nodes === false ? null : $nodes->item(0);

        if (!$node instanceof DOMElement) {
            throw new RuntimeException(sprintf(
                'Fixture %s does not contain a .%s element.',
                $context->getAttribute('data-name'),
                $class,
            ));
        }

        return $node;
    }

    private static function innerHtml(HTML5 $parser, DOMElement $element): string
    {
        $html = '';
        foreach ($element->childNodes as $child) {
            $html .= $parser->saveHTML($child);
        }

        return $html;
    }

    /** @return list<string> */
    private static function expectedValues(string $source): array
    {
        $count = preg_match_all(
            '/<pre\s+class="expected">(.*?)<\/pre>/s',
            $source,
            $matches,
        );

        if ($count === false) {
            throw new RuntimeException('Unable to extract expected fixture values.');
        }

        return array_map(
            static fn(string $value): string => html_entity_decode(
                preg_replace('/<!--.*?-->/s', '', $value) ?? $value,
                ENT_QUOTES | ENT_HTML5,
                'UTF-8',
            ),
            $matches[1],
        );
    }
}
