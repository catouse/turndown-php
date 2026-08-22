<?php

declare(strict_types=1);

namespace Catouse\Turndown\Internal;

use DOMElement;
use DOMNode;

/** @internal */
final class Renderer
{
    /** @var callable(string):string */
    private $escaper;

    /**
     * @param array<string, mixed>    $options
     * @param callable(string):string $escaper
     */
    public function __construct(
        private RuleCollection $rules,
        private NodeInspector $inspector,
        private array $options,
        callable $escaper,
    ) {
        $this->escaper = $escaper;
    }

    public function render(DOMNode $root): string
    {
        $context = new ConversionContext();
        $output = $this->process($root, false, $context);

        foreach ($this->rules->appendableRules() as $rule) {
            if ($rule->hasAppend()) {
                $output = Utils::join($output, $rule->append($this->options, $context));
            }
        }

        return Utils::postProcess($output);
    }

    private function process(DOMNode $parent, bool $parentIsCode, ConversionContext $context): string
    {
        if (DomUtils::isTemplate($parent)) {
            return '';
        }

        $output = '';
        for ($node = $parent->firstChild; $node !== null; $node = $node->nextSibling) {
            $replacement = '';
            if ($node->nodeType === XML_TEXT_NODE) {
                $value = $node->nodeValue ?? '';
                $replacement = $parentIsCode ? $value : (string) call_user_func($this->escaper, $value);
            } elseif ($node instanceof DOMElement) {
                $replacement = $this->replacementForNode($node, $parentIsCode, $context);
            }
            $output = Utils::join($output, $replacement);
        }

        return $output;
    }

    private function replacementForNode(
        DOMElement $node,
        bool $parentIsCode,
        ConversionContext $context,
    ): string {
        $isCode = DomUtils::tagName($node) === 'CODE' || $parentIsCode;
        $rule = $this->rules->forNode($node, $this->inspector);
        $content = $this->process($node, $isCode, $context);
        $whitespace = $this->inspector->flankingWhitespace($node, $this->options, $isCode);

        if ($whitespace['leading'] !== '' || $whitespace['trailing'] !== '') {
            $content = Utils::trimUnicode($content);
        }

        return $whitespace['leading']
            . $rule->replace($content, $node, $this->options, $context)
            . $whitespace['trailing'];
    }
}
