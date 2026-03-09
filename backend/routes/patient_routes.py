from flask import Blueprint, request, jsonify
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from config import SECRET_KEY, TOKEN_MAX_AGE
from models.patient_model import (
    create_patient,
    find_patient_by_email,
    find_patient_by_aadhar,
    find_patient_by_id,
    verify_password,
)
from database.mongodb import patients_col
from bson import ObjectId

patient_bp = Blueprint("patient", __name__)
serializer = URLSafeTimedSerializer(SECRET_KEY)

REQUIRED_REGISTER_FIELDS = [
    "name", "email", "password", "phone", "dob",
    "gender", "address", "aadhar", "blood_group",
]


def _make_token(patient_id: str) -> str:
    return serializer.dumps({"id": patient_id, "role": "patient"})


def _get_patient_from_token():
    """Extract and validate patient token from Authorization header."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None, "Missing token"
    token = auth.split(" ", 1)[1]
    try:
        data = serializer.loads(token, max_age=TOKEN_MAX_AGE)
        if data.get("role") != "patient":
            return None, "Invalid role"
        return data["id"], None
    except (SignatureExpired, BadSignature):
        return None, "Invalid or expired token"


def _serialize_patient(p: dict) -> dict:
    """Convert MongoDB patient document to JSON-serializable dict."""
    p["_id"] = str(p["_id"])
    p.pop("password", None)
    return p


# ── POST /patient/register ────────────────────────────────────────────
@patient_bp.route("/patient/register", methods=["POST"])
def register():
    data = request.get_json(force=True) or {}

    # Validate required fields
    missing = [f for f in REQUIRED_REGISTER_FIELDS if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    # Check duplicates
    if find_patient_by_email(data["email"]):
        return jsonify({"error": "Email already registered"}), 409

    if patients_col.find_one({"aadhar": data["aadhar"]}):
        return jsonify({"error": "Aadhaar already registered"}), 409

    patient_doc = create_patient(data)
    result = patients_col.insert_one(patient_doc)
    token = _make_token(str(result.inserted_id))

    return jsonify({"message": "Registration successful", "token": token}), 201


# ── POST /patient/login ───────────────────────────────────────────────
@patient_bp.route("/patient/login", methods=["POST"])
def login():
    data = request.get_json(force=True) or {}
    email = data.get("email", "")
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    patient = find_patient_by_email(email)
    if not patient or not verify_password(password, patient["password"]):
        return jsonify({"error": "Invalid email or password"}), 401

    token = _make_token(str(patient["_id"]))
    return jsonify({
        "message": "Login successful",
        "token": token,
        "name": patient["name"],
    }), 200


# ── GET /patient/profile ──────────────────────────────────────────────
@patient_bp.route("/patient/profile", methods=["GET"])
def get_profile():
    patient_id, err = _get_patient_from_token()
    if err:
        return jsonify({"error": err}), 401

    patient = find_patient_by_id(patient_id)
    if not patient:
        return jsonify({"error": "Patient not found"}), 404

    return jsonify(_serialize_patient(patient)), 200


# ── PUT /patient/update ───────────────────────────────────────────────
@patient_bp.route("/patient/update", methods=["PUT"])
def update_profile():
    patient_id, err = _get_patient_from_token()
    if err:
        return jsonify({"error": err}), 401

    data = request.get_json(force=True) or {}

    # Fields allowed to be updated (exclude sensitive ones)
    allowed = [
        "name", "phone", "address", "blood_group",
        "allergies", "medical_conditions", "medications",
        "emergency_name", "emergency_phone", "relationship",
    ]
    updates = {k: v for k, v in data.items() if k in allowed}

    if not updates:
        return jsonify({"error": "No valid fields to update"}), 400

    patients_col.update_one({"_id": ObjectId(patient_id)}, {"$set": updates})
    return jsonify({"message": "Profile updated successfully"}), 200
