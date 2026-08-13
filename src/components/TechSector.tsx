export function TechSector({ analysis }: { analysis: string }) {
  const paragraphs = analysis.split("\n\n");

  return (
    <div className="glass rounded-2xl p-6 h-full">
      <h2 className="font-display text-2xl text-white mb-1">Tech Sector Deep Dive</h2>
      <p className="text-slate-400 text-sm mb-6">
        Sector-specific analysis for technology names in today&apos;s screener.
      </p>
      <div className="prose-tvm text-sm space-y-4">
        {paragraphs.map((p, i) => {
          if (p.startsWith("**") && p.includes(":**")) {
            const [title, ...rest] = p.split(":**");
            return (
              <div key={i}>
                <h3 className="text-white font-medium">{title.replace(/\*\*/g, "")}</h3>
                <p className="text-slate-300 mt-1">{rest.join(":**")}</p>
              </div>
            );
          }
          return (
            <p key={i} className="text-slate-300 whitespace-pre-line">
              {p.replace(/\*\*/g, "")}
            </p>
          );
        })}
      </div>
    </div>
  );
}
