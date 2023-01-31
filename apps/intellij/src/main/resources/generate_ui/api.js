const postToWebviewCallbacks = []
const postToIdeCallbacks = []

window.intellijApi = {
  postToWebview(message) {
    console.log("posting message to webview", message)
    postToWebviewCallbacks.forEach(callback => callback(message))
  },
  postToIde(message) {
    if(postToIdeCallbacks.length > 0) {
      console.log("posting message to ide", message)
      postToIdeCallbacks.forEach(callback => callback(message))
      return;
    }
    setTimeout(() => window.intellijApi.postToIde(message), 100)
  },
  registerPostToWebviewCallback(callback) {
      console.log("registering post to webview callback", callback)
      postToWebviewCallbacks.push(callback)
  },
  registerPostToIdeCallback(callback) {
    console.log("registering post to ide callback", callback)

    postToIdeCallbacks.push(callback)
  }
}
