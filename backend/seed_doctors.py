"""
seed_doctors.py – Run once to insert default doctor accounts into MongoDB.
Usage: python seed_doctors.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import bcrypt
from database.mongodb import doctors_col

DOCTORS = [
    {
        "doctor_id": "DOC001",
        "name": "Dr. Arjun Sharma",
        "department": "General Medicine",
        "password": "doctor123",
    },
    {
        "doctor_id": "DOC002",
        "name": "Dr. Priya Mehta",
        "department": "Cardiology",
        "password": "doctor456",
    },
    {
        "doctor_id": "DOC003",
        "name": "Dr. Ravi Nair",
        "department": "Pathology",
        "password": "doctor789",
    },
]


def seed():
    inserted = 0
    skipped = 0
    for doc in DOCTORS:
        if doctors_col.find_one({"doctor_id": doc["doctor_id"]}):
            print(f"  [SKIP] {doc['doctor_id']} already exists.")
            skipped += 1
            continue
        hashed_pw = bcrypt.hashpw(doc["password"].encode(), bcrypt.gensalt()).decode()
        doctors_col.insert_one({
            "doctor_id": doc["doctor_id"],
            "name": doc["name"],
            "department": doc["department"],
            "password": hashed_pw,
        })
        print(f"  [OK]   Inserted {doc['doctor_id']} – {doc['name']} ({doc['department']})")
        inserted += 1

    print(f"\nDone: {inserted} inserted, {skipped} skipped.")


if __name__ == "__main__":
    seed()
