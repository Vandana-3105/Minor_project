/**
 * Healthcare Portal – app.js
 * Shared JavaScript for all pages.
 * Handles: API calls, auth token management, role guards, form interactions.
 */

const API_BASE = "http://127.0.0.1:5000";

// ── Token helpers ────────────────────────────────────────────────────
function savePatientToken(token) { localStorage.setItem("patient_token", token); }
function getPatientToken() { return localStorage.getItem("patient_token"); }
function clearPatientToken() { localStorage.removeItem("patient_token"); localStorage.removeItem("patient_name"); }

function saveDoctorToken(token, name, dept) {
    localStorage.setItem("doctor_token", token);
    localStorage.setItem("doctor_name", name);
    localStorage.setItem("doctor_dept", dept);
}
function getDoctorToken() { return localStorage.getItem("doctor_token"); }
function clearDoctorToken() {
    ["doctor_token", "doctor_name", "doctor_dept"].forEach(k => localStorage.removeItem(k));
}

// ── Role guards ──────────────────────────────────────────────────────
function patientGuard() {
    if (!getPatientToken()) {
        window.location.href = "patient_login.html";
        return false;
    }
    return true;
}

function doctorGuard() {
    if (!getDoctorToken()) {
        window.location.href = "doctor_login.html";
        return false;
    }
    return true;
}

// ── Generic API fetch ────────────────────────────────────────────────
async function apiFetch(endpoint, method = "GET", body = null, role = null) {
    const headers = { "Content-Type": "application/json" };

    if (role === "patient" && getPatientToken()) {
        headers["Authorization"] = `Bearer ${getPatientToken()}`;
    } else if (role === "doctor" && getDoctorToken()) {
        headers["Authorization"] = `Bearer ${getDoctorToken()}`;
    }

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    try {
        const res = await fetch(`${API_BASE}${endpoint}`, opts);
        const data = await res.json();
        return { ok: res.ok, status: res.status, data };
    } catch (err) {
        return { ok: false, status: 0, data: { error: "Network error – is the server running?" } };
    }
}

// ── Alert helpers ────────────────────────────────────────────────────
function showAlert(message, type = "error", boxId = "alert-box") {
    const box = document.getElementById(boxId);
    if (!box) return;
    box.textContent = message;
    box.className = `alert ${type}`;
    box.classList.remove("hidden");
    setTimeout(() => box.classList.add("hidden"), 6000);
}

function hideAlert(boxId = "alert-box") {
    const box = document.getElementById(boxId);
    if (box) box.classList.add("hidden");
}

// ── Spinner helpers ──────────────────────────────────────────────────
function setLoading(btnId, textId, spinnerId, loading) {
    const btn = document.getElementById(btnId);
    const text = document.getElementById(textId);
    const spin = document.getElementById(spinnerId);
    if (!btn) return;
    btn.disabled = loading;
    if (text) text.classList.toggle("hidden", loading);
    if (spin) spin.classList.toggle("hidden", !loading);
}

// ── Password toggle ──────────────────────────────────────────────────
function initPasswordToggle(toggleId = "toggle-pw", inputId = "password") {
    const btn = document.getElementById(toggleId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;
    btn.addEventListener("click", () => {
        input.type = input.type === "password" ? "text" : "password";
    });
}

// ── Status badge ─────────────────────────────────────────────────────
function statusBadge(status) {
    const map = {
        "Scheduled": "status-scheduled",
        "In Progress": "status-in-progress",
        "Completed": "status-completed",
        "Cancelled": "status-cancelled",
    };
    const cls = map[status] || "status-scheduled";
    return `<span class="status-badge ${cls}">${status}</span>`;
}

// ── Info field HTML ──────────────────────────────────────────────────
function infoField(label, value) {
    return `<div class="info-field">
    <span class="info-label">${label}</span>
    <span class="info-value">${value || "–"}</span>
  </div>`;
}

// ════════════════════════════════════════════════════════════════════
//  PAGE INITIALIZERS
// ════════════════════════════════════════════════════════════════════

// ── Patient Login ────────────────────────────────────────────────────
function initPatientLogin() {
    // If already logged in, redirect
    if (getPatientToken()) { window.location.href = "patient_dashboard.html"; return; }

    initPasswordToggle();

    document.getElementById("patient-login-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        hideAlert();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        if (!email || !password) { showAlert("Please fill in all fields."); return; }

        setLoading("login-btn", "btn-text", "btn-spinner", true);

        const { ok, data } = await apiFetch("/patient/login", "POST", { email, password });

        setLoading("login-btn", "btn-text", "btn-spinner", false);

        if (ok) {
            savePatientToken(data.token);
            localStorage.setItem("patient_name", data.name);
            window.location.href = "patient_dashboard.html";
        } else {
            showAlert(data.error || "Login failed. Please try again.");
        }
    });
}

// ── Patient Register ─────────────────────────────────────────────────
function initPatientRegister() {
    if (getPatientToken()) { window.location.href = "patient_dashboard.html"; return; }

    initPasswordToggle();

    let currentStep = 1;
    const totalSteps = 3;

    function goToStep(step) {
        document.getElementById(`section-${currentStep}`).classList.add("hidden");
        document.getElementById(`section-${currentStep}`).classList.remove("active");

        currentStep = step;
        document.getElementById(`section-${step}`).classList.remove("hidden");
        document.getElementById(`section-${step}`).classList.add("active");

        // Update progress indicator
        document.querySelectorAll(".step").forEach(el => {
            const s = parseInt(el.dataset.step);
            el.classList.toggle("active", s === step);
            el.classList.toggle("done", s < step);
        });

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Step navigation buttons
    document.getElementById("next-1").addEventListener("click", () => {
        const requiredFields = ["name", "dob", "gender", "email", "phone", "aadhar", "address", "password", "confirm-password"];
        for (const id of requiredFields) {
            const el = document.getElementById(id);
            if (!el || !el.value.trim()) {
                showAlert(`Please fill in all required fields.`); return;
            }
        }
        const pass = document.getElementById("password").value;
        const conf = document.getElementById("confirm-password").value;
        if (pass.length < 6) { showAlert("Password must be at least 6 characters."); return; }
        if (pass !== conf) { showAlert("Passwords do not match."); return; }
        const aadhar = document.getElementById("aadhar").value.trim();
        if (!/^\d{12}$/.test(aadhar)) { showAlert("Aadhaar must be a 12-digit number."); return; }
        hideAlert();
        goToStep(2);
    });

    document.getElementById("back-1").addEventListener("click", () => goToStep(1));

    document.getElementById("next-2").addEventListener("click", () => {
        const bg = document.getElementById("blood_group").value;
        if (!bg) { showAlert("Please select a blood group."); return; }
        hideAlert();
        goToStep(3);
    });

    document.getElementById("back-2").addEventListener("click", () => goToStep(2));

    // Final submit
    document.getElementById("register-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        hideAlert();

        const requiredEmergency = ["emergency_name", "emergency_phone", "relationship"];
        for (const id of requiredEmergency) {
            const el = document.getElementById(id);
            if (!el || !el.value.trim()) { showAlert("Please fill in all emergency contact fields."); return; }
        }

        setLoading("register-btn", "btn-text", "btn-spinner", true);

        const payload = {
            name: document.getElementById("name").value.trim(),
            dob: document.getElementById("dob").value,
            gender: document.getElementById("gender").value,
            email: document.getElementById("email").value.trim(),
            phone: document.getElementById("phone").value.trim(),
            aadhar: document.getElementById("aadhar").value.trim(),
            address: document.getElementById("address").value.trim(),
            password: document.getElementById("password").value,
            blood_group: document.getElementById("blood_group").value,
            allergies: document.getElementById("allergies").value.trim(),
            medical_conditions: document.getElementById("medical_conditions").value.trim(),
            medications: document.getElementById("medications").value.trim(),
            emergency_name: document.getElementById("emergency_name").value.trim(),
            emergency_phone: document.getElementById("emergency_phone").value.trim(),
            relationship: document.getElementById("relationship").value,
        };

        const { ok, data } = await apiFetch("/patient/register", "POST", payload);

        setLoading("register-btn", "btn-text", "btn-spinner", false);

        if (ok) {
            savePatientToken(data.token);
            window.location.href = "patient_dashboard.html";
        } else {
            showAlert(data.error || "Registration failed.");
        }
    });
}

// ── Patient Dashboard ─────────────────────────────────────────────────
function initPatientDashboard() {
    if (!patientGuard()) return;

    // Sidebar navigation
    let activeSection = "profile";

    function switchSection(name) {
        document.querySelectorAll(".section").forEach(s => s.classList.add("hidden"));
        document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
        const sec = document.getElementById(`section-${name}`);
        if (sec) { sec.classList.remove("hidden"); sec.classList.add("active"); }
        const nav = document.getElementById(`nav-${name}`);
        if (nav) nav.classList.add("active");
        document.getElementById("section-title").textContent = {
            profile: "My Profile",
            health: "Health Records",
            schedule: "Schedule Test",
            history: "Appointment History",
        }[name] || "";
        activeSection = name;
        if (name === "history") loadHistory();
        if (name === "health" || name === "profile") {/* already loaded */ }
    }

    document.querySelectorAll(".nav-item").forEach(btn => {
        btn.addEventListener("click", () => switchSection(btn.dataset.section));
    });

    // Mobile menu
    const sidebar = document.getElementById("sidebar");
    document.getElementById("mobile-menu-btn").addEventListener("click", () => {
        sidebar.classList.toggle("open");
    });
    document.getElementById("dashboard-main").addEventListener("click", () => {
        sidebar.classList.remove("open");
    });

    // Logout
    document.getElementById("patient-logout").addEventListener("click", () => {
        clearPatientToken();
        window.location.href = "patient_login.html";
    });

    // Load profile
    let patientData = null;

    async function loadProfile() {
        const { ok, data } = await apiFetch("/patient/profile", "GET", null, "patient");
        if (!ok) { showAlert("Session expired. Please log in again."); setTimeout(() => { clearPatientToken(); window.location.href = "patient_login.html"; }, 1500); return; }
        patientData = data;
        renderProfile(data);
        renderHealthRecords(data);
    }

    function renderProfile(p) {
        const name = p.name || "Patient";
        document.getElementById("sidebar-name").textContent = name;
        document.getElementById("user-avatar").textContent = name.charAt(0).toUpperCase();
        document.getElementById("profile-avatar-xl").textContent = name.charAt(0).toUpperCase();
        document.getElementById("profile-name-display").textContent = name;
        document.getElementById("profile-email-display").textContent = p.email || "";

        document.getElementById("profile-info-grid").innerHTML = [
            infoField("Full Name", p.name),
            infoField("Date of Birth", p.dob),
            infoField("Gender", p.gender),
            infoField("Phone", p.phone),
            infoField("Email", p.email),
            infoField("Aadhaar", p.aadhar ? "●●●●-●●●●-" + p.aadhar.slice(-4) : "–"),
            infoField("Blood Group", p.blood_group),
            infoField("Address", p.address),
        ].join("");

        // Pre-fill edit form
        if (document.getElementById("edit-name")) document.getElementById("edit-name").value = p.name || "";
        if (document.getElementById("edit-phone")) document.getElementById("edit-phone").value = p.phone || "";
        if (document.getElementById("edit-address")) document.getElementById("edit-address").value = p.address || "";
        if (document.getElementById("edit-emergency-name")) document.getElementById("edit-emergency-name").value = p.emergency_name || "";
        if (document.getElementById("edit-emergency-phone")) document.getElementById("edit-emergency-phone").value = p.emergency_phone || "";
    }

    function renderHealthRecords(p) {
        document.getElementById("hc-blood").textContent = p.blood_group || "–";
        document.getElementById("hc-allergies").textContent = p.allergies || "None reported";
        document.getElementById("hc-conditions").textContent = p.medical_conditions || "None reported";
        document.getElementById("hc-medications").textContent = p.medications || "None reported";

        document.getElementById("emergency-info-grid").innerHTML = [
            infoField("Contact Name", p.emergency_name),
            infoField("Contact Phone", p.emergency_phone),
            infoField("Relationship", p.relationship),
        ].join("");
    }

    // Profile Edit
    document.getElementById("edit-profile-btn").addEventListener("click", () => {
        document.getElementById("edit-profile-form").classList.toggle("hidden");
    });
    document.getElementById("cancel-edit-btn").addEventListener("click", () => {
        document.getElementById("edit-profile-form").classList.add("hidden");
    });
    document.getElementById("edit-profile-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const updates = {
            name: document.getElementById("edit-name").value.trim(),
            phone: document.getElementById("edit-phone").value.trim(),
            address: document.getElementById("edit-address").value.trim(),
            emergency_name: document.getElementById("edit-emergency-name").value.trim(),
            emergency_phone: document.getElementById("edit-emergency-phone").value.trim(),
        };
        const { ok, data } = await apiFetch("/patient/update", "PUT", updates, "patient");
        if (ok) {
            showAlert("Profile updated successfully!", "success");
            document.getElementById("edit-profile-form").classList.add("hidden");
            await loadProfile();
        } else {
            showAlert(data.error || "Update failed.");
        }
    });

    // Test scheduling
    const today = new Date().toISOString().split("T")[0];
    if (document.getElementById("test_date")) document.getElementById("test_date").min = today;

    document.getElementById("schedule-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        hideAlert();
        const test_type = document.getElementById("test_type").value;
        const date = document.getElementById("test_date").value;
        const time = document.getElementById("test_time").value;
        const notes = document.getElementById("test_notes").value.trim();

        if (!test_type || !date || !time) { showAlert("Please fill in all required fields."); return; }

        setLoading("schedule-btn", "sched-btn-text", "sched-spinner", true);
        const { ok, data } = await apiFetch("/tests/schedule", "POST", { test_type, date, time, notes }, "patient");
        setLoading("schedule-btn", "sched-btn-text", "sched-spinner", false);

        if (ok) {
            showAlert("Test scheduled successfully!", "success");
            document.getElementById("schedule-form").reset();
        } else {
            showAlert(data.error || "Failed to schedule test.");
        }
    });

    // History
    let allTests = [];

    async function loadHistory() {
        const tbody = document.getElementById("history-tbody");
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Loading…</td></tr>`;
        const { ok, data } = await apiFetch("/tests/history", "GET", null, "patient");
        if (!ok) { tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Failed to load tests.</td></tr>`; return; }
        allTests = data.tests || [];
        renderHistoryTable(allTests);
    }

    function renderHistoryTable(tests) {
        const tbody = document.getElementById("history-tbody");
        if (!tests.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No appointments found. Schedule your first test!</td></tr>`;
            return;
        }
        tbody.innerHTML = tests.map(t => `
      <tr>
        <td>${t.test_type}</td>
        <td>${t.date}</td>
        <td>${t.time}</td>
        <td>${statusBadge(t.status)}</td>
        <td>${t.notes || "–"}</td>
      </tr>
    `).join("");
    }

    // Search filter
    document.getElementById("history-search").addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase();
        renderHistoryTable(allTests.filter(t => t.test_type.toLowerCase().includes(q) || (t.notes || "").toLowerCase().includes(q)));
    });

    // Init
    loadProfile();
}


// ── Doctor Login ──────────────────────────────────────────────────────
function initDoctorLogin() {
    if (getDoctorToken()) { window.location.href = "doctor_dashboard.html"; return; }

    initPasswordToggle();

    document.getElementById("doctor-login-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        hideAlert();
        const doctor_id = document.getElementById("doctor_id").value.trim();
        const password = document.getElementById("password").value;

        if (!doctor_id || !password) { showAlert("Please fill in all fields."); return; }

        setLoading("login-btn", "btn-text", "btn-spinner", true);
        const { ok, data } = await apiFetch("/doctor/login", "POST", { doctor_id, password });
        setLoading("login-btn", "btn-text", "btn-spinner", false);

        if (ok) {
            saveDoctorToken(data.token, data.name, data.department);
            window.location.href = "doctor_dashboard.html";
        } else {
            showAlert(data.error || "Login failed.");
        }
    });
}


// ── Doctor Dashboard ──────────────────────────────────────────────────
function initDoctorDashboard() {
    if (!doctorGuard()) return;

    // Sidebar info
    const dName = localStorage.getItem("doctor_name") || "Doctor";
    const dDept = localStorage.getItem("doctor_dept") || "";
    document.getElementById("sidebar-name").textContent = dName;
    document.getElementById("sidebar-dept").textContent = dDept;
    document.getElementById("user-avatar").textContent = dName.charAt(0).toUpperCase();

    // Section switching
    function switchSection(name) {
        document.querySelectorAll(".section").forEach(s => s.classList.add("hidden"));
        document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
        const sec = document.getElementById(`section-${name}`);
        if (sec) { sec.classList.remove("hidden"); sec.classList.add("active"); }
        const nav = document.getElementById(`nav-${name}`);
        if (nav) nav.classList.add("active");
        document.getElementById("section-title").textContent = {
            search: "Patient Search",
            tests: "Test Management",
        }[name] || "";
        if (name === "tests") loadAllTests();
    }

    document.querySelectorAll(".nav-item").forEach(btn => {
        btn.addEventListener("click", () => switchSection(btn.dataset.section));
    });

    // Mobile menu
    const sidebar = document.getElementById("sidebar");
    document.getElementById("mobile-menu-btn").addEventListener("click", () => sidebar.classList.toggle("open"));
    document.getElementById("dashboard-main").addEventListener("click", () => sidebar.classList.remove("open"));

    // Logout
    document.getElementById("doctor-logout").addEventListener("click", () => {
        clearDoctorToken();
        window.location.href = "doctor_login.html";
    });

    // Patient search
    document.getElementById("search-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        hideAlert();
        const aadhar = document.getElementById("search-aadhar").value.trim();
        if (!aadhar || !/^\d{12}$/.test(aadhar)) { showAlert("Please enter a valid 12-digit Aadhaar number."); return; }

        setLoading("search-btn", "search-btn-text", "search-spinner", true);
        document.getElementById("patient-result").classList.add("hidden");

        const { ok, data } = await apiFetch("/doctor/search_patient", "POST", { aadhar }, "doctor");

        setLoading("search-btn", "search-btn-text", "search-spinner", false);

        if (!ok) { showAlert(data.error || "Search failed."); return; }

        renderPatientResult(data.patient, data.tests);
    });

    function renderPatientResult(p, tests) {
        const name = p.name || "Patient";
        document.getElementById("result-avatar").textContent = name.charAt(0).toUpperCase();
        document.getElementById("result-name").textContent = name;
        document.getElementById("result-sub").textContent = `${p.gender || ""} • ${p.dob || ""} • ${p.phone || ""}`;

        // Personal info grid
        document.getElementById("result-personal-grid").innerHTML = [
            infoField("Full Name", p.name),
            infoField("Date of Birth", p.dob),
            infoField("Gender", p.gender),
            infoField("Phone", p.phone),
            infoField("Email", p.email),
            infoField("Aadhaar", p.aadhar ? "●●●●-●●●●-" + p.aadhar.slice(-4) : "–"),
            infoField("Address", p.address),
        ].join("");

        // Health info
        document.getElementById("r-blood").textContent = p.blood_group || "–";
        document.getElementById("r-allergies").textContent = p.allergies || "None reported";
        document.getElementById("r-conditions").textContent = p.medical_conditions || "None reported";
        document.getElementById("r-medications").textContent = p.medications || "None reported";

        // Emergency
        document.getElementById("result-emergency-grid").innerHTML = [
            infoField("Contact Name", p.emergency_name),
            infoField("Contact Phone", p.emergency_phone),
            infoField("Relationship", p.relationship),
        ].join("");

        // Tests table
        const tbody = document.getElementById("patient-tests-tbody");
        if (!tests.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No tests scheduled.</td></tr>`;
        } else {
            tbody.innerHTML = tests.map(t => `
        <tr>
          <td>${t.test_type}</td>
          <td>${t.date}</td>
          <td>${t.time}</td>
          <td>${statusBadge(t.status)}</td>
          <td>${t.notes || "–"}</td>
          <td><button class="btn-update" data-id="${t._id}" data-type="${t.test_type}" data-status="${t.status}">
            Update Status
          </button></td>
        </tr>
      `).join("");

            tbody.querySelectorAll(".btn-update").forEach(btn => {
                btn.addEventListener("click", () => openModal(btn.dataset.id, btn.dataset.type, btn.dataset.status));
            });
        }

        // Show result
        document.getElementById("patient-result").classList.remove("hidden");
        document.getElementById("patient-result").scrollIntoView({ behavior: "smooth" });

        // Tabs
        initTabs("patient-tabs", ["tab-personal", "tab-health-info", "tab-emergency"]);
    }

    // All tests section
    let allTestsData = [];

    async function loadAllTests() {
        // We load all tests by searching without aadhar – use a special doctor endpoint
        // Since our API only has history per patient, we use GET /tests/history for all won't work.
        // Instead, for Test Management, fetch all tests directly from DB via doctor-scoped endpoint.
        // We'll repurpose the doctor search to get all tests. For simplicity we query all tests on the backend.
        const tbody = document.getElementById("all-tests-tbody");
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Loading…</td></tr>`;

        const { ok, data } = await apiFetch("/doctor/all_tests", "GET", null, "doctor");
        if (!ok) {
            tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No tests available or could not load.</td></tr>`;
            return;
        }
        allTestsData = data.tests || [];
        renderAllTests(allTestsData);
    }

    function renderAllTests(tests) {
        const tbody = document.getElementById("all-tests-tbody");
        if (!tests.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No tests found.</td></tr>`;
            return;
        }
        tbody.innerHTML = tests.map(t => `
      <tr>
        <td><code style="font-size:11px;color:var(--grey-400)">${t.patient_id.slice(-6)}</code></td>
        <td>${t.test_type}</td>
        <td>${t.date}</td>
        <td>${t.time}</td>
        <td>${statusBadge(t.status)}</td>
        <td><button class="btn-update" data-id="${t._id}" data-type="${t.test_type}" data-status="${t.status}">
          Update
        </button></td>
      </tr>
    `).join("");

        tbody.querySelectorAll(".btn-update").forEach(btn => {
            btn.addEventListener("click", () => openModal(btn.dataset.id, btn.dataset.type, btn.dataset.status, true));
        });
    }

    // Filter tests
    function filterAllTests() {
        const q = document.getElementById("tests-search").value.toLowerCase();
        const st = document.getElementById("status-filter").value;
        renderAllTests(allTestsData.filter(t =>
            (t.test_type.toLowerCase().includes(q)) &&
            (!st || t.status === st)
        ));
    }
    document.getElementById("tests-search").addEventListener("input", filterAllTests);
    document.getElementById("status-filter").addEventListener("change", filterAllTests);

    // ── Modal ─────────────────────────────────────────────────────────
    let modalTestId = null;
    let modalRefreshAll = false;

    function openModal(testId, testName, currentStatus, refreshAll = false) {
        modalTestId = testId;
        modalRefreshAll = refreshAll;
        document.getElementById("modal-test-name").textContent = testName;
        document.getElementById("status-select").value = currentStatus;
        document.getElementById("update-modal").classList.remove("hidden");
    }

    function closeModal() { document.getElementById("update-modal").classList.add("hidden"); }

    document.getElementById("modal-close").addEventListener("click", closeModal);
    document.getElementById("modal-cancel-btn").addEventListener("click", closeModal);
    document.getElementById("update-modal").addEventListener("click", (e) => {
        if (e.target === e.currentTarget) closeModal();
    });

    document.getElementById("modal-confirm-btn").addEventListener("click", async () => {
        const newStatus = document.getElementById("status-select").value;
        const { ok, data } = await apiFetch("/doctor/update_test_status", "PUT",
            { test_id: modalTestId, status: newStatus }, "doctor");

        if (ok) {
            showAlert("Test status updated successfully!", "success");
            closeModal();
            if (modalRefreshAll) loadAllTests();
            // Also refresh patient search result if visible
            const result = document.getElementById("patient-result");
            if (!result.classList.contains("hidden")) {
                const aadhar = document.getElementById("search-aadhar").value.trim();
                if (aadhar) {
                    const { ok: ok2, data: d2 } = await apiFetch("/doctor/search_patient", "POST", { aadhar }, "doctor");
                    if (ok2) renderPatientResult(d2.patient, d2.tests);
                }
            }
        } else {
            showAlert(data.error || "Update failed.");
        }
    });
}

// ── Tab initializer ───────────────────────────────────────────────────
function initTabs(tabNavId, contentIds) {
    const tabNav = document.getElementById(tabNavId);
    if (!tabNav) return;
    tabNav.querySelectorAll(".tab").forEach((tab, i) => {
        tab.addEventListener("click", () => {
            tabNav.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
            contentIds.forEach(id => document.getElementById(id)?.classList.add("hidden"));
            tab.classList.add("active");
            document.getElementById(contentIds[i])?.classList.remove("hidden");
        });
    });
}
