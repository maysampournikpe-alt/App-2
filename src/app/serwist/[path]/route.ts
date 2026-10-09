import { createSerwistRoute } from "@serwist/turbopack";

const revision = process.env.VERCEL_GIT_COMMIT_SHA ?? crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "src/app/sw.ts",
  // Pages listed here are saved for offline use as soon as the app is installed.
  additionalPrecacheEntries: [
    "/",
    "/~offline",
    "/grades",
    "/grades/gpa",
    "/grades/final",
    "/focus",
    "/focus/pomodoro",
    "/homework",
    "/homework/tracker",
    "/homework/backward-planner",
    "/settings",
    "/privacy",
    "/how-ai-works",
  ].map((url) => ({ url, revision })),
  useNativeEsbuild: true,
});
