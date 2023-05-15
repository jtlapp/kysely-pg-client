import { promises as fsp } from 'fs'

const SOURCE_CODE_PATH = '/src'
const TEST_CODE_PATH = '/test/node'
const ADAPTED_FROM_REGEX = /Adapted from ([^\s]+)/i
const BEGIN_UNCHANGED_LABEL = 'BEGIN UNCHANGED CODE'
const END_UNCHANGED_LABEL = 'END UNCHANGED CODE'

let differingCodeSegments = 0

;(async () => diffFiles())()

async function diffFiles(): Promise<void> {
  await diffSourceFiles()
  await diffTestFiles()
  if (differingCodeSegments > 0) {
    console.log(`\n${differingCodeSegments} differing code segments found`)
    process.exit(1)
  }
}

async function diffSourceFiles(): Promise<void> {
  for await (const path of iterateOverTypeScriptFiles(`.${SOURCE_CODE_PATH}`)) {
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
  for await (const path of iterateOverTypeScriptFiles(`.${TEST_CODE_PATH}`)) {
    const testText = await fsp.readFile(path, 'utf-8')
    const url = createTestTargetURL(path)
    const kyselyText = await loadFileFromURL(url)
    diffText(path, testText, kyselyText)
  }
}

function createSourceTargetURL(url: string): string {
  const offset = url.lastIndexOf(`${SOURCE_CODE_PATH}/`)
  if (offset < 0) {
    throw Error(`URL doesn't contain ${SOURCE_CODE_PATH}`)
  }
  return createTargetURL(url.substring(offset + 1))
}

function createTestTargetURL(path: string): string {
  const offset = path.lastIndexOf(`${TEST_CODE_PATH}/`)
  if (offset < 0) {
    throw Error(`Path doesn't contain ${TEST_CODE_PATH}`)
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
    } else if (file.endsWith('.ts')) {
      yield path
    }
  }
}

async function loadFileFromURL(url: string): Promise<string> {
  const response = await fetch(url)
  return await response.text()
}

function diffText(path: string, sourceText: string, kyselyText: string): void {
  const testOffset = path.indexOf(`${TEST_CODE_PATH}/`)
  if (testOffset < 0) {
    path = path.substring(path.indexOf(`${SOURCE_CODE_PATH}/`) + 1)
  } else {
    path = path.substring(testOffset + 1)
  }
  const sourceLines = sourceText.split('\n')
  const kyselyLines = kyselyText.split('\n')

  let nextUnchangedLineIndex = findNextUnchangedLine(0, sourceLines)
  while (nextUnchangedLineIndex >= 0) {
    const endOfUnchangedLines = findEndOfUnchangedLines(
      sourceLines,
      nextUnchangedLineIndex++
    )
    const unchangedLines = sourceLines.slice(
      nextUnchangedLineIndex,
      endOfUnchangedLines
    )

    const firstDifferingLineIndex = findFirstDifferingLine(
      unchangedLines,
      kyselyLines
    )
    if (firstDifferingLineIndex >= 0) {
      console.log(`${path} differs from Kysely source at line:`)
      console.log(
        ` ${nextUnchangedLineIndex + firstDifferingLineIndex + 1}: ${
          unchangedLines[firstDifferingLineIndex]
        }`
      )
      ++differingCodeSegments
    }

    nextUnchangedLineIndex = findNextUnchangedLine(
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
      return i
    }
  }
  throw Error(`Couldn't find matching ${END_UNCHANGED_LABEL} comment`)
}

function findFirstDifferingLine(
  unchangedLines: string[],
  kyselyLines: string[]
): number {
  let lastDifferentLineIndex = 0
  let kyselyLineIndex = 0
  while (kyselyLineIndex < kyselyLines.length) {
    if (kyselyLines[kyselyLineIndex] == unchangedLines[0]) {
      let unchangedLineIndex = 1
      while (unchangedLineIndex < unchangedLines.length) {
        if (
          unchangedLines[unchangedLineIndex] !==
          kyselyLines[kyselyLineIndex + unchangedLineIndex]
        ) {
          lastDifferentLineIndex = unchangedLineIndex
          break
        }
        ++unchangedLineIndex
      }
      if (unchangedLineIndex == unchangedLines.length) {
        return -1
      }
    }
    ++kyselyLineIndex
  }
  return lastDifferentLineIndex
}
