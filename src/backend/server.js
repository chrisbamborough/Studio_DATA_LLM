const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// Import your content service
const contentService = require('./services/contentService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../../public")));

// Get all portfolio data
app.get("/api/portfolio-data", (req, res) => {
  try {
    const portfolioData = {
      projects: contentService.getProjects(),
      about: contentService.getAbout()
    };
    
    res.json(portfolioData);
  } catch (error) {
    console.error('Error fetching portfolio data:', error);
    res.status(500).json({ message: 'Failed to fetch portfolio data' });
  }
});

// Get specific project details
app.get("/api/projects/:id", (req, res) => {
  const project = contentService.getProjectById(req.params.id);
  
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }
  
  res.json(project);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
