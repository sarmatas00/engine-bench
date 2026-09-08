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
