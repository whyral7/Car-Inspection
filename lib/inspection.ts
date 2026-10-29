import { checklistProgress } from "@/lib/checklist";
import { photoProgress, type PhotoProgress } from "@/lib/photos/angles";
import { conditionScore, scoreBand, type ScoreBand } from "@/lib/score";
import type { AiStatus, CarStatus, ChecklistResult, Severity } from "@/lib/supabase/database.types";

export type InspectionStep = "photos" | "findings" | "checklist" | "report";

export type InspectionInput = {
  status: CarStatus;
  photos: readonly { angle_key: string; ai_status: AiStatus }[];
  findings: readonly { severity: Severity; accepted: boolean }[];
  checklist: readonly { item_key: string; result: ChecklistResult }[];
};

export type InspectionState = {
  photos: PhotoProgress;
  /** AI notes the user hasn't accepted yet. */
  toReview: number;
  /** Every photo has been through the AI (an unclear photo counts: the user decides whether to retake). */
  analysed: boolean;
  findingsDone: boolean;
  checklist: { done: number; total: number; complete: boolean };
  /** The first unfinished step: where "Continue" goes. */
  next: InspectionStep;
  /** Number of steps finished, out of 4 (publishing is the 4th). */
  stepsDone: number;
  /**
   * The score only means something once the checklist has been started; before that it would read
   * 10.0 for a car nobody has checked. `provisional` until the inspection is finished.
   */
  score: { value: number; band: ScoreBand; provisional: boolean } | null;
};

export function inspectionState({ status, photos, findings, checklist }: InspectionInput): InspectionState {
  const photoState = photoProgress(photos.map((p) => p.angle_key));
  const toReview = findings.filter((f) => !f.accepted).length;
  const analysed = photoState.done > 0 && photos.every((p) => p.ai_status === "done" || p.ai_status === "unclear");
  const findingsDone = analysed && toReview === 0;
  const checklistState = checklistProgress(checklist.map((c) => c.item_key));
  const finished = status !== "draft";

  // Once the checklist is finished the report is next, even if a photo is still unchecked.
  const next: InspectionStep = finished ? "report" : !photoState.allRequiredDone ? "photos" : !findingsDone ? "findings" : "checklist";
  const stepsDone = [photoState.allRequiredDone, findingsDone, finished && checklistState.complete, status === "published"].filter(Boolean).length;

  const value = conditionScore({ findings, checklist });
  const score = checklistState.done > 0 || finished ? { value, band: scoreBand(value), provisional: !finished } : null;

  return { photos: photoState, toReview, analysed, findingsDone, checklist: checklistState, next, stepsDone, score };
}
