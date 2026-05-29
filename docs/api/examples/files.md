# API Examples — Files (presigned upload)

Background: [storage](../../architecture/storage.md).

## 1. Request a presigned upload

```bash
curl -s "$BASE/api/v1/files/presign" -H "$H" -H "$T" \
  -H 'Content-Type: application/json' \
  -d '{
    "filename": "MCC-3-rev-B.pdf",
    "mime": "application/pdf",
    "sha256": "9c1b...e2",
    "byte_size": 1842901
  }'
```

Response:

```json
{
  "file_id": "fil_01HV...",
  "upload_url": "https://r2.cloudflarestorage.com/...signature...",
  "headers": { "Content-Type": "application/pdf" },
  "expires_in": 300
}
```

## 2. PUT the bytes

```bash
curl -s -X PUT "<upload_url>" \
  -H 'Content-Type: application/pdf' \
  --data-binary @MCC-3-rev-B.pdf
```

## 3. Finalize

```bash
curl -s -X POST "$BASE/api/v1/files/fil_01HV.../finalize" -H "$H" -H "$T"
```

Server validates size + sha256 against the uploaded object, then writes the `pdf_files` row.

## 4. Get a download URL

```bash
curl -s "$BASE/api/v1/files/fil_01HV.../url?expires_in=600" -H "$H" -H "$T"
```

Returns a presigned GET URL.
