document.addEventListener('DOMContentLoaded', () => {
    const userInfo = document.getElementById('userInfo');
    const logoutBtn = document.getElementById('logoutBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const createSessionBtn = document.getElementById('createSessionBtn');
    const createSessionModal = document.getElementById('createSessionModal');
    const createSessionForm = document.getElementById('createSessionForm');
    const sessionList = document.getElementById('sessionList');
    const closeBtn = document.querySelector('.close');
    const modalTitle = document.getElementById('modalTitle');
    const submitSessionBtn = document.getElementById('submitSessionBtn');

    const token = localStorage.getItem('token');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (!token || !currentUser) {
        window.location.href = 'login.html';
    }

    function displayUserInfo() {
        userInfo.innerHTML = `
            <p>Welcome, ${currentUser.username}!</p>
            <p>Email: ${currentUser.email}</p>
        `;
    }

    async function getStudySessions() {
        try {
            const response = await fetch('/api/study/sessions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const sessions = await response.json();
                console.log('Fetched sessions:', sessions);
                return sessions;
            } else {
                throw new Error('Failed to fetch study sessions');
            }
        } catch (error) {
            console.error('Error:', error);
            return [];
        }
    }

    async function createStudySession(sessionData) {
        try {
            const response = await fetch('/api/study/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(sessionData)
            });
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Failed to create study session');
            }
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    }

    async function updateStudySession(sessionId, sessionData) {
        try {
            const response = await fetch(`/api/study/sessions/${sessionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(sessionData)
            });
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Failed to update study session');
            }
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    }

    async function deleteStudySession(sessionId) {
        try {
            const response = await fetch(`/api/study/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                return true;
            } else {
                throw new Error('Failed to delete study session');
            }
        } catch (error) {
            console.error('Error:', error);
            return false;
        }
    }

    async function displayStudySessions() {
        const sessions = await getStudySessions();
        sessionList.innerHTML = '';
        sessions.forEach((session) => {
            const sessionElement = document.createElement('div');
            sessionElement.classList.add('session-item');
            sessionElement.innerHTML = `
              <h4>${session.name}</h4>
              <p>Subject: ${session.subject}</p>
              <a href="studySession.html?id=${session._id}">Open Session</a>
              <button onclick="editSession('${session._id}')">Edit</button>
              <button onclick="deleteSession('${session._id}')">Delete</button>
            `;
            sessionList.appendChild(sessionElement);
        });
    }

    createSessionBtn.addEventListener('click', () => {
        modalTitle.textContent = 'Create New Study Session';
        submitSessionBtn.textContent = 'Create Session';
        createSessionForm.reset();
        createSessionModal.style.display = 'block';
    });

    createSessionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const sessionName = document.getElementById('sessionName').value;
        const subject = document.getElementById('subject').value;
        
        if (createSessionForm.dataset.mode === 'edit') {
            const sessionId = createSessionForm.dataset.sessionId;
            const updatedSession = await updateStudySession(sessionId, { name: sessionName, subject });
            if (updatedSession) {
                createSessionModal.style.display = 'none';
                createSessionForm.reset();
                await displayStudySessions();
            } else {
                alert('Failed to update study session');
            }
        } else {
            const newSession = await createStudySession({ name: sessionName, subject });
            if (newSession) {
                createSessionModal.style.display = 'none';
                createSessionForm.reset();
                await displayStudySessions();
                console.log('New session created and displayed');
            } else {
                alert('Failed to create study session');
            }
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    });

    settingsBtn.addEventListener('click', () => {
        alert('Settings functionality to be implemented');
    });

    closeBtn.addEventListener('click', () => {
        createSessionModal.style.display = 'none';
    });

    window.onclick = function(event) {
        if (event.target === createSessionModal) {
            createSessionModal.style.display = "none";
        }
    }

    window.editSession = async function(sessionId) {
        const sessions = await getStudySessions();
        const session = sessions.find(s => s._id === sessionId);
        if (session) {
            document.getElementById('sessionName').value = session.name;
            document.getElementById('subject').value = session.subject;
            modalTitle.textContent = 'Edit Study Session';
            submitSessionBtn.textContent = 'Update Session';
            createSessionForm.dataset.mode = 'edit';
            createSessionForm.dataset.sessionId = sessionId;
            createSessionModal.style.display = 'block';
        }
    }

    window.deleteSession = async function(sessionId) {
        if (confirm('Are you sure you want to delete this study session?')) {
            const deleted = await deleteStudySession(sessionId);
            if (deleted) {
                await displayStudySessions();
            } else {
                alert('Failed to delete study session');
            }
        }
    }

    displayUserInfo();
    displayStudySessions();
});