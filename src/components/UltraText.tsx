export function UltraShinePhrase({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  return (
    <span className={`ultra-name-shine ${className}`.trim()}>{children}</span>
  );
}
