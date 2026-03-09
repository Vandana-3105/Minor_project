import bcrypt
from bson import ObjectId
from database.mongodb import patients_col


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_patient(data: dict) -> dict:
    return {
        "name": data["name"],
        "email": data["email"].lower().strip(),
        "phone": data["phone"],
        "aadhar": data["aadhar"],
        "dob": data["dob"],
        "gender": data["gender"],
        "address": data["address"],
        "blood_group": data["blood_group"],
        "allergies": data.get("allergies", ""),
        "medical_conditions": data.get("medical_conditions", ""),
        "medications": data.get("medications", ""),
        "emergency_name": data.get("emergency_name", ""),
        "emergency_phone": data.get("emergency_phone", ""),
        "relationship": data.get("relationship", ""),
        "password": hash_password(data["password"]),
    }


def find_patient_by_email(email: str):
    return patients_col.find_one({"email": email.lower().strip()})


def find_patient_by_aadhar(aadhar: str):
    return patients_col.find_one({"aadhar": aadhar})


def find_patient_by_id(patient_id: str):
    try:
        return patients_col.find_one({"_id": ObjectId(patient_id)})
    except Exception:
        return None
