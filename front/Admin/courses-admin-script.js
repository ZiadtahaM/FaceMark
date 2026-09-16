document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('resizableSidebar');
    const resizer = document.getElementById('sidebarResizer');
    const mainContent = document.getElementById('mainContent');

    // 1. منطق الريسايز (شغال 100% وبيفرد الجدول)
    if (resizer) {
        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', stop);
        });

        function move(e) {
            let width = e.clientX;
            if (width > 180 && width < 450) {
                sidebar.style.width = width + 'px';
                mainContent.style.marginLeft = width + 'px';
                mainContent.style.width = `calc(100% - ${width}px)`;
            }
        }
        function stop() { document.removeEventListener('mousemove', move); }
    }

    // 2. وظائف المودال (فتح/إغلاق)
    window.openModal = function() {
        document.getElementById('addCourseForm').reset();
        document.getElementById('modalTitle').innerText = "Add New Course";
        document.getElementById('submitBtn').innerText = "Add Course";
        document.getElementById('addCourseForm').removeAttribute('data-edit-row');
        document.getElementById('courseModal').style.display = 'flex';
    };

    window.closeModal = function() {
        document.getElementById('courseModal').style.display = 'none';
    };

    // 3. وظيفة التعديل (Edit) - بتجيب الداتا من الجدول للفورم
    window.editCourse = function(btn) {
        const row = btn.closest('tr');
        const cells = row.cells;

        document.getElementById('courseCode').value = cells[0].innerText;
        document.getElementById('courseName').value = cells[1].innerText;
        document.getElementById('instructor').value = cells[2].innerText;
        document.getElementById('sections').value = cells[4].innerText;

        document.getElementById('modalTitle').innerText = "Edit Course";
        document.getElementById('submitBtn').innerText = "Update Course";
        
        // ربط الفورم بالسطر ده عشان يتعدل
        document.getElementById('addCourseForm').setAttribute('data-edit-row', row.rowIndex);
        document.getElementById('courseModal').style.display = 'flex';
    };

    // 4. الحفظ النهائي (إضافة أو تعديل)
    document.getElementById('addCourseForm').onsubmit = function(e) {
        e.preventDefault();
        const editIndex = this.getAttribute('data-edit-row');
        const code = document.getElementById('courseCode').value;
        const name = document.getElementById('courseName').value;
        const inst = document.getElementById('instructor').value;
        const sect = document.getElementById('sections').value;

        if (editIndex) {
            // تحديث السطر
            const row = document.getElementById('coursesTable').rows[editIndex];
            row.cells[0].innerText = code;
            row.cells[1].innerText = name;
            row.cells[2].innerText = inst;
            row.cells[4].innerText = sect;
        } else {
            // إضافة جديد
            const tbody = document.querySelector('#coursesTable tbody');
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${code}</td>
                <td>${name}</td>
                <td>${inst}</td>
                <td>0</td>
                <td>${sect}</td>
                <td class="action-btns">
                    <button class="btn-edit" onclick="editCourse(this)">Edit</button>
                    <button class="btn-delete" onclick="this.closest('tr').remove()">🗑️</button>
                </td>`;
        }
        closeModal();
    };
});