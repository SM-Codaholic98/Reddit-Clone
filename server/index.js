import express from 'express';
import session from 'express-session';
import cors from 'cors';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const app = express();
const port = 3000;

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(session({
  secret: 'reddit_clone_secret_key_2023',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'db_password',
  database: 'reddit_clone',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize database tables
async function initDB() {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS votes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        user_id INT NOT NULL,
        vote_type ENUM('up', 'down') NOT NULL,
        FOREIGN KEY (post_id) REFERENCES posts(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE KEY unique_vote (post_id, user_id)
      )
    `);
  } finally {
    connection.release();
  }
}

initDB();

// Auth middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
};

// Auth routes
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );
    res.json({ id: result.insertId, username });
  } catch (error) {
    res.status(400).json({ error: 'Username already exists' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    res.json({ id: user.id, username: user.username });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out' });
});

// Post routes
app.get('/api/posts', async (req, res) => {
  try {
    const [posts] = await pool.query(`
      SELECT p.*, u.username, 
        COALESCE(SUM(CASE WHEN v.vote_type = 'up' THEN 1 WHEN v.vote_type = 'down' THEN -1 ELSE 0 END), 0) as votes
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN votes v ON p.id = v.post_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/posts', isAuthenticated, async (req, res) => {
  const { title, content } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO posts (title, content, user_id) VALUES (?, ?, ?)',
      [title, content, req.session.userId]
    );
    res.json({ id: result.insertId, title, content });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/posts/:id', isAuthenticated, async (req, res) => {
  const { title, content } = req.body;
  const postId = req.params.id;
  try {
    const [result] = await pool.query(
      'UPDATE posts SET title = ?, content = ? WHERE id = ? AND user_id = ?',
      [title, content, postId, req.session.userId]
    );
    if (result.affectedRows === 0) {
      res.status(403).json({ error: 'Not authorized' });
    } else {
      res.json({ id: postId, title, content });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/posts/:id', isAuthenticated, async (req, res) => {
  const postId = req.params.id;
  try {
    const [result] = await pool.query(
      'DELETE FROM posts WHERE id = ? AND user_id = ?',
      [postId, req.session.userId]
    );
    if (result.affectedRows === 0) {
      res.status(403).json({ error: 'Not authorized' });
    } else {
      res.json({ message: 'Post deleted' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/posts/:id/vote', isAuthenticated, async (req, res) => {
  const { voteType } = req.body;
  const postId = req.params.id;
  try {
    await pool.query(
      'REPLACE INTO votes (post_id, user_id, vote_type) VALUES (?, ?, ?)',
      [postId, req.session.userId, voteType]
    );
    res.json({ message: 'Vote recorded' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});