const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Verify webhook (for WhatsApp API)
app.get('/*', (req, res) => {
    console.log(req);
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === "12345") {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(req.query['hub.challenge']);
        } else {
            res.sendStatus(403);
        }
    }
});

// Handle incoming messages
app.post('/webhook', (req, res) => {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
        body.entry.forEach(entry => {
            const webhookEvent = entry.messaging[0];
            console.log(webhookEvent);

            // Respond to messages
            if (webhookEvent.message && webhookEvent.message.text) {
                const senderId = webhookEvent.sender.id;
                const messageText = webhookEvent.message.text;

                // Process the message and respond
                sendMessage(senderId, `You said: ${messageText}`);
            }
        });
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// Send a message using WhatsApp API
function sendMessage(senderId, message) {
    const token = 'your-access-token';
    axios.post('https://graph.facebook.com/v11.0/me/messages', {
        recipient: { id: senderId },
        message: { text: message }
    }, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log('Message sent:', response.data);
    })
    .catch(error => {
        console.error('Error sending message:', error.response.data);
    });
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
