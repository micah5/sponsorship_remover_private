/* A function creator for callbacks */
function doStuffWithDOM(element) {
  console.log('back boi')
    alert("fskjkjsafnjks I received the following DOM content:\n" + element);
}

/* When the browser-action button is clicked... */
chrome.browserAction.onClicked.addListener(function(tab) {
    /*...check the URL of the active tab against our pattern and... */
    console.log('sending...')
    chrome.tabs.sendMessage(tab.id, { text: "report_back" }, doStuffWithDOM);
});
