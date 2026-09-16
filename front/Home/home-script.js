document.addEventListener('DOMContentLoaded', () => {
    const settingsBtn = document.getElementById('settings-btn');
    const icon = settingsBtn.querySelector('i');
    const body = document.body;

    // وظيفة تحديث الأيقونة
    function updateIcon(isDarkMode) {
        if (isDarkMode) {
            icon.classList.replace('fa-sun', 'fa-moon');
        } else {
            icon.classList.replace('fa-moon', 'fa-sun');
        }
    }

    // تبديل الوضع
    settingsBtn.addEventListener('click', () => {
        const isDark = body.classList.toggle('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateIcon(isDark);
    });

    // قراءة الوضع المحفوظ عند تحميل الصفحة
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        body.classList.remove('dark-mode');
        updateIcon(false);
    } else {
        body.classList.add('dark-mode');
        updateIcon(true);
    }
});