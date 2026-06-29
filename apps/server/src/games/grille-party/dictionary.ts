import frenchWords from 'an-array-of-french-words'

function normalize(word: string): string {
  return word
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/Œ/g, 'OE')
    .replace(/Æ/g, 'AE')
}

let dict: Set<string> | null = null

export function loadDictionary(): Set<string> {
  if (dict) return dict
  const words = frenchWords as string[]
  dict = new Set<string>()
  for (const w of words) {
    const norm = normalize(w)
    if (norm.length >= 3 && /^[A-Z]+$/.test(norm)) {
      dict.add(norm)
    }
  }
  console.log(`[dict] Loaded ${dict.size} French words`)
  return dict
}

export function isValidWord(word: string): boolean {
  if (!dict) loadDictionary()
  return dict!.has(normalize(word))
}

export { normalize }

// ─── Trie ─────────────────────────────────────────────────────────────────────

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
