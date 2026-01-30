
const url = process.env.SETUP_URL || "https://www.zomorodmedical.com/api/setup";
const token = process.env.SETUP_TOKEN;

if (!token) {
  console.error("Missing SETUP_TOKEN env var.");
  process.exit(1);
}

const body = {
  main:    { fullName: "Mohammad Maani", email: "m.maani@zomorodmedical.com", password: "We_frind1" },
  doctor:  { fullName: "Dr. Osama",      email: "o.nbhan@zomorodmedical.com", password: "Osama_nbhan" },
  general: { fullName: "General",        email: "info@zomorodmedical.com",    password: "Test" },
};

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Setup-Token": token,
  },
  body: JSON.stringify(body),
});

const text = await res.text();
let json;
try { json = JSON.parse(text); } catch { json = { raw: text }; }

if (!res.ok) {
  console.error("Setup failed:", res.status, json);
  process.exit(1);
}

console.log("Setup OK:", json);
EOF
