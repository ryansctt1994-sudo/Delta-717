"""Tests for the Python project the setup guide tells readers to build.

The guide (constants.ts) shows each file of a `delta717-governance-core`
project and says to `pip install -r requirements.txt` and `python main.py`.
These tests extract those exact files and do that, then check that the
guide's claims about the code hold: the Sentinel vetoes high uncertainty,
and the Forensic Ledger is a verifiable hash chain.

All guide code runs in subprocesses with the extracted directory as cwd, so
its top-level `core` package can't collide with anything else installed.
"""

from __future__ import annotations

import ast
import json
import shutil
import subprocess
import sys
import textwrap
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
NODE = shutil.which("node")
pytestmark = pytest.mark.skipif(NODE is None, reason="node is required to read constants.ts")


@pytest.fixture(scope="module")
def guide(tmp_path_factory) -> tuple[Path, dict]:
    target = tmp_path_factory.mktemp("guide")
    out = subprocess.run(
        [NODE, "--experimental-strip-types", "--no-warnings", str(HERE / "extract_guide.mjs"), str(target)],
        capture_output=True, text=True, check=True,
    )
    return target, json.loads(out.stdout)


@pytest.fixture
def project(guide, tmp_path) -> Path:
    """A fresh copy of the extracted project for tests that write files."""
    dest = tmp_path / "project"
    shutil.copytree(guide[0], dest)
    return dest


def run_py(cwd: Path, code: str) -> subprocess.CompletedProcess:
    prelude = "import sys; sys.path.insert(0, '.')\n"
    return subprocess.run(
        [sys.executable, "-c", prelude + textwrap.dedent(code)], cwd=cwd, capture_output=True, text=True,
    )


# --- The guide is internally consistent ---------------------------------------


def test_file_tree_and_file_contents_match(guide):
    _, meta = guide
    assert sorted(meta["tree"]) == sorted(meta["files"])


def test_every_python_file_compiles(guide):
    root, meta = guide
    for name in meta["files"]:
        if name.endswith(".py"):
            ast.parse((root / name).read_text(encoding="utf-8"), filename=name)


def test_requirements_cover_every_third_party_import(guide):
    root, meta = guide
    stdlib = set(sys.stdlib_module_names)
    local = {"core"}
    imported = set()
    for name in meta["files"]:
        if name.endswith(".py"):
            for node in ast.walk(ast.parse((root / name).read_text(encoding="utf-8"))):
                if isinstance(node, ast.Import):
                    imported |= {a.name.split(".")[0] for a in node.names}
                elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
                    imported.add(node.module.split(".")[0])
    third_party = imported - stdlib - local
    required = {
        line.split(">=")[0].split("==")[0].strip().lower()
        for line in (root / "requirements.txt").read_text().splitlines()
        if line.strip() and not line.startswith("#")
    }
    assert third_party <= required, f"imported but not in requirements.txt: {sorted(third_party - required)}"


def test_notebook_is_valid_json(guide):
    root, _ = guide
    nb = json.loads((root / "simulations" / "oncology_demo.ipynb").read_text(encoding="utf-8"))
    assert isinstance(nb.get("cells"), list)


# --- python main.py, as the guide says ----------------------------------------


def test_main_runs_from_a_fresh_checkout(project):
    result = subprocess.run([sys.executable, "main.py"], cwd=project, capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    out = result.stdout
    a, b = out.index("Scenario A"), out.index("Scenario B")
    assert "APPROVED" in out[a:b], "routine, low-entropy scenario should be approved"
    assert "VETO" in out[b:], "high-entropy scenario should be vetoed"
    chain = json.loads((project / "audit_log.json").read_text())
    assert [blk["index"] for blk in chain] == [1, 2, 3]


def test_second_run_reloads_and_extends_the_chain(project):
    for _ in range(2):
        subprocess.run([sys.executable, "main.py"], cwd=project, capture_output=True, text=True, check=True)
    result = run_py(project, """
        from core.ledger import ForensicLedger
        ledger = ForensicLedger('audit_log.json')
        print(len(ledger.chain), ledger.verify_chain())
    """)
    assert result.stdout.split() == ["5", "True"], result.stderr


# --- Forensic Ledger: "verifiable and tamper-proof logging" -------------------


@pytest.mark.parametrize(
    "tamper",
    [
        "chain[2]['data']['sentinel_decision']['status'] = 'APPROVED'",
        "del chain[1]",
        "chain[1], chain[2] = chain[2], chain[1]",
        "chain.insert(2, dict(chain[1]))",
    ],
    ids=["edit", "delete", "reorder", "insert"],
)
def test_tampered_ledger_refuses_to_load(project, tamper):
    subprocess.run([sys.executable, "main.py"], cwd=project, capture_output=True, text=True, check=True)
    result = run_py(project, f"""
        import json
        from core.ledger import ForensicLedger
        chain = json.load(open('audit_log.json'))
        chain.append(dict(chain[-1], index=len(chain) + 1, previous_hash=ForensicLedger._hash(None, chain[-1])))
        {tamper}
        json.dump(chain, open('audit_log.json', 'w'))
        try:
            ForensicLedger('audit_log.json')
            print('LOADED')
        except ValueError:
            print('REFUSED')
    """)
    assert result.stdout.strip() == "REFUSED", result.stderr


def test_corrupt_ledger_is_refused_and_left_intact(project):
    (project / "audit_log.json").write_text("{not json")
    result = run_py(project, """
        from core.ledger import ForensicLedger
        try:
            ForensicLedger('audit_log.json')
            print('LOADED')
        except ValueError:
            print('REFUSED')
    """)
    assert result.stdout.strip() == "REFUSED", result.stderr
    assert (project / "audit_log.json").read_text() == "{not json"


# --- Sentinel ---------------------------------------------------------------


def test_sentinel_contract(guide):
    result = run_py(guide[0], """
        from core.sentinel import Sentinel
        s = Sentinel(uncertainty_threshold=0.7)
        print(s.evaluate({})['status'])
        print(s.evaluate({'epistemic_uncertainty': 0.7})['status'])
        print(s.evaluate({'epistemic_uncertainty': 0.69})['status'])
        for bad in (0, 1, -0.5, 1.5):
            try:
                Sentinel(uncertainty_threshold=bad); print('ACCEPTED', bad)
            except ValueError:
                pass
    """)
    lines = [line for line in result.stdout.splitlines() if not line.startswith("Sentinel initialized")]
    assert lines == ["VETO", "VETO", "APPROVED"], result.stdout + result.stderr


def test_signal_monitor_rejects_non_distributions(guide):
    result = run_py(guide[0], """
        import numpy as np
        from core.sim_engine import SignalIntegrityMonitor
        m = SignalIntegrityMonitor()
        print(round(m.analyze_signal(np.array([0.25, 0.25, 0.25, 0.25]))['epistemic_uncertainty'], 6))
        print(m.analyze_signal(np.array([1.0]))['epistemic_uncertainty'])
        try:
            m.analyze_signal(np.array([0.5, 0.4])); print('ACCEPTED')
        except ValueError:
            print('REFUSED')
    """)
    lines = [line for line in result.stdout.splitlines() if "initialized" not in line]
    assert lines == ["1.0", "0.0", "REFUSED"], result.stdout + result.stderr


# --- Atomic snapshot and fail-closed ledger structure -------------------------


@pytest.mark.parametrize(
    "invalid_chain",
    [
        "[]",
        "'not a chain'",
        "[3]",
        "[{'index': 0, 'previous_hash': '0', 'timestamp': 't', 'proof': 1, 'data': {}}]",
        "[{'index': 1, 'previous_hash': '0', 'timestamp': 't', 'proof': 1}]",
    ],
    ids=["empty", "not-list", "not-dict", "incorrect-genesis-index", "missing-field"],
)
def test_malformed_existing_ledger_is_refused_without_overwrite(project, invalid_chain):
    result = run_py(project, f"""
        import json
        from pathlib import Path
        from core.ledger import ForensicLedger
        original = json.dumps({invalid_chain})
        path = Path('audit_log.json')
        path.write_text(original)
        try:
            ForensicLedger(str(path))
        except ValueError:
            print('REFUSED')
        else:
            print('ACCEPTED')
        assert path.read_text() == original
    """)
    assert result.returncode == 0, result.stdout + result.stderr
    assert result.stdout.splitlines()[-1] == "REFUSED"


def test_failed_atomic_replace_preserves_previous_snapshot_and_memory(project):
    result = run_py(project, """
        import os
        from pathlib import Path
        from unittest.mock import patch
        from core.ledger import ForensicLedger
        path = Path('audit_log.json')
        ledger = ForensicLedger(str(path))
        previous = path.read_bytes()
        chain_length = len(ledger.chain)
        with patch('core.ledger.os.replace', side_effect=OSError('simulated replace failure')):
            try:
                ledger.record_event({'status': 'PENDING'})
                raise AssertionError('expected failed save')
            except OSError:
                pass
        assert path.read_bytes() == previous
        assert len(ledger.chain) == chain_length
        assert ForensicLedger(str(path)).verify_chain()
        assert not list(path.parent.glob('.audit_log.json.*.tmp'))
        print('ATOMIC_ROLLBACK_PASS')
    """)
    assert result.returncode == 0, result.stdout + result.stderr
    assert result.stdout.splitlines()[-1] == "ATOMIC_ROLLBACK_PASS"


def test_replace_receives_complete_staged_json_before_original_changes(project):
    result = run_py(project, """
        import json
        import os
        from pathlib import Path
        from unittest.mock import patch
        from core.ledger import ForensicLedger
        path = Path('audit_log.json')
        ledger = ForensicLedger(str(path))
        previous = path.read_bytes()
        real_replace = os.replace
        def checked_replace(staged, target):
            with open(staged, encoding='utf-8') as f:
                pending = json.load(f)
            assert len(pending) == 2
            assert path.read_bytes() == previous
            return real_replace(staged, target)
        with patch('core.ledger.os.replace', side_effect=checked_replace):
            ledger.record_event({'status': 'APPROVED'})
        assert len(ledger.chain) == 2
        assert ForensicLedger(str(path)).verify_chain()
        print('ATOMIC_REPLACE_PASS')
    """)
    assert result.returncode == 0, result.stdout + result.stderr
    assert result.stdout.splitlines()[-1] == "ATOMIC_REPLACE_PASS"


def test_caller_cannot_mutate_ledger_event_after_recording(project):
    result = run_py(project, """
        from pathlib import Path
        from core.ledger import ForensicLedger
        ledger = ForensicLedger('audit_log.json')
        payload = {'decision': {'status': 'VETO'}, 'values': [1, 2]}
        ledger.record_event(payload)
        payload['decision']['status'] = 'APPROVED'
        payload['values'].append(3)
        assert ledger.chain[-1]['data'] == {
            'decision': {'status': 'VETO'}, 'values': [1, 2]
        }
        assert ledger.verify_chain()
        assert ForensicLedger('audit_log.json').verify_chain()
        print('SNAPSHOT_ISOLATED_PASS')
    """)
    assert result.returncode == 0, result.stdout + result.stderr
    assert result.stdout.splitlines()[-1] == "SNAPSHOT_ISOLATED_PASS"


def test_nonfinite_event_payload_cannot_change_snapshot(project):
    result = run_py(project, """
        from pathlib import Path
        from core.ledger import ForensicLedger
        ledger = ForensicLedger('audit_log.json')
        path = Path('audit_log.json')
        old = path.read_bytes()
        old_length = len(ledger.chain)
        try:
            ledger.record_event({'value': float('nan')})
        except ValueError:
            pass
        else:
            raise AssertionError('nonfinite JSON payload was accepted')
        assert path.read_bytes() == old
        assert len(ledger.chain) == old_length
        print('NONFINITE_REJECTED_PASS')
    """)
    assert result.returncode == 0, result.stdout + result.stderr
    assert result.stdout.splitlines()[-1] == "NONFINITE_REJECTED_PASS"


def test_negative_control_whole_chain_rehash_is_not_authenticated(project):
    # This test deliberately confirms the *limit* of an unsigned hash chain.
    # Recomputing its links after editing an event can still fool verification.
    result = run_py(project, """
        import json
        from pathlib import Path
        from core.ledger import ForensicLedger
        ledger = ForensicLedger('audit_log.json')
        ledger.record_event({'decision': 'VETO'})
        ledger.record_event({'decision': 'VETO'})
        path = Path('audit_log.json')
        chain = json.loads(path.read_text())
        chain[1]['data']['decision'] = 'APPROVED'
        for i in range(2, len(chain)):
            chain[i]['previous_hash'] = ForensicLedger._hash(None, chain[i-1])
        path.write_text(json.dumps(chain))
        assert ForensicLedger('audit_log.json').verify_chain()
        print('UNAUTHENTICATED_REHASH_CONFIRMED')
    """)
    assert result.returncode == 0, result.stdout + result.stderr
    assert result.stdout.splitlines()[-1] == "UNAUTHENTICATED_REHASH_CONFIRMED"


# --- NC-02/03/04: returned alias, tail bound and strict proof serialization --


def test_returned_block_cannot_mutate_stored_or_future_history(project):
    result = run_py(project, """
        from core.ledger import ForensicLedger
        ledger = ForensicLedger('audit_log.json')
        receipt = ledger.record_event({'decision': {'status': 'VETO'}})
        receipt['data']['decision']['status'] = 'APPROVED'
        receipt['index'] = 999
        assert ledger.chain[-1]['data']['decision']['status'] == 'VETO'
        assert ledger.chain[-1]['index'] == 2
        ledger.record_event({'decision': {'status': 'NEXT'}})
        reread = ForensicLedger('audit_log.json')
        assert reread.verify_chain()
        assert reread.chain[1]['data']['decision']['status'] == 'VETO'
        assert reread.chain[1]['index'] == 2
        print('DETACHED_RETURN_PASS')
    """)
    assert result.returncode == 0, result.stdout + result.stderr
    assert result.stdout.splitlines()[-1] == 'DETACHED_RETURN_PASS'


def test_unsigned_tail_tamper_is_an_explicit_unclosed_limit(project):
    # Negative assurance control, not a detected attack: there is no external
    # authenticated head checkpoint, so the terminal block can be changed.
    result = run_py(project, """
        import json
        from pathlib import Path
        from core.ledger import ForensicLedger
        ledger = ForensicLedger('audit_log.json')
        ledger.record_event({'decision': 'VETO'})
        path = Path('audit_log.json')
        chain = json.loads(path.read_text())
        chain[-1]['data']['decision'] = 'APPROVED'
        path.write_text(json.dumps(chain))
        assert ForensicLedger('audit_log.json').verify_chain()
        print('UNAUTHENTICATED_TAIL_LIMIT_CONFIRMED')
    """)
    assert result.returncode == 0, result.stdout + result.stderr
    assert result.stdout.splitlines()[-1] == 'UNAUTHENTICATED_TAIL_LIMIT_CONFIRMED'


def test_nonfinite_proof_is_rejected_before_state_or_file_change(project):
    result = run_py(project, """
        from pathlib import Path
        from core.ledger import ForensicLedger
        path = Path('audit_log.json')
        ledger = ForensicLedger(str(path))
        original = path.read_bytes()
        original_length = len(ledger.chain)
        for bad in (float('nan'), float('inf'), float('-inf')):
            try:
                ledger.record_event({'decision': 'VETO'}, proof=bad)
            except ValueError:
                pass
            else:
                raise AssertionError('nonfinite proof accepted')
            assert path.read_bytes() == original
            assert len(ledger.chain) == original_length
        print('NONFINITE_PROOF_REFUSED_PASS')
    """)
    assert result.returncode == 0, result.stdout + result.stderr
    assert result.stdout.splitlines()[-1] == 'NONFINITE_PROOF_REFUSED_PASS'
