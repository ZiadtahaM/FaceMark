const API_BASE_URL = 'http://localhost:3000/api/v1';

document.addEventListener('DOMContentLoaded', async () => {
    
    // === 0. تحديث اسم المستخدم ===
    const nameDisplay = document.getElementById('adminName'); 
    const savedName = localStorage.getItem('username');
    if (nameDisplay) {
        nameDisplay.textContent = savedName || "Aya_allah";
    }

    // === 1. وظيفة التحكم في حجم السايد بار ===
    const sidebar = document.querySelector('.sidebar');
    const resizer = document.getElementById('sidebarResizer');

    if (resizer && sidebar) {
        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', stopResize);
            document.body.style.cursor = 'col-resize';
        });

        function resize(e) {
            let newWidth = e.clientX;
            if (newWidth > 200 && newWidth < 500) {
                sidebar.style.width = newWidth + 'px';
            }
        }

        function stopResize() {
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
            document.body.style.cursor = 'default';
        }
    }

    // === 2. تحميل الكورسات للفلتر فور فتح الصفحة ===
    await loadCoursesForFilter();
});

// دالة لجلب الكورسات من السيرفر
async function loadCoursesForFilter() {
    const select = document.getElementById('filterCourse');
    if (!select) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/courses`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        const courses = data.data || data;

        if (Array.isArray(courses)) {
            courses.forEach(course => {
                const opt = document.createElement('option');
                opt.value = course.id || course._id;
                opt.textContent = course.name;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Error loading courses:", e);
    }
}

// === 3. وظيفة البحث الأساسية ===
async function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    const type = document.getElementById('searchType').value;
    const courseId = document.getElementById('filterCourse').value;
    const container = document.getElementById('searchResultsContainer');
    const searchBtn = document.querySelector('.btn-search');

    // إظهار حالة التحميل
    container.innerHTML = `
        <div style="text-align: center; padding: 50px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #4e73df;"></i>
            <p style="margin-top: 15px; color: #888;">Searching system records...</p>
        </div>
    `;
    searchBtn.disabled = true;

    try {
        const token = localStorage.getItem('token');
        
        // بناء الرابط (URL) حسب الـ Swagger
        let url = `${API_BASE_URL}/users?role=${type.toLowerCase()}`;
        if (query) url += `&search=${encodeURIComponent(query)}`;
        if (courseId !== 'all') url += `&courseId=${courseId}`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) logout();

        const data = await response.json();
        const results = data.data || data;

        if (Array.isArray(results) && results.length > 0) {
            renderTable(results);
        } else {
            container.innerHTML = `
                <div class="empty-results" style="text-align: center; padding: 50px; opacity: 0.5;">
                    <i class="fas fa-folder-open" style="font-size: 3rem;"></i>
                    <p style="margin-top: 15px;">No results found for your search.</p>
                </div>`;
        }
    } catch (error) {
        console.error("Search Error:", error);
        container.innerHTML = `
            <div style="text-align: center; color: #ff4757; padding: 50px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem;"></i>
                <p style="margin-top: 15px;">Server connection error.</p>
            </div>`;
    } finally {
        searchBtn.disabled = false;
    }
}

// === 4. رسم جدول النتائج ومعالجة الـ ID ===
function renderTable(data) {
    const container = document.getElementById('searchResultsContainer');
    const resultsCount = document.getElementById('resultsCount');
    
    if (resultsCount) resultsCount.textContent = `(${data.length} results found)`;

    let html = `
        <div class="table-responsive">
            <table class="search-results-table">
                <thead>
                    <tr>
                        <th>User Info</th>
                        <th>Identifier</th>
                        <th>Role</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    data.forEach(item => {
        // فحص شامل لضمان الحصول على الـ ID الصحيح (id أو _id)
        const userId = item.id || item._id || item.userId || null;
        const name = item.name || item.username || item.fullName || "Unknown";
        const email = item.email || "No email available";
        const role = item.role || "User";

        html += `
            <tr>
                <td>
                    <div class="user-cell">
                        <div class="user-icon"><i class="fas fa-user-circle"></i></div>
                        <div class="user-details">
                            <span class="user-name">${name}</span>
                            <span class="user-email">${email}</span>
                        </div>
                    </div>
                </td>
                <td><span class="id-tag">ID: ${userId ? userId : 'N/A'}</span></td>
                <td><span class="role-label">${role}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action view" onclick="viewDetails('${userId}')" title="View"><i class="fas fa-eye"></i></button>
                        <button class="btn-action delete" onclick="deleteEntry('${userId}')" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

// === 5. وظيفة الحذف الحقيقية (DELETE API) ===
async function deleteEntry(id) {
    // التأكد أن الـ ID موجود فعلاً وليس كلمة "null" أو "N/A"
    if (!id || id === 'null' || id === 'undefined' || id === 'N/A') {
        return alert("Cannot delete: Missing user ID.");
    }

    if (confirm("Are you sure you want to delete this user permanently?")) {
        try {
            const token = localStorage.getItem('token');
            // استدعاء API الحذف حسب الـ Swagger: /api/v1/users/{id}
            const response = await fetch(`${API_BASE_URL}/users/${id}`, {
                method: 'DELETE',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                alert("User deleted successfully!");
                performSearch(); // تحديث الجدول بعد الحذف
            } else {
                const error = await response.json();
                alert("Failed to delete: " + (error.message || "Unknown error"));
            }
        } catch (e) {
            console.error("Delete request failed:", e);
            alert("Error connecting to server.");
        }
    }
}

// === 6. وظائف إضافية ===
function viewDetails(id) {
    if (!id || id === 'null') return alert("ID not available.");
    alert("Fetching full details for ID: " + id);
    // مستقبلاً: window.location.href = `user-details.html?id=${id}`;
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
}

function logout() {
    localStorage.clear();
    window.location.href = "../../index.html";
}