<?php

declare(strict_types=1);

namespace Catouse\Turndown\Internal;

use DOMElement;

/** @internal */
final class CommonMarkRules
{
    /** @return array<string, array{filter:mixed, replacement:callable, append?:callable}> */
    public static function definitions(): array
    {
        return [
            'paragraph' => [
                'filter' => 'p',
                'replacement' => static fn(string $content): string => "\n\n" . $content . "\n\n",
            ],
            'lineBreak' => [
                'filter' => 'br',
                'replacement' => static fn(string $content, DOMElement $node, array $options): string =>
                    Utils::stringOption($options, 'br') . "\n",
            ],
            'heading' => [
                'filter' => ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
                'replacement' => static function (string $content, DOMElement $node, array $options): string {
                    $level = (int) substr(DomUtils::tagName($node), 1, 1);
                    if ($options['headingStyle'] === 'setext' && $level < 3) {
                        $underline = str_repeat($level === 1 ? '=' : '-', Utils::utf16Length($content));
                        return "\n\n" . $content . "\n" . $underline . "\n\n";
                    }

                    return "\n\n" . str_repeat('#', $level) . ' ' . $content . "\n\n";
                },
            ],
            'blockquote' => [
                'filter' => 'blockquote',
                'replacement' => static function (string $content): string {
                    $content = Utils::trimNewlines($content);
                    $content = preg_replace(
                        '/\A|(?<=[\r\n\x{2028}\x{2029}])/u',
                        '> ',
                        $content,
                    ) ?? $content;

                    return "\n\n" . $content . "\n\n";
                },
            ],
            'list' => [
                'filter' => ['ul', 'ol'],
                'replacement' => static function (string $content, DOMElement $node): string {
                    $parent = $node->parentNode;
                    if ($parent instanceof DOMElement
                        && DomUtils::tagName($parent) === 'LI'
                        && DomUtils::lastElementChild($parent) === $node) {
                        return "\n" . $content;
                    }

                    return "\n\n" . $content . "\n\n";
                },
            ],
            'listItem' => [
                'filter' => 'li',
                'replacement' => static function (string $content, DOMElement $node, array $options): string {
                    $prefix = Utils::stringOption($options, 'bulletListMarker') . '   ';
                    $parent = $node->parentNode;
                    if ($parent instanceof DOMElement && DomUtils::tagName($parent) === 'OL') {
                        $index = DomUtils::elementIndex($node);
                        $start = $parent->getAttribute('start');
                        $number = $start !== ''
                            ? Utils::jsNumberToString(Utils::jsNumber($start) + $index)
                            : (string) ($index + 1);
                        $prefix = $number . '.  ';
                    }

                    $isParagraph = str_ends_with($content, "\n");
                    $content = Utils::trimNewlines($content) . ($isParagraph ? "\n" : '');
                    $content = str_replace("\n", "\n" . str_repeat(' ', strlen($prefix)), $content);

                    return $prefix . $content . ($node->nextSibling !== null ? "\n" : '');
                },
            ],
            'indentedCodeBlock' => [
                'filter' => static fn(DOMElement $node, array $options): bool =>
                    $options['codeBlockStyle'] === 'indented'
                    && DomUtils::tagName($node) === 'PRE'
                    && $node->firstChild instanceof DOMElement
                    && DomUtils::tagName($node->firstChild) === 'CODE',
                'replacement' => static function (string $content, DOMElement $node): string {
                    $code = $node->firstChild instanceof DOMElement ? DomUtils::textContent($node->firstChild) : '';

                    return "\n\n    " . str_replace("\n", "\n    ", $code) . "\n\n";
                },
            ],
            'fencedCodeBlock' => [
                'filter' => static fn(DOMElement $node, array $options): bool =>
                    $options['codeBlockStyle'] === 'fenced'
                    && DomUtils::tagName($node) === 'PRE'
                    && $node->firstChild instanceof DOMElement
                    && DomUtils::tagName($node->firstChild) === 'CODE',
                'replacement' => static function (string $content, DOMElement $node, array $options): string {
                    $codeNode = $node->firstChild;
                    if (!$codeNode instanceof DOMElement) {
                        return '';
                    }
                    $className = $codeNode->getAttribute('class');
                    preg_match('/language-(\S+)/u', $className, $languageMatch);
                    $language = $languageMatch[1] ?? '';
                    $code = DomUtils::textContent($codeNode);
                    $fenceCharacter = substr(Utils::stringOption($options, 'fence'), 0, 1);
                    $fenceSize = 3;
                    preg_match_all(
                        '/(?:\A|(?<=[\r\n\x{2028}\x{2029}]))'
                            . preg_quote($fenceCharacter, '/')
                            . '{3,}/u',
                        $code,
                        $matches,
                    );
                    foreach ($matches[0] as $match) {
                        if (strlen($match) >= $fenceSize) {
                            $fenceSize = strlen($match) + 1;
                        }
                    }
                    $fence = str_repeat($fenceCharacter, $fenceSize);
                    if (str_ends_with($code, "\n")) {
                        $code = substr($code, 0, -1);
                    }

                    return "\n\n" . $fence . $language . "\n" . $code . "\n" . $fence . "\n\n";
                },
            ],
            'horizontalRule' => [
                'filter' => 'hr',
                'replacement' => static fn(string $content, DOMElement $node, array $options): string =>
                    "\n\n" . Utils::stringOption($options, 'hr') . "\n\n",
            ],
            'inlineLink' => [
                'filter' => static fn(DOMElement $node, array $options): bool =>
                    $options['linkStyle'] === 'inlined'
                    && DomUtils::tagName($node) === 'A'
                    && $node->getAttribute('href') !== '',
                'replacement' => static function (string $content, DOMElement $node): string {
                    $href = Utils::escapeLinkDestination($node->getAttribute('href'));
                    $title = Utils::escapeLinkTitle(Utils::cleanAttribute($node->getAttribute('title')));
                    $titlePart = $title !== '' ? ' "' . $title . '"' : '';

                    return '[' . $content . '](' . $href . $titlePart . ')';
                },
            ],
            'referenceLink' => [
                'filter' => static fn(DOMElement $node, array $options): bool =>
                    $options['linkStyle'] === 'referenced'
                    && DomUtils::tagName($node) === 'A'
                    && $node->getAttribute('href') !== '',
                'replacement' => new ContextualCallback(static function (
                    string $content,
                    DOMElement $node,
                    array $options,
                    ConversionContext $context,
                ): string {
                    $href = Utils::escapeLinkDestination($node->getAttribute('href'));
                    $title = Utils::cleanAttribute($node->getAttribute('title'));
                    $title = $title !== '' ? ' "' . Utils::escapeLinkTitle($title) . '"' : '';

                    if ($options['linkReferenceStyle'] === 'collapsed') {
                        $replacement = '[' . $content . '][]';
                        $reference = '[' . $content . ']: ' . $href . $title;
                    } elseif ($options['linkReferenceStyle'] === 'shortcut') {
                        $replacement = '[' . $content . ']';
                        $reference = '[' . $content . ']: ' . $href . $title;
                    } else {
                        $id = $context->nextReferenceId();
                        $replacement = '[' . $content . '][' . $id . ']';
                        $reference = '[' . $id . ']: ' . $href . $title;
                    }

                    $context->addReference($reference);

                    return $replacement;
                }),
                'append' => new ContextualCallback(static function (array $options, ConversionContext $context): string {
                    $references = $context->takeReferences();

                    return $references === [] ? '' : "\n\n" . implode("\n", $references) . "\n\n";
                }),
            ],
            'emphasis' => [
                'filter' => ['em', 'i'],
                'replacement' => static fn(string $content, DOMElement $node, array $options): string =>
                    Utils::trimUnicode($content) === ''
                        ? ''
                        : Utils::stringOption($options, 'emDelimiter')
                            . $content
                            . Utils::stringOption($options, 'emDelimiter'),
            ],
            'strong' => [
                'filter' => ['strong', 'b'],
                'replacement' => static fn(string $content, DOMElement $node, array $options): string =>
                    Utils::trimUnicode($content) === ''
                        ? ''
                        : Utils::stringOption($options, 'strongDelimiter')
                            . $content
                            . Utils::stringOption($options, 'strongDelimiter'),
            ],
            'code' => [
                'filter' => static function (DOMElement $node): bool {
                    $hasSiblings = $node->previousSibling !== null || $node->nextSibling !== null;
                    $parent = $node->parentNode;
                    $isCodeBlock = $parent instanceof DOMElement
                        && DomUtils::tagName($parent) === 'PRE'
                        && !$hasSiblings;

                    return DomUtils::tagName($node) === 'CODE' && !$isCodeBlock;
                },
                'replacement' => static function (string $content): string {
                    if ($content === '') {
                        return '';
                    }
                    $content = preg_replace('/\r?\n|\r/', ' ', $content) ?? $content;
                    $extraSpace = str_starts_with($content, '`')
                        || str_ends_with($content, '`')
                        || preg_match('/\A .*?[^ ].* \z/s', $content) === 1
                        ? ' '
                        : '';
                    preg_match_all('/`+/', $content, $matches);
                    $delimiter = '`';
                    while (in_array($delimiter, $matches[0], true)) {
                        $delimiter .= '`';
                    }

                    return $delimiter . $extraSpace . $content . $extraSpace . $delimiter;
                },
            ],
            'image' => [
                'filter' => 'img',
                'replacement' => static function (string $content, DOMElement $node): string {
                    $alt = Utils::escapeMarkdown(Utils::cleanAttribute($node->getAttribute('alt')));
                    $src = Utils::escapeLinkDestination($node->getAttribute('src'));
                    $title = Utils::cleanAttribute($node->getAttribute('title'));
                    $titlePart = $title !== '' ? ' "' . Utils::escapeLinkTitle($title) . '"' : '';

                    return $src !== '' ? '![' . $alt . '](' . $src . $titlePart . ')' : '';
                },
            ],
        ];
    }
}
