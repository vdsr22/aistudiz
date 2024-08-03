document.addEventListener('DOMContentLoaded', () => {
    const fileUploadForm = document.getElementById('fileUploadForm');
    const fileInput = document.getElementById('fileInput');
    const fileName = document.getElementById('fileName');
    const replaceFileBtn = document.getElementById('replaceFileBtn');
    const summaryBtn = document.getElementById('summaryBtn');
    const questionsBtn = document.getElementById('questionsBtn');
    const contentArea = document.getElementById('contentArea');
    const backBtn = document.getElementById('backBtn');
    const userInfo = document.getElementById('userInfo');

    const sessionId = new URLSearchParams(window.location.search).get('id');
    const token = localStorage.getItem('token');
    const guestId = localStorage.getItem('guestId');

    // Add functionality for the back button
    backBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    // Display user info
    function displayUserInfo() {
        const username = localStorage.getItem('username');
        if (username) {
            userInfo.innerHTML = `<p>Welcome, ${username}</p>`;
        } else if (guestId) {
            userInfo.innerHTML = `<p>Guest User</p>`;
        }
    }

    displayUserInfo();

    async function checkExistingData() {
        try {
            const response = await fetch(`/api/study/sessions/${sessionId}/data`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.fileName) {
                    fileInput.value = ''; // Clear the file input
                    fileName.textContent = `File: ${data.fileName}`;
                    replaceFileBtn.textContent = 'Replace File';
                    summaryBtn.style.display = 'inline-block';
                    questionsBtn.style.display = 'inline-block';
                }
            } else {
                console.error('Error checking existing data:', await response.text());
            }
        } catch (error) {
            console.error('Error checking existing data:', error);
        }
    }

    checkExistingData();

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            fileName.textContent = `File: ${file.name}`;
            replaceFileBtn.textContent = 'Upload File';
        } else {
            fileName.textContent = '';
            replaceFileBtn.textContent = 'Replace File';
        }
    });

    replaceFileBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const file = fileInput.files[0];
        if (!file) {
            alert('Please select a file first.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('File size exceeds 5MB limit. Please choose a smaller file.');
            return;
        }
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`/api/study/sessions/${sessionId}/upload`, {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                alert('File uploaded and processed successfully');
                summaryBtn.style.display = 'inline-block';
                questionsBtn.style.display = 'inline-block';
                replaceFileBtn.textContent = 'Replace File';
                fileName.textContent = `File: ${file.name}`;
            } else {
                const data = await response.json();
                alert(data.message || 'An error occurred while uploading the file');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while uploading the file');
        }
    });

    summaryBtn.addEventListener('click', async () => {
        try {
            const response = await fetch(`/api/study/sessions/${sessionId}/summary`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (response.ok) {
                const data = await response.json();
                contentArea.innerHTML = `<h2>Summary</h2><p>${data.summary}</p>`;
            } else {
                const data = await response.json();
                alert(data.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while fetching the summary');
        }
    });

    questionsBtn.addEventListener('click', async () => {
        try {
            const response = await fetch(`/api/study/sessions/${sessionId}/questions`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (response.ok) {
                const data = await response.json();
                let questionsHtml = '<h2>Questions</h2>';
                data.questions.forEach((q, index) => {
                    questionsHtml += `
                        <div class="question">
                            <p>${index + 1}. ${q.question}</p>
                            ${q.options.map(option => `<label><input type="radio" name="q${index}" value="${option}"> ${option}</label><br>`).join('')}
                            <button onclick="revealAnswer(${index})">Reveal Answer</button>
                            <p class="answer" id="answer${index}" style="display:none;">Answer: ${q.answer}</p>
                        </div>
                    `;
                });
                contentArea.innerHTML = questionsHtml;
            } else {
                const data = await response.json();
                alert(data.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while fetching the questions');
        }
    });

    // Add logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('guestId');
        window.location.href = 'index.html';
    });
});

function revealAnswer(index) {
    document.getElementById(`answer${index}`).style.display = 'block';
}document.addEventListener('DOMContentLoaded', () => {
    const fileUploadForm = document.getElementById('fileUploadForm');
    const fileInput = document.getElementById('fileInput');
    const fileName = document.getElementById('fileName');
    const replaceFileBtn = document.getElementById('replaceFileBtn');
    const summaryBtn = document.getElementById('summaryBtn');
    const questionsBtn = document.getElementById('questionsBtn');
    const contentArea = document.getElementById('contentArea');
    const backBtn = document.getElementById('backBtn');
    const userInfo = document.getElementById('userInfo');

    const sessionId = new URLSearchParams(window.location.search).get('id');
    const token = localStorage.getItem('token');
    const guestId = localStorage.getItem('guestId');

    // Add functionality for the back button
    backBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    // Display user info
    function displayUserInfo() {
        const username = localStorage.getItem('username');
        if (username) {
            userInfo.innerHTML = `<p>Welcome, ${username}</p>`;
        } else if (guestId) {
            userInfo.innerHTML = `<p>Guest User</p>`;
        }
    }

    displayUserInfo();

    async function checkExistingData() {
        try {
            const response = await fetch(`/api/study/sessions/${sessionId}/data`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.fileName) {
                    fileInput.value = ''; // Clear the file input
                    fileName.textContent = `File: ${data.fileName}`;
                    replaceFileBtn.textContent = 'Replace File';
                    summaryBtn.style.display = 'inline-block';
                    questionsBtn.style.display = 'inline-block';
                }
            } else {
                console.error('Error checking existing data:', await response.text());
            }
        } catch (error) {
            console.error('Error checking existing data:', error);
        }
    }

    checkExistingData();

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            fileName.textContent = `File: ${file.name}`;
            replaceFileBtn.textContent = 'Upload File';
        } else {
            fileName.textContent = '';
            replaceFileBtn.textContent = 'Replace File';
        }
    });

    replaceFileBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const file = fileInput.files[0];
        if (!file) {
            alert('Please select a file first.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('File size exceeds 5MB limit. Please choose a smaller file.');
            return;
        }
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`/api/study/sessions/${sessionId}/upload`, {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                alert('File uploaded and processed successfully');
                summaryBtn.style.display = 'inline-block';
                questionsBtn.style.display = 'inline-block';
                replaceFileBtn.textContent = 'Replace File';
                fileName.textContent = `File: ${file.name}`;
            } else {
                const data = await response.json();
                alert(data.message || 'An error occurred while uploading the file');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while uploading the file');
        }
    });

    summaryBtn.addEventListener('click', async () => {
        try {
            const response = await fetch(`/api/study/sessions/${sessionId}/summary`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (response.ok) {
                const data = await response.json();
                contentArea.innerHTML = `<h2>Summary</h2><p>${data.summary}</p>`;
            } else {
                const data = await response.json();
                alert(data.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while fetching the summary');
        }
    });

    questionsBtn.addEventListener('click', async () => {
        try {
            const response = await fetch(`/api/study/sessions/${sessionId}/questions`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (response.ok) {
                const data = await response.json();
                let questionsHtml = '<h2>Questions</h2>';
                data.questions.forEach((q, index) => {
                    questionsHtml += `
                        <div class="question">
                            <p>${index + 1}. ${q.question}</p>
                            ${q.options.map(option => `<label><input type="radio" name="q${index}" value="${option}"> ${option}</label><br>`).join('')}
                            <button onclick="revealAnswer(${index})">Reveal Answer</button>
                            <p class="answer" id="answer${index}" style="display:none;">Answer: ${q.answer}</p>
                        </div>
                    `;
                });
                contentArea.innerHTML = questionsHtml;
            } else {
                const data = await response.json();
                alert(data.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while fetching the questions');
        }
    });

    // Add logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('guestId');
        window.location.href = 'index.html';
    });
});

function revealAnswer(index) {
    document.getElementById(`answer${index}`).style.display = 'block';
}