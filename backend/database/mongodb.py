from pymongo import MongoClient
client = MongoClient("mongodb://localhost:27017/")
db = client["Health_access_system"]

# Collections
patients_col = db["patients"]
doctors_col  = db["doctors"]
tests_col    = db["tests"]
