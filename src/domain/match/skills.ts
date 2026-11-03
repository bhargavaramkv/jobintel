/**
 * Skill vocabulary for matching. Each canonical skill lists the spellings that mean the SAME
 * thing (e.g. ASP.NET Core is part of .NET). Different languages are never merged:
 * JavaScript ≠ TypeScript, C# ≠ C++, Java ≠ Kotlin. Matching is deterministic and textual.
 */
export interface SkillDef {
  /** Display name. */
  name: string
  /** Lower-case aliases, matched on word boundaries. */
  aliases: string[]
  /** Optional custom pattern when aliases need case or context (e.g. "Go"). */
  pattern?: RegExp
}

const S = (name: string, aliases: string[] = [], pattern?: RegExp): SkillDef => ({
  name,
  aliases: [name.toLowerCase(), ...aliases],
  pattern,
})

export const SKILLS: readonly SkillDef[] = [
  // Languages
  S('C#', ['csharp', 'c sharp']),
  S('C++', ['cpp']),
  S('Java', [], /\bjava\b(?!\s*script)/i),
  S('Kotlin'),
  S('Scala'),
  S('Python'),
  S('Go', ['golang'], /\bgolang\b|\bGo\b(?![-\s]to\b)/),
  S('Rust'),
  S('Ruby'),
  S('PHP'),
  S('Swift', [], /\bSwift\b/),
  S('Objective-C', ['objective c', 'objc']),
  S('JavaScript', ['ecmascript', 'es6']),
  S('TypeScript'),
  S('Dart'),
  S('Elixir'),
  S('SQL', ['t-sql', 'tsql', 'pl/sql', 'plsql']),
  S('Bash', ['shell scripting', 'shell script']),
  S('PowerShell'),
  // .NET family (same platform, different spellings)
  S('.NET', ['dotnet', '.net core', 'asp.net', 'asp.net core', 'asp.net mvc', '.net framework', 'net core']),
  S('Entity Framework', ['ef core', 'entity framework core']),
  // Backend frameworks / runtimes
  S('Node.js', ['nodejs', 'node js']),
  S('Spring', ['spring boot', 'springboot', 'spring framework']),
  S('Django'),
  S('Flask'),
  S('FastAPI'),
  S('Rails', ['ruby on rails', 'ror']),
  S('Express', ['express.js', 'expressjs'], /\bExpress(\.js)?\b/),
  S('NestJS', ['nest.js']),
  S('gRPC'),
  S('GraphQL'),
  S('REST', ['rest api', 'rest apis', 'restful', 'restful api', 'restful apis'], /\bREST(ful)?\b/),
  S('Microservices', ['microservice', 'micro-services', 'micro services']),
  // Frontend
  S('React', ['react.js', 'reactjs']),
  S('Next.js', ['nextjs']),
  S('Angular', ['angularjs']),
  S('Vue', ['vue.js', 'vuejs']),
  S('Svelte'),
  S('Redux'),
  S('HTML', ['html5']),
  S('CSS', ['css3', 'scss', 'sass']),
  S('React Native'),
  S('Flutter'),
  S('Android'),
  S('iOS'),
  // Data stores
  S('PostgreSQL', ['postgres']),
  S('MySQL'),
  S('SQL Server', ['mssql', 'ms sql', 'microsoft sql server']),
  S('Oracle', ['oracle db']),
  S('MongoDB', ['mongo']),
  S('Redis'),
  S('Cassandra'),
  S('DynamoDB'),
  S('Elasticsearch', ['elastic search', 'opensearch']),
  S('Snowflake'),
  S('BigQuery'),
  // Messaging / data
  S('Kafka', ['apache kafka']),
  S('RabbitMQ'),
  S('Spark', ['apache spark', 'pyspark']),
  S('Airflow', ['apache airflow']),
  S('Hadoop'),
  S('Flink', ['apache flink']),
  S('dbt'),
  // Cloud / infra
  S('AWS', ['amazon web services']),
  S('Azure', ['microsoft azure']),
  S('GCP', ['google cloud', 'google cloud platform']),
  S('Docker'),
  S('Kubernetes', ['k8s', 'eks', 'aks', 'gke']),
  S('Terraform'),
  S('Ansible'),
  S('Helm'),
  S('Linux', ['unix']),
  S('CI/CD', ['ci cd', 'ci / cd', 'continuous integration', 'continuous delivery', 'continuous deployment']),
  S('Jenkins'),
  S('GitHub Actions'),
  S('Git'),
  S('Prometheus'),
  S('Grafana'),
  S('OpenTelemetry'),
  // ML / AI
  S('Machine Learning', ['ml', 'deep learning']),
  S('PyTorch'),
  S('TensorFlow'),
  S('LLM', ['llms', 'large language models', 'generative ai', 'genai']),
  // Practices
  S('System Design', ['distributed systems', 'scalable systems', 'high availability']),
  S('Data Structures', ['algorithms', 'data structures and algorithms', 'dsa']),
  S('Testing', ['unit testing', 'tdd', 'test automation', 'automated testing'], /\b(unit|integration|automated) test(s|ing)?\b/i),
  S('Selenium'),
  S('Playwright'),
]

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

/** Word-boundary-ish matcher that works for names like "C#", ".NET" and "Node.js". */
function aliasRegex(alias: string): RegExp {
  return new RegExp(`(?:^|[^a-z0-9#+.])${escape(alias)}(?=$|[^a-z0-9#+]|\\.(?![a-z0-9]))`, 'i')
}

const COMPILED = SKILLS.map((def) => ({
  def,
  tests: def.pattern ? [def.pattern, ...def.aliases.slice(1).map(aliasRegex)] : def.aliases.map(aliasRegex),
  /** Longer aliases of OTHER skills that contain this one ("sql server" shadows "sql", "react native" shadows "react"). */
  shadows: SKILLS.filter((o) => o !== def)
    .flatMap((o) => o.aliases)
    .filter((a) => def.aliases.some((mine) => a !== mine && a.includes(mine)))
    .map((a) => new RegExp(escape(a), 'gi')),
}))

const blank = (text: string, shadows: RegExp[]) => shadows.reduce((t, re) => t.replace(re, ' '), text)

const BY_ALIAS = new Map<string, SkillDef>()
for (const def of SKILLS) for (const a of def.aliases) BY_ALIAS.set(a, def)

/** Lower-cased, whitespace-collapsed key used to compare skill names. */
export const skillKey = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/**
 * Canonical name for a user-entered skill, e.g. "asp.net core" -> ".NET".
 * Unknown skills keep their own name and are matched literally.
 */
export function canonicalSkill(name: string): string {
  return BY_ALIAS.get(skillKey(name))?.name ?? name.trim()
}

/** Known skills mentioned in a piece of text, in vocabulary order. */
export function skillsIn(text: string): string[] {
  if (!text) return []
  return COMPILED.filter(({ tests, shadows }) => {
    const t = blank(text, shadows)
    return tests.some((re) => re.test(t))
  }).map(({ def }) => def.name)
}

/** Does the text mention this (possibly custom) skill? */
export function mentionsSkill(text: string, canonical: string): boolean {
  const known = COMPILED.find(({ def }) => def.name === canonical)
  if (known) {
    const t = blank(text, known.shadows)
    return known.tests.some((re) => re.test(t))
  }
  // Very short custom names ("C", "R") only match as a capitalised standalone token.
  if (canonical.trim().length <= 2) return new RegExp(`(?:^|[\\s,(/])${escape(canonical.trim())}(?=$|[\\s,)/])`).test(text)
  return aliasRegex(skillKey(canonical)).test(text)
}
