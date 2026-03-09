import bcrypt
from database.mongodb import doctors_col


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def find_doctor_by_id(doctor_id: str):
    return doctors_col.find_one({"doctor_id": doctor_id})
