document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const guestLoginBtn = document.getElementById('guestLogin');
    const forgotPasswordLink = document.getElementById('forgotPassword');
    const resetPasswordModal = document.getElementById('resetPasswordModal');
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const otpForm = document.getElementById('otpForm');
    const closeBtn = document.querySelector('.close');

    // Initialize EmailJS
    (function() {
        emailjs.init("azxlenxRR4vHf5C8Z"); // Replace with your actual EmailJS user ID
    })();

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
                localStorage.setItem('currentUser', JSON.stringify({
                    id: data.user.id,
                    username: data.user.username,
                    email: data.user.email
                }));
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
            const otp = Math.floor(100000 + Math.random() * 900000);
            
            // Send OTP via EmailJS
            const emailParams = {
                to_email: email,
                otp: otp.toString()
            };

            await emailjs.send("service_og1mzc4", "template_u03roix", emailParams);

            alert('OTP sent to your email');
            resetPasswordForm.style.display = 'none';
            otpForm.style.display = 'block';
            localStorage.setItem('resetEmail', email);
            localStorage.setItem('resetOTP', otp.toString());
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to send OTP. Please try again.');
        }
    });

    otpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const enteredOTP = document.getElementById('otp').value;
        const newPassword = document.getElementById('newPassword').value;
        const storedOTP = localStorage.getItem('resetOTP');
        const email = localStorage.getItem('resetEmail');

        if (enteredOTP === storedOTP) {
            try {
                const response = await fetch('/api/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, newPassword })
                });

                if (response.ok) {
                    alert('Password reset successfully');
                    resetPasswordModal.style.display = 'none';
                    localStorage.removeItem('resetOTP');
                    localStorage.removeItem('resetEmail');
                } else {
                    const data = await response.json();
                    alert(data.message);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred. Please try again.');
            }
        } else {
            alert('Invalid OTP');
        }
    });

    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target === resetPasswordModal) {
            resetPasswordModal.style.display = "none";
        }
    }
});