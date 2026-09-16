document.addEventListener('DOMContentLoaded', async function() {
    const API_BASE_URL = 'http://localhost:3000/api/v1'; 
    let token = localStorage.getItem('token'); 
    if (token) token = token.replace(/['"]+/g, '').trim(); 

    // === 1. عناصر الواجهة (UI Elements) ===
    const modal = document.getElementById('accountModal');
    const editModal = document.getElementById('editModal');
    const tableBody = document.getElementById('accountsTableBody');
    let enrollmentChart, roleDistributionChart;
    let currentRow = null;

    // === 2. منطق فتح الـ Modal (إضافة حساب) ===
    // بندور على الزرار بكذا طريقة عشان نضمن إنه يشتغل
    const addAccountBtn = document.querySelector('.btn-primary') || 
                        document.querySelector('.add-account-btn') || 
                        Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Add Account'));

    if (addAccountBtn && modal) {
        addAccountBtn.onclick = function(e) {
            e.preventDefault();
            console.log("Opening Add Account Modal...");
            modal.style.display = 'flex';
        };
    }

    // إغلاق المودالات (Close & Cancel)
    document.querySelectorAll('.close, .btn-cancel').forEach(btn => {
        btn.onclick = () => {
            if (modal) modal.style.display = 'none';
            if (editModal) editModal.style.display = 'none';
        };
    });

    window.onclick = (e) => {
        if (e.target == modal) modal.style.display = 'none';
        if (e.target == editModal) editModal.style.display = 'none';
    };

    // === 3. تحديث اسم المستخدم والترحيب ===
    const nameDisplay = document.getElementById('adminName') || document.getElementById('userNameDisplay');
    const savedName = localStorage.getItem('username'); 
    if (nameDisplay) nameDisplay.textContent = savedName ? savedName : "Admin";

    // === 4. إدارة البيانات والربط بالـ APIs ===

    // دالة جلب البيانات (GET)
    async function loadAccounts() {
        if (!token) return console.error("No token found.");
        try {
            const response = await fetch(`${API_BASE_URL}/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            const users = result.data || result;

            if (Array.isArray(users)) {
                tableBody.innerHTML = ''; 
                users.forEach(user => renderUserRow(user));
                updateStatsAndCharts(users);
            }
        } catch (error) { console.error("Error loading accounts:", error); }
    }

    // رسم صف الجدول (تم تعديل الـ ID لـ userAccountId)
    function renderUserRow(user) {
        const tr = document.createElement('tr');
        const displayId = user.userAccountId || user.id || 'N/A';
        tr.setAttribute('data-id', displayId); 
        tr.innerHTML = `
            <td>${displayId}</td>
            <td>${user.fullName || user.username || 'Unknown'}</td>
            <td>${user.email || 'N/A'}</td>
            <td><span class="badge ${(user.userType || 'student').toLowerCase()}">${user.userType || 'Student'}</span></td>
            <td><span class="status-active">Active</span></td>
            <td class="actions">
                <button class="btn-edit"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn-delete"><i class="fas fa-trash"></i></button>
            </td>`;
        tableBody.appendChild(tr);
    }

    // تحديث العدادات العلوية والشارت
    function updateStatsAndCharts(users) {
        const studentCount = users.filter(u => String(u.userType).toLowerCase() === 'student').length;
        const staffCount = users.filter(u => String(u.userType).toLowerCase() === 'staff').length;
        const adminCount = users.filter(u => String(u.userType).toLowerCase() === 'admin').length;
        
        if (roleDistributionChart) {
            roleDistributionChart.data.datasets[0].data = [studentCount, staffCount, adminCount];
            roleDistributionChart.update();
        }

        // ربط العدادات بالـ IDs في الـ HTML
        const sElem = document.getElementById('totalStudentsCount');
        const fElem = document.getElementById('totalStaffCount');
        const aElem = document.getElementById('totalAdminCount');

        if (sElem) sElem.textContent = studentCount.toLocaleString();
        if (fElem) fElem.textContent = staffCount.toLocaleString();
        if (aElem) aElem.textContent = adminCount.toLocaleString();
    }

    // إضافة حساب جديد (POST)
    const accountForm = document.getElementById('accountForm');
    if (accountForm) {
        accountForm.onsubmit = async function(e) {
            e.preventDefault();
            const userData = {
                username: document.getElementById('fullName').value.trim(),
                email: document.getElementById('email').value.trim(),
                password: "User@123", 
                userType: document.getElementById('role').value.toLowerCase()
            };
            try {
                const response = await fetch(`${API_BASE_URL}/users`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });
                if (response.ok) {
                    modal.style.display = 'none';
                    this.reset();
                    loadAccounts();
                }
            } catch (error) { console.error("Add error:", error); }
        };
    }

    // الحذف والتعديل (Event Delegation)
    if (tableBody) {
        tableBody.addEventListener('click', async function(e) {
            const row = e.target.closest('tr');
            if (!row) return;
            const userId = row.getAttribute('data-id');

            if (e.target.closest('.btn-delete')) {
                if(confirm('Are you sure you want to delete this account?')) {
                    try {
                        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (response.ok) loadAccounts();
                    } catch (error) { console.error("Delete error:", error); }
                }
            }
            if (e.target.closest('.btn-edit')) {
                currentRow = row;
                document.getElementById('editIdNumber').value = row.cells[0].innerText;
                document.getElementById('editFullName').value = row.cells[1].innerText;
                document.getElementById('editEmail').value = row.cells[2].innerText;
                document.getElementById('editRole').value = row.cells[3].innerText.trim().toLowerCase();
                editModal.style.display = 'flex';
            }
        });
    }

    // حفظ التعديلات (PUT)
    const editForm = document.getElementById('editForm');
    if (editForm) {
        editForm.onsubmit = async function(e) {
            e.preventDefault();
            const userId = currentRow.getAttribute('data-id');
            const updatedData = {
                username: document.getElementById('editFullName').value.trim(),
                email: document.getElementById('editEmail').value.trim(),
                userType: document.getElementById('editRole').value.toLowerCase()
            };
            try {
                const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedData)
                });
                if (response.ok) {
                    loadAccounts();
                    editModal.style.display = 'none';
                }
            } catch (error) { console.error("Update error:", error); }
        };
    }

    // === 5. الرسوم البيانية والسايد بار ===
    initChartsAndSidebar();
    loadAccounts(); // تحميل الداتا أول ما الصفحة تفتح

    function initChartsAndSidebar() {
        const ctxPie = document.getElementById('roleDistributionChart')?.getContext('2d');
        if (ctxPie) {
            roleDistributionChart = new Chart(ctxPie, {
                type: 'pie',
                data: {
                    labels: ['Students', 'Staff', 'Admin'],
                    datasets: [{
                        data: [0, 0, 0],
                        backgroundColor: ['#3060ff', '#2ecc71', '#9b59b6']
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        const sidebar = document.querySelector('.sidebar');
        const resizer = document.querySelector('.resizer');
        if (resizer && sidebar) {
            resizer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                document.addEventListener('mousemove', resize);
                document.addEventListener('mouseup', stopResize);
            });
            function resize(e) {
                let newWidth = e.clientX;
                if (newWidth >= 150 && newWidth <= 500) sidebar.style.width = newWidth + 'px';
            }
            function stopResize() {
                document.removeEventListener('mousemove', resize);
                document.removeEventListener('mouseup', stopResize);
            }
        }
    }
});

function logout() {
    localStorage.clear();
    window.location.href = "../../index.html";
}