# Future AI Seams

MVP ships **no** AI features, but every choice below leaves a seam for them. See [future/ai-rag-plan.md](../future/ai-rag-plan.md), [future/ocr-vision.md](../future/ocr-vision.md), [future/bom-parsing.md](../future/bom-parsing.md).

## Vector search

Postgres extension `pgvector` is enabled in the initial migration but the table is empty until the RAG feature ships. The migration uses:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE schematic_chunks (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL,
  revision_id uuid NOT NULL REFERENCES panel_revisions(id),
  chunk_index int NOT NULL,
  content text NOT NULL,
  embedding vector(1024)  -- bge-large or equivalent
);
CREATE INDEX ON schematic_chunks USING hnsw (embedding vector_cosine_ops);
```

(The table is created lazily on first AI provisioning — no perf cost until then.)

## OCR / Vision

Storage already records `mime`, `sha256`, and `original_filename`. A future OCR worker:
- Subscribes to a redis pubsub channel `file.uploaded`.
- Calls a vision model.
- Writes results back into `revision_files.ocr_text_storage_key` (a new column added via migration).

The PDF service exposes `iter_pages(file_id)` ready to feed any vision pipeline.

## BOM parsing

`Components` is already the structured target. A BOM parser reads a sheet tagged `BOM`, emits candidate `Component` rows, lands them in a `components_staging` table for engineer review. No schema change needed for the staging table until shipped.

## Maintenance / asset intelligence

`scan_events` doubles as a maintenance audit base. Aggregations (e.g., scans per panel per quarter, last-scan-by-tech) feed future intelligence dashboards without backfilling.

## Conversation memory

The audit log + scan events together form a per-panel timeline that can be embedded for a "what changed on this panel" chat. No new data needed.

## Where the seams live in code

| Seam | Module |
|---|---|
| Embeddings worker entrypoint | `apps/api/src/panelos_api/tasks/jobs/embed_revision.py` (stub) |
| Vision OCR worker entrypoint | `apps/api/src/panelos_api/tasks/jobs/ocr_pdf.py` (stub) |
| BOM parser entrypoint | `apps/api/src/panelos_api/services/bom_parser_service.py` (stub) |
| Search router | `apps/api/src/panelos_api/api/v1/routers/search.py` (lex search now, vector hook later) |
