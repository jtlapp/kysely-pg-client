/**
 * Tests the differencer utility. Runs `dist/differencer.js`, mocking fetch
 * URLs, capturing the error, and comparing to the expected output.
 */

import { expect } from 'chai'
import { exec } from 'child_process'
import { promises as fsp } from 'fs'
import { join } from 'path'

const DIFFERENCER_PATH = join(__dirname, './show-diffs.js')
const EXPECTED_OUTPUT_PATH = join(__dirname, '../expected-output.txt')

describe('show-diffs', () => {
  it('should produce the expected stderr output', async () => {
    const mockFilesDir = '../mock-kysely-files'
    const command = `node ${DIFFERENCER_PATH} --mock-files-dir=${mockFilesDir}`
    const stderr = await new Promise((resolve) => {
      exec(command, (err: any) => {
        resolve(
          err
            ? err.message.substring(err.message.indexOf('\n') + 1)
            : 'NO DIFFERENCES FOUND'
        )
      })
    })
    const expectedOutput = await fsp.readFile(EXPECTED_OUTPUT_PATH, 'utf-8')
    expect(stderr).to.equal(expectedOutput)
  })
})
