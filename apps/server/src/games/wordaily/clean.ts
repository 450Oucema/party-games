import frenchWords from 'an-array-of-french-words'
import * as path from "node:path";
import * as fs from "node:fs";

const WORD_LENGTH = 5;

const getLetters = (word: string): string[] => {
    const result = [];
    const length = word.length;

    for (let i = 0; i < length; i++) {
        result.push(word[i]);
    }

    return result;
};

const hasDoubleLetters = (word: string) => {
    const wordLetters = getLetters(word);
    const currentLettersMap = new Map<string, number>();

    // Initialisation
    wordLetters.forEach((letter) => {
        if (currentLettersMap.has(letter)) {
            const newValue = currentLettersMap.get(letter) as number + 1;
            currentLettersMap.set(letter, newValue);
        } else {
            currentLettersMap.set(letter, 1);
        }
    });

    let hasMultiple = false;
    const doubleLetters: string[] = [];
    currentLettersMap.forEach((value, key) => {
        if (value > 1) {
            hasMultiple = true;
            doubleLetters.push(key);
        }
    });

    console.log(doubleLetters, hasMultiple);

    return hasMultiple;
};

function normalize(word: string): string {
    return word
        .toUpperCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/Œ/g, 'OE')
        .replace(/Æ/g, 'AE')
}

const data = frenchWords.filter((word, index) => {
    if (word.length !== WORD_LENGTH) return false;
    if (hasDoubleLetters(normalize(word))) return false;
    if (/^[A-Z]+$/.test(word)) return false;

    return true;
});

const normalizedData = data.map((word, index) => {
    return normalize(word);
})

fs.writeFileSync('./letters.json', JSON.stringify(normalizedData));
