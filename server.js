const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Verify webhook (for WhatsApp API)
app.get('/*', (req, res) => {
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
    console.log("request recieved");
    console.log(req);
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
        body.entry.forEach(entry => {
            const webhookEvent = entry.messaging[0];
            console.log(webhookEvent);

            // Respond to messages
            if (webhookEvent.message && webhookEvent.message.text) {
                const senderId = webhookEvent.sender.id;
                const messageText = webhookEvent.message.text;

                // Add message to history
                if (!messageHistory[senderId]) {
                    messageHistory[senderId] = [];
                }
                messageHistory[senderId].push({ role: 'user', content: messageText });

                // Prepare payload for curl request
                const data = messageHistory[senderId];

                axios.post('http://23.94.44.137:80/chat-gpt/', data, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => {
                    const aiResponse = response.data.response;
                    messageHistory[senderId].push({ role: 'assistant', content: aiResponse });
                    sendMessage(senderId, aiResponse);
                })
                .catch(error => {
                    console.error('Error sending request to AI:', error.response ? error.response.data : error.message);
                });
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
        console.error('Error sending message:', error.response ? error.response.data : error.message);
    });
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
