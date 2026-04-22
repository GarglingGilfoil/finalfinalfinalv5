import type { JobViewData } from "../contracts/job-view";
import { referenceJobView } from "../config/reference-job";

const jobIndex = new Map<string, JobViewData>([[referenceJobView.id, referenceJobView]]);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function getJobView(jobId: string): Promise<JobViewData | null> {
  await delay(180);
  return jobIndex.get(jobId) ?? null;
}
