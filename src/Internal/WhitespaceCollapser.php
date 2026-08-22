<?php

declare(strict_types=1);

namespace Catouse\Turndown\Internal;

use DOMElement;
use DOMNode;

/** @internal */
final class WhitespaceCollapser
{
    public function collapse(DOMNode $element, bool $preformattedCode): void
    {
        if ($element->firstChild === null || $this->isPre($element, $preformattedCode) || DomUtils::isTemplate($element)) {
            return;
        }

        $previousText = null;
        $keepLeadingWhitespace = false;
        $previous = null;
        $node = $this->next($previous, $element, $preformattedCode);

        while ($node !== null && $node !== $element) {
            if ($node->nodeType === XML_TEXT_NODE || $node->nodeType === XML_CDATA_SECTION_NODE) {
                $text = preg_replace('/[ \r\n\t]+/', ' ', $node->nodeValue ?? '') ?? ($node->nodeValue ?? '');

                if (($previousText === null || str_ends_with($previousText->nodeValue ?? '', ' '))
                    && !$keepLeadingWhitespace
                    && str_starts_with($text, ' ')) {
                    $text = substr($text, 1);
                }

                if ($text === '') {
                    $node = $this->remove($node);
                    continue;
                }

                $node->nodeValue = $text;
                $previousText = $node;
            } elseif ($node instanceof DOMElement) {
                if (DomUtils::isBlock($node) || DomUtils::tagName($node) === 'BR') {
                    if ($previousText !== null) {
                        $previousText->nodeValue = preg_replace('/ $/', '', $previousText->nodeValue ?? '') ?? ($previousText->nodeValue ?? '');
                    }
                    $previousText = null;
                    $keepLeadingWhitespace = false;
                } elseif (DomUtils::isVoid($node) || $this->isPre($node, $preformattedCode)) {
                    $previousText = null;
                    $keepLeadingWhitespace = true;
                } elseif ($previousText !== null) {
                    $keepLeadingWhitespace = false;
                }
            } else {
                $node = $this->remove($node);
                continue;
            }

            $next = $this->next($previous, $node, $preformattedCode);
            $previous = $node;
            $node = $next;
        }

        if ($previousText !== null) {
            $previousText->nodeValue = preg_replace('/ $/', '', $previousText->nodeValue ?? '') ?? ($previousText->nodeValue ?? '');
            if (($previousText->nodeValue ?? '') === '') {
                $this->remove($previousText);
            }
        }
    }

    private function isPre(DOMNode $node, bool $preformattedCode): bool
    {
        if (!$node instanceof DOMElement) {
            return false;
        }

        $tagName = DomUtils::tagName($node);

        return $tagName === 'PRE' || ($preformattedCode && $tagName === 'CODE');
    }

    private function remove(DOMNode $node): ?DOMNode
    {
        $next = $node->nextSibling ?? $node->parentNode;
        $node->parentNode?->removeChild($node);

        return $next;
    }

    private function next(?DOMNode $previous, DOMNode $current, bool $preformattedCode): ?DOMNode
    {
        if (($previous !== null && $previous->parentNode === $current)
            || $this->isPre($current, $preformattedCode)
            || DomUtils::isTemplate($current)) {
            return $current->nextSibling ?? $current->parentNode;
        }

        return $current->firstChild ?? $current->nextSibling ?? $current->parentNode;
    }
}
