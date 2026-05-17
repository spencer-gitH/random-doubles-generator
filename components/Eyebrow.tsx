export default function Eyebrow({
  children,
  rule = true,
  hot = false,
}: {
  children: React.ReactNode;
  rule?: boolean;
  hot?: boolean;
}) {
  return (
    <div className={`eyebrow ${hot ? "eyebrow--hot" : ""}`}>
      {rule && <span className="eyebrow__rule" />}
      <span className="eyebrow__text">{children}</span>
      {rule && <span className="eyebrow__rule" />}
    </div>
  );
}
