require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const crypto = require('crypto');
const stream = require('stream');
const { OpenAI } = require("openai");
const PDFParser = require('pdf-parse');
const mammoth = require("mammoth");
const cors = require('cors');
const emailjs = require('emailjs-com');

const app = express();

let gfs;

const connectWithRetry = () => {
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000
  })
  .then(() => {
    console.log('Connected to MongoDB');
    gfs = new GridFSBucket(mongoose.connection.db, {
      bucketName: 'uploads'
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  });
};

connectWithRetry();

const User = require('./models/User');
const StudySession = require('./models/StudySession');

app.use(express.json());
app.use(express.static('public'));
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Replace with your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Guest-ID'],
  credentials: true,
  optionsSuccessStatus: 200
}));
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  const guestId = req.cookies.guestId || req.header('X-Guest-ID');

  if (token) {
      try {
          const verified = jwt.verify(token, process.env.JWT_SECRET);
          req.user = { userId: verified.userId };
          next();
      } catch (error) {
          console.error('Token verification error:', error);
          return res.status(403).json({ message: 'Invalid token' });
      }
  } else if (guestId) {
      req.guestId = guestId;
      next();
  } else {
      res.status(401).json({ message: 'Access denied' });
  }
};

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/api/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    const user = new User({ username, email, password });
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    console.log('Login attempt for:', identifier);

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });

    if (!user) {
      console.log('User not found:', identifier);
      return res.status(401).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Invalid password for user:', identifier);
      return res.status(401).json({ message: 'Invalid password' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('Login successful for user:', identifier);
    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

app.post('/api/guest/login', (req, res) => {
  try {
      const guestId = Math.random().toString(36).substring(7);
      res.cookie('guestId', guestId, { 
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
          sameSite: 'strict'
      });
      res.json({ message: 'Guest session started', guestId });
  } catch (error) {
      console.error('Error creating guest session:', error);
      res.status(500).json({ message: 'Failed to create guest session', error: error.message });
  }
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
      console.error('Error fetching study sessions:', error);
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
      console.error('Error creating study session:', error);
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
    console.error('Error updating study session:', error);
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

    if (session.fileId) {
      await gfs.delete(new mongoose.Types.ObjectId(session.fileId));
    }

    res.json({ message: 'Study session and associated data deleted successfully' });
  } catch (error) {
    console.error('Error deleting study session:', error);
    res.status(500).json({ message: 'Error deleting study session', error: error.message });
  }
});



app.post('/api/send-reset-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const otp = user.generatePasswordResetOTP();
    await user.save();

    // TODO: Implement actual email sending here
    // For now, we'll just log the OTP to the console
    console.log(`OTP for ${email}: ${otp}`);

    // In a production environment, you would send an email here
    // For development, we'll just send the OTP in the response
    res.json({ message: 'OTP sent successfully', otp });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: 'Error sending OTP', details: error.message });
  }
});


app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.verifyPasswordResetOTP(otp)) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Reset the password
    user.password = newPassword;
    user.passwordResetOTP = undefined;
    user.passwordResetOTPExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Error resetting password', details: error.message });
  }
});


app.post('/api/study/sessions/:id/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log('File received:', req.file.originalname);

    const filename = `${crypto.randomBytes(16).toString('hex')}${path.extname(req.file.originalname)}`;
    const uploadStream = gfs.openUploadStream(filename, {
      contentType: req.file.mimetype
    });

    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);
    bufferStream.pipe(uploadStream);

    uploadStream.on('finish', async () => {
      const fileId = uploadStream.id;
      let fileContent;
      const fileExtension = path.extname(req.file.originalname).toLowerCase();

      try {
        const fileBuffer = req.file.buffer;
        
        if (fileExtension === '.pdf') {
          const pdfData = await PDFParser(fileBuffer);
          fileContent = pdfData.text;
        } else if (fileExtension === '.docx') {
          const result = await mammoth.extractRawText({ buffer: fileBuffer });
          fileContent = result.value;
        } else if (fileExtension === '.doc') {
          return res.status(400).json({ message: 'DOC files are not supported. Please convert to DOCX.' });
        } else {
          fileContent = fileBuffer.toString('utf8');
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
        fileId: fileId,
        summary: aiResponse.summary,
        questions: aiResponse.questions,
        processedData: JSON.stringify(aiResponse),
        fileName: req.file.originalname
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
      res.json({ message: 'File processed successfully', session });
    });

    uploadStream.on('error', (error) => {
      console.error('Error uploading file:', error);
      res.status(500).json({ message: 'Error uploading file', error: error.message });
    });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ message: 'Error processing file', error: error.message });
  }
});

app.get('/api/email-config', (req, res) => {
  res.json({
      EMAILJS_USER_ID: process.env.EMAILJS_USER_ID,
      EMAILJS_SERVICE_ID: process.env.EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID: process.env.EMAILJS_TEMPLATE_ID
  });
});

app.get('/api/study/sessions/:id/data', authenticateToken, async (req, res) => {
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
    
    if (!session.fileId) {
      return res.status(404).json({ message: 'No file uploaded for this session' });
    }
    
    res.json({
      fileName: session.fileName,
      summary: session.summary,
      questions: session.questions,
      processedData: session.processedData
    });
  } catch (error) {
    console.error('Error fetching session data:', error);
    res.status(500).json({ message: 'Error fetching session data', error: error.message });
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
    console.error('Error fetching summary:', error);
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
    console.error('Error fetching questions:', error);
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
      temperature: 0.3,
    });
    const summary = summaryResponse.choices[0].message.content.trim();

    const questionsResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {role: "system", content: "You are a helpful assistant that generates multiple-choice questions."},
        {role: "user", content: `Generate 5 multiple-choice questions based on the following text:\n\n${content}\n\nFormat each question as follows:\nQuestion: [Question text]\nA) [Option A]\nB) [Option B]\nC) [Option C]\nD) [Option D]\nAnswer: [Correct option letter]`}
      ],
      max_tokens: 500,
      temperature: 0.3,
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

async function readFileFromGridFS(fileId) {
  return new Promise((resolve, reject) => {
    const downloadStream = gfs.openDownloadStream(new mongoose.Types.ObjectId(fileId));
    const chunks = [];
    downloadStream.on('data', (chunk) => chunks.push(chunk));
    downloadStream.on('error', reject);
    downloadStream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
