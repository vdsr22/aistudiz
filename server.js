require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const { OpenAI } = require("openai");
const PDFParser = require('pdf-parse');
const mammoth = require("mammoth");

const app = express();

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  email: String,
  password: String
}));

const StudySession = mongoose.model('StudySession', new mongoose.Schema({
  userId: String,
  guestId: String,
  name: String,
  subject: String,
  fileContent: String,
  summary: String,
  questions: [{
    question: String,
    options: [String],
    answer: String
  }]
}));

app.use(express.json());
app.use(express.static('public'));
app.use(cookieParser());

const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  const guestId = req.cookies.guestId;

  if (token) {
    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { userId: verified.userId };
      next();
    } catch (error) {
      return res.status(403).json({ message: 'Invalid token' });
    }
  } else if (guestId) {
    req.guestId = guestId;
    next();
  } else {
    res.status(401).json({ message: 'Access denied' });
  }
};

const upload = multer({ dest: 'uploads/' });

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/api/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

app.post('/api/guest-login', (req, res) => {
  const guestId = Math.random().toString(36).substring(7);
  res.cookie('guestId', guestId, { maxAge: 4 * 24 * 60 * 60 * 1000, httpOnly: true });
  res.json({ message: 'Guest session started', guestId });
});

app.get('/api/study/sessions', authenticateToken, async (req, res) => {
  try {
    let sessions;
    if (req.user) {
      sessions = await StudySession.find({ userId: req.user.userId });
    } else if (req.guestId) {
      sessions = await StudySession.find({ guestId: req.guestId });
    } else {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching study sessions', error: error.message });
  }
});

app.post('/api/study/sessions', authenticateToken, async (req, res) => {
  try {
    const { name, subject } = req.body;
    let session;
    if (req.user) {
      session = new StudySession({ name, subject, userId: req.user.userId });
    } else if (req.guestId) {
      session = new StudySession({ name, subject, guestId: req.guestId });
    } else {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    await session.save();
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: 'Error creating study session', error: error.message });
  }
});

app.put('/api/study/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const { name, subject } = req.body;
    let session;
    if (req.user) {
      session = await StudySession.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.userId },
        { name, subject },
        { new: true }
      );
    } else if (req.guestId) {
      session = await StudySession.findOneAndUpdate(
        { _id: req.params.id, guestId: req.guestId },
        { name, subject },
        { new: true }
      );
    } else {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!session) {
      return res.status(404).json({ message: 'Study session not found' });
    }
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: 'Error updating study session', error: error.message });
  }
});

app.delete('/api/study/sessions/:id', authenticateToken, async (req, res) => {
  try {
    let session;
    if (req.user) {
      session = await StudySession.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    } else if (req.guestId) {
      session = await StudySession.findOneAndDelete({ _id: req.params.id, guestId: req.guestId });
    } else {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!session) {
      return res.status(404).json({ message: 'Study session not found' });
    }
    res.json({ message: 'Study session deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting study session', error: error.message });
  }
});

app.post('/api/study/sessions/:id/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log('File received:', req.file);

    let fileContent;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    console.log('File extension:', fileExtension);

    try {
      if (fileExtension === '.pdf') {
        const dataBuffer = fs.readFileSync(req.file.path);
        const pdfData = await PDFParser(dataBuffer);
        fileContent = pdfData.text;
      } else if (fileExtension === '.docx') {
        const result = await mammoth.extractRawText({ path: req.file.path });
        fileContent = result.value;
      } else if (fileExtension === '.doc') {
        return res.status(400).json({ message: 'DOC files are not supported. Please convert to DOCX.' });
      } else {
        fileContent = await readFile(req.file.path, 'utf8');
      }

      console.log('File content extracted successfully');
    } catch (fileError) {
      console.error('Error reading file:', fileError);
      return res.status(500).json({ message: 'Error reading file', error: fileError.message });
    }

    console.log('Sending content to AI for processing');
    const aiResponse = await processWithAI(fileContent);
    console.log('AI processing complete');

    let session;
    const updateData = { 
      fileContent: fileContent,
      summary: aiResponse.summary,
      questions: aiResponse.questions
    };

    if (req.user) {
      session = await StudySession.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.userId },
        { $set: updateData },
        { new: true }
      );
    } else if (req.guestId) {
      session = await StudySession.findOneAndUpdate(
        { _id: req.params.id, guestId: req.guestId },
        { $set: updateData },
        { new: true }
      );
    }

    if (!session) {
      return res.status(404).json({ message: 'Study session not found' });
    }

    console.log('Study session updated successfully');

    fs.unlinkSync(req.file.path);

    res.json({ message: 'File processed successfully', session });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ message: 'Error processing file', error: error.message });
  }
});

app.get('/api/study/sessions/:id/summary', authenticateToken, async (req, res) => {
  try {
    let session;
    if (req.user) {
      session = await StudySession.findOne({ _id: req.params.id, userId: req.user.userId });
    } else if (req.guestId) {
      session = await StudySession.findOne({ _id: req.params.id, guestId: req.guestId });
    }
    
    if (!session) {
      return res.status(404).json({ message: 'Study session not found' });
    }
    if (!session.summary) {
      return res.status(404).json({ message: 'Summary not found. Please upload a file first.' });
    }
    res.json({ summary: session.summary });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching summary', error: error.message });
  }
});

app.get('/api/study/sessions/:id/questions', authenticateToken, async (req, res) => {
  try {
    let session;
    if (req.user) {
      session = await StudySession.findOne({ _id: req.params.id, userId: req.user.userId });
    } else if (req.guestId) {
      session = await StudySession.findOne({ _id: req.params.id, guestId: req.guestId });
    }
    
    if (!session) {
      return res.status(404).json({ message: 'Study session not found' });
    }
    if (!session.questions || session.questions.length === 0) {
      return res.status(404).json({ message: 'Questions not found. Please upload a file first.' });
    }
    res.json({ questions: session.questions });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching questions', error: error.message });
  }
});

async function processWithAI(content) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const summaryResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {role: "system", content: "You are a helpful assistant that summarizes text."},
        {role: "user", content: `Summarize the following text:\n\n${content}`}
      ],
      max_tokens: 150,
      temperature: 0.5,
    });
    const summary = summaryResponse.choices[0].message.content.trim();

    const questionsResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {role: "system", content: "You are a helpful assistant that generates multiple-choice questions."},
        {role: "user", content: `Generate 5 multiple-choice questions based on the following text:\n\n${content}\n\nFormat each question as follows:\nQuestion: [Question text]\nA) [Option A]\nB) [Option B]\nC) [Option C]\nD) [Option D]\nAnswer: [Correct option letter]`}
      ],
      max_tokens: 500,
      temperature: 0.7,
    });
    const questionsText = questionsResponse.choices[0].message.content.trim();

    const questions = questionsText.split('\n\n').map(q => {
      const [questionLine, ...rest] = q.split('\n');
      const question = questionLine.replace('Question: ', '');
      const options = rest.slice(0, -1).map(o => o.slice(3));
      const answer = rest[rest.length - 1].replace('Answer: ', '');
      return {
        question,
        options,
        answer
      };
    });

    return { summary, questions };
  } catch (error) {
    console.error('Error processing with AI:', error);
    return {
      summary: "Summary generation failed due to API limitations. Please try again later.",
      questions: [{
        question: "Sample question (API limitation)",
        options: ["Option A", "Option B", "Option C", "Option D"],
        answer: "A"
      }]
    };
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));