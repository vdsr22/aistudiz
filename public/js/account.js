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

    function getStudySessions() {
        return JSON.parse(localStorage.getItem(`studySessions_${currentUser.id}`)) || [];
    }

    function saveStudySessions(sessions) {
        localStorage.setItem(`studySessions_${currentUser.id}`, JSON.stringify(sessions));
    }

    function displayStudySessions() {
        const sessions = getStudySessions();
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
        modalTitle.textContent = 'Create New Study Session';
        submitSessionBtn.textContent = 'Create Session';
        createSessionForm.reset();
        createSessionModal.style.display = 'block';
    });

    createSessionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const sessionName = document.getElementById('sessionName').value;
        const subject = document.getElementById('subject').value;
        
        const sessions = getStudySessions();
        if (createSessionForm.dataset.mode === 'edit') {
            const index = parseInt(createSessionForm.dataset.index);
            sessions[index] = { name: sessionName, subject: subject };
        } else {
            sessions.push({ name: sessionName, subject: subject });
        }
        saveStudySessions(sessions);
        
        createSessionModal.style.display = 'none';
        createSessionForm.reset();
        displayStudySessions();
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

    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target === createSessionModal) {
            createSessionModal.style.display = "none";
        }
    }

    // Edit and Delete functions
    window.editSession = function(index) {
        const sessions = getStudySessions();
        const session = sessions[index];
        document.getElementById('sessionName').value = session.name;
        document.getElementById('subject').value = session.subject;
        modalTitle.textContent = 'Edit Study Session';
        submitSessionBtn.textContent = 'Update Session';
        createSessionForm.dataset.mode = 'edit';
        createSessionForm.dataset.index = index;
        createSessionModal.style.display = 'block';
    }

    window.deleteSession = function(index) {
        const sessions = getStudySessions();
        sessions.splice(index, 1);
        saveStudySessions(sessions);
        displayStudySessions();
    }

    displayUserInfo();
    displayStudySessions();
});