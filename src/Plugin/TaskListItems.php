<?php

declare(strict_types=1);

namespace Catouse\Turndown\Plugin;

use Catouse\Turndown\Internal\DomUtils;
use Catouse\Turndown\TurndownService;
use DOMElement;

/**
 * Convert checkbox inputs that are direct children of list items.
 */
final class TaskListItems
{
    public function __invoke(TurndownService $service): void
    {
        $service->addRule('taskListItems', [
            'filter' => static function (DOMElement $node, array $options): bool {
                $parent = $node->parentNode;

                return DomUtils::tagName($node) === 'INPUT'
                    && strtolower($node->getAttribute('type')) === 'checkbox'
                    && $parent instanceof DOMElement
                    && DomUtils::tagName($parent) === 'LI';
            },
            'replacement' => static function (string $content, DOMElement $node, array $options): string {
                return ($node->hasAttribute('checked') ? '[x]' : '[ ]') . ' ';
            },
        ]);
    }
}
