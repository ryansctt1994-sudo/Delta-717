# Guide tests

The setup guide (`constants.ts`) shows a complete Python project and tells readers to run it. These tests extract that project exactly as the app renders it, then check that:

- the file tree and the file contents list the same files, every `.py` file compiles, `requirements.txt` covers every third-party import, and the notebook is valid JSON;
- `python main.py` runs from a fresh checkout, approves the low-entropy scenario and vetoes the high-entropy one;
- the Forensic Ledger reloads and extends across runs, and refuses to load after an edit, deletion, reorder or insertion, or when the file is corrupt;
- the Sentinel and Signal Integrity Monitor keep their stated contracts.

```bash
pip install "numpy>=1.24.0" "scipy>=1.10.0" pytest
python -m pytest -q tests/guide
```

Needs Node 22+ to read `constants.ts`.
