// End-to-end: generate REAL PDFs with pdf-lib, then run the production pipeline
// (extract.ts -> parser.ts) over them. This tests pdf.js extraction, line
// reconstruction, page boundaries, and the parser together.

import { describe, it, expect } from 'vitest'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { extractPdfLines } from '../src/extract'
import { parseQuestions } from '../src/parser'

async function pdfFromPages(linesPerPage: string[][]): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (const lines of linesPerPage) {
    const page = doc.addPage([600, 800])
    let y = 760
    for (const line of lines) {
      page.drawText(line, { x: 50, y, size: 11, font, color: rgb(0, 0, 0) })
      y -= 18
    }
  }
  return doc.save()
}

describe('end-to-end PDF extraction', () => {
  it('extracts structured MCQs from a 2-page PDF with answer key', async () => {
    const page1 = [
      'PHYSICS QUIZ',
      '1. What is the capital of France?',
      'A. London',
      'B. Paris',
      'C. Berlin',
      'D. Madrid',
      '2. What is 2 + 2?',
      'A. 3',
      'B. 4',
      'C. 5',
      'D. 6',
      '3. Which planet is known as the Red Planet?',
      'A. Venus',
      'B. Mars',
      'C. Jupiter',
      'D. Saturn',
    ]
    const page2 = [
      'ANSWER KEY',
      '1. B',
      '2. B',
      '3. B',
    ]
    const bytes = await pdfFromPages([page1, page2])
    const { lines, pageCount, hasText } = await extractPdfLines(bytes)
    expect(pageCount).toBe(2)
    expect(hasText).toBe(true)

    const out = parseQuestions(lines)
    expect(out.questions).toHaveLength(3)
    expect(out.questions[0].text).toContain('capital of France')
    expect(out.questions[0].options.map((o) => o.key)).toEqual(['A', 'B', 'C', 'D'])
    expect(out.questions[1].correctAnswer).toBe('B')
    expect(out.questions[0].correctAnswer).toBe('B')
    expect(out.questions[2].correctAnswer).toBe('B')
    expect(out.questions[0].sourcePage).toBe(1)
  })

  it('PDF with no answer key -> questions with unknown answers, no guessing', async () => {
    const page1 = [
      '1. Question one?',
      'A. a', 'B. b', 'C. c', 'D. d',
      '2. Question two?',
      'A. a', 'B. b', 'C. c', 'D. d',
    ]
    const bytes = await pdfFromPages([page1])
    const { lines } = await extractPdfLines(bytes)
    const out = parseQuestions(lines)
    expect(out.questions).toHaveLength(2)
    for (const q of out.questions) expect(q.correctAnswer).toBeNull()
  })

  it('hundreds of questions: 250 questions -> 250 questions, in order', async () => {
    const lines: string[][] = []
    let page: string[] = ['MOCK EXAM - 250 QUESTIONS']
    for (let i = 1; i <= 250; i++) {
      if (page.length >= 40) { lines.push(page); page = [] }
      page.push(`${i}. Question number ${i}?`)
      page.push('A. Option A for this question')
      page.push('B. Option B for this question')
      page.push('C. Option C for this question')
      page.push('D. Option D for this question')
    }
    lines.push(page)
    const bytes = await pdfFromPages(lines)
    const { lines: extracted } = await extractPdfLines(bytes)
    const out = parseQuestions(extracted)
    expect(out.questions).toHaveLength(250)
    for (let i = 0; i < 250; i++) {
      expect(out.questions[i].originalNumber).toBe(i + 1)
      expect(out.questions[i].options).toHaveLength(4)
    }
  })

  it('inline "Ans: D" after each question is recognised', async () => {
    const page1 = [
      '1. First question?',
      'A. a', 'B. b', 'C. c', 'D. d',
      'Ans: D',
      '2. Second question?',
      'A. a', 'B. b', 'C. c', 'D. d',
      'Ans: A',
    ]
    const bytes = await pdfFromPages([page1])
    const { lines } = await extractPdfLines(bytes)
    const out = parseQuestions(lines)
    expect(out.questions).toHaveLength(2)
    expect(out.questions[0].correctAnswer).toBe('D')
    expect(out.questions[1].correctAnswer).toBe('A')
  })

  it('question split across a page boundary stays one question', async () => {
    const page1 = [
      '7. A dataset has values 2, 4 and 6. What is the variance?',
      'A. 0',
      'B. 1',
      'C. 2',
    ]
    const page2 = [
      'D. 4',
    ]
    const bytes = await pdfFromPages([page1, page2])
    const { lines } = await extractPdfLines(bytes)
    const out = parseQuestions(lines)
    expect(out.questions).toHaveLength(1)
    expect(out.questions[0].options).toHaveLength(4)
    expect(out.questions[0].sourcePage).toBe(1)
    expect(out.questions[0].sourcePageEnd).toBe(2)
  })

  it('scanned-style PDF (image-only) reports hasText=false', async () => {
    const doc = await PDFDocument.create()
    const page = doc.addPage([600, 800])
    // draw only graphics, no text
    page.drawRectangle({ x: 100, y: 100, width: 300, height: 200 })
    const bytes = await doc.save()
    const { hasText } = await extractPdfLines(bytes)
    expect(hasText).toBe(false)
  })

  it('stress: 400 questions + key block -> all keys applied', async () => {
    const pages: string[][] = []
    let page: string[] = ['400-QUESTION MOCK TEST']
    for (let i = 1; i <= 400; i++) {
      if (page.length >= 38) { pages.push(page); page = [] }
      page.push(`${i}. Question ${i} asks about topic ${i % 7}.`)
      page.push('A. First option text')
      page.push('B. Second option text')
      page.push('C. Third option text')
      page.push('D. Fourth option text')
    }
    const keyLines: string[] = ['ANSWER KEY']
    for (let i = 1; i <= 400; i += 4) {
      const chunk: string[] = []
      for (let j = i; j < Math.min(i + 4, 401); j++) {
        chunk.push(`${j}. ${'ABCD'[(j - 1) % 4]}`)
      }
      keyLines.push(chunk.join('    '))
    }
    pages.push(page) // final questions 393-400
    // paginate the key lines so no page overflow (fixture lines must stay >= y=0)
    for (let k = 0; k < keyLines.length; k += 40) {
      pages.push([])
      for (const l of keyLines.slice(k, k + 40)) pages[pages.length - 1].push(l)
    }
    const bytes = await pdfFromPages(pages)
    const { lines } = await extractPdfLines(bytes)
    const out = parseQuestions(lines)
    expect(out.questions).toHaveLength(400)
    const keyed = out.questions.filter((q) => q.correctAnswer != null)
    expect(keyed).toHaveLength(400)
    expect(out.questions[0].correctAnswer).toBe('A')
    expect(out.questions[1].correctAnswer).toBe('B')
    expect(out.questions[399].correctAnswer).toBe('D')
  })
})
