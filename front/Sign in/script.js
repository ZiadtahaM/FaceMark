/**
 * FaceMark Modern Authentication Controller
 * Handles segmented role switching, credential authentication, role validation, and redirects.
 */

// 1. Role Segmented Slider Management
const segmentButtons = document.querySelectorAll('.segment-btn');
const segmentIndicator = document.getElementById('segmentIndicator');
const selectedRoleInput = document.getElementById('selectedRole');

function updateSegmentIndicator(activeBtn) {
    if (!activeBtn || !segmentIndicator) return;
    const index = Array.from(segmentButtons).indexOf(activeBtn);
    const percent = index * 100;
    segmentIndicator.style.transform = `translateX(${percent}%)`;
}

segmentButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
        segmentButtons.forEach((b) => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        
        const role = btn.getAttribute('data-role');
        selectedRoleInput.value = role;
        updateSegmentIndicator(btn);
    });
});

// Initialize position
const initialActive = document.querySelector('.segment-btn.active');
if (initialActive) {
    updateSegmentIndicator(initialActive);
}

// 2. Password Visibility Toggle
const togglePasswordBtn = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
const eyeIcon = document.getElementById('eyeIcon');

if (togglePasswordBtn && passwordInput && eyeIcon) {
    togglePasswordBtn.addEventListener('click', () => {
        const isPassword = passwordInput.getAttribute('type') === 'password';
        passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
        eyeIcon.classList.toggle('fa-eye', !isPassword);
        eyeIcon.classList.toggle('fa-eye-slash', isPassword);
    });
}

// 3. Quick Demo Credentials Helper
window.fillDemo = function (username, password, role) {
    const userField = document.getElementById('username');
    const passField = document.getElementById('password');
    if (userField) userField.value = username;
    if (passField) passField.value = password;

    const targetBtn = document.querySelector(`.segment-btn[data-role="${role}"]`);
    if (targetBtn) {
        targetBtn.click();
    }
    if (window.FaceMarkToast) {
        window.FaceMarkToast.info(`Auto-filled ${role.toUpperCase()} credentials for testing.`, 'Demo Preset');
    }
};

// 4. Form Submission & Authentication Flow
const loginForm = document.getElementById('loginForm');
const submitBtn = document.getElementById('submitBtn');

if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const selectedRole = selectedRoleInput.value.toLowerCase().trim();

        if (!username || !password) {
            if (window.FaceMarkToast) {
                window.FaceMarkToast.error('Please provide both username and security password.', 'Validation Error');
            }
            return;
        }

        // Set Loading State
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            const baseUrl = window.FACEMARK_CONFIG?.API_BASE_URL || 'http://localhost:3001/api/v1';

            // Step A: Send login request
            const res = await fetch(`${baseUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const loginResponse = await res.json();

            if (!res.ok) {
                const errorDetail = loginResponse.message || 'Incorrect credentials or unverified account.';
                throw new Error(Array.isArray(errorDetail) ? errorDetail.join(', ') : errorDetail);
            }

            const token = loginResponse.data?.access_token || loginResponse.access_token || loginResponse.data?.token || loginResponse.token;
            if (!token) {
                throw new Error('Authentication succeeded but server returned no bearer token.');
            }

            // Step B: Verify Profile and Role
            let actualRole = selectedRole;
            try {
                const profileRes = await fetch(`${baseUrl}/auth/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (profileRes.ok) {
                    const profileData = await profileRes.json();
                    const user = profileData.data || profileData;
                    actualRole = (user.role || user.userType || selectedRole).toString().toLowerCase().trim();
                }
            } catch (pErr) {
                console.warn('[Auth] Profile check skipped, assuming selected role.', pErr);
            }

            // Step C: Role Enforcement (Prevent student logging in as admin)
            if (actualRole !== selectedRole) {
                throw new Error(`Role mismatch! Your account is registered as "${actualRole.toUpperCase()}", but you selected "${selectedRole.toUpperCase()}".`);
            }

            // Step D: Store Session
            localStorage.setItem('token', token);
            localStorage.setItem('username', username);
            localStorage.setItem('userRole', actualRole);

            if (window.FaceMarkToast) {
                window.FaceMarkToast.success(`Welcome back, ${username}! Redirecting to ${actualRole} workspace...`, 'Authorized');
            }

            // Step E: Smooth Redirection
            setTimeout(() => {
                const redirectPaths = {
                    'admin': 'Admin/dashboard admin/dashboard-index.html',
                    'staff': '../Staff/staffdashboard.html',
                    'student': '../Student/studentdashboard.html'
                };
                window.location.href = redirectPaths[selectedRole] || 'index.html';
            }, 1200);

        } catch (err) {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;

            const isOffline = err.message && err.message.includes('Failed to fetch');
            const errorMsg = isOffline
                ? 'Backend server unreachable. Ensure API is running on port 3001.'
                : err.message;

            if (window.FaceMarkToast) {
                window.FaceMarkToast.error(errorMsg, 'Authentication Failed');
            } else {
                alert(errorMsg);
            }
        }
    });
}