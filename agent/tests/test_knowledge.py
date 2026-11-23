import time

from knowledge import KnowledgeBase, chunk_markdown


def write(tmp_path, name, text):
    p = tmp_path / name
    p.write_text(text, encoding="utf-8")
    return p


def test_chunks_split_on_headings():
    chunks = chunk_markdown(
        "a.md", "# Doc\n\n## One\nalpha text\n\n## Two\nbeta text\n"
    )
    assert [c.heading for c in chunks] == ["One", "Two"]
    assert all(c.title == "Doc" for c in chunks)


def test_search_finds_relevant_chunk(tmp_path):
    write(
        tmp_path,
        "caching.md",
        "# Caching\n\n## Eviction\nLeast recently used eviction.\n",
    )
    write(tmp_path, "star.md", "# STAR\n\n## Method\nSituation task action result.\n")
    kb = KnowledgeBase(tmp_path)
    hits = kb.search("how does cache eviction work")
    assert hits and hits[0].source == "caching.md"
    assert kb.search("zzzz nothing") == []


def test_hot_reload_and_readme_ignored(tmp_path):
    write(tmp_path, "README.md", "# Readme\nignored banana\n")
    kb = KnowledgeBase(tmp_path)
    assert len(kb) == 0 and kb.search("banana") == []

    write(tmp_path, "fruit.md", "# Fruit\n\n## Banana\nA yellow banana.\n")
    assert kb.search("banana")[0].source == "fruit.md"
    assert "Fruit" in kb.titles()

    time.sleep(0.01)
    (tmp_path / "fruit.md").unlink()
    assert kb.search("banana") == []


def test_missing_directory_is_empty(tmp_path):
    kb = KnowledgeBase(tmp_path / "nope")
    assert kb.titles() == [] and kb.search("anything") == []
