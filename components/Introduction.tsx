
import React from 'react';

const Card: React.FC<{ title: string; description: string }> = ({ title, description }) => (
    <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700 h-full">
        <h3 className="text-lg font-bold text-cyan-400">{title}</h3>
        <p className="mt-2 text-slate-400 text-sm">{description}</p>
    </div>
);

const Introduction: React.FC = () => {
  return (
    <section>
      <h2 className="text-2xl font-bold text-white mb-2">Delta-717 Governance Research Demonstration</h2>
      <p className="text-slate-400 max-w-4xl">
        This interactive guide demonstrates a normalized entropy threshold, an explicit veto result, and a locally hash-linked audit file. It is a research prototype, not a deployed or independently enforced safety system.
      </p>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
            title="Sentinel"
            description="A demonstration threshold evaluator returning APPROVED or VETO; it does not independently block external execution."
        />
        <Card 
            title="Signal Integrity Monitor"
            description="Calculates normalized Shannon entropy of supplied probabilities, a dispersion proxy rather than calibrated epistemic uncertainty or reliability."
        />
        <Card 
            title="Forensic Ledger"
            description="Local hash-linked JSON snapshots with staged replacement, without external authentication or protection against whole-chain rewrites."
        />
      </div>
    </section>
  );
};

export default Introduction;
