// Gives each test file its own empty database in a temp folder. Import this before anything
// that touches lib/db.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

delete process.env.DATABASE_URL;
process.env.PGLITE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "nirakar-test-"));
