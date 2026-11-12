
export interface FileNode {
  name: string;
  type: 'folder' | 'file';
  children?: FileNode[];
}

export const FILE_STRUCTURE: FileNode = {
  name: 'delta717-governance-core/',
  type: 'folder',
  children: [
    { name: '.gitignore', type: 'file' },
    { name: 'LICENSE', type: 'file' },
    { name: 'README.md', type: 'file' },
    { name: 'requirements.txt', type: 'file' },
    { name: 'main.py', type: 'file' },
    {
      name: 'core/',
      type: 'folder',
      children: [
        { name: '__init__.py', type: 'file' },
        { name: 'ledger.py', type: 'file' },
        { name: 'sentinel.py', type: 'file' },
        { name: 'sim_engine.py', type: 'file' },
      ],
    },
    {
      name: 'docs/',
      type: 'folder',
      children: [
        { name: 'whitepaper.md', type: 'file' }
      ]
    },
    {
      name: 'simulations/',
      type: 'folder',
      children: [
        { name: 'oncology_demo.ipynb', type: 'file' },
      ],
    },
  ],
};

export const FILE_CONTENTS: Record<string, string> = {
  '.gitignore': `# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Jupyter
.ipynb_checkpoints
*.ipynb_checkpoints/

# Delta-717 Runtime
governance_ledger.json
audit_log.json

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db`,
  'LICENSE': `MIT License

Copyright (c) 2024

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`,
  'README.md': `# Delta-717 Governance Core — Research Demonstration

This setup guide contains a small Python **research prototype**, not a production safety or execution-control engine.

## Implemented components
- **Sentinel**: Returns APPROVED or VETO based on a normalized entropy threshold. It does not stop external execution by itself.
- **SignalIntegrityMonitor**: Computes normalized Shannon entropy of a supplied probability vector. This is a distributional-dispersion proxy, not a validated estimate of epistemic uncertainty, prediction calibration, or model reliability.
- **ForensicLedger**: Stores local hash-linked JSON snapshots with staged replacement. Records are unauthenticated: whole-history rewrites, truncation, and unlinked final-record edits remain possible.
- **run_simulation**: Records each supported demo verdict before reporting it. A caller can bypass this demonstration loop.

No external execution authority, independent authentication, distributed coordination, or clinical decision support is implemented.
`,
  'requirements.txt': `numpy>=1.24.0
scipy>=1.10.0
jupyter`,
  'main.py': `import json
import numpy as np
from core import Sentinel, SignalIntegrityMonitor, ForensicLedger


def _json_safe_input(raw):
    """Preserve a reviewable input without writing nonstandard NaN JSON."""
    try:
        values = raw.tolist() if hasattr(raw, 'tolist') else raw
        json.dumps(values, allow_nan=False)
        return values
    except Exception as exc:
        # Avoid repr(raw): arbitrary user objects can also fail there.
        return {
            'original_not_json_safe': True,
            'input_type': type(raw).__name__,
            'serialization_error_type': type(exc).__name__,
        }


def run_simulation(scenarios=None, ledger_file='audit_log.json'):
    """Run demo cases. Never report approval before a ledger receipt exists."""
    print("----------------------------------------------------------------")
    print("   Delta-717 Governance Core | Bounded Safety Demonstration")
    print("----------------------------------------------------------------")

    print("[INIT] Initializing Sentinel (Circuit Breaker)...")
    sentinel = Sentinel(uncertainty_threshold=0.7)
    print("[INIT] Initializing Signal Integrity Monitor...")
    sim = SignalIntegrityMonitor()
    print("[INIT] Initializing local hash-chained audit log...")
    ledger = ForensicLedger(ledger_file=ledger_file)

    if scenarios is None:
        scenarios = [
            {
                'name': 'Scenario A: Routine Operation',
                'input_probs': np.array([0.90, 0.05, 0.02, 0.02, 0.01]),
                'description': 'Model is confident (Low Entropy).'
            },
            {
                'name': 'Scenario B: Edge Case / Out-of-Distribution',
                'input_probs': np.array([0.25, 0.25, 0.20, 0.15, 0.15]),
                'description': 'Model is confused/uncertain (High Entropy).'
            }
        ]

    for scenario in scenarios:
        # Only plain dictionaries are accepted as scenario definitions.
        invalid_scenario = type(scenario) is not dict
        if invalid_scenario:
            name = 'Invalid scenario'
            raw_input = scenario
            description = 'Expected a scenario dictionary.'
        else:
            name = scenario.get('name', 'Unnamed scenario')
            raw_input = scenario.get('input_probs')
            description = scenario.get('description', '')
            if type(name) is not str:
                name = 'Unnamed scenario'
            if type(description) is not str:
                description = ''
        print(f"Processing {name}...")
        print(f"   Context: {description}")

        if invalid_scenario:
            analysis = {
                'epistemic_uncertainty': None,
                'validation_error_type': 'InvalidScenarioType'
            }
        else:
            try:
                analysis = sim.analyze_signal(raw_input)
            except (ValueError, TypeError, OverflowError, RuntimeError) as exc:
                analysis = {
                    'epistemic_uncertainty': None,
                    'validation_error_type': type(exc).__name__
                }

        safe_input = _json_safe_input(raw_input)
        if isinstance(safe_input, dict) and safe_input.get('original_not_json_safe'):
            # An unrecordable original vector may not receive approval.
            analysis = {
                'epistemic_uncertainty': None,
                'validation_error_type': 'InputSerializationError'
            }

        decision = sentinel.evaluate(analysis)
        if 'validation_error_type' in analysis:
            decision = {
                'status': 'VETO',
                'reason': 'Invalid monitor input: ' + analysis['validation_error_type']
            }

        # Commit before exposing a decision. A failed write propagates and
        # cannot accidentally print an APPROVED or VETO disposition.
        block = ledger.record_event({
            'scenario': name,
            'input_vector': safe_input,
            'sim_analysis': analysis,
            'sentinel_decision': decision
        })

        entropy_val = analysis.get('epistemic_uncertainty')
        if entropy_val is None:
            print("   [SIM] Entropy unavailable: invalid input")
        else:
            print(f"   [SIM] Computed H_epsilon: {entropy_val:.4f}")
        if decision['status'] == 'APPROVED':
            print("   [SENTINEL] Action APPROVED (demonstration only).")
        else:
            print("   [SENTINEL] VETO: action not approved.")
        print(f"   [LEDGER] Local hash-chain event saved at block #{block['index']}")
        print("-" * 60)


if __name__ == "__main__":
    run_simulation()
`,
  'core/__init__.py': `from .sentinel import Sentinel
from .sim_engine import SignalIntegrityMonitor
from .ledger import ForensicLedger

__version__ = "1.0.0-alpha"
__all__ = ["Sentinel", "SignalIntegrityMonitor", "ForensicLedger"]`,
  'core/ledger.py': `import json
import hashlib
import datetime
import os
import tempfile
from pathlib import Path

class ForensicLedger:
    """
    Local hash-chained audit log; not externally authenticated or tamper-proof.
    """
    def __init__(self, ledger_file='governance_ledger.json'):
        self.ledger_file = ledger_file
        # Must exist before _load_chain(): building the genesis block reads len(self.chain).
        self._chain = []
        self._chain = self._load_chain()

    @property
    def chain(self):
        """Detached snapshot of local history; not authenticated custody."""
        return json.loads(json.dumps(self._chain, allow_nan=False))

    def _load_chain(self):
        try:
            with open(self.ledger_file, 'r') as f:
                chain = json.load(f)
        except FileNotFoundError:
            # First run: create the genesis block
            genesis_block = self._create_block(proof=1, previous_hash='0', data={'message': 'Genesis Block'})
            self._save_chain([genesis_block])
            return [genesis_block]
        # An existing ledger that is unreadable or fails verification is an error,
        # never a reason to silently start a new chain over the old one.
        if not self.verify_chain(chain):
            raise ValueError(f"Ledger {self.ledger_file} failed hash-chain verification")
        return chain

    def _save_chain(self, chain):
        # Write a complete snapshot beside the ledger, then replace it atomically.
        # This avoids truncating the previous snapshot if serialization or a
        # write fails. It does NOT provide multi-process locking or an
        # independently authenticated checkpoint.
        ledger_path = Path(self.ledger_file)
        fd, staging = tempfile.mkstemp(
            prefix='.' + ledger_path.name + '.', suffix='.tmp',
            dir=str(ledger_path.parent)
        )
        try:
            with os.fdopen(fd, 'w', encoding='utf-8') as f:
                json.dump(chain, f, indent=4)
                f.flush()
                os.fsync(f.fileno())
            os.replace(staging, ledger_path)
        finally:
            if os.path.exists(staging):
                os.unlink(staging)

    def _hash(self, block):
        """Hashes a block."""
        encoded_block = json.dumps(block, sort_keys=True).encode()
        return hashlib.sha256(encoded_block).hexdigest()

    def _create_block(self, proof, previous_hash, data):
        block = {
            'index': len(self._chain) + 1,
            'timestamp': str(datetime.datetime.now()),
            'proof': proof,
            'previous_hash': previous_hash,
            'data': data
        }
        return block

    def get_previous_block(self):
        return json.loads(json.dumps(self._chain[-1], allow_nan=False))

    def verify_chain(self, chain=None):
        """
        Returns True if every block links to the hash of the block before it.
        Editing, deleting, inserting or reordering any block breaks a link.
        """
        chain = self._chain if chain is None else chain
        if not isinstance(chain, list) or not chain:
            return False
        for i, block in enumerate(chain):
            if not isinstance(block, dict):
                return False
            if type(block.get('index')) is not int or block['index'] != i + 1:
                return False
            if not all(key in block for key in ('data', 'proof', 'timestamp')):
                return False
            previous_hash = block.get('previous_hash')
            if not isinstance(previous_hash, str):
                return False
            if i == 0:
                if previous_hash != '0':
                    return False
            elif previous_hash != self._hash(chain[i - 1]):
                return False
        return True

    def record_event(self, event_data, proof=12345):
        """
        Records a new event to the ledger.
        """
        # Freeze caller-owned payload values before committing: changing the
        # original input dictionary later must not rewrite live chain memory.
        # Reject non-JSON and nonfinite numeric payloads rather than silently
        # admitting values that cannot round-trip as JSON.
        frozen_data = json.loads(json.dumps(event_data, allow_nan=False))
        # Strictly validate all caller-supplied block fields, including proof.
        frozen_proof = json.loads(json.dumps(proof, allow_nan=False))
        previous_block = self.get_previous_block()
        previous_hash = self._hash(previous_block)
        block = self._create_block(frozen_proof, previous_hash, frozen_data)
        next_chain = self._chain + [block]
        self._save_chain(next_chain)
        self._chain = next_chain
        # Never expose the authoritative in-memory block through the return value.
        return json.loads(json.dumps(block, allow_nan=False))
`,
  'core/sentinel.py': `import math
import numpy as np

class Sentinel:
    """
    Active circuit breaker for AI systems.
    Halts operations if uncertainty exceeds a predefined threshold.
    """
    def __init__(self, uncertainty_threshold=0.7):
        """
        Initializes the Sentinel with a specific uncertainty threshold.

        Args:
            uncertainty_threshold (float): The entropy value above which the
                                            circuit breaker will trip (veto).
        """
        if not 0 < uncertainty_threshold < 1:
            raise ValueError("Uncertainty threshold must be between 0 and 1.")
        self.threshold = uncertainty_threshold
        print(f"Sentinel initialized with threshold H_epsilon < {self.threshold}")

    def evaluate(self, monitor_output):
        """
        Evaluates the system's state based on the Signal Integrity Monitor.

        Args:
            monitor_output (dict): A dictionary containing the calculated
                                    'epistemic_uncertainty' (H_epsilon).

        Returns:
            dict: A decision dictionary with 'status' and 'reason'.
        """
        if not isinstance(monitor_output, dict):
            return {'status': 'VETO', 'reason': 'Monitor output must be a dictionary.'}

        uncertainty = monitor_output.get('epistemic_uncertainty')
        if uncertainty is None:
            return {'status': 'VETO', 'reason': 'Missing epistemic_uncertainty value.'}
        if (isinstance(uncertainty, (bool, np.bool_))
                or not isinstance(uncertainty, (int, float, np.integer, np.floating))):
            return {'status': 'VETO', 'reason': 'Invalid epistemic_uncertainty value.'}
        try:
            numeric_uncertainty = float(uncertainty)
        except (TypeError, ValueError, OverflowError):
            return {'status': 'VETO', 'reason': 'Invalid epistemic_uncertainty value.'}
        if not math.isfinite(numeric_uncertainty) or not 0.0 <= numeric_uncertainty <= 1.0:
            return {'status': 'VETO', 'reason': 'Invalid epistemic_uncertainty value.'}

        if numeric_uncertainty >= self.threshold:
            decision = {
                'status': 'VETO',
                'reason': f'High epistemic uncertainty. H_epsilon ({numeric_uncertainty:.4f}) >= Threshold ({self.threshold})'
            }
        else:
            decision = {
                'status': 'APPROVED',
                'reason': f'Low epistemic uncertainty. H_epsilon ({numeric_uncertainty:.4f}) < Threshold ({self.threshold})'
            }
        return decision
`,
  'core/sim_engine.py': `import numpy as np
from scipy.stats import entropy

class SignalIntegrityMonitor:
    """
    Epistemic uncertainty quantification using Shannon entropy (H_epsilon).
    """
    def __init__(self):
        print("Signal Integrity Monitor initialized.")

    def analyze_signal(self, probability_distribution):
        """
        Calculates the Shannon entropy for a given probability distribution.

        Args:
            probability_distribution (np.array): A NumPy array representing the
                                                 model's output probabilities.
                                                 Must sum to 1.

        Returns:
            dict: A dictionary containing the calculated epistemic uncertainty.
        """
        try:
            probabilities = np.asarray(probability_distribution, dtype=float)
        except (TypeError, ValueError, OverflowError) as exc:
            raise ValueError("Probabilities must be a numeric vector.") from exc

        if (probabilities.ndim != 1 or probabilities.size == 0
                or not np.all(np.isfinite(probabilities))
                or np.any(probabilities < 0) or np.any(probabilities > 1)):
            raise ValueError("Probabilities must be a nonempty finite vector in [0, 1].")
        if not np.isclose(np.sum(probabilities), 1.0, rtol=0, atol=1e-9):
            raise ValueError("Probabilities must sum to 1.")

        # Normalize entropy to be between 0 and 1 for easier interpretation.
        # H_max = log_2(N), where N is the number of outcomes.
        num_outcomes = len(probabilities)
        if num_outcomes <= 1:
            # Entropy is 0 if there's only one outcome
            normalized_entropy = 0.0
        else:
            shannon_entropy = entropy(probabilities, base=2)
            max_entropy = np.log2(num_outcomes)
            normalized_entropy = shannon_entropy / max_entropy

        if not np.isfinite(normalized_entropy) or not -1e-12 <= normalized_entropy <= 1 + 1e-12:
            raise ValueError("Computed uncertainty must be finite and normalized.")
        return {'epistemic_uncertainty': float(np.clip(normalized_entropy, 0.0, 1.0))}
`,
    'docs/whitepaper.md': `# Delta-717 Governance Core — Bounded Research Demonstration

## Scope
Delta-717 illustrates a local, falsifiable software *demo* consisting of a probability-vector entropy calculator, a threshold-based decision function, and a locally hash-linked JSON log. The broader seven-layer design is not implemented in this project.

## Normalized entropy is not epistemic uncertainty
The Signal Integrity Monitor computes Shannon entropy from a supplied probability vector, normalized by the maximum entropy for that vector length. High entropy indicates a more diffuse distribution. It does **not** by itself quantify epistemic uncertainty, calibration, correctness, risk, or reliability.

## Sentinel decision contract
Sentinel returns APPROVED or VETO as a demonstration-level decision. It vetoes invalid values and entropy at or above its threshold. The result is not bound to a production executor; a caller can bypass the demo loop.

## ForensicLedger integrity boundary
ForensicLedger stores local JSON snapshots with SHA-256 links and staged file replacement. A caller cannot mutate its private in-memory history through the public chain snapshot, but this is not authenticated, tamper-proof, WORM, or independently witnessed custody. A writer controlling the file can rewrite the whole chain; an unlinked final-record edit can evade internal verification. Atomic replacement does not give cross-process locking or power-loss durability guarantees.

## Evidence
The extracted-guide Python regression suite, app typecheck/build, and claim audit are CI-checked on exact commits. They establish the tested behavior only, not independent reproduction or authorization to execute consequential actions. The medical-themed notebook uses synthetic examples and is not clinical decision support.
`,
    'simulations/oncology_demo.ipynb': `{
 "cells": [
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "# Delta-717 Oncology Demo\\n",
    "## Simulating an AI Co-Pilot for Cancer Treatment Planning"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": [
    "import sys\\n",
    "sys.path.append('../')\\n",
    "import numpy as np\\n",
    "from core import Sentinel, SignalIntegrityMonitor, ForensicLedger"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "### Step 1: Initialize the Governance Core Components"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": [
    "# Initialize the circuit breaker with a threshold.\\n",
    "# A synthetic vector with normalized entropy >= 0.7 receives a demo VETO.\\n",
    "sentinel = Sentinel(uncertainty_threshold=0.7)\\n",
    "\\n",
    "# Initialize the uncertainty monitor.\\n",
    "sim = SignalIntegrityMonitor()\\n",
    "\\n",
    "# Initialize the local unauthenticated ledger.\\n",
    "ledger = ForensicLedger(ledger_file='audit_log.json')"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "### Step 2: Simulate AI Model Outputs for Two Patients"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": [
    "# Patient 001: The AI is highly confident in its recommendation.\\n",
    "# It assigns a high probability to one treatment plan.\\n",
    "patient_001_signal = np.array([0.95, 0.02, 0.01, 0.01, 0.01])\\n",
    "\\n",
    "# Patient 002: The AI is highly uncertain.\\n",
    "# Probabilities are spread out, indicating low confidence.\\n",
    "patient_002_signal = np.array([0.2, 0.2, 0.2, 0.2, 0.2])"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "### Step 3: Process Patient 001 through the Governance System"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": [
    "# 1. Quantify uncertainty\\n",
    "monitor_output_001 = sim.analyze_signal(patient_001_signal)\\n",
    "\\n",
    "# 2. Sentinel evaluates the signal\\n",
    "decision_001 = sentinel.evaluate(monitor_output_001)\\n",
    "\\n",
    "# 3. Record the entire event in the forensic ledger\\n",
    "ledger.record_event({\\n",
    "    'patient_id': '001',\\n",
    "    'signal': patient_001_signal.tolist(),\\n",
    "    'monitor_output': monitor_output_001,\\n",
    "    'sentinel_decision': decision_001\\n",
    "})\\n",
    "\\n",
    "print(f\\"✅ {decision_001['status']} for Patient 001 ({decision_001['reason']})\\")"
   ]
  },
    {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "### Step 4: Process Patient 002 through the Governance System"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": [
    "# 1. Quantify uncertainty\\n",
    "monitor_output_002 = sim.analyze_signal(patient_002_signal)\\n",
    "\\n",
    "# 2. Sentinel evaluates the signal\\n",
    "decision_002 = sentinel.evaluate(monitor_output_002)\\n",
    "\\n",
    "# 3. Record the entire event in the forensic ledger\\n",
    "ledger.record_event({\\n",
    "    'patient_id': '002',\\n",
    "    'signal': patient_002_signal.tolist(),\\n",
    "    'monitor_output': monitor_output_002,\\n",
    "    'sentinel_decision': decision_002\\n",
    "})\\n",
    "\\n",
    "print(f\\"⛔ {decision_002['status']} for Patient 002 ({decision_002['reason']})\\")"
   ]
  }
 ],
 "metadata": {
  "kernelspec": {
   "display_name": "Python 3",
   "language": "python",
   "name": "python3"
  },
  "language_info": {
   "name": "python"
  }
 },
 "nbformat": 4,
 "nbformat_minor": 2
}`
};
