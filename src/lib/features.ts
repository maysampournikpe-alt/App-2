import type { LucideIcon } from "lucide-react";
import {
  Sparkles,
  Search,
  GraduationCap,
  MapPin,
  MessageCircle,
  BookOpen,
  StickyNote,
  FlaskConical,
  PenLine,
  Languages,
  Award,
  FileCheck,
  ClipboardCheck,
  ListChecks,
  ScrollText,
  Route,
  CalendarDays,
  NotebookPen,
  Timer,
  Target,
  Calculator,
  Trophy,
  PiggyBank,
  HeartPulse,
  Users,
  UserRound,
  Settings,
} from "lucide-react";
import type { Messages } from "@/i18n";

// Single source of truth for navigation. A tab or tool only appears anywhere
// (menu, search, bottom bar, home) when `built` is true.

export type GroupId = keyof Messages["groups"];
export type TabId = keyof Messages["tabs"];
export type ToolId = keyof Messages["tools"];

export type Tool = {
  id: ToolId;
  href: string;
  icon: LucideIcon;
  built: boolean;
  /** Extra search words, in every supported language. */
  keywords: string[];
};

export type Tab = {
  id: TabId;
  group: GroupId;
  href: string;
  icon: LucideIcon;
  built: boolean;
  tools: Tool[];
  keywords: string[];
};

export const groupOrder: GroupId[] = ["explore", "learn", "testPrep", "organize", "track", "grow", "me"];

export const allTabs: Tab[] = [
  { id: "forYou", group: "explore", href: "/for-you", icon: Sparkles, built: false, tools: [], keywords: [] },
  { id: "find", group: "explore", href: "/find", icon: Search, built: false, tools: [], keywords: [] },
  { id: "collegeCareer", group: "explore", href: "/college-career", icon: GraduationCap, built: false, tools: [], keywords: [] },
  { id: "local", group: "explore", href: "/local", icon: MapPin, built: false, tools: [], keywords: [] },

  { id: "coach", group: "learn", href: "/coach", icon: MessageCircle, built: false, tools: [], keywords: [] },
  { id: "study", group: "learn", href: "/study", icon: BookOpen, built: false, tools: [], keywords: [] },
  { id: "notes", group: "learn", href: "/notes", icon: StickyNote, built: false, tools: [], keywords: [] },
  { id: "mathScience", group: "learn", href: "/math-science", icon: FlaskConical, built: false, tools: [], keywords: [] },
  { id: "readingWriting", group: "learn", href: "/reading-writing", icon: PenLine, built: false, tools: [], keywords: [] },
  { id: "languages", group: "learn", href: "/languages", icon: Languages, built: false, tools: [], keywords: [] },

  { id: "ap", group: "testPrep", href: "/ap", icon: Award, built: false, tools: [], keywords: [] },
  { id: "sat", group: "testPrep", href: "/sat", icon: FileCheck, built: false, tools: [], keywords: [] },
  { id: "psat", group: "testPrep", href: "/psat", icon: ClipboardCheck, built: false, tools: [], keywords: [] },
  { id: "act", group: "testPrep", href: "/act", icon: ListChecks, built: false, tools: [], keywords: [] },
  { id: "tsi", group: "testPrep", href: "/tsi", icon: ScrollText, built: false, tools: [], keywords: [] },

  { id: "plan", group: "organize", href: "/plan", icon: Route, built: false, tools: [], keywords: [] },
  { id: "calendar", group: "organize", href: "/calendar", icon: CalendarDays, built: false, tools: [], keywords: [] },
  {
    id: "homework",
    group: "organize",
    href: "/homework",
    icon: NotebookPen,
    built: true,
    keywords: ["assignments", "tareas", "deberes"],
    tools: [
      {
        id: "homeworkTracker",
        href: "/homework/tracker",
        icon: NotebookPen,
        built: true,
        keywords: ["assignment", "due", "tarea", "entrega", "to do"],
      },
      {
        id: "backwardPlanner",
        href: "/homework/backward-planner",
        icon: Route,
        built: true,
        keywords: ["project", "deadline", "proyecto", "fecha límite", "steps", "pasos"],
      },
    ],
  },
  {
    id: "focus",
    group: "organize",
    href: "/focus",
    icon: Timer,
    built: true,
    keywords: ["study", "estudiar", "concentrarse"],
    tools: [
      {
        id: "pomodoro",
        href: "/focus/pomodoro",
        icon: Timer,
        built: true,
        keywords: ["timer", "temporizador", "cronómetro", "study timer"],
      },
    ],
  },
  { id: "habits", group: "organize", href: "/habits", icon: Target, built: false, tools: [], keywords: [] },

  {
    id: "grades",
    group: "track",
    href: "/grades",
    icon: Calculator,
    built: true,
    keywords: ["notas", "calificaciones", "report card"],
    tools: [
      {
        id: "gpa",
        href: "/grades/gpa",
        icon: Calculator,
        built: true,
        keywords: ["gpa", "promedio", "grade point average", "weighted", "ponderado"],
      },
      {
        id: "finalGrade",
        href: "/grades/final",
        icon: ClipboardCheck,
        built: true,
        keywords: ["final", "exam", "examen", "what do I need", "qué necesito"],
      },
    ],
  },
  { id: "achievements", group: "track", href: "/achievements", icon: Trophy, built: false, tools: [], keywords: [] },
  { id: "money", group: "track", href: "/money", icon: PiggyBank, built: false, tools: [], keywords: [] },

  { id: "wellbeing", group: "grow", href: "/wellbeing", icon: HeartPulse, built: false, tools: [], keywords: [] },
  { id: "people", group: "grow", href: "/people", icon: Users, built: false, tools: [], keywords: [] },

  { id: "profile", group: "me", href: "/me", icon: UserRound, built: false, tools: [], keywords: [] },
  {
    id: "settings",
    group: "me",
    href: "/settings",
    icon: Settings,
    built: true,
    keywords: ["ajustes", "configuración", "language", "idioma", "dark mode", "modo oscuro", "accessibility"],
    tools: [],
  },
];

export const builtTabs: Tab[] = allTabs
  .filter((t) => t.built)
  .map((t) => ({ ...t, tools: t.tools.filter((tool) => tool.built) }));

export function getTab(id: TabId): Tab | undefined {
  return builtTabs.find((t) => t.id === id);
}

export function tabForPath(pathname: string): Tab | undefined {
  return builtTabs.find((t) => pathname === t.href || pathname.startsWith(t.href + "/"));
}

export function toolForPath(pathname: string): Tool | undefined {
  for (const tab of builtTabs) {
    const tool = tab.tools.find((t) => t.href === pathname);
    if (tool) return tool;
  }
  return undefined;
}

/** Default phone bottom bar, used until the student picks their own. */
export const defaultBottomBar: TabId[] = ["homework", "focus", "grades", "settings"];
export const BOTTOM_BAR_MAX = 5;

/** Lowercase, accent-free text for forgiving search ("calificacion" finds "calificación"). */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}
