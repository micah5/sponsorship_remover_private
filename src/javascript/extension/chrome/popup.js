new Vue({
  el: '#app',
  data: {
    on: false,
    id: null,
    predictionResult: null,
    loadingModel: false,
    tab: null,
    loadingPrediction: false,
    blocking: false
  },
  mounted: function () {
    console.log('started', document)
    chrome.tabs.query({ "active": true, "lastFocusedWindow": true }, (tabs) => {
      const url = new URL(tabs[0].url)
      this.id = url.searchParams.get("v")
      this.tab = tabs[0]
      console.log('set tab', this.tab)
      chrome.tabs.sendMessage(this.tab.id, { type: "isModelPrepared" },
        (res) => {
          console.log('got on', res)
          this.on = res
          console.log('huh', this.on)
      })
      chrome.tabs.sendMessage(this.tab.id, { type: "isPredictionDone" },
        (res) => {
          this.predictionResult = res
      })
      chrome.tabs.sendMessage(this.tab.id, { type: "isBlocking" },
        (res) => {
          this.blocking = res
      })
    })
  },
  computed: {
    predictionPretty: function() {
      const predictionPretty = []
      if (this.predictionResult) {
        console.log(this.predictionResult)
        for (const [idx, section] of this.predictionResult.sections.entries()) {
          if (this.predictionResult.predictions[idx] < 0.5) {
            if (predictionPretty.length >= 1) {
              const lastEntry = predictionPretty[predictionPretty.length - 1]
              if (section.startTime < (lastEntry.endTime + 5)) {
                predictionPretty[predictionPretty.length - 1].endTime = section.endTime
              } else {
                predictionPretty.push({
                  startTime: section.startTime,
                  endTime: section.endTime
                })
              }
            } else {
              predictionPretty.push({
                startTime: section.startTime,
                endTime: section.endTime
              })
            }
          }
        }
      }
      return predictionPretty
    }
  },
  watch: {
    loadingModel: function() {
      if (this.loadingModel == true) {
        const interval = setInterval(() => {
           chrome.tabs.sendMessage(this.tab.id, { type: "isModelPrepared" },
             (res) => {
               //console.log('checking if model is prepared', res)
               if (res == true) {
                 this.on = true
                 clearInterval(interval)
                 this.loadingModel = false
               }
           })
        }, 1000)
      }
    },
    loadingPrediction: function() {
      if (this.loadingPrediction == true) {
        const interval = setInterval(() => {
           chrome.tabs.sendMessage(this.tab.id, { type: "isPredictionDone" },
             (res) => {
               if (res) {
                 this.predictionResult = res
                 clearInterval(interval)
                 this.loadingPrediction = false
               }
           })
        }, 1000)
      }
    }
  },
  methods: {
    prepareModel: function() {
      chrome.tabs.sendMessage(this.tab.id, { type: "prepareModel" },
        (res) => {
          console.log('element', res)
          if (res == true) {
            this.loadingModel = true
          }
      })
    },
    openLink: function(url) {
      chrome.tabs.create({ url: url })
    },
    startPrediction: function() {
      chrome.tabs.sendMessage(this.tab.id, { type: 'predict', id: this.id },
        (res) => {
          console.log('element', res)
          if (res == true) {
            this.loadingPrediction = true
          }
        }
      )
    },
    display: function(seconds) {
      // https://stackoverflow.com/questions/3733227/javascript-seconds-to-minutes-and-seconds
      const hours = seconds / 3600
      const minutes = (seconds % 3600) / 60
      seconds %= 60

      return [hours, minutes, seconds].map(this.format).join(':')
    },
    format: function(val) {
      // https://stackoverflow.com/questions/3733227/javascript-seconds-to-minutes-and-seconds
      return ('0' + Math.floor(val)).slice(-2)
    },
    goTo: function(seconds) {
      console.log('goto', seconds)
      chrome.tabs.sendMessage(this.tab.id, { type: 'goTo', seconds: seconds },
        (res) => {
          console.log('element', res)
        }
      )
    },
    toggleBlocker: function() {
      chrome.tabs.sendMessage(this.tab.id, { type: 'toggleBlocking' },
        (res) => {
          this.blocking = res
        }
      )
    }
  }
})
