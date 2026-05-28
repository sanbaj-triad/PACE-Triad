# ADR-003: Removal of Duplicate Function Definitions in crud.py

- **Date:** 2026-05-28
- **Status:** Accepted
- **Author:** sanbaj-traid
- **Affects:** `app/crud.py`

---

## Context

A full audit of `app/crud.py` revealed 20 duplicate function definitions — the same function name defined twice in the same module. This is a known side-effect of a bad version-control merge documented in `docs/MAINTENANCE_LOG.md`.

In Python, when a name is defined twice at module scope, the **last definition silently replaces the earlier one at import time**. The first definition is unreachable dead code from the moment the application starts. There is no runtime error, no warning, and no indication that the earlier definition is being ignored — making this class of bug particularly difficult to detect through normal testing.

---

## Intent

Remove the 20 dead function definitions to eliminate:

1. **Silent behavioural divergence** — several dead functions had meaningfully different (older, less complete) bodies than their live counterparts. Any future developer reading the dead definition and reasoning about its behaviour would reach incorrect conclusions about what the running application actually does.
2. **Unsafe edit surface** — editing a dead function has no effect on the running application, but gives the false impression that a fix or feature was applied.
3. **Reader confusion** — a 2,600+ line file with 20 phantom definitions doubles the apparent complexity of core CRUD logic.

---

## Approach

### Why delete rather than merge or consolidate?

The live definitions (higher line number, last defined) already contain the correct, complete behaviour. The dead definitions are strictly older or simpler versions. There is no feature in any dead definition that is not already present in the live one. Deletion is the correct action — no consolidation is needed.

### Why not refactor the structure while removing dead code?

Scope was deliberately kept narrow. The goal was to delete exactly the dead definitions and nothing else. Restructuring the file (reorganising sections, renaming functions, splitting into modules) is a separate concern that should be done in a dedicated PR with its own review.

### Identification method

All `def` statements in `crud.py` were enumerated. Any name appearing more than once was flagged. For each duplicate pair, both bodies were read to determine which was dead (lower line number) and whether the bodies were identical or diverged.

---

## Findings Summary

20 duplicate pairs were found, grouped into two categories:

### Identical copies (12 pairs) — pure merge artefacts

Both definitions had character-for-character identical bodies. The dead copy was safely removed with no behavioural change.

| Function | Dead line | Live line |
|---|---|---|
| `update_milestone` | 1074 | 1316 |
| `delete_milestone` | 1115 | 1357 |
| `update_line_item` | 1126 | 1394 |
| `delete_line_item` | 1141 | 1409 |
| `get_leads` | 1171 | 1439 |
| `create_lead` | 1182 | 1450 |
| `update_lead` | 1193 | 1461 |
| `delete_lead` | 1229 | 1479 |
| `clone_lead` | 1243 | 1493 |
| `get_comments` | 1266 | 1516 |
| `create_comment` | 1272 | 1519 |
| `delete_task` | 1614 | 1932 |

### Diverged copies (8 pairs) — dead version had missing or incorrect behaviour

The live version contained features the dead version lacked. Had the dead version somehow been executed, these gaps would have caused silent data or security problems.

| Function | Dead line | Live line | What the dead version was missing |
|---|---|---|---|
| `get_tasks` | 1280 | 1527 | `project_id` filter param; FIXED-type task inclusion when filtering by `assigned_to_id` |
| `get_task` | 1305 | 1560 | Minor eager-load difference |
| `create_task` | 1569 | 1871 | Status string normalisation; O365 calendar sync call after commit |
| `update_task` | 1591 | 1902 | Status string normalisation before comparison; dead version compared against enum object instead of normalised string, silently breaking `PENDING_APPROVAL` routing |
| `clone_task` | 1622 | 1940 | Used unsafe `__dict__.copy()` instead of SQLAlchemy column introspection; set status to `PENDING` instead of `OPEN` |
| `create_task_event` | 1646 | 1965 | User impersonation auth check; GPS haversine location resolution; 6 missing DB fields (`event_type`, `work_location`, `latitude`, `longitude`, `clock_out_latitude`, `clock_out_longitude`, `entry_type`) |
| `update_task_event` | 1664 | 2023 | No timesheet state-machine enforcement — dead version allowed editing Submitted/Approved/Locked entries by anyone |
| `delete_task_event` | 1676 | 2069 | No timesheet state-machine enforcement — dead version allowed deleting Submitted/Approved/Locked entries by anyone |

---

## Impact

| File | Change |
|---|---|
| `app/crud.py` | Removed 20 dead function definitions across two physical blocks (~L1072–1312 and ~L1569–1683). Two non-duplicate functions that resided inside the dead range (`update_leads_bulk`, `get_task_comments`) were explicitly preserved. |

No other files were modified. All callers in `app/main.py`, `app/ai_router.py`, and `app/routers/system.py` continue to resolve to the same live definitions they resolved to before — the import-time binding does not change.

---

## Verification

Post-removal validation was performed using Python's `ast` module:

```
PARSE OK                        — no syntax errors introduced
NO DUPLICATES REMAINING         — all 20 dead definitions removed
PRESERVED OK: update_leads_bulk — non-duplicate function retained
PRESERVED OK: get_task_comments — non-duplicate function retained
LIVE OK: create_task            ┐
LIVE OK: update_task            │
LIVE OK: delete_task            │
LIVE OK: clone_task             │
LIVE OK: create_task_event      │  all 20 live definitions
LIVE OK: update_task_event      │  confirmed present
LIVE OK: delete_task_event      │
LIVE OK: update_milestone       │
... (20 total)                  ┘
```

---

## Alternatives Considered

| Alternative | Reason not chosen |
|---|---|
| Leave dead code in place | Rejected. The diverged pairs (especially `create_task_event`, `update_task_event`, `delete_task_event`) represent a latent correctness and security risk to anyone maintaining the file. |
| Add a linter rule to catch future duplicates | Good follow-up action, but out of scope for this change. `pylint` (`E0102: function already defined`) or `ruff` (`F811`) can catch this at CI time. Recommended as a follow-up. |
| Refactor `crud.py` into sub-modules | Valid long-term improvement noted in `docs/MAINTENANCE_LOG.md`. Out of scope — kept change surface minimal to reduce review risk. |
