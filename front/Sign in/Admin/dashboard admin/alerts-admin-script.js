const API_BASE_URL = 'http://localhost:3000/api/v1';

function getAuthToken() {
    let token = localStorage.getItem('token');
    if (!token) return "";
    token = token.replace(/['"]+/g, '').trim();
    if (token.toLowerCase().startsWith('bearer ')) {
        token = token.substring(7).trim();
    }
    return `Bearer ${token}`;
}

document.addEventListener('DOMContentLoaded', async function () {
    const savedName = localStorage.getItem('username');
    if (savedName) document.getElementById('adminName').textContent = savedName;

    await loadAlertsFromServer();
    await fillRecipients();

    document.getElementById('sendAlertBtn').onclick = handleAlertDispatch;
    document.getElementById('clearAllBtn').onclick = clearAllAlertsFromServer;
});

// 1. جلب وعرض التنبيهات مع المحاذاة لليسار
async function loadAlertsFromServer() {
    const container = document.getElementById('alertsContainer');
    const noAlertsMsg = document.getElementById('noAlertsMsg');

    try {
        const response = await fetch(`${API_BASE_URL}/alerts`, {
            headers: { 'Authorization': getAuthToken() }
        });
        const data = await response.json();
        const alerts = data.data || data;

        container.innerHTML = '';

        const iconMap = {
            information: 'fa-info-circle',
            warning: 'fa-exclamation-triangle',
            important: 'fa-exclamation-circle',
            emergency: 'fa-bolt',
            success: 'fa-check-circle'
        };

        const titleMap = {
            information: 'Information Update',
            warning: 'Warning Notification',
            important: 'Important Alert',
            emergency: 'Critical System Alert',
            success: 'Task Completed'
        };

        if (Array.isArray(alerts) && alerts.length > 0) {
            noAlertsMsg.style.display = 'none';
            alerts.forEach(alert => {
                const typeClass = (alert.type || 'information').toLowerCase();
                const alertId = alert._id || alert.id;
                const icon = iconMap[typeClass] || 'fa-bell';
                const dynamicTitle = titleMap[typeClass] || 'System Alert';

                const html = `
                    <div class="alert-item ${typeClass}" id="alert-${alertId}">
                        <div class="alert-icon-box">
                            <i class="fas ${icon}"></i>
                        </div>
                        <div class="alert-content">
                            <div class="alert-details">
                                <h4>${dynamicTitle}</h4>
                                <p>${alert.message}</p>
                                <span class="time-tag">
                                    <i class="far fa-clock"></i> ${new Date(alert.createdAt).toLocaleString('en-GB')}
                                </span>
                            </div>
                        </div>
                        <button class="close-alert" onclick="deleteSingleAlert('${alertId}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>`;
                container.insertAdjacentHTML('beforeend', html);
            });
        } else {
            noAlertsMsg.style.display = 'block';
        }
    } catch (error) {
        noAlertsMsg.style.display = 'block';
    }
}

// 2. دالة الحذف اللي فيها "تأكيد بعد الحذف" اللي طلبتيه
async function deleteSingleAlert(id) {
    const res = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ff4757',
        cancelButtonColor: '#2c3e50',
        confirmButtonText: 'Yes, delete it!'
    });

    if (res.isConfirmed) {
        try {
            const response = await fetch(`${API_BASE_URL}/alerts/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': getAuthToken() }
            });

            if (response.ok) {
                // الرسالة اللي كانت ناقصة (Success Confirmation)
                Swal.fire({
                    title: 'Deleted!',
                    text: 'The notification has been removed.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                    background: '#1e1e2d',
                    color: '#fff'
                });
                await loadAlertsFromServer();
            } else {
                Swal.fire('Error', 'Failed to delete.', 'error');
            }
        } catch (e) {
            Swal.fire('Error', 'Connection error.', 'error');
        }
    }
}

// 3. إرسال تنبيه جديد
async function handleAlertDispatch() {
    const messageField = document.getElementById('broadcastMsg');
    const message = messageField.value.trim();
    const type = document.getElementById('alertType').value;
    const recipient = document.getElementById('recipients').value;
    const sendBtn = document.getElementById('sendAlertBtn');

    if (!message) {
        Swal.fire({ icon: 'info', title: 'Empty Message', text: 'Please type a message.' });
        return;
    }

    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    const payload = { title: `System Alert`, message: message, type: type.toLowerCase() };
    let url = `${API_BASE_URL}/alerts/batch`;
    if (!['all', 'students', 'staff', 'course'].includes(recipient)) {
        url = `${API_BASE_URL}/alerts/send/${recipient}`;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': getAuthToken(), 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Sent Successfully',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                background: '#1e1e2d',
                color: '#fff'
            });
            messageField.value = '';
            await loadAlertsFromServer();
        } else {
            Swal.fire('Error', 'Failed to dispatch alert.', 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Server error.', 'error');
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send Alert';
    }
}

async function clearAllAlertsFromServer() {
    const res = await Swal.fire({
        title: 'Clear Everything?',
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#ff4d4d',
        confirmButtonText: 'Yes, clear all!'
    });

    if (res.isConfirmed) {
        await fetch(`${API_BASE_URL}/alerts`, {
            method: 'DELETE',
            headers: { 'Authorization': getAuthToken() }
        });
        // تأكيد مسح الكل
        Swal.fire({ title: 'Cleared!', icon: 'success', timer: 1500, showConfirmButton: false });
        await loadAlertsFromServer();
    }
}

async function fillRecipients() {
    const select = document.getElementById('recipients');
    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            headers: { 'Authorization': getAuthToken() }
        });
        const result = await response.json();
        const users = result.data || result;
        if (Array.isArray(users)) {
            const group = document.createElement('optgroup');
            group.label = "Individual Users";
            users.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.id || u.userAccountId;
                opt.textContent = `${u.fullName || u.username} (${u.role || u.userType})`;
                group.appendChild(opt);
            });
            select.appendChild(group);
        }
    } catch (e) { console.error(e); }
}

function logout() { localStorage.clear(); window.location.href = "../../index.html"; }
function toggleSidebar() { document.querySelector('.sidebar').classList.toggle('active'); }