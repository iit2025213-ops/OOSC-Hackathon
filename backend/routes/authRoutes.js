import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: 'User registered successfully!', user: data.user });
  } catch (err) {
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return res.status(401).json({ error: error.message });
    // Return the session so the frontend gets the access_token (JWT)
    res.json({ message: 'Login successful!', session: data.session });
  } catch (err) {
    res.status(500).json({ error: 'Server error during login' });
  }
});

export default router;
