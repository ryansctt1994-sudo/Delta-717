# Delta-Weaver v2.2

A design for a deterministic, event-sourced cognitive architecture with governed LLM reasoning, strict control-plane authority separation, and sandboxed self-expanding tool creation.

> **Status:** research prototype. This repository holds an interactive setup guide and the small Python project the guide teaches. Most of the architecture described below is **design intent and is not implemented here**. The next section lists what is here and what checks it.

---

## 📂 What this repository contains

| Path | What it is | Checked by |
|---|---|---|
| `App.tsx`, `index.tsx`, `components/`, `constants.ts` | An interactive setup guide (React + Vite) for the Delta-717 Governance Core | CI: `tsc --noEmit` and `vite build` |
| The project embedded in `constants.ts` | The Python project the guide tells readers to build: `core/sentinel.py` (uncertainty veto), `core/sim_engine.py` (normalized-entropy signal monitor), `core/ledger.py` (hash-chained JSON audit log), `main.py`, and a demo notebook | CI: `tests/guide` extracts it file for file and runs it |
| `notes/` | Design text and chat transcripts pasted from earlier sessions | Nothing. These are notes, not code that runs here |
| `claims.json` | Waivers for the claim audit, each with a reason | CI: `claim-audit` |

What `tests/guide` establishes, and nothing more:

- `python main.py` runs from a fresh checkout, approves the low-entropy scenario and vetoes the high-entropy one.
- The ledger reloads and extends across runs and detects basic un-repaired edits, deletions, reorderings or insertions. Snapshot replacement is staged and atomic; a failed replacement leaves the earlier file and in-memory chain intact. Malformed chain structures are refused.
- **Integrity limit:** this is a locally self-hashed file, not an authenticated or immutable WORM ledger. A writer can rebuild hashes, truncate history or overwrite the file. Atomic replacement does not add inter-process concurrency control, power-loss guarantees, signed checkpoints or a trusted external witness.
- The Sentinel and the signal monitor keep their stated contracts.

```bash
pip install "numpy>=1.24.0" "scipy>=1.10.0" pytest
python -m pytest -q tests/guide     # needs Node 22+ to read constants.ts
npm ci && npm run build
```

---

## 🧱 Core Architecture (design intent, not implemented here)

### L0 — Hardware Safety Layer
Physical or logical constraints (latches, guards, invariants).

### L1 — Execution Layer
Blind runtime sandbox. No decision-making authority.

### L2 — Event System
Append-only deterministic event DAG (source of truth).

### L3 — Control Plane
Single authority for execution decisions. Invariants I1–I27 would be enforced here; they are not written down in this repository.

### L4 — Agent Layer
Specialized evaluators and adversarial stress-testers.

### L5 — LLM Cognitive Kernel
Post-fact reasoning system:
- interpretation
- planning (non-binding)
- reflection
- tool proposal

### L6 — Observability Layer
Dashboards, traces, and system introspection.

---

## 🔐 Key Invariants (design)

- **I27**: Execution ≡ Replay (system determinism)
- **L1**: LLM cannot execute or mutate system state
- **M1–M3**: bounded self-modification rules
- **D1**: Distributed event convergence via deterministic replay

---

## 🧠 LLM Role (Important)

The LLM is:

✔ observer  
✔ planner  
✔ reflector  
✔ tool proposer  

The LLM is NOT:

❌ execution authority  
❌ control plane  
❌ event writer  
❌ system modifier  

---

## ⚙️ Bounded Self-Expansion (design)

The design allows:

- sandboxed tool proposals
- Z3 checks of proposed tools (planned; there is no Z3 code in this repository)
- control-plane approval gating
- event-sourced tool installation

The aim is evolution without authority drift.

---

## 🌐 Distributed Model (design)

Delta-Weaver uses a deterministic event DAG:

- no consensus protocol
- no leader election
- replay-based convergence

State is defined as:

> State(t) = fold(event_log[0:t])

---

## 📦 Reproducibility

In this repository:

- `package-lock.json` pins the app's npm dependencies, and CI installs them with `npm ci`.
- The guide's ledger is a hash chain, exercised by `tests/guide`.

Planned for the full system, not present here: a Docker build, a deterministic Makefile, pinned Python dependencies (the guide's `requirements.txt` uses minimum versions), and provenance tracking.

---

## 📜 Provenance (planned)

- a system hash chain
- a Zenodo DOI (when published)
- an arXiv submission (planned)

Commit signing is not enforced or checked.

---

## ⚠️ Known issue

`notes/zorel-symbiont-transcript.txt` contains a pasted script that sets a hardcoded HMAC secret for `GATE_HMAC_SECRET`. Nothing in this repository runs it, but the value is public in that file and in git history, so it must never be used as a real key. Weaver--Cathedral-'s `core/authority/gate.py` is the rebuilt gate: the caller supplies the key, and short keys are refused.

---

## 🚀 Status

Research prototype (v2.2)

Not production software.

---

## 👤 Author

Ryan Scott  
Independent Systems Research

---

## 📌 Purpose

To explore whether adaptive intelligence systems can remain:

- deterministic
- auditable
- governed
- self-expanding under strict constraints
