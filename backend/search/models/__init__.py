"""No Django models.

Search embeddings live in Milvus (a vector store on disk), not in the relational
database. What *is* tracked relationally — whether a blog's embedding succeeded —
lives on `blog.Blog` (`embedding_status`, `embedding_error`, `embedded_at`),
because that is the row an operator is looking at when they ask why a post is
missing from search.
"""
