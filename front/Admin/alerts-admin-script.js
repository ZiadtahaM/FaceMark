document.addEventListener('DOMContentLoaded', function () {
    // --- الجزء الخاص بالريسايز ---
    const sidebar = document.querySelector('.sidebar');
    const resizer = document.querySelector('.resizer');

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
            }
        }

        function stopResize() {
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
            document.body.style.cursor = 'default';
        }
    }

    // --- باقي وظائف التنبيهات (مسح التنبيهات وغيرها) ---
    const clearAllBtn = document.getElementById('clearAllBtn');
    const alertsContainer = document.getElementById('alertsContainer');
    const noAlertsMsg = document.getElementById('noAlertsMsg');

    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            alertsContainer.innerHTML = '';
            noAlertsMsg.style.display = 'block';
        });
    }

    // حذف تنبيه فردي
    document.addEventListener('click', function(e) {
        if (e.target.closest('.close-alert')) {
            const alertItem = e.target.closest('.alert-item');
            alertItem.remove();
            if (alertsContainer.children.length === 0) {
                noAlertsMsg.style.display = 'block';
            }
        }
    });
});