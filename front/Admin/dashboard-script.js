document.addEventListener('DOMContentLoaded', () => {
    // 1. عرض اسم المستخدم
    const userNameDisplay = document.getElementById('userNameDisplay');
    const loggedUser = localStorage.getItem('loggedUser');
    if (loggedUser && userNameDisplay) userNameDisplay.textContent = loggedUser;

    // 2. Resizable Sidebar
    const sidebar = document.getElementById("resizableSidebar");
    const resizer = document.getElementById("sidebarResizer");
    if (resizer && sidebar) {
        resizer.addEventListener("mousedown", (e) => {
            e.preventDefault();
            document.addEventListener("mousemove", resize);
            document.addEventListener("mouseup", stopResize);
            document.body.style.cursor = "col-resize";
        });
        function resize(e) {
            let newWidth = e.clientX;
            if (newWidth > 200 && newWidth < 450) sidebar.style.width = newWidth + "px";
        }
        function stopResize() {
            document.removeEventListener("mousemove", resize);
            document.removeEventListener("mouseup", stopResize);
            document.body.style.cursor = "default";
        }
    }

    // 3. برمجة الرسم البياني بتأثيرات الـ Hover والتكبير
    const chartCanvas = document.getElementById('attendanceChart');
    if (chartCanvas) {
        const ctx = chartCanvas.getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Engineering', 'Science', 'Arts', 'Business', 'Medicine'],
                datasets: [{
                    label: 'Attendance Rate',
                    data: [95, 90, 85, 92, 96], 
                    backgroundColor: '#10b981', 
                    hoverBackgroundColor: '#34d399', // لون أفتح عند الوقوف بالماوس
                    borderRadius: 8,
                    barPercentage: 0.6 // تعريض العمود
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        backgroundColor: '#1a1a3a',
                        titleColor: '#fff',
                        bodyColor: '#10b981',
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return ` Attendance: ${context.raw}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                        ticks: { color: '#b0b0b0' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#b0b0b0' }
                    }
                }
            }
        });
    }
});

function logout() { localStorage.removeItem('loggedUser'); }