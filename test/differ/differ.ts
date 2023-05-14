import { promises as fsp } from 'fs'

const PARENT_OF_THIS_FILE = '/differ/'
const ADAPTED_FROM_REGEX = /Adapted from ([^\s]+)/i
const BEGIN_UNCHANGED_LABEL = 'BEGIN UNCHANGED CODE'
const END_UNCHANGED_LABEL = 'END UNCHANGED CODE'

let differingCodeSegments = 0

;(async () => diffFiles())()

async function diffFiles(): Promise<void> {
  console.log()
  await diffSourceFiles()
  await diffTestFiles()
  if (differingCodeSegments > 0) {
    console.log(`${differingCodeSegments} differing code segments found`)
    process.exit(1)
  }
}

async function diffSourceFiles(): Promise<void> {
  for await (const path of iterateOverTypeScriptFiles('./src')) {
    const sourceText = await fsp.readFile(path, 'utf-8')
    const match = sourceText.match(ADAPTED_FROM_REGEX)
    if (match) {
      const url = createSourceTargetURL(match[1])
      const kyselyText = await loadFileFromURL(url)
      diffText(path, sourceText, kyselyText)
    }
  }
}

async function diffTestFiles(): Promise<void> {
  for await (const path of iterateOverTypeScriptFiles('./test')) {
    const testText = await fsp.readFile(path, 'utf-8')
    const url = createTestTargetURL(path)
    const kyselyText = await loadFileFromURL(url)
    diffText(path, testText, kyselyText)
  }
}

function createSourceTargetURL(url: string): string {
  const offset = url.lastIndexOf('/src/')
  if (offset < 0) {
    throw Error("URL doesn't contain '/src/'")
  }
  return createTargetURL(url.substring(offset + 1))
}

function createTestTargetURL(path: string): string {
  const offset = path.lastIndexOf('/test/')
  if (offset < 0) {
    throw Error("Path doesn't contain '/test/'")
  }
  return createTargetURL(path.substring(offset + 1))
}

function createTargetURL(path: string): string {
  return `https://raw.githubusercontent.com/kysely-org/kysely/master/${path}`
}

async function* iterateOverTypeScriptFiles(
  dir: string
): AsyncGenerator<string> {
  const files = await fsp.readdir(dir)
  for (const file of files) {
    const path = `${dir}/${file}`
    const stat = await fsp.stat(path)
    if (stat.isDirectory()) {
      yield* iterateOverTypeScriptFiles(path)
    } else if (file.endsWith('.ts') && !path.includes(PARENT_OF_THIS_FILE)) {
      yield path
    }
  }
}

async function loadFileFromURL(url: string): Promise<string> {
  const response = await fetch(url)
  return await response.text()
}

function diffText(path: string, sourceText: string, kyselyText: string): void {
  const testOffset = path.indexOf('/test/')
  if (testOffset < 0) {
    path = path.substring(path.indexOf('/src/') + 1)
  } else {
    path = path.substring(testOffset + 1)
  }
  const sourceLines = sourceText.split('\n')
  const kyselyLines = kyselyText.split('\n')

  let nextUnchangedLineNum = findNextUnchangedLine(0, sourceLines)
  while (nextUnchangedLineNum >= 0) {
    const endOfUnchangedLines = findEndOfUnchangedLines(
      sourceLines,
      nextUnchangedLineNum
    )
    ++nextUnchangedLineNum
    const unchangedLines = sourceLines.slice(
      nextUnchangedLineNum,
      endOfUnchangedLines
    )
    console.log(
      `**** checking ${path} lines ${nextUnchangedLineNum} - ${endOfUnchangedLines}`
    )
    console.log('**** end unchanged lines', unchangedLines[endOfUnchangedLines])
    findAndShowDifferingLines(
      nextUnchangedLineNum,
      unchangedLines,
      kyselyLines,
      path
    )
    nextUnchangedLineNum = findNextUnchangedLine(
      endOfUnchangedLines + 1,
      sourceLines
    )
  }
}

function findNextUnchangedLine(
  staringLineIndex: number,
  lines: string[]
): number {
  for (let i = staringLineIndex; i < lines.length; ++i) {
    if (lines[i].includes(BEGIN_UNCHANGED_LABEL)) {
      return i
    }
  }
  return -1
}

function findEndOfUnchangedLines(lines: string[], index: number): number {
  for (let i = index; i < lines.length; ++i) {
    if (lines[i].includes(END_UNCHANGED_LABEL)) {
      console.log(`**** found end label at`, i)
      console.log(`  in line [${lines[i]}]`)
      return i
    }
  }
  throw Error(`Couldn't find matching ${END_UNCHANGED_LABEL} comment`)
}

function findAndShowDifferingLines(
  startingUnchangedLineNum: number,
  unchangedLines: string[],
  kyselyLines: string[],
  path: string
): void {
  const firstDifferingLineIndex = findFirstDifferingLine(
    unchangedLines,
    kyselyLines
  )
  console.log('**** firstDifferingLineIndex', firstDifferingLineIndex)
  if (firstDifferingLineIndex >= 0) {
    const differentLineIndex =
      startingUnchangedLineNum + firstDifferingLineIndex
    console.log(`[${path}]: code differs from Kysely source at line`)
    console.log(
      `${differentLineIndex + 1}: ${unchangedLines[differentLineIndex]}`
    )
    ++differingCodeSegments
    process.exit(1)
  }
}

function findFirstDifferingLine(
  unchangedLines: string[],
  kyselyLines: string[]
): number {
  let kyselyLineNum = 0
  while (kyselyLineNum < kyselyLines.length) {
    if (kyselyLines[kyselyLineNum] == unchangedLines[0]) {
      for (let i = 1; i < unchangedLines.length; ++i) {
        console.log('**** comparing:')
        console.log(unchangedLines[i])
        console.log(kyselyLines[kyselyLineNum + i])
        if (unchangedLines[i] !== kyselyLines[kyselyLineNum + i]) {
          console.log("**** they're different")
          return i
        }
      }
      return -1
    }
    ++kyselyLineNum
  }
  return 0
}
