/**
 * Build / import Lichess puzzles.
 *
 * Default: small curated pack via the rate-limited batch API.
 * Full dump (https://database.lichess.org/#puzzles):
 *   npm run puzzles:download -- --full
 *
 * Optional:
 *   --limit 50000     cap how many rows to import (0 = entire dump)
 *   --seed 3000       how many to write into public/data/lichess-puzzles.json
 *   --skip-db         only write the local JSON seed
 *   --reuse-zst       skip re-download if tmp/lichess_db_puzzle.csv.zst exists
 */
import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Chess } from 'chess.js'
import thresholds from '../src/lib/analysis/phaseThresholds.json' with { type: 'json' }
import themeMaps from '../src/lib/puzzles/lichessThemeMaps.json' with { type: 'json' }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(ROOT, 'public', 'data')
const OUT_FILE = path.join(OUT_DIR, 'lichess-puzzles.json')
const TMP_DIR = path.join(ROOT, 'tmp')
const TMP_ZST = path.join(TMP_DIR, 'lichess_db_puzzle.csv.zst')
const CSV_URL = 'https://database.lichess.org/lichess_db_puzzle.csv.zst'
const UA = 'leak/1.0 (personal chess analysis)'

const ANGLES = themeMaps.angles
const LICHESS_TO_MOTIF = themeMaps.toMotif

function argValue(flag, fallback) {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return fallback
  const next = process.argv[idx + 1]
  if (!next || next.startsWith('--')) return fallback
  return next
}

function hasFlag(flag) {
  return process.argv.includes(flag)
}

async function loadEnvFiles() {
  for (const name of ['.env.local', '.env']) {
    try {
      const text = await readFile(path.join(ROOT, name), 'utf8')
      for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim()
        if (!line || line.startsWith('#')) continue
        const eq = line.indexOf('=')
        if (eq <= 0) continue
        const key = line.slice(0, eq).trim()
        let value = line.slice(eq + 1).trim()
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1)
        }
        if (process.env[key] == null || process.env[key] === '') {
          process.env[key] = value
        }
      }
    } catch {
      // optional
    }
  }
}

function motifFromThemes(themes) {
  for (const theme of themes) {
    if (LICHESS_TO_MOTIF[theme]) return LICHESS_TO_MOTIF[theme]
  }
  return null
}

function phaseFromFen(fen) {
  const moveNumber = Number(fen.split(' ')[5] ?? '1') || 1
  if (moveNumber <= thresholds.openingMoveMax) return 'opening'
  const placement = fen.split(' ')[0] ?? ''
  let score = 0
  for (const ch of placement) {
    const lower = ch.toLowerCase()
    if (lower === 'q') score += 9
    else if (lower === 'r') score += 5
    else if (lower === 'b' || lower === 'n') score += 3
  }
  return score <= thresholds.endgameNonPawnMax ? 'endgame' : 'middlegame'
}

function phaseFromThemes(themes, fen) {
  if (themes.includes('opening')) return 'opening'
  if (themes.includes('endgame') || themes.some((t) => String(t).endsWith('Endgame'))) {
    return 'endgame'
  }
  if (themes.includes('middlegame')) return 'middlegame'
  return phaseFromFen(fen)
}

function normalizeApiPuzzle(raw) {
  if (!raw?.game?.pgn || !raw?.puzzle?.solution?.length) return null
  try {
    const full = new Chess()
    full.loadPgn(raw.game.pgn)
    const moves = full.history({ verbose: true })
    const ply = raw.puzzle.initialPly ?? moves.length - 1
    const setup = new Chess()
    for (let i = 0; i <= ply && i < moves.length; i++) setup.move(moves[i])
    const fen = setup.fen()
    const themes = raw.puzzle.themes ?? []
    return {
      id: `lichess:${raw.puzzle.id}`,
      source: 'lichess',
      rating: raw.puzzle.rating ?? null,
      fen,
      solution: raw.puzzle.solution,
      themes,
      phase: phaseFromThemes(themes, fen),
      motif: motifFromThemes(themes),
      color: fen.split(' ')[1] === 'b' ? 'black' : 'white',
      url: `https://lichess.org/training/${raw.puzzle.id}`,
    }
  } catch {
    return null
  }
}

async function fetchBatch(angle, nb = 30) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(
      `https://lichess.org/api/puzzle/batch/${encodeURIComponent(angle)}?nb=${nb}`,
      { headers: { Accept: 'application/json', 'User-Agent': UA } },
    )
    if (response.status === 429) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
      continue
    }
    if (!response.ok) throw new Error(`Lichess batch ${angle}: ${response.status}`)
    const data = await response.json()
    return data.puzzles ?? []
  }
  throw new Error(`Lichess batch ${angle}: rate limited`)
}

async function buildFromApi() {
  const merged = new Map()
  for (const angle of ANGLES) {
    process.stdout.write(`Fetching Lichess angle ${angle}… `)
    try {
      const rows = await fetchBatch(angle, 40)
      let added = 0
      for (const row of rows) {
        const puzzle = normalizeApiPuzzle(row)
        if (!puzzle || merged.has(puzzle.id)) continue
        merged.set(puzzle.id, puzzle)
        added += 1
      }
      console.log(`${added} new`)
    } catch (error) {
      console.log(`failed (${error instanceof Error ? error.message : error})`)
    }
    await new Promise((r) => setTimeout(r, 1200))
  }
  return [...merged.values()]
}

function parseCsvLine(line) {
  // Lichess puzzle CSV fields do not contain commas inside quoted FEN/moves.
  return line.split(',')
}

function normalizeCsvRow(cols, idx) {
  const fen0 = cols[idx.FEN]
  const moves = (cols[idx.Moves] ?? '').trim().split(/\s+/).filter(Boolean)
  if (!fen0 || moves.length < 2) return null
  const themes = (cols[idx.Themes] ?? '').split(/\s+/).filter(Boolean)
  try {
    const board = new Chess(fen0)
    const setup = moves[0]
    const played = board.move({
      from: setup.slice(0, 2),
      to: setup.slice(2, 4),
      promotion: setup[4] ?? 'q',
    })
    if (!played) return null
    const fen = board.fen()
    return {
      id: `lichess:${cols[idx.PuzzleId]}`,
      source: 'lichess',
      rating: Number(cols[idx.Rating]) || null,
      fen,
      solution: moves.slice(1),
      themes,
      phase: phaseFromThemes(themes, fen),
      motif: motifFromThemes(themes),
      color: fen.split(' ')[1] === 'b' ? 'black' : 'white',
      url: cols[idx.GameUrl] || `https://lichess.org/training/${cols[idx.PuzzleId]}`,
    }
  } catch {
    return null
  }
}

function toRow(puzzle) {
  return {
    id: puzzle.id,
    source: puzzle.source,
    rating: puzzle.rating,
    fen: puzzle.fen,
    solution: puzzle.solution,
    themes: puzzle.themes,
    phase: puzzle.phase,
    motif: puzzle.motif,
    color: puzzle.color,
    url: puzzle.url,
  }
}

async function ensureDumpDownloaded(reuse) {
  mkdirSync(TMP_DIR, { recursive: true })
  if (reuse && existsSync(TMP_ZST) && statSync(TMP_ZST).size > 1_000_000) {
    console.log(`Reusing ${TMP_ZST} (${(statSync(TMP_ZST).size / 1e6).toFixed(1)} MB)`)
    return
  }
  console.log(`Downloading full Lichess puzzle dump (~290 MB)…\n  ${CSV_URL}`)
  const response = await fetch(CSV_URL, { headers: { 'User-Agent': UA } })
  if (!response.ok || !response.body) throw new Error(`Download failed: ${response.status}`)
  const total = Number(response.headers.get('content-length') || 0)
  let received = 0
  const file = createWriteStream(TMP_ZST)
  const reader = response.body.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    received += value.byteLength
    file.write(Buffer.from(value))
    if (total) {
      const pct = ((received / total) * 100).toFixed(1)
      process.stdout.write(`\rDownloaded ${(received / 1e6).toFixed(1)} / ${(total / 1e6).toFixed(1)} MB (${pct}%)`)
    } else {
      process.stdout.write(`\rDownloaded ${(received / 1e6).toFixed(1)} MB`)
    }
  }
  await new Promise((resolve, reject) => {
    file.end(() => resolve())
    file.on('error', reject)
  })
  console.log('\nDownload complete.')
}

function openDecompressedCsvLines() {
  const py = `
import io, sys, subprocess
try:
    import zstandard as zstd
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "zstandard", "-q"])
    import zstandard as zstd
path = sys.argv[1]
dctx = zstd.ZstdDecompressor(max_window_size=2**31)
with open(path, "rb") as fh, dctx.stream_reader(fh) as reader:
    for line in io.TextIOWrapper(reader, encoding="utf-8", newline=""):
        sys.stdout.write(line)
`
  const child = spawn('python', ['-c', py, TMP_ZST], {
    stdio: ['ignore', 'pipe', 'inherit'],
    windowsHide: true,
  })
  child.on('error', (error) => {
    console.error('Failed to start Python for zstd streaming:', error)
  })
  return {
    lines: createInterface({ input: child.stdout, crlfDelay: Infinity }),
    child,
  }
}

async function createSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function flushBatch(supabase, batch, totals) {
  if (!supabase || batch.length === 0) return
  const { error } = await supabase.from('puzzles').upsert(batch.map(toRow), { onConflict: 'id' })
  if (error) throw error
  totals.upserted += batch.length
  batch.length = 0
}

async function importFullDump({ limit, seedSize, skipDb }) {
  await ensureDumpDownloaded(hasFlag('--reuse-zst'))
  const supabase = skipDb ? null : await createSupabase()
  if (!skipDb && !supabase) {
    console.log('No SUPABASE_SERVICE_ROLE_KEY — will only write the local JSON seed.')
  } else if (supabase) {
    console.log('Streaming dump → Supabase (service role). This can take a while…')
  }

  const { lines, child } = openDecompressedCsvLines()
  let header = null
  let idx = null
  let scanned = 0
  let kept = 0
  let skipped = 0
  const batch = []
  const seed = []
  const totals = { upserted: 0 }
  const BATCH = 400

  for await (const line of lines) {
    if (!header) {
      header = parseCsvLine(line)
      idx = Object.fromEntries(header.map((name, i) => [name, i]))
      if (idx.PuzzleId == null || idx.FEN == null || idx.Moves == null) {
        child.kill()
        throw new Error(`Unexpected CSV header: ${header.join(',')}`)
      }
      continue
    }
    if (!line) continue
    scanned += 1
    const puzzle = normalizeCsvRow(parseCsvLine(line), idx)
    if (!puzzle) {
      skipped += 1
      continue
    }
    kept += 1
    if (seed.length < seedSize) seed.push(puzzle)
    if (supabase) {
      batch.push(puzzle)
      if (batch.length >= BATCH) await flushBatch(supabase, batch, totals)
    }
    if (kept % 2000 === 0) {
      process.stdout.write(
        `\rScanned ${scanned.toLocaleString()} · kept ${kept.toLocaleString()} · upserted ${totals.upserted.toLocaleString()}`,
      )
    }
    if (limit > 0 && kept >= limit) break
  }

  await flushBatch(supabase, batch, totals)
  child.kill()
  console.log(
    `\nDone. scanned=${scanned.toLocaleString()} kept=${kept.toLocaleString()} skipped=${skipped.toLocaleString()} upserted=${totals.upserted.toLocaleString()}`,
  )
  return seed
}

async function writeSeed(puzzles, source) {
  mkdirSync(OUT_DIR, { recursive: true })
  await writeFile(
    OUT_FILE,
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      source,
      count: puzzles.length,
      note:
        source === CSV_URL
          ? 'Offline seed sampled from the public Lichess puzzle dump. Full catalog lives in Supabase.'
          : 'Curated Lichess pack via batch API. Re-run with --full to import the whole dump into Supabase.',
      puzzles,
    }),
  )
  console.log(`Wrote seed ${puzzles.length} puzzles → ${OUT_FILE}`)
}

async function main() {
  await loadEnvFiles()
  const full = hasFlag('--full')
  const skipDb = hasFlag('--skip-db')
  const limit = Math.max(0, Number(argValue('--limit', '0')) || 0)
  const seedSize = Math.max(0, Number(argValue('--seed', full ? '3000' : '0')) || (full ? 3000 : 0))

  if (full) {
    console.log(
      limit > 0
        ? `Importing up to ${limit.toLocaleString()} puzzles from the Lichess dump…`
        : 'Importing the ENTIRE Lichess puzzle dump (millions of rows)…',
    )
    const seed = await importFullDump({
      limit,
      seedSize: seedSize || 3000,
      skipDb,
    })
    await writeSeed(seed, CSV_URL)
    return
  }

  const puzzles = await buildFromApi()
  if (puzzles.length === 0) {
    throw new Error('No puzzles fetched — try again later (Lichess may be rate-limiting), or use --full.')
  }
  await writeSeed(puzzles, 'https://lichess.org/api/puzzle/batch/{angle}')

  if (skipDb) return
  const supabase = await createSupabase()
  if (!supabase) {
    console.log('Skip DB upsert (set VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).')
    return
  }
  const chunk = 200
  for (let i = 0; i < puzzles.length; i += chunk) {
    const slice = puzzles.slice(i, i + chunk).map(toRow)
    const { error } = await supabase.from('puzzles').upsert(slice, { onConflict: 'id' })
    if (error) throw error
    process.stdout.write(`\rUpserted ${Math.min(i + chunk, puzzles.length)}/${puzzles.length}`)
  }
  console.log('\nSupabase puzzles catalog updated.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
