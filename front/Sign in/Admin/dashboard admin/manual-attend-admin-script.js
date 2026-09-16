const API_BASE_URL = 'http://localhost:3000/api/v1';

// --- 1. الدوال المساعدة ---
function getAuthToken() {
    let token = localStorage.getItem('token');
    if (!token) return "";
    token = token.replace(/['"]+/g, '').trim();
    return token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
}

document.addEventListener('DOMContentLoaded', async () => {
    // تحديث الاسم (آية الله)
    const nameDisplay = document.getElementById('adminName') || document.getElementById('userNameDisplay');
    const savedName = localStorage.getItem('username');
    if (nameDisplay) nameDisplay.textContent = savedName ? savedName : "Aya_allah";

    await loadCoursesToSelect();
    await loadRecentRecords();

    const courseSelect = document.getElementById('courseSelect');
    if (courseSelect) {
        courseSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            // قراءة عدد السكاشن من الداتا اللي جاية من الـ API
            const sectionCount = selectedOption.getAttribute('data-sections') || 1;
            updateSections(sectionCount);
        });
    }
});

// --- 2. إدارة البيانات (API) ---

async function loadCoursesToSelect() {
    const courseSelect = document.getElementById('courseSelect');
    if (!courseSelect) return;

    try {
        const res = await fetch(`${API_BASE_URL}/courses`, {
            headers: { 'Authorization': getAuthToken() }
        });
        const result = await res.json();
        const courses = result.data || result;

        if (Array.isArray(courses)) {
            courseSelect.innerHTML = '<option value="">Select Course</option>';
            courses.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id || c._id; // دعم أنواع الـ ID المختلفة
                opt.textContent = c.name;
                opt.setAttribute('data-sections', c.sectionsCount || 4); // سيكشن افتراضي لو مش موجود
                courseSelect.appendChild(opt);
            });
        }
    } catch (e) { console.error("Course Load Failed", e); }
}

async function loadRecentRecords() {
    const recordsContainer = document.querySelector('.recent-records-list');
    if (!recordsContainer) return;

    try {
        const res = await fetch(`${API_BASE_URL}/attendance`, {
            headers: { 'Authorization': getAuthToken() }
        });
        const result = await res.json();
        const records = result.data || result;

        recordsContainer.innerHTML = ''; 

        if (Array.isArray(records) && records.length > 0) {
            records.slice(0, 5).forEach(record => {
                // حساب النسبة المئوية للحضور
                const attendanceRate = record.totalStudents > 0 
                    ? Math.round((record.presentCount / record.totalStudents) * 100) 
                    : 0;

                const div = document.createElement('div');
                div.className = 'record-item'; 
                div.innerHTML = `
                    <div class="record-info">
                        <h3>${record.courseName || 'Course'} - Section ${record.sectionName || 'A'}</h3>
                        <p>${new Date(record.date).toLocaleDateString()}</p>
                    </div>
                    <div class="record-stats">
                        <span>${record.presentCount || 0}/${record.totalStudents || 0} students</span>
                        <span class="percentage" style="color: ${attendanceRate > 70 ? '#10b981' : '#f59e0b'}">
                            ${attendanceRate}% attendance
                        </span>
                    </div>`;
                recordsContainer.appendChild(div);
            });
        } else {
            recordsContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#8e8e93;">No recent records found.</div>';
        }
    } catch (e) { console.error("Records Load Failed", e); }
}

// فتح المودال وجلب الطلاب الفعليين
async function openDetails() {
    const courseId = document.getElementById('courseSelect').value;
    const sectionName = document.getElementById('sectionSelect').value;
    const date = document.getElementById('dateInput').value;

    if (!courseId || !sectionName || !date) {
        alert("Please select Course, Section, and Date!");
        return;
    }

    // عرض بيانات البحث في المودال
    document.getElementById('disp-course').innerText = document.getElementById('courseSelect').options[document.getElementById('courseSelect').selectedIndex].text;
    document.getElementById('disp-section').innerText = `Section ${String.fromCharCode(64 + parseInt(sectionName))}`;
    document.getElementById('disp-date').innerText = date;

    const tableBody = document.querySelector('#detailsModal table tbody');
    tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Loading Students List...</td></tr>';

    try {
        // نستخدم API الكورسات لجلب الطلاب المسجلين فيها
        const res = await fetch(`${API_BASE_URL}/courses/${courseId}/students`, {
            headers: { 'Authorization': getAuthToken() }
        });
        const result = await res.json();
        const students = result.data || result;

        tableBody.innerHTML = ''; 

        if (Array.isArray(students) && students.length > 0) {
            students.forEach(s => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${s.studentCode || 'N/A'}</td>
                    <td>${s.name || s.username}</td>
                    <td>
                        <select class="status-select" data-student-id="${s.id || s._id}">
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="late">Late</option>
                        </select>
                    </td>`;
                tableBody.appendChild(tr);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No students found for this course.</td></tr>';
        }
    } catch (e) { tableBody.innerHTML = '<tr><td colspan="3" style="color:#ef4444;">Error connection to server.</td></tr>'; }

    document.getElementById('detailsModal').style.display = 'flex';
}

// حفظ الحضور النهائي
async function saveAttendance() {
    const rows = document.querySelectorAll('.status-select');
    const courseId = document.getElementById('courseSelect').value;
    const sectionName = document.getElementById('sectionSelect').value;
    const date = document.getElementById('dateInput').value;
    
    // تجهيز الداتا بصيغة الـ JSON المطلوبة للـ API
    const attendanceData = {
        courseId: courseId,
        section: sectionName,
        date: date,
        records: Array.from(rows).map(select => ({
            studentId: select.getAttribute('data-student-id'),
            status: select.value
        }))
    };

    try {
        const response = await fetch(`${API_BASE_URL}/attendance/manual`, {
            method: 'POST',
            headers: { 
                'Authorization': getAuthToken(), 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(attendanceData)
        });

        if (response.ok) {
            alert("Attendance updated successfully! 🎉");
            closeDetails();
            await loadRecentRecords(); // تحديث السجلات فوراً
        } else {
            const err = await response.json();
            alert("Error: " + (err.message || "Failed to save"));
        }
    } catch (e) { console.error("Save Error", e); }
}

// --- 3. وظائف الواجهة ---
function updateSections(count) {
    const sectionSelect = document.getElementById('sectionSelect');
    if (!sectionSelect) return;
    sectionSelect.innerHTML = '<option value="">Select Section</option>';
    for (let i = 1; i <= count; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = `Section ${String.fromCharCode(64 + i)}`;
        sectionSelect.appendChild(opt);
    }
}

function closeDetails() {
    document.getElementById('detailsModal').style.display = 'none';
}

function logout() {
    localStorage.clear();
    window.location.href = "../../index.html";
}