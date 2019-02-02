require('@tensorflow/tfjs-node')
const tf = require('@tensorflow/tfjs')
const fs = require('fs')
const nj = require('numjs')

const numWords = 2000
const embedDim = 128
const batchSize = 32
const epochs = 2

/**
  * Since tf.js doesn't have a built in tokenizer, I had to write my own.
  * Very basic, but it seems to work well enough
  *
  * NB: I left out num_words from this class because we just use the
  * max feature length anyway, making it redundant
  */
class Tokenizer() {

  constructor() {
    this.vocabulary = []
  }

  fitOnTexts(texts) {
    const words = texts.reduce((acc, text) => [...acc,
      ...text.split(' ')], [])
    const uniqueWords = [... new Set(words)]
    this.vocabulary = uniqueWords.reduce((acc, word, idx) => ({
       ...acc, [word]: idx + 1}), {})
  }

  get wordIndex() {
    return this.vocabulary
  }

  textsToSequences(texts) {
    const words = texts.reduce((acc, text) => [...acc,
      ...text.split(' ')], [])
    return texts.map(text => text.split(' ').map(word =>
      this.vocabulary[word]))
  }

}

function readData(text) {
  const lines = text.split('\n')
  lines.shift()
  const xText = lines.map(line => line.split(',')[0])
  const yText = lines.map(line => line.split(',')[1])
  return { xText: xText, yText: yText }
}

/**
 *  Creates, trains and runs predictions on model
 */
async function create_model(text) {

  const { xText, yText } = readData(text)

  // create tokenizer
  const tokenizer = new Tokenizer()
  tokenizer.fitOnTexts(xText)

  // preprocess features
  const { xPad, featureLength } = preprocess_features(xText, tokenizer)
}

fs.readFile('dataset/data.csv', 'utf8', (error, data) => {
    if (error) throw error
    create_model(data.toString())
})
