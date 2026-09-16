document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.sidebar');
    const resizer = document.getElementById('sidebarResizer');

    if (resizer && sidebar) {
        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', stopResize);
            // إضافة كلاس اختياري لمنع اختيار النصوص أثناء السحب
            document.body.style.cursor = 'col-resize';
        });

        function resize(e) {
            const newWidth = e.clientX;
            // يمكنك تعديل الـ 200 والـ 500 حسب رغبتك في حدود العرض
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
});
// 1. وظيفة فتح النافذة (Modal) وعرض التفاصيل
function openDetails() {
    // الحصول على القيم المختارة من الفلاتر (Course, Section, Date)
    const course = document.getElementById('courseSelect').value;
    const section = document.getElementById('sectionSelect').value;
    const date = document.getElementById('dateInput').value;

    // تحديث النصوص داخل النافذة المنبثقة بناءً على الاختيارات
    document.getElementById('disp-course').innerText = course;
    document.getElementById('disp-section').innerText = section;
    
    // إذا لم يتم اختيار تاريخ، نعرض "Not Selected"
    document.getElementById('disp-date').innerText = date ? date : "Not Selected";

    // إظهار النافذة المنبثقة عن طريق تغيير الـ display إلى flex
    const modal = document.getElementById('detailsModal');
    modal.style.display = 'flex';
    
    // منع التمرير (Scroll) في الصفحة الخلفية أثناء فتح النافذة
    document.body.style.overflow = 'hidden';
}

// 2. وظيفة إغلاق النافذة
function closeDetails() {
    const modal = document.getElementById('detailsModal');
    modal.style.display = 'none';
    
    // إعادة السماح بالتمرير (Scroll) في الصفحة
    document.body.style.overflow = 'auto';
}

// 3. إغلاق النافذة تلقائياً إذا ضغط المستخدم في أي مكان خارج "صندوق الجدول"
window.onclick = function(event) {
    const modal = document.getElementById('detailsModal');
    if (event.target == modal) {
        closeDetails();
    }
}

// ملاحظة: تأكدي أن زر "View Details" في ملف HTML يحتوي على: onclick="openDetails()"