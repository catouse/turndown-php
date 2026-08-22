<?php

declare(strict_types=1);

namespace Catouse\Turndown\Internal;

use DOMElement;
use InvalidArgumentException;
use TypeError;

/** @internal */
final class Rule
{
    /** @var mixed */
    private $filter;

    /** @var callable */
    private $replacement;

    /** @var callable|null */
    private $append;

    /** @param array<string, mixed> $definition */
    public function __construct(private string $key, array $definition)
    {
        if (!array_key_exists('filter', $definition)) {
            throw new InvalidArgumentException(sprintf('Rule "%s" must define a filter.', $key));
        }
        $replacement = $definition['replacement'] ?? null;
        if (!is_callable($replacement)) {
            throw new InvalidArgumentException(sprintf('Rule "%s" must define a callable replacement.', $key));
        }
        $append = $definition['append'] ?? null;
        if ($append !== null && !is_callable($append)) {
            throw new InvalidArgumentException(sprintf('Rule "%s" append must be callable.', $key));
        }

        $this->filter = $definition['filter'];
        $this->replacement = $replacement;
        $this->append = $append;
    }

    /** @param array<string, mixed> $options */
    public function matches(DOMElement $node, array $options): bool
    {
        $tagName = strtolower($node->nodeName);
        if (is_string($this->filter)) {
            return $this->filter === $tagName;
        }
        if (is_callable($this->filter)) {
            return (bool) call_user_func($this->filter, $node, $options);
        }
        if (is_array($this->filter)) {
            return in_array($tagName, $this->filter, true);
        }

        throw new TypeError(sprintf(
            'Rule "%s" filter must be a string, array, or callable.',
            $this->key,
        ));
    }

    /** @param array<string, mixed> $options */
    public function replace(string $content, DOMElement $node, array $options, ConversionContext $context): string
    {
        $replacement = $this->replacement instanceof ContextualCallback
            ? $this->replacement->invoke([$content, $node, $options], $context)
            : call_user_func($this->replacement, $content, $node, $options);
        if (!is_string($replacement)) {
            throw new TypeError(sprintf('Rule "%s" replacement must return a string.', $this->key));
        }

        return $replacement;
    }

    public function hasAppend(): bool
    {
        return $this->append !== null;
    }

    /** @param array<string, mixed> $options */
    public function append(array $options, ConversionContext $context): string
    {
        if ($this->append === null) {
            return '';
        }

        $append = $this->append instanceof ContextualCallback
            ? $this->append->invoke([$options], $context)
            : call_user_func($this->append, $options);
        if (!is_string($append)) {
            throw new TypeError(sprintf('Rule "%s" append must return a string.', $this->key));
        }

        return $append;
    }
}
