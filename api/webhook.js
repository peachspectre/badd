const express = require('express');
const line = require('@line/bot-sdk');
const crypto = require('crypto');

// สร้างแอป Express
const app = express();
app.use(express.json());

// LINE Channel Credentials
const CHANNEL_ACCESS_TOKEN = 'VDP6BNxp4IbJjVLe3MY73lghZwvqKeisykkmCxPLhhUV5xS5QFwt2fkIEWT6lvCOqX4P8Gusw4C+lrJrJEdMrrdYBQ3YJAQSm+hPyKVdiC97X9t7h9fOOhoyAHUbdhJYbaJnMsjyosvbxtQPFmmnTAdB04t89/1O/w1cDnyilFU=';
const CHANNEL_SECRET = 'b16b91dca7e1899f0f0945cad9bd8cae';
const GROUP_ID = 'Cc4b0c3a420fc92265e01e1236d666969';  // ใส่ Group ID ของคุณ

const config = {
  channelAccessToken: CHANNEL_ACCESS_TOKEN,
  channelSecret: CHANNEL_SECRET,
};

const client = new line.Client(config);

// เก็บสถานะของผู้ใช้
const userStates = {};

// แผนที่ชื่อผู้เล่น
const playerMap = {
  P1: 'พี่อุ๊',
  P2: 'พี่ออม',
  P3: 'พี่คิง',
  P4: 'เจน',
  P5: 'เทพแห่งแบดกฤษ',
};

// ฟังก์ชันตรวจสอบลายเซ็นต์
function verifySignature(req) {
  const signature = req.headers['x-line-signature'];
  const body = JSON.stringify(req.body);

  const hash = crypto
    .createHmac('sha256', CHANNEL_SECRET)
    .update(body)
    .digest('base64');

  return signature === hash;
}

// ฟังก์ชันจัดการ Event ที่มาจาก LINE
async function handleEvent(event) {
  console.log('🔍 Event type:', event.type);
  console.log('💬 Message:', event.message);

  // ตรวจสอบว่าเป็นข้อความประเภท "text"
  if (event.type !== 'message' || event.message.type !== 'text') {
    console.log('⚠️ ไม่ใช่ text message, ข้าม');
    return;
  }

  const userMessage = event.message.text.trim();

  // ถ้าเป็นข้อความ "น้องแบดตี้สรุปค่าตีแบดให้หน่อยจ้า"
  if (userMessage === 'น้องแบดตี้สรุปค่าตีแบดให้หน่อยจ้า') {
    userStates[event.source.userId] = { step: 'waiting_date', data: {} };
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `🎉 ยินดีค่าท่านเทพแบดกฤษ 🏸\n\n` +
            `น้องแบดตี้จะสรุปค่าใช้จ่ายให้นะคะ\n` +
            `ขอให้ตอบคำถามทีละข้อนะคะ 😊\n\n` +
            `📅 วันที่ตีแบดครั้งนี้เมื่อไรคะ?\n` +
            `(ตัวอย่าง: 14/07/2568)`,
    });
  }

  // ตรวจสอบสถานะการกรอกข้อมูล
  const state = userStates[event.source.userId];
  if (state) {
    const { step, data } = state;

    if (step === 'waiting_date') {
      data.date = userMessage;
      state.step = 'waiting_hours';
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `ขอบคุณค่ะ! บันทึกวันที่ ${data.date} แล้ว ✅\n\n` +
              `⏰ เล่นแบดกี่ชั่วโมงคะ?\n` +
              `(ตัวอย่าง: 2)`,
      });
    }

    if (step === 'waiting_hours') {
      const hours = parseInt(userMessage);
      if (isNaN(hours) || hours <= 0) {
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: `ขออภัยค่ะ กรุณาใส่จำนวนชั่วโมงเป็นตัวเลขค่ะ เช่น 2`,
        });
      }
      data.hours = hours;
      state.step = 'waiting_booking_fee';
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `ขอบคุณค่ะ! เล่น ${hours} ชั่วโมง ✅\n\n` +
              `💰 ค่าจองคอตรอบนี้เท่าไรคะ?\n` +
              `(ตัวอย่าง: 50)`,
      });
    }

    if (step === 'waiting_booking_fee') {
      const bookingFee = parseInt(userMessage);
      if (isNaN(bookingFee) || bookingFee < 0) {
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: `ขออภัยค่ะ กรุณาใส่ค่าจองเป็นตัวเลขค่ะ เช่น 50`,
        });
      }
      data.bookingFee = bookingFee;
      state.step = 'waiting_shuttles';
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `ขอบคุณค่ะ! ค่าจอง ${bookingFee} บาท ✅\n\n` +
              `🏸 ใช้ลูกแบดไปกี่ลูกคะ?\n` +
              `(ตัวอย่าง: 2)`,
      });
    }

    if (step === 'waiting_shuttles') {
      const shuttles = parseInt(userMessage);
      if (isNaN(shuttles) || shuttles < 0) {
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: `ขออภัยค่ะ กรุณาใส่จำนวนลูกแบดเป็นตัวเลขค่ะ เช่น 2`,
        });
      }
      data.shuttles = shuttles;
      state.step = 'waiting_players';
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `ขอบคุณค่ะ! ใช้ลูกแบด ${shuttles} ลูก ✅\n\n` +
              `👥 มีใครเล่นบ้างคะ? กรุณาใส่รหัสผู้เล่น\n` +
              `P1=พี่อุ๊, P2=พี่ออม, P3=พี่คิง, P4=เจน, P5=เทพแห่งแบดกฤษ\n\n` +
              `(ตัวอย่าง: P1,P2,P3)`,
      });
    }

    if (step === 'waiting_players') {
      const playersInput = userMessage.replace(/\s/g, '');
      const players = playersInput.split(',').map(p => p.trim()).filter(p => p);
      
      if (players.length === 0) {
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: `ขออภัยค่ะ กรุณาใส่รหัสผู้เล่น เช่น P1,P2,P3`,
        });
      }

      data.players = players;

      const courtFee = data.hours * 180;
      const bookingFee = data.bookingFee;
      const shuttleFee = data.shuttles * 85;
      const total = courtFee + bookingFee + shuttleFee;
      const perPerson = Math.round(total / players.length);

      let playerLines = players.map(p => {
        const name = playerMap[p] || p;
        return `${name} จ่าย ${perPerson} บาท 💰`;
      }).join('\n');

      const summary = `🎉 ว้าวว!! สุดยอดเลยค่ะ ขอบคุณสำหรับการมาออกกำลังกายนะคะ 🏸\n\n` +
                      `📋 สรุปค่าใช้จ่าย วันที่ ${data.date}\n` +
                      `⚡ ค่าคอต: ${data.hours} ชม. × 180 = ${courtFee} บาท\n` +
                      `💰 ค่าจอง: ${bookingFee} บาท\n` +
                      `🏸 ค่าลูกแบด: ${data.shuttles} ลูก × 85 = ${shuttleFee} บาท\n` +
                      `➖➖➖➖➖➖➖➖➖➖\n` +
                      `💸 รวมทั้งหมด: ${total} บาท\n\n` +
                      `${playerLines}\n\n` +
                      `สามารถโอนเงินได้ที่ พร้อมเพย์ 0826721217 ได้เลยค่าาา 😄`;

      // เก็บสถานะ welcomed ไว้ แต่ลบข้อมูลการคำนวณ
      userStates[event.source.userId] = { welcomed: true };

      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: summary,
      });
    }

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `ขออภัยค่ะ ไม่เข้าใจคำตอบของท่าน กรุณาตอบตามคำถามที่น้องแบดตี้ถามนะคะ 😊`,
    });
  }

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: `หากต้องการให้น้องแบดตี้ช่วยสรุปค่าใช้จ่ายในการตีแบด\nกรุณาพิมพ์ "น้องแบดตี้สรุปค่าตีแบดให้หน่อยจ้า" นะคะ 🏸`,
  });
}

// Root endpoint
app.get('/', (req, res) => {
  res.send(`Server is running!`);
});

// Webhook endpoint
app.post('/api/webhook', line.middleware(config), (req, res) => {
  console.log('📨 ได้รับข้อความจาก LINE:', JSON.stringify(req.body, null, 2));
  
  Promise.all(req.body.events.map(handleEvent))
    .then(() => {
      console.log('✅ ประมวลผลเสร็จแล้ว');
      res.status(200).end();
    })
    .catch((err) => {
      console.error('❌ Error processing event:', err);
      res.status(500).end();  // ส่ง HTTP status code 500 หากเกิดข้อผิดพลาด
    });
});

// ฟังก์ชันส่งข้อความต้อนรับเมื่อเซิร์ฟเวอร์เริ่มทำงาน
async function sendWelcomeMessage() {
  // หากมี GROUP_ID ที่ตั้งค่าไว้ จะส่งข้อความไปที่กลุ่ม
  // สำหรับการทดสอบ สามารถส่งไปที่ User ID ได้
  try {
    console.log('🏸 น้องแบดตี้พร้อมให้บริการแล้วค่ะ!');
    console.log('เมื่อมีผู้ใช้ส่งข้อความมา บอทจะตอบกลับทันที');
  } catch (error) {
    console.log('ข้อความต้อนรับพร้อมแล้ว (ส่งเมื่อมีผู้ใช้ติดต่อ)');
  }
}

// เริ่มต้นเซิร์ฟเวอร์
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
  sendWelcomeMessage();
});
