import { useEffect, useState } from "react";
import { cloudEnabled, supabase } from "./lib/supabase";

const storageKey = "phd-pathway-react-state";
const today = new Date().toISOString().slice(0, 10);
const cloudPaused = true;

const defaultPrograms = [
  {
    id: "mit-cs",
    school: "MIT",
    field: "Computer Science",
    deadline: "2026-12-15",
    status: "drafting",
    funding: "Full funding + stipend",
    location: "Cambridge, MA",
    tags: ["STEM", "AI", "Reach"],
    faculty: ["Prof. Ana Rivera", "Prof. Daniel Cho"],
    fit: "Strong for applicants focused on machine learning systems and interdisciplinary computing research.",
    notes: "Needs a sharper paragraph on systems impact and recent research papers.",
    interviewNotes: "",
    sourceUrl: "",
    sourceSummary: []
  },
  {
    id: "umich-soc",
    school: "University of Michigan",
    field: "Sociology",
    deadline: "2026-12-01",
    status: "researching",
    funding: "5-year funding package",
    location: "Ann Arbor, MI",
    tags: ["Social Science", "Methods", "Strong fit"],
    faculty: ["Prof. Nia Freeman", "Prof. Luka Patel"],
    fit: "Excellent for inequality, institutions, and mixed-methods social research.",
    notes: "Compare methods training and placement outcomes.",
    interviewNotes: "",
    sourceUrl: "",
    sourceSummary: []
  }
];

const defaultChecklist = [
  {
    id: "research-interests",
    title: "Define research interests",
    description: "Write a short paragraph explaining the core question or theme you want to pursue.",
    priority: "high"
  },
  {
    id: "contact-recommenders",
    title: "Confirm recommenders",
    description: "Ask letter writers early and share your CV, statement draft, and deadlines.",
    priority: "high"
  },
  {
    id: "draft-statement",
    title: "Draft statement of purpose",
    description: "Build a master draft you can customize by advisor and department.",
    priority: "high"
  }
];

const defaultDocuments = [
  { id: "cv", name: "Academic CV", status: "review", notes: "One more faculty review pass." },
  { id: "sop", name: "Statement of Purpose", status: "drafting", notes: "Master draft is 70% done." },
  { id: "transcript", name: "Transcripts", status: "ready", notes: "Unofficial copies saved." }
];

const defaultRecommenders = [
  { id: "mentor-1", name: "Prof. Elena Brooks", status: "confirmed", notes: "Needs deadlines sheet next week." },
  { id: "mentor-2", name: "Prof. Serena Hall", status: "requested", notes: "Follow up after sharing CV." }
];

const defaultAdvisor = {
  name: "Faculty Mentor",
  cadence: "Biweekly",
  notes: "Review shortlist balance, statement framing, and letters."
};

const statusLabels = {
  "not-started": "Not started",
  researching: "Researching",
  drafting: "Drafting",
  submitted: "Submitted",
  interview: "Interview",
  decision: "Decision received"
};

const documentLabels = {
  "not-started": "Not started",
  drafting: "Drafting",
  review: "In review",
  ready: "Ready"
};

const recommenderLabels = {
  "not-asked": "Not asked",
  requested: "Requested",
  confirmed: "Confirmed",
  submitted: "Submitted"
};

const presets = {
  stem: {
    tags: ["STEM", "Lab rotations", "Methods"],
    checklist: [
      ["labs", "List target labs", "Map advisors and recent papers for each program.", "high"],
      ["publications", "Update publications section", "Add posters, preprints, and technical outputs.", "medium"]
    ],
    documents: [["research-statement", "Research Statement", "drafting", "Outline current work and future agenda."]]
  },
  humanities: {
    tags: ["Humanities", "Archive", "Theory"],
    checklist: [
      ["sample", "Revise writing sample", "Strengthen argument and framing for faculty readers.", "high"],
      ["archive-fit", "Research archival fit", "Note collections, methods, and language needs.", "medium"]
    ],
    documents: [["language-plan", "Language Preparation Notes", "drafting", "List languages and requirements."]]
  },
  "social-science": {
    tags: ["Social Science", "Methods", "Fieldwork"],
    checklist: [
      ["methods-fit", "Compare methods training", "Record qual, quant, and mixed-methods strengths.", "high"],
      ["placements", "Review placement outcomes", "Track graduate placements and advisor mentoring.", "medium"]
    ],
    documents: [["research-proposal", "Research Proposal", "drafting", "Summarize question, methods, and contribution."]]
  }
};

const defaultState = {
  programs: defaultPrograms,
  checklist: defaultChecklist,
  checklistState: {},
  documents: defaultDocuments,
  recommenders: defaultRecommenders,
  advisor: defaultAdvisor,
  theme: "light"
};

function normalizePlannerState(parsed) {
  const programs = Array.isArray(parsed?.programs) ? parsed.programs : defaultPrograms;
  return {
    programs: programs.map((program) => ({
      ...program,
      fit: program?.fit || "",
      notes: program?.notes || "",
      interviewNotes: program?.interviewNotes || "",
      sourceUrl: program?.sourceUrl || "",
      funding: program?.funding || "",
      location: program?.location || "",
      status: program?.status || "not-started",
      deadline: program?.deadline || "",
      tags: Array.isArray(program?.tags) ? program.tags : [],
      faculty: Array.isArray(program?.faculty) ? program.faculty : [],
      sourceSummary: Array.isArray(program?.sourceSummary) ? program.sourceSummary : []
    })),
    checklist: Array.isArray(parsed?.checklist) ? parsed.checklist : defaultChecklist,
    checklistState:
      parsed?.checklistState && typeof parsed.checklistState === "object" ? parsed.checklistState : {},
    documents: Array.isArray(parsed?.documents) ? parsed.documents : defaultDocuments,
    recommenders: Array.isArray(parsed?.recommenders) ? parsed.recommenders : defaultRecommenders,
    advisor:
      parsed?.advisor && typeof parsed.advisor === "object"
        ? { ...defaultAdvisor, ...parsed.advisor }
        : defaultAdvisor,
    theme: parsed?.theme === "dark" ? "dark" : "light"
  };
}

function readState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey));
    return normalizePlannerState(parsed);
  } catch {
    return defaultState;
  }
}

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function parseList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(dateString) {
  if (!dateString) return "No deadline";
  return new Date(`${dateString}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function daysUntil(dateString) {
  if (!dateString) return null;
  const start = new Date(`${today}T12:00:00`);
  const end = new Date(`${dateString}T12:00:00`);
  return Math.round((end - start) / 86400000);
}

function urgencyLabel(program) {
  const diff = daysUntil(program.deadline);
  if (diff === null) return "No deadline";
  if (diff < 0) return "Past due";
  if (diff <= 14) return "Urgent";
  if (diff <= 45) return "Soon";
  return "On track";
}

async function fetchProgramSource(url) {
  const normalized = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
  const proxyUrl = `https://r.jina.ai/http://${normalized.replace(/^https?:\/\//, "")}`;
  const response = await fetch(proxyUrl);
  if (!response.ok) throw new Error("Could not fetch source");
  return { normalized, text: await response.text() };
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function extractField(text) {
  const fields = [
    "Electrical Engineering",
    "Mechanical Engineering",
    "Computer Science",
    "Biology",
    "Psychology",
    "Sociology",
    "English",
    "History",
    "Economics",
    "Physics",
    "Political Science",
    "Anthropology",
    "Chemistry",
    "Mathematics"
  ];
  return fields.find((field) => new RegExp(field, "i").test(text)) || "";
}

function extractFieldFromTitle(text) {
  const title = firstMatch(text, [/Title:\s*(.+)/i]);
  return title ? extractField(title) : "";
}

function extractDeadline(text) {
  const patterns = [
    /\b(20\d{2}-\d{2}-\d{2})\b/,
    /\b(?:deadline|apply by|application due)[:\s]+([A-Z][a-z]{2,8}\s+\d{1,2},?\s+20\d{2})/i,
    /\b([A-Z][a-z]{2,8}\s+\d{1,2},?\s+20\d{2})\b/
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    if (/^\d{4}-\d{2}-\d{2}$/.test(match[1])) return match[1];
    const parsed = new Date(match[1]);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }
  return "";
}

function extractSchool(text, url) {
  const titleMatch = text.match(/Title:\s*(.+)/i);
  if (titleMatch) return titleMatch[1].split("|")[0].split("-")[0].trim();
  try {
    return new URL(url).hostname.replace(/^www\./, "").split(".")[0].replace(/-/g, " ");
  } catch {
    return "";
  }
}

function extractFunding(text) {
  const line = text
    .split("\n")
    .map((entry) => entry.trim())
    .find((entry) => /stipend|funding|fellowship|assistantship|tuition|financial support|full support/i.test(entry));
  return line ? line.slice(0, 140) : "";
}

function extractLocation(text) {
  const patterns = [/\b([A-Z][a-z]+,\s?[A-Z]{2})\b/, /\bLocation[:\s]+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s?[A-Z]{2})/i];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return "";
}

function extractFaculty(text) {
  const matches = [...text.matchAll(/\bProf\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/g)].map((match) => match[0]);
  return [...new Set(matches)].slice(0, 4);
}

function extractTags(text) {
  const options = [
    ["STEM", /engineering|computer science|biology|chemistry|physics|mathematics/i],
    ["Humanities", /history|english|literature|archive|philosophy/i],
    ["Social Science", /sociology|anthropology|economics|political science|psychology/i],
    ["Funding", /stipend|funding|fellowship|assistantship|tuition/i],
    ["Interview", /interview|visit day|finalist/i],
    ["Writing sample", /writing sample/i]
  ];
  return options.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
}

function extractFit(text) {
  const line = text
    .split("\n")
    .map((entry) => entry.trim())
    .find((entry) => entry.length > 40 && /research|faculty|program|department|students/i.test(entry));
  return line ? line.slice(0, 220) : "";
}

function extractNotes(text) {
  const line = text
    .split("\n")
    .map((entry) => entry.trim())
    .find((entry) => entry.length > 35 && /application|deadline|statement|writing sample|admissions|requirements/i.test(entry));
  return line ? line.slice(0, 220) : "";
}

function extractSourceSummary(text) {
  const lines = text
    .split("\n")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 50);
  return lines
    .filter((entry) => /phd|doctor|program|department|research|funding|deadline|faculty/i.test(entry))
    .slice(0, 2)
    .map((entry) => entry.slice(0, 220));
}

function statusClass(value) {
  return value.replace(/\s+/g, "-");
}

function formatCloudError(error, action) {
  const message = error?.message || "Unknown cloud error.";
  const lowered = message.toLowerCase();

  if (lowered.includes("jwt") || lowered.includes("session")) {
    return `Your cloud session expired while trying to ${action}. Sign in again, then retry.`;
  }

  if (lowered.includes("row-level security") || lowered.includes("permission denied")) {
    return `Cloud ${action} is blocked by Supabase permissions. Re-run the planner_states RLS policies, then try again.`;
  }

  if (lowered.includes("invalid input syntax") || lowered.includes("uuid")) {
    return `Cloud ${action} could not match this signed-in user correctly. Sign out, sign back in with the magic link, then retry.`;
  }

  return `Cloud ${action} failed: ${message}`;
}

export default function App() {
  const [planner, setPlanner] = useState(readState);
  const [selectedProgramId, setSelectedProgramId] = useState(readState().programs[0]?.id || null);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("All");
  const [activeStatus, setActiveStatus] = useState("all");
  const [sortMode, setSortMode] = useState("deadline");
  const [autofillBusy, setAutofillBusy] = useState(false);

  const [programForm, setProgramForm] = useState({
    id: "",
    sourceUrl: "",
    sourceSummary: [],
    school: "",
    field: "",
    deadline: "",
    status: "not-started",
    location: "",
    funding: "",
    tags: "",
    faculty: "",
    fit: "",
    notes: "",
    interviewNotes: ""
  });
  const [taskForm, setTaskForm] = useState({ id: "", title: "", description: "", priority: "medium" });
  const [documentForm, setDocumentForm] = useState({ id: "", name: "", status: "not-started", notes: "" });
  const [recommenderForm, setRecommenderForm] = useState({ id: "", name: "", status: "not-asked", notes: "" });
  const [advisorForm, setAdvisorForm] = useState(planner.advisor);
  const [cloudEmail, setCloudEmail] = useState("");
  const [cloudUser, setCloudUser] = useState(null);
  const [cloudMessage, setCloudMessage] = useState("");
  const [cloudBusy, setCloudBusy] = useState(false);
  const [lastCloudSync, setLastCloudSync] = useState("");
  const cloudAvailable = cloudEnabled && !cloudPaused;

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(planner));
    document.body.dataset.theme = planner.theme;
  }, [planner]);

  useEffect(() => {
    setAdvisorForm(planner.advisor);
  }, [planner.advisor]);

  useEffect(() => {
    if (!cloudEnabled || !supabase || cloudPaused) return undefined;

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setCloudUser(data.session?.user ?? null);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCloudUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const allTags = ["All", ...new Set(planner.programs.flatMap((program) => program.tags))];
  const filteredPrograms = planner.programs
    .filter((program) => {
      const lowered = search.trim().toLowerCase();
      const matchesSearch = [program.school, program.field, program.location, program.funding, program.fit, program.notes, program.faculty.join(" "), program.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(lowered);
      const matchesTag = activeTag === "All" || program.tags.includes(activeTag);
      const matchesStatus = activeStatus === "all" || program.status === activeStatus;
      return matchesSearch && matchesTag && matchesStatus;
    })
    .sort((left, right) => {
      if (sortMode === "school") return left.school.localeCompare(right.school);
      if (sortMode === "status") return left.status.localeCompare(right.status);
      if (!left.deadline && !right.deadline) return 0;
      if (!left.deadline) return 1;
      if (!right.deadline) return -1;
      return left.deadline.localeCompare(right.deadline);
    });

  const selectedProgram = planner.programs.find((program) => program.id === selectedProgramId) || filteredPrograms[0] || null;
  const checklistItems = planner.checklist.map((item) => ({ ...item, done: Boolean(planner.checklistState[item.id]) }));
  const progress = checklistItems.length
    ? Math.round((checklistItems.filter((item) => item.done).length / checklistItems.length) * 100)
    : 0;

  const dashboard = {
    programs: planner.programs.length,
    urgent: planner.programs.filter((program) => {
      const diff = daysUntil(program.deadline);
      return diff !== null && diff >= 0 && diff <= 21;
    }).length,
    submitted: planner.programs.filter((program) => program.status === "submitted").length,
    readyDocs: planner.documents.filter((doc) => doc.status === "ready").length,
    confirmedRecs: planner.recommenders.filter((person) => ["confirmed", "submitted"].includes(person.status)).length
  };

  function updatePlanner(updater) {
    setPlanner((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      if (!next.programs.some((program) => program.id === selectedProgramId)) {
        setSelectedProgramId(next.programs[0]?.id || null);
      }
      return next;
    });
  }

  async function sendMagicLink() {
    if (!cloudEnabled || !supabase || !cloudEmail.trim()) return;
    const email = cloudEmail.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      setCloudMessage("Enter a valid email address to receive the sign-in link.");
      return;
    }

    setCloudBusy(true);
    setCloudMessage("");
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) {
        setCloudMessage(formatCloudError(error, "sign-in"));
      } else {
        setCloudMessage("Check your email for the sign-in link.");
      }
    } catch (error) {
      setCloudMessage(formatCloudError(error, "sign-in"));
    }
    setCloudBusy(false);
  }

  async function saveToCloud() {
    if (!cloudEnabled || !supabase || !cloudUser) return;
    setCloudBusy(true);
    setCloudMessage("");
    const payload = {
      user_id: cloudUser.id,
      state: planner,
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from("planner_states").upsert(payload, { onConflict: "user_id" });
    if (error) {
      setCloudMessage(formatCloudError(error, "save"));
    } else {
      const stamp = new Date().toLocaleString();
      setLastCloudSync(stamp);
      setCloudMessage(`Saved to cloud at ${stamp}.`);
    }
    setCloudBusy(false);
  }

  async function loadFromCloud() {
    if (!cloudEnabled || !supabase || !cloudUser) return;
    setCloudBusy(true);
    setCloudMessage("");
    const { data, error } = await supabase
      .from("planner_states")
      .select("state, updated_at")
      .eq("user_id", cloudUser.id)
      .maybeSingle();
    if (error) {
      setCloudMessage(formatCloudError(error, "load"));
    } else if (data?.state) {
      const normalized = normalizePlannerState(data.state);
      setPlanner(normalized);
      setSelectedProgramId(normalized.programs?.[0]?.id || null);
      if (data.updated_at) {
        setLastCloudSync(new Date(data.updated_at).toLocaleString());
      }
      setCloudMessage("Loaded your planner from the cloud.");
    } else {
      setCloudMessage("No cloud save found yet for this account. Click Save to cloud first, then try loading again.");
    }
    setCloudBusy(false);
  }

  async function signOutCloud() {
    if (!cloudEnabled || !supabase) return;
    await supabase.auth.signOut();
    setCloudMessage("Signed out of cloud save.");
  }

  function resetProgramForm() {
    setProgramForm({
      id: "",
      sourceUrl: "",
      sourceSummary: [],
      school: "",
      field: "",
      deadline: "",
      status: "not-started",
      location: "",
      funding: "",
      tags: "",
      faculty: "",
      fit: "",
      notes: "",
      interviewNotes: ""
    });
  }

  function handleProgramSubmit(event) {
    event.preventDefault();
    if (!programForm.school.trim() || !programForm.field.trim()) return;

    const program = {
      id: programForm.id || createId("program"),
      school: programForm.school.trim(),
      field: programForm.field.trim(),
      deadline: programForm.deadline,
      status: programForm.status,
      location: programForm.location.trim(),
      funding: programForm.funding.trim(),
      tags: parseList(programForm.tags),
      faculty: parseList(programForm.faculty),
      fit: programForm.fit.trim(),
      notes: programForm.notes.trim(),
      interviewNotes: programForm.interviewNotes.trim(),
      sourceUrl: programForm.sourceUrl.trim(),
      sourceSummary: programForm.sourceSummary
    };

    updatePlanner((current) => ({
      ...current,
      programs: programForm.id
        ? current.programs.map((entry) => (entry.id === program.id ? program : entry))
        : [program, ...current.programs]
    }));
    setSelectedProgramId(program.id);
    resetProgramForm();
  }

  function handleTaskSubmit(event) {
    event.preventDefault();
    if (!taskForm.title.trim()) return;
    const task = {
      id: taskForm.id || createId("task"),
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      priority: taskForm.priority
    };
    updatePlanner((current) => ({
      ...current,
      checklist: taskForm.id
        ? current.checklist.map((entry) => (entry.id === task.id ? task : entry))
        : [task, ...current.checklist]
    }));
    setTaskForm({ id: "", title: "", description: "", priority: "medium" });
  }

  function handleDocumentSubmit(event) {
    event.preventDefault();
    if (!documentForm.name.trim()) return;
    const documentEntry = {
      id: documentForm.id || createId("document"),
      name: documentForm.name.trim(),
      status: documentForm.status,
      notes: documentForm.notes.trim()
    };
    updatePlanner((current) => ({
      ...current,
      documents: documentForm.id
        ? current.documents.map((entry) => (entry.id === documentEntry.id ? documentEntry : entry))
        : [documentEntry, ...current.documents]
    }));
    setDocumentForm({ id: "", name: "", status: "not-started", notes: "" });
  }

  function handleRecommenderSubmit(event) {
    event.preventDefault();
    if (!recommenderForm.name.trim()) return;
    const person = {
      id: recommenderForm.id || createId("recommender"),
      name: recommenderForm.name.trim(),
      status: recommenderForm.status,
      notes: recommenderForm.notes.trim()
    };
    updatePlanner((current) => ({
      ...current,
      recommenders: recommenderForm.id
        ? current.recommenders.map((entry) => (entry.id === person.id ? person : entry))
        : [person, ...current.recommenders]
    }));
    setRecommenderForm({ id: "", name: "", status: "not-asked", notes: "" });
  }

  function handleAdvisorSubmit(event) {
    event.preventDefault();
    updatePlanner((current) => ({ ...current, advisor: advisorForm }));
  }

  function populateProgramForm(program) {
    setProgramForm({
      id: program.id,
      sourceUrl: program.sourceUrl || "",
      sourceSummary: program.sourceSummary || [],
      school: program.school,
      field: program.field,
      deadline: program.deadline || "",
      status: program.status,
      location: program.location || "",
      funding: program.funding || "",
      tags: program.tags.join(", "),
      faculty: program.faculty.join(", "),
      fit: program.fit || "",
      notes: program.notes || "",
      interviewNotes: program.interviewNotes || ""
    });
    window.location.hash = "forms";
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(planner, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "phd-pathway-react-data.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importData(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const normalized = normalizePlannerState(parsed);
        setPlanner(normalized);
        setSelectedProgramId(normalized.programs?.[0]?.id || null);
      } catch {
        window.alert("That file could not be imported.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function applyPreset(name) {
    const preset = presets[name];
    if (!preset) return;
    updatePlanner((current) => {
      const programs = [...current.programs];
      if (programs[0]) {
        const mergedTags = [...new Set([...programs[0].tags, ...preset.tags])];
        programs[0] = { ...programs[0], tags: mergedTags };
      }

      const checklist = [...current.checklist];
      preset.checklist.forEach(([id, title, description, priority]) => {
        if (!checklist.some((item) => item.id === id)) {
          checklist.unshift({ id, title, description, priority });
        }
      });

      const documents = [...current.documents];
      preset.documents.forEach(([id, nameLabel, status, notes]) => {
        if (!documents.some((item) => item.id === id)) {
          documents.unshift({ id, name: nameLabel, status, notes });
        }
      });

      return { ...current, programs, checklist, documents };
    });
  }

  async function autofillFromLink() {
    const url = programForm.sourceUrl.trim();
    if (!url) return;
    setAutofillBusy(true);
    try {
      const result = await fetchProgramSource(url);
      const inferredSummary = extractSourceSummary(result.text);
      setProgramForm((current) => ({
        ...current,
        sourceUrl: result.normalized,
        school: current.school || extractSchool(result.text, result.normalized),
        field: current.field || extractField(result.text) || extractFieldFromTitle(result.text),
        deadline: current.deadline || extractDeadline(result.text),
        funding: current.funding || extractFunding(result.text),
        location: current.location || extractLocation(result.text),
        tags: current.tags || extractTags(result.text).join(", "),
        faculty: current.faculty || extractFaculty(result.text).join(", "),
        fit: current.fit || extractFit(result.text),
        notes: current.notes || extractNotes(result.text) || inferredSummary[0] || `Imported from ${result.normalized}`,
        sourceSummary: current.sourceSummary?.length ? current.sourceSummary : inferredSummary
      }));
    } catch {
      window.alert("The app could not auto-fill from that link. You can still keep the URL and fill the rest manually.");
    } finally {
      setAutofillBusy(false);
    }
  }

  return (
    <div className="page-shell">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">React + Vite Version</p>
          <h1>Plan PhD applications with deadlines, documents, recommenders, and linked program pages.</h1>
          <p className="hero-text">
            The React app now includes a real shortlist, checklist tracking, import/export, source-link autofill, and advising notes.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#programs">
              Open planner
            </a>
            <a className="button secondary" href="#forms">
              Add program
            </a>
          </div>
        </div>

        <section className="hero-card">
          <div className="hero-row">
            <div>
              <p className="eyebrow">Dashboard</p>
              <h2>Cycle snapshot</h2>
            </div>
            <button
              className="button secondary"
              type="button"
              onClick={() => updatePlanner((current) => ({ ...current, theme: current.theme === "dark" ? "light" : "dark" }))}
            >
              {planner.theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
          </div>
          <div className="stats-grid">
            <article className="stat-card"><span>Programs</span><strong>{dashboard.programs}</strong></article>
            <article className="stat-card"><span>Urgent deadlines</span><strong>{dashboard.urgent}</strong></article>
            <article className="stat-card"><span>Submitted</span><strong>{dashboard.submitted}</strong></article>
            <article className="stat-card"><span>Ready documents</span><strong>{dashboard.readyDocs}</strong></article>
            <article className="stat-card"><span>Confirmed letters</span><strong>{dashboard.confirmedRecs}</strong></article>
            <article className="stat-card"><span>Checklist progress</span><strong>{progress}%</strong></article>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </section>
      </header>

      <section className="panel cloud-panel">
        <div className="section-row">
          <div>
            <p className="eyebrow">Cloud Save</p>
            <h2>Sync your planner across devices.</h2>
          </div>
          <span className={`pill ${cloudAvailable ? "" : "status not-started"}`}>
            {cloudAvailable ? "Cloud save available" : "Local-only mode"}
          </span>
        </div>

        {cloudAvailable ? (
          <div className="cloud-grid">
            <div className="card">
              <h3>{cloudUser ? "Signed in" : "Sign in with email"}</h3>
              <p>
                {cloudUser
                  ? `Cloud save is connected for ${cloudUser.email || "this account"}.`
                  : "Send yourself a magic link to unlock cloud save and load your planner from anywhere."}
              </p>
              {!cloudUser ? (
                <div className="inline-actions">
                  <input
                    type="email"
                    value={cloudEmail}
                    onChange={(event) => setCloudEmail(event.target.value)}
                    placeholder="you@example.com"
                  />
                  <button className="button primary" type="button" onClick={sendMagicLink} disabled={cloudBusy}>
                    {cloudBusy ? "Sending..." : "Send sign-in link"}
                  </button>
                </div>
              ) : (
                <div className="button-row">
                  <button className="button primary" type="button" onClick={saveToCloud} disabled={cloudBusy}>
                    {cloudBusy ? "Working..." : "Save to cloud"}
                  </button>
                  <button className="button secondary" type="button" onClick={loadFromCloud} disabled={cloudBusy}>
                    Load from cloud
                  </button>
                  <button className="button secondary" type="button" onClick={signOutCloud}>
                    Sign out
                  </button>
                </div>
              )}
            </div>

            <div className="card">
              <h3>Sync status</h3>
              <p>
                {lastCloudSync
                  ? `Last successful cloud sync: ${lastCloudSync}`
                  : "No cloud sync recorded yet in this browser session."}
              </p>
              <p>
                Your full planner state is stored as one synced record per account, so loading restores programs,
                tasks, documents, recommenders, and advisor notes together.
              </p>
              {cloudMessage ? <p className="cloud-message">{cloudMessage}</p> : null}
            </div>
          </div>
        ) : (
          <div className="card">
            <h3>Cloud save is paused</h3>
            <p>
              Your planner still works normally in this browser. Use Export to save a backup file and Import to
              restore it later or move it to another device.
            </p>
            <p>We can turn cloud sync back on later once the email delivery setup is ready.</p>
          </div>
        )}
      </section>

      <section className="panel controls-panel" id="programs">
        <div className="section-row">
          <div>
            <p className="eyebrow">Control Center</p>
            <h2>Search, sort, filter, and back up your data.</h2>
          </div>
          <div className="button-row">
            <button className="button secondary" type="button" onClick={exportData}>
              Export
            </button>
            <label className="button secondary file-button">
              Import
              <input type="file" accept="application/json" onChange={importData} hidden />
            </label>
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                setPlanner(defaultState);
                setSelectedProgramId(defaultState.programs[0]?.id || null);
                setSearch("");
                setActiveTag("All");
                setActiveStatus("all");
                setSortMode("deadline");
                resetProgramForm();
                setTaskForm({ id: "", title: "", description: "", priority: "medium" });
                setDocumentForm({ id: "", name: "", status: "not-started", notes: "" });
                setRecommenderForm({ id: "", name: "", status: "not-asked", notes: "" });
              }}
            >
              Restore samples
            </button>
          </div>
        </div>

        <div className="controls-grid">
          <label className="field wide">
            <span>Search</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by school, field, faculty, funding, or notes" />
          </label>
          <label className="field">
            <span>Status</span>
            <select value={activeStatus} onChange={(event) => setActiveStatus(event.target.value)}>
              <option value="all">All statuses</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Sort</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
              <option value="deadline">Deadline</option>
              <option value="school">School</option>
              <option value="status">Status</option>
            </select>
          </label>
          <label className="field">
            <span>Preset</span>
            <select defaultValue="" onChange={(event) => applyPreset(event.target.value)}>
              <option value="">Choose a preset</option>
              <option value="stem">STEM</option>
              <option value="humanities">Humanities</option>
              <option value="social-science">Social science</option>
            </select>
          </label>
        </div>

        <div className="tag-row">
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`tag-button${tag === activeTag ? " active" : ""}`}
              type="button"
              onClick={() => setActiveTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      <main className="content-grid">
        <section className="panel">
          <div className="section-row">
            <div>
              <p className="eyebrow">Program Organizer</p>
              <h2>Your shortlist</h2>
            </div>
            <span className="pill">{filteredPrograms.length} programs</span>
          </div>
          <div className="stack">
            {filteredPrograms.length ? (
              filteredPrograms.map((program) => (
                <article
                  key={program.id}
                  className={`card program-card${selectedProgram?.id === program.id ? " active" : ""}`}
                  onClick={() => setSelectedProgramId(program.id)}
                >
                  <div className="row">
                    <div>
                      <h3>{program.school} • {program.field}</h3>
                      <p>{program.location || "Location pending"} • {program.funding || "Funding pending"}</p>
                    </div>
                    <div className="right-stack">
                      <span className={`pill status ${statusClass(program.status)}`}>{statusLabels[program.status]}</span>
                      <span className="deadline">{formatDate(program.deadline)}</span>
                    </div>
                  </div>
                  <p>{program.fit || "Add fit notes for this program."}</p>
                  <div className="pill-row">
                    {program.tags.map((tag) => (
                      <span key={tag} className="pill">
                        {tag}
                      </span>
                    ))}
                    <span className="pill urgency">{urgencyLabel(program)}</span>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">No programs match those filters yet.</div>
            )}
          </div>
        </section>

        <aside className="panel">
          <div className="section-row">
            <div>
              <p className="eyebrow">Program Detail</p>
              <h2>Focused planning view</h2>
            </div>
            {selectedProgram ? (
              <button
                className="button danger"
                type="button"
                onClick={() => {
                  updatePlanner((current) => ({
                    ...current,
                    programs: current.programs.filter((program) => program.id !== selectedProgram.id)
                  }));
                }}
              >
                Delete
              </button>
            ) : null}
          </div>

          {selectedProgram ? (
            <article className="card detail-card">
              <div className="section-row">
                <div>
                  <h3>{selectedProgram.school}</h3>
                  <p>{selectedProgram.field} in {selectedProgram.location || "Location pending"}</p>
                </div>
                <button className="button secondary" type="button" onClick={() => populateProgramForm(selectedProgram)}>
                  Edit
                </button>
              </div>
              <div className="pill-row">
                <span className={`pill status ${statusClass(selectedProgram.status)}`}>{statusLabels[selectedProgram.status]}</span>
                <span className="pill">{formatDate(selectedProgram.deadline)}</span>
                {selectedProgram.sourceUrl ? <span className="pill source">Linked source</span> : null}
              </div>
              <p>{selectedProgram.notes || "Add statement tailoring, application requirements, or advisor outreach notes."}</p>
              {selectedProgram.sourceSummary?.length ? (
                <div className="source-summary">
                  {selectedProgram.sourceSummary.map((entry, index) => (
                    <p key={index}>{entry}</p>
                  ))}
                </div>
              ) : null}
              <ul className="detail-list">
                <li>Faculty fit: {selectedProgram.faculty.join(", ") || "Add faculty names"}</li>
                <li>Why it fits: {selectedProgram.fit || "Add a fit summary."}</li>
                <li>Interview notes: {selectedProgram.interviewNotes || "No interview notes yet."}</li>
                <li>
                  Source:{" "}
                  {selectedProgram.sourceUrl ? (
                    <a href={selectedProgram.sourceUrl} target="_blank" rel="noreferrer">
                      Open program website
                    </a>
                  ) : (
                    "No source link saved."
                  )}
                </li>
              </ul>
            </article>
          ) : (
            <div className="empty-state">Select a program to open its planning view.</div>
          )}

          <div className="section-block">
            <p className="eyebrow">Deadlines</p>
            <h3>Coming up next</h3>
            <div className="stack">
              {planner.programs
                .filter((program) => program.deadline)
                .sort((left, right) => left.deadline.localeCompare(right.deadline))
                .slice(0, 5)
                .map((program) => (
                  <article key={program.id} className="card timeline-card">
                    <div>
                      <strong>{program.school} • {program.field}</strong>
                      <p>{statusLabels[program.status]} • {daysUntil(program.deadline)} days left</p>
                    </div>
                    <span className="deadline">{formatDate(program.deadline)}</span>
                  </article>
                ))}
            </div>
          </div>
        </aside>

        <section className="panel">
          <div className="section-row">
            <div>
              <p className="eyebrow">Checklist</p>
              <h2>Application tasks</h2>
            </div>
            <div className="button-row">
              <span className="pill">{checklistItems.length} tasks</span>
              <button
                className="button secondary"
                type="button"
                onClick={() => updatePlanner((current) => ({ ...current, checklistState: {} }))}
              >
                Reset progress
              </button>
            </div>
          </div>
          <div className="stack">
            {checklistItems.map((task) => (
              <article key={task.id} className={`card checklist-card${task.done ? " done" : ""}`}>
                <label className="task-row">
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() =>
                      updatePlanner((current) => ({
                        ...current,
                        checklistState: { ...current.checklistState, [task.id]: !current.checklistState[task.id] }
                      }))
                    }
                  />
                  <div>
                    <strong>{task.title}</strong>
                    <p>{task.description}</p>
                  </div>
                </label>
                <div className="button-row right">
                  <span className={`pill priority ${task.priority}`}>{task.priority}</span>
                  <button className="button tiny secondary" type="button" onClick={() => setTaskForm(task)}>
                    Edit
                  </button>
                  <button
                    className="button tiny danger"
                    type="button"
                    onClick={() =>
                      updatePlanner((current) => {
                        const nextState = { ...current.checklistState };
                        delete nextState[task.id];
                        return {
                          ...current,
                          checklist: current.checklist.filter((entry) => entry.id !== task.id),
                          checklistState: nextState
                        };
                      })
                    }
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <p className="eyebrow">Documents</p>
          <h2>Core materials</h2>
          <div className="stack">
            {planner.documents.map((doc) => (
              <article key={doc.id} className="card">
                <div className="row">
                  <div>
                    <h3>{doc.name}</h3>
                    <p>{doc.notes || "No notes yet."}</p>
                  </div>
                  <span className={`pill status ${statusClass(doc.status)}`}>{documentLabels[doc.status]}</span>
                </div>
                <div className="button-row">
                  <button className="button tiny secondary" type="button" onClick={() => setDocumentForm(doc)}>
                    Edit
                  </button>
                  <button
                    className="button tiny danger"
                    type="button"
                    onClick={() =>
                      updatePlanner((current) => ({
                        ...current,
                        documents: current.documents.filter((entry) => entry.id !== doc.id)
                      }))
                    }
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <p className="eyebrow">Recommendations</p>
          <h2>Letter writer tracker</h2>
          <div className="stack">
            {planner.recommenders.map((person) => (
              <article key={person.id} className="card">
                <div className="row">
                  <div>
                    <h3>{person.name}</h3>
                    <p>{person.notes || "No notes yet."}</p>
                  </div>
                  <span className={`pill status ${statusClass(person.status)}`}>{recommenderLabels[person.status]}</span>
                </div>
                <div className="button-row">
                  <button className="button tiny secondary" type="button" onClick={() => setRecommenderForm(person)}>
                    Edit
                  </button>
                  <button
                    className="button tiny danger"
                    type="button"
                    onClick={() =>
                      updatePlanner((current) => ({
                        ...current,
                        recommenders: current.recommenders.filter((entry) => entry.id !== person.id)
                      }))
                    }
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <p className="eyebrow">Advisor Review</p>
          <h2>Mentor snapshot</h2>
          <article className="card">
            <div className="row">
              <h3>{planner.advisor.name || "No advisor listed"}</h3>
              <span className="pill">{planner.advisor.cadence || "Cadence pending"}</span>
            </div>
            <p>{planner.advisor.notes || "Add shared advising notes and meeting feedback."}</p>
          </article>
          <div className="stack next-steps">
            <article className="card">
              <h3>Next steps</h3>
              <p>Paste a real program link, save your shortlist, and keep the checklist current each week.</p>
            </article>
            <article className="card">
              <h3>Application strategy</h3>
              <p>Capture faculty overlap, document readiness, and recommendation status before ranking programs.</p>
            </article>
          </div>
        </section>
      </main>

      <section className="panel forms-panel" id="forms">
        <div className="section-row">
          <div>
            <p className="eyebrow">Add And Edit</p>
            <h2>Manage programs, tasks, documents, recommenders, and advisor settings.</h2>
          </div>
        </div>

        <div className="forms-grid">
          <form className="entry-form" onSubmit={handleProgramSubmit}>
            <h3>Program form</h3>
            <div className="source-row">
              <label className="field wide">
                <span>Program website</span>
                <input
                  value={programForm.sourceUrl}
                  onChange={(event) => setProgramForm({ ...programForm, sourceUrl: event.target.value })}
                  placeholder="https://example.edu/phd-program"
                />
              </label>
              <button className="button secondary" type="button" onClick={autofillFromLink} disabled={autofillBusy}>
                {autofillBusy ? "Importing..." : "Autofill from link"}
              </button>
            </div>
            <p className="helper-text">Best effort import: some sites expose better information than others, so you can always edit manually.</p>
            {programForm.sourceSummary?.length ? (
              <div className="source-summary">
                {programForm.sourceSummary.map((entry, index) => (
                  <p key={index}>{entry}</p>
                ))}
              </div>
            ) : null}
            <div className="form-grid">
              <label className="field"><span>School</span><input value={programForm.school} onChange={(event) => setProgramForm({ ...programForm, school: event.target.value })} /></label>
              <label className="field"><span>Field</span><input value={programForm.field} onChange={(event) => setProgramForm({ ...programForm, field: event.target.value })} /></label>
              <label className="field"><span>Deadline</span><input type="date" value={programForm.deadline} onChange={(event) => setProgramForm({ ...programForm, deadline: event.target.value })} /></label>
              <label className="field">
                <span>Status</span>
                <select value={programForm.status} onChange={(event) => setProgramForm({ ...programForm, status: event.target.value })}>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="field"><span>Location</span><input value={programForm.location} onChange={(event) => setProgramForm({ ...programForm, location: event.target.value })} /></label>
              <label className="field"><span>Funding</span><input value={programForm.funding} onChange={(event) => setProgramForm({ ...programForm, funding: event.target.value })} /></label>
              <label className="field"><span>Tags</span><input value={programForm.tags} onChange={(event) => setProgramForm({ ...programForm, tags: event.target.value })} placeholder="STEM, Reach, Funding" /></label>
              <label className="field"><span>Faculty</span><input value={programForm.faculty} onChange={(event) => setProgramForm({ ...programForm, faculty: event.target.value })} placeholder="Prof. A, Prof. B" /></label>
            </div>
            <label className="field"><span>Research fit notes</span><textarea rows="3" value={programForm.fit} onChange={(event) => setProgramForm({ ...programForm, fit: event.target.value })} /></label>
            <label className="field"><span>Program notes</span><textarea rows="3" value={programForm.notes} onChange={(event) => setProgramForm({ ...programForm, notes: event.target.value })} /></label>
            <label className="field"><span>Interview notes</span><textarea rows="2" value={programForm.interviewNotes} onChange={(event) => setProgramForm({ ...programForm, interviewNotes: event.target.value })} /></label>
            <div className="button-row">
              <button className="button primary" type="submit">Save program</button>
              <button className="button secondary" type="button" onClick={resetProgramForm}>Clear</button>
            </div>
          </form>

          <form className="entry-form" onSubmit={handleTaskSubmit}>
            <h3>Checklist form</h3>
            <label className="field"><span>Task title</span><input value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} /></label>
            <label className="field"><span>Description</span><textarea rows="3" value={taskForm.description} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} /></label>
            <label className="field">
              <span>Priority</span>
              <select value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
            <div className="button-row">
              <button className="button primary" type="submit">Save task</button>
              <button className="button secondary" type="button" onClick={() => setTaskForm({ id: "", title: "", description: "", priority: "medium" })}>Clear</button>
            </div>
          </form>

          <form className="entry-form" onSubmit={handleDocumentSubmit}>
            <h3>Document form</h3>
            <label className="field"><span>Document</span><input value={documentForm.name} onChange={(event) => setDocumentForm({ ...documentForm, name: event.target.value })} /></label>
            <label className="field">
              <span>Status</span>
              <select value={documentForm.status} onChange={(event) => setDocumentForm({ ...documentForm, status: event.target.value })}>
                {Object.entries(documentLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="field"><span>Notes</span><textarea rows="3" value={documentForm.notes} onChange={(event) => setDocumentForm({ ...documentForm, notes: event.target.value })} /></label>
            <div className="button-row">
              <button className="button primary" type="submit">Save document</button>
              <button className="button secondary" type="button" onClick={() => setDocumentForm({ id: "", name: "", status: "not-started", notes: "" })}>Clear</button>
            </div>
          </form>

          <form className="entry-form" onSubmit={handleRecommenderSubmit}>
            <h3>Recommender form</h3>
            <label className="field"><span>Name</span><input value={recommenderForm.name} onChange={(event) => setRecommenderForm({ ...recommenderForm, name: event.target.value })} /></label>
            <label className="field">
              <span>Status</span>
              <select value={recommenderForm.status} onChange={(event) => setRecommenderForm({ ...recommenderForm, status: event.target.value })}>
                {Object.entries(recommenderLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="field"><span>Notes</span><textarea rows="3" value={recommenderForm.notes} onChange={(event) => setRecommenderForm({ ...recommenderForm, notes: event.target.value })} /></label>
            <div className="button-row">
              <button className="button primary" type="submit">Save recommender</button>
              <button className="button secondary" type="button" onClick={() => setRecommenderForm({ id: "", name: "", status: "not-asked", notes: "" })}>Clear</button>
            </div>
          </form>
        </div>

        <form className="entry-form advisor-form" onSubmit={handleAdvisorSubmit}>
          <h3>Advisor review settings</h3>
          <div className="form-grid">
            <label className="field"><span>Advisor or mentor name</span><input value={advisorForm.name} onChange={(event) => setAdvisorForm({ ...advisorForm, name: event.target.value })} /></label>
            <label className="field"><span>Meeting cadence</span><input value={advisorForm.cadence} onChange={(event) => setAdvisorForm({ ...advisorForm, cadence: event.target.value })} /></label>
          </div>
          <label className="field"><span>Feedback notes</span><textarea rows="3" value={advisorForm.notes} onChange={(event) => setAdvisorForm({ ...advisorForm, notes: event.target.value })} /></label>
          <div className="button-row">
            <button className="button primary" type="submit">Save advisor notes</button>
          </div>
        </form>
      </section>
    </div>
  );
}
