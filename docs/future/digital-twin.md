# Digital Twin

A "digital twin" of a panel is a live, interactive 2D (and later 3D) representation tied to real-time data: breaker states, currents, alarms. This is the long-horizon north star.

## Phasing

### Phase 1 — Static layout view

- Render the layout drawing with hot-spots over each component.
- Hover/tap shows component metadata from the BOM.
- No live data yet; purely a navigation enhancement.

### Phase 2 — Live state overlay

- Optional MQTT or OPC-UA connector ingests breaker state, current, alarm.
- A new `component_state` table (time-series, partitioned monthly) stores history.
- Layout colors components by live status.

### Phase 3 — Predictive overlays

- Trend analysis on currents → recommend maintenance windows.
- Drives back into [bom-parsing](./bom-parsing.md) — link real device telemetry to the BOM row.

## Data plane

For Phase 2:

- Time-series ingestion runs as a separate worker fleet (we extract `telemetry-service` per [scaling](../deployment/scaling.md) trigger #3-equivalent).
- Storage tier: TimescaleDB extension on the same Postgres cluster, or a dedicated TSDB.
- Query: tile-based for snapshots, streaming via SSE for live updates.

## Security

Telemetry from customer plants is **Confidential** and requires per-tenant network isolation. Each tenant gets a dedicated VPC-attached connector, never shared.

## Out of scope (still)

- Active control. PanelOS is read-only with respect to the physical plant for the foreseeable future. Writing back to PLCs requires safety certifications outside our scope.
