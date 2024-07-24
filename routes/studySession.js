const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const StudySession = require('../models/StudySession');

const verifyToken = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: 'Access denied' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = verified.userId;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token' });
  }
};

router.get('/sessions', verifyToken, async (req, res) => {
  try {
    const sessions = await StudySession.find({ userId: req.userId });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching study sessions', error: error.message });
  }
});

router.post('/sessions', verifyToken, async (req, res) => {
  try {
    const { name, subject } = req.body;
    const session = new StudySession({ name, subject, userId: req.userId });
    await session.save();
    res.status(201).json(session);
  } catch (error) {
    res.status(400).json({ message: 'Error creating study session', error: error.message });
  }
});

router.delete('/sessions/:id', verifyToken, async (req, res) => {
  try {
    await StudySession.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ message: 'Study session deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting study session', error: error.message });
  }
});

module.exports = router;