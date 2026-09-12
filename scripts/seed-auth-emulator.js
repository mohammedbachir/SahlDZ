#!/usr/bin/env node
/**
 * Seed Firebase Auth emulator with default users.
 * Run: node scripts/seed-auth-emulator.js
 */
import http from "node:http";

const USERS = [
  { email: "programmedesigners@gmail.com", password: "123456" },
  { email: "admin@sahldz.com", password: "123456" },
];

function createUser(email, password) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    });
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: 9099,
        path: `/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          if (res.statusCode === 200) {
            console.log(`  ✓ ${email}`);
            resolve(true);
          } else {
            const parsed = JSON.parse(body);
            if (parsed?.error?.message?.includes("EMAIL_EXISTS")) {
              console.log(`  - ${email} (exists)`);
              resolve(true);
            } else {
              console.log(`  ✗ ${email}: ${parsed?.error?.message || body}`);
              resolve(false);
            }
          }
        });
      },
    );
    req.on("error", (e) => {
      console.error(`  ✗ ${email}: ${e.message}`);
      resolve(false);
    });
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log("Seeding Auth emulator users...\n");
  for (const user of USERS) {
    await createUser(user.email, user.password);
  }
  console.log("\nDone.");
}

main();
