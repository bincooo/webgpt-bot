import { WechatyBuilder } from 'wechaty';
import qrcodeTerminal from 'qrcode-terminal';
import { v4 as uuid } from 'uuid'
import config from './config';
import { replyMessage } from './chatgpt';

const roomMap = new Map()

async function onMessage(msg) {
  const contact = msg.talker();
  const contactId = contact.id;
  const receiver = msg.to();
  const content = msg.text().trim();
  const room = msg.room();
  const alias = (await contact.alias()) || (await contact.name());
  const isText = msg.type() === bot.Message.Type.Text;
  if (msg.self()) {
    return;
  }

  if (room && isText) {
    const topic = await room.topic();
    const name = await contact.name()
    console.log(
      `Group name: ${topic} talker: ${name} content: ${content}`
    );
  	let roomId = ''
  	if (roomMap.has(topic)) {
  	  roomId = roomMap.get(topic)
  	} else {
  	  roomId = 'room-' + uuid()
  	  roomMap.set(topic, roomId)
  	}

    const pattern = RegExp(`^@${receiver.name()}\\s+${config.groupKey}[\\s]*`);
    if (await msg.mentionSelf()) {
      if (pattern.test(content)) {
        const groupContent = content.replace(pattern, '');

        if (
          groupContent.trim().toLocaleLowerCase() === config.resetKey.toLocaleLowerCase()
        ) {
          if (roomMap.has(topic)) {
            roomMap.delete(topic)
            roomId = 'room-' + uuid()
            roomMap.set(topic, roomId)
          }
          await contact.say('Previous conversation has been reset.');
          return;
        }

        replyMessage(room, groupContent, roomId, () => {
          room.say('@' + name + '\n\n讲的太快了,休息一下吧~')
        });
        return;
      } else {
        console.log(
          'Content is not within the scope of the customizition format'
        );
      }
    }
  } else if (isText) {
    console.log(`talker: ${alias} content: ${content}`);
    if (config.autoReply) {
      if (content.startsWith(config.privateKey)) {

        replyMessage(
          contact,
          content.substring(config.privateKey.length).trim(),
          contactId,
          () => {
            contact.say('讲的太快了,休息一下吧~')
          }
        );
      } else {
        console.log(
          'Content is not within the scope of the customizition format'
        );
      }
    }
  }
}

function onScan(qrcode) {
  qrcodeTerminal.generate(qrcode); // 在console端显示二维码
  const qrcodeImageUrl = [
    'https://api.qrserver.com/v1/create-qr-code/?data=',
    encodeURIComponent(qrcode),
  ].join('');

  console.log(qrcodeImageUrl);
}

async function onLogin(user) {
  console.log(`${user} has logged in`);
  const date = new Date();
  console.log(`Current time:${date}`);
  if (config.autoReply) {
    console.log(`Automatic robot chat mode has been activated`);
  }
}

function onLogout(user) {
  console.log(`${user} has logged out`);
}

async function onFriendShip(friendship) {
  if (friendship.type() === 2) {
    if (config.friendShipRule.test(friendship.hello())) {
      await friendship.accept();
    }
  }
}

const bot = WechatyBuilder.build({
  name: 'WechatEveryDay',
  puppet: 'wechaty-puppet-wechat', // 如果有token，记得更换对应的puppet
  puppetOptions: {
    uos: true,
  },
});

bot
  .on('scan', onScan)
  .on('login', onLogin)
  .on('logout', onLogout)
  .on('message', onMessage);
if (config.friendShipRule) {
  bot.on('friendship', onFriendShip);
}

bot
  .start()
  .then(() => console.log('Start to log in wechat...'))
  .catch((e) => console.error(e));
