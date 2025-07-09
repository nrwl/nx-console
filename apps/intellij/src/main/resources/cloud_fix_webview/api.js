// Adapter to bridge between VS Code webview API and IntelliJ API
const postToWebviewCallbacks = [];
const postToIdeCallbacks = [];

// Create the IntelliJ API
window.intellijApi = {
  postToWebview(message) {
    console.log('posting message to webview', message);
    postToWebviewCallbacks.forEach(callback => callback(message));
    // Also dispatch as a window message event for VS Code compatibility
    window.postMessage(message, '*');
  },
  postToIde(message) {
    if (postToIdeCallbacks.length > 0) {
      console.log('posting message to ide', message);
      postToIdeCallbacks.forEach(callback => callback(JSON.stringify(message)));
      return;
    }
    setTimeout(() => window.intellijApi.postToIde(message), 100);
  },
  registerPostToWebviewCallback(callback) {
    console.log('registering post to webview callback', callback);
    postToWebviewCallbacks.push(callback);
  },
  registerPostToIdeCallback(callback) {
    console.log('registering post to ide callback', callback);
    postToIdeCallbacks.push(callback);
  }
};

// Don't provide acquireVsCodeApi so the webview correctly detects IntelliJ
// The ide-communication.controller will catch the error and set editor = 'intellij'

console.log('registered IntelliJ API');