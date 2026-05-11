const SKILL_DATABASE = [
  "Accessibility",
  "Account Management",
  "Agile Delivery",
  "Analytics",
  "API Design",
  "API Integration",
  "AWS",
  "Azure",
  "Backend Development",
  "Business Analysis",
  "CI/CD",
  "Cloud Architecture",
  "Communication",
  "Component Design",
  "Content Design",
  "CSS",
  "Customer Success",
  "Cybersecurity",
  "Data Analysis",
  "Data Engineering",
  "Design Systems",
  "DevOps",
  "Docker",
  "E-commerce",
  "Figma",
  "Frontend Architecture",
  "Frontend Development",
  "Git",
  "Google Cloud",
  "GraphQL",
  "HTML",
  "Java",
  "JavaScript",
  "Jest",
  "Kubernetes",
  "Leadership",
  "Machine Learning",
  "Marketing Automation",
  "Mentoring",
  "Microservices",
  "Mobile UI",
  "Next.js",
  "Node.js",
  "Performance",
  "Playwright",
  "PostgreSQL",
  "Product Engineering",
  "Product Management",
  "Python",
  "React",
  "React Native",
  "REST APIs",
  "Ruby on Rails",
  "SaaS",
  "Salesforce",
  "Scrum",
  "SEO",
  "SQL",
  "Stakeholder Management",
  "Testing",
  "TypeScript",
  "UI Design",
  "UX Collaboration",
  "Vue.js"
];

function normalizeSkillLookupValue(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function searchSkills(
  query: string,
  excludedSkills: readonly string[] = [],
  limit = 8
): string[] {
  const normalizedQuery = normalizeSkillLookupValue(query);

  if (!normalizedQuery) {
    return [];
  }

  const excluded = new Set(excludedSkills.map(normalizeSkillLookupValue));

  return SKILL_DATABASE
    .filter((skill) => !excluded.has(normalizeSkillLookupValue(skill)))
    .filter((skill) => normalizeSkillLookupValue(skill).includes(normalizedQuery))
    .sort((a, b) => {
      const aValue = normalizeSkillLookupValue(a);
      const bValue = normalizeSkillLookupValue(b);
      const aStartsWith = aValue.startsWith(normalizedQuery);
      const bStartsWith = bValue.startsWith(normalizedQuery);

      if (aStartsWith !== bStartsWith) {
        return aStartsWith ? -1 : 1;
      }

      return a.localeCompare(b);
    })
    .slice(0, limit);
}
