require('dotenv').config()
const { Op }    = require('sequelize')
const SequelizeManager = require('./classes/SequelizeManager')
const sequelize = new SequelizeManager()
const Kitchen = require("./classes/Kitchen")

exports.register = function (server, options, next) {
    let io = require('socket.io')(server.listener)

    const firebaseAdmin = options.firebaseAdmin

    let kitchens = []
    let users    = []


    io
        .use(async (socket, next) => {
            if(socket.handshake.query && socket.handshake.query.token){
                try{
                    const user = await firebaseAdmin.auth().verifyIdToken(socket.handshake.query.token)
                    socket.decoded = user
                    next()
                }catch(err){
                    // console.log("[DEBUG] LIVE API: Unauthorized user tried to access the API")
                    next(new Error("Authentication error"))
                }
            }else{
                // console.log("[DEBUG] LIVE API: Unauthorized user tried to access the API")
                next(new Error("Authentication error"))
            }
        })
        .on('connection', async function (socket) {
            // console.log('[DEBUG] LIVE API: New connection')

            const user = await sequelize.User.findOne({ where: { authID: socket.decoded.user_id } })

            socket.user    = user
            socket.kitchen = null

            if(users.find($0 => $0.user.authID == user.authID) !== undefined){
                // User exists, first unset then add
                users.splice(
                    users.findIndex($0 => $0.user.authID == user.authID),
                    1
                )
            }

            users.push(socket)
            console.log(`[Joining] ${user.username} => ${socket.id}`)

            socket.on('joinKitchen', (data) => {
                // user_id could be an array later for group chat
                // room_id is a UUID (@teamcook/uuid)
                const kitchen = kitchens.find($0 => $0.id == data.room_id)
                if(!kitchen){
                    // We are creating a new kitchen
                    // New kitchen, we have to contact user_id
                    const newKitchen = new Kitchen(data.room_id, [socket.user.authID], data.recipe)
                    kitchens.push(newKitchen)
                    socket.kitchen = newKitchen
                    socket.join(data.room_id)

                    // Contact the other user
                    const receiver = users.find($0 => $0.user.authID == data.user_id)
                    if(receiver){
                        console.log(`[Ask for call] ${socket.user.username} => ${receiver.user.username}`)
                        console.log(receiver.id)
                        socket
                            .to(receiver.id) // this room is socket.id of the other user
                            .emit("requestForKitchen", {
                                call_data: data.call_data, 
                                room_id: data.room_id, 
                                recipe: socket.kitchen.recipe
                            })
                    }else{
                        socket.emit('unexpected', { message: 'The other user is not connected' })
                        // Try to contact them with a notification and set a 2mn timeout
                        console.log("error — user not connected")
                    }
                }else{
                    // Kitchen exists
                    if(kitchen.users.length < 2){
                        console.log("Kitchen exists, joining")
                        kitchen.users.push(socket.user.authID)
                        socket.kitchen = kitchen
                        socket.join(kitchen.id)
                        socket.to(kitchen.id).emit('newUserInKitchen', {call_data: data.call_data, user_id: socket.user.authID})
                    }else{
                        socket.emit('unexpected', { message: 'The kitchen you\'re trying to join is full!'})
                        console.log("Kitchen is full")
                    }
                }
            })

            socket.on("kitchenNewCandidate", (data) => {
                console.log("adding ice candidate")
                io.to(data.room_id).emit('kitchenNewCandidate', {...data})
            })

            socket.on('disconnect', () => {
                console.log(`[Disconnecting] ${user.username} => ${socket.id}`)
                if(socket.kitchen !== null){
                    socket.leave(socket.kitchen.id)
                }
                if(socket.user !== null){
                    const indexInUsers = users.findIndex($0 => $0.user.authID == socket.user.authID)
                    users.splice(indexInUsers, 1)
                }
            })

            socket.on('leave', () => {
                console.log(`[Leaving] ${user.username} => ${socket.id}`)
                if(socket.kitchen !== null){
                    socket.leave(socket.kitchen.id)
                }
                if(socket.user !== null){
                    const indexInUsers = users.findIndex($0 => $0.user.authID == socket.user.authID)
                    users.splice(indexInUsers, 1)
                }
            })

            // socket.chatrooms = chatrooms
            // for(const chatroom of chatrooms){ // Attach socket to every chatrooms it belongs to
            //     socket.join("chatroom" + chatroom.id)
            // }

            // socket.on('moodUpdate', (data) => {
            //     // console.log(socket)
            //     socket.user.update({
            //         picture: data.picture
            //     })
            //     // on updated, send to the chatroom
            //     io.to("chatroom" + socket.chatrooms[0].id).emit("moodUpdated", { room: "chatroom" + socket.chatrooms[0].id, picture: data.picture })
            // })

            // socket.on("chatList", () => {
            //     // Hugger here, we need to send them the accurate data
            //     socket.emit("chatListData", chatrooms.map($0 => $0.dataValues))
            // })

            // socket.on("sendMessage", (data) => {
            //     Message
            //         .build({
            //             message: data.message,
            //             chat_id: data.room.replace("chatroom", ""),
            //             sender_id: socket.decoded.user_id
            //         })
            //         .save()
            //         .then((res) => {
            //             io.sockets.to(data.room).emit("newMessage", {
            //                 id: res.id,
            //                 room: data.room,
            //                 message: data.message,
            //                 createdAt: data.createdAt
            //             })
            //         })
            // })
        })

    next()
}

exports.register.attributes = {
    name: 'teamcook-live-api'
}

// TODO: Sockets are authenticated but we're not sure user has rights to send data to specific room