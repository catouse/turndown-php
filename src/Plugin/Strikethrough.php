<?php

declare(strict_types=1);

namespace Catouse\Turndown\Plugin;

use Catouse\Turndown\TurndownService;
use DOMElement;

/**
 * Convert deletion elements using the delimiter emitted by the official plugin.
 */
final class Strikethrough
{
    public function __invoke(TurndownService $service): void
    {
        $service->addRule('strikethrough', [
            'filter' => ['del', 's', 'strike'],
            'replacement' => static function (string $content, DOMElement $node, array $options): string {
                return '~' . $content . '~';
            },
        ]);
    }
}
