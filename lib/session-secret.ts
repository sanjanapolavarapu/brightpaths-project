export function requireSessionSecret() {
  const secret = process.env.SESSION_SECRET?.trim() ?? "";
  if (secret.length < 16) {
    throw new Error("Set SESSION_SECRET to a long random string before starting the site.");
  }
  return secret;
}
