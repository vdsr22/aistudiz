document.addEventListener('DOMContentLoaded', () => {
    const fileUploadForm = document.getElementById('fileUploadForm');
    const fileInput = document.getElementById('fileInput');
    const fileName = document.getElementById('fileName');
    const uploadFileBtn = document.getElementById('uploadFileBtn');
    const summaryBtn = document.getElementById('summaryBtn');
    const questionsBtn = document.getElementById('questionsBtn');
    const contentArea = document.getElementById('contentArea');
    const backBtn = document.getElementById('backBtn');
    const userInfo = document.getElementById('userInfo');
    const processingIndicator = document.querySelector('.processing-indicator');

    const sessionId = new URLSearchParams(window.location.search).get('id');
    const token = localStorage.getItem('token');
    const guestId = localStorage.getItem('guestId');

    backBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

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
                headers: token ? { 'Authorization': `Bearer ${token}` } : { 'X-Guest-ID': guestId }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.fileName) {
                    fileInput.value = '';
                    fileName.textContent = `File: ${data.fileName}`;
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
            uploadFileBtn.style.display = 'inline-block';
        } else {
            fileName.textContent = '';
            uploadFileBtn.style.display = 'none';
        }
    });

    uploadFileBtn.addEventListener('click', handleFileUpload);

    async function handleFileUpload(e) {
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
            processingIndicator.style.display = 'flex';
            uploadFileBtn.style.display = 'none';

            const response = await fetch(`/api/study/sessions/${sessionId}/upload`, {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : { 'X-Guest-ID': guestId },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                alert('File uploaded and processed successfully');
                summaryBtn.style.display = 'inline-block';
                questionsBtn.style.display = 'inline-block';
                fileName.textContent = `File: ${file.name}`;
            } else {
                const data = await response.json();
                alert(data.message || 'An error occurred while uploading the file');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while uploading the file');
        } finally {
            processingIndicator.style.display = 'none';
        }
    }

    summaryBtn.addEventListener('click', fetchSummary);

    async function fetchSummary() {
        try {
            processingIndicator.style.display = 'flex';
            const response = await fetch(`/api/study/sessions/${sessionId}/summary`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : { 'X-Guest-ID': guestId }
            });

            if (response.ok) {
                const data = await response.json();
                displaySummary(data.summary);
            } else {
                const errorData = await response.json();
                alert(errorData.message || 'An error occurred while fetching the summary');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while fetching the summary');
        } finally {
            processingIndicator.style.display = 'none';
        }
    }

    function displaySummary(summary) {
        contentArea.innerHTML = `
            <h2>Summary</h2>
            <div class="summary-content">
                ${summary}
            </div>
        `;
    }

    questionsBtn.addEventListener('click', () => fetchQuestions(1));

    async function fetchQuestions(page) {
        try {
            processingIndicator.style.display = 'flex';
            const response = await fetch(`/api/study/sessions/${sessionId}/questions?page=${page}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : { 'X-Guest-ID': guestId }
            });
            if (response.ok) {
                const data = await response.json();
                displayQuestions(data);
            } else {
                const errorData = await response.json();
                alert(errorData.message || 'An error occurred while fetching the questions');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while fetching the questions');
        } finally {
            processingIndicator.style.display = 'none';
        }
    }

    function displayQuestions(data) {
        let questionsHtml = '<h2>Questions</h2>';
        data.questions.forEach((q, index) => {
            questionsHtml += `
                <div class="question">
                    <p><strong>Q${index + 1}. ${q.question}</strong></p>
                    ${q.options.map((option, optionIndex) => `
                        <label>
                            <input type="radio" name="q${index}" value="${option}">
                            ${['A', 'B', 'C', 'D'][optionIndex]}) ${option}
                        </label><br>
                    `).join('')}
                    <button onclick="revealAnswer(${index})">Reveal Answer</button>
                    <p class="answer" id="answer${index}" style="display:none;">Correct Answer: ${q.answer}</p>
                </div>
            `;
        });

        if (data.totalPages > 1) {
            questionsHtml += `
                <div class="pagination">
                    <button id="prevPage" ${data.currentPage === 1 ? 'disabled' : ''}>Previous</button>
                    <span>Page ${data.currentPage} of ${data.totalPages}</span>
                    <button id="nextPage" ${data.currentPage === data.totalPages ? 'disabled' : ''}>Next</button>
                </div>
            `;
        }

        contentArea.innerHTML = questionsHtml;

        if (data.totalPages > 1) {
            document.getElementById('prevPage').addEventListener('click', () => fetchQuestions(data.currentPage - 1));
            document.getElementById('nextPage').addEventListener('click', () => fetchQuestions(data.currentPage + 1));
        }
    }

    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('guestId');
        window.location.href = 'index.html';
    });
});

function revealAnswer(index) {
    const answerElement = document.getElementById(`answer${index}`);
    if (answerElement.style.display === 'none') {
        answerElement.style.display = 'block';
    } else {
        answerElement.style.display = 'none';
    }
}