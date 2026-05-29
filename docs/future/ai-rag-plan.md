# AI / RAG Plan

A panel’s history (drawings, BOM, audit log, scan events) is a structured corpus. RAG-augmented search and Q&A is the highest-value AI feature on the horizon. Strict opt-in per tenant; schematics are confidential ([data-classification](../security/data-classification.md)).

## Goals

1. "What changed between revision B and C of MCC-3?" — natural language diff over audit log + components.
2. "Find me panels with VFD on slot K3 in plant North." — hybrid lex + semantic search.
3. "Why was this revision rejected?" — span retrieval over rejection notes + diffs.

## Architecture

```mermaid
flowchart LR
  Trigger[revision.approved event] --> Worker[Embedding worker]
  Worker --> Chunker[PDF chunker]
  Chunker --> Embedder[Embedding model<br/>bge-large or equivalent]
  Embedder --> PG[(pgvector schematic_chunks)]
  Query[/api/v1/search] --> Hybrid[hybrid:<br/>BM25 + vector]
  Hybrid --> PG
  Hybrid --> Reranker[Reranker]
  Reranker --> LLM[LLM with retrieved context]
  LLM --> Response
```

## Storage

`schematic_chunks` table (sketched in [future-ai](../architecture/future-ai.md)):

```sql
CREATE TABLE schematic_chunks (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL,
  revision_id uuid NOT NULL,
  chunk_index int NOT NULL,
  content text NOT NULL,
  embedding vector(1024)
);
```

RLS policy identical to other tenant tables.

## Tenancy

- Embeddings are **per-tenant**; never cross-pollinated.
- Models run inside our infra by default. A tenant may opt into a hosted LLM provider after signing a per-provider DPA.

## Rate limiting and cost

- Token-budgeted per tenant (free tier: limited; paid tier: usage-based).
- Background indexing is cheap; query-time inference is the cost driver.

## Out-of-scope (still)

- General-purpose chatbot. Scope is **panel domain only**.
- Generating drawings. Read/summarize/diff only.

## Privacy

- Each tenant opts in.
- Per-tenant cipher key for embedding storage where provider supports KMS bring-your-own-key.
- "Forget my data": delete `schematic_chunks` rows for a revision on hard delete.
