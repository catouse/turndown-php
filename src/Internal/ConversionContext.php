<?php

declare(strict_types=1);

namespace Catouse\Turndown\Internal;

use DOMElement;
use SplObjectStorage;

/** @internal */
final class ConversionContext
{
    /** @var list<string> */
    private array $references = [];

    /** @var SplObjectStorage<DOMElement, int> */
    private SplObjectStorage $elementIndexes;

    public function __construct()
    {
        $this->elementIndexes = new SplObjectStorage();
    }

    public function elementIndex(DOMElement $node): int
    {
        if (!isset($this->elementIndexes[$node])) {
            $index = 0;
            for ($sibling = $node->parentNode?->firstChild; $sibling !== null; $sibling = $sibling->nextSibling) {
                if ($sibling instanceof DOMElement) {
                    $this->elementIndexes[$sibling] = $index++;
                }
            }
        }

        return $this->elementIndexes[$node] ?? 0;
    }

    public function nextReferenceId(): int
    {
        return count($this->references) + 1;
    }

    public function addReference(string $reference): int
    {
        $this->references[] = $reference;

        return count($this->references);
    }

    /** @return list<string> */
    public function takeReferences(): array
    {
        $references = $this->references;
        $this->references = [];

        return $references;
    }
}
