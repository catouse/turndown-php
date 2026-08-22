<?php

declare(strict_types=1);

namespace Catouse\Turndown\Plugin;

use Catouse\Turndown\TurndownService;

/**
 * Apply all extensions from the official turndown-plugin-gfm package.
 */
final class Gfm
{
    public function __invoke(TurndownService $service): void
    {
        $service->use([
            new HighlightedCodeBlock(),
            new Strikethrough(),
            new Tables(),
            new TaskListItems(),
        ]);
    }
}
