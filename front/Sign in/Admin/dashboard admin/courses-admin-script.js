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

document.addEventListener('DOMContentLoaded', async function() {
    const adminName = localStorage.getItem('username');
    if (document.getElementById('adminName')) {
        document.getElementById('adminName').textContent = adminName || "Admin";
    }

    await fillInstructors();
    await loadCourses();

    const form = document.getElementById('addCourseForm');
    form.onsubmit = async function(e) {
        e.preventDefault();
        const editId = form.getAttribute('data-edit-id');
        
        const courseData = {
            name: document.getElementById('courseName').value.trim(),
            code: document.getElementById('courseCode').value.trim(),
            description: "Academic Course Content", 
            sections: parseInt(document.getElementById('sections').value) || 1,
            credits: 3, 
            instructorId: Number(document.getElementById('instructor').value), //
            adminId: 1 
        };

        try {
            const url = editId ? `${API_BASE_URL}/courses/${editId}` : `${API_BASE_URL}/courses`;
            const method = editId ? 'PUT' : 'POST'; //

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': getAuthToken(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(courseData)
            });

            if (response.ok) {
                closeModal();
                await loadCourses(); 
                
                // تنبيه صغير شيك بيظهر ويختفي لوحده في الركن
                Swal.fire({
                    icon: 'success',
                    title: 'Saved Successfully',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            } else {
                const errorData = await response.json();
                Swal.fire({
                    icon: 'error',
                    title: 'Action Failed',
                    text: errorData.message || "Please check course code uniqueness.",
                    confirmButtonColor: '#3085d6'
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Connection Error',
                text: 'Unable to reach the server.'
            });
        }
    };
});

// دالة الحذف بشكل "شيك" جداً
async function deleteCourse(id) {
    if (!id || id === 'undefined') return;

    // نافذة تأكيد بشكل احترافي
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to delete this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch(`${API_BASE_URL}/courses/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': getAuthToken() }
            });

            if (response.ok) {
                Swal.fire('Deleted!', 'The course has been deleted.', 'success');
                await loadCourses();
            } else {
                Swal.fire('Error!', 'Failed to delete the course.', 'error');
            }
        } catch (error) {
            Swal.fire('Error!', 'Server connection lost.', 'error');
        }
    }
}

// باقي الدوال (loadCourses, fillInstructors, prepareEdit, إلخ) تبقي كما هي
async function loadCourses() {
    try {
        const response = await fetch(`${API_BASE_URL}/courses`, {
            headers: { 'Authorization': getAuthToken() }
        });
        const result = await response.json();
        const courses = result.data || result;
        const tbody = document.getElementById('coursesTableBody');

        tbody.innerHTML = '';
        if (Array.isArray(courses)) {
            courses.forEach(course => {
                const courseId = course.id || course.courseId || course.userAccountId; //
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${course.code}</td>
                    <td>${course.name}</td>
                    <td>${course.instructor ? (course.instructor.fullName || course.instructor.username) : 'N/A'}</td>
                    <td>0</td>
                    <td>${course.sections || 1}</td> 
                    <td class="action-btns">
                        <button class="btn-edit" onclick='prepareEdit(${JSON.stringify(course)})'>Edit</button>
                        <button class="btn-delete" onclick="deleteCourse('${courseId}')">Delete</button>
                    </td>`;
                tbody.appendChild(tr);
            });
        }
    } catch (error) { console.error(error); }
}

async function fillInstructors() {
    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            headers: { 'Authorization': getAuthToken() }
        });
        const result = await response.json();
        const users = result.data || result;
        const select = document.getElementById('instructor');
        if (Array.isArray(users)) {
            select.innerHTML = '<option value="">Select Instructor</option>';
            users.forEach(u => {
                if(u.userType?.toLowerCase() === 'staff' || u.role?.toLowerCase() === 'staff') {
                    const opt = document.createElement('option');
                    opt.value = u.id || u.userAccountId;
                    opt.textContent = u.fullName || u.username;
                    select.appendChild(opt);
                }
            });
        }
    } catch (error) { console.error(error); }
}

function prepareEdit(course) {
    const form = document.getElementById('addCourseForm');
    const courseId = course.id || course.courseId || course.userAccountId;
    form.setAttribute('data-edit-id', courseId);
    document.getElementById('modalTitle').innerText = "Edit Course";
    document.getElementById('courseName').value = course.name;
    document.getElementById('courseCode').value = course.code;
    document.getElementById('instructor').value = course.instructorId || "";
    document.getElementById('sections').value = course.sections || 1;
    document.getElementById('courseModal').style.display = 'flex';
}

function closeModal() { document.getElementById('courseModal').style.display = 'none'; }
function openModal() {
    const form = document.getElementById('addCourseForm');
    form.reset();
    form.removeAttribute('data-edit-id');
    document.getElementById('modalTitle').innerText = "Add New Course";
    document.getElementById('courseModal').style.display = 'flex';
}