require('@tensorflow/tfjs-node')
const tf = require('@tensorflow/tfjs')
global.fetch = require('node-fetch')
const fs = require('fs')
const nj = require('numjs')
const pb = require('progress')

var wordIndex = require('./output/misc/word_index.json');

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

  constructor(vocabulary) {
    this.vocabulary = vocabulary
    //this.sortedFrequencyWords = []
  }

  fitOnTexts(texts) {
    bar.tick({
      'busyWith': 'Finding unique words'
    })
    const words = texts.reduce((acc, text) => [...acc,
      ...text.split(' ')], [])
    console.log('words', words.length)

    const frequencyWords = {}
    for (let word of words) {
      if (!frequencyWords[word])
        frequencyWords[word] = 0
      frequencyWords[word] += 1
    }

    this.sortedFrequencyWords = []
    for (const key of Object.keys(frequencyWords)) {
      this.sortedFrequencyWords.push({
        word: key,
        count: frequencyWords[key]
      })
    }

    this.sortedFrequencyWords.sort((a, b) => b.count - a.count)
    const uniqueWords = this.sortedFrequencyWords.map(obj => obj.word)

    //const uniqueWords = [... new Set(words)]
    console.log('uniqueWords', uniqueWords.slice(0, 10))
    bar.tick({
      'busyWith': 'Creating a word vocabulary'
    })
    this.vocabulary = uniqueWords.reduce((acc, word, idx) => ({
       ...acc, [word]: idx + 1}), {})
    console.log('idk length', Object.keys(this.vocabulary).length)
  }

  get wordIndex() {
    return this.vocabulary
  }

  get topWords() {
    //return this.sortedFrequencyWords.slice(0, numWords).map(
    //  obj => obj.word)
    const topWords = []
    for (const [idx, key] of Object.keys(this.vocabulary).entries()) {
      if (idx >= numWords) break
      topWords.push(key)
    }
    console.log('LENGTH', topWords.length)
    return topWords
  }

  textsToSequences(texts) {
    const words = texts.reduce((acc, text) => [...acc,
      ...text.split(' ')], [])
    const topWords = this.topWords
    //console.log('topWords', topWords.slice(0, 20), topWords.length)
    return texts.map(text => text.split(' ').map(word =>
      topWords.includes(word) ? this.vocabulary[word] : null).filter(num => num != null))
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
  xText.pop()
  yText.pop()
  return { xText: xText, yText: yText }
}

function getFeatureLength(xTokens) {
  console.log('get feature length')
  numTokens = nj.array(xTokens.map(tokens => tokens.length))
  console.log('numTokens', numTokens)
  avgTokens = numTokens.mean()/*numTokens.reduce((acc, tokenLength) =>
    acc + tokenLength)/numTokens.length*/
  console.log('avgTokens', avgTokens)
  return Math.round(avgTokens + 2 * numTokens.std())
}

/*
 * Pad pre, truncate post
 */
function padSequences(xTokens, maxLength) {
  const xPad = []
  for (const xTokenArr of xTokens) {
    if ((maxLength - xTokenArr.length) > 0)  {
      // pad
      xPad.push([...new Array(maxLength - xTokenArr.length).fill(0),
        ...xTokenArr])
    } else {
      xPad.push(xTokenArr.slice(0, maxLength))
    }
  }
  return xPad
}

/**
 *  Creates, trains and runs predictions on model
 */
async function create_model(text) {

  bar.tick({
    'busyWith': 'Reading data'
  })
  let { xText, yText } = readData(text)
  const alphaWords = []
  for (let sentence of xText) {
    alphaWords.push(sentence.split(' ').filter(word => /^[a-z]+$/.test(word)).join(' '))
  }
  xText = alphaWords
  console.log(xText.length, yText.length)

  // create tokenizer
  bar.tick({
    'busyWith': 'Initialising Tokenizer'
  })
  const tokenizer = new Tokenizer(wordIndex)
  bar.tick({
    'busyWith': 'Fitting text'
  })
  //tokenizer.fitOnTexts(xText)

  //console.log(tokenizer.wordIndex)
  /*fs.writeFile("./sortedFrequencyWords.json", JSON.stringify(tokenizer.sortedFrequencyWords, null, 4), (err) => {
    if (err) {
        console.error(err);
        return;
    };
    console.log("File has been created");
  });*/

  // preprocess features
  bar.tick({
    'busyWith': 'Converting text to sequences'
  })
  const xTokens = tokenizer.textsToSequences(xText)
  console.log('xText', xText.slice(1, 2))
  //console.log('xTokens', xTokens.slice(0, 2))
  const featureLength = getFeatureLength(xTokens)
  console.log('featureLength', featureLength)
  bar.tick({
    'busyWith': 'Padding/ truncating sequences'
  })
  const xPad = padSequences(xTokens, featureLength)

  bar.tick({
    'busyWith': 'Loading Model'
  })
  const model = await tf.loadModel('https://raw.githubusercontent.com/micah5/sponsorship_remover_temp_model/master/js/model.json')

  bar.tick({
    'busyWith': 'Prediction'
  })
  xTest = ['dont forget to like share and subscribe',
           'i was thinking about my old model m keyboard',
           'check it out in the link in the description',
           'this is a review of the brand new television from samsung']
  const xTestTokens = tokenizer.textsToSequences(xTest)
  //console.log('xTestTokens', xTestTokens, featureLength)
  const xTestPad = padSequences(xTestTokens, featureLength)
  console.log(nj.array(xTestPad).shape, xTestPad.slice(810, 820))
  let xTestTensor = tf.tensor2d(xTestPad)
  xTestTensor.print(true)
  const prediction = model.predict(xTestTensor)
  console.log(prediction)
}

fs.readFile('dataset/data.csv', 'utf8', (error, data) => {
    if (error) throw error
    create_model(data.toString())
})
