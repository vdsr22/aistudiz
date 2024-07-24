document.addEventListener('DOMContentLoaded', () => {
    const userInfo = document.getElementById('userInfo');
    const backToLoginBtn = document.getElementById('backToLoginBtn');
    const createSessionBtn = document.getElementById('createSessionBtn');
    const createSessionModal = document.getElementById('createSessionModal');
    const createSessionForm = document.getElementById('createSessionForm');
    const sessionList = document.getElementById('sessionList');
    const closeBtn = document.querySelector('.close');

    function displayUserInfo() {
        userInfo.innerHTML = '<p>Welcome, Guest User!</p>';
    }

    function getGuestSessions() {
        return JSON.parse(localStorage.getItem('guestSessions')) || [];
    }

    function saveGuestSessions(sessions) {
        localStorage.setItem('guestSessions', JSON.stringify(sessions));
    }

    function displayStudySessions() {
        const sessions = getGuestSessions();
        sessionList.innerHTML = '';
        sessions.forEach((session, index) => {
            const sessionElement = document.createElement('div');
            sessionElement.classList.add('session-item');
            sessionElement.innerHTML = `
                <h4>${session.name}</h4>
                <p>Subject: ${session.subject}</p>
                <button onclick="editSession(${index})">Edit</button>
                <button onclick="deleteSession(${index})">Delete</button>
            `;
            sessionList.appendChild(sessionElement);
        });
    }

    createSessionBtn.addEventListener('click', () => {
        createSessionModal.style.display = 'block';
    });

    createSessionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const sessionName = document.getElementById('sessionName').value;
        const subject = document.getElementById('subject').value;
        
        const newSession = { name: sessionName, subject: subject };
        const sessions = getGuestSessions();
        sessions.push(newSession);
        saveGuestSessions(sessions);
        
        createSessionModal.style.display = 'none';
        createSessionForm.reset();
        displayStudySessions();
    });

    backToLoginBtn.addEventListener('click', () => {
        document.cookie = "guestSession=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = 'login.html';
    });

    closeBtn.addEventListener('click', () => {
        createSessionModal.style.display = 'none';
    });

    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target === createSessionModal) {
            createSessionModal.style.display = "none";
        }
    }

    // Edit and Delete functions
    window.editSession = function(index) {
        const sessions = getGuestSessions();
        const session = sessions[index];
        document.getElementById('sessionName').value = session.name;
        document.getElementById('subject').value = session.subject;
        createSessionModal.style.display = 'block';
        
        // Update the form submit event for editing
        createSessionForm.onsubmit = (e) => {
            e.preventDefault();
            sessions[index] = {
                name: document.getElementById('sessionName').value,
                subject: document.getElementById('subject').value
            };
            saveGuestSessions(sessions);
            createSessionModal.style.display = 'none';
            createSessionForm.reset();
            displayStudySessions();
            // Reset the form submit event
            createSessionForm.onsubmit = null;
        };
    }

    window.deleteSession = function(index) {
        const sessions = getGuestSessions();
        sessions.splice(index, 1);
        saveGuestSessions(sessions);
        displayStudySessions();
    }

    displayUserInfo();
    displayStudySessions();
});