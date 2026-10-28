const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");

dotenv.config({ path: path.join(__dirname, ".env") });
const app = express();
const PORT = Number(process.env.PORT || 5000);
const STORE_PATH = process.env.DATA_FILE || path.join(__dirname, "data", "plans.json");
const OLLAMA_URL = (process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "");
const MODEL = process.env.OLLAMA_MODEL || "llama3.2:3b";

app.use(cors({ origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(",") : true }));
app.use(express.json({ limit: "64kb" }));

const tracks = {
  backend: { name: "Backend developer", terms: ["backend", "java", "spring", "api", "server", "database"], skills: ["Programming fundamentals", "Data structures", "SQL and data modeling", "REST APIs", "Testing and deployment"], projects: ["Student records API", "Expense tracker", "Course enrollment service"], resources: [{ title: "MDN: HTTP overview", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview", skill: "REST APIs" }, { title: "MySQL tutorial", url: "https://dev.mysql.com/doc/mysql-tutorial-excerpt/8.0/en/", skill: "SQL and data modeling" }] },
  ai: { name: "AI and data practitioner", terms: ["ai", "machine learning", "data", "python", "statistics", "ml"], skills: ["Python foundations", "Statistics and probability", "Data analysis", "Machine learning fundamentals", "Model evaluation and responsible AI"], projects: ["Explore a public dataset", "Build a recommendation prototype", "Compare and explain model errors"], resources: [{ title: "Python tutorial", url: "https://docs.python.org/3/tutorial/", skill: "Python foundations" }, { title: "Kaggle Learn", url: "https://www.kaggle.com/learn", skill: "Data analysis" }] },
  web: { name: "Web developer", terms: ["web", "frontend", "front-end", "react", "javascript", "website", "html", "css"], skills: ["HTML and accessibility", "CSS and responsive design", "JavaScript fundamentals", "React and component design", "APIs and deployment"], projects: ["Accessible personal portfolio", "Study planner", "Community resource directory"], resources: [{ title: "MDN Learn Web Development", url: "https://developer.mozilla.org/en-US/docs/Learn", skill: "HTML and accessibility" }, { title: "React Learn", url: "https://react.dev/learn", skill: "React and component design" }] },
  cyber: { name: "Cybersecurity learner", terms: ["cyber", "security", "network", "linux", "ethical hacking"], skills: ["Computer and network fundamentals", "Linux command line", "Security principles", "Threat modeling", "Defensive monitoring"], projects: ["Security checklist for a demo app", "Log analysis dashboard", "Password hygiene guide"], resources: [{ title: "Cisco Networking Basics", url: "https://skillsforall.com/course/networking-basics", skill: "Computer and network fundamentals" }, { title: "OverTheWire: Bandit", url: "https://overthewire.org/wargames/bandit/", skill: "Linux command line" }] },
  devops: { name: "Cloud and DevOps learner", terms: ["devops", "cloud", "docker", "deployment", "sre"], skills: ["Linux and scripting", "Git and collaboration", "Containers", "CI/CD concepts", "Cloud operations and observability"], projects: ["Containerize a sample app", "Build a basic CI pipeline", "Deploy with health checks and logs"], resources: [{ title: "Docker Get Started", url: "https://docs.docker.com/get-started/", skill: "Containers" }, { title: "GitHub Actions docs", url: "https://docs.github.com/en/actions", skill: "CI/CD concepts" }] }
};

const clean = (value, max = 500) => typeof value === "string" ? value.trim().slice(0, max) : "";
function inferTrack(profile) {
  const text = `${profile.goal} ${profile.interests} ${profile.skills}`.toLowerCase();
  const ranked = Object.entries(tracks).map(([key, track]) => ({ key, score: track.terms.reduce((n, term) => n + (text.includes(term) ? (profile.goal.toLowerCase().includes(term) ? 3 : 1) : 0), 0) }));
  ranked.sort((a, b) => b.score - a.score);
  return ranked[0].score ? ranked[0].key : "web";
}
function buildFallback(profile) {
  const key = inferTrack(profile);
  const track = tracks[key];
  const hours = Math.max(2, Math.min(30, Number(profile.weeklyHours) || 6));
  const pace = hours < 5 ? "steady" : hours > 12 ? "accelerated" : "balanced";
  const timelineWeeks = profile.timeline.includes("3 months") ? 12 : profile.timeline.includes("12 months") ? 48 : profile.timeline.includes("6 months") ? 24 : 10;
  const phases = track.skills.map((skill, index) => ({
    id: crypto.randomUUID(), title: skill,
    description: index === 0 ? `Build a foundation in ${skill.toLowerCase()} using short practice sessions.` : `Learn ${skill.toLowerCase()} and apply it to a small, reviewable exercise.`,
    week: Math.max(1, Math.round((index + 1) * timelineWeeks / track.skills.length)), estimatedHours: Math.max(3, Math.round(8 * 6 / hours)), status: "todo",
    successCriteria: index === track.skills.length - 1 ? `Publish one project that demonstrates ${skill.toLowerCase()}.` : `Complete one exercise and explain what you learned about ${skill.toLowerCase()}.`
  }));
  const known = profile.skills.toLowerCase();
  const gaps = track.skills.filter((skill) => !known.includes(skill.split(" ")[0].toLowerCase()));
  return {
    recommendedDomain: track.name, trackKey: key,
    summary: `A ${pace} starting plan for ${track.name.toLowerCase()}, shaped around ${hours} study hours per week and your goal: ${profile.goal || "exploring a career direction"}.`,
    rationale: `Your goal, interests, and skills point most strongly toward ${track.name.toLowerCase()}. Treat this as a starting recommendation; you can change the target or pace at any time.`,
    assumptions: [profile.weeklyHours ? `You can study about ${hours} hours per week.` : "You have about 6 hours per week available; adjust this estimate."],
    skillGap: gaps.slice(0, 5), roadmap: phases, projects: track.projects, resources: track.resources,
    nextAction: `Start with ${phases[0].title}: spend 30 minutes exploring the topic and write down one question.`,
    generatedBy: "local-planner"
  };
}
function validateRoadmap(candidate, fallback) {
  if (!candidate || typeof candidate !== "object" || !Array.isArray(candidate.roadmap) || candidate.roadmap.length < 3) return fallback;
  const roadmap = candidate.roadmap.slice(0, 8).map((step, i) => ({
    id: crypto.randomUUID(), title: clean(step.title, 120) || fallback.roadmap[i % fallback.roadmap.length].title,
    description: clean(step.description, 500), week: Math.max(1, Number(step.week) || i + 1),
    estimatedHours: Math.max(1, Number(step.estimatedHours) || 6), status: "todo",
    successCriteria: clean(step.successCriteria, 300)
  }));
  return { ...fallback, summary: clean(candidate.summary, 800) || fallback.summary, rationale: clean(candidate.rationale, 800) || fallback.rationale, roadmap, skillGap: Array.isArray(candidate.skillGap) ? candidate.skillGap.slice(0, 8).map((x) => clean(x, 100)).filter(Boolean) : fallback.skillGap, nextAction: clean(candidate.nextAction, 300) || fallback.nextAction, generatedBy: "ollama-local" };
}
async function generatePlan(profile) {
  const fallback = buildFallback(profile);
  if (process.env.USE_OLLAMA === "false") return fallback;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
      body: JSON.stringify({ model: MODEL, stream: false, format: "json", messages: [
        { role: "system", content: `You are a careful student career-planning assistant. Write student-facing text in ${profile.language || "English"}. Return only JSON with summary, rationale, skillGap (string array), nextAction, roadmap (3 to 8 objects with title, description, week integer, estimatedHours integer, successCriteria). Do not invent course URLs or guarantee employment. Make realistic beginner-friendly steps and state uncertainty.` },
        { role: "user", content: JSON.stringify({ profile, suggestedDomain: fallback.recommendedDomain, knownSkills: profile.skills, availableHoursPerWeek: profile.weeklyHours || 6 }) }
      ] })
    });
    if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
    const payload = await response.json();
    return validateRoadmap(JSON.parse(payload.message.content), fallback);
  } catch (error) {
    console.warn(`Local model unavailable; using the built-in planner (${error.message}).`);
    return fallback;
  } finally { clearTimeout(timeout); }
}

let pool;
let filePlans = [];
async function initStore() {
  if (process.env.MYSQL_URL) {
    const mysql = require("mysql2/promise");
    pool = mysql.createPool(process.env.MYSQL_URL);
    await pool.query(`CREATE TABLE IF NOT EXISTS plans (id VARCHAR(36) PRIMARY KEY, profile JSON NOT NULL, roadmap JSON NOT NULL, check_ins JSON NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
    console.log("Persistence: MySQL");
  } else {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    try { filePlans = JSON.parse(await fs.readFile(STORE_PATH, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
    console.log("Persistence: local JSON file (set MYSQL_URL for MySQL)");
  }
}
async function savePlan(record) {
  if (pool) await pool.query("INSERT INTO plans (id, profile, roadmap, check_ins) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE profile = VALUES(profile), roadmap = VALUES(roadmap), check_ins = VALUES(check_ins)", [record.id, JSON.stringify(record.profile), JSON.stringify(record.roadmap), JSON.stringify(record.checkIns || [])]);
  else { const index = filePlans.findIndex((x) => x.id === record.id); if (index < 0) filePlans.unshift(record); else filePlans[index] = record; await fs.writeFile(STORE_PATH, JSON.stringify(filePlans, null, 2)); }
  return record;
}
function parsePlan(row) {
  for (const key of ["profile", "roadmap", "checkIns"]) {
    if (typeof row[key] === "string") row[key] = JSON.parse(row[key]);
  }
  return row;
}
async function getPlan(id) {
  if (pool) { const [rows] = await pool.query("SELECT id, profile, roadmap, check_ins AS checkIns, created_at AS createdAt, updated_at AS updatedAt FROM plans WHERE id = ?", [id]); return rows[0] ? parsePlan(rows[0]) : null; }
  return filePlans.find((x) => x.id === id) || null;
}
async function listPlans() {
  if (pool) { const [rows] = await pool.query("SELECT id, profile, roadmap, check_ins AS checkIns, created_at AS createdAt, updated_at AS updatedAt FROM plans ORDER BY updated_at DESC LIMIT 50"); return rows.map(parsePlan); }
  return filePlans.slice(0, 50);
}

app.get("/api/health", (_req, res) => res.json({ ok: true, persistence: pool ? "mysql" : "local-file", localModel: MODEL }));
app.get("/api/resources", (_req, res) => res.json(Object.entries(tracks).flatMap(([key, track]) => track.resources.map((item) => ({ ...item, domain: track.name, trackKey: key })))));
app.get("/api/plans", async (_req, res, next) => { try { res.json({ plans: await listPlans() }); } catch (e) { next(e); } });
app.get("/api/plans/:id", async (req, res, next) => { try { const plan = await getPlan(req.params.id); if (!plan) return res.status(404).json({ error: "Plan not found" }); res.json(plan); } catch (e) { next(e); } });
app.post("/api/plans", async (req, res, next) => {
  try {
    const body = req.body || {};
    const profile = { name: clean(body.name, 100), education: clean(body.education, 120), location: clean(body.location, 120), language: clean(body.language, 60) || "English", skills: clean(body.skills, 500), interests: clean(body.interests, 500), goal: clean(body.goal, 500), weeklyHours: Math.max(0, Math.min(40, Number(body.weeklyHours) || 0)), timeline: clean(body.timeline, 80) };
    if (profile.goal.length < 3 && profile.interests.length < 3) return res.status(400).json({ error: "Add a career goal or interests so the planner has something to work with." });
    const roadmap = await generatePlan(profile);
    const record = { id: crypto.randomUUID(), profile, roadmap, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await savePlan(record);
    res.status(201).json(record);
  } catch (e) { next(e); }
});
app.patch("/api/plans/:id/tasks/:taskId", async (req, res, next) => {
  try {
    const plan = await getPlan(req.params.id);
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    const status = clean(req.body?.status, 20);
    if (!["todo", "in-progress", "done"].includes(status)) return res.status(400).json({ error: "Status must be todo, in-progress, or done." });
    const task = plan.roadmap.roadmap.find((item) => item.id === req.params.taskId);
    if (!task) return res.status(404).json({ error: "Roadmap step not found" });
    task.status = status;
    plan.updatedAt = new Date().toISOString();
    await savePlan(plan);
    res.json(plan);
  } catch (e) { next(e); }
});
app.post("/api/plans/:id/check-ins", async (req, res, next) => {
  try {
    const plan = await getPlan(req.params.id);
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    const reflection = clean(req.body?.reflection, 1000);
    const hours = Math.max(0, Math.min(100, Number(req.body?.hours) || 0));
    if (!reflection && !hours) return res.status(400).json({ error: "Share a short reflection or the hours you studied." });
    const completed = plan.roadmap.roadmap.filter((step) => step.status === "done").length;
    const next = plan.roadmap.roadmap.find((step) => step.status !== "done");
    const checkIn = { id: crypto.randomUUID(), reflection, hours, createdAt: new Date().toISOString(), guidance: reflection.toLowerCase().match(/stuck|hard|difficult|confus|blocked/) ? "Try splitting the next step into a 20-minute practice session. If the blocker persists, revisit its prerequisite before moving ahead." : completed ? `Good progress: ${completed} step${completed === 1 ? "" : "s"} complete. Continue with ${next?.title || "a portfolio polish and reflection"}.` : `Keep the plan small and consistent. Next up: ${next?.title || "review your goal"}.` };
    plan.checkIns = [...(plan.checkIns || []), checkIn].slice(-30);
    plan.updatedAt = checkIn.createdAt;
    await savePlan(plan);
    res.status(201).json({ plan, checkIn });
  } catch (e) { next(e); }
});
const frontendDirectory = path.join(__dirname, "../frontend/dist");
if (fs.existsSync(frontendDirectory)) {
  app.use(express.static(frontendDirectory));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api/")) return res.sendFile(path.join(frontendDirectory, "index.html"));
    next();
  });
}
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: "Something went wrong. Check the backend logs for details." }); });

initStore().then(() => app.listen(PORT, () => console.log(`EduGuide API listening on http://localhost:${PORT}`))).catch((error) => { console.error("Could not initialize persistence:", error); process.exit(1); });
