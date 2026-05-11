import type { JobViewData } from "../contracts/job-view";
import { referenceJobView } from "../config/reference-job";

const jobIndex = new Map<string, JobViewData>([[referenceJobView.id, referenceJobView]]);

interface PrototypeSearchJobTemplate {
  companyLogoUrl: string | null;
  companyName: string;
  experienceRangeLabel: string;
  employmentType: string;
  industries: string[];
  location: string;
  salaryLabel: string;
  seniorityLevel: string;
  skills: string[];
  title: string;
}

const prototypeSearchJobTemplates = new Map<string, PrototypeSearchJobTemplate>(
  [
    {
      companyLogoUrl: "/company/capitec-bank-logo.jpg",
      companyName: "Capitec",
      experienceRangeLabel: "3 years - 5 years",
      employmentType: "Permanent",
      industries: ["Financial Services", "Banking", "Software Development"],
      location: "Cape Town, South Africa",
      salaryLabel: "Market Related",
      seniorityLevel: "Mid / Senior",
      skills: ["React", "TypeScript", "APIs", "Testing", "Design Systems"],
      title: "Senior React Engineer"
    },
    {
      companyLogoUrl: null,
      companyName: "Takealot",
      experienceRangeLabel: "4 years - 6 years",
      employmentType: "Permanent",
      industries: ["Retail", "E-commerce", "Software Development"],
      location: "Cape Town, South Africa",
      salaryLabel: "Market Related",
      seniorityLevel: "Senior",
      skills: ["React", "Next.js", "JavaScript", "Performance", "UX Collaboration"],
      title: "Senior Frontend Developer"
    },
    {
      companyLogoUrl: null,
      companyName: "Discovery",
      experienceRangeLabel: "3 years - 5 years",
      employmentType: "Permanent",
      industries: ["Healthcare", "Financial Services", "Software Development"],
      location: "Johannesburg, South Africa",
      salaryLabel: "Market Related",
      seniorityLevel: "Mid / Senior",
      skills: ["React", "TypeScript", "REST APIs", "Accessibility", "Component Design"],
      title: "Product Engineer"
    },
    {
      companyLogoUrl: null,
      companyName: "Sanlam",
      experienceRangeLabel: "5 years - 7 years",
      employmentType: "Permanent",
      industries: ["Financial Services", "Insurance", "Software Development"],
      location: "Bellville, South Africa",
      salaryLabel: "Market Related",
      seniorityLevel: "Senior",
      skills: ["React", "JavaScript", "Frontend Architecture", "Testing", "APIs"],
      title: "Web Application Developer"
    },
    {
      companyLogoUrl: null,
      companyName: "Amazon",
      experienceRangeLabel: "5 years - 8 years",
      employmentType: "Permanent",
      industries: ["Software Development", "Cloud Infrastructure", "Developer Tools"],
      location: "Remote",
      salaryLabel: "Market Related",
      seniorityLevel: "Senior",
      skills: ["React", "TypeScript", "Frontend Architecture", "Performance", "Tooling"],
      title: "Frontend Platform Engineer"
    },
    {
      companyLogoUrl: null,
      companyName: "Deloitte",
      experienceRangeLabel: "4 years - 6 years",
      employmentType: "Contract",
      industries: ["Consulting", "Enterprise Software", "Financial Services"],
      location: "Johannesburg, South Africa",
      salaryLabel: "Market Related",
      seniorityLevel: "Intermediate / Senior",
      skills: ["React", "Node.js", "TypeScript", "APIs", "Cloud"],
      title: "Full Stack Developer"
    },
    {
      companyLogoUrl: null,
      companyName: "ShopriteX",
      experienceRangeLabel: "3 years - 5 years",
      employmentType: "Permanent",
      industries: ["Retail", "Digital Products", "Software Development"],
      location: "Cape Town, South Africa",
      salaryLabel: "Market Related",
      seniorityLevel: "Mid / Senior",
      skills: ["React", "Design Systems", "CSS", "JavaScript", "Performance"],
      title: "UI Engineer"
    },
    {
      companyLogoUrl: null,
      companyName: "DataTech Recruitment",
      experienceRangeLabel: "2 years - 4 years",
      employmentType: "Contract",
      industries: ["Recruitment", "Data Platforms", "Software Development"],
      location: "Durban, South Africa",
      salaryLabel: "Market Related",
      seniorityLevel: "Intermediate",
      skills: ["JavaScript", "React", "HTML", "CSS", "APIs"],
      title: "JavaScript Developer"
    },
    {
      companyLogoUrl: null,
      companyName: "Parvana",
      experienceRangeLabel: "3 years - 6 years",
      employmentType: "Permanent",
      industries: ["Software Development", "Mobile Apps", "Product Engineering"],
      location: "Remote",
      salaryLabel: "Market Related",
      seniorityLevel: "Senior",
      skills: ["React Native", "React", "TypeScript", "Mobile UI", "APIs"],
      title: "React Native Developer"
    },
    {
      companyLogoUrl: null,
      companyName: "Ditto Hire",
      experienceRangeLabel: "4 years - 7 years",
      employmentType: "Permanent",
      industries: ["Software Development", "Recruitment", "Artificial Intelligence"],
      location: "Cape Town, South Africa",
      salaryLabel: "Market Related",
      seniorityLevel: "Senior",
      skills: ["React", "TypeScript", "Product Engineering", "AI Workflows", "Testing"],
      title: "Software Engineer"
    }
  ].map((job) => [
    job.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    job
  ])
);

const prototypeSearchJobAliases = new Map<string, string>([
  ["capitec-senior-react-engineer", "senior-react-engineer"],
  ["takealot-frontend-developer", "senior-frontend-developer"],
  ["discovery-product-engineer", "product-engineer"],
  ["sanlam-web-application-developer", "web-application-developer"],
  ["amazon-frontend-platform-engineer", "frontend-platform-engineer"],
  ["deloitte-full-stack-developer", "full-stack-developer"],
  ["shopritex-ui-engineer", "ui-engineer"],
  ["datatech-javascript-developer", "javascript-developer"],
  ["parvana-react-native-developer", "react-native-developer"],
  ["ditto-software-engineer", "software-engineer"]
]);

function resolvePrototypeSearchJob(jobId: string): JobViewData | null {
  const match = jobId.match(/^search-(.+)-(\d+)$/);

  if (!match?.[1]) {
    return null;
  }

  const templateKey = prototypeSearchJobAliases.get(match[1]);
  const template = templateKey ? prototypeSearchJobTemplates.get(templateKey) : null;

  if (!template) {
    return null;
  }

  // Prototype compatibility: search results can deep-link to stable mock IDs while
  // reusing the richer reference job body until the real job detail API is connected.
  return {
    ...referenceJobView,
    id: jobId,
    title: template.title,
    companyName: template.companyName,
    location: template.location,
    employmentType: template.employmentType,
    salaryLabel: template.salaryLabel,
    seniorityLevel: template.seniorityLevel,
    experienceRangeLabel: template.experienceRangeLabel,
    skills: template.skills,
    industries: template.industries,
    companyLogoUrl: template.companyLogoUrl,
    applyUrl: `https://www.ditto.jobs/application?job_id=${encodeURIComponent(jobId)}`,
    recommendedJobs: null
  };
}

export function readJobView(jobId: string): JobViewData | null {
  return jobIndex.get(jobId) ?? resolvePrototypeSearchJob(jobId);
}

export async function getJobView(jobId: string): Promise<JobViewData | null> {
  return readJobView(jobId);
}
