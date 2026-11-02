#!/usr/bin/env node
// Post-build guard: fail if the static output contains anything that looks like a
// secret or token, or references a third-party origin at runtime.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DIST = new URL('../dist/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

const SECRET_PATTERNS = [
  [/gh[pousr]_[A-Za-z0-9]{30,}/, 'GitHub token'],
  [/github_pat_[A-Za-z0-9_]{20,}/, 'GitHub fine-grained token'],
  [/sk-ant-[A-Za-z0-9-_]{10,}/, 'Anthropic API key'],
  [/sk-[A-Za-z0-9]{32,}/, 'API secret key'],
  [/AKIA[0-9A-Z]{16}/, 'AWS access key'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'Private key'],
]

// Runtime network beacons we never want shipped.
const TRACKER_PATTERNS = [
  [/googletagmanager\.com|google-analytics\.com/, 'Google Analytics'],
  [/plausible\.io|segment\.(io|com)|mixpanel\.com|hotjar\.com/, 'Analytics service'],
]

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) yield* walk(p)
    else yield p
  }
}

let failures = 0
let files = 0
for (const file of walk(DIST)) {
  if (!/\.(html|js|css|json|txt|svg|map)$/.test(file)) continue
  files++
  const text = readFileSync(file, 'utf8')
  // data/*.json is third-party job posting text: scan it for secrets, but not for
  // tracker names or mojibake that a company may legitimately have written.
  const isData = /[\\/]data[\\/]/.test(file)
  for (const [re, label] of isData ? SECRET_PATTERNS : [...SECRET_PATTERNS, ...TRACKER_PATTERNS]) {
    if (re.test(text)) {
      console.error(`✖ ${label} pattern found in ${file}`)
      failures++
    }
  }
  // UTF-8 text that was decoded as Windows-1252 and re-saved (e.g. "â€¦", "Â·").
  if (!isData && /â€|Â[·°©®]/.test(text)) {
    console.error(`✖ Mis-encoded (mojibake) characters in ${file}`)
    failures++
  }
  if (isData && /"(primarySkills|professionalSummary|displayName|noticePeriod|compensation)"/.test(text)) {
    console.error(`✖ Candidate profile field found in public data: ${file}`)
    failures++
  }
  if (file.endsWith('.map')) {
    console.error(`✖ Source map shipped: ${file}`)
    failures++
  }
}

if (failures) {
  console.error(`\n${failures} problem(s) found in dist/.`)
  process.exit(1)
}
console.log(`✓ dist/ check passed (${files} files scanned: no secrets, trackers or source maps).`)
