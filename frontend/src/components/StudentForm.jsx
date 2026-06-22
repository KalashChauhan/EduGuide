import { useState } from "react";
import axios from "axios";

function StudentForm() {
  const [skills, setSkills] = useState("");
  const [interests, setInterests] = useState("");
  const [goal, setGoal] = useState("");

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const response = await axios.post(
        "http://localhost:5000/generate-roadmap",
        {
          skills,
          interests,
          goal,
        }
      );

      setResult(response.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">

      {/* Hero Section */}
      <div className="hero">
        <h1>🎓 EduGuide AI</h1>
        <p>
          Discover the best career path based on your
          skills, interests, and goals.
        </p>
      </div>

      {/* Stats Section */}
      <div className="stats">
        <div className="stat-card">
          <h2>50+</h2>
          <p>Career Paths</p>
        </div>

        <div className="stat-card">
          <h2>100+</h2>
          <p>Project Ideas</p>
        </div>

        <div className="stat-card">
          <h2>AI Inspired</h2>
          <p>Learning Roadmaps</p>
        </div>
      </div>

      {/* Form Section */}
      <div className="form-card">
        <h2>Student Profile</h2>

        <div className="input-grid">
          <input
            type="text"
            placeholder="Skills (Java, Python, React...)"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
          />

          <input
            type="text"
            placeholder="Interests"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
          />
        </div>

        <input
          type="text"
          placeholder="Career Goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />

        <button onClick={handleSubmit}>
          {loading
            ? "Generating Roadmap..."
            : "Generate Roadmap 🚀"}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="results">

          <div className="card">
            <h2>🎯 Recommended Domain</h2>
            <p className="highlight">
              {result.recommendedDomain}
            </p>
          </div>

          <div className="card">
            <h2>📊 Skill Gap Analysis</h2>
            <ul>
              {result.skillGap.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h2>🗺️ Learning Roadmap</h2>
            <ul>
              {result.roadmap.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h2>💡 Recommended Projects</h2>
            <ul>
              {result.projects.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>

        </div>
      )}

      {/* Footer */}
      <div className="footer">
        Built for Bharat Academix CodeQuest 🚀
      </div>

    </div>
  );
}

export default StudentForm;