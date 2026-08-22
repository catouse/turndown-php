<?php

declare(strict_types=1);

namespace Catouse\Turndown\Internal;

use InvalidArgumentException;
use TypeError;

/** @internal */
final class Utils
{
    /**
     * ECMAScript WhiteSpace and LineTerminator code points.
     *
     * Keep this explicit: PHP's trim() and PCRE's \s do not have exactly the
     * same semantics as JavaScript's String.prototype.trim()/RegExp \s.
     */
    public const ECMA_WHITESPACE = '\\x{0009}-\\x{000D}\\x{0020}\\x{00A0}\\x{1680}\\x{2000}-\\x{200A}\\x{2028}\\x{2029}\\x{202F}\\x{205F}\\x{3000}\\x{FEFF}';

    public static function trimUnicode(string $value): string
    {
        return preg_replace(
            '/\A[' . self::ECMA_WHITESPACE . ']+|[' . self::ECMA_WHITESPACE . ']+\z/u',
            '',
            $value,
        ) ?? $value;
    }

    public static function isWhitespace(string $value): bool
    {
        return preg_match('/\A[' . self::ECMA_WHITESPACE . ']*\z/u', $value) === 1;
    }

    public static function trimLeadingNewlines(string $value): string
    {
        return preg_replace('/\A\n*/', '', $value) ?? $value;
    }

    public static function trimTrailingNewlines(string $value): string
    {
        $end = strlen($value);
        while ($end > 0 && $value[$end - 1] === "\n") {
            --$end;
        }

        return substr($value, 0, $end);
    }

    public static function trimNewlines(string $value): string
    {
        return self::trimTrailingNewlines(self::trimLeadingNewlines($value));
    }

    public static function join(string $output, string $replacement): string
    {
        $left = self::trimTrailingNewlines($output);
        $right = self::trimLeadingNewlines($replacement);
        $newlines = max(strlen($output) - strlen($left), strlen($replacement) - strlen($right));

        return $left . substr("\n\n", 0, $newlines) . $right;
    }

    public static function postProcess(string $value): string
    {
        $value = preg_replace('/\A[\t\r\n]+/', '', $value) ?? $value;

        return preg_replace('/[' . self::ECMA_WHITESPACE . ']+\z/u', '', $value) ?? $value;
    }

    public static function escapeMarkdown(string $value): string
    {
        $value = str_replace('\\', '\\\\', $value);
        $value = str_replace('*', '\\*', $value);
        $value = preg_replace('/\A-/', '\\-', $value) ?? $value;
        $value = preg_replace('/\A\+ /', '\\+ ', $value) ?? $value;
        $value = preg_replace('/\A(=+)/', '\\\\$1', $value) ?? $value;
        $value = preg_replace('/\A(#{1,6}) /', '\\\\$1 ', $value) ?? $value;
        $value = str_replace('`', '\\`', $value);
        $value = preg_replace('/\A~~~/', '\\~~~', $value) ?? $value;
        $value = str_replace('[', '\\[', $value);
        $value = str_replace(']', '\\]', $value);
        $value = preg_replace('/\A>/', '\\>', $value) ?? $value;
        $value = str_replace('_', '\\_', $value);

        return preg_replace('/\A(\d+)\. /', '$1\\. ', $value) ?? $value;
    }

    public static function cleanAttribute(?string $attribute): string
    {
        if ($attribute === null || $attribute === '') {
            return '';
        }

        return preg_replace(
            '/(?:\n+[' . self::ECMA_WHITESPACE . ']*)+/u',
            "\n",
            $attribute,
        ) ?? $attribute;
    }

    public static function escapeLinkDestination(string $destination): string
    {
        $escaped = strtr($destination, [
            '<' => '\\<',
            '>' => '\\>',
            '(' => '\\(',
            ')' => '\\)',
        ]);

        return str_contains($escaped, ' ') ? '<' . $escaped . '>' : $escaped;
    }

    public static function escapeLinkTitle(string $title): string
    {
        return str_replace('"', '\\"', $title);
    }

    /** @param array<mixed> $options */
    public static function stringOption(array $options, string $name): string
    {
        $value = $options[$name] ?? null;
        if (!is_string($value)) {
            throw new TypeError(sprintf('Option "%s" must be a string.', $name));
        }

        return $value;
    }

    /**
     * JavaScript String#length counts UTF-16 code units, not UTF-8 bytes or
     * Unicode scalar values. Turndown uses it for Setext underline length.
     */
    public static function utf16Length(string $value): int
    {
        $codePoints = preg_match_all('/./us', $value);
        $astralCodePoints = preg_match_all('/[\x{10000}-\x{10FFFF}]/u', $value);

        if ($codePoints === false || $astralCodePoints === false) {
            throw new InvalidArgumentException('Input must be valid UTF-8.');
        }

        return $codePoints + $astralCodePoints;
    }

    /** @return array{leading:string, leadingAscii:string, leadingNonAscii:string, trailing:string, trailingNonAscii:string, trailingAscii:string} */
    public static function edgeWhitespace(string $value): array
    {
        preg_match('/\A([' . self::ECMA_WHITESPACE . ']*)/u', $value, $leadingMatch);
        $leading = $leadingMatch[1] ?? '';

        // Turndown's single regexp assigns all whitespace to the leading side
        // when the entire string consists of whitespace.
        $trailing = self::isWhitespace($value) ? '' : self::trailingWhitespace($value);

        preg_match('/\A[ \t\r\n]*/', $leading, $leadingAsciiMatch);
        $leadingAscii = $leadingAsciiMatch[0] ?? '';
        $leadingNonAscii = substr($leading, strlen($leadingAscii));

        preg_match('/[ \t\r\n]*\z/', $trailing, $trailingAsciiMatch);
        $trailingAscii = $trailingAsciiMatch[0] ?? '';
        $trailingNonAscii = substr($trailing, 0, strlen($trailing) - strlen($trailingAscii));

        return [
            'leading' => $leading,
            'leadingAscii' => $leadingAscii,
            'leadingNonAscii' => $leadingNonAscii,
            'trailing' => $trailing,
            'trailingNonAscii' => $trailingNonAscii,
            'trailingAscii' => $trailingAscii,
        ];
    }

    public static function jsNumber(string $value): float
    {
        $trimmed = self::trimUnicode($value);
        if ($trimmed === '') {
            return 0.0;
        }

        if ($trimmed === 'Infinity' || $trimmed === '+Infinity') {
            return INF;
        }
        if ($trimmed === '-Infinity') {
            return -INF;
        }
        if (preg_match('/\A0[xX][0-9a-fA-F]+\z/', $trimmed) === 1) {
            return (float) hexdec(substr($trimmed, 2));
        }
        if (preg_match('/\A0[bB][01]+\z/', $trimmed) === 1) {
            return (float) bindec(substr($trimmed, 2));
        }
        if (preg_match('/\A0[oO][0-7]+\z/', $trimmed) === 1) {
            return (float) octdec(substr($trimmed, 2));
        }
        if (preg_match('/\A[+-]?(?:(?:\d+\.?\d*)|(?:\.\d+))(?:[eE][+-]?\d+)?\z/', $trimmed) === 1) {
            return (float) $trimmed;
        }

        return NAN;
    }

    public static function jsNumberToString(float $value): string
    {
        if (is_nan($value)) {
            return 'NaN';
        }
        if ($value === INF) {
            return 'Infinity';
        }
        if ($value === -INF) {
            return '-Infinity';
        }
        if ($value == 0.0) {
            return '0';
        }

        $previousPrecision = ini_get('serialize_precision');
        $restorePrecision = $previousPrecision !== false
            && $previousPrecision !== '-1'
            && ini_set('serialize_precision', '-1') !== false;

        try {
            $encoded = json_encode($value, JSON_THROW_ON_ERROR);
        } finally {
            if ($restorePrecision) {
                ini_set('serialize_precision', $previousPrecision);
            }
        }
        if (!str_contains($encoded, 'e') && !str_contains($encoded, 'E')) {
            return $encoded;
        }

        if (preg_match('/\A(-?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)\z/', $encoded, $match) !== 1) {
            return strtolower($encoded);
        }

        $sign = $match[1];
        $integer = $match[2];
        $fraction = $match[3];
        $digits = rtrim($integer . $fraction, '0');
        $decimalPosition = strlen($integer) + (int) $match[4];
        $digitCount = strlen($digits);

        if ($digitCount <= $decimalPosition && $decimalPosition <= 21) {
            return $sign . $digits . str_repeat('0', $decimalPosition - $digitCount);
        }
        if ($decimalPosition > 0 && $decimalPosition <= 21) {
            return $sign
                . substr($digits, 0, $decimalPosition)
                . '.'
                . substr($digits, $decimalPosition);
        }
        if ($decimalPosition > -6 && $decimalPosition <= 0) {
            return $sign . '0.' . str_repeat('0', -$decimalPosition) . $digits;
        }

        $coefficient = $digitCount === 1
            ? $digits
            : $digits[0] . '.' . substr($digits, 1);
        $exponent = $decimalPosition - 1;

        return $sign . $coefficient . 'e' . ($exponent >= 0 ? '+' : '') . $exponent;
    }

    private static function trailingWhitespace(string $value): string
    {
        preg_match('/([' . self::ECMA_WHITESPACE . ']*)\z/u', $value, $match);

        return $match[1] ?? '';
    }
}
