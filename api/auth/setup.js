mkdir -p api/auth

cat > api/auth/setup.js <<'JS'
import bcrypt from "bcryptjs";
import { db } from "../_lib/db.js";
import { readJson } from "../_lib/http.js";

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const token = request.headers.get("x-setup-token") || "";
    if (!process.env.SETUP_TOKEN || token !== process.env.SETUP_TOKEN) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const sql = db();

    // Only allow setup if no users exist yet
    const existing = await sql`SELECT COUNT(*)::int AS c FROM users`;
    if (existing[0].c > 0) {
      return Response.json({ error: "Setup already completed" }, { status: 409 });
    }

    const body = (await readJson(request)) || {};
    const main = body.main;
    const doctor = body.doctor;
    const general = body.general;

    if (!main?.email || !main?.password || !main?.fullName) {
      return Response.json({ error: "Missing main user fields" }, { status: 400 });
    }
    if (!doctor?.email || !doctor?.password || !doctor?.fullName) {
      return Response.json({ error: "Missing doctor user fields" }, { status: 400 });
    }
    if (!general?.email || !general?.password || !general?.fullName) {
      return Response.json({ error: "Missing general user fields" }, { status: 400 });
    }

    // Get role ids
    const roles = await sql`SELECT id, name FROM roles`;
    const roleId = Object.fromEntries(roles.map(r => [r.name, r.id]));

    const hMain = await bcrypt.hash(main.password, 12);
    const hDoc = await bcrypt.hash(doctor.password, 12);
    const hGen = await bcrypt.hash(general.password, 12);

    const [uMain] = await sql`
      INSERT INTO users (full_name, email, password_hash)
      VALUES (${main.fullName}, ${main.email}, ${hMain})
      RETURNING id, email
    `;
    const [uDoc] = await sql`
      INSERT INTO users (full_name, email, password_hash)
      VALUES (${doctor.fullName}, ${doctor.email}, ${hDoc})
      RETURNING id, email
    `;
    const [uGen] = await sql`
      INSERT INTO users (full_name, email, password_hash)
      VALUES (${general.fullName}, ${general.email}, ${hGen})
      RETURNING id, email
    `;

    await sql`INSERT INTO user_roles (user_id, role_id) VALUES (${uMain.id}, ${roleId.main})`;
    await sql`INSERT INTO user_roles (user_id, role_id) VALUES (${uDoc.id}, ${roleId.doctor})`;
    await sql`INSERT INTO user_roles (user_id, role_id) VALUES (${uGen.id}, ${roleId.general})`;

    return Response.json({ ok: true, users: [uMain.email, uDoc.email, uGen.email] });
  },
};
JS
