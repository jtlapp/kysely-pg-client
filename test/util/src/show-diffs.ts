import { promises as fsp } from 'fs'
import { join } from 'path'

import { BASE_KYSELY_RAW_URL } from './constants.js'

export const SOURCE_CODE_PATH = '/src'
export const TEST_CODE_PATH = '/test/node'

const ADAPTED_FROM_REGEX = /Adapted from ([^\s]+)/i
const BEGIN_UNCHANGED_LABEL = 'BEGIN UNCHANGED CODE'
const END_UNCHANGED_LABEL = 'END UNCHANGED CODE'

let mockFilesDir: string | null = null
let differingCodeSegments = 0

const MOCK_FILES_SWITCH = '--mock-files-dir='
if (process.argv.length > 2 && process.argv[2].startsWith(MOCK_FILES_SWITCH)) {
  mockFilesDir = join(
    __dirname,
    process.argv[2].substring(MOCK_FILES_SWITCH.length)
  )
}

async function diffFiles(): Promise<void> {
  await diffSourceFiles()
  await diffTestFiles()
  if (differingCodeSegments > 0) {
    console.error(`\n${differingCodeSegments} differing code segments found`)
    process.exit(1)
  }
}

async function diffSourceFiles(): Promise<void> {
  for await (const path of iterateOverTypeScriptFiles(`.${SOURCE_CODE_PATH}`)) {
    const localFileName = path.substring(path.lastIndexOf('/') + 1)
    const sourceText = await fsp.readFile(path, 'utf-8')
    const match = sourceText.match(ADAPTED_FROM_REGEX)
    if (match) {
      const url = createSourceTargetURL(match[1])
      const kyselyText = await loadFileFromURL(localFileName, url)
      diffText(path, sourceText, kyselyText)
    }
  }
}

async function diffTestFiles(): Promise<void> {
  for await (const path of iterateOverTypeScriptFiles(`.${TEST_CODE_PATH}`)) {
    const localFileName = path.substring(path.lastIndexOf('/') + 1)
    const testText = await fsp.readFile(path, 'utf-8')
    const url = createTestTargetURL(path)
    const kyselyText = await loadFileFromURL(localFileName, url)
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
  return BASE_KYSELY_RAW_URL + path
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
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      yield path
    }
  }
}

async function loadFileFromURL(
  localFileName: string,
  url: string
): Promise<string> {
  if (!mockFilesDir) {
    const response = await fetch(url)
    return await response.text()
  }

  const urlToLocalDir = {
    'src/dialect/postgres/postgres-': 'src/lib/postgres-client-',
    'src/util/': 'src/lib/utils/',
    'test/node/src/': 'test/node/src/',
  }
  const mockFileNames = await fsp.readdir(mockFilesDir)

  for (const mockFileName of mockFileNames) {
    const mockFilePath = join(mockFilesDir, mockFileName)
    if (mockFileName == localFileName) {
      return await fsp.readFile(mockFilePath, 'utf-8')
    }
  }
  const urlToLocal = Object.entries(urlToLocalDir).find(([key]) =>
    url.includes(key)
  )
  if (!urlToLocal) {
    throw Error(`No local path given for URL ${url}`)
  }
  const localFilePath = join(
    __dirname,
    '../../../',
    url
      .substring(url.indexOf(urlToLocal[0]))
      .replace(urlToLocal[0], urlToLocal[1])
  )
  return await fsp.readFile(localFilePath, 'utf-8')
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
      console.error(`${path}: differs from Kysely source`)
      console.error(
        `  ${nextUnchangedLineIndex + firstDifferingLineIndex + 1}: ${
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

;(async () => diffFiles())()
