import { KNOWLEDGE_BASE, type KnowledgeEntry } from "@/lib/assistant/knowledge";

const ALEF_REGEX = /[\u0622\u0623\u0625\u0671]/g;
const YAH_REGEX = /[\u0649]/g;
const TAA_MARBUTA_REGEX = /[\u0629]/g;
const DIACRITICS_REGEX =
  /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

export function normalizeArabic(input: string): string {
  return input
    .toLowerCase()
    .replace(DIACRITICS_REGEX, "")
    .replace(ALEF_REGEX, "ا")
    .replace(YAH_REGEX, "ي")
    .replace(TAA_MARBUTA_REGEX, "ه")
    .replace(/[^a-z\u0600-\u06FF0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const AFFIXES = ["ال", "و", "ف", "ب", "ك", "ل"];

export function stripArabicAffixes(input: string): string {
  let out = input;
  for (let i = 0; i < 3; i++) {
    const hit = AFFIXES.find(
      (a) => out.startsWith(a) && out.length - a.length >= 3,
    );
    if (!hit) break;
    out = out.slice(hit.length);
  }
  return out;
}

function stem(text: string): string {
  return stripArabicAffixes(normalizeArabic(text));
}

export type AssistantMatch = {
  entry: KnowledgeEntry;
  score: number;
};

const STOPWORDS = new Set([
  "في",
  "من",
  "على",
  "عن",
  "انا",
  "ما",
  "هل",
  "كيف",
  "ماهي",
  "ماهو",
  "ما هي",
  "ال",
  "و",
  "او",
  "ب",
  "مع",
  "هذه",
  "ذلك",
  "شلون",
  "شو",
  "وين",
  "اين",
  "اريد",
  "ابغى",
  "بغيت",
  "كيزي",
  "السلام",
  "الرجاء",
  "منشن",
  "لي",
  "في",
  "اعمل",
  "اجعل",
]);

function tokens(normalized: string): string[] {
  return normalized.split(/\s+/).filter(Boolean);
}

const TITLE_INDEX = (() => {
  const idx = new Map<string, number>();
  for (const entry of KNOWLEDGE_BASE) {
    const seen = new Set<string>();
    for (const tk of tokens(normalizeArabic(entry.title)).map(stem)) {
      if (tk.length < 3 || STOPWORDS.has(tk) || seen.has(tk)) continue;
      seen.add(tk);
      idx.set(tk, (idx.get(tk) ?? 0) + 1);
    }
  }
  return idx;
})();

const ENTRY_COUNT = KNOWLEDGE_BASE.length;

export function bestMatches(query: string, limit = 3): AssistantMatch[] {
  const nq = normalizeArabic(query);
  const qTokens = tokens(nq);
  const qStems = qTokens.map(stem);
  const qPairs = new Set<string>();
  for (let i = 0; i < qTokens.length - 1; i++) {
    qPairs.add(`${qTokens[i]} ${qTokens[i + 1]}`);
  }

  const seen = new Set<string>();
  const scored: AssistantMatch[] = [];

  for (const entry of KNOWLEDGE_BASE) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);

    const entryText = normalizeArabic(
      `${entry.title} ${entry.answer} ${entry.keywords.join(" ")}`,
    ).toLowerCase();
    const kwStems = entry.keywords.map((k) => stem(k)).filter(Boolean);
    const titleStemTokens = tokens(normalizeArabic(entry.title))
      .map(stem)
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t));

    let tokenScore = 0;
    let phraseScore = 0;

    const matchedTokens = new Set<string>();
    for (let i = 0; i < qTokens.length; i++) {
      const raw = qTokens[i];
      const st = qStems[i];
      if (STOPWORDS.has(raw) || st.length < 3) continue;

      let hit = entryText.includes(raw);
      let strong = false;
      for (const kw of kwStems) {
        if (
          kw === st ||
          kw.startsWith(st) ||
          st.startsWith(kw) ||
          (st.length >= 3 && kw.includes(st))
        ) {
          hit = true;
          strong = true;
          break;
        }
      }
      if (!hit) {
        const peak = entryText.search(st);
        if (peak >= 0) hit = true;
      }
      if (hit) {
        tokenScore += strong ? 2 : 1;
        matchedTokens.add(st);
      }
    }

    for (const pair of qPairs) {
      if (normalizeArabic(entry.title).includes(pair)) phraseScore += 4;
    }
    for (const kw of kwStems) {
      if (kw.length >= 5 && nq.includes(kw)) phraseScore += 4;
    }

    let titleScore = 0;
    for (const tt of titleStemTokens) {
      if (matchedTokens.has(tt)) {
        const freq = TITLE_INDEX.get(tt) ?? 1;
        const idf = 1 + Math.log(Math.max(1, ENTRY_COUNT / freq));
        titleScore += 3 * idf;
      }
    }

    const score = tokenScore + phraseScore + titleScore;
    if (score > 0) scored.push({ entry, score });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function hasMeaningfulQuery(query: string): boolean {
  const nq = normalizeArabic(query);
  return tokens(nq).some((t) => t.length >= 3 && !STOPWORDS.has(t));
}

export function isGreeting(query: string): boolean {
  const nq = normalizeArabic(query);
  return /^(اهلا|السلام|مرحبا|هلا|صباح|مساء|سلام)/u.test(nq);
}

export function isThanks(query: string): boolean {
  const nq = normalizeArabic(query);
  return /(شكرا|مشكور|بارك الله)/u.test(nq);
}

export function isHelp(query: string): boolean {
  const nq = normalizeArabic(query);
  return /(مساعدة|ساعدني|كيف استخدم|دليل|شرح)/u.test(nq);
}

export type Suggestion = { label: string; query: string };

export const GENERAL_SUGGESTIONS: Suggestion[] = [
  { label: "ما هو سهل؟", query: "ما هو سهل" },
  { label: "وضع المعاينة", query: "ما هو وضع المعاينة" },
  { label: "كيف أضيف موظف؟", query: "كيف أضيف موظفا جديدا" },
  { label: "ربط تيليجرام", query: "كيف أربط تيليجرام" },
  { label: "تحميل التطبيقات", query: "تحميل التطبيقات" },
  { label: "تتبع الطلبات", query: "كيف أتابع الطلبات" },
];

export const OPS_SUGGESTIONS: Suggestion[] = [
  { label: "إدارة المخزون", query: "كيف أضيف مادة للمخزون" },
  { label: "الوصفات والتكلفة", query: "كيف أعرف تكلفة الطبق" },
  { label: "جرد المخزون", query: "كيف أعمل جرد للمخزون" },
  { label: "الموردون", query: "أين أجد الموردين" },
  { label: "تقارير الأرباح", query: "كيف أطبع تقرير الأرباح" },
  { label: "أداء الموظفين", query: "أداء الموظفين" },
];

export function suggestionsFor(pathname: string): Suggestion[] {
  if (pathname.startsWith("/ops")) return OPS_SUGGESTIONS;
  return GENERAL_SUGGESTIONS;
}

export function greetingReply(): string {
  return "أهلاً! أنا مساعد سهل الذكي، على دراية كاملة بنظام إدارة المطاعم وأقسامه كافة.\nاسألني عن أي شاشة أو ميزة أو طريقة عمل — مثلاً: «كيف أضيف موظفاً؟» أو «ما هو وضع المعاينة؟»";
}

export function thanksReply(): string {
  return "على الرحب والسعة! إن احتجت أي مساعدة أخرى فإني هنا. 😊";
}

export function noAnswerReply(scores: AssistantMatch[]): string {
  if (scores.length === 0) {
    return "لم أجد جواباً محدداً في معرفتي بالنظام عن هذا السؤال.\nجرب صياغة أبسط، أو اسألني عن: وضع المعاينة، الطلبات، المخزون، الموظفين، تيليجرام، أو إعدادات التوصيل.";
  }
  const top = scores[0];
  return `أعتقد أنك تقصد: «${top.entry.title}».\n\n${top.entry.answer}`;
}

export function confidenceOf(scores: AssistantMatch[]): number {
  if (scores.length === 0) return 0;
  const top = scores[0].score;
  const second = scores[1]?.score ?? 0;
  if (top >= 12 && top >= second * 1.7) return 1;
  if (top >= 6) return 0.7;
  if (top >= 2) return 0.35;
  return 0;
}
