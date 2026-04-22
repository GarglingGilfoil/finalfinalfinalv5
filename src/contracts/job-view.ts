export interface JobRecommendation {
  id: string;
  title: string;
  companyName: string;
  location: string;
  datePostedLabel: string;
  employmentType: string;
  salaryLabel: string;
}

export interface JobViewData {
  id: string;
  title: string;
  companyName: string;
  location: string;
  datePostedLabel: string;
  employmentType: string;
  salaryLabel: string;
  seniorityLevel: string;
  experienceRangeLabel: string;
  skills: string[];
  industries: string[];
  jobDescriptionHtml: string;
  companyDescriptionHtml: string;
  companyCoverImageUrl: string | null;
  companyLogoUrl: string | null;
  companyUrl: string | null;
  applyUrl: string;
  recommendedJobs: JobRecommendation[] | null;
}
