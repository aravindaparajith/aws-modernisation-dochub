from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/")
def home():
    return "Dochub is running"
    pass

@app.route("/health")
def health():
    return jsonify(status="OK")
    pass

if __name__ == "__main__":
    app.run(debug=True)

