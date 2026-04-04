import { useEffect, useRef, useState } from "react";
import { cloudEnabled, supabase } from "./lib/supabase";

const storageKey = "phd-pathway-react-state";
const today = new Date().toISOString().slice(0, 10);
const backupStampKey = "phd-pathway-react-last-export";
const backupSignatureKey = "phd-pathway-react-last-export-signature";
const autosaveStampKey = "phd-pathway-react-last-autosave";

const defaultPrograms = [
  {
    id: "sample-program",
    school: "Sample University",
    field: "PhD Program",
    deadline: "2026-12-15",
    status: "researching",
    funding: "Funding details to confirm",
    location: "City, State",
    tags: ["Starter", "Edit me"],
    faculty: ["Potential advisor"],
    fit: "Use this sample entry as a starting point, then replace it with a real program you want to track.",
    notes: "Swap in your own program details, deadlines, and advisor notes.",
    applicationFee: "",
    greRequired: "",
    writingSampleRequired: "",
    contactEmail: "",
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
    id: "draft-statement",
    title: "Draft statement of purpose",
    description: "Build a master draft you can customize by advisor and department.",
    priority: "high"
  }
];

const defaultDocuments = [
  { id: "cv", name: "Academic CV", status: "drafting", notes: "Replace this starter note with your own revision plan." },
  { id: "sop", name: "Statement of Purpose", status: "not-started", notes: "" }
];

const defaultRecommenders = [
  { id: "mentor-1", name: "Potential recommender", status: "not-asked", notes: "Replace this sample person with your own letter writer." }
];

const defaultAdvisor = {
  name: "Advisor or mentor",
  cadence: "Monthly",
  notes: "Use this space for advising reminders or meeting notes."
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

const viewMeta = {
  home: {
    label: "Home",
    icon: "HM",
    blurb: "See the whole application cycle at a glance and jump into the right workspace."
  },
  control: {
    label: "Control Center",
    icon: "CT",
    blurb: "Manage setup, backups, presets, filters, and account state."
  },
  programs: {
    label: "Program Organizer",
    icon: "PO",
    blurb: "Add schools, autofill from links, and shape the shortlist."
  },
  compare: {
    label: "Compare View",
    icon: "CV",
    blurb: "Review multiple programs side by side before you commit time."
  },
  checklist: {
    label: "Checklist",
    icon: "CL",
    blurb: "Track tasks, priorities, and what still needs attention."
  },
  documents: {
    label: "Documents",
    icon: "DC",
    blurb: "Keep CVs, statements, transcripts, and notes organized."
  },
  recommenders: {
    label: "Recommendations",
    icon: "RC",
    blurb: "Track letter writers, follow-ups, and status updates."
  },
  advisor: {
    label: "Advisor Review",
    icon: "AR",
    blurb: "Keep strategy notes and mentoring conversations in one place."
  },
  summary: {
    label: "Summary View",
    icon: "SV",
    blurb: "Print or review a clean advising snapshot when it is time to share."
  }
};

function normalizePlannerState(parsed) {
  const programs = Array.isArray(parsed?.programs) ? parsed.programs : defaultPrograms;
  return {
    programs: programs.map((program) => ({
      ...program,
      fit: program?.fit || "",
      notes: program?.notes || "",
      applicationFee: program?.applicationFee || "",
      greRequired: program?.greRequired || "",
      writingSampleRequired: program?.writingSampleRequired || "",
      contactEmail: program?.contactEmail || "",
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

function readStateForKey(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
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
    "Data Science",
    "Public Health",
    "Neuroscience",
    "Statistics",
    "Education",
    "Philosophy",
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
    /\b(?:deadline|apply by|application due|priority deadline|final deadline)[:\s]+([A-Z][a-z]{2,8}\s+\d{1,2},?\s+20\d{2})/i,
    /\b(?:deadline|apply by|application due|priority deadline|final deadline)[:\s]+(\d{1,2}\/\d{1,2}\/20\d{2})/i,
    /\b([A-Z][a-z]{2,8}\s+\d{1,2},?\s+20\d{2})\b/
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    if (/^\d{4}-\d{2}-\d{2}$/.test(match[1])) return match[1];
    if (/^\d{1,2}\/\d{1,2}\/20\d{2}$/.test(match[1])) {
      const [month, day, year] = match[1].split("/");
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
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
    .find((entry) =>
      /stipend|funding|fellowship|assistantship|tuition|financial support|full support|guaranteed funding|five-year funding|annual stipend/i.test(
        entry
      )
    );
  return line ? line.slice(0, 140) : "";
}

function extractLocation(text) {
  const patterns = [
    /\b([A-Z][a-z]+,\s?[A-Z]{2})\b/,
    /\bLocation[:\s]+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s?[A-Z]{2})/i,
    /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s?(?:USA|United States|Canada|UK))\b/
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return "";
}

function extractFaculty(text) {
  const matches = [
    ...text.matchAll(/\b(?:Prof\.?|Professor|Dr\.?)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}/g)
  ].map((match) => match[0].replace(/\s+/g, " ").trim());
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
    .find((entry) => entry.length > 40 && /research|faculty|program|department|students|training|curriculum/i.test(entry));
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

function extractRequirements(text) {
  const lines = text
    .split("\n")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 30);
  return lines
    .filter((entry) => /statement|writing sample|gre|transcript|letters? of recommendation|cv|resume|application fee/i.test(entry))
    .slice(0, 2)
    .map((entry) => entry.slice(0, 180));
}

function extractProgramHighlights(text) {
  const lines = text
    .split("\n")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 35);
  return lines
    .filter((entry) => /research areas|areas of study|curriculum|training|cohort|placement|faculty interests/i.test(entry))
    .slice(0, 2)
    .map((entry) => entry.slice(0, 180));
}

function extractRequirementValue(text, patterns) {
  const line = text
    .split("\n")
    .map((entry) => entry.trim())
    .find((entry) => patterns.some((pattern) => pattern.test(entry)));
  return line || "";
}

function extractApplicationFee(text) {
  const line = extractRequirementValue(text, [/application fee/i, /\$\d{2,3}/]);
  const amount = line.match(/\$\s?\d{2,3}/)?.[0]?.replace(/\s+/g, "");
  return amount || "";
}

function extractGreRequirement(text) {
  const line = extractRequirementValue(text, [/gre/i]);
  if (!line) return "";
  if (/not required|no gre|gre waived|gre optional/i.test(line)) return "Optional";
  if (/required/i.test(line)) return "Yes";
  return "Optional";
}

function extractWritingSampleRequirement(text) {
  const line = extractRequirementValue(text, [/writing sample/i, /sample of written work/i]);
  if (!line) return "";
  if (/not required|no writing sample/i.test(line)) return "No";
  return "Yes";
}

function extractContactEmail(text) {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
}

function formatSavedAt(timestamp) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleString();
}

function groupProgramsByMonth(programs) {
  const buckets = new Map();
  programs
    .filter((program) => program.deadline)
    .sort((left, right) => left.deadline.localeCompare(right.deadline))
    .forEach((program) => {
      const monthKey = new Date(`${program.deadline}T12:00:00`).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric"
      });
      if (!buckets.has(monthKey)) buckets.set(monthKey, []);
      buckets.get(monthKey).push(program);
    });
  return [...buckets.entries()];
}

function statusClass(value) {
  return value.replace(/\s+/g, "-");
}

function formatAuthError(error) {
  const message = error?.message || "Something went wrong.";
  const lowered = message.toLowerCase();
  if (lowered.includes("invalid login credentials")) return "That email/password combination did not work.";
  if (lowered.includes("email not confirmed")) return "Email confirmation is still enabled in Supabase. Disable it or confirm this account first.";
  if (lowered.includes("user already registered")) return "That account already exists. Try signing in instead.";
  return message;
}

export default function App() {
  const [planner, setPlanner] = useState(() => (cloudEnabled ? defaultState : readState()));
  const [selectedProgramId, setSelectedProgramId] = useState(
    () => (cloudEnabled ? defaultState.programs[0]?.id || null : readState().programs[0]?.id || null)
  );
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("All");
  const [activeStatus, setActiveStatus] = useState("all");
  const [sortMode, setSortMode] = useState("deadline");
  const [autofillBusy, setAutofillBusy] = useState(false);
  const [activeView, setActiveView] = useState("home");
  const [authMode, setAuthMode] = useState("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authUser, setAuthUser] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [cloudSyncState, setCloudSyncState] = useState("idle");
  const [lastCloudSync, setLastCloudSync] = useState("");
  const [compareIds, setCompareIds] = useState([]);

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
    applicationFee: "",
    greRequired: "",
    writingSampleRequired: "",
    contactEmail: "",
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
  const [lastExportedAt, setLastExportedAt] = useState(() => localStorage.getItem(backupStampKey) || "");
  const [lastExportSignature, setLastExportSignature] = useState(() => localStorage.getItem(backupSignatureKey) || "");
  const [lastAutosavedAt, setLastAutosavedAt] = useState(() => localStorage.getItem(autosaveStampKey) || "");
  const [saveState, setSaveState] = useState("saved");
  const [accountHydrated, setAccountHydrated] = useState(!cloudEnabled);
  const hydrationLoadedRef = useRef(false);
  const localCacheKey = authUser ? `${storageKey}:${authUser.id}` : storageKey;

  useEffect(() => {
    setSaveState("saving");
    const timeoutId = window.setTimeout(() => {
      localStorage.setItem(localCacheKey, JSON.stringify(planner));
      const stamp = new Date().toISOString();
      localStorage.setItem(autosaveStampKey, stamp);
      setLastAutosavedAt(stamp);
      setSaveState("saved");
    }, 450);
    document.body.dataset.theme = planner.theme;
    return () => window.clearTimeout(timeoutId);
  }, [localCacheKey, planner]);

  useEffect(() => {
    setAdvisorForm(planner.advisor);
  }, [planner.advisor]);

  useEffect(() => {
    if (!cloudEnabled || !supabase) return undefined;

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setAuthUser(data.session?.user ?? null);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!cloudEnabled || !supabase) return undefined;

    let cancelled = false;

    async function hydrateAccountPlanner() {
      if (!authUser) {
        hydrationLoadedRef.current = false;
        setAccountHydrated(true);
        setCloudSyncState("idle");
        setLastCloudSync("");
        setPlanner(defaultState);
        setSelectedProgramId(defaultState.programs[0]?.id || null);
        return;
      }

      setAccountHydrated(false);
      setAuthMessage("Loading your planner...");
      const localState = readStateForKey(`${storageKey}:${authUser.id}`);
      if (!cancelled) {
        setPlanner(localState);
        setSelectedProgramId(localState.programs[0]?.id || null);
      }

      const { data, error } = await supabase
        .from("planner_states")
        .select("state, updated_at")
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setAuthMessage(`Loaded local account data. Cloud sync issue: ${error.message}`);
      } else if (data?.state) {
        const normalized = normalizePlannerState(data.state);
        setPlanner(normalized);
        setSelectedProgramId(normalized.programs[0]?.id || null);
        if (data.updated_at) setLastCloudSync(data.updated_at);
        setAuthMessage(`Signed in as ${authUser.email}.`);
      } else {
        setAuthMessage(`Signed in as ${authUser.email}. No cloud planner found yet, so this account starts fresh.`);
        setPlanner(localState);
        setSelectedProgramId(localState.programs[0]?.id || null);
      }

      hydrationLoadedRef.current = true;
      setAccountHydrated(true);
    }

    hydrateAccountPlanner();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  useEffect(() => {
    if (!cloudEnabled || !supabase || !authUser || !accountHydrated || !hydrationLoadedRef.current) return undefined;

    setCloudSyncState("syncing");
    const timeoutId = window.setTimeout(async () => {
      const { error } = await supabase.from("planner_states").upsert(
        {
          user_id: authUser.id,
          state: planner,
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      );

      if (error) {
        setCloudSyncState("error");
        setAuthMessage(`Signed in as ${authUser.email}. Cloud sync issue: ${error.message}`);
      } else {
        const stamp = new Date().toISOString();
        setCloudSyncState("synced");
        setLastCloudSync(stamp);
      }
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [accountHydrated, authUser, planner]);

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
  const plannerSnapshot = JSON.stringify(planner);
  const needsExportReminder = plannerSnapshot !== lastExportSignature;
  const monthlyDeadlines = groupProgramsByMonth(planner.programs);
  const comparedPrograms = planner.programs.filter((program) => compareIds.includes(program.id));
  const printPrograms = [...planner.programs].sort((left, right) => {
    if (!left.deadline && !right.deadline) return left.school.localeCompare(right.school);
    if (!left.deadline) return 1;
    if (!right.deadline) return -1;
    return left.deadline.localeCompare(right.deadline);
  });

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
  const viewLabels = Object.fromEntries(Object.entries(viewMeta).map(([key, value]) => [key, value.label]));

  function updatePlanner(updater) {
    setPlanner((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      if (!next.programs.some((program) => program.id === selectedProgramId)) {
        setSelectedProgramId(next.programs[0]?.id || null);
      }
      setCompareIds((currentCompareIds) => currentCompareIds.filter((id) => next.programs.some((program) => program.id === id)));
      return next;
    });
  }

  function openView(view) {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    if (!cloudEnabled || !supabase || !authEmail.trim() || !authPassword.trim()) return;
    setAuthBusy(true);
    setAuthMessage("");
    const email = authEmail.trim().toLowerCase();

    try {
      const response =
        authMode === "signup"
          ? await supabase.auth.signUp({ email, password: authPassword })
          : await supabase.auth.signInWithPassword({ email, password: authPassword });

      if (response.error) {
        setAuthMessage(formatAuthError(response.error));
      } else if (authMode === "signup" && !response.data.session) {
        setAuthMessage("Account created. If Supabase still requires email confirmation, disable that setting or confirm this account first.");
      } else {
        setAuthMessage(`${authMode === "signup" ? "Account created" : "Signed in"} for ${email}.`);
        setAuthPassword("");
      }
    } catch (error) {
      setAuthMessage(formatAuthError(error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOutAccount() {
    if (!cloudEnabled || !supabase) return;
    await supabase.auth.signOut();
    setAuthPassword("");
    setAuthMessage("Signed out. This browser is back to a blank planner until someone signs in.");
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
      applicationFee: "",
      greRequired: "",
      writingSampleRequired: "",
      contactEmail: "",
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
      applicationFee: programForm.applicationFee.trim(),
      greRequired: programForm.greRequired.trim(),
      writingSampleRequired: programForm.writingSampleRequired.trim(),
      contactEmail: programForm.contactEmail.trim(),
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
      applicationFee: program.applicationFee || "",
      greRequired: program.greRequired || "",
      writingSampleRequired: program.writingSampleRequired || "",
      contactEmail: program.contactEmail || "",
      tags: program.tags.join(", "),
      faculty: program.faculty.join(", "),
      fit: program.fit || "",
      notes: program.notes || "",
      interviewNotes: program.interviewNotes || ""
    });
    window.location.hash = "program-editor";
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(planner, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "phd-pathway-react-data.json";
    anchor.click();
    URL.revokeObjectURL(url);
    const stamp = new Date().toLocaleString();
    localStorage.setItem(backupStampKey, stamp);
    localStorage.setItem(backupSignatureKey, plannerSnapshot);
    setLastExportedAt(stamp);
    setLastExportSignature(plannerSnapshot);
  }

  function printSummary() {
    window.print();
  }

  function toggleCompare(programId) {
    setCompareIds((current) => {
      if (current.includes(programId)) return current.filter((id) => id !== programId);
      if (current.length >= 3) return [...current.slice(1), programId];
      return [...current, programId];
    });
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
        const stamp = new Date().toLocaleString();
        const importedSnapshot = JSON.stringify(normalized);
        localStorage.setItem(backupStampKey, stamp);
        localStorage.setItem(backupSignatureKey, importedSnapshot);
        setLastExportedAt(stamp);
        setLastExportSignature(importedSnapshot);
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
      const inferredRequirements = extractRequirements(result.text);
      const inferredHighlights = extractProgramHighlights(result.text);
      const combinedNotes = [extractNotes(result.text), ...inferredRequirements, ...inferredHighlights]
        .filter(Boolean)
        .slice(0, 3)
        .join(" ");
      setProgramForm((current) => ({
        ...current,
        sourceUrl: result.normalized,
        school: current.school || extractSchool(result.text, result.normalized),
        field: current.field || extractField(result.text) || extractFieldFromTitle(result.text),
        deadline: current.deadline || extractDeadline(result.text),
        funding: current.funding || extractFunding(result.text),
        applicationFee: current.applicationFee || extractApplicationFee(result.text),
        greRequired: current.greRequired || extractGreRequirement(result.text),
        writingSampleRequired: current.writingSampleRequired || extractWritingSampleRequirement(result.text),
        contactEmail: current.contactEmail || extractContactEmail(result.text),
        location: current.location || extractLocation(result.text),
        tags: current.tags || extractTags(result.text).join(", "),
        faculty: current.faculty || extractFaculty(result.text).join(", "),
        fit: current.fit || extractFit(result.text),
        notes: current.notes || combinedNotes || inferredSummary[0] || `Imported from ${result.normalized}`,
        sourceSummary: current.sourceSummary?.length
          ? current.sourceSummary
          : [...new Set([...inferredSummary, ...inferredRequirements, ...inferredHighlights])].slice(0, 4)
      }));
    } catch {
      window.alert("The app could not auto-fill from that link. You can still keep the URL and fill the rest manually.");
    } finally {
      setAutofillBusy(false);
    }
  }

  return (
    <div className="page-shell app-shell">
      <nav className="site-nav">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div>
            <p className="eyebrow">PhD Pathway Planner</p>
            <h2>{viewLabels[activeView]}</h2>
            <p className="brand-subtitle">{viewMeta[activeView].blurb}</p>
          </div>
        </div>
        <div className="nav-pills">
          {Object.entries(viewMeta).map(([value, meta]) => (
            <button
              key={value}
              className={`nav-pill${activeView === value ? " active" : ""}`}
              type="button"
              onClick={() => openView(value)}
            >
              <span className="nav-pill-icon" aria-hidden="true">{meta.icon}</span>
              {meta.label}
            </button>
          ))}
        </div>
      </nav>

      {activeView === "home" ? (
        <>
          <header className="hero">
            <div className="hero-copy">
              <p className="eyebrow">Planner Workspace</p>
              <h1>Build a calmer, clearer PhD application cycle from one place.</h1>
              <p className="hero-text">
                Organize programs, compare fit, track materials, and prep for advising meetings without getting lost in a giant scrolling dashboard.
              </p>
              <div className="hero-actions">
                <button className="button primary" type="button" onClick={() => openView("programs")}>
                  Open planner
                </button>
                <button className="button secondary" type="button" onClick={() => openView("control")}>
                  Manage setup
                </button>
              </div>
              <div className="hero-highlights">
                <article className="mini-card">
                  <span className="mini-card-icon" aria-hidden="true">PO</span>
                  <div>
                    <strong>Build your shortlist</strong>
                    <p>Keep real program pages, deadlines, faculty, and fit notes together.</p>
                  </div>
                </article>
                <article className="mini-card">
                  <span className="mini-card-icon" aria-hidden="true">CL</span>
                  <div>
                    <strong>Track the work</strong>
                    <p>See tasks, documents, and recommenders without switching tools.</p>
                  </div>
                </article>
              </div>
            </div>

            <section className="hero-card hero-showcase">
              <div className="hero-row">
                <div>
                  <p className="eyebrow">Featured Workspace</p>
                  <h2>Your application pace</h2>
                </div>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => updatePlanner((current) => ({ ...current, theme: current.theme === "dark" ? "light" : "dark" }))}
                >
                  {planner.theme === "dark" ? "Light mode" : "Dark mode"}
                </button>
              </div>
              <div className="showcase-frame">
                <div className="showcase-rail" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="showcase-body">
                  <section className="showcase-panel">
                    <div className="showcase-panel-head">
                      <div>
                        <p className="eyebrow">Current Focus</p>
                        <h3>Cycle snapshot</h3>
                      </div>
                      <span className="pill reminder">{progress}% complete</span>
                    </div>
                    <div className="showcase-stat-grid">
                      <article className="showcase-stat">
                        <span>Programs</span>
                        <strong>{dashboard.programs}</strong>
                      </article>
                      <article className="showcase-stat">
                        <span>Urgent</span>
                        <strong>{dashboard.urgent}</strong>
                      </article>
                      <article className="showcase-stat">
                        <span>Submitted</span>
                        <strong>{dashboard.submitted}</strong>
                      </article>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                  </section>
                  <aside className="showcase-side">
                    <article className="showcase-note">
                      <span className="showcase-kicker">Ready materials</span>
                      <strong>{dashboard.readyDocs} documents</strong>
                      <p>Keep statements, CVs, and transcripts aligned with each deadline.</p>
                    </article>
                    <article className="showcase-note">
                      <span className="showcase-kicker">Recommendation status</span>
                      <strong>{dashboard.confirmedRecs} letters in motion</strong>
                      <p>Track who is confirmed and who still needs a follow-up.</p>
                    </article>
                  </aside>
                </div>
              </div>
            </section>
          </header>

          <section className="panel landing-panel">
            <div className="section-row">
              <div>
                <p className="eyebrow">How It Works</p>
                <h2>Move through the cycle in focused workspaces</h2>
              </div>
              <button className="button secondary" type="button" onClick={() => openView("programs")}>
                Start planning
              </button>
            </div>
            <div className="landing-intro">
              <div className="landing-copy">
                <p>
                  PhD Pathway Planner helps students build a shortlist, compare programs, manage application materials,
                  track recommendation letters, and prepare clean advising summaries.
                </p>
                <p>
                  The site is organized around point-and-click workspaces, so you can step into the exact part of the
                  process you need instead of scrolling through everything at once.
                </p>
              </div>
              <aside className="journey-card">
                <p className="eyebrow">Typical Flow</p>
                <ol className="journey-list">
                  <li>Shape a shortlist and import real program links.</li>
                  <li>Compare requirements, deadlines, and advisor fit.</li>
                  <li>Track materials, letters, and meeting-ready summaries.</li>
                </ol>
              </aside>
            </div>
            <div className="section-nav-grid">
              {Object.entries(viewMeta)
                .filter(([key]) => key !== "home")
                .map(([key, meta]) => (
                  <button key={key} className="nav-card" type="button" onClick={() => openView(key)}>
                    <span className="nav-card-icon" aria-hidden="true">{meta.icon}</span>
                    <h3>{meta.label}</h3>
                    <p>{meta.blurb}</p>
                  </button>
                ))}
            </div>
          </section>
        </>
      ) : null}

      {activeView === "control" ? <section className="panel controls-panel" id="programs">
        <div className="section-row">
          <div>
            <p className="eyebrow">Control Center</p>
            <h2>Search, sort, filter, and back up your data.</h2>
          </div>
          <div className="button-row controls-actions">
            <button className="button secondary" type="button" onClick={exportData}>
              Export
            </button>
            <button className="button secondary" type="button" onClick={printSummary}>
              Print summary
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

        {cloudEnabled ? (
          <div className="account-card">
            <div className="section-row">
              <div>
                <p className="eyebrow">Accounts</p>
                <h3>{authUser ? "Private planner account connected" : "Sign in for your own planner"}</h3>
              </div>
              <span className={`pill ${authUser ? "" : "status not-started"}`}>
                {authUser ? "Private data active" : "Account required for private planners"}
              </span>
            </div>
            {authUser ? (
              <div className="account-summary">
                <p>{authUser.email}</p>
                <p>
                  {cloudSyncState === "syncing"
                    ? "Syncing your planner..."
                    : lastCloudSync
                      ? `Last cloud sync: ${formatSavedAt(lastCloudSync)}`
                      : "Cloud sync will begin after your first account change."}
                </p>
                <div className="button-row">
                  <button className="button secondary" type="button" onClick={signOutAccount}>
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <form className="account-form" onSubmit={handleAuthSubmit}>
                <div className="account-toggle">
                  <button
                    className={`button tiny ${authMode === "signin" ? "primary" : "secondary"}`}
                    type="button"
                    onClick={() => setAuthMode("signin")}
                  >
                    Sign in
                  </button>
                  <button
                    className={`button tiny ${authMode === "signup" ? "primary" : "secondary"}`}
                    type="button"
                    onClick={() => setAuthMode("signup")}
                  >
                    Create account
                  </button>
                </div>
                <div className="account-fields">
                  <label className="field">
                    <span>Email</span>
                    <input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} />
                  </label>
                  <label className="field">
                    <span>Password</span>
                    <input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} />
                  </label>
                </div>
                <div className="button-row">
                  <button className="button primary" type="submit" disabled={authBusy}>
                    {authBusy ? "Working..." : authMode === "signup" ? "Create account" : "Sign in"}
                  </button>
                </div>
              </form>
            )}
            <p className="helper-text">
              {authUser
                ? "This planner now belongs to the signed-in account, so different users won’t see each other’s saved data."
                : "Use an account to keep each person’s planner separate. Sign out on shared devices when you are done."}
            </p>
            {authMessage ? <p className="cloud-message">{authMessage}</p> : null}
          </div>
        ) : null}

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

        <div className="backup-card">
          <div>
            <div className="section-row">
              <div>
                <p className="eyebrow">Local Backup</p>
              </div>
              {needsExportReminder ? <span className="pill reminder">Export reminder</span> : null}
            </div>
            <h3>Keep a fresh export while cloud sync is paused.</h3>
            <p className="helper-text">
              {lastExportedAt
                ? `Last backup activity: ${lastExportedAt}`
                : "No backup file exported yet in this browser."}
            </p>
            <p className="helper-text autosave-text">
              {saveState === "saving"
                ? "Saving changes locally..."
                : `Autosaved locally${lastAutosavedAt ? ` at ${formatSavedAt(lastAutosavedAt)}` : ""}.`}
            </p>
          </div>
          <div className="backup-notes">
            <p>
              {needsExportReminder
                ? "You have changes that are not included in your latest backup file yet."
                : "Your current planner matches the latest backup activity in this browser."}
            </p>
            <p>Import that file anytime to restore your planner on this device or another one.</p>
          </div>
        </div>

        <div className="compare-toolbar">
          <div>
            <p className="eyebrow">Compare</p>
            <h3>Choose up to 3 programs to compare side by side.</h3>
          </div>
          <span className="pill">{compareIds.length}/3 selected</span>
        </div>
      </section> : null}

      {activeView === "programs" ? <main className="content-grid">
        <section className="panel panel-primary" id="program-organizer">
          <div className="section-row">
            <div>
              <p className="eyebrow">Program Organizer</p>
              <h2>Your shortlist</h2>
            </div>
            <div className="button-row">
              <span className="pill">{filteredPrograms.length} programs</span>
              <button className="button tiny secondary" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                Add program
              </button>
            </div>
          </div>
          <form className="entry-form inline-form" id="program-editor" onSubmit={handleProgramSubmit}>
            <div className="section-row">
              <div>
                <h3>{programForm.id ? "Edit program" : "Add program"}</h3>
                <p className="helper-text">Add a school directly here, or paste a program link and autofill the details.</p>
              </div>
            </div>
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
              <label className="field"><span>Application fee</span><input value={programForm.applicationFee} onChange={(event) => setProgramForm({ ...programForm, applicationFee: event.target.value })} placeholder="$75" /></label>
              <label className="field"><span>GRE required</span><input value={programForm.greRequired} onChange={(event) => setProgramForm({ ...programForm, greRequired: event.target.value })} placeholder="Yes, No, Optional" /></label>
              <label className="field"><span>Writing sample</span><input value={programForm.writingSampleRequired} onChange={(event) => setProgramForm({ ...programForm, writingSampleRequired: event.target.value })} placeholder="Yes or No" /></label>
              <label className="field"><span>Contact email</span><input value={programForm.contactEmail} onChange={(event) => setProgramForm({ ...programForm, contactEmail: event.target.value })} placeholder="grad@school.edu" /></label>
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
                  <div className="button-row compare-row">
                    <button
                      className="button tiny secondary"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleCompare(program.id);
                      }}
                    >
                      {compareIds.includes(program.id) ? "Remove from compare" : "Add to compare"}
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">No programs match those filters yet.</div>
            )}
          </div>
        </section>

        <aside className="panel panel-sidebar">
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
                <li>Application fee: {selectedProgram.applicationFee || "Not added yet."}</li>
                <li>GRE required: {selectedProgram.greRequired || "Not added yet."}</li>
                <li>Writing sample: {selectedProgram.writingSampleRequired || "Not added yet."}</li>
                <li>Contact email: {selectedProgram.contactEmail || "Not added yet."}</li>
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

          <div className="section-block">
            <p className="eyebrow">Calendar</p>
            <h3>Deadline calendar</h3>
            {monthlyDeadlines.length ? (
              <div className="calendar-grid">
                {monthlyDeadlines.map(([month, programs]) => (
                  <article key={month} className="card calendar-card">
                    <h4>{month}</h4>
                    <div className="stack">
                      {programs.map((program) => (
                        <div key={program.id} className="calendar-item">
                          <strong>{formatDate(program.deadline)}</strong>
                          <p>{program.school} • {program.field}</p>
                          <span className={`pill status ${statusClass(program.status)}`}>{statusLabels[program.status]}</span>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">Add deadlines to see a calendar view.</div>
            )}
          </div>
        </aside>
      </main> : null}

      {activeView === "compare" ? <main className="content-grid">
        <section className="panel panel-full" id="compare-view">
          <div className="section-row">
            <div>
              <p className="eyebrow">Compare View</p>
              <h2>Side-by-side program comparison</h2>
            </div>
            <span className="pill">{comparedPrograms.length ? `${comparedPrograms.length} programs` : "Select programs to compare"}</span>
          </div>
          {comparedPrograms.length ? (
            <div className="compare-grid">
              {comparedPrograms.map((program) => (
                <article key={program.id} className="card compare-card">
                  <div className="section-row">
                    <div>
                      <h3>{program.school}</h3>
                      <p>{program.field}</p>
                    </div>
                    <span className={`pill status ${statusClass(program.status)}`}>{statusLabels[program.status]}</span>
                  </div>
                  <ul className="detail-list compare-list">
                    <li>Deadline: {formatDate(program.deadline)}</li>
                    <li>Funding: {program.funding || "Not added"}</li>
                    <li>Application fee: {program.applicationFee || "Not added"}</li>
                    <li>GRE required: {program.greRequired || "Not added"}</li>
                    <li>Writing sample: {program.writingSampleRequired || "Not added"}</li>
                    <li>Contact email: {program.contactEmail || "Not added"}</li>
                    <li>Faculty: {program.faculty.join(", ") || "Not added"}</li>
                  </ul>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">Use “Add to compare” in Program Organizer first, then come back here.</div>
          )}
        </section>
      </main> : null}

      {activeView === "checklist" ? <main className="content-grid">
        <section className="panel panel-main panel-full" id="checklist-section">
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
          <form className="entry-form inline-form" onSubmit={handleTaskSubmit}>
            <h3>{taskForm.id ? "Edit task" : "Add task"}</h3>
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
      </main> : null}

      {activeView === "documents" ? <main className="content-grid">
        <section className="panel panel-side panel-full" id="documents-section">
          <p className="eyebrow">Documents</p>
          <h2>Core materials</h2>
          <form className="entry-form inline-form" onSubmit={handleDocumentSubmit}>
            <h3>{documentForm.id ? "Edit document" : "Add document"}</h3>
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
      </main> : null}

      {activeView === "recommenders" ? <main className="content-grid">
        <section className="panel panel-side panel-full" id="recommenders-section">
          <p className="eyebrow">Recommendations</p>
          <h2>Letter writer tracker</h2>
          <form className="entry-form inline-form" onSubmit={handleRecommenderSubmit}>
            <h3>{recommenderForm.id ? "Edit recommender" : "Add recommender"}</h3>
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
      </main> : null}

      {activeView === "advisor" ? <main className="content-grid">
        <section className="panel panel-main panel-full" id="advisor-section">
          <p className="eyebrow">Advisor Review</p>
          <h2>Mentor snapshot</h2>
          <form className="entry-form inline-form" onSubmit={handleAdvisorSubmit}>
            <h3>Advisor settings</h3>
            <div className="form-grid">
              <label className="field"><span>Advisor or mentor name</span><input value={advisorForm.name} onChange={(event) => setAdvisorForm({ ...advisorForm, name: event.target.value })} /></label>
              <label className="field"><span>Meeting cadence</span><input value={advisorForm.cadence} onChange={(event) => setAdvisorForm({ ...advisorForm, cadence: event.target.value })} /></label>
            </div>
            <label className="field"><span>Feedback notes</span><textarea rows="3" value={advisorForm.notes} onChange={(event) => setAdvisorForm({ ...advisorForm, notes: event.target.value })} /></label>
            <div className="button-row">
              <button className="button primary" type="submit">Save advisor notes</button>
            </div>
          </form>
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
      </main> : null}

      {activeView === "summary" ? <main className="content-grid">
        <section className="panel print-panel panel-full" id="summary-section">
          <div className="section-row">
            <div>
              <p className="eyebrow">Summary View</p>
              <h2>Printable application snapshot</h2>
            </div>
            <button className="button secondary" type="button" onClick={printSummary}>
              Print or save PDF
            </button>
          </div>
          <div className="print-sheet">
            <div className="print-header">
              <div>
                <h3>PhD Pathway Planner Summary</h3>
                <p>Generated from your current shortlist, checklist, and application materials.</p>
              </div>
              <div className="print-meta">
                <span className="pill">{planner.programs.length} programs</span>
                <span className="pill">{progress}% checklist complete</span>
              </div>
            </div>
            <div className="print-summary-grid">
              <article className="card print-program">
                <h3>Top open tasks</h3>
                <div className="stack">
                  {checklistItems
                    .filter((task) => !task.done)
                    .slice(0, 4)
                    .map((task) => (
                      <p key={task.id}>
                        <strong>{task.title}</strong> • {task.priority}
                      </p>
                    ))}
                </div>
              </article>
              <article className="card print-program">
                <h3>Documents and letters</h3>
                <div className="stack">
                  {planner.documents.slice(0, 3).map((doc) => (
                    <p key={doc.id}>
                      <strong>{doc.name}</strong> • {documentLabels[doc.status]}
                    </p>
                  ))}
                  {planner.recommenders.slice(0, 2).map((person) => (
                    <p key={person.id}>
                      <strong>{person.name}</strong> • {recommenderLabels[person.status]}
                    </p>
                  ))}
                </div>
              </article>
            </div>
            <div className="print-summary-grid">
              {printPrograms.map((program) => (
                <article key={program.id} className="card print-program">
                  <div className="row">
                    <div>
                      <h3>{program.school}</h3>
                      <p>{program.field}</p>
                    </div>
                    <span className={`pill status ${statusClass(program.status)}`}>{statusLabels[program.status]}</span>
                  </div>
                  <p>{program.location || "Location pending"} • {formatDate(program.deadline)}</p>
                  <p>{program.fit || program.notes || "Add more program notes for this summary."}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main> : null}
    </div>
  );
}
