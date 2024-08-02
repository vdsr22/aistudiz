document.addEventListener('DOMContentLoaded', () => {
    const fileUploadForm = document.getElementById('fileUploadForm');
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');
    const summaryBtn = document.getElementById('summaryBtn');
    const questionsBtn = document.getElementById('questionsBtn');
    const contentArea = document.getElementById('contentArea');

    const sessionId = new URLSearchParams(window.location.search).get('id');
    const token = localStorage.getItem('token');
    const guestId = localStorage.getItem('guestId');

    async function checkExistingData() {
        try {
            const response = await fetch(`/api/study/sessions/${sessionId}/data`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.fileName) {
                    fileInput.value = ''; // Clear the file input
                    const fileNameSpan = document.createElement('span');
                    fileNameSpan.textContent = `File: ${data.fileName}`;
                    fileUploadForm.insertBefore(fileNameSpan, uploadButton);
                    uploadButton.textContent = 'Replace File';
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

    fileUploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

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
                // Update the file name display
                const fileNameSpan = document.querySelector('span') || document.createElement('span');
                fileNameSpan.textContent = `File: ${fileInput.files[0].name}`;
                if (!document.querySelector('span')) {
                    fileUploadForm.insertBefore(fileNameSpan, uploadButton);
                }
                uploadButton.textContent = 'Replace File';
            } else {
                const data = await response.json();
                alert(data.message);
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
});

function revealAnswer(index) {
    document.getElementById(`answer${index}`).style.display = 'block';
}