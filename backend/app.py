import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, send_from_directory
from flask_cors import CORS
from routes.patient_routes import patient_bp
from routes.doctor_routes import doctor_bp
from routes.test_routes import test_bp
from config import SECRET_KEY

app = Flask(
    __name__,
    static_folder=os.path.join(os.path.dirname(__file__), "..", "frontend"),
    static_url_path="",
)
app.secret_key = SECRET_KEY
CORS(app, resources={r"/*": {"origins": "*"}})

# Register blueprints
app.register_blueprint(patient_bp)
app.register_blueprint(doctor_bp)
app.register_blueprint(test_bp)


# Serve frontend pages
@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:filename>")
def serve_static(filename):
    return send_from_directory(app.static_folder, filename)


if __name__ == "__main__":
    print("[Healthcare Portal] API running at http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
