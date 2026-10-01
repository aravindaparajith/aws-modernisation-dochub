import os
import psycopg
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from psycopg.rows import dict_row

load_dotenv()
DATABASE_URL = os.environ["DATABASE_URL"]

app = Flask(__name__)



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



if __name__ == "__main__":
    app.run(debug=True)

