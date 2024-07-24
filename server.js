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
const { Configuration, OpenAIApi } = require("openai");

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

    const fileContent = await readFile(req.file.path, 'utf8');

    const aiResponse = await processWithAI(fileContent);

    let session;
    if (req.user) {
      session = await StudySession.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.userId },
        { 
          $set: { 
            fileContent: fileContent,
            summary: aiResponse.summary,
            questions: aiResponse.questions
          }
        },
        { new: true }
      );
    } else if (req.guestId) {
      session = await StudySession.findOneAndUpdate(
        { _id: req.params.id, guestId: req.guestId },
        { 
          $set: { 
            fileContent: fileContent,
            summary: aiResponse.summary,
            questions: aiResponse.questions
          }
        },
        { new: true }
      );
    }

    if (!session) {
      return res.status(404).json({ message: 'Study session not found' });
    }

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
    res.json({ questions: session.questions });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching questions', error: error.message });
  }
});

async function processWithAI(content) {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

  try {
    const summaryResponse = await openai.createCompletion({
      model: "text-davinci-002",
      prompt: `Summarize the following text:\n\n${content}\n\nSummary:`,
      max_tokens: 150,
      n: 1,
      stop: null,
      temperature: 0.5,
    });
    const summary = summaryResponse.data.choices[0].text.trim();

    const questionsResponse = await openai.createCompletion({
      model: "text-davinci-002",
      prompt: `Generate 5 multiple-choice questions based on the following text:\n\n${content}\n\nQuestions:`,
      max_tokens: 500,
      n: 1,
      stop: null,
      temperature: 0.7,
    });
    const questionsText = questionsResponse.data.choices[0].text.trim();

    const questions = questionsText.split('\n\n').map(q => {
      const [question, ...options] = q.split('\n');
      const answer = options[options.length - 1].replace('Answer: ', '');
      return {
        question: question.replace(/^\d+\.\s*/, ''),
        options: options.slice(0, -1).map(o => o.replace(/^[A-D]\)\s*/, '')),
        answer
      };
    });

    return { summary, questions };
  } catch (error) {
    console.error('Error processing with AI:', error);
    throw new Error('Failed to process content with AI');
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));