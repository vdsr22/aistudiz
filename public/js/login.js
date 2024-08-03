document.addEventListener('DOMContentLoaded', async () => {
    const loginForm = document.getElementById('loginForm');
    const guestLoginBtn = document.getElementById('guestLogin');
    const forgotPasswordLink = document.getElementById('forgotPassword');
    const resetPasswordModal = document.getElementById('resetPasswordModal');
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const otpForm = document.getElementById('otpForm');
    const closeBtn = document.querySelector('.close');

    // Initialize EmailJS
    try {
        const response = await fetch('/api/email-config');
        const config = await response.json();
        emailjs.init(config.EMAILJS_USER_ID);
        window.EMAILJS_SERVICE_ID = config.EMAILJS_SERVICE_ID;
        window.EMAILJS_TEMPLATE_ID = config.EMAILJS_TEMPLATE_ID;
    } catch (error) {
        console.error('Failed to initialize EmailJS:', error);
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = document.getElementById('identifier').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password })
            });

            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                window.location.href = 'index.html';
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        }
    });

    guestLoginBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/guest-login', { method: 'POST' });
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('guestId', data.guestId);
                window.location.href = 'guest.html';
            } else {
                alert('Failed to start guest session');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        }
    });

    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        resetPasswordModal.style.display = 'block';
    });

    closeBtn.addEventListener('click', () => {
        resetPasswordModal.style.display = 'none';
    });

    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('resetEmail').value;
        
        try {
            const response = await fetch('/api/send-reset-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                // Send email using EmailJS
                const emailParams = {
                    to_email: email,
                    otp: data.otp
                };

                await emailjs.send(window.EMAILJS_SERVICE_ID, window.EMAILJS_TEMPLATE_ID, emailParams);

                alert('OTP sent to your email');
                resetPasswordForm.style.display = 'none';
                otpForm.style.display = 'block';
                localStorage.setItem('resetEmail', email);
            } else {
                alert(data.error || 'Failed to generate OTP. Please try again.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to send OTP. Please try again.');
        }
    });

    otpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const enteredOTP = document.getElementById('otp').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const email = localStorage.getItem('resetEmail');

        if (newPassword !== confirmPassword) {
            alert("Passwords don't match. Please try again.");
            return;
        }

        try {
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email, 
                    otp: enteredOTP, 
                    newPassword,
                    confirmNewPassword: confirmPassword
                })
            });

            const data = await response.json();
            if (response.ok) {
                alert('Password reset successfully');
                resetPasswordModal.style.display = 'none';
                localStorage.removeItem('resetEmail');
            } else {
                alert(data.error || 'An error occurred. Please try again.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please check the console and try again.');
        }
    });

    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target === resetPasswordModal) {
            resetPasswordModal.style.display = "none";
        }
    }
});