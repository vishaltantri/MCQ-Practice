import { describe, it, expect } from 'vitest'
import { parseQuestions } from '../src/parser'

const L = (page: number, text: string) => ({ page, text })

describe('parseQuestions', () => {
  it('standard numbered questions with options A-D, no key', () => {
    const out = parseQuestions([
      L(1, '1. What is the capital of France?'),
      L(1, 'A. London'),
      L(1, 'B. Paris'),
      L(1, 'C. Berlin'),
      L(1, 'D. Madrid'),
      L(1, '2. 2 + 2 equals:'),
      L(1, 'A. 3'),
      L(1, 'B. 4'),
      L(1, 'C. 5'),
      L(1, 'D. 6'),
    ])
    expect(out.questions).toHaveLength(2)
    expect(out.questions[0].text).toBe('What is the capital of France?')
    expect(out.questions[0].options.map((o) => `${o.key}=${o.text}`)).toEqual([
      'A=London', 'B=Paris', 'C=Berlin', 'D=Madrid',
    ])
    expect(out.questions[0].correctAnswer).toBeNull()
    expect(out.questions[1].originalNumber).toBe(2)
  })

  it('multi-line statements and options are merged', () => {
    const out = parseQuestions([
      L(1, '1. Which of the following best describes'),
      L(1, 'the entropy change of an isolated system?'),
      L(1, 'A. Always positive'),
      L(1, 'B. It never decreases'),
      L(1, 'C. Always negative'),
      L(2, 'D. Depends on temperature only'),
    ])
    expect(out.questions).toHaveLength(1)
    expect(out.questions[0].text).toBe('Which of the following best describes the entropy change of an isolated system?')
    expect(out.questions[0].options[1].text).toBe('It never decreases')
    expect(out.questions[0].sourcePage).toBe(1)
    expect(out.questions[0].sourcePageEnd).toBe(2)
  })

  it('page-break continuation keeps a single question', () => {
    const out = parseQuestions([
      L(3, '12. A body moves with constant acceleration. Which quantity'),
      L(3, 'A. Displacement'),
      L(3, 'B. Velocity'),
      L(4, 'C. Acceleration'),
      L(4, 'D. Jerk'),
    ])
    expect(out.questions).toHaveLength(1)
    expect(out.questions[0].originalNumber).toBe(12)
    expect(out.questions[0].options).toHaveLength(4)
    expect(out.questions[0].sourcePage).toBe(3)
    expect(out.questions[0].sourcePageEnd).toBe(4)
  })

  it('standalone "Ans: C" key line is picked up', () => {
    const out = parseQuestions([
      L(1, '1. Pick one:'),
      L(1, 'A. one'),
      L(1, 'B. two'),
      L(1, 'C. three'),
      L(1, 'D. four'),
      L(1, 'Ans: C'),
    ])
    expect(out.questions[0].correctAnswer).toBe('C')
  })

  it('inline ANSWER: B at end of option line is picked up', () => {
    const out = parseQuestions([
      L(1, '1. Pick one:'),
      L(1, 'A. one'),
      L(1, 'B. two ANSWER: B'),
      L(1, 'C. three'),
      L(1, 'D. four'),
    ])
    expect(out.questions[0].correctAnswer).toBe('B')
    expect(out.questions[0].options[1].text).toBe('two')
  })

  it('sentence mentioning "answer" is NOT treated as a key', () => {
    const out = parseQuestions([
      L(1, '1. Which statement about answers is true?'),
      L(1, 'A. The answer must be positive'),
      L(1, 'B. The answer can be negative in some cases'),
      L(1, 'C. Both A and B can be true'),
      L(1, 'D. None of the above'),
    ])
    expect(out.questions[0].correctAnswer).toBeNull()
  })

  it('end-of-document ANSWER KEY block maps keys by question number', () => {
    const lines = [
      L(1, '1. Capital of France?'),
      L(1, 'A. London'), L(1, 'B. Paris'), L(1, 'C. Berlin'), L(1, 'D. Madrid'),
      L(1, '2. 2 + 2?'),
      L(1, 'A. 3'), L(1, 'B. 4'), L(1, 'C. 5'), L(1, 'D. 6'),
      L(2, 'ANSWER KEY'),
      L(2, '1. B'),
      L(2, '2. B'),
    ]
    const out = parseQuestions(lines)
    expect(out.questions).toHaveLength(2)
    expect(out.questions[0].correctAnswer).toBe('B')
    expect(out.questions[1].correctAnswer).toBe('B')
  })

  it('key entry referencing non-extracted option is flagged, not guessed', () => {
    const lines = [
      L(1, '1. Question'),
      L(1, 'A. one'), L(1, 'B. two'),
      L(1, 'ANSWER KEY'),
      L(1, '1. E'),
    ]
    const out = parseQuestions(lines)
    expect(out.questions[0].correctAnswer).toBeNull()
    expect(out.questions[0].answerIssue).toBe('key-option-missing')
    expect(out.issues.some((i) => i.message.includes('option E'))).toBe(true)
  })

  it('"N. C" inline key entries after options attach to current question', () => {
    const out = parseQuestions([
      L(1, '1. Pick one:'),
      L(1, 'A. one'), L(1, 'B. two'), L(1, 'C. three'), L(1, 'D. four'),
      L(1, '2. C'),
    ])
    // 'Q2' isn't a real question - it was consumed as the key for Q1;
    // but then the next numbered question "2." below starts fresh.
    expect(out.questions).toHaveLength(1)
    expect(out.questions[0].correctAnswer).toBe('C')
  })

  it('fewer than 4 options works (A/B only)', () => {
    const out = parseQuestions([
      L(1, '5. True or false?'),
      L(1, 'A. True'),
      L(1, 'B. False'),
    ])
    expect(out.questions).toHaveLength(1)
    expect(out.questions[0].options).toHaveLength(2)
  })

  it('more than 4 options works (A-F)', () => {
    const out = parseQuestions([
      L(1, '1. Pick:'),
      L(1, 'A. 1') , L(1, 'B. 2'), L(1, 'C. 3'), L(1, 'D. 4'), L(1, 'E. 5'), L(1, 'F. 6'),
    ])
    expect(out.questions[0].options).toHaveLength(6)
  })

  it('prose before the first question is ignored', () => {
    const out = parseQuestions([
      L(1, 'PHYSICS FINAL EXAM - Section A'),
      L(1, 'Instructions: choose the best option.'),
      L(1, '1. Real question?'),
      L(1, 'A. one'), L(1, 'B. two'), L(1, 'C. three'), L(1, 'D. four'),
    ])
    expect(out.questions).toHaveLength(1)
    expect(out.questions[0].text).toBe('Real question?')
  })

  it('question numbers from the PDF are preserved (e.g. starting at 207)', () => {
    const out = parseQuestions([
      L(1, '207. Question?'),
      L(1, 'A. a'), L(1, 'B. b'), L(1, 'C. c'), L(1, 'D. d'),
    ])
    expect(out.questions[0].originalNumber).toBe(207)
  })

  it('key header with entries on the same line applies the key (docx style)', () => {
    const out = parseQuestions([
      L(1, '1. What is 2 + 2?'),
      L(1, 'A. 3'), L(1, 'B. 4'), L(1, 'C. 5'), L(1, 'D. 6'),
      L(1, '2. Which planet is red?'),
      L(1, 'A. Venus'), L(1, 'B. Mars'), L(1, 'C. Jupiter'), L(1, 'D. Saturn'),
      L(1, 'Answer KEY: 1. B  2. B'),
    ])
    expect(out.questions).toHaveLength(2)
    expect(out.questions[0].correctAnswer).toBe('B')
    expect(out.questions[1].correctAnswer).toBe('B')
  })
})
