<?php

declare(strict_types=1);

namespace Catouse\Turndown\Internal;

/** @internal */
final class ContextualCallback
{
    /** @var callable */
    private $callback;

    public function __construct(callable $callback)
    {
        $this->callback = $callback;
    }

    public function __invoke(mixed ...$arguments): mixed
    {
        return call_user_func($this->callback, ...$arguments);
    }

    /** @param list<mixed> $arguments */
    public function invoke(array $arguments, ConversionContext $context): mixed
    {
        $arguments[] = $context;

        return call_user_func($this->callback, ...$arguments);
    }
}
