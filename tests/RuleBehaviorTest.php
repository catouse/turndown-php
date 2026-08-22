<?php

declare(strict_types=1);

namespace Catouse\Turndown\Tests;

use Catouse\Turndown\TurndownService;
use DOMElement;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;
use TypeError;

final class RuleBehaviorTest extends TestCase
{
    public function testLaterAddedRuleWins(): void
    {
        $service = new TurndownService();
        $service->addRule('first', [
            'filter' => 'p',
            'replacement' => static fn(): string => 'first',
        ]);
        $service->addRule('second', [
            'filter' => 'p',
            'replacement' => static fn(): string => 'second',
        ]);

        self::assertSame('second', $service->turndown('<p>content</p>'));
    }

    public function testBlankRuleOverridesAddedRule(): void
    {
        $service = new TurndownService();
        $service->addRule('blank-paragraph', [
            'filter' => 'p',
            'replacement' => static fn(): string => 'custom',
        ]);

        self::assertSame('', $service->turndown('<p> </p>'));
    }

    public function testCoreRulesOverrideKeepAndRemove(): void
    {
        $service = new TurndownService();
        $service->keep('p')->remove('p');

        self::assertSame('content', $service->turndown('<p>content</p>'));
    }

    public function testKeepOverridesRemoveForUnknownElement(): void
    {
        $service = new TurndownService();
        $service->remove('ins')->keep('ins');

        self::assertSame('<ins>content</ins>', $service->turndown('<ins>content</ins>'));
    }

    public function testRuleCallbacksReceiveNodeAndMergedOptions(): void
    {
        $service = new TurndownService(['customOption' => 'value']);
        $service->addRule('data', [
            'filter' => static fn(DOMElement $node, array $options): bool =>
                strtolower($node->nodeName) === 'span' && $options['customOption'] === 'value',
            'replacement' => static fn(string $content, DOMElement $node, array $options): string =>
                $node->getAttribute('data-prefix') . $content . ($options['customOption'] === 'value' ? '**' : ''),
        ]);

        self::assertSame('>content**', $service->turndown('<span data-prefix=">">content</span>'));
    }

    public function testCallableArrayCanBeUsedAsFilter(): void
    {
        $filter = new class {
            public function matches(DOMElement $node): bool
            {
                return strtolower($node->nodeName) === 'mark';
            }
        };
        $service = new TurndownService();
        $service->addRule('callable-array', [
            'filter' => [$filter, 'matches'],
            'replacement' => static fn(string $content): string => '==' . $content . '==',
        ]);

        self::assertSame('==content==', $service->turndown('<mark>content</mark>'));
    }

    public function testRuleAppendRunsAfterBodyOnEveryConversion(): void
    {
        $service = new TurndownService();
        $service->addRule('footnote', [
            'filter' => 'u',
            'replacement' => static fn(string $content): string => '[^' . $content . ']',
            'append' => static fn(): string => "\n\n[^note]: appended\n\n",
        ]);

        $expected = "[^note]\n\n[^note]: appended";
        self::assertSame($expected, $service->turndown('<u>note</u>'));
        self::assertSame($expected, $service->turndown('<u>note</u>'));
    }

    public function testPublicCallbacksReceiveOnlyDocumentedArguments(): void
    {
        $replacementArgumentCount = null;
        $appendArgumentCount = null;
        $service = new TurndownService();
        $service->addRule('argument-count', [
            'filter' => 'u',
            'replacement' => static function () use (&$replacementArgumentCount): string {
                $replacementArgumentCount = func_num_args();

                return 'body';
            },
            'append' => static function () use (&$appendArgumentCount): string {
                $appendArgumentCount = func_num_args();

                return '';
            },
        ]);

        self::assertSame('body', $service->turndown('<u>content</u>'));
        self::assertSame(3, $replacementArgumentCount);
        self::assertSame(1, $appendArgumentCount);
    }

    public function testInvalidFilterFailsWhenEvaluated(): void
    {
        $service = new TurndownService();
        $service->addRule('invalid', [
            'filter' => 42,
            'replacement' => static fn(): string => '',
        ]);

        $this->expectException(TypeError::class);
        $service->turndown('<x-invalid>content</x-invalid>');
    }

    public function testInvalidPluginFailsImmediately(): void
    {
        $this->expectException(TypeError::class);
        (new ReflectionMethod(TurndownService::class, 'use'))
            ->invoke(new TurndownService(), 'not-a-plugin');
    }
}
