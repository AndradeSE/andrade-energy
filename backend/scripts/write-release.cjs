const { execFileSync } = require("node:child_process");
const { writeFileSync } = require("node:fs");
const path = require("node:path");
let commit;
try { commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", cwd: path.join(__dirname, "..") }).trim(); }
catch { commit = process.env.RENDER_GIT_COMMIT || process.env.COMMIT_REF || "local"; }
writeFileSync(path.join(__dirname, "../dist/release.json"), JSON.stringify({ commit }));
