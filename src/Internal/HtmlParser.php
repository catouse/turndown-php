<?php

declare(strict_types=1);

namespace Catouse\Turndown\Internal;

use DOMDocument;
use DOMDocumentFragment;
use DOMElement;
use DOMNode;
use InvalidArgumentException;
use Masterminds\HTML5;
use RuntimeException;
use TypeError;

/** @internal */
final class HtmlParser
{
    private const ROOT_ID = 'turndown-root';

    private HTML5 $html5;

    public function __construct()
    {
        $this->html5 = new HTML5([
            'disable_html_ns' => false,
            'encode_entities' => false,
            'encoding' => 'UTF-8',
        ]);
    }

    /** @param string|DOMNode $input */
    public function prepare($input): DOMNode
    {
        if (is_string($input)) {
            if (preg_match('//u', $input) !== 1) {
                throw new InvalidArgumentException('Input must be valid UTF-8.');
            }
            $document = $this->html5->loadHTML(
                '<x-turndown id="' . self::ROOT_ID . '">' . $input . '</x-turndown>',
                ['encoding' => 'UTF-8'],
            );
            $root = $document->getElementById(self::ROOT_ID);
            if (!$root instanceof DOMElement) {
                throw new RuntimeException('Unable to create the Turndown root element.');
            }
        } else {
            if (!$input instanceof DOMElement
                && !$input instanceof DOMDocument
                && !$input instanceof DOMDocumentFragment) {
                throw new TypeError($input->nodeName . ' is not an element, document, or document fragment node.');
            }
            $root = $input->cloneNode(true);
        }

        $this->normalizeTableStructure($root);

        return $root;
    }

    public function serialize(DOMElement $node): string
    {
        return $this->html5->saveHTML($node);
    }

    private function normalizeTableStructure(DOMNode $root): void
    {
        /** @var list<DOMNode> $stack */
        $stack = [$root];
        while ($stack !== []) {
            $node = array_pop($stack);
            if ($node instanceof DOMElement) {
                $tagName = DomUtils::tagName($node);
                if ($tagName === 'TABLE') {
                    $this->wrapDirectTableRows($node);
                } elseif (in_array($tagName, ['THEAD', 'TBODY', 'TFOOT'], true)) {
                    $this->wrapDirectTableCells($node);
                }
            }
            if (DomUtils::isTemplate($node)) {
                continue;
            }
            for ($child = $node->lastChild; $child !== null; $child = $child->previousSibling) {
                $stack[] = $child;
            }
        }
    }

    private function wrapDirectTableRows(DOMElement $table): void
    {
        $children = [];
        for ($child = $table->firstChild; $child !== null; $child = $child->nextSibling) {
            $children[] = $child;
        }

        $tbody = null;
        foreach ($children as $child) {
            if ($child instanceof DOMElement && DomUtils::tagName($child) === 'TR') {
                if (!$tbody instanceof DOMElement) {
                    $document = $table->ownerDocument;
                    if (!$document instanceof DOMDocument) {
                        throw new RuntimeException('A table node must have an owner document.');
                    }
                    $tbody = $table->namespaceURI !== null
                        ? $document->createElementNS($table->namespaceURI, 'tbody')
                        : $document->createElement('tbody');
                    $table->insertBefore($tbody, $child);
                }
                $tbody->appendChild($child);
                continue;
            }

            if ($tbody instanceof DOMElement && !$child instanceof DOMElement) {
                $tbody->appendChild($child);
                continue;
            }

            $tbody = null;
        }
    }

    private function wrapDirectTableCells(DOMElement $section): void
    {
        $children = [];
        for ($child = $section->firstChild; $child !== null; $child = $child->nextSibling) {
            $children[] = $child;
        }

        $row = null;
        foreach ($children as $child) {
            $isCell = $child instanceof DOMElement
                && in_array(DomUtils::tagName($child), ['TH', 'TD'], true);
            if ($isCell) {
                if (!$row instanceof DOMElement) {
                    $row = $this->createHtmlElement($section, 'tr');
                    $section->insertBefore($row, $child);
                }
                $row->appendChild($child);
                continue;
            }

            if ($row instanceof DOMElement && !($child instanceof DOMElement)) {
                $row->appendChild($child);
                continue;
            }

            $row = null;
        }
    }

    private function createHtmlElement(DOMElement $parent, string $tagName): DOMElement
    {
        $document = $parent->ownerDocument;
        if (!$document instanceof DOMDocument) {
            throw new RuntimeException('A table node must have an owner document.');
        }

        return $parent->namespaceURI !== null
            ? $document->createElementNS($parent->namespaceURI, $tagName)
            : $document->createElement($tagName);
    }
}
