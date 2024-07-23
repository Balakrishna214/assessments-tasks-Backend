const express = require('express');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const dbPath = path.join(__dirname, 'goodreads.db');
let db = null;

app.use(cors());
app.use(express.json());

const JWT_SECRET = 'your_jwt_secret_key'; // Replace with your own secret key

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3008, () => {
      console.log('Server Running at http://localhost:3008/');
    });
  } catch (e) {
    console.error(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

app.post('/register', async (req, res) => {
  console.log("API called");

  const { username, email, password, confirmPassword } = req.body;

  // Basic validation
  if (!username || !email || !password || !confirmPassword) {
    return res.status(400).send('All fields are required');
  }

  if (password !== confirmPassword) {
    return res.status(400).send('Passwords do not match');
  }

  if (password.length < 8) {
    return res.status(400).send('Password must be at least 8 characters long');
  }

  try {
    // Check if user already exists
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (user) {
      return res.status(400).send('User already exists');
    }

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await db.run(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    // Generate JWT token
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ message: 'User registered', token });
  } catch (e) {
    console.error(`Error: ${e.message}`);
    res.status(500).send('Error registering user');
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Basic validation
  if (!username || !password) {
    return res.status(400).send('Username and password are required');
  }

  try {
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(400).send('User not found');
    }

    // Compare hashed password with input password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send('Invalid password');
    }

    // Generate JWT token
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ message: 'Login successful', token });
  } catch (e) {
    console.error(`Error: ${e.message}`);
    res.status(500).send('Error logging in');
  }
});

app.get('/test', (req, res) => {
  res.send('Server is running');
});



app.post('/submit-assignment', async (req, res) => {
  const { username, publishedUrl, driveLink, taskId } = req.body;

  // Basic validation
  if (!username || !publishedUrl || !driveLink || !taskId) {
    return res.status(400).send('All fields are required');
  }

  try {
    await db.run(
      'INSERT INTO assignments (username, published_url, drive_link, task_id) VALUES (?, ?, ?, ?)',
      [username, publishedUrl, driveLink, taskId]
    );
    
    res.status(201).send('Assignment submitted successfully');
  } catch (e) {
    console.error(`Error: ${e.message}`);
    res.status(500).send('Error submitting assignment');
  }
});
