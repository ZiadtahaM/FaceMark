const API_BASE_URL = 'http://localhost:3000/api/v1';
let currentReportType = '';

document.addEventListener('DOMContentLoaded', async () => {
    
    // === 0. تحديث اسم المستخدم ===
    const nameDisplay = document.getElementById('adminName') || 
                        document.getElementById('admin-name') || 
                        document.getElementById('userNameDisplay');
    
    const savedName = localStorage.getItem('username');
    if (nameDisplay) {
        nameDisplay.textContent = savedName ? savedName : "Aya_allah";
    }

    // === 1. وظيفة التحكم في حجم السايد بار ===
    const sidebar = document.querySelector('.sidebar');
    const resizer = document.querySelector('.resizer') || document.getElementById('sidebarResizer');

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

    // === 2. تشغيل الـ APIs عند التحميل ===
    await loadCoursesForReports();
    await loadRecentReports(); // استدعاء دالة التقارير الأخيرة
});

// دالة لجلب الكورسات من السيرفر
async function loadCoursesForReports() {
    const select = document.getElementById('reportCourseSelect');
    if (!select) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/courses`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 401) logout();
        
        const courses = await response.json();
        select.innerHTML = '<option value="all">All Courses</option>';
        
        const coursesList = Array.isArray(courses.data) ? courses.data : courses;
        if (Array.isArray(coursesList)) {
            coursesList.forEach(course => {
                const opt = document.createElement('option');
                opt.value = course.id;
                opt.textContent = course.name;
                select.appendChild(opt);
            });
        }
    } catch (e) { console.error("Error loading courses:", e); }
}

// دالة لجلب التقارير الأخيرة من الباك إند
async function loadRecentReports() {
    const container = document.getElementById('recentReportsContainer');
    if (!container) return;

    try {
        // تنبيه: هنا يتم استخدام الـ API الخاص بملفات التقارير
        const response = await fetch(`${API_BASE_URL}/attendance/statistics`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();

        // فحص إذا كان هناك تقارير حقيقية راجعة من الباك
        if (data && data.reports && data.reports.length > 0) {
            container.innerHTML = ''; 
            data.reports.forEach(report => {
                container.innerHTML += `
                    <div class="report-item">
                        <div class="report-main-info">
                            <i class="fas fa-file-alt"></i>
                            <div>
                                <h4>${report.name}</h4>
                                <span>${new Date(report.date).toLocaleDateString()} • ${report.size || '0'} MB</span>
                            </div>
                        </div>
                        <button class="btn-download" onclick="window.open('${report.url}')">Download</button>
                    </div>
                `;
            });
        } else {
            // لو مفيش داتا من الباك إند يظهر الرسالة دي
            container.innerHTML = '<p style="text-align:center; color:var(--text-dim); margin: 20px 0;">No history found yet. Generated reports will appear here.</p>';
        }
    } catch (e) {
        console.error("Error loading recent reports:", e);
        container.innerHTML = '<p style="text-align:center; color:var(--text-dim);">Unable to load recent reports.</p>';
    }
}

function openReportModal(type) {
    currentReportType = type;
    document.getElementById('reportConfigModal').style.display = 'flex';
}

function closeReportModal() {
    document.getElementById('reportConfigModal').style.display = 'none';
}

async function downloadReport() {
    const courseId = document.getElementById('reportCourseSelect').value;
    const fromDate = document.getElementById('reportFromDate').value;
    const toDate = document.getElementById('reportToDate').value;
    const downloadBtn = document.getElementById('downloadBtn');

    if (!fromDate || !toDate) {
        alert("Please select both start and end dates!");
        return;
    }

    const originalContent = downloadBtn.innerHTML;
    downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
    downloadBtn.disabled = true;

    try {
        const token = localStorage.getItem('token');
        const url = `${API_BASE_URL}/attendance/report-data?courseId=${courseId}&fromDate=${fromDate}&toDate=${toDate}`;
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Failed to fetch report data");
        
        const data = await response.json();
        
        // Handle NestJS TransformInterceptor wrapper if present
        const reportData = data.data || data;

        if (!Array.isArray(reportData) || reportData.length === 0) {
            alert("No attendance records found for the selected criteria.");
            return;
        }

        generatePDF(reportData, currentReportType, fromDate, toDate);
        
        alert("Report generated successfully!");
        closeReportModal();
        await loadRecentReports();
    } catch (e) {
        console.error("Download failed:", e);
        alert("Download failed: " + e.message);
    } finally {
        downloadBtn.innerHTML = originalContent;
        downloadBtn.disabled = false;
    }
}

function generatePDF(data, type, from, to) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');

    // Header
    doc.setFontSize(20);
    doc.setTextColor(40, 44, 52);
    doc.text(`FaceMark - ${type.charAt(0).toUpperCase() + type.slice(1)} Report`, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Period: ${from} to ${to}`, 14, 28);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 33);

    // Table
    const tableColumn = ["Student ID", "Student Name", "Course", "Status", "Date", "Time", "Session", "Type"];
    const tableRows = [];

    data.forEach(row => {
        const rowData = [
            row.studentId,
            row.name,
            row.course,
            row.status,
            new Date(row.date).toLocaleDateString(),
            row.time,
            row.session,
            row.type
        ];
        tableRows.push(rowData);
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 40 },
    });

    doc.save(`FaceMark_${type}_Report_${from}_to_${to}.pdf`);
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.toggle('active');
}

function logout() {
    localStorage.clear();
    window.location.href = "../../index.html";
}