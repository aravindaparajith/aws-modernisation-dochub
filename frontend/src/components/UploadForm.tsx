import { useState, type SubmitEvent } from "react";

const ALLOWED = ["pdf", "txt", "md", "docx"];
const MAX_MB = 10;

type Props = {
    onUploaded: () => void;
    onCancel: () => void;
};

export default function UploadForm({ onUploaded, onCancel }: Props){
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [file, setFile] = useState<File | null>(null);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function validate(): string | null {
        if (!title.trim()) return "Title is required.";
        if (!file) return "Please choose a file.";
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        if (!ALLOWED.includes(ext)) return `Only ${ALLOWED.join(", ")} files are allowed.`;
        if (file.size > MAX_MB * 1024 * 1024) return `File must be under ${MAX_MB} MB.`;
        return null;
    }

    async function handleSubmit(e: SubmitEvent<HTMLFormElement>){
        e.preventDefault();
        const problem = validate();
        if (problem) return setError(problem);

        const form = new FormData();
        form.append("title", title.trim());
        form.append("description", description.trim());
        form.append("file", file!);

        setSubmitting(true);
        setError(null);

        try {
            const res = await fetch("/documents/upload", {method: "POST", body: form});
            if (!res.ok){
                if (res.status === 413) {
                    throw new Error(`File must be under ${MAX_MB} MB`);
                }
                const data = await res.json().catch(() => null);
                throw new Error(data?.error ?? `Upload failed (${res.status}).`);
            }
            onUploaded();
        } catch (err){
            setError((err as Error).message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form className="upload-panel" onSubmit={handleSubmit}>
            <h2 className="panel-title">Upload a document</h2>

            <label className="field">
                <span>Title *</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Security Policy"/>
            </label>

            <label className="field">
                <span>Description</span>
                <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Optional short summary"
                />
            </label>

            <label className="field">
                <span>File *({ALLOWED.join(", ")}, max {MAX_MB} MB)</span>
                <input 
                    type="file"
                    accept={ALLOWED.map((x) => "." + x).join(",")}
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
            </label>

            {error && <p className="form-error">{error}</p>}

            <div className="actions">
                <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={submitting}>
                    Cancel
                </button>
                <button type="submit" className="btn btn--primary" disabled={submitting}>
                    {submitting ? "Uploading…" : "Upload"}
                </button>
            </div>
        </form>
    );
}

