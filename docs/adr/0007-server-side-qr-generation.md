# ADR-0007: Server-side QR generation

- **Status:** Accepted
- **Date:** 2026-05-29

## Context

We need QR images at multiple resolutions — engraving (300dpi, high error correction), print labels (paper), in-app preview (SVG). Generating on the client risks subtle differences (font rendering, alignment) between browsers.

## Decision

The API generates QR images with the `segno` library, caches them as `qr/{token}.svg` and `qr/{token}.png` in object storage, and returns CDN-friendly URLs. Error correction is fixed at level **H**.

## Consequences

**Positive**
- Pixel-identical labels regardless of who triggers the render.
- Cache hits make the second view free.
- Engraving vendors can pull the SVG directly via signed URL.

**Negative**
- Storage cost is a few KB per panel — negligible.
- Re-rendering on token change is moot — tokens are immutable ([ADR-0005](./0005-revision-immutability.md)).

## Alternatives considered

1. **Client-side `qrcode.react`** — used for in-app preview *only* (no server roundtrip needed); the canonical printable assets come from the API.
2. **Pre-render at panel creation, never lazily** — wastes storage on panels that never print labels; current approach renders on first request.
