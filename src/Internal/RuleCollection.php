<?php

declare(strict_types=1);

namespace Catouse\Turndown\Internal;

use DOMElement;
use RuntimeException;

/** @internal */
final class RuleCollection
{
    /** @var list<Rule> */
    private array $rules = [];

    /** @var list<Rule> */
    private array $keepRules = [];

    /** @var list<Rule> */
    private array $removeRules = [];

    private Rule $blankRule;

    private Rule $defaultRule;

    /**
     * @param array<string, mixed>                                                  $options
     * @param array<string, array{filter:mixed, replacement:mixed, append?:mixed}> $rules
     */
    public function __construct(private array $options, array $rules)
    {
        foreach ($rules as $key => $definition) {
            $this->rules[] = new Rule((string) $key, $definition);
        }

        $this->blankRule = new Rule('__blank__', [
            'filter' => static fn(): bool => true,
            'replacement' => $this->requiredCallback('blankReplacement'),
        ]);
        $this->defaultRule = new Rule('__default__', [
            'filter' => static fn(): bool => true,
            'replacement' => $this->requiredCallback('defaultReplacement'),
        ]);
    }

    /** @param array{filter:mixed, replacement:mixed, append?:mixed} $definition */
    public function add(string $key, array $definition): void
    {
        array_unshift($this->rules, new Rule($key, $definition));
    }

    /** @param mixed $filter */
    public function keep($filter): void
    {
        array_unshift($this->keepRules, new Rule('__keep__', [
            'filter' => $filter,
            'replacement' => $this->requiredCallback('keepReplacement'),
        ]));
    }

    /** @param mixed $filter */
    public function remove($filter): void
    {
        array_unshift($this->removeRules, new Rule('__remove__', [
            'filter' => $filter,
            'replacement' => static fn(): string => '',
        ]));
    }

    public function forNode(DOMElement $node, NodeInspector $inspector): Rule
    {
        if ($inspector->isBlank($node)) {
            return $this->blankRule;
        }

        foreach ($this->rules as $rule) {
            if ($rule->matches($node, $this->options)) {
                return $rule;
            }
        }
        foreach ($this->keepRules as $rule) {
            if ($rule->matches($node, $this->options)) {
                return $rule;
            }
        }
        foreach ($this->removeRules as $rule) {
            if ($rule->matches($node, $this->options)) {
                return $rule;
            }
        }

        return $this->defaultRule;
    }

    /** @return list<Rule> */
    public function appendableRules(): array
    {
        return $this->rules;
    }

    /** @return callable */
    private function requiredCallback(string $name)
    {
        $callback = $this->options[$name] ?? null;
        if (!is_callable($callback)) {
            throw new RuntimeException(sprintf('Option "%s" must be callable.', $name));
        }

        return $callback;
    }
}
