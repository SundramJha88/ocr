const express = require("express");
const multer = require("multer");
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const tesseract = require("tesseract.js");
const pdfParse = require("pdf-parse");

const app = express();
const PORT = 4015;

// Serve static files from the "public" folder
app.use(express.static("public"));

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// OCR endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.file.filename);

  try {
    let extractedText = "";

    // Process PDF Files
    if (req.file.mimetype === "application/pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      extractedText = data.text;
    }
    // Process Image Files
    else if (req.file.mimetype.startsWith("image/")) {
      const { data: { text } } = await tesseract.recognize(filePath, "eng", {
        tessedit_pageseg_mode: 3, // Default OCR segmentation mode
      });
      extractedText = text.trim(); // Trim to remove extra spaces
    } else {
      return res.status(400).json({ message: "Unsupported file type. Only images and PDFs are allowed." });
    }

    // Clean up the uploaded file
    try {
      await fs.promises.unlink(filePath);
    } catch (cleanupError) {
      console.error("Error cleaning up file:", cleanupError);
    }

    // Respond with the extracted text
    res.json({ extractedText });
  } catch (error) {
    console.error("Error processing file:", error);
    res.status(500).json({ message: "An error occurred while processing the file" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
