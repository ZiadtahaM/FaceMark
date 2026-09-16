document.addEventListener('DOMContentLoaded', function() {
    // === 1. وظيفة التحكم في حجم السايد بار (Sidebar Resize) ===
    const sidebar = document.querySelector('.sidebar');
    const resizer = document.querySelector('.resizer');
    
    let enrollmentChart, roleDistributionChart;

    if (resizer && sidebar) {
        resizer.addEventListener('mousedown', function (e) {
            e.preventDefault();
            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', stopResize);
            document.body.style.cursor = 'col-resize';
        });

        function resize(e) {
            let newWidth = e.clientX;
            if (newWidth >= 150 && newWidth <= 500) {
                sidebar.style.width = newWidth + 'px';
                
                // تحديث الرسوم البيانية فوراً لمنع الخروج عن الحواف
                if(enrollmentChart) enrollmentChart.resize();
                if(roleDistributionChart) roleDistributionChart.resize();
            }
        }

        function stopResize() {
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
            document.body.style.cursor = 'default';
        }
    }

    // === 2. إعدادات الرسوم البيانية (Charts) المحدثة ===
    
    // الرسم البياني الخطي (اليسار - يبدأ من الصفر)
    const ctxLine = document.getElementById('enrollmentChart').getContext('2d');
    enrollmentChart = new Chart(ctxLine, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Students',
                data: [2100, 2250, 2350, 2410, 2450, 2520],
                borderColor: '#3060ff',
                backgroundColor: 'rgba(48, 96, 255, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#3060ff'
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } },
            scales: { 
                y: { 
                    beginAtZero: true, // التعديل المطلوب: يبدأ من 0
                    ticks: { color: '#b0b0b0' }, 
                    grid: { color: 'rgba(255,255,255,0.05)' } 
                },
                x: { 
                    ticks: { color: '#b0b0b0' }, 
                    grid: { display: false } 
                }
            }
        }
    });

    // الرسم البياني الدائري (اليمين - مرفوع للأعلى)
    const ctxPie = document.getElementById('roleDistributionChart').getContext('2d');
    roleDistributionChart = new Chart(ctxPie, {
        type: 'pie',
        data: {
            labels: ['Students (94.9%)', 'Staff (4.8%)', 'Admin (0.3%)'], 
            datasets: [{
                data: [94.9, 4.8, 0.3],
                backgroundColor: ['#3060ff', '#2ecc71', '#9b59b6'],
                borderWidth: 0
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            layout: {
                padding: {
                    bottom: 40, // رفع الدائرة للأعلى عن طريق زيادة الهامش السفلي
                    top: 0
                }
            },
            plugins: { 
                legend: { 
                    position: 'bottom', 
                    labels: { color: '#b0b0b0', boxWidth: 10, padding: 10 } 
                } 
            }
        }
    });

    // === 3. منطق إدارة الحسابات (إضافة، تعديل، حذف) ===
    const modal = document.getElementById('accountModal');
    const editModal = document.getElementById('editModal');
    const tableBody = document.getElementById('accountsTableBody');
    let currentRow = null;

    // أزرار الفتح والإغلاق
    document.getElementById('openModalBtn').onclick = () => modal.style.display = 'flex';
    document.getElementById('closeModalBtn').onclick = () => modal.style.display = 'none';
    document.getElementById('closeEditModalBtn').onclick = () => editModal.style.display = 'none';

    // وظيفة إضافة صف جديد
    document.getElementById('accountForm').onsubmit = function(e) {
        e.preventDefault();
        addNewRow(
            document.getElementById('idNumber').value,
            document.getElementById('fullName').value,
            document.getElementById('email').value,
            document.getElementById('role').value
        );
        modal.style.display = 'none';
        this.reset();
    };

    // وظيفة تعديل صف موجود
    document.getElementById('editForm').onsubmit = function(e) {
        e.preventDefault();
        if (currentRow) {
            const role = document.getElementById('editRole').value;
            currentRow.cells[0].innerText = document.getElementById('editIdNumber').value;
            currentRow.cells[1].innerText = document.getElementById('editFullName').value;
            currentRow.cells[2].innerText = document.getElementById('editEmail').value;
            currentRow.cells[3].innerHTML = `<span class="badge ${role.toLowerCase()}">${role}</span>`;
            
            editModal.style.display = 'none';
        }
    };

    // مراقبة أزرار الجدول (الحذف والتعديل)
    tableBody.addEventListener('click', function(e) {
        // حذف الصف
        if (e.target.closest('.btn-delete')) {
            if(confirm('Are you sure you want to delete this account?')) {
                e.target.closest('tr').remove();
            }
        }
        
        // فتح مودال التعديل وتعبئة البيانات
        if (e.target.closest('.btn-edit')) {
            currentRow = e.target.closest('tr');
            document.getElementById('editIdNumber').value = currentRow.cells[0].innerText;
            document.getElementById('editFullName').value = currentRow.cells[1].innerText;
            document.getElementById('editEmail').value = currentRow.cells[2].innerText;
            document.getElementById('editRole').value = currentRow.cells[3].innerText.trim();
            
            editModal.style.display = 'flex';
        }
    });

    function addNewRow(id, name, email, role) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${id}</td>
            <td>${name}</td>
            <td>${email}</td>
            <td><span class="badge ${role.toLowerCase()}">${role}</span></td>
            <td><span class="status-active">Active</span></td>
            <td class="actions">
                <button class="btn-edit"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn-delete"><i class="fas fa-trash"></i></button>
            </td>`;
        tableBody.appendChild(tr);
    }

    // إغلاق المودالات عند الضغط في الخارج
    window.onclick = (e) => {
        if (e.target == modal) modal.style.display = 'none';
        if (e.target == editModal) editModal.style.display = 'none';
    };
});