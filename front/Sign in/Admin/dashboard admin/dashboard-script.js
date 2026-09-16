document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE_URL = 'http://localhost:3000/api/v1'; 
    let token = localStorage.getItem('token')?.replace(/['"]+/g, '').trim(); 

    async function updateDashboard() {
        if (!token) return;
        const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' };

        try {
            // 1. تحديث حالة السيستم (System Status)
            checkStatus(headers);

            // 2. جلب المستخدمين والكورسات
            const [uRes, cRes] = await Promise.all([
                fetch(`${API_BASE_URL}/users`, { headers }),
                fetch(`${API_BASE_URL}/courses`, { headers })
            ]);

            const users = await uRes.json();
            const courses = await cRes.json();

            // تحديث العدادات (Total Students & Staff)
            if (users.success && Array.isArray(users.data)) {
                const students = users.data.filter(u => 
                    (u.role || u.userType || "").toLowerCase() === 'student'
                ).length;

                const staff = users.data.filter(u => 
                    (u.role || u.userType || "").toLowerCase() === 'staff'
                ).length;

                document.getElementById('totalStudentsCount').textContent = students;
                document.getElementById('totalStaffCount').textContent = staff;
            }

            // تحديث عداد الكورسات وجلب إحصائيات أول كورس
            if (courses.success) {
                const courseHeading = document.querySelector('.stat-card.purple h2');
                if (courseHeading) courseHeading.textContent = courses.data.length;

                if (courses.data.length > 0) {
                    // نبعث الـ ID كـ String لضمان توافق الـ API
                    const firstCourseId = String(courses.data[0].id || courses.data[0]._id);
                    loadChartData(firstCourseId, headers);
                }
            }

            // 3. تحديث الـ Recent Activity
            const alertRes = await fetch(`${API_BASE_URL}/alerts`, { headers });
            const alerts = await alertRes.json();
            const activityContainer = document.querySelector('.activity-list');
            
            if (activityContainer) {
                if (alerts.success && alerts.data.length > 0) {
                    activityContainer.innerHTML = alerts.data.slice(0, 4).map(a => `
                        <div class="activity-item">
                            <span class="dot-small blue"></span>
                            <div class="info">
                                <p>${a.message}</p>
                                <small>${new Date(a.createdAt).toLocaleTimeString()}</small>
                            </div>
                        </div>
                    `).join('');
                } else {
                    // شكل احترافي في حال عدم وجود نشاط
                    activityContainer.innerHTML = `
                        <div style="text-align:center; padding:40px; color:#8e8e93;">
                            <i class="fas fa-history" style="font-size:2rem; margin-bottom:10px; display:block; opacity:0.5;"></i>
                            <p>No recent activity yet</p>
                        </div>`;
                }
            }

        } catch (e) {
            console.error("Dashboard Sync Failed", e);
            setUIOffline();
        }
    }

    // دالة تحديث حالة السيستم
    async function checkStatus(headers) {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/profile`, { headers });
            const isOk = res.ok;
            document.querySelectorAll('.status-panel .badge').forEach(b => {
                b.textContent = isOk ? "Online" : "Offline";
                b.style.color = isOk ? "#10b981" : "#ef4444";
            });
        } catch { setUIOffline(); }
    }

    function setUIOffline() {
        document.querySelectorAll('.status-panel .badge').forEach(b => {
            b.textContent = "Offline";
            b.style.color = "#ef4444";
        });
    }

    // جلب بيانات الشارت
    async function loadChartData(id, headers) {
        try {
            const res = await fetch(`${API_BASE_URL}/attendance/statistics?courseId=${id}`, { headers });
            const result = await res.json();
            if (result.success) drawChart(result.data);
        } catch (e) { console.error("Chart failed", e); }
    }

    // رسم الشارت بالهيكل المخطط والأرقام الجانبية
    function drawChart(data) {
        const ctx = document.getElementById('attendanceChart')?.getContext('2d');
        if (!ctx) return;
        
        const old = Chart.getChart("attendanceChart");
        if (old) old.destroy();

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.label),
                datasets: [{ 
                    label: 'Attendance %', 
                    data: data.map(d => d.value), 
                    backgroundColor: 'rgba(16, 185, 129, 0.3)', // لون تعبئة شفاف شيك
                    borderColor: '#10b981', 
                    borderWidth: 2,
                    borderRadius: 5
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        max: 100, // تثبيت الهيكل من 0 لـ 100
                        grid: { 
                            color: 'rgba(255, 255, 255, 0.1)', // الخطوط الخلفية (Grid Lines)
                            drawBorder: false 
                        },
                        ticks: { 
                            color: '#8e8e93', // لون الأرقام الجانبية
                            callback: value => value + '%' // إضافة علامة النسبة المئوية
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#8e8e93' }
                    }
                }
            }
        });
    }

    updateDashboard();
});