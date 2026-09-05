<?php

declare(strict_types=1);

namespace Catouse\Turndown\Plugin;

use Catouse\Turndown\Internal\DomUtils;
use Catouse\Turndown\Internal\Utils;
use Catouse\Turndown\TurndownService;
use DOMElement;
use DOMNode;

/**
 * Convert tables with a definitive heading row to GFM pipe tables.
 *
 * Tables without a heading row are kept as HTML, matching the official
 * turndown-plugin-gfm behavior.
 */
final class Tables
{
    public function __invoke(TurndownService $service): void
    {
        $service->keep(function (DOMElement $node, array $options): bool {
            return DomUtils::tagName($node) === 'TABLE'
                && !$this->isHeadingRow($this->firstTableRow($node));
        });

        $service->addRule('tableCell', [
            'filter' => ['th', 'td'],
            'replacement' => function (string $content, DOMElement $node, array $options): string {
                return $this->cell($content, $node);
            },
        ]);

        $service->addRule('tableRow', [
            'filter' => 'tr',
            'replacement' => function (string $content, DOMElement $node, array $options): string {
                $borderCells = '';

                if ($this->isHeadingRow($node)) {
                    foreach ($node->childNodes as $child) {
                        if (!$child instanceof DOMElement) {
                            continue;
                        }

                        $border = match (strtolower($child->getAttribute('align'))) {
                            'left' => ':--',
                            'right' => '--:',
                            'center' => ':-:',
                            default => '---',
                        };

                        $borderCells .= $this->cell($border, $child);
                    }
                }

                return "\n{$content}" . ($borderCells !== '' ? "\n{$borderCells}" : '');
            },
        ]);

        $service->addRule('table', [
            'filter' => function (DOMElement $node, array $options): bool {
                return DomUtils::tagName($node) === 'TABLE'
                    && $this->isHeadingRow($this->firstTableRow($node));
            },
            'replacement' => static function (string $content, DOMElement $node, array $options): string {
                $content = preg_replace('/\n\n/', "\n", $content, 1) ?? $content;

                return "\n\n{$content}\n\n";
            },
        ]);

        $service->addRule('tableSection', [
            'filter' => ['thead', 'tbody', 'tfoot'],
            'replacement' => static function (string $content, DOMElement $node, array $options): string {
                return $content;
            },
        ]);

        $service->addRule('emptyTableRow', [
            'filter' => function (DOMElement $node, array $options): bool {
                return strcasecmp($node->tagName, 'tr') === 0
                    && Utils::isWhitespace($node->textContent)
                    && !DomUtils::hasVoid($node);
            },
            'replacement' => static function (string $content, DOMElement $node, array $options): string {
                return '';
            },
        ]);
    }

    private function isHeadingRow(?DOMElement $row): bool
    {
        if ($row === null) {
            return false;
        }

        $parent = $row->parentNode;
        if (!$parent instanceof DOMElement) {
            return false;
        }

        if (DomUtils::tagName($parent) === 'THEAD') {
            return true;
        }

        $firstChild = $parent->firstChild;
        if (!$firstChild instanceof DOMNode || !$firstChild->isSameNode($row)) {
            return false;
        }

        if (DomUtils::tagName($parent) !== 'TABLE' && !$this->isFirstTbody($parent)) {
            return false;
        }

        foreach ($row->childNodes as $child) {
            if (!$child instanceof DOMElement || DomUtils::tagName($child) !== 'TH') {
                return false;
            }
        }

        return true;
    }

    private function isFirstTbody(DOMElement $element): bool
    {
        if (DomUtils::tagName($element) !== 'TBODY') {
            return false;
        }

        $previous = $element->previousSibling;

        return $previous === null
            || ($previous instanceof DOMElement
                && DomUtils::tagName($previous) === 'THEAD'
                && Utils::isWhitespace($previous->textContent));
    }

    private function firstTableRow(DOMElement $table): ?DOMElement
    {
        foreach ($table->getElementsByTagName('tr') as $row) {
            $ancestor = $row->parentNode;
            while ($ancestor instanceof DOMElement && DomUtils::tagName($ancestor) !== 'TABLE') {
                $ancestor = $ancestor->parentNode;
            }

            if ($ancestor instanceof DOMElement && $ancestor->isSameNode($table)) {
                return $row;
            }
        }

        return null;
    }

    private function cell(string $content, DOMElement $node): string
    {
        $index = 0;
        $parent = $node->parentNode;

        if ($parent !== null) {
            foreach ($parent->childNodes as $position => $child) {
                if ($child->isSameNode($node)) {
                    $index = $position;
                    break;
                }
            }
        }

        $prefix = $index === 0 ? '| ' : ' ';

        return $prefix . $content . ' |';
    }
}
