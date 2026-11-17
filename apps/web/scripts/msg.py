"""Write a message namespace for both locales from one {key: [tr, en]} tree.

Usage (from apps/web):  python3 scripts/msg.py <namespace> <<'JSON' ... JSON
Leaves are two-item lists [turkish, english]; nesting is preserved.
"""
import json
import sys
from pathlib import Path


def split(node, idx):
    if isinstance(node, list):
        return node[idx]
    return {k: split(v, idx) for k, v in node.items()}


ns = sys.argv[1]
tree = json.load(sys.stdin)
root = Path(__file__).resolve().parent.parent / "messages"
for idx, locale in enumerate(("tr", "en")):
    path = root / locale / f"{ns}.json"
    path.write_text(json.dumps(split(tree, idx), ensure_ascii=False, indent=2) + "\n")
print(f"wrote {ns} (tr, en)")
