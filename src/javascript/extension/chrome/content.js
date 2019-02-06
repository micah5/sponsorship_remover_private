// constants
const numWords = 2000
const embedDim = 128
const batchSize = 32
const epochs = 2

// global variables (to prevent multiples)
let model = null
let featureLength = 0
let tokenizer = null
let predictionOutput = null
let sections = null
let blocking = false

/**
 * Since tf.js doesn't have a built in tokenizer, I had to write my own.
 * Very basic, but it seems to work well enough
 */
class Tokenizer {

  /**
   * The vocabulary is just a object where every word (key) is assigned a unique
   * integer token (value) to represent it.
   */
  constructor(vocabulary) {
    this.vocabulary = vocabulary
  }

  /**
   * Fit on texts creates a vector comprised of the token values
   * of each string in the vocabulary.
   *
   * TODO: Ideal solution would be to use this function, but
   * unfortunately I'm having a problem where strings that occour
   * with the same frequency don't seem to match the same integer token as
   * assigned by the default Keras Tokenizer class.
   * I can't figure out how equal frequency strings are being sorted,
   * so until then I'm just loading in the word_index dict (generated by
   * Keras) directly.
   *
   * The reason why this function would be useful to have is because dynamically
   * generating this vector would be needed if we were to train the model with tfjs.
   * For now, since we're just predicting based on a preset model, it's not
   * important.
   */
  fitOnTexts(texts) {
    const words = texts.reduce((acc, text) => [...acc,
      ...text.split(' ')], [])

    const frequencyWords = {}
    for (const word of words) {
      if (!frequencyWords[word])
        frequencyWords[word] = 0
      frequencyWords[word] += 1
    }

    const sortedFrequencyWords = []
    for (const key of Object.keys(frequencyWords)) {
      sortedFrequencyWords.push({
        word: key,
        count: frequencyWords[key]
      })
    }

    sortedFrequencyWords.sort((a, b) => b.count - a.count)
    const uniqueWords = sortedFrequencyWords.map(obj => obj.word)

    this.vocabulary = uniqueWords.reduce((acc, word, idx) => ({
       ...acc, [word]: idx + 1}), {})
  }

  /**
   * Vocabulary.
   */
  get wordIndex() {
    return this.vocabulary
  }

  /**
   * Gets the top numWords from vocabulary.
   * @return {array} Array of strings of length numWords.
   */
  get topWords() {
    const topWords = []
    for (const [idx, key] of Object.keys(this.vocabulary).entries()) {
      if (idx >= numWords) break
      topWords.push(key)
    }
    return topWords
  }

  /**
   * Transforms each text in texts to a sequence of integer tokens,
   * bounded by numWords.
   * @param {string} text Containing csv file contents.
   * @return {array} Array of texts converted to tokens.
   */
  textsToSequences(texts) {
    const words = texts.reduce((acc, text) => [...acc,
      ...text.split(' ')], [])
    const topWords = this.topWords
    return texts.map(text => text.split(' ').map(word =>
      topWords.includes(word) ? this.vocabulary[word] : null).filter(num => num != null))
  }

}

/**
 * Reads data from csv file and stores the first 2 columns
 * into xText and yText respectively.
 * @param {string} text Containing csv file contents.
 * @return {object} Object with both features and targets.
 */
function readData(text) {
  const lines = text.split('\n')
  lines.shift()
  const xText = lines.map(line => line.split(',')[0])
  const yText = lines.map(line => line.split(',')[1])
  xText.pop()
  yText.pop()
  return { xText: xText, yText: yText }
}

/**
 * Feature length is used for padding/ truncating (ensuring
 * that each sequence is of the same length in batch).
 * Max tokens set to avg + 2 std dev.
 * @param {array} xTokens Word embeddings, used to calculate feature length.
 * @return {number} Max tokens.
 */
function getFeatureLength(xTokens) {
  numTokens = nj.array(xTokens.map(tokens => tokens.length))
  avgTokens = numTokens.mean()
  return Math.round(avgTokens + 2 * numTokens.std())
}

/**
 * Padding/ truncating to ensure that each sequence is of
 * the same length in batch. 'Pre' padding, 'post' truncating:
 * Zeros added at beginning because this prevents early fatigue of network.
 * @param {array} xTokens Word embeddings, used to calculate feature length.
 * @param {number} maxLength Max feature length.
 * @return {array} Padded/ truncated xTokens.
 */
function padSequences(xTokens, maxLength) {
  const xPad = []
  for (const xTokenArr of xTokens) {
    if ((maxLength - xTokenArr.length) > 0)  {
      // pad
      xPad.push([...new Array(maxLength - xTokenArr.length).fill(0),
        ...xTokenArr])
    } else {
      // truncate
      xPad.push(xTokenArr.slice(0, maxLength))
    }
  }
  return xPad
}

/**
 *  Loads model and runs predictions on it
 */
async function loadModel(text, wordIndex) {

  console.log('read words')
  let { xText, yText } = readData(text)
  const alphaWords = []
  for (let sentence of xText) {
    alphaWords.push(sentence.split(' ').filter(word => /^[a-z]+$/.test(word)).join(' '))
  }
  xText = alphaWords

  console.log('create tokenizer')
  tokenizer = new Tokenizer(wordIndex)

  //tokenizer.fitOnTexts(xText)

  // preprocess features
  console.log('preprocess features')
  const xTokens = tokenizer.textsToSequences(xText)
  featureLength = getFeatureLength(xTokens)

  const xPad = padSequences(xTokens, featureLength)

  console.log('load model')
  model = await tf.loadModel('https://raw.githubusercontent.com/micah5/sponsorship_remover_temp_model/master/js/model.json')

  return true
}

async function getTranscript(id) {
  try {
    const response = await axios.get(`https://sponsorship-remover-wrapper.herokuapp.com/transcript?id=${id}`);
    if (response.data.success) return response.data.sections
    else return []
  } catch (error) {
    return []
  }
}

async function predict(xTest) {
  console.log('prediction')
  const xTestTokens = tokenizer.textsToSequences(xTest)
  const xTestPad = padSequences(xTestTokens, featureLength)
  const xTestTensor = tf.tensor2d(xTestPad)
  //xTestTensor.print(true)
  const prediction = model.predict(xTestTensor)
  const outputData = await prediction.dataSync()
  console.log('output data', outputData)
  return outputData
}

/* Listen for messages */
chrome.runtime.onMessage.addListener(async function(msg, sender, sendResponse) {
    if (msg.type) {
      switch (msg.type) {
        case 'prepareModel':
          console.log('prepareModel')
          sendResponse(true)
          const response = await axios.get('https://raw.githubusercontent.com/micah5/sponsorship_remover_temp_model/master/misc/data.csv')
          const dataset = response.data
          const response2 = await axios.get('https://raw.githubusercontent.com/micah5/sponsorship_remover_temp_model/master/misc/word_index.json')
          const wordIndex = response2.data
          await loadModel(dataset, wordIndex)
          console.log('loaded')
          break
        case 'predict':
          console.log('predict')
          sendResponse(true)
          sections = await getTranscript(msg.id)
          const xTest = sections.map(obj => obj.text)
          predictionOutput = await predict(xTest)
          break
        case 'isModelPrepared':
          console.log('isModelPrepared')
          sendResponse(model ? true : false)
          break
        case 'isPredictionDone':
          console.log('isPredictionDone')
          if (predictionOutput == null) {
            sendResponse(null)
          } else {
            sendResponse({
              predictions: predictionOutput,
              sections: sections
            })
          }
          break
        case 'goTo':
          console.log('im in goto', msg)
          if (msg.seconds) {
            console.log('skipping to', msg.seconds, 'seconds')
            document.getElementsByClassName("html5-main-video")[0].currentTime = msg.seconds
            sendResponse(true)
          } else {
            sendResponse(false)
          }
          break
        case 'toggleBlocking':
          blocking = !blocking
          if (blocking) {
            const sponsoredSections = sections.filter((section, idx) => predictionOutput[idx] < 0.5)
            const interval = setInterval(() => {
              const currentTime = document.getElementsByClassName("html5-main-video")[0].currentTime
              for (const section of sponsoredSections) {
                if (section.startTime < currentTime && currentTime < section.endTime) {
                  document.getElementsByClassName("html5-main-video")[0].currentTime = section.endTime
                }
              }
            }, 1000)
          }
          sendResponse(blocking)
          break
        case 'isBlocking':
          sendResponse(blocking)
          break
      }
    }
});
