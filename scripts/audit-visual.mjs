#!/usr/bin/env node
/**
 * Auditoría visual mecánica. Sin dependencias: recorre el árbol con fs.
 *
 * Comprueba, en este orden:
 *   1. hex fuera de src/index.css
 *   2. `transition: all`
 *   3. transiciones sobre width/height/top/left
 *   4. hojas con :hover y sin :active
 *   5. contraste WCAG de los pares token-fondo/token-texto de src/index.css
 *
 * Sale con código 1 si hay hallazgos y los imprime como `archivo:línea: mensaje`.
 * La revisión con axe/Lighthouse no vive aquí: necesita navegador y servidor.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')
const TOKENS_FILE = join(SRC, 'index.css')
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage'])

const findings = []
const rel = (file) => relative(ROOT, file).replaceAll('\\', '/')

function walk(dir, filter) {
  const files = []
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) files.push(...walk(full, filter))
    else if (filter(full)) files.push(full)
  }
  return files
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length

/* 1-4: hojas de estilo */
const hexPattern = /#[0-9a-fA-F]{3,8}\b/g
const sheets = walk(SRC, (file) => extname(file) === '.css')

for (const file of sheets) {
  const text = readFileSync(file, 'utf8')
  const isModule = file.endsWith('.module.css')

  if (isModule) {
    for (const match of text.matchAll(hexPattern)) {
      findings.push(
        `${rel(file)}:${lineOf(text, match.index)}: hex suelto ${match[0]} (va en src/index.css)`,
      )
    }
  }

  for (const match of text.matchAll(/transition:\s*all\b/g)) {
    findings.push(
      `${rel(file)}:${lineOf(text, match.index)}: \`transition: all\` no declara qué cambia`,
    )
  }

  for (const match of text.matchAll(/transition:[^;}]*/g)) {
    if (/\b(width|height|top|left)\b/.test(match[0])) {
      findings.push(
        `${rel(file)}:${lineOf(text, match.index)}: transición sobre layout (${match[0]
          .replace(/\s+/g, ' ')
          .trim()}): usa transform`,
      )
    }
  }

  if (/:hover/.test(text) && !/:active/.test(text)) {
    findings.push(`${rel(file)}:1: tiene :hover y no tiene :active`)
  }
}

/* 5: contraste de los pares que la app usa */
const shade = (hex) => {
  let value = hex.replace('#', '')
  if (value.length === 3) value = value.split('').map((c) => c + c).join('')
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255)
}

const luminance = (hex) => {
  const [r, g, b] = shade(hex).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const PAIRS = [
  ['--color-text', '--color-bg'],
  ['--color-text', '--color-surface'],
  ['--color-text-soft', '--color-bg'],
  ['--color-muted-strong', '--color-bg'],
  ['--color-muted', '--color-bg'],
  ['--color-muted', '--color-surface'],
  ['--color-placeholder', '--color-bg'],
  ['--color-placeholder', '--color-surface'],
  ['--color-link', '--color-bg'],
  ['--color-link', '--color-surface'],
  ['--color-on-action', '--color-action'],
  ['--color-on-action', '--color-accent-fill'],
  ['--color-success-text', '--color-success-bg'],
  ['--color-warning-text', '--color-warning-bg'],
  ['--color-danger-text', '--color-danger-bg'],
  ['--color-info-text', '--color-info-bg'],
  /* Límites de control: WCAG 1.4.11 pide 3:1. */
  ['--color-field-border', '--color-bg', 3],
  ['--color-field-border', '--color-surface', 3],
]

const tokenSheet = readFileSync(TOKENS_FILE, 'utf8')
const darkStart = tokenSheet.indexOf('@media (prefers-color-scheme: dark)')
const sections = [
  ['claro', tokenSheet.slice(0, darkStart)],
  ['oscuro', tokenSheet.slice(darkStart)],
]

for (const [mode, section] of sections) {
  const tokens = new Map()
  for (const match of section.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8});/g)) {
    if (!tokens.has(match[1])) {
      tokens.set(match[1], { hex: match[2], line: lineOf(section, match.index) })
    }
  }

  for (const [fg, bg, min = 4.5] of PAIRS) {
    const foreground = tokens.get(fg)
    const background = tokens.get(bg)
    if (foreground === undefined || background === undefined) {
      findings.push(
        `${rel(TOKENS_FILE)}:1: falta el token ${foreground === undefined ? fg : bg} (${mode})`,
      )
      continue
    }
    const ratio = contrast(foreground.hex, background.hex)
    if (ratio < min) {
      findings.push(
        `${rel(TOKENS_FILE)}:${foreground.line}: ${mode}: ${fg} sobre ${bg} = ${ratio.toFixed(
          2,
        )}:1 (mínimo ${min}:1)`,
      )
    }
  }
}

if (findings.length > 0) {
  for (const finding of findings) console.error(finding)
  console.error(`\n${findings.length} hallazgo(s).`)
  process.exit(1)
}

console.log(
  `Sin hallazgos: ${sheets.length} hojas, ${PAIRS.length} pares de contraste en claro y oscuro.`,
)
