const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');

const app = express();
const mongoURI = 'mongodb://localhost:27017/musicDB';

// MongoDB connection
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB connected successfully');
})
.catch(err => console.error('Failed to connect to MongoDB:', err));

// Schema and model
const MusicFileSchema = new mongoose.Schema({
  filename: String,
  contentType: String,
  data: Buffer,
});

const MusicFile = mongoose.model('MusicFile', MusicFileSchema);

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', 
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdir(uploadsDir, { recursive: true })
  .catch(err => console.error('Failed to create uploads directory:', err));

// Multer configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

// Routes
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    console.error('No file received in the request');
    return res.status(400).send('No file uploaded.');
  }
  
  try {
    const musicFile = new MusicFile({
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      data: req.file.buffer,
    });
    await musicFile.save();
    res.json({
      id: musicFile._id,
      filename: musicFile.filename,
      contentType: musicFile.contentType,
    });
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).send(`Failed to save the file: ${error.message}`);
  }
});

app.get('/api/music', async (req, res) => {
  try {
    const musicFiles = await MusicFile.find({}, { filename: 1, contentType: 1 });
    console.log('Retrieved music files:', musicFiles);
    res.json(musicFiles);
  } catch (err) {
    console.error('Error retrieving music files:', err);
    res.status(500).send('An error occurred while retrieving the music files.');
  }
});

app.get('/api/music/download/:filename', async (req, res) => {
  try {
    const file = await MusicFile.findOne({ filename: req.params.filename });
    if (!file) {
      return res.status(404).send('File not found');
    }
    res.set('Content-Type', file.contentType);
    res.send(file.data);
  } catch (err) {
    console.error('Error downloading file:', err);
    res.status(500).send('An error occurred during the download process.');
  }
});

app.post('/upload-all', upload.any(), async (req, res) => {
  try {
    const directoryPath = path.join(__dirname, 'public');
    const files = await fs.readdir(directoryPath);
    
    for (const file of files) {
      if (path.extname(file).toLowerCase() !== '.mp3') continue;
      
      const filePath = path.join(directoryPath, file);
      const fileBuffer = await fs.readFile(filePath);
      
      const musicFile = new MusicFile({
        filename: file,
        contentType: 'audio/mp3',
        data: fileBuffer,
      });
      
      await musicFile.save();
      console.log(`Uploaded and saved file: ${file}`);
    }
    
    console.log('All music files uploaded successfully.');
    res.redirect('/');
  } catch (err) {
    console.error('Error uploading music files:', err);
    res.status(500).send('An error occurred during the upload process.');
  }
});

const port = 3000; 
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});