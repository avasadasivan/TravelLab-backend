// Which websites may call this backend from a browser. Locally that's the
// Next.js dev server; in production, set FRONTEND_ORIGIN to the deployed site
// (comma-separate several, e.g. a custom domain plus the vercel.app one).
export function allowedOrigins(): string[] {
  return (process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

// Shared by REST (main.ts) and Socket.IO (the gateway). It reads the env on
// every request, so it works no matter when this file is imported.
export function checkOrigin(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) {
  // No Origin header means a server or curl, not a browser: CORS doesn't apply.
  callback(null, !origin || allowedOrigins().includes(origin));
}
