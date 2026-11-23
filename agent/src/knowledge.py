"""A tiny, dependency-free markdown knowledge base.

Drop `.md` files into the knowledge folder (default: ``agent/knowledge``, override
with the ``KNOWLEDGE_DIR`` env var). Files are split into chunks on headings and
searched with a BM25-style keyword scorer. The folder is re-scanned whenever a
file is added, edited, or removed, so no restart is needed.
"""

from __future__ import annotations

import math
import os
import re
from dataclasses import dataclass
from pathlib import Path

DEFAULT_DIR = Path(__file__).resolve().parent.parent / "knowledge"
MAX_CHUNK_WORDS = 250

_TOKEN_RE = re.compile(r"[a-z0-9][a-z0-9+#.\-]*[a-z0-9+#]|[a-z0-9]")
_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*\S)\s*$")
_STOPWORDS = frozenset(
    [
        "a",
        "an",
        "and",
        "are",
        "as",
        "at",
        "be",
        "by",
        "for",
        "from",
        "how",
        "i",
        "in",
        "is",
        "it",
        "of",
        "on",
        "or",
        "that",
        "the",
        "this",
        "to",
        "was",
        "what",
        "when",
        "where",
        "which",
        "who",
        "why",
        "with",
        "you",
        "your",
        "do",
        "does",
        "can",
        "about",
        "me",
        "my",
        "tell",
    ]
)


def _tokenize(text: str) -> list[str]:
    return [t for t in _TOKEN_RE.findall(text.lower()) if t not in _STOPWORDS]


@dataclass(frozen=True)
class Chunk:
    source: str  # file name relative to the knowledge dir
    title: str  # document title (first H1, or the file name)
    heading: str  # section heading path, e.g. "Caching > Eviction"
    text: str

    @property
    def label(self) -> str:
        return f"{self.title} / {self.heading}" if self.heading else self.title


def _split_long(text: str) -> list[str]:
    """Split an oversized section into paragraph-aligned pieces."""
    if len(text.split()) <= MAX_CHUNK_WORDS:
        return [text]
    pieces: list[str] = []
    current: list[str] = []
    count = 0
    for para in re.split(r"\n\s*\n", text):
        words = len(para.split())
        if current and count + words > MAX_CHUNK_WORDS:
            pieces.append("\n\n".join(current))
            current, count = [], 0
        current.append(para)
        count += words
    if current:
        pieces.append("\n\n".join(current))
    return pieces


def chunk_markdown(source: str, content: str) -> list[Chunk]:
    title = Path(source).stem.replace("-", " ").replace("_", " ").title()
    trail: list[tuple[int, str]] = []
    sections: list[tuple[str, list[str]]] = [("", [])]
    in_code = False
    title_set = False

    for line in content.splitlines():
        if line.lstrip().startswith("```"):
            in_code = not in_code
        m = None if in_code else _HEADING_RE.match(line)
        if not m:
            sections[-1][1].append(line)
            continue
        level, text = len(m.group(1)), m.group(2)
        if level == 1 and not title_set:
            title, title_set = text, True
            trail = []
            sections.append(("", []))
            continue
        while trail and trail[-1][0] >= level:
            trail.pop()
        trail.append((level, text))
        sections.append((" > ".join(t for _, t in trail), []))

    chunks: list[Chunk] = []
    for heading, lines in sections:
        body = "\n".join(lines).strip()
        if not body:
            continue
        for piece in _split_long(body):
            chunks.append(Chunk(source, title, heading, piece))
    return chunks


class KnowledgeBase:
    def __init__(self, directory: str | os.PathLike[str] | None = None) -> None:
        self.directory = Path(
            directory or os.environ.get("KNOWLEDGE_DIR") or DEFAULT_DIR
        )
        self._signature: tuple = ()
        self._chunks: list[Chunk] = []
        self._tokens: list[list[str]] = []
        self._df: dict[str, int] = {}
        self._avg_len = 0.0
        self._titles: list[str] = []

    # ---- loading -------------------------------------------------------
    def _files(self) -> list[Path]:
        if not self.directory.is_dir():
            return []
        return sorted(
            p
            for p in self.directory.rglob("*")
            if p.suffix.lower() in {".md", ".markdown"}
            and p.is_file()
            and p.name.lower() != "readme.md"
        )

    def refresh(self) -> bool:
        """Re-index if any file changed. Returns True when a reload happened."""
        files = self._files()
        signature = tuple(
            (str(p), p.stat().st_mtime_ns, p.stat().st_size) for p in files
        )
        if signature == self._signature:
            return False

        chunks: list[Chunk] = []
        titles: list[str] = []
        for path in files:
            try:
                content = path.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            rel = path.relative_to(self.directory).as_posix()
            file_chunks = chunk_markdown(rel, content)
            if file_chunks:
                titles.append(file_chunks[0].title)
            chunks.extend(file_chunks)

        self._chunks = chunks
        self._titles = titles
        # Index title and heading with the body so topic names match strongly.
        self._tokens = [
            _tokenize(f"{c.title} {c.heading} {c.heading} {c.text}") for c in chunks
        ]
        self._df = {}
        for toks in self._tokens:
            for t in set(toks):
                self._df[t] = self._df.get(t, 0) + 1
        self._avg_len = (
            sum(len(t) for t in self._tokens) / len(self._tokens)
            if self._tokens
            else 0.0
        )
        self._signature = signature
        return True

    # ---- querying ------------------------------------------------------
    def titles(self) -> list[str]:
        self.refresh()
        return list(self._titles)

    def __len__(self) -> int:
        self.refresh()
        return len(self._chunks)

    def search(self, query: str, k: int = 3) -> list[Chunk]:
        self.refresh()
        q_terms = _tokenize(query)
        if not q_terms or not self._chunks:
            return []
        n = len(self._chunks)
        k1, b = 1.5, 0.75
        scored: list[tuple[float, int]] = []
        for i, toks in enumerate(self._tokens):
            if not toks:
                continue
            tf: dict[str, int] = {}
            for t in toks:
                tf[t] = tf.get(t, 0) + 1
            score = 0.0
            for term in set(q_terms):
                f = tf.get(term, 0)
                if not f:
                    continue
                df = self._df.get(term, 0)
                idf = math.log(1 + (n - df + 0.5) / (df + 0.5))
                score += (
                    idf
                    * f
                    * (k1 + 1)
                    / (f + k1 * (1 - b + b * len(toks) / self._avg_len))
                )
            if score > 0:
                scored.append((score, i))
        scored.sort(reverse=True)
        return [self._chunks[i] for _, i in scored[:k]]
