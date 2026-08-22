<?php

declare(strict_types=1);

namespace Catouse\Turndown\Plugin;

use Catouse\Turndown\Internal\DomUtils;
use Catouse\Turndown\TurndownService;
use DOMElement;
use TypeError;

/**
 * Convert GitHub-style highlighted source wrappers to fenced code blocks.
 */
final class HighlightedCodeBlock
{
    private const HIGHLIGHT_PATTERN = '/highlight-(?:text|source)-([a-z0-9]+)/';

    public function __invoke(TurndownService $service): void
    {
        $service->addRule('highlightedCodeBlock', [
            'filter' => static function (DOMElement $node, array $options): bool {
                $firstChild = $node->firstChild;

                return DomUtils::tagName($node) === 'DIV'
                    && preg_match(self::HIGHLIGHT_PATTERN, $node->getAttribute('class')) === 1
                    && $firstChild instanceof DOMElement
                    && DomUtils::tagName($firstChild) === 'PRE';
            },
            'replacement' => static function (string $content, DOMElement $node, array $options): string {
                $className = $node->getAttribute('class');
                preg_match(self::HIGHLIGHT_PATTERN, $className, $matches);

                $language = $matches[1] ?? '';
                $fence = $options['fence'] ?? '```';
                if (!is_string($fence)) {
                    throw new TypeError('Option "fence" must be a string.');
                }

                $firstChild = $node->firstChild;
                $code = $firstChild instanceof DOMElement ? $firstChild->textContent : '';

                return "\n\n{$fence}{$language}\n{$code}\n{$fence}\n\n";
            },
        ]);
    }
}
