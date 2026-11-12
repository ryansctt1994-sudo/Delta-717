# Local test reproduction record, 2026-11-12

Scope: a single local re-run of the guide tests, type check and build at two commits. It repeats what the hosted CI `app` and `guide` jobs run. It does not change what the embedded Python demo does or does not show, and it does not add an independent review.

Who ran it: an AI coding session working in the repository owner's cloud container. Same operator and same infrastructure as the code under test.

## Environment

- Linux container, Python 3.13, pytest 8.4.2, numpy and scipy, Node 22.23.4
- Tests: `python -m pytest -q tests/guide`
- App: `npm ci`, `npx tsc --noEmit -p .`, `npm run build`
- Each ref was run from a clean checkout of that ref

## Results

| Ref | Guide tests | Type check | Build |
|---|---|---|---|
| `main` at `fdc2df2` | 13 passed | no errors | succeeded |
| PR #9 head `c0a84e4` | 55 passed | no errors | succeeded |

The PR #9 head has 42 more guide tests than `main`. This record does not break down where they come from.

## Not covered by this record

- The `claim-audit` CI job, which needs the auditor from the `Weaver--Cathedral-` repository at a pinned commit that was not available in this session.
- PRs #3 to #8 individually. Only `main` and the PR #9 head were run.
- The limits PR #9 itself lists: direct calls to the Sentinel and monitor bypass the demo loop, the ledger is unsigned and locally editable, and concurrent writers, power-loss durability and external anchoring are not tested.
- Any check by a party independent of the repository owner.
