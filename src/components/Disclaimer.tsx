export function Disclaimer({ text }: { text: string }) {
  return (
    <footer className="border-t border-white/10 pt-8 pb-12">
      <div className="glass rounded-2xl p-6 border-amber-500/20">
        <h2 className="font-display text-lg text-amber-300 mb-3">Important Disclaimer</h2>
        <p className="text-sm text-slate-400 leading-relaxed">{text}</p>
        <p className="text-xs text-slate-600 mt-4">
          © {new Date().getFullYear()} TVM Investments · Research &amp; education only
        </p>
      </div>
    </footer>
  );
}
