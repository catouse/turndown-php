<?php

declare(strict_types=1);

namespace Catouse\Turndown\Internal;

/** @internal */
final class ConversionContext
{
    /** @var list<string> */
    private array $references = [];

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
