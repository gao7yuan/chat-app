/* Configure Express in a different way so that we can use Socket.io */
const path = require('path') // node path module to configure path
const http = require('http')
const express = require('express') // load express library
const socketio = require('socket.io')
const Filter = require('bad-words')
const {generateMessage, generateLocationMessage} = require('./utils/messages')
const {addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users')

const app = express() // create express application
const server = http.createServer(app)
const io = socketio(server) // configure socket.io to work for a server

const port = process.env.PORT || 3000 // heroku or local

const publicDirectoryPath = path.join(__dirname, '../public') // serve up public directory

app.use(express.static(publicDirectoryPath)) // express static middleware

// let count = 0

/* We have a Socket.io server that does two things */
// 1. server (emit) -> client (receive) - countUpdated
// 2. client (emit) -> server (receive) - increment

// when a new client connects
// socket is an object which contains information about this connection
// can use methods on socket to communicate with this specific client
io.on('connection', (socket) => {
    console.log('New WebSocket connection')

    // socket.emit('message', generateMessage('Welcome!')) // emit to a particular connection
    // socket.broadcast.emit('message', generateMessage('A new user has joined!')) // emit to everybody except this particular connection
    
    // socket.on('join', ({username, room}, callback) => {
    socket.on('join', (options, callback) => {
        // const {error, user} = addUser({id: socket.id, username, room})
        const {error, user} = addUser({id: socket.id, ...options})

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        // socket.emit, io.emit, socket.broadcast.emit
        // io.to.emit -> emits an event to everybody in a specific room
        // socket.broadcast.to.emit -> send an event to everyone except for a specific client in a chat room
        
        socket.emit('message', generateMessage('Admin', 'Welcome!')) // emit to a particular connection
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`)) // emit to everybody except this particular connection
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage', (msg, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()
        if (filter.isProfane(msg)) {
            return callback('Profanity is not allowed!')
        }

        // io.emit('message', generateMessage(msg)) // broadcast to everyone
        io.to(user.room).emit('message', generateMessage(user.username, msg))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })

    socket.on('sendLocation', (location, callback) => {
        // io.emit('message', 'Location: ' + location.longitude + ', ' + location.latitude)
        // io.emit('message', `Location: ${location.latitude}, ${location.longitude}`)
        const user = getUser(socket.id)
        
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${location.latitude},${location.longitude}`))
        callback()
    })

    // socket.emit('countUpdated', count) // event

    // socket.on('increment', () => {
    //     count++
    //     // socket.emit('countUpdated', count) // emit event to a particular connection
    //     io.emit('countUpdated', count) // emit event to every single connection
    // })
})

// actually start the server up
// app.listen(port, () => {
//     console.log(`Server is up on port ${port}!`)
// })
server.listen(port, () => {
    console.log(`Server is up on port ${port}!`)
})