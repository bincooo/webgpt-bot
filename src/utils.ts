const sleep = (time: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
};

const awaitErrorWrap = async <T, U = any>(
  promise: Promise<T>
): Promise<[U | null, T | null]> => {
  try {
    const data = await promise;
    return [null, data];
  } catch (err: any) {
    return [err, null];
  }
};

export const retryRequest = async <T>(
  promise: () => Promise<T>,
  retryTimes = 3,
  retryInterval = 10000
) => {
  let output: [any, T | null] = [null, null];

  for (let a = 0; a < retryTimes; a++) {
    output = await awaitErrorWrap(promise());

    if (output[1]) {
      break;
    }

    console.log(`retry ${a + 1} times, error: ${output[0]}`);
    await sleep(retryInterval);
  }

  if (output[0]) {
    throw output[0];
  }

  return output[1];
};




const conversationMsgMap = new Map()
const breakBlocks = [
  // '```'
  function(text, index) {
  const block = '```'
	const currIndex = text.lastIndexOf(block)
	if (currIndex < 0 || currIndex < index) {
	  return 0
	}
	if (currIndex + block.length <= index) {
	  return -1
	}
	return currIndex + block.length
  },
  '。\n',
  '。', 
  '.\n',
]

export const buildLazyMessage = (contentMap: any) => {
  return (data: any) => {
    //console.log('contentMap', contentMap)
  	if (!contentMap) return
      //console.log('ts: ', data)
  	if (!contentMap.has(data.conversationId)) return
    const content: any = contentMap.get(data.conversationId)

    let cached = {
      idx: 0,
	    cachedMsg: ''
    }
    if (conversationMsgMap.has(data.conversationId)) {
      cached = conversationMsgMap.get(data.conversationId)
    } else {
  		conversationMsgMap.set(data.conversationId, cached)
  	}
  
    if (data.response) {
  	  let index
  	  for (let i in breakBlocks) {
  	    const block = breakBlocks[i]
    		if (typeof(block) == 'string') {
    		  index = data.response.lastIndexOf(block)
    	      if (index > 0) {
    	        index += block.length
    		    break
    	      }
    		} else {
    		  index = block(data.response, cached.idx)
    		  if (index == -1) break
    		  if (index > 0) break
    		}
  	    
  	  }
  	
  	  //console.log(index, data.response)
  	  if (data.response == '[DONE]') {
  	    if (cached.idx < cached.cachedMsg.length) {
  	      // console.log('ts: ', cached.cachedMsg.substr(cached.idx))
    		  const msg = cached.cachedMsg.substr(cached.idx)
    		  if (msg && msg.trim()) {
    		    content.say(msg + '\n\n- end -')
    		  } else {
    		    content.say('- end -')
    		  }
  	  
        } else {
    		  content.say('- end -')
    		}
  	    conversationMsgMap.delete(data.conversationId)
        return
  	  }
	    cached.cachedMsg = data.response
      if (index > 0 && cached.idx < index) {
	      // console.log('ts: ', data.response.substr(cached.idx, index))
    		const msg = data.response.substr(cached.idx, index)
    		if (msg && msg.trim()) {
    		  content.say(msg)
    		}
    		cached.idx = index
      }
    }
  }
}

