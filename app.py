import os
import psycopg
from dotenv import load_dotenv
from flask import Flask, jsonify

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



if __name__ == "__main__":
    app.run(debug=True)

