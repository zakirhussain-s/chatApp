'use strict';

// DOM Element selections remain the same
var usernamePage = document.querySelector('#username-page');
var chatPage = document.querySelector('#chat-page');
var usernameForm = document.querySelector('#usernameForm');
var messageForm = document.querySelector('#messageForm');
var messageInput = document.querySelector('#message');
var messageArea = document.querySelector('#messageArea');
var connectingElement = document.querySelector('.connecting');
var stompClient = null;
var username = null;
var colors = [
    '#2196F3', '#32c787', '#00BCD4', '#ff5652',
    '#ffc107', '#ff85af', '#FF9800', '#39bbb0'
];

// Modified connect function to handle production URLs
function connect(event) {
    username = document.querySelector('#name').value.trim();
    
    if(username) {
        usernamePage.classList.add('hidden');
        chatPage.classList.remove('hidden');

        // Create the WebSocket URL dynamically based on the current protocol and host
        const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
        const host = window.location.host;
        const socketUrl = `${protocol}//${host}/ws`;
        
        // Create SockJS connection with the dynamic URL
        var socket = new SockJS(socketUrl);
        stompClient = Stomp.over(socket);

        // Enable STOMP debug logging for troubleshooting
        stompClient.debug = function(str) {
            console.log('STOMP: ' + str);
        };

        // Connect with extended error handling
        stompClient.connect({}, 
            onConnected, 
            function(error) {
                console.error('STOMP error:', error);
                onError(error);
                // Attempt to reconnect after 5 seconds
                setTimeout(() => {
                    console.log('Attempting to reconnect...');
                    connect(event);
                }, 5000);
            }
        );
    }
    event.preventDefault();
}

// Enhanced onConnected function with error handling
function onConnected() {
    try {
        // Subscribe to the Public Topic
        stompClient.subscribe('/topic/public', onMessageReceived, {
            // Add error handling for subscription
            'activation': function() {
                console.log('Successfully subscribed to public topic');
            },
            'error': function(error) {
                console.error('Subscription error:', error);
            }
        });

        // Tell your username to the server
        stompClient.send("/app/chat.addUser",
            {},
            JSON.stringify({sender: username, type: 'JOIN'})
        );

        connectingElement.classList.add('hidden');
    } catch (error) {
        console.error('Error in onConnected:', error);
        onError(error);
    }
}

// Enhanced error handling function
function onError(error) {
    console.error('WebSocket connection error:', error);
    connectingElement.textContent = 'Could not connect to WebSocket server. Please refresh this page to try again!';
    connectingElement.style.color = 'red';
}

// Modified sendMessage with error handling
function sendMessage(event) {
    var messageContent = messageInput.value.trim();
    if(messageContent && stompClient) {
        var chatMessage = {
            sender: username,
            content: messageInput.value,
            type: 'CHAT'
        };
        try {
            stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
            messageInput.value = '';
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        }
    }
    event.preventDefault();
}

// Enhanced message handling with error checking
function onMessageReceived(payload) {
    try {
        var message = JSON.parse(payload.body);
        var messageElement = document.createElement('li');

        if(message.type === 'JOIN') {
            messageElement.classList.add('event-message');
            message.content = message.sender + ' joined!';
        } else if (message.type === 'LEAVE') {
            messageElement.classList.add('event-message');
            message.content = message.sender + ' left!';
        } else {
            messageElement.classList.add('chat-message');
            var avatarElement = document.createElement('i');
            var avatarText = document.createTextNode(message.sender[0]);
            avatarElement.appendChild(avatarText);
            avatarElement.style['background-color'] = getAvatarColor(message.sender);
            messageElement.appendChild(avatarElement);

            var usernameElement = document.createElement('span');
            var usernameText = document.createTextNode(message.sender);
            usernameElement.appendChild(usernameText);
            messageElement.appendChild(usernameElement);
        }

        var textElement = document.createElement('p');
        var messageText = document.createTextNode(message.content);
        textElement.appendChild(messageText);
        messageElement.appendChild(textElement);
        messageArea.appendChild(messageElement);
        messageArea.scrollTop = messageArea.scrollHeight;
    } catch (error) {
        console.error('Error processing received message:', error);
    }
}

// Avatar color generation function remains the same
function getAvatarColor(messageSender) {
    var hash = 0;
    for (var i = 0; i < messageSender.length; i++) {
        hash = 31 * hash + messageSender.charCodeAt(i);
    }
    var index = Math.abs(hash % colors.length);
    return colors[index];
}

// Event listeners remain the same
usernameForm.addEventListener('submit', connect, true)
messageForm.addEventListener('submit', sendMessage, true)
