<?php

declare(strict_types=1);

namespace Catouse\Turndown\Internal;

use DOMElement;
use DOMNode;
use LogicException;
use WeakMap;

/** @internal */
final class DomUtils
{
    private const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
    private const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';
    private const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

    private const NAMESPACE_HTML = 1;
    private const NAMESPACE_MATHML = 2;
    private const NAMESPACE_SVG = 3;
    private const NAMESPACE_OTHER = 4;

    /** @var WeakMap<object, mixed>|null */
    private static ?WeakMap $semanticNamespaceStates = null;

    /** @var list<string> */
    private const BLOCK_ELEMENTS = [
        'ADDRESS', 'ARTICLE', 'ASIDE', 'AUDIO', 'BLOCKQUOTE', 'BODY', 'CANVAS',
        'CENTER', 'DD', 'DIR', 'DIV', 'DL', 'DT', 'FIELDSET', 'FIGCAPTION', 'FIGURE',
        'FOOTER', 'FORM', 'FRAMESET', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER',
        'HGROUP', 'HR', 'HTML', 'ISINDEX', 'LI', 'MAIN', 'MENU', 'NAV', 'NOFRAMES',
        'NOSCRIPT', 'OL', 'OUTPUT', 'P', 'PRE', 'SECTION', 'TABLE', 'TBODY', 'TD',
        'TFOOT', 'TH', 'THEAD', 'TR', 'UL',
    ];

    /** @var list<string> */
    private const VOID_ELEMENTS = [
        'AREA', 'BASE', 'BR', 'COL', 'COMMAND', 'EMBED', 'HR', 'IMG', 'INPUT',
        'KEYGEN', 'LINK', 'META', 'PARAM', 'SOURCE', 'TRACK', 'WBR',
    ];

    /** @var list<string> */
    private const MEANINGFUL_WHEN_BLANK_ELEMENTS = [
        'A', 'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TH', 'TD', 'IFRAME', 'SCRIPT',
        'AUDIO', 'VIDEO',
    ];

    public static function tagName(DOMNode $node): string
    {
        if ($node instanceof DOMElement && !self::usesHtmlSemantics($node)) {
            return $node->nodeName;
        }

        return strtoupper($node->nodeName);
    }

    public static function isTemplate(DOMNode $node): bool
    {
        return $node instanceof DOMElement && self::tagName($node) === 'TEMPLATE';
    }

    public static function isBlock(DOMNode $node): bool
    {
        return $node instanceof DOMElement
            && in_array(self::tagName($node), self::BLOCK_ELEMENTS, true);
    }

    public static function isVoid(DOMNode $node): bool
    {
        return $node instanceof DOMElement
            && in_array(self::tagName($node), self::VOID_ELEMENTS, true);
    }

    public static function isMeaningfulWhenBlank(DOMNode $node): bool
    {
        return $node instanceof DOMElement
            && in_array(self::tagName($node), self::MEANINGFUL_WHEN_BLANK_ELEMENTS, true);
    }

    public static function hasVoid(DOMElement $node): bool
    {
        return self::hasDescendantWithTag($node, self::VOID_ELEMENTS);
    }

    public static function hasMeaningfulWhenBlank(DOMElement $node): bool
    {
        return self::hasDescendantWithTag($node, self::MEANINGFUL_WHEN_BLANK_ELEMENTS);
    }

    public static function textContent(DOMNode $node): string
    {
        if ($node->nodeType === XML_TEXT_NODE || $node->nodeType === XML_CDATA_SECTION_NODE) {
            return $node->nodeValue ?? '';
        }
        if (self::isTemplate($node)) {
            return '';
        }

        $content = '';
        /** @var list<DOMNode> $stack */
        $stack = [];
        for ($child = $node->lastChild; $child !== null; $child = $child->previousSibling) {
            $stack[] = $child;
        }

        while ($stack !== []) {
            $current = array_pop($stack);
            if ($current->nodeType === XML_TEXT_NODE || $current->nodeType === XML_CDATA_SECTION_NODE) {
                $content .= $current->nodeValue ?? '';
                continue;
            }
            if (self::isTemplate($current)) {
                continue;
            }
            for ($child = $current->lastChild; $child !== null; $child = $child->previousSibling) {
                $stack[] = $child;
            }
        }

        return $content;
    }

    public static function lastElementChild(DOMNode $node): ?DOMElement
    {
        for ($child = $node->lastChild; $child !== null; $child = $child->previousSibling) {
            if ($child instanceof DOMElement) {
                return $child;
            }
        }

        return null;
    }

    public static function elementIndex(DOMElement $node): int
    {
        $index = 0;
        for ($sibling = $node->previousSibling; $sibling !== null; $sibling = $sibling->previousSibling) {
            if ($sibling instanceof DOMElement) {
                ++$index;
            }
        }

        return $index;
    }

    private static function usesHtmlSemantics(DOMElement $node): bool
    {
        $states = self::$semanticNamespaceStates ??= new WeakMap();
        if (isset($states[$node])) {
            $state = $states[$node];
            if (!is_int($state)) {
                throw new LogicException('Cached namespace state must be an integer.');
            }

            return $state === self::NAMESPACE_HTML;
        }

        /** @var list<DOMElement> $pending */
        $pending = [];
        $current = $node;
        while (!isset($states[$current])) {
            $pending[] = $current;
            $parentNode = $current->parentNode;
            if (!$parentNode instanceof DOMElement) {
                $root = array_pop($pending);
                $state = self::namespaceState($root->namespaceURI);
                $states[$root] = $state;
                $current = $root;
                break;
            }
            $current = $parentNode;
        }

        $state = $states[$current];
        if (!is_int($state)) {
            throw new LogicException('Cached namespace state must be an integer.');
        }
        $parent = $current;
        while ($pending !== []) {
            $child = array_pop($pending);
            $state = self::childNamespaceState($state, $parent, $child);
            $states[$child] = $state;
            $parent = $child;
        }

        return $states[$node] === self::NAMESPACE_HTML;
    }

    private static function childNamespaceState(int $parentState, DOMElement $parent, DOMElement $child): int
    {
        $parentName = strtolower($parent->localName ?? $parent->nodeName);
        $childName = strtolower($child->localName ?? $child->nodeName);

        if ($parentState === self::NAMESPACE_HTML) {
            if (self::namespaceState($parent->namespaceURI) === self::NAMESPACE_HTML) {
                $actualState = self::namespaceState($child->namespaceURI);
                if ($actualState !== self::NAMESPACE_HTML) {
                    return $actualState;
                }
            }

            return self::htmlChildNamespaceState($childName);
        }

        if ($parentState === self::NAMESPACE_SVG
            && in_array($parentName, ['foreignobject', 'desc', 'title'], true)) {
            return self::htmlChildNamespaceState($childName);
        }

        if ($parentState === self::NAMESPACE_MATHML) {
            if ($parentName === 'annotation-xml' && $childName === 'svg') {
                return self::NAMESPACE_SVG;
            }

            $isTextIntegrationPoint = in_array($parentName, ['mi', 'mo', 'mn', 'ms', 'mtext'], true)
                && !in_array($childName, ['mglyph', 'malignmark'], true);
            $encoding = strtolower($parent->getAttribute('encoding'));
            $isAnnotationIntegrationPoint = $parentName === 'annotation-xml'
                && in_array($encoding, ['text/html', 'application/xhtml+xml'], true);

            if ($isTextIntegrationPoint || $isAnnotationIntegrationPoint) {
                return self::htmlChildNamespaceState($childName);
            }
        }

        return $parentState;
    }

    private static function htmlChildNamespaceState(string $childName): int
    {
        return match ($childName) {
            'svg' => self::NAMESPACE_SVG,
            'math' => self::NAMESPACE_MATHML,
            default => self::NAMESPACE_HTML,
        };
    }

    private static function namespaceState(?string $namespace): int
    {
        return match ($namespace) {
            null, '', self::HTML_NAMESPACE => self::NAMESPACE_HTML,
            self::MATHML_NAMESPACE => self::NAMESPACE_MATHML,
            self::SVG_NAMESPACE => self::NAMESPACE_SVG,
            default => self::NAMESPACE_OTHER,
        };
    }

    /** @param list<string> $tagNames */
    private static function hasDescendantWithTag(DOMElement $node, array $tagNames): bool
    {
        if (self::isTemplate($node)) {
            return false;
        }

        /** @var list<DOMNode> $stack */
        $stack = [];
        for ($child = $node->lastChild; $child !== null; $child = $child->previousSibling) {
            $stack[] = $child;
        }

        while ($stack !== []) {
            $current = array_pop($stack);
            if (!$current instanceof DOMElement) {
                continue;
            }
            if (in_array(self::tagName($current), $tagNames, true)) {
                return true;
            }
            if (self::isTemplate($current)) {
                continue;
            }
            for ($child = $current->lastChild; $child !== null; $child = $child->previousSibling) {
                $stack[] = $child;
            }
        }

        return false;
    }
}
