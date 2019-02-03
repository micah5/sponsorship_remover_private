require('@tensorflow/tfjs-node')
const tf = require('@tensorflow/tfjs')
global.fetch = require('node-fetch')
const fs = require('fs')
const nj = require('numjs')
const pb = require('progress')

const numWords = 2000
const embedDim = 128
const batchSize = 32
const epochs = 2

const bar = new pb(':elapseds [:bar] :busyWith...', {
  total: 9, width: 35
})

/**
  * Since tf.js doesn't have a built in tokenizer, I had to write my own.
  * Very basic, but it seems to work well enough
  *
  * NB: I left out num_words from this class because we just use the
  * max feature length anyway, making it redundant
  */
class Tokenizer {

  constructor() {
    this.vocabulary = []
  }

  fitOnTexts(texts) {
    bar.tick({
      'busyWith': 'Finding unique words'
    })
    const words = texts.reduce((acc, text) => [...acc,
      ...text.split(' ')], [])
    const uniqueWords = [... new Set(words)]
    bar.tick({
      'busyWith': 'Creating a word vocabulary'
    })
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

  /*get featureLength() {
    return Object.entries(this.vocabulary).length
  }*/

}

function readData(text) {
  const lines = text.split('\n')
  lines.shift()
  const xText = lines.map(line => line.split(',')[0])
  const yText = lines.map(line => line.split(',')[1])
  return { xText: xText, yText: yText }
}

function getFeatureLength(xTokens) {
  numTokens = nj.array(xTokens.map(tokens => tokens.length))
  avgTokens = numTokens.mean()/*numTokens.reduce((acc, tokenLength) =>
    acc + tokenLength)/numTokens.length*/
  return Math.ceil(avgTokens + 2 * numTokens.std())
}

/*
 * Pad pre, truncate post
 */
function padSequences(xTokens, maxLength) {
  if ((maxLength - xTokens) > 0)  {
    // pad
    return [...new Array(maxLength - xTokens.length).fill(0),
      ...xTokens]
  } else {
    return xTokens.slice(0, maxLength)
  }
}

/**
 *  Creates, trains and runs predictions on model
 */
async function create_model(text) {

  bar.tick({
    'busyWith': 'Loading Model'
  })
  const model = await tf.loadModel('file:///./output/js/model.json')

  bar.tick({
    'busyWith': 'Reading data'
  })
  const { xText, yText } = readData(text)

  // create tokenizer
  bar.tick({
    'busyWith': 'Initialising Tokenizer'
  })
  const tokenizer = new Tokenizer()
  bar.tick({
    'busyWith': 'Fitting text'
  })
  tokenizer.fitOnTexts(xText)

  // preprocess features
  bar.tick({
    'busyWith': 'Converting text to sequences'
  })
  const xTokens = tokenizer.textsToSequences(xText)
  const featureLength = getFeatureLength(xTokens)
  bar.tick({
    'busyWith': 'Padding/ truncating sequences'
  })
  const xPad = padSequences(xTokens, featureLength)

  bar.tick({
    'busyWith': 'Prediction'
  })
  xTest = ['dont forget to like share and subscribe',
           'i was thinking about my old model m keyboard',
           'check it out in the link in the description',
           'this is a review of the brand new television from samsung']
  const xTestTokens = tokenizer.textsToSequences(xTest)
  const xTestPad = padSequences(xTestTokens, featureLength)
  const prediction = model.predict(xTestPad)
  console.log(prediction)
}

fs.readFile('dataset/data.csv', 'utf8', (error, data) => {
    if (error) throw error
    create_model(data.toString())
})
