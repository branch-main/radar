import type { Metadata } from "next";

import {
  paramValue,
  type SearchParams,
} from "@/app/dashboard/objetos-perdidos/_components/lost-found-ui";
import { getMatches } from "@/lib/supabase/dashboard";

import { MatchesView, type MatchPageState } from "./_components/matches-view";

export const metadata: Metadata = {
  title: "Matches",
};

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const matches = await getMatches();
  const legacyStatus = paramValue(params, "status", "all");
  const initialState: MatchPageState = {
    query: paramValue(params, "q"),
    tab: matchTab(paramValue(params, "tab", tabFromStatus(legacyStatus))),
    type: paramValue(params, "type", "all"),
    score: scoreFilter(paramValue(params, "score", "all")),
    sort: matchSort(paramValue(params, "sort", "score")),
    page: positiveInteger(paramValue(params, "page"), 1),
  };

  return <MatchesView initialMatches={matches} initialState={initialState} />;
}

const reviewStatuses = new Set(["suggested", "notified"]);
const discardedStatuses = new Set(["rejected", "expired"]);

function matchTab(value: string): MatchPageState["tab"] {
  if (value === "review" || value === "confirmed" || value === "discarded") return value;
  return "all";
}

function scoreFilter(value: string): MatchPageState["score"] {
  if (value === "90" || value === "75" || value === "50") return value;
  return "all";
}

function tabFromStatus(status: string): MatchPageState["tab"] {
  if (reviewStatuses.has(status)) return "review";
  if (status === "confirmed") return "confirmed";
  if (discardedStatuses.has(status)) return "discarded";
  return "all";
}

function matchSort(value: string): MatchPageState["sort"] {
  if (value === "recent" || value === "status" || value === "source") return value;
  return "score";
}

function positiveInteger(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
