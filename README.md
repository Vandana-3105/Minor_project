# Healthcare Portal

A full-stack, role-based healthcare web application with a Python Flask backend, MongoDB database, and plain HTML/CSS/JS frontend.

---

## Tech Stack

| Layer     | Technology              |
|-----------|-------------------------|
| Frontend  | HTML5, CSS3, JavaScript |
| Backend   | Python Flask            |
| Database  | MongoDB (PyMongo)       |
| Auth      | `itsdangerous` tokens   |
| Security  | `bcrypt` password hashing |

---

## Project Structure

```
Health_care/
├── backend/
│   ├── app.py                  # Flask entry point
│   ├── config.py               # Configuration constants
│   ├── seed_doctors.py         # One-time doctor seeding script
│   ├── database/
│   │   └── mongodb.py          # PyMongo connection
│   ├── models/
│   │   ├── patient_model.py
│   │   ├── doctor_model.py
│   │   └── test_model.py
│   └── routes/
│       ├── patient_routes.py
│       ├── doctor_routes.py
│       └── test_routes.py
├── frontend/
│   ├── index.html              # Role selection
│   ├── patient_login.html
│   ├── patient_register.html
│   ├── patient_dashboard.html
│   ├── doctor_login.html
│   ├── doctor_dashboard.html
│   ├── css/styles.css
│   └── js/app.js
└── requirements.txt
```

---

## Setup & Running

### Prerequisites
- Python 3.8+
- MongoDB running locally on `mongodb://localhost:27017/`

### 1. Install dependencies

```powershell
cd backend
pip install -r ..\requirements.txt
```

### 2. Seed doctor accounts (run once)

```powershell
python seed_doctors.py
```

This creates the following doctor accounts:

| Doctor ID | Password   | Department       |
|-----------|------------|------------------|
| DOC001    | doctor123  | General Medicine |
| DOC002    | doctor456  | Cardiology       |
| DOC003    | doctor789  | Pathology        |

### 3. Start the Flask server

```powershell
python app.py
```

The server runs at: **http://127.0.0.1:5000**

### 4. Open the app

Navigate to **http://127.0.0.1:5000** in your browser.

---

## API Endpoints

### Patient

| Method | Endpoint             | Description             |
|--------|----------------------|-------------------------|
| POST   | `/patient/register`  | Register new patient    |
| POST   | `/patient/login`     | Patient login           |
| GET    | `/patient/profile`   | Get patient profile     |
| PUT    | `/patient/update`    | Update patient profile  |

### Tests

| Method | Endpoint          | Description                   |
|--------|-------------------|-------------------------------|
| POST   | `/tests/schedule` | Schedule a medical test        |
| GET    | `/tests/history`  | Get patient's test history     |

### Doctor

| Method | Endpoint                    | Description               |
|--------|-----------------------------|---------------------------|
| POST   | `/doctor/login`             | Doctor login              |
| POST   | `/doctor/search_patient`    | Search patient by Aadhaar |
| PUT    | `/doctor/update_test_status`| Update test status        |
| GET    | `/doctor/all_tests`         | Get all tests (for TM)    |

---

## MongoDB

Database: `healthcare_portal`

Collections:
- `patients` – patient records with hashed passwords
- `doctors` – hospital doctor accounts
- `tests` – scheduled medical tests

---

## Role Separation

- **Patients** authenticate via email + password. Token payload: `{role: "patient"}`
- **Doctors** authenticate via Doctor ID + password. Token payload: `{role: "doctor"}`
- All protected API routes verify the token **and** assert the correct role
- Frontend role guards redirect unauthenticated/wrong-role users immediately

---

## Default Test Statuses

`Scheduled` → `In Progress` → `Completed` / `Cancelled`
