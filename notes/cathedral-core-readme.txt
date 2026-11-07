# Cathedral Core

**Minimal verifiable safety envelope for agentic systems.**

The system records every action in an immutable, cryptographically verifiable Chronicle.  
Generation is separated from execution via a strict Action Authorization Boundary.  
One failure axis collapses the entire decision (λ_total). Receipts are permanent.

**First principles:**
- Truth is measured, not asserted.
- If it isn't in the Chronicle, it didn't happen.
- Rollback ≠ Reversibility.
- Safety must be architectural, not prompt-based.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/)

### Quick Start

```bash
git clone https://github.com/symmindprotocol618-dev/cathedral-core.git && cd cathedral-core
pip install -e .[dev]
ollama run llama3.1:8b
python -m cathedral_core
