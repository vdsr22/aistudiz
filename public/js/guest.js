document.addEventListener('DOMContentLoaded', () => {
    const userInfo = document.getElementById('userInfo');
    const backToLoginBtn = document.getElementById('backToLoginBtn');
    const createSessionBtn = document.getElementById('createSessionBtn');
    const createSessionModal = document.getElementById('createSessionModal');
    const createSessionForm = document.getElementById('createSessionForm');
    const sessionList = document.getElementById('sessionList');
    const closeBtn = document.querySelector('.close');
    const editSessionModal = document.getElementById('editSessionModal');
    const editSessionForm = document.getElementById('editSessionForm');
    const editSessionName = document.getElementById('editSessionName');
    const editSubject = document.getElementById('editSubject');
    const editCloseBtn = editSessionModal.querySelector('.close');

    const guestId = getCookie('guestId') || localStorage.getItem('guestId');

    if (!guestId) {
        console.error('No guestId found in cookies or localStorage');
        window.location.href = 'login.html';
        return;
    }

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    function displayUserInfo() {
        userInfo.innerHTML = `<p>Guest User</p>`;
    }

    async function getStudySessions() {
        try {
            const response = await fetch('/api/study/sessions', {
                headers: { 
                    'X-Guest-ID': guestId
                },
                credentials: 'include'
            });
            if (response.ok) {
                const sessions = await response.json();
                return sessions;
            } else {
                throw new Error('Failed to fetch study sessions');
            }
        } catch (error) {
            console.error('Error:', error);
            return [];
        }
    }

    async function deleteAllStudySessions() {
        try {
            const response = await fetch('/api/study/sessions', {
                method: 'DELETE',
                headers: {
                    'X-Guest-ID': guestId
                }
            });
            if (!response.ok) {
                throw new Error('Failed to delete study sessions');
            }
        } catch (error) {
            console.error('Error deleting sessions:', error);
        }
    }

    async function createStudySession(sessionData) {
        try {
            const response = await fetch('/api/study/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Guest-ID': guestId
                },
                body: JSON.stringify(sessionData),
                credentials: 'include'
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

    async function displayStudySessions() {
        const sessions = await getStudySessions();
        sessionList.innerHTML = '';
        sessions.forEach((session) => {
            const sessionElement = document.createElement('div');
            sessionElement.classList.add('session-item');
            sessionElement.innerHTML = `
                <h4>${session.name}</h4>
                <p>Subject: ${session.subject}</p>
                <div class="session-actions">
                    <a href="guestStudySession.html?id=${session._id}" class="btn btn-primary btn-sm">Open Session</a>
                    <button class="btn btn-secondary btn-sm edit-session" data-id="${session._id}">Edit</button>
                    <button class="btn btn-danger btn-sm delete-session" data-id="${session._id}">Delete</button>
                </div>
            `;
            sessionList.appendChild(sessionElement);
        });

        // Add event listeners for edit and delete buttons
        document.querySelectorAll('.edit-session').forEach(button => {
            button.addEventListener('click', handleEditSession);
        });
        document.querySelectorAll('.delete-session').forEach(button => {
            button.addEventListener('click', handleDeleteSession);
        });
    }

    async function handleEditSession(event) {
        const sessionId = event.target.getAttribute('data-id');
        const sessionElement = event.target.closest('.session-item');
        const nameElement = sessionElement.querySelector('h4');
        const subjectElement = sessionElement.querySelector('p');

        // Populate the form with current values
        editSessionName.value = nameElement.textContent;
        editSubject.value = subjectElement.textContent.replace('Subject: ', '');

        // Show the modal
        editSessionModal.style.display = 'block';

        // Handle form submission
        editSessionForm.onsubmit = async (e) => {
            e.preventDefault();
            const newName = editSessionName.value;
            const newSubject = editSubject.value;

            if (newName && newSubject) {
                try {
                    const response = await fetch(`/api/study/sessions/${sessionId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Guest-ID': guestId
                        },
                        body: JSON.stringify({ name: newName, subject: newSubject })
                    });

                    if (response.ok) {
                        nameElement.textContent = newName;
                        subjectElement.textContent = `Subject: ${newSubject}`;
                        editSessionModal.style.display = 'none';
                        alert('Session updated successfully');
                    } else {
                        throw new Error('Failed to update session');
                    }
                } catch (error) {
                    console.error('Error updating session:', error);
                    alert('Failed to update session');
                }
            }
        };
    }

    async function handleDeleteSession(event) {
        const sessionId = event.target.getAttribute('data-id');
        const confirmDelete = confirm('Are you sure you want to delete this session?');

        if (confirmDelete) {
            try {
                const response = await fetch(`/api/study/sessions/${sessionId}`, {
                    method: 'DELETE',
                    headers: {
                        'X-Guest-ID': guestId
                    }
                });

                if (response.ok) {
                    event.target.closest('.session-item').remove();
                    alert('Session deleted successfully');
                } else {
                    throw new Error('Failed to delete session');
                }
            } catch (error) {
                console.error('Error deleting session:', error);
                alert('Failed to delete session');
            }
        }
    }

    backToLoginBtn.addEventListener('click', async () => {
        const confirmLogout = confirm("Logging out will delete all the study sessions. Are you sure you want to logout?");
        if (confirmLogout) {
            await deleteAllStudySessions(); // Delete all sessions
            document.cookie = 'guestId=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            localStorage.removeItem('guestId');
            window.location.href = 'login.html';
        }
    });

    createSessionBtn.addEventListener('click', () => {
        createSessionModal.style.display = 'block';
    });

    createSessionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const sessionName = document.getElementById('sessionName').value;
        const subject = document.getElementById('subject').value;
        const newSession = await createStudySession({ name: sessionName, subject });
        if (newSession) {
            createSessionModal.style.display = 'none';
            createSessionForm.reset();
            await displayStudySessions();
        } else {
            alert('Failed to create study session');
        }
    });

    closeBtn.addEventListener('click', () => {
        createSessionModal.style.display = 'none';
    });

    editCloseBtn.addEventListener('click', () => {
        editSessionModal.style.display = 'none';
    });

    window.onclick = function(event) {
        if (event.target === createSessionModal) {
            createSessionModal.style.display = "none";
        }
        if (event.target === editSessionModal) {
            editSessionModal.style.display = "none";
        }
    }

    displayUserInfo();
    displayStudySessions();
});