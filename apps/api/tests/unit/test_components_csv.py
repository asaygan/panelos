"""BOM CSV parsing for the component import endpoint."""

from __future__ import annotations

import uuid

from panelos_api.api.v1.routers.components import parse_components_csv


def test_parses_full_rows() -> None:
    rev = uuid.uuid4()
    csv_bytes = (
        b"slot,ref,description,part_number,rating,type,status\n"
        b"A1,Q1,Main breaker,PN-1,250A,breaker,ok\n"
        b"A2,F1,Fuse,PN-2,10A,fuse,warn\n"
    )
    rows = parse_components_csv(csv_bytes, rev)
    assert len(rows) == 2
    assert rows[0]["revision_id"] == rev
    assert rows[0]["slot"] == "A1"
    assert rows[0]["ref"] == "Q1"
    assert rows[0]["rating"] == "250A"
    assert rows[1]["status"] == "warn"


def test_status_defaults_to_ok_and_blanks_become_none() -> None:
    rev = uuid.uuid4()
    csv_bytes = b"slot,ref,description,part_number,rating,type,status\nA3,K1,Contactor,,,,\n"
    rows = parse_components_csv(csv_bytes, rev)
    assert len(rows) == 1
    assert rows[0]["status"] == "ok"
    assert rows[0]["part_number"] is None
    assert rows[0]["rating"] is None
    assert rows[0]["type"] is None


def test_skips_blank_rows_and_handles_bom() -> None:
    rev = uuid.uuid4()
    csv_bytes = "﻿slot,ref,description\nA1,Q1,Breaker\n,,\n".encode()
    rows = parse_components_csv(csv_bytes, rev)
    assert len(rows) == 1
    assert rows[0]["slot"] == "A1"
