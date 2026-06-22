const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const domains = {
  backend: {
    domain: "Backend Development",
    skillGap: ["DSA", "SQL", "Spring Boot"],
    roadmap: [
      "Month 1: Java + DSA",
      "Month 2: SQL + Database Design",
      "Month 3: Spring Boot + REST APIs"
    ],
    projects: [
      "Student Management System",
      "Expense Tracker API",
      "Blog Backend API"
    ]
  },

  aiml: {
    domain: "AI / Machine Learning",
    skillGap: ["Python", "Statistics", "Machine Learning"],
    roadmap: [
      "Month 1: Python Fundamentals",
      "Month 2: Statistics + Pandas",
      "Month 3: Machine Learning + Projects"
    ],
    projects: [
      "Movie Recommendation System",
      "Resume Analyzer",
      "Chatbot"
    ]
  },

  web: {
    domain: "Web Development",
    skillGap: ["JavaScript", "React", "Node.js"],
    roadmap: [
      "Month 1: HTML CSS JavaScript",
      "Month 2: React",
      "Month 3: Node.js + Express"
    ],
    projects: [
      "Portfolio Website",
      "Weather App",
      "E-Commerce Website"
    ]
  },

  cybersecurity: {
    domain: "Cybersecurity",
    skillGap: ["Networking", "Linux", "Security Basics"],
    roadmap: [
      "Month 1: Networking",
      "Month 2: Linux",
      "Month 3: Ethical Hacking Basics"
    ],
    projects: [
      "Password Strength Checker",
      "Port Scanner",
      "Security Audit Tool"
    ]
  },

  devops: {
    domain: "DevOps",
    skillGap: ["Linux", "Docker", "CI/CD"],
    roadmap: [
      "Month 1: Linux",
      "Month 2: Docker",
      "Month 3: CI/CD + Cloud"
    ],
    projects: [
      "Dockerized App",
      "CI/CD Pipeline",
      "Cloud Deployment Project"
    ]
  }
};

app.get("/", (req, res) => {
  res.send("EduGuide Backend Running");
});

app.post("/generate-roadmap", (req, res) => {
  const { skills = "", interests = "", goal = "" } = req.body;

  const text = (
    skills +
    " " +
    interests +
    " " +
    goal
  ).toLowerCase();

  let recommendation = domains.web;

  if (
    text.includes("java") ||
    text.includes("backend") ||
    text.includes("spring")
  ) {
    recommendation = domains.backend;
  }

  else if (
    text.includes("python") ||
    text.includes("ai") ||
    text.includes("machine learning")
  ) {
    recommendation = domains.aiml;
  }

  else if (
    text.includes("html") ||
    text.includes("css") ||
    text.includes("react") ||
    text.includes("frontend")
  ) {
    recommendation = domains.web;
  }

  else if (
    text.includes("security") ||
    text.includes("cyber")
  ) {
    recommendation = domains.cybersecurity;
  }

  else if (
    text.includes("docker") ||
    text.includes("devops") ||
    text.includes("cloud")
  ) {
    recommendation = domains.devops;
  }

  res.json({
    success: true,
    recommendedDomain: recommendation.domain,
    skillGap: recommendation.skillGap,
    roadmap: recommendation.roadmap,
    projects: recommendation.projects
  });
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});