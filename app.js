const today = new Date().toISOString().slice(0, 10);

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
    fit: "Strong for applicants focused on machine learning systems, theory, and interdisciplinary computing research.",
    notes: "Needs a sharper paragraph on systems impact and a polished publication list.",
    interviewNotes: "Prepare a clear explanation of long-term research agenda."
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
    notes: "Need to compare methods training and recent placements.",
    interviewNotes: ""
  },
  {
    id: "uchicago-english",
    school: "University of Chicago",
    field: "English",
    deadline: "2026-12-10",
    status: "not-started",
    funding: "Humanities fellowship support",
    location: "Chicago, IL",
    tags: ["Humanities", "Theory", "Writing sample"],
    faculty: ["Prof. Rachel Kim", "Prof. Theo Morgan"],
    fit: "Strong if the writing sample foregrounds archival and theoretical rigor.",
    notes: "Writing sample needs one more revision pass.",
    interviewNotes: ""
  }
];

const defaultChecklist = [
  {
    id: "research-interests",
    title: "Define research interests",
    description: "Write a short paragraph explaining the core question or theme you want to pursue in a PhD.",
    priority: "high",
    custom: false
  },
  {
    id: "contact-recommenders",
    title: "Confirm recommenders",
    description: "Ask letter writers early and share your CV, statement draft, and deadline list.",
    priority: "high",
    custom: false
  },
  {
    id: "draft-statement",
    title: "Draft statement of purpose",
    description: "Build a master statement draft you can customize by department or advisor.",
    priority: "high",
    custom: false
  },
  {
    id: "submit-applications",
    title: "Submit applications",
    description: "Double-check fees, uploads, and transcript delivery before each deadline.",
    priority: "high",
    custom: false
  }
];

const defaultDocuments = [
  { id: "cv", name: "Academic CV", status: "review", notes: "One last advisor pass." },
  { id: "sop", name: "Statement of Purpose", status: "drafting", notes: "Master draft is 70% done." },
  { id: "writing-sample", name: "Writing Sample", status: "not-started", notes: "Choose strongest seminar paper." },
  { id: "transcript", name: "Transcripts", status: "ready", notes: "Unofficial copies saved and official ordering plan ready." }
];

const defaultRecommenders = [
  { id: "mentor-1", name: "Prof. Elena Brooks", status: "confirmed", notes: "Needs deadlines spreadsheet by next week." },
  { id: "mentor-2", name: "Prof. Serena Hall", status: "requested", notes: "Follow up after sharing CV." },
  { id: "mentor-3", name: "Dr. Marcus Lee", status: "not-asked", notes: "Potential third recommender from RA role." }
];

const defaultAdvisor = {
  name: "Faculty Mentor",
  cadence: "Biweekly",
  notes: "Review shortlist balance, statement framing, and whether letters are on track."
};

const presets = {
  stem: {
    tags: ["STEM", "Lab rotations", "Methods"],
    checklist: [
      ["list-labs", "List target labs", "Map advisors and recent papers for each target program.", "high"],
      ["update-publications", "Update publications section", "Add preprints, posters, and coding or lab outcomes.", "medium"]
    ],
    documents: [
      ["research-statement", "Research Statement", "drafting", "Outline current project, future agenda, and advisor fit."],
      ["coding-portfolio", "Technical Portfolio", "not-started", "Optional website, GitHub, or technical appendix."]
    ]
  },
  humanities: {
    tags: ["Humanities", "Archive", "Theory"],
    checklist: [
      ["revise-sample", "Revise writing sample", "Strengthen argument, citations, and framing for faculty readers.", "high"],
      ["archive-fit", "Research archival fit", "Note collections, languages, and methodological alignment.", "medium"]
    ],
    documents: [
      ["language-plan", "Language Preparation Notes", "drafting", "List languages, exams, or coursework that support the application."]
    ]
  },
  "social-science": {
    tags: ["Social Science", "Methods", "Fieldwork"],
    checklist: [
      ["methods-fit", "Compare methods training", "Record quant, qual, and mixed-methods strengths across programs.", "high"],
      ["placement-review", "Review placement outcomes", "Look at recent graduates and advisor placement patterns.", "medium"]
    ],
    documents: [
      ["research-proposal", "Research Proposal", "drafting", "Build a concise project overview with methods and motivating question."]
    ]
  }
};

const storageKeys = {
  state: "phd-pathway-state-v2"
};

const defaultState = {
  programs: defaultPrograms,
  checklist: defaultChecklist,
  checklistState: {},
  documents: defaultDocuments,
  recommenders: defaultRecommenders,
  advisor: defaultAdvisor,
  dismissedWelcome: false,
  theme: "light"
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKeys.state));
    return parsed ? parsed : clone(defaultState);
  } catch {
    return clone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(storageKeys.state, JSON.stringify(state));
}

const state = readState();
let selectedProgramId = state.programs[0]?.id || null;
let activeTag = "All";
let activeStatus = "all";
let searchTerm = "";
let sortMode = "deadline";

const statusLabels = {
  all: "All statuses",
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

const programForm = document.querySelector("#programForm");
const checklistForm = document.querySelector("#checklistForm");
const documentForm = document.querySelector("#documentForm");
const recommenderForm = document.querySelector("#recommenderForm");
const advisorForm = document.querySelector("#advisorForm");
const searchInput = document.querySelector("#searchInput");
const statusFilter = document.querySelector("#statusFilter");
const sortSelect = document.querySelector("#sortSelect");
const tagFilters = document.querySelector("#tagFilters");
const programList = document.querySelector("#programList");
const programDetail = document.querySelector("#programDetail");
const timelineList = document.querySelector("#timelineList");
const checklistList = document.querySelector("#checklistList");
const documentList = document.querySelector("#documentList");
const recommenderList = document.querySelector("#recommenderList");
const advisorSummary = document.querySelector("#advisorSummary");
const dashboardStats = document.querySelector("#dashboardStats");
const progressBar = document.querySelector("#progressBar");
const progressLabel = document.querySelector("#progressLabel");
const checklistCounter = document.querySelector("#checklistCounter");
const programCount = document.querySelector("#programCount");
const welcomeBanner = document.querySelector("#welcomeBanner");
const dismissWelcome = document.querySelector("#dismissWelcome");
const themeToggle = document.querySelector("#themeToggle");
const deleteProgramButton = document.querySelector("#deleteProgram");
const resetChecklistButton = document.querySelector("#resetChecklist");
const restoreDefaultsButton = document.querySelector("#restoreDefaults");
const exportButton = document.querySelector("#exportData");
const importInput = document.querySelector("#importData");
const presetSelect = document.querySelector("#presetSelect");
const clearProgramForm = document.querySelector("#clearProgramForm");
const clearTaskForm = document.querySelector("#clearTaskForm");
const clearDocumentForm = document.querySelector("#clearDocumentForm");
const clearRecommenderForm = document.querySelector("#clearRecommenderForm");
const autofillFromLinkButton = document.querySelector("#autofillFromLink");

function field(form, name) {
  return form.elements.namedItem(name);
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
  const date = new Date(`${dateString}T12:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(dateString) {
  if (!dateString) return null;
  const current = new Date(`${today}T12:00:00`);
  const target = new Date(`${dateString}T12:00:00`);
  return Math.round((target - current) / 86400000);
}

function getUrgencyLabel(program) {
  const diff = daysUntil(program.deadline);
  if (diff === null) return "No deadline";
  if (diff < 0) return "Past due";
  if (diff <= 14) return "Urgent";
  if (diff <= 45) return "Soon";
  return "On track";
}

async function fetchProgramSourceText(url) {
  const normalized = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
  const proxyUrl = `https://r.jina.ai/http://${normalized.replace(/^https?:\/\//, "")}`;
  const response = await fetch(proxyUrl);
  if (!response.ok) {
    throw new Error("Could not fetch source");
  }
  return { normalized, text: await response.text() };
}

function extractField(text) {
  const fields = [
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

function extractLocation(text) {
  const locationPatterns = [
    /\b([A-Z][a-z]+,\s?[A-Z]{2})\b/,
    /\bLocation[:\s]+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s?[A-Z]{2})/i
  ];
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return "";
}

function extractTags(text) {
  const candidates = [
    ["STEM", /engineering|computer science|biology|chemistry|physics|mathematics/i],
    ["Humanities", /history|english|literature|archive|philosophy/i],
    ["Social Science", /sociology|anthropology|economics|political science|psychology/i],
    ["Funding", /stipend|fellowship|assistantship|tuition/i],
    ["Interview", /interview|visit day|finalist/i]
  ];
  return candidates.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
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
    const value = match[1];
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }
  return "";
}

function extractSchool(text, url) {
  const titleMatch = text.match(/Title:\s*(.+)/i);
  if (titleMatch) {
    return titleMatch[1].split("|")[0].split("-")[0].trim();
  }
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname.split(".")[0].replace(/-/g, " ");
  } catch {
    return "";
  }
}

function extractFunding(text) {
  const lines = text.split("\n").filter(Boolean).slice(0, 80);
  const fundingLine = lines.find((line) => /stipend|funding|fellowship|tuition|assistantship/i.test(line));
  return fundingLine ? fundingLine.trim().slice(0, 140) : "";
}

function extractFaculty(text) {
  const matches = [...text.matchAll(/\bProf\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/g)].map((match) => match[0]);
  return [...new Set(matches)].slice(0, 4);
}

function extractFit(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 40);
  const candidate = lines.find((line) => /research|faculty|department|program|students/i.test(line));
  return candidate ? candidate.slice(0, 220) : "";
}

function extractNotes(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 35);
  const match = lines.find((line) => /admissions|application|statement|writing sample|deadline|faculty/i.test(line));
  return match ? match.slice(0, 220) : "";
}

function autofillProgramForm(data) {
  if (data.school && !field(programForm, "school").value) field(programForm, "school").value = data.school;
  if (data.field && !field(programForm, "field").value) field(programForm, "field").value = data.field;
  if (data.deadline && !field(programForm, "deadline").value) field(programForm, "deadline").value = data.deadline;
  if (data.funding && !field(programForm, "funding").value) field(programForm, "funding").value = data.funding;
  if (data.location && !field(programForm, "location").value) field(programForm, "location").value = data.location;
  if (data.tags.length && !field(programForm, "tags").value) field(programForm, "tags").value = data.tags.join(", ");
  if (data.faculty.length && !field(programForm, "faculty").value) field(programForm, "faculty").value = data.faculty.join(", ");
  if (data.fit && !field(programForm, "fit").value) field(programForm, "fit").value = data.fit;
  if (data.sourceUrl) field(programForm, "sourceUrl").value = data.sourceUrl;
  if (!field(programForm, "notes").value) {
    field(programForm, "notes").value = data.notes || `Imported from ${data.sourceUrl}`;
  }
}

function getAllTags() {
  return ["All", ...new Set(state.programs.flatMap((program) => program.tags))];
}

function ensureSelectedProgram() {
  const filtered = getFilteredPrograms();
  if (!filtered.length) {
    selectedProgramId = null;
    return;
  }
  if (!filtered.some((program) => program.id === selectedProgramId)) {
    selectedProgramId = filtered[0].id;
  }
}

function getFilteredPrograms() {
  const lowered = searchTerm.trim().toLowerCase();
  return [...state.programs]
    .filter((program) => {
      const matchesTag = activeTag === "All" || program.tags.includes(activeTag);
      const matchesStatus = activeStatus === "all" || program.status === activeStatus;
      const haystack = [
        program.school,
        program.field,
        program.location,
        program.funding,
        program.fit,
        program.notes,
        program.interviewNotes,
        program.faculty.join(" "),
        program.tags.join(" ")
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch = haystack.includes(lowered);
      return matchesTag && matchesStatus && matchesSearch;
    })
    .sort((left, right) => {
      if (sortMode === "school") {
        return left.school.localeCompare(right.school);
      }
      if (sortMode === "status") {
        return left.status.localeCompare(right.status);
      }
      if (!left.deadline && !right.deadline) return 0;
      if (!left.deadline) return 1;
      if (!right.deadline) return -1;
      return left.deadline.localeCompare(right.deadline);
    });
}

function getChecklistItems() {
  return state.checklist.map((item) => ({
    ...item,
    done: Boolean(state.checklistState[item.id])
  }));
}

function selectedProgram() {
  return state.programs.find((program) => program.id === selectedProgramId) || null;
}

function fillStatusFilter() {
  statusFilter.innerHTML = Object.entries(statusLabels)
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join("");
  statusFilter.value = activeStatus;
}

function renderTags() {
  tagFilters.innerHTML = "";
  getAllTags().forEach((tag) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tag-button${tag === activeTag ? " active" : ""}`;
    button.textContent = tag;
    button.addEventListener("click", () => {
      activeTag = tag;
      renderApp();
    });
    tagFilters.appendChild(button);
  });
}

function renderStats() {
  const submittedCount = state.programs.filter((program) => program.status === "submitted").length;
  const interviewingCount = state.programs.filter((program) => program.status === "interview").length;
  const urgentCount = state.programs.filter((program) => {
    const diff = daysUntil(program.deadline);
    return diff !== null && diff >= 0 && diff <= 21;
  }).length;
  const readyDocs = state.documents.filter((doc) => doc.status === "ready").length;
  const confirmedRecs = state.recommenders.filter((person) =>
    ["confirmed", "submitted"].includes(person.status)
  ).length;

  dashboardStats.innerHTML = `
    <article><span class="stat-label">Programs</span><strong>${state.programs.length}</strong></article>
    <article><span class="stat-label">Urgent deadlines</span><strong>${urgentCount}</strong></article>
    <article><span class="stat-label">Submitted</span><strong>${submittedCount}</strong></article>
    <article><span class="stat-label">Interviews</span><strong>${interviewingCount}</strong></article>
    <article><span class="stat-label">Ready documents</span><strong>${readyDocs}</strong></article>
    <article><span class="stat-label">Confirmed letters</span><strong>${confirmedRecs}</strong></article>
  `;
}

function renderPrograms() {
  const programs = getFilteredPrograms();
  programList.innerHTML = "";
  programCount.textContent = `${programs.length} programs`;

  if (!programs.length) {
    programList.innerHTML = `<div class="empty-state">No programs match those filters yet.</div>`;
    return;
  }

  programs.forEach((program) => {
    const card = document.createElement("article");
    card.className = `program-card${program.id === selectedProgramId ? " active" : ""}`;
    card.innerHTML = `
      <div class="program-head">
        <div>
          <h3>${program.school} • ${program.field}</h3>
          <p class="program-meta">${program.location || "Location pending"} • ${program.funding || "Funding pending"}</p>
        </div>
        <div class="program-right">
          <span class="status-chip ${program.status}">${statusLabels[program.status]}</span>
          <span class="deadline">${formatDate(program.deadline)}</span>
        </div>
      </div>
      <p>${program.fit || "Add fit notes for this program."}</p>
      <div class="pill-row">
        ${program.tags.map((tag) => `<span class="pill">${tag}</span>`).join("")}
        <span class="pill urgency">${getUrgencyLabel(program)}</span>
      </div>
    `;
    card.addEventListener("click", () => {
      selectedProgramId = program.id;
      renderApp();
    });
    programList.appendChild(card);
  });
}

function renderProgramDetail() {
  const program = selectedProgram();
  deleteProgramButton.disabled = !program;

  if (!program) {
    programDetail.innerHTML = `<div class="empty-state">Select a program to open its planning view.</div>`;
    return;
  }

  programDetail.innerHTML = `
    <article class="detail-card">
      <div class="detail-topline">
        <div>
          <h2>${program.school}</h2>
          <p><strong>${program.field}</strong> in ${program.location || "Location pending"}</p>
        </div>
        <button class="ghost-button" type="button" data-edit-program="${program.id}">Edit</button>
      </div>
      <div class="pill-row">
        <span class="pill">${statusLabels[program.status]}</span>
        <span class="pill">${formatDate(program.deadline)}</span>
        <span class="pill">${program.funding || "Funding pending"}</span>
        ${program.sourceUrl ? `<span class="pill source-pill">Linked source</span>` : ""}
      </div>
      <p>${program.notes || "Add notes for statement tailoring, faculty outreach, or application requirements."}</p>
      <ul class="detail-meta">
        <li>Faculty fit: ${program.faculty.join(", ") || "Add faculty names"}</li>
        <li>Why it fits: ${program.fit || "Add a fit summary."}</li>
        <li>Interview notes: ${program.interviewNotes || "No interview notes yet."}</li>
        <li>Source: ${program.sourceUrl ? `<a href="${program.sourceUrl}" target="_blank" rel="noreferrer">Open program website</a>` : "No source link saved."}</li>
      </ul>
    </article>
  `;

  const editButton = programDetail.querySelector("[data-edit-program]");
  editButton.addEventListener("click", () => populateProgramForm(program));
}

function renderTimeline() {
  const sorted = [...state.programs]
    .filter((program) => program.deadline)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 6);

  timelineList.innerHTML = sorted.length
    ? sorted
        .map((program) => {
          const diff = daysUntil(program.deadline);
          const countdown = diff === null ? "No deadline" : diff < 0 ? `${Math.abs(diff)} days ago` : `${diff} days left`;
          return `
            <article class="timeline-item">
              <div>
                <strong>${program.school} • ${program.field}</strong>
                <p>${statusLabels[program.status]} • ${countdown}</p>
              </div>
              <span class="deadline">${formatDate(program.deadline)}</span>
            </article>
          `;
        })
        .join("")
    : `<div class="empty-state">Add deadlines to see a calendar-style timeline.</div>`;
}

function renderChecklist() {
  const items = getChecklistItems();
  checklistCounter.textContent = `${items.length} tasks`;
  checklistList.innerHTML = "";

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = `checklist-item${item.done ? " done" : ""}`;
    row.innerHTML = `
      <label class="check-toggle"><input type="checkbox" ${item.done ? "checked" : ""} /></label>
      <div class="checklist-copy">
        <strong>${item.title}</strong>
        <p>${item.description}</p>
      </div>
      <div class="checklist-actions">
        <span class="priority ${item.priority}">${item.priority}</span>
        <button class="mini-button" type="button" data-edit-task="${item.id}">Edit</button>
        <button class="mini-button" type="button" data-delete-task="${item.id}">Delete</button>
      </div>
    `;

    row.querySelector("input").addEventListener("change", (event) => {
      state.checklistState[item.id] = event.target.checked;
      saveState();
      updateProgress();
      renderChecklist();
    });
    row.querySelector("[data-edit-task]").addEventListener("click", () => populateTaskForm(item));
    row.querySelector("[data-delete-task]").addEventListener("click", () => {
      state.checklist = state.checklist.filter((entry) => entry.id !== item.id);
      delete state.checklistState[item.id];
      saveState();
      renderApp();
    });
    checklistList.appendChild(row);
  });
}

function renderDocuments() {
  documentList.innerHTML = state.documents
    .map(
      (doc) => `
        <article class="resource-card">
          <div class="resource-head">
            <h3>${doc.name}</h3>
            <span class="status-chip ${doc.status}">${documentLabels[doc.status]}</span>
          </div>
          <p>${doc.notes || "No notes yet."}</p>
          <div class="button-row left">
            <button class="mini-button" type="button" data-edit-document="${doc.id}">Edit</button>
            <button class="mini-button" type="button" data-delete-document="${doc.id}">Delete</button>
          </div>
        </article>
      `
    )
    .join("");

  documentList.querySelectorAll("[data-edit-document]").forEach((button) => {
    button.addEventListener("click", () => {
      const doc = state.documents.find((entry) => entry.id === button.dataset.editDocument);
      populateDocumentForm(doc);
    });
  });

  documentList.querySelectorAll("[data-delete-document]").forEach((button) => {
    button.addEventListener("click", () => {
      state.documents = state.documents.filter((entry) => entry.id !== button.dataset.deleteDocument);
      saveState();
      renderApp();
    });
  });
}

function renderRecommenders() {
  recommenderList.innerHTML = state.recommenders
    .map(
      (person) => `
        <article class="resource-card">
          <div class="resource-head">
            <h3>${person.name}</h3>
            <span class="status-chip ${person.status}">${recommenderLabels[person.status]}</span>
          </div>
          <p>${person.notes || "No notes yet."}</p>
          <div class="button-row left">
            <button class="mini-button" type="button" data-edit-recommender="${person.id}">Edit</button>
            <button class="mini-button" type="button" data-delete-recommender="${person.id}">Delete</button>
          </div>
        </article>
      `
    )
    .join("");

  recommenderList.querySelectorAll("[data-edit-recommender]").forEach((button) => {
    button.addEventListener("click", () => {
      const person = state.recommenders.find((entry) => entry.id === button.dataset.editRecommender);
      populateRecommenderForm(person);
    });
  });

  recommenderList.querySelectorAll("[data-delete-recommender]").forEach((button) => {
    button.addEventListener("click", () => {
      state.recommenders = state.recommenders.filter((entry) => entry.id !== button.dataset.deleteRecommender);
      saveState();
      renderApp();
    });
  });
}

function renderAdvisorSummary() {
  advisorSummary.innerHTML = `
    <article class="resource-card">
      <div class="resource-head">
        <h3>${state.advisor.name || "No advisor listed"}</h3>
        <span class="count-pill">${state.advisor.cadence || "Cadence pending"}</span>
      </div>
      <p>${state.advisor.notes || "Add shared advising notes for meetings, blockers, and shortlist feedback."}</p>
    </article>
  `;
  field(advisorForm, "name").value = state.advisor.name || "";
  field(advisorForm, "cadence").value = state.advisor.cadence || "";
  field(advisorForm, "notes").value = state.advisor.notes || "";
}

function updateProgress() {
  const items = getChecklistItems();
  const done = items.filter((item) => item.done).length;
  const percent = items.length ? Math.round((done / items.length) * 100) : 0;
  progressBar.style.width = `${percent}%`;
  progressLabel.textContent = `${percent}%`;
}

function populateProgramForm(program) {
  field(programForm, "id").value = program.id;
  field(programForm, "school").value = program.school;
  field(programForm, "field").value = program.field;
  field(programForm, "deadline").value = program.deadline || "";
  field(programForm, "status").value = program.status;
  field(programForm, "location").value = program.location || "";
  field(programForm, "funding").value = program.funding || "";
  field(programForm, "tags").value = program.tags.join(", ");
  field(programForm, "faculty").value = program.faculty.join(", ");
  field(programForm, "fit").value = program.fit || "";
  field(programForm, "notes").value = program.notes || "";
  field(programForm, "interviewNotes").value = program.interviewNotes || "";
  field(programForm, "sourceUrl").value = program.sourceUrl || "";
  window.location.hash = "forms";
}

function populateTaskForm(task) {
  field(checklistForm, "id").value = task.id;
  field(checklistForm, "title").value = task.title;
  field(checklistForm, "description").value = task.description;
  field(checklistForm, "priority").value = task.priority;
  window.location.hash = "forms";
}

function populateDocumentForm(doc) {
  field(documentForm, "id").value = doc.id;
  field(documentForm, "name").value = doc.name;
  field(documentForm, "status").value = doc.status;
  field(documentForm, "notes").value = doc.notes || "";
  window.location.hash = "forms";
}

function populateRecommenderForm(person) {
  field(recommenderForm, "id").value = person.id;
  field(recommenderForm, "name").value = person.name;
  field(recommenderForm, "status").value = person.status;
  field(recommenderForm, "notes").value = person.notes || "";
  window.location.hash = "forms";
}

function clearForm(form) {
  form.reset();
  const idField = field(form, "id");
  if (idField) {
    idField.value = "";
  }
}

function applyTheme() {
  document.body.dataset.theme = state.theme || "light";
  themeToggle.textContent = state.theme === "dark" ? "Light mode" : "Dark mode";
}

function renderWelcome() {
  welcomeBanner.hidden = Boolean(state.dismissedWelcome);
}

function applyPreset(name) {
  const preset = presets[name];
  if (!preset) return;

  preset.tags.forEach((tag) => {
    if (!state.programs.some((program) => program.tags.includes(tag))) {
      if (state.programs[0]) {
        state.programs[0].tags.push(tag);
      }
    }
  });

  preset.checklist.forEach(([id, title, description, priority]) => {
    if (!state.checklist.some((item) => item.id === id)) {
      state.checklist.unshift({ id, title, description, priority, custom: true });
    }
  });

  preset.documents.forEach(([id, nameLabel, status, notes]) => {
    if (!state.documents.some((doc) => doc.id === id)) {
      state.documents.unshift({ id, name: nameLabel, status, notes });
    }
  });

  saveState();
  renderApp();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "phd-pathway-planner-data.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      Object.assign(state, clone(defaultState), parsed);
      selectedProgramId = state.programs[0]?.id || null;
      saveState();
      renderApp();
    } catch {
      alert("That file could not be imported. Please choose a valid planner JSON export.");
    }
  };
  reader.readAsText(file);
}

function renderApp() {
  ensureSelectedProgram();
  fillStatusFilter();
  renderTags();
  renderStats();
  renderPrograms();
  renderProgramDetail();
  renderTimeline();
  renderChecklist();
  renderDocuments();
  renderRecommenders();
  renderAdvisorSummary();
  updateProgress();
  renderWelcome();
  applyTheme();
}

searchInput.addEventListener("input", (event) => {
  searchTerm = event.target.value;
  renderApp();
});

statusFilter.addEventListener("change", (event) => {
  activeStatus = event.target.value;
  renderApp();
});

sortSelect.addEventListener("change", (event) => {
  sortMode = event.target.value;
  renderApp();
});

programForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(programForm);
  const id = formData.get("id").toString().trim();
  const program = {
    id: id || createId("program"),
    school: formData.get("school").toString().trim(),
    field: formData.get("field").toString().trim(),
    deadline: formData.get("deadline").toString().trim(),
    status: formData.get("status").toString(),
    location: formData.get("location").toString().trim(),
    funding: formData.get("funding").toString().trim(),
    tags: parseList(formData.get("tags").toString()),
    faculty: parseList(formData.get("faculty").toString()),
    fit: formData.get("fit").toString().trim(),
    notes: formData.get("notes").toString().trim(),
    interviewNotes: formData.get("interviewNotes").toString().trim(),
    sourceUrl: formData.get("sourceUrl").toString().trim()
  };

  if (id) {
    state.programs = state.programs.map((entry) => (entry.id === id ? program : entry));
  } else {
    state.programs.unshift(program);
  }
  selectedProgramId = program.id;
  saveState();
  clearForm(programForm);
  renderApp();
});

checklistForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(checklistForm);
  const id = formData.get("id").toString().trim();
  const task = {
    id: id || createId("task"),
    title: formData.get("title").toString().trim(),
    description: formData.get("description").toString().trim(),
    priority: formData.get("priority").toString(),
    custom: true
  };
  if (id) {
    state.checklist = state.checklist.map((entry) => (entry.id === id ? task : entry));
  } else {
    state.checklist.unshift(task);
  }
  saveState();
  clearForm(checklistForm);
  renderApp();
});

documentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(documentForm);
  const id = formData.get("id").toString().trim();
  const doc = {
    id: id || createId("document"),
    name: formData.get("name").toString().trim(),
    status: formData.get("status").toString(),
    notes: formData.get("notes").toString().trim()
  };
  if (id) {
    state.documents = state.documents.map((entry) => (entry.id === id ? doc : entry));
  } else {
    state.documents.unshift(doc);
  }
  saveState();
  clearForm(documentForm);
  renderApp();
});

recommenderForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(recommenderForm);
  const id = formData.get("id").toString().trim();
  const person = {
    id: id || createId("recommender"),
    name: formData.get("name").toString().trim(),
    status: formData.get("status").toString(),
    notes: formData.get("notes").toString().trim()
  };
  if (id) {
    state.recommenders = state.recommenders.map((entry) => (entry.id === id ? person : entry));
  } else {
    state.recommenders.unshift(person);
  }
  saveState();
  clearForm(recommenderForm);
  renderApp();
});

advisorForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.advisor = {
    name: field(advisorForm, "name").value.trim(),
    cadence: field(advisorForm, "cadence").value.trim(),
    notes: field(advisorForm, "notes").value.trim()
  };
  saveState();
  renderApp();
});

deleteProgramButton.addEventListener("click", () => {
  if (!selectedProgramId) return;
  state.programs = state.programs.filter((program) => program.id !== selectedProgramId);
  selectedProgramId = state.programs[0]?.id || null;
  saveState();
  renderApp();
});

resetChecklistButton.addEventListener("click", () => {
  state.checklistState = {};
  saveState();
  renderApp();
});

restoreDefaultsButton.addEventListener("click", () => {
  Object.assign(state, clone(defaultState));
  selectedProgramId = state.programs[0]?.id || null;
  activeTag = "All";
  activeStatus = "all";
  searchTerm = "";
  sortMode = "deadline";
  searchInput.value = "";
  sortSelect.value = "deadline";
  saveState();
  renderApp();
});

exportButton.addEventListener("click", exportData);
importInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) importData(file);
  event.target.value = "";
});

presetSelect.addEventListener("change", (event) => {
  if (event.target.value) {
    applyPreset(event.target.value);
    event.target.value = "";
  }
});

dismissWelcome.addEventListener("click", () => {
  state.dismissedWelcome = true;
  saveState();
  renderWelcome();
});

themeToggle.addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  saveState();
  applyTheme();
});

clearProgramForm.addEventListener("click", () => clearForm(programForm));
clearTaskForm.addEventListener("click", () => clearForm(checklistForm));
clearDocumentForm.addEventListener("click", () => clearForm(documentForm));
clearRecommenderForm.addEventListener("click", () => clearForm(recommenderForm));

autofillFromLinkButton.addEventListener("click", async () => {
  const url = field(programForm, "sourceUrl").value.trim();
  if (!url) return;

  autofillFromLinkButton.disabled = true;
  autofillFromLinkButton.textContent = "Importing...";
  try {
    const result = await fetchProgramSourceText(url);
    autofillProgramForm({
      sourceUrl: result.normalized,
      school: extractSchool(result.text, result.normalized),
      field: extractField(result.text),
      deadline: extractDeadline(result.text),
      funding: extractFunding(result.text),
      location: extractLocation(result.text),
      tags: extractTags(result.text),
      faculty: extractFaculty(result.text),
      fit: extractFit(result.text),
      notes: extractNotes(result.text)
    });
  } catch {
    alert("The app could not auto-fill from that link. You can still save the source URL and fill the rest manually.");
  } finally {
    autofillFromLinkButton.disabled = false;
    autofillFromLinkButton.textContent = "Autofill from link";
  }
});

renderApp();
