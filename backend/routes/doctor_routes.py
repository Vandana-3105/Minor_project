from flask import Blueprint, request, jsonify
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from config import SECRET_KEY, TOKEN_MAX_AGE
from models.doctor_model import find_doctor_by_id, verify_password
from models.patient_model import find_patient_by_aadhar
from models.test_model import get_tests_by_patient
from database.mongodb import doctors_col,tests_col
from bson import ObjectId

doctor_bp = Blueprint("doctor", __name__)
serializer = URLSafeTimedSerializer(SECRET_KEY)

VALID_STATUSES = {"Scheduled", "In Progress", "Completed", "Cancelled"}


def _make_doctor_token(doctor_id: str) -> str:
    return serializer.dumps({"id": doctor_id, "role": "doctor"})


def _get_doctor_from_token():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None, "Missing token"
    token = auth.split(" ", 1)[1]
    try:
        data = serializer.loads(token, max_age=TOKEN_MAX_AGE)
        if data.get("role") != "doctor":
            return None, "Invalid role"
        # Support both correct key "id" and old typo key " doctor_id"
        doctor_id = data.get("id") or data.get(" doctor_id")
        if not doctor_id:
            return None, "Invalid token payload"
        return doctor_id, None
    except (SignatureExpired, BadSignature):
        return None, "Invalid or expired token"


def _serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    doc.pop("password", None)
    return doc


# ── POST /doctor/login ────────────────────────────────────────────────
@doctor_bp.route("/doctor/login", methods=["POST"])
def login():
    data = request.get_json(force=True) or {}
    doctor_id = data.get("doctor_id", "")
    password = data.get("password", "")

    if not doctor_id or not password:
        return jsonify({"error": "Doctor ID and password required"}), 400

    doctor = find_doctor_by_id(doctor_id)
    if not doctor or not verify_password(password, doctor["password"]):
        return jsonify({"error": "Invalid Doctor ID or password"}), 401

    token = _make_doctor_token(doctor_id)
    return jsonify({
        "message": "Login successful",
        "token": token,
        "name": doctor.get("name", ""),
        "department": doctor.get("department", ""),
    }), 200


# ── POST /doctor/search_patient ───────────────────────────────────────
@doctor_bp.route("/doctor/search_patient", methods=["POST"])
def search_patient():
    _, err = _get_doctor_from_token()
    if err:
        return jsonify({"error": err}), 401

    data = request.get_json(force=True) or {}
    aadhar = data.get("aadhar", "").strip()

    if not aadhar:
        return jsonify({"error": "Aadhaar number required"}), 400

    patient = find_patient_by_aadhar(aadhar)
    if not patient:
        return jsonify({"error": "No patient found with this Aadhaar number"}), 404

    patient_id = str(patient["_id"])
    tests = get_tests_by_patient(patient_id)
    for t in tests:
        t["_id"] = str(t["_id"])

    return jsonify({
        "patient": _serialize(patient),
        "tests": tests,
    }), 200


# ── PUT /doctor/update_test_status ────────────────────────────────────
@doctor_bp.route("/doctor/update_test_status", methods=["PUT"])
def update_test_status():
    _, err = _get_doctor_from_token()
    if err:
        return jsonify({"error": err}), 401

    data = request.get_json(force=True) or {}
    test_id = data.get("test_id", "")
    new_status = data.get("status", "")

    if not test_id or not new_status:
        return jsonify({"error": "test_id and status required"}), 400

    if new_status not in VALID_STATUSES:
        return jsonify({"error": f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}"}), 400

    try:
        result = tests_col.update_one(
            {"_id": ObjectId(test_id)},
            {"$set": {"status": new_status}},
        )
    except Exception:
        return jsonify({"error": "Invalid test ID"}), 400

    if result.matched_count == 0:
        return jsonify({"error": "Test not found"}), 404

    return jsonify({"message": "Test status updated successfully"}), 200


# ── GET /doctor/all_tests ─────────────────────────────────────────────
@doctor_bp.route("/doctor/all_tests", methods=["GET"])
def all_tests():
    _, err = _get_doctor_from_token()
    if err:
        return jsonify({"error": err}), 401

    cursor = tests_col.find({}).sort("date", -1)
    tests = []
    for t in cursor:
        t["_id"] = str(t["_id"])
        tests.append(t)

    return jsonify({"tests": tests}), 200
