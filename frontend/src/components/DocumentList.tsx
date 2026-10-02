import { useEffect, useState } from "react";
import type { Doc } from "../types";

type Props = { refreshKey: number };

export default function DocumentList({ refreshKey }: Props) {
    const [query, setQuery] = useState("");
    const [docs, setDocs] = useState<Doc[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [confirmingId, setConfirmingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        const timer = setTimeout(async () => {
            setLoading(true);
            setError(null);
            try {
                const url = query ? `/documents?q=${encodeURIComponent(query)}` : "/documents";
                const res = await fetch(url, { signal: controller.signal });
                if (!res.ok) throw new Error(`Request failed (${res.status})`);
                setDocs(await res.json());
            } catch (err) {
                if ((err as Error).name !== "Aborterror") setError("Couldn't load documents.");
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => {
            clearTimeout(timer);
            controller.abort();
        }

    }, [query, refreshKey]);

    function fileType(filename: string | null) {
        if (!filename) return null;
        return filename.split(".").pop()?.toUpperCase() ?? null;
    }

    async function handleDelete(id: number) {
        setDeletingId(id);
        setError(null);

        try {
            const res = await fetch(`/documents/${id}`, { method: "DELETE" });
            if (!res.ok && res.status !== 404) throw new Error();
            setDocs((prev) => prev.filter((d) => d.id !== id));
        } catch {
            setError("Couldn't delete the document. Please try again")
        } finally {
            setDeletingId(null);
            setConfirmingId(null);
        }
    }

    return (
        <section>
            <input
                className="search"
                type="search"
                placeholder="Search Documents..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}

            />

            {!loading && !error && docs.length > 0 && (
                <p className="count">
                    {docs.length} {docs.length === 1 ? "document" : "documents"}
                    {query && ` matching "${query}"`}
                </p>
            )}

            {error && <p className="state state--error">{error}</p>}
            {!error && loading && <p className="state">Loading...</p>}
            {!error && !loading && docs.length === 0 && (
                <p className="state">{query ? `No documents match "${query}"` : "No documents yet."}</p>
            )}

            <ul className="doc-list">
                {docs.map((doc) => (
                    <li key={doc.id} className="doc-card">
                        <div>
                            <h3 className="doc-title">{doc.title}</h3>
                            {doc.description && <p className="doc-desc">{doc.description}</p>}
                        </div>
                        <div className="doc-meta">
                            {fileType(doc.filename) && <span className="badge">{fileType(doc.filename)}</span>}

                            <span className="doc-date">
                                {new Date(doc.created_at).toLocaleDateString("en-AU", {
                                    day: "numeric", month: "short", year: "numeric",
                                })}
                            </span>

                            {doc.filename ? (
                                <a className="btn btn--ghost" href={`/documents/${doc.id}/download`}>⬇ Download</a>
                            ) : (
                                <span className="no-file">No file</span>
                            )}

                            {confirmingId === doc.id ? (
                                <>
                                    <button
                                        className="btn btn--danger"
                                        onClick={() => handleDelete(doc.id)}
                                        disabled={deletingId === doc.id}
                                    >
                                        {deletingId === doc.id ? "Deleting…" : "Confirm"}
                                    </button>
                                    <button className="btn btn--secondary" onClick={() => setConfirmingId(null)}>
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <button
                                    className="btn btn--icon"
                                    onClick={() => setConfirmingId(doc.id)}
                                    aria-label={`Delete ${doc.title}`}
                                    title="Delete"
                                >
                                    🗑
                                </button>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    )
}