import os

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME = "healthcare_portal"
SECRET_KEY = os.getenv("SECRET_KEY", "healthcare_secret_key_2024")
TOKEN_MAX_AGE = 86400  # 24 hours in seconds
