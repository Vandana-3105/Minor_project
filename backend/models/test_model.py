from bson import ObjectId
from database.mongodb import tests_col


def create_test(data: dict) -> dict:
    return {
        "patient_id": data["patient_id"],
        "test_type": data["test_type"],
        "date": data["date"],
        "time": data["time"],
        "notes": data.get("notes", ""),
        "status": "Scheduled",
    }


def get_tests_by_patient(patient_id: str):
    return list(tests_col.find({"patient_id": patient_id}))


def find_test_by_id(test_id: str):
    try:
        return tests_col.find_one({"_id": ObjectId(test_id)})
    except Exception:
        return None
