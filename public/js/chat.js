const socket = io()

// Elements
const $messageForm = document.querySelector('#message-form')
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')

const $sendLocationButton = document.querySelector('#send-location')

const $messages = document.querySelector('#messages')

// Templates
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationTemplate = document.querySelector('#location-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

// Options
const {username, room} = Qs.parse(location.search, {ignoreQueryPrefix: true})

const autoscroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild

    // Height of the new message
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin // not including margin

    // Visible height
    const visibleHeight = $messages.offsetHeight

    // Height of messages container
    const containerHeight = $messages.scrollHeight

    // How far have I scrolled
    const scrollOffset = $messages.scrollTop + visibleHeight // amount of distance scrolled from the top

    if (containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight
    }
}

/* Acknowledgement */
// server (emit) -> client (receive) --acknowledgement -> server
// client (emit) -> server (receive) --acknowledgement -> client

socket.on('message', (msg) => {
    // console.log(msg)
    const html = Mustache.render(messageTemplate, {
        username: msg.username,
        message: msg.text,
        createdAt: moment(msg.createdAt).format('h:mm a')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

socket.on('locationMessage', (msg) => {
    // console.log(msg)
    const html = Mustache.render(locationTemplate, {
        username: msg.username,
        url: msg.url,
        createdAt: moment(msg.createdAt).format('h:mm a')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

socket.on('roomData', ({room, users}) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    })
    document.querySelector('#sidebar').innerHTML = html
})

// const sendMsgForm = document.querySelector('form')
// const sendMsgForm = document.querySelector('#message-form')

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault() // use event argument to prevent default behavior - browser full-page refresh
    
    // disable form
    $messageFormButton.setAttribute('disabled', 'disabled') // disable the form once it's been submitted

    // const msg = document.querySelector('input').value
    const msg = e.target.elements.message.value // e.target: the target we listen to
    // socket.emit('sendMessage', msg)
    // the final argument is a callback which is to run when the event is acknowledged
    socket.emit('sendMessage', msg, (error) => {
        // enable form
        $messageFormButton.removeAttribute('disabled') // re-enable form once message or error has been sent
        $messageFormInput.value = '' // remove input content
        $messageFormInput.focus() // move cursir inside

        if (error) {
            return console.log(error)
        }
        // console.log('The message was delivered!')
    })
})

$sendLocationButton.addEventListener('click', () => {
    if (!navigator.geolocation) {
        return alert('Geolocation is not supported by your browser!')
    }
    // diable
    $sendLocationButton.setAttribute('disabled', 'disabled')

    navigator.geolocation.getCurrentPosition((position) => {
        // console.log(position)
        const location = {
            longitude: position.coords.longitude, 
            latitude: position.coords.latitude
        }
        socket.emit('sendLocation', location, () => {
            //enable
            $sendLocationButton.removeAttribute('disabled')
            // console.log('Location shared!')
        })
    })
})

socket.emit('join', {username, room}, (error) => {
    if (error) {
        alert(error)
        location.href = '/'
    }
})



// socket.on('countUpdated', (count) => {
//     console.log('The count has been updated!', count)
// })

// document.querySelector('#increment').addEventListener('click', () => {
//     console.log('Clicked')
//     socket.emit('increment')
// })