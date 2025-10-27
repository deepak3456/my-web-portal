const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const simpleGit = require('simple-git');
const client = require('prom-client');

const app = express();
const upload = multer({ dest: 'uploads/' });
const git = simpleGit();

// --- Middleware setup ---
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Prometheus metrics ---
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// --- Simple in-memory authentication ---
const USERNAME = 'admin';
const PASSWORD = 'admin';

// --- Routes ---
app.get('/', (req, res) => res.redirect('/login'));

app.get('/login', (req, res) => {
  res.send(`
    <h2>Login</h2>
    <form method="post" action="/login">
      <input name="username" placeholder="username"/>
      <input name="password" type="password" placeholder="password"/>
      <button type="submit">Login</button>
    </form>
  `);
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === USERNAME && password === PASSWORD) {
    res.redirect('/dashboard');
  } else {
    res.send('<h3>Invalid credentials. Please try again.</h3><a href="/login">Back to Login</a>');
  }
});

app.get('/dashboard', (req, res) => {
  res.send(`
    <h1>Welcome to the Dashboard!</h1>
    <p>This is your web portal home page.</p>
    <form action="/upload" method="post" enctype="multipart/form-data">
      <input type="file" name="file" />
      <button type="submit">Upload File</button>
    </form>
    <br/>
    <a href="/metrics">View Metrics</a>
  `);
});

// --- File upload route ---
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.send('No file uploaded.');
  }
  res.send(`File uploaded successfully: ${req.file.originalname}<br><a href="/dashboard">Back</a>`);
});
const { exec } = require('child_process');

app.post('/upload', upload.single('file'), (req, res) => {
  const fileName = req.file.filename;
  
  // Commit and push to GitHub
  exec(
    `git add uploads/${fileName} && git commit -m "Add uploaded file ${fileName}" && git push https://deepak3456:${process.env.GITHUB_TOKEN}@github.com/deepak3456/my-web-portal.git main`,
    (err, stdout, stderr) => {
      if (err) {
        console.error('Git push error:', stderr);
        return res.send(`<p>File uploaded locally, but Git push failed.</p><p>${stderr}</p>`);
      }
      res.send(`<p>File uploaded and pushed successfully: ${fileName}</p><a href="/">Back</a>`);
    }
  );
});


// --- Start the server ---
app.listen(3000, () => console.log('Web portal running on http://localhost:3000'));
