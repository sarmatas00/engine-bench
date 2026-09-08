import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import sample_field


def test_interpolate_is_exact_on_a_linear_field():
    # A unit cube of samples; T = 2x + 3y + 5z is linear, so linear interpolation is exact.
    g = np.linspace(0.0, 1.0, 3)
    pts = np.array([[x, y, z] for x in g for y in g for z in g])
    values = 2 * pts[:, 0] + 3 * pts[:, 1] + 5 * pts[:, 2]
    targets = np.array([[0.25, 0.25, 0.25], [0.5, 0.75, 0.1], [1.0, 1.0, 1.0]])
    out = sample_field.interpolate(pts, values, targets)
    expected = 2 * targets[:, 0] + 3 * targets[:, 1] + 5 * targets[:, 2]
    assert np.allclose(out, expected, atol=1e-9)


def test_interpolate_falls_back_to_nearest_outside_the_hull():
    g = np.linspace(0.0, 1.0, 3)
    pts = np.array([[x, y, z] for x in g for y in g for z in g])
    values = np.full(len(pts), 7.0)
    out = sample_field.interpolate(pts, values, np.array([[5.0, 5.0, 5.0]]))
    assert np.isfinite(out).all()
    assert out[0] == 7.0


def test_compare_round_trip_reports_no_loss_when_nothing_changed():
    pre = np.array([18.0, 21.0, 32.0])
    meta = {"vertices": 3, "cells": 1, "field": {"name": "temperature", "dtype": "float64", "count": 3}}
    result = sample_field.compare_round_trip(pre, pre.copy(), meta, vertices=3, cells=1,
                                             field_name="temperature", dtype="float64")
    assert result["lossless"] is True
    assert result["max_abs_delta"] == 0.0
    assert result["field_present"] is True


def test_compare_round_trip_reports_a_lost_field():
    pre = np.array([18.0, 21.0, 32.0])
    meta = {"vertices": 3, "cells": 1, "field": {"name": "temperature", "dtype": "float64", "count": 3}}
    result = sample_field.compare_round_trip(pre, None, meta, vertices=3, cells=1,
                                             field_name=None, dtype=None)
    assert result["field_present"] is False
    assert result["lossless"] is False
    assert result["max_abs_delta"] is None


def test_compare_round_trip_reports_a_float32_downcast():
    pre = np.array([18.123456789, 21.0, 32.0])
    post = pre.astype(np.float32).astype(np.float64)
    meta = {"vertices": 3, "cells": 1, "field": {"name": "temperature", "dtype": "float64", "count": 3}}
    result = sample_field.compare_round_trip(pre, post, meta, vertices=3, cells=1,
                                             field_name="temperature", dtype="float32")
    assert result["lossless"] is False
    assert 0 < result["max_abs_delta"] < 1e-5
    assert result["dtype_before"] == "float64"
    assert result["dtype_after"] == "float32"


def test_compare_round_trip_is_not_lossless_when_only_the_field_name_changed():
    """Identical values, renamed field. The values alone must not buy a lossless verdict."""
    pre = np.array([18.0, 21.0, 32.0])
    meta = {"vertices": 3, "cells": 1, "field": {"name": "temperature", "dtype": "float64", "count": 3}}
    result = sample_field.compare_round_trip(pre, pre.copy(), meta, vertices=3, cells=1,
                                             field_name="f_0", dtype="float64")
    assert result["max_abs_delta"] == 0.0
    assert result["field_present"] is True
    assert result["lossless"] is False


def test_colormap_matches_the_typescript_stops():
    out = sample_field.colormap(np.array([0.0, 1.0, 0.5]), 0.0, 1.0)
    assert tuple(out[0]) == (33, 102, 172)
    assert tuple(out[1]) == (200, 30, 30)
    assert tuple(out[2]) == (120, 200, 80)


def test_colormap_clamps_outside_the_range():
    out = sample_field.colormap(np.array([-5.0, 5.0]), 0.0, 1.0)
    assert tuple(out[0]) == (33, 102, 172)
    assert tuple(out[1]) == (200, 30, 30)


def _round_trip(max_abs_delta: float = 0.0) -> dict:
    pre = np.array([18.0, 21.0, 32.0])
    post = pre + max_abs_delta
    meta = {"vertices": 3, "cells": 1, "field": {"name": "temperature", "dtype": "float64", "count": 3}}
    return sample_field.compare_round_trip(pre, post, meta, vertices=3, cells=1,
                                           field_name="temperature", dtype="float64")


NOTES_FIXTURE = (
    "# engine-bench notes\n"
    "\n"
    "## Findings\n"
    "\n"
    "- an earlier finding that must survive\n"
    "  with a continuation line of its own\n"
    "- a later finding that must survive too\n"
)


def test_upsert_note_writes_one_bullet_when_the_script_is_run_twice(tmp_path):
    """sample_field.py is meant to be re-runnable. Running it twice must update its bullet,
    not append a second copy for someone to delete by hand."""
    notes = tmp_path / "NOTES.md"
    notes.write_text(NOTES_FIXTURE)
    key = sample_field.note_key("gothenburg-skansen-kronan")

    first = sample_field.round_trip_note("gothenburg-skansen-kronan", _round_trip())
    sample_field.upsert_note(first, key, notes)
    sample_field.upsert_note(first, key, notes)

    body = notes.read_text()
    assert body.count(key) == 1
    assert len([ln for ln in body.splitlines() if ln.startswith(key)]) == 1
    # The bullets that were already there are untouched.
    assert "- an earlier finding that must survive\n  with a continuation line of its own" in body
    assert "- a later finding that must survive too" in body


def test_upsert_note_replaces_the_old_verdict_rather_than_stacking_verdicts(tmp_path):
    notes = tmp_path / "NOTES.md"
    notes.write_text(NOTES_FIXTURE)
    key = sample_field.note_key("gothenburg-skansen-kronan")

    sample_field.upsert_note(sample_field.round_trip_note("gothenburg-skansen-kronan", _round_trip()), key, notes)
    assert "**no loss**" in notes.read_text()

    lossy = _round_trip(max_abs_delta=0.5)
    sample_field.upsert_note(sample_field.round_trip_note("gothenburg-skansen-kronan", lossy), key, notes)
    body = notes.read_text()
    assert body.count(key) == 1
    assert "**LOSS**" in body
    assert "**no loss**" not in body


def test_upsert_note_keeps_one_bullet_per_tile(tmp_path):
    """The key carries the tile name, so a different tile gets its own bullet."""
    notes = tmp_path / "NOTES.md"
    notes.write_text(NOTES_FIXTURE)
    for name in ("gothenburg-skansen-kronan", "some-other-tile", "gothenburg-skansen-kronan"):
        sample_field.upsert_note(sample_field.round_trip_note(name, _round_trip()), sample_field.note_key(name), notes)

    body = notes.read_text()
    assert body.count(sample_field.note_key("gothenburg-skansen-kronan")) == 1
    assert body.count(sample_field.note_key("some-other-tile")) == 1


def test_upsert_note_adds_the_findings_heading_when_it_is_missing(tmp_path):
    notes = tmp_path / "NOTES.md"
    notes.write_text("# engine-bench notes\n")
    key = sample_field.note_key("gothenburg-skansen-kronan")
    sample_field.upsert_note(sample_field.round_trip_note("gothenburg-skansen-kronan", _round_trip()), key, notes)
    sample_field.upsert_note(sample_field.round_trip_note("gothenburg-skansen-kronan", _round_trip()), key, notes)
    body = notes.read_text()
    assert body.count("## Findings") == 1
    assert body.count(key) == 1
