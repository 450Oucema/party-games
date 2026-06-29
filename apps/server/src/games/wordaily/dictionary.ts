import classifiedWords from './data/words.classified.json'
import { randomInt } from 'node:crypto'
import type { WordDifficulty } from './types.js'
import { WORD_LENGTH } from './wordle.js'

type ClassifiedWord = {
  word: string
  difficulty: 'easy' | 'normal' | 'hard' | 'extreme'
  validity: 'common' | 'rare' | 'proper_noun' | 'abbreviation' | 'doubtful'
  reason: string
}

const classified = (classifiedWords as { words: ClassifiedWord[] }).words
const ACCEPTED_VALIDITIES = new Set<ClassifiedWord['validity']>(['common', 'rare'])

function isSolutionWord(entry: ClassifiedWord, difficulty: WordDifficulty): boolean {
  if (difficulty === 'mixed') {
    return entry.validity === 'common' && entry.difficulty !== 'extreme'
  }
  if (difficulty === 'easy' || difficulty === 'normal') {
    return entry.validity === 'common' && entry.difficulty === difficulty
  }
  return ACCEPTED_VALIDITIES.has(entry.validity) && entry.difficulty === difficulty
}

function normalize(word: string): string {
  return word
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/Œ/g, 'OE')
    .replace(/Æ/g, 'AE')
}

let dict: Set<string> | null = null
let solutionPools: Record<WordDifficulty, string[]> | null = null

export function loadDictionary(): Set<string> {
  if (dict) return dict
  dict = new Set<string>()
  solutionPools = {
    easy: [],
    normal: [],
    hard: [],
    extreme: [],
    mixed: [],
  }

  for (const entry of classified) {
    const norm = normalize(entry.word)
    if (norm.length === WORD_LENGTH && /^[A-Z]+$/.test(norm) && ACCEPTED_VALIDITIES.has(entry.validity)) {
      dict.add(norm)
    }
    for (const difficulty of Object.keys(solutionPools) as WordDifficulty[]) {
      if (norm.length === WORD_LENGTH && /^[A-Z]+$/.test(norm) && isSolutionWord(entry, difficulty)) {
        solutionPools[difficulty].push(norm)
      }
    }
  }

  for (const difficulty of Object.keys(solutionPools) as WordDifficulty[]) {
    solutionPools[difficulty] = [...new Set(solutionPools[difficulty])].sort()
  }

  console.log(`[dict] Loaded ${dict.size} accepted words`)
  return dict
}

export function isValidWord(word: string): boolean {
  if (!dict) loadDictionary()
  return dict!.has(normalize(word))
}

export { normalize }


export type TrieNode = {
  children: Record<string, TrieNode>
  isWord: boolean
}

let trie: TrieNode | null = null

export function getTrie(): TrieNode {
  if (trie) return trie
  if (!dict) loadDictionary()
  trie = { children: {}, isWord: false }
  for (const word of dict!) {
    let node = trie
    for (const ch of word) {
      if (!node.children[ch]) node.children[ch] = { children: {}, isWord: false }
      node = node.children[ch]
    }
    node.isWord = true
  }
  console.log('[dict] Trie built')
  return trie
}

export function randomWord(difficulty: WordDifficulty = 'mixed'): string {
  if (!solutionPools) loadDictionary()
  const pool = solutionPools?.[difficulty]?.length ? solutionPools[difficulty] : solutionPools?.mixed
  if (!pool?.length) throw new Error(`Dictionary has no solution words for ${difficulty}`)
  return pool[randomInt(pool.length)]
}

export function getAcceptedWords(): string[] {
  if (!dict) loadDictionary()
  return [...dict!]
}

export function getSolutionWords(difficulty: WordDifficulty = 'mixed'): string[] {
  if (!solutionPools) loadDictionary()
  return [...(solutionPools?.[difficulty] ?? [])]
}
