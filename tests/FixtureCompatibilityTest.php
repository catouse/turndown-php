<?php

declare(strict_types=1);

namespace Catouse\Turndown\Tests;

use Catouse\Turndown\Plugin\Gfm;
use Catouse\Turndown\Tests\Support\FixtureLoader;
use Catouse\Turndown\TurndownService;
use DOMElement;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class FixtureCompatibilityTest extends TestCase
{
    private const CORE_FIXTURE = __DIR__ . '/Fixtures/turndown-7.2.4.html';
    private const GFM_FIXTURE = __DIR__ . '/Fixtures/turndown-plugin-gfm-1.0.2.html';

    public function testPinnedFixtureCounts(): void
    {
        self::assertCount(147, FixtureLoader::cases(self::CORE_FIXTURE));
        self::assertCount(18, FixtureLoader::cases(self::GFM_FIXTURE));
    }

    /**
     * @param array<string, mixed> $options
     */
    #[DataProvider('coreCases')]
    public function testCoreFixture(
        string $name,
        array $options,
        DOMElement $dom,
        string $html,
        string $expected,
    ): void {
        $service = new TurndownService($options);

        self::assertSame($expected, $service->turndown($dom), $name . ' (DOM)');
        self::assertSame($expected, $service->turndown($html), $name . ' (string)');
    }

    /**
     * @param array<string, mixed> $options
     */
    #[DataProvider('gfmCases')]
    public function testGfmFixture(
        string $name,
        array $options,
        DOMElement $dom,
        string $html,
        string $expected,
    ): void {
        $service = new TurndownService($options);
        $service->use(new Gfm());

        self::assertSame($expected, $service->turndown($dom), $name . ' (DOM)');
        self::assertSame($expected, $service->turndown($html), $name . ' (string)');
    }

    /**
     * @return iterable<string, array{string, array<string, mixed>, DOMElement, string, string}>
     */
    public static function coreCases(): iterable
    {
        yield from self::provideCases(self::CORE_FIXTURE);
    }

    /**
     * @return iterable<string, array{string, array<string, mixed>, DOMElement, string, string}>
     */
    public static function gfmCases(): iterable
    {
        yield from self::provideCases(self::GFM_FIXTURE);
    }

    /**
     * @return iterable<string, array{string, array<string, mixed>, DOMElement, string, string}>
     */
    private static function provideCases(string $path): iterable
    {
        foreach (FixtureLoader::cases($path) as $index => $case) {
            $key = sprintf('%03d %s', $index + 1, $case['name']);
            yield $key => [$case['name'], $case['options'], $case['dom'], $case['html'], $case['expected']];
        }
    }
}
