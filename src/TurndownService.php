<?php

declare(strict_types=1);

namespace Catouse\Turndown;

use Catouse\Turndown\Internal\CommonMarkRules;
use Catouse\Turndown\Internal\DomUtils;
use Catouse\Turndown\Internal\HtmlParser;
use Catouse\Turndown\Internal\NodeInspector;
use Catouse\Turndown\Internal\Renderer;
use Catouse\Turndown\Internal\RuleCollection;
use Catouse\Turndown\Internal\Utils;
use Catouse\Turndown\Internal\WhitespaceCollapser;
use DOMElement;
use DOMNode;
use TypeError;

class TurndownService
{
    /** @var array<string, mixed> */
    private array $options;

    private HtmlParser $parser;

    private RuleCollection $rules;

    private WhitespaceCollapser $whitespaceCollapser;

    /** @param array<string, mixed> $options */
    public function __construct(array $options = [])
    {
        $this->parser = new HtmlParser();

        $defaults = [
            'headingStyle' => 'setext',
            'hr' => '* * *',
            'bulletListMarker' => '*',
            'codeBlockStyle' => 'indented',
            'fence' => '```',
            'emDelimiter' => '_',
            'strongDelimiter' => '**',
            'linkStyle' => 'inlined',
            'linkReferenceStyle' => 'full',
            'br' => '  ',
            'preformattedCode' => false,
            'blankReplacement' => static fn(string $content, DOMElement $node): string =>
                DomUtils::isBlock($node) ? "\n\n" : '',
            'keepReplacement' => function (string $content, DOMElement $node): string {
                $html = $this->parser->serialize($node);

                return DomUtils::isBlock($node) ? "\n\n" . $html . "\n\n" : $html;
            },
            'defaultReplacement' => static fn(string $content, DOMElement $node): string =>
                DomUtils::isBlock($node) ? "\n\n" . $content . "\n\n" : $content,
        ];

        $this->options = array_replace($defaults, $options);
        $this->rules = new RuleCollection($this->options, CommonMarkRules::definitions());
        $this->whitespaceCollapser = new WhitespaceCollapser();
    }

    public function turndown(string|DOMNode $input): string
    {
        if ($input === '') {
            return '';
        }

        $root = $this->parser->prepare($input);
        $this->whitespaceCollapser->collapse($root, (bool) $this->options['preformattedCode']);
        $renderer = new Renderer(
            $this->rules,
            new NodeInspector(),
            $this->options,
            fn(string $value): string => $this->escape($value),
        );

        return $renderer->render($root);
    }

    /** @param array{filter:mixed, replacement:mixed, append?:mixed} $rule */
    public function addRule(string $key, array $rule): static
    {
        $this->rules->add($key, $rule);

        return $this;
    }

    /** @param string|array<mixed>|callable $filter */
    public function keep(string|array|callable $filter): static
    {
        $this->rules->keep($filter);

        return $this;
    }

    /** @param string|array<mixed>|callable $filter */
    public function remove(string|array|callable $filter): static
    {
        $this->rules->remove($filter);

        return $this;
    }

    /** @param callable|iterable<mixed> $plugin */
    public function use(callable|iterable $plugin): static
    {
        $this->applyPlugin($plugin);

        return $this;
    }

    public function escape(string $value): string
    {
        return Utils::escapeMarkdown($value);
    }

    /** @param mixed $plugin */
    private function applyPlugin($plugin): void
    {
        if (is_callable($plugin)) {
            call_user_func($plugin, $this);
            return;
        }
        if (is_iterable($plugin)) {
            foreach ($plugin as $item) {
                $this->applyPlugin($item);
            }
            return;
        }

        throw new TypeError('plugin must be a callable or an iterable of callables');
    }
}
