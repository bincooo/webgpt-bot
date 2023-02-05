import { ChatGPTAPIBrowser } from 'cgpt';
import pTimeout from 'p-timeout';
import config from './config';
import { retryRequest, onMessage } from './utils';

let isWait = false
const conversationMap = new Map();
const contentMap = new Map();
/*
const chatGPT = new ChatGPTAPI({
  sessionToken: config.chatGPTSessionToken,
  clearanceToken: config.clearanceToken,
  userAgent: config.userAgent,
});
*/



const API = new ChatGPTAPIBrowser({
    email: config.email,
    password: config.password,
    debug: false,
    minimize: true,
    proxyServer: config.proxyServer
})
await API.initSession()


async function getChatGPTReply(contact, content, contactId, callback) {
  // send a message and wait for the response
  try {
    await API.queueSendMessage(content, {
      onProgress: (res) => {
        onMessage(res, contact)
      }
    }, contactId)
  } catch(err) {
    if (err.statusCode == 5001) { // 队列满了
      callback('——————————————\nError: 5001\n讲的太快了, 休息一下吧 ~')
    }
    if (err.statusCode == 403) {
      callback('——————————————\nError: 403\n脑瓜子嗡嗡的, 让我缓缓 ...')
    }
    console.log(err)
  }
  // response is a markdown-formatted string
  return 'ok'
}

export async function replyMessage(contact, content, contactId, callback) {
  try {
    if (isWait) {
      console.log('ignore message, is waiting ...')
      callback('——————————————\nError: 403\n脑瓜子嗡嗡的, 让我缓缓 ...')
      return
    }
    isWait = true
	
  	// 角色扮演
    if (config.cosplay && config.cosplay.length > 0) {
      for (let i in config.cosplay) {
        const c = config.cosplay[i]
        if (content.trim() === c.key) {
          await retryRequest(
           () => getChatGPTReply(contact, c.msg, contactId, callback),
            config.retryTimes,
            500
          );
          isWait = false
          return
        }
      }
    }

    const message = await retryRequest(
      () => getChatGPTReply(contact, content, contactId, callback),
      config.retryTimes,
      500
    );
    isWait = false

  } catch (e: any) {
    console.error(e);
    if (e.message.includes('timed out')) {
      await contact.say(
        content +
          '\n-----------\nERROR: Please try again, ChatGPT timed out for waiting response.'
      );
    }
    conversationMap.delete(contactId);
  }
}
