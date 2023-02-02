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
    proxyServer: config.proxyServer,
    userDataDir: '/tmp/' + config.email
})
await API.initSession()

function resetConversation(contactId: string) {
  if (conversationMap.has(contactId)) {
    const data = conversationMap.get(contactId)
    conversationMap.delete(contactId)
  }
}

async function getConversation(contactId: string) {
  if (conversationMap.has(contactId)) {
    return conversationMap.get(contactId);
  }
  const res: any = await API.sendMessage('你好！')
  conversationMap.set(contactId, {
    conversationId: res.conversationId,
	  messageId: res.messageId
  })
  
  return conversationMap.get(contactId)
}

function updateConversation(contactId: string, messageId: string) {
  if (conversationMap.has(contactId)) {
    const data = conversationMap.get(contactId)
	data.messageId = messageId
	conversationMap.set(contactId, data)
  }
}

async function getChatGPTReply(contact, content, contactId) {
  const data = await getConversation(contactId)
  // send a message and wait for the response
  const threeMinutesMs = 3 * 60 * 1000;
  const response = await pTimeout(API.sendMessage(content, {
    conversationId: data.conversationId, parentMessageId: data.messageId,
    onProgress: (res) => {
      onMessage(res, contact)
    }
  }), {
    milliseconds: threeMinutesMs,
    message: 'ChatGPT timed out waiting for response',
  })
  console.log('response: ', response);
  response.response = '[DONE]'
  onMessage(response, contact)
  updateConversation(contactId, response.messageId)
  
  // response is a markdown-formatted string
  return 'ok'
}

export async function replyMessage(contact, content, contactId, callback) {
  try {
    if (
      content.trim().toLocaleLowerCase() === config.resetKey.toLocaleLowerCase()
    ) {
      resetConversation(contactId);
      await contact.say('Previous conversation has been reset.');
      return;
    }
	
    if (isWait) {
      console.log('ignore message, is waiting ...')
      callback()
      return
    }
    isWait = true
	
	// 角色扮演
	if (config.cosplay && config.cosplay.length > 0) {
	  for (let i in config.cosplay) {
	    const c = config.cosplay[i]
		if (content.trim() === c.key) {
		  await retryRequest(
		    () => getChatGPTReply(contact, c.msg, contactId),
		    config.retryTimes,
		    500
		  );
		  isWait = false
		  return
		}
	  }
	}
	
    
    const message = await retryRequest(
      () => getChatGPTReply(contact, content, contactId),
      config.retryTimes,
      500
    );
	isWait = false

    if (
      (contact.topic && contact?.topic() && config.groupReplyMode) ||
      (!contact.topic && config.privateReplyMode)
    ) {
      const result = content + '\n-----------\n' + message;
      // await contact.say(result);
      return;
    } else {
      // await contact.say(message);
    }
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
