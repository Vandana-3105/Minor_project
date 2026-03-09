from flask import Blueprint, request, jsonify
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from config import SECRET_KEY, TOKEN_MAX_AGE
from models.test_model import create_test, get_tests_by_patient
from database.mongodb import tests_col

test_bp = Blueprint("tests", __name__)
serializer = URLSafeTimedSerializer(SECRET_KEY)


def _get_patient_from_token():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None, "Missing token"
    token = auth.split(" ", 1)[1]
    try:
        data = serializer.loads(token, max_age=TOKEN_MAX_AGE)
        if data.get("role") != "patient":
            return None, "Invalid role – patients only"
        return data["id"], None
    except (SignatureExpired, BadSignature):
        return None, "Invalid or expired token"


# ── POST /tests/schedule ──────────────────────────────────────────────
@test_bp.route("/tests/schedule", methods=["POST"])
def schedule_test():
    patient_id, err = _get_patient_from_token()
    if err:
        return jsonify({"error": err}), 401

    data = request.get_json(force=True) or {}
    required = ["test_type", "date", "time"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    test_doc = create_test({**data, "patient_id": patient_id})
    result = tests_col.insert_one(test_doc)

    return jsonify({
        "message": "Test scheduled successfully",
        "test_id": str(result.inserted_id),
    }), 201


# ── GET /tests/history ────────────────────────────────────────────────
@test_bp.route("/tests/history", methods=["GET"])
def test_history():
    patient_id, err = _get_patient_from_token()
    if err:
        return jsonify({"error": err}), 401

    tests = get_tests_by_patient(patient_id)
    for t in tests:
        t["_id"] = str(t["_id"])

    return jsonify({"tests": tests}), 200
