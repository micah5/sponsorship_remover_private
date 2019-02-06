/*document.getElementById('recordTime').onclick = () => {
  chrome.tabs.query({"active": true, "lastFocusedWindow": true}, (tabs) => {
    tabURL = tabs[0].url;
    let tab = tabs[0]
    this.times.push('kk slider')
    chrome.tabs.sendMessage(tab.id, { text: "report_back" },
      (element) => {
        alert("button was clicked yeeessss " + element);
      });
  });
};*/

new Vue({
  el: '#app',
  data: {
    on: false,
    id: null,
    predictionResult: null,
    loadingModel: false,
    tab: null,
    loadingPrediction: false
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
    })
  },
  computed: {
    predictionPretty: function() {
      const predictionPretty = []
      if (this.predictionResult) {
        console.log(this.predictionResult)
        for (const [idx, section] of this.predictionResult.sections.entries()) {
          if (this.predictionResult.predictions[idx] < 0.5) {
            predictionPretty.push({
              startTime: section.startTime,
              endTime: section.endTime
            })
          }
        }
      }
      return predictionPretty
    }
  },
  watch: {
    loadingModel: function() {
      if (this.loadingModel == true) {
        var interval = setInterval(() => {
           chrome.tabs.sendMessage(this.tab.id, { type: "isModelPrepared" },
             (res) => {
               //console.log('checking if model is prepared', res)
               if (res == true) {
                 this.on = true
                 clearInterval(interval)
                 this.loadingModel = false
               }
           })
        }, 1000);
      }
    },
    loadingPrediction: function() {
      if (this.loadingPrediction == true) {
        var interval = setInterval(() => {
           chrome.tabs.sendMessage(this.tab.id, { type: "isPredictionDone" },
             (res) => {
               if (res) {
                 this.predictionResult = res
                 clearInterval(interval)
                 this.loadingPrediction = false
               }
           })
        }, 1000);
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
    }
  }
})
