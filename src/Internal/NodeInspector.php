<?php

declare(strict_types=1);

namespace Catouse\Turndown\Internal;

use DOMElement;
use DOMNode;

/** @internal */
final class NodeInspector
{
    public function isBlank(DOMElement $node): bool
    {
        return !DomUtils::isVoid($node)
            && !DomUtils::isMeaningfulWhenBlank($node)
            && Utils::isWhitespace(DomUtils::textContent($node))
            && !DomUtils::hasVoid($node)
            && !DomUtils::hasMeaningfulWhenBlank($node);
    }

    /**
     * @param array<string, mixed> $options
     *
     * @return array{leading:string, trailing:string}
     */
    public function flankingWhitespace(DOMElement $node, array $options, bool $isCode): array
    {
        if (DomUtils::isBlock($node) || (($options['preformattedCode'] ?? false) && $isCode)) {
            return ['leading' => '', 'trailing' => ''];
        }

        $edges = Utils::edgeWhitespace(DomUtils::textContent($node));

        if ($edges['leadingAscii'] !== '' && $this->isFlankedByWhitespace('left', $node, $options)) {
            $edges['leading'] = $edges['leadingNonAscii'];
        }
        if ($edges['trailingAscii'] !== '' && $this->isFlankedByWhitespace('right', $node, $options)) {
            $edges['trailing'] = $edges['trailingNonAscii'];
        }

        return ['leading' => $edges['leading'], 'trailing' => $edges['trailing']];
    }

    /** @param array<string, mixed> $options */
    private function isFlankedByWhitespace(string $side, DOMElement $node, array $options): bool
    {
        $sibling = $side === 'left' ? $node->previousSibling : $node->nextSibling;
        if (!$sibling instanceof DOMNode) {
            return false;
        }

        if ($sibling->nodeType === XML_TEXT_NODE) {
            $value = $sibling->nodeValue ?? '';
            return $side === 'left' ? str_ends_with($value, ' ') : str_starts_with($value, ' ');
        }

        if (($options['preformattedCode'] ?? false)
            && $sibling instanceof DOMElement
            && DomUtils::tagName($sibling) === 'CODE') {
            return false;
        }

        if ($sibling instanceof DOMElement && !DomUtils::isBlock($sibling)) {
            $value = DomUtils::textContent($sibling);
            return $side === 'left' ? str_ends_with($value, ' ') : str_starts_with($value, ' ');
        }

        return false;
    }
}
