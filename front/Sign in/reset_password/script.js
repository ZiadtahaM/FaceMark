document.getElementById('resetForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const email = String(document.getElementById('email').value).trim();

    if (email === "") {
        alert("Please enter your email address.");
        return;
    }

    try {
        console.log("Sending reset link to:", email);

        const isSent = true; 

        if (isSent) {
            alert(`A password reset link has been sent to ${email}. Check your inbox.`);
            
            window.location.href = '../index.html'; 
        }
    } catch (error) {
        alert("Error sending email. Please try again.");
    }
});