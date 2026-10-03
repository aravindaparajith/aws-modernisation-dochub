import os
import psycopg
import uuid
import boto3
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory, redirect
from psycopg.rows import dict_row
from werkzeug.utils import secure_filename
from botocore.config import Config

load_dotenv()
DATABASE_URL = os.environ["DATABASE_URL"]
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "uploads")
ALLOWED_EXTENSIONS = {"pdf", "txt", "md", "docx"}
os.makedirs(UPLOAD_DIR, exist_ok=True)
UPLOAD_BUCKET = os.getenv("UPLOAD_BUCKET")
AWS_REGION = os.getenv("AWS_REGION", "ap-southeast-2")

s3 = (
    boto3.client("s3", region_name=AWS_REGION, config = Config(signature_version = "s3v4"))
    if UPLOAD_BUCKET else None
)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024



@app.route("/")
def home():
    return "Dochub is running"
    pass

@app.route("/health")
def health():
    try:
        with psycopg.connect(DATABASE_URL, connect_timeout = 3) as conn:
            conn.execute("SELECT 1")
        return jsonify({"status": "OK", "database": "CONNECTED"})
    
    except Exception:
        return jsonify({"status": "error", "database": "unreachable"}), 503
    
    pass

@app.route("/documents", methods=["POST"])
def create_document():
    data = request.get_json()
    title = data.get("title")
    description = data.get("description","")

    if not title:
        return jsonify({"error": "title is required"}), 400

    with psycopg.connect(DATABASE_URL, row_factory = dict_row) as conn:
        row = conn.execute(
            "INSERT INTO documents (title, description) VALUES (%s, %s) RETURNING *",
            (title, description),
        ).fetchone()

    return jsonify(row), 201


@app.route("/documents", methods=["GET"])
def list_documents():
    search = request.args.get("q")
    query = "SELECT * FROM documents"
    params = ()

    if search:
        query += " WHERE title ILIKE %s"
        params = (f"%{search}%",)

    query += " ORDER BY created_at DESC"

    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        rows = conn.execute(query, params).fetchall()

    return jsonify(rows)

def allowed_file(filename):
    return "." in filename and filename.rsplit(".",1)[1].lower() in ALLOWED_EXTENSIONS

@app.route("/documents/upload", methods=["POST"])
def upload_document():
    title = request.form.get("title")
    description = request.form.get("description", "")
    file = request.files.get("file")

    if not title:
        return jsonify({"error": "title is required"}), 400
    if not file or file.filename == "":
        return jsonify({"error": "file is required"}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": "file not allowed"}), 400

    stored_name = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"

    if s3:
        s3.upload_fileobj(
            file,
            UPLOAD_BUCKET,
            stored_name,
            ExtraArgs = {"ContentType": file.mimetype or "application/octet-stream"},
        )
    else:
        file.save(os.path.join(UPLOAD_DIR,stored_name))

    
    with psycopg.connect(DATABASE_URL, row_factory= dict_row) as conn:
        row = conn.execute(
            """
            INSERT INTO documents (title, description, filename)
            VALUES (%s, %s, %s)
            RETURNING *
            """,
            (title, description, stored_name)
        ).fetchone()

    return jsonify(row), 201

@app.route("/documents/<int:doc_id>/download", methods=["GET"])
def download_doc(doc_id):
    with psycopg.connect(DATABASE_URL, row_factory = dict_row) as conn:
        row = conn.execute(
            "SELECT filename FROM documents WHERE id = %s",
            (doc_id,),
        ).fetchone()


    if not row or not row["filename"]:
        return jsonify({"error": "not found"}), 404

    original_name = row["filename"].split("_", 1)[1]

    if s3:
        url = s3.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": UPLOAD_BUCKET,
                "Key": row["filename"],
                "ResponseContentDisposition": f'attachment; filename="{original_name}"',
            },
            ExpiresIn = 300
        )
        return redirect(url)

    return send_from_directory(
        UPLOAD_DIR, row["filename"], as_attachment=True, download_name=original_name
    )

@app.route("/documents/<int:doc_id>", methods=["DELETE"])
def delete_document(doc_id):
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        row = conn.execute(
            "DELETE FROM documents WHERE id = %s RETURNING filename",
            (doc_id,),
        ).fetchone()

    if not row:
        return jsonify({"error": "not found"}), 404

    if row["filename"]:
        if s3:
            s3.delete_object(Bucket=UPLOAD_BUCKET, Key= row["filename"])
        else:
            try:
                os.remove(os.path.join(UPLOAD_DIR, row["filename"]))
            except FileNotFoundError:
                pass


    return "", 204



if __name__ == "__main__":
    app.run(debug=True)

