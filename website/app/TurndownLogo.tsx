type TurndownLogoProps = {
  className?: string;
  size?: number;
  title?: string;
};

export function TurndownLogo({
  className,
  size = 40,
  title,
}: TurndownLogoProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <g fill="currentColor">
        <rect x="16" y="16" width="32" height="32" rx="9" />
        <rect x="61" y="18" width="18" height="18" rx="5" opacity=".48" />
        <rect x="18" y="61" width="18" height="18" rx="5" opacity=".48" />
        <rect x="50" y="50" width="34" height="34" rx="10" />
      </g>
    </svg>
  );
}
