import type { JobViewData } from "../contracts/job-view";
import { referenceJobView } from "../config/reference-job";

const jobIndex = new Map<string, JobViewData>([[referenceJobView.id, referenceJobView]]);

export function readJobView(jobId: string): JobViewData | null {
  return jobIndex.get(jobId) ?? null;
}

export async function getJobView(jobId: string): Promise<JobViewData | null> {
  return readJobView(jobId);
}
