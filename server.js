const express = require('express');
const multer = require('multer');
const path = require('path');
const mintNFT = require('./mint-nft'); // Import the minting function

const app = express();
const upload = multer({ dest: path.join(__dirname, 'uploads') });

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the frontend at the root URL "/"
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// POST endpoint to handle minting request
app.post('/mint', upload.single('image'), async (req, res) => {
  try {
    const result = await mintNFT(req.file.path);
    res.json(result); // Send JSON response with success and metadataUri
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start the server
app.listen(3000, () => {
  console.log('Server running on port 3000');
});
