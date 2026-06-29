/** Catalog of mock interview topics — stable keys for DB filters. */

/** Cap per mock — each topic needs score, rating, feedback + suggestions (long form). */
export const MOCK_TOPIC_MAX = 10;

/** Interviewer-only role-fit tags (optional; not shown to aspirants). Defined in UI — backend stores keys as sent. */
export const MOCK_ROLE_FIT_CATEGORIES = [
  {
    id: 'role_type',
    label: 'Role type',
    options: [
      { key: 'frontend', label: 'Frontend' },
      { key: 'backend', label: 'Backend' },
      { key: 'fullstack', label: 'Full stack' },
      { key: 'mobile', label: 'Mobile' },
      { key: 'devops', label: 'DevOps' },
      { key: 'testing', label: 'Testing / QA' },
      { key: 'data_engineering', label: 'Data engineering' },
      { key: 'data_science', label: 'Data science' },
      { key: 'aiml', label: 'AI / ML' },
      { key: 'dba', label: 'Database / DBA' },
      { key: 'cyber_security', label: 'Cyber security' },
      { key: 'cloud', label: 'Cloud engineer' },
      { key: 'sre', label: 'Site reliability (SRE)' },
      { key: 'embedded', label: 'Embedded systems' },
      { key: 'blockchain', label: 'Blockchain' },
      { key: 'game_dev', label: 'Game development' },
    ],
  },
  {
    id: 'frontend_stack',
    label: 'Frontend',
    options: [
      { key: 'react', label: 'React' },
      { key: 'angular', label: 'Angular' },
      { key: 'vue', label: 'Vue' },
      { key: 'nextjs', label: 'Next.js' },
      { key: 'javascript', label: 'JavaScript' },
      { key: 'typescript', label: 'TypeScript' },
      { key: 'html_css', label: 'HTML / CSS' },
      { key: 'svelte', label: 'Svelte' },
    ],
  },
  {
    id: 'backend_stack',
    label: 'Backend',
    options: [
      { key: 'nodejs', label: 'Node.js' },
      { key: 'java', label: 'Java' },
      { key: 'python', label: 'Python' },
      { key: 'dotnet', label: '.NET' },
      { key: 'go', label: 'Go' },
      { key: 'php', label: 'PHP' },
      { key: 'ruby', label: 'Ruby' },
      { key: 'spring', label: 'Spring Boot' },
      { key: 'django', label: 'Django' },
      { key: 'fastapi', label: 'FastAPI' },
      { key: 'express', label: 'Express.js' },
      { key: 'nestjs', label: 'NestJS' },
    ],
  },
  {
    id: 'mobile_stack',
    label: 'Mobile',
    options: [
      { key: 'android', label: 'Android' },
      { key: 'ios', label: 'iOS' },
      { key: 'flutter', label: 'Flutter' },
      { key: 'react_native', label: 'React Native' },
      { key: 'kotlin', label: 'Kotlin' },
      { key: 'swift', label: 'Swift' },
    ],
  },
  {
    id: 'testing_stack',
    label: 'Testing',
    options: [
      { key: 'manual_testing', label: 'Manual testing' },
      { key: 'automation_testing', label: 'Automation testing' },
      { key: 'selenium', label: 'Selenium' },
      { key: 'api_testing', label: 'API testing' },
      { key: 'performance_testing', label: 'Performance testing' },
      { key: 'cypress', label: 'Cypress' },
      { key: 'jest', label: 'Jest' },
    ],
  },
  {
    id: 'devops_stack',
    label: 'DevOps / Cloud',
    options: [
      { key: 'aws', label: 'AWS' },
      { key: 'azure', label: 'Azure' },
      { key: 'gcp', label: 'Google Cloud' },
      { key: 'docker', label: 'Docker' },
      { key: 'kubernetes', label: 'Kubernetes' },
      { key: 'cicd', label: 'CI/CD' },
      { key: 'terraform', label: 'Terraform' },
      { key: 'ansible', label: 'Ansible' },
      { key: 'linux', label: 'Linux admin' },
    ],
  },
  {
    id: 'data_stack',
    label: 'Data & BI',
    options: [
      { key: 'sql', label: 'SQL' },
      { key: 'spark', label: 'Apache Spark' },
      { key: 'power_bi', label: 'Power BI' },
      { key: 'tableau', label: 'Tableau' },
      { key: 'etl', label: 'ETL' },
      { key: 'hadoop', label: 'Hadoop' },
    ],
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    options: [
      { key: 'salesforce', label: 'Salesforce' },
      { key: 'sap', label: 'SAP' },
      { key: 'servicenow', label: 'ServiceNow' },
      { key: 'sharepoint', label: 'SharePoint' },
    ],
  },
];

export const MOCK_ROLE_FIT_OPTIONS = MOCK_ROLE_FIT_CATEGORIES.flatMap((cat) =>
  cat.options.map((opt) => ({ ...opt, category: cat.id, categoryLabel: cat.label })),
).sort((a, b) => a.label.localeCompare(b.label));

const roleFitByKey = new Map(MOCK_ROLE_FIT_OPTIONS.map((o) => [o.key, o]));

export function getMockRoleFitLabel(key) {
  return roleFitByKey.get(key)?.label ?? key;
}

export const MOCK_RATING_OPTIONS = [
  { value: 'good', label: 'Good', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { value: 'average', label: 'Average', className: 'bg-amber-100 text-amber-900 border-amber-200' },
  { value: 'needs_work', label: 'Needs work', className: 'bg-red-100 text-red-800 border-red-200' },
];

export const MOCK_TOPIC_CATEGORIES = [
  {
    id: 'frontend',
    label: 'Frontend',
    topics: [
      { key: 'react', label: 'React' },
      { key: 'angular', label: 'Angular' },
      { key: 'vue', label: 'Vue' },
      { key: 'javascript', label: 'JavaScript' },
      { key: 'html_css', label: 'HTML / CSS' },
    ],
  },
  {
    id: 'backend',
    label: 'Backend',
    topics: [
      { key: 'nodejs', label: 'Node.js' },
      { key: 'java', label: 'Java' },
      { key: 'python', label: 'Python' },
      { key: 'apis', label: 'APIs / REST' },
      { key: 'microservices', label: 'Microservices' },
    ],
  },
  {
    id: 'data',
    label: 'Data',
    topics: [
      { key: 'sql', label: 'SQL' },
      { key: 'database', label: 'Database design' },
    ],
  },
  {
    id: 'devops',
    label: 'DevOps / Cloud',
    topics: [
      { key: 'devops', label: 'DevOps' },
      { key: 'aws', label: 'AWS / Cloud' },
      { key: 'docker', label: 'Docker' },
      { key: 'kubernetes', label: 'Kubernetes' },
      { key: 'cicd', label: 'CI/CD' },
    ],
  },
  {
    id: 'security',
    label: 'Security',
    topics: [
      { key: 'cyber_security', label: 'Cyber security' },
      { key: 'networking', label: 'Networking' },
    ],
  },
  {
    id: 'aiml',
    label: 'AI / ML',
    topics: [
      { key: 'machine_learning', label: 'Machine Learning' },
      { key: 'deep_learning', label: 'Deep Learning' },
      { key: 'nlp', label: 'NLP' },
      { key: 'computer_vision', label: 'Computer Vision' },
      { key: 'gen_ai', label: 'Gen AI / LLMs' },
      { key: 'mlops', label: 'MLOps' },
      { key: 'data_science', label: 'Data Science' },
    ],
  },
  {
    id: 'other_tech',
    label: 'Other tech',
    topics: [
      { key: 'dsa', label: 'DSA' },
      { key: 'problem_solving', label: 'Problem solving' },
      { key: 'system_design', label: 'System design' },
      { key: 'mobile', label: 'Mobile' },
    ],
  },
  {
    id: 'soft_skills',
    label: 'HR / Soft skills',
    topics: [
      { key: 'hr', label: 'HR interview' },
      { key: 'behavioral', label: 'Behavioral' },
      { key: 'communication', label: 'Communication' },
      { key: 'aptitude', label: 'Aptitude' },
    ],
  },
];

/** Shown near the start of the topic picker (stable keys). */
export const MOCK_TOPIC_PICKER_PINNED = ['problem_solving'];

/** Flat catalog for the feedback form — pinned topics inserted after the first two chips. */
export function getMockTopicsForPicker() {
  const all = MOCK_TOPIC_CATEGORIES.flatMap((cat) =>
    cat.topics.map((topic) => ({ ...topic, category: cat.id })),
  );
  const pinnedSet = new Set(MOCK_TOPIC_PICKER_PINNED);
  const pinned = MOCK_TOPIC_PICKER_PINNED.map((key) => all.find((t) => t.key === key)).filter(Boolean);
  const rest = all.filter((t) => !pinnedSet.has(t.key));
  const head = rest.slice(0, 2);
  const tail = rest.slice(2);
  return [...head, ...pinned, ...tail];
}

/** Older mocks may still use these keys — keep for labels + admin filters. */
export const MOCK_TOPIC_LEGACY_OPTIONS = [{ key: 'ai_ml', label: 'AI / ML (legacy)', category: 'aiml', categoryLabel: 'AI / ML' }];

export const MOCK_TOPIC_FILTER_OPTIONS = [
  ...MOCK_TOPIC_CATEGORIES.flatMap((cat) =>
    cat.topics.map((t) => ({ ...t, category: cat.id, categoryLabel: cat.label })),
  ),
  ...MOCK_TOPIC_LEGACY_OPTIONS,
].sort((a, b) => a.label.localeCompare(b.label));

const topicByKey = new Map(
  MOCK_TOPIC_FILTER_OPTIONS.map((t) => [t.key, t]),
);

export function getMockTopicDef(key) {
  return topicByKey.get(key) ?? null;
}

export function getMockTopicLabel(key, fallbackLabel) {
  return getMockTopicDef(key)?.label ?? fallbackLabel ?? key;
}

export function slugifyTopicKey(label) {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
}

export function makeCustomTopicKey(label) {
  const slug = slugifyTopicKey(label);
  return slug ? `custom_${slug}` : `custom_${Date.now()}`;
}

export function getMockRatingLabel(rating) {
  return MOCK_RATING_OPTIONS.find((o) => o.value === rating)?.label ?? rating ?? '—';
}

export function getMockRatingClass(rating) {
  return MOCK_RATING_OPTIONS.find((o) => o.value === rating)?.className ?? 'bg-slate-100 text-slate-700 border-slate-200';
}
