"""Write a message namespace for both locales from one {key: [tr, en]} tree.

Usage (from apps/web):  python3 scripts/msg.py <namespace> <<'JSON' ... JSON
Leaves are two-item lists [turkish, english]; nesting is preserved.

next-intl treats "." as the nesting separator, so a key must not contain one.
For dotted identifiers such as API action names ("panel.created"), nest them:
{"panel": {"created": [...]}} and look them up as t(`actions.${action}`).
"""
import json
import sys
from pathlib import Path


def check(node, path=""):
    if isinstance(node, list):
        if len(node) != 2 or not all(isinstance(x, str) for x in node):
            sys.exit(f"error: {path}: a leaf must be [\"Türkçe\", \"English\"]")
        return
    if not isinstance(node, dict):
        sys.exit(f"error: {path}: expected an object or a [tr, en] pair")
    for key, value in node.items():
        if "." in key:
            sys.exit(
                f"error: key {path + '/' + key!r} contains '.', which next-intl reads as nesting. "
                "Nest it instead: \"panel.created\" -> {\"panel\": {\"created\": [...]}} "
                "(lookups like t(`actions.${action}`) then keep working)."
            )
        check(value, f"{path}/{key}")


def split(node, idx):
    if isinstance(node, list):
        return node[idx]
    return {k: split(v, idx) for k, v in node.items()}


ns = sys.argv[1]
tree = json.load(sys.stdin)
check(tree)
root = Path(__file__).resolve().parent.parent / "messages"
for idx, locale in enumerate(("tr", "en")):
    path = root / locale / f"{ns}.json"
    path.write_text(json.dumps(split(tree, idx), ensure_ascii=False, indent=2) + "\n")
print(f"wrote {ns} (tr, en)")
