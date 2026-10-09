"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useMessages } from "@/i18n/client";
import { PageHeader, useDocumentTitle } from "@/components/ui";

export function ProsePage({ page }: { page: "privacy" | "transparency" }) {
  const m = useMessages();
  const content = m[page];
  return (
    <article className="max-w-[68ch]">
      <PageHeader title={content.title} intro={"updated" in content ? content.updated : undefined} />
      {content.sections.map((section) => (
        <section key={section.heading} className="mt-8">
          <h2 className="mb-2 text-xl font-bold">{section.heading}</h2>
          <ul className="list-disc space-y-2 pl-5 marker:text-river">
            {section.body.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}

export function OfflineMessage() {
  const m = useMessages();
  useDocumentTitle(m.offlinePage.title);
  return (
    <div className="max-w-[60ch]">
      <PageHeader title={m.offlinePage.title} intro={m.offlinePage.body} />
      <Link href="/" className="btn-primary">
        {m.offlinePage.goHome}
      </Link>
    </div>
  );
}

const subscribeOnline = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

export function NotFoundMessage() {
  const m = useMessages();
  // Offline, the service worker serves the offline page for unsaved pages, but the
  // router then renders not-found. Show the offline message instead of a wrong "not found".
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  if (!online) return <OfflineMessage />;
  return (
    <div className="max-w-[60ch]">
      <PageHeader title={m.notFound.title} intro={m.notFound.body} />
      <Link href="/" className="btn-primary">
        {m.offlinePage.goHome}
      </Link>
    </div>
  );
}
