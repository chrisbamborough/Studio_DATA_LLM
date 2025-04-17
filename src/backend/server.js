const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../../public")));

// Basic API route
app.get("/api/portfolio-data", (req, res) => {
  // This would come from a database in a real implementation
  const portfolioData = {
    projects: [
      {
        id: 1,
        title: "E-commerce Platform",
        description: "Full-stack online store with React, Node.js, and MongoDB",
        tags: ["React", "Node.js", "MongoDB", "Express"],
      },
      {
        id: 2,
        title: "Personal Blog",
        description: "A responsive blog site with a CMS built on Next.js",
        tags: ["Next.js", "Tailwind CSS", "Markdown", "Vercel"],
      },
    ],
    about: {
      name: "Alex Developer",
      title: "Full Stack Developer",
      bio: "I'm a web developer with a passion for creating intuitive and performant applications.",
    },
  };

  res.json(portfolioData);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
