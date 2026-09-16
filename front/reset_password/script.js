document.getElementById('resetForm').addEventListener('submit', function(event) {
    event.preventDefault(); // منع الإرسال الافتراضي

    const email = document.getElementById('email').value.trim();

    if (email === "") {
        alert("Please enter your email address.");
        return;
    }

    console.log("Sending reset link to:", email);
    
    // هنا يتم إضافة منطق إرسال البريد الإلكتروني إلى الخادم (Backend)
    
    // رسالة للمستخدم بعد الإرسال
    alert(`A password reset link has been sent to ${email}. Check your inbox.`);

    // يمكن إعادة توجيه المستخدم لصفحة الدخول بعد الإرسال
    // window.location.href = 'index.html'; 
});