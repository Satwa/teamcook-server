require('dotenv').config()
const { Op }    = require('sequelize')
const SequelizeManager = require('./classes/SequelizeManager')
const sequelize = new SequelizeManager()

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
            console.log('[DEBUG] LIVE API: New connection')

            const user = await sequelize.User.findOne({ where: { authID: socket.decoded.user_id } })

            socket.user    = user
            socket.kitchen = null

            users.push(socket)

            socket.on('joinKitchen', (call_data, room_id, user_id, recipe) => {
                // user_id could be an array later for group chat
                // room_id is a UUID (@teamcook/uuid)
                const kitchen = kitchens.find($0 => $0.id == room_id)
                if(!kitchen){
                    // We are creating a new kitchen
                    // New kitchen, we have to contact user_id
                    kitchens.push(new Kitchen(room_id, [socket.user.authID], recipe))
                    socket.kitchen = kitchen
                    socket.join(room_id)

                    // Contact the other user
                    const receiver = users.find($0 => $0.user.authID == user_id).id
                    if(receiver){
                        io
                            .in(receiver) // this room is socket.id of the other user
                            .emit("requestForKitchen", ...call_data, room_id)
                    }else{
                        socket.emit('error', { message: 'The other user is not connected' })
                    }
                }else{
                    // Kitchen exists
                    if(kitchen.users.length < 2){
                        kitchen.users.push(socket.user.authID)
                        socket.kitchen = kitchen
                        socket.join(room_id)
                        io.in(room_id).emit('newUserInKitchen', ...call_data, socket.user.authID)
                    }else{
                        socket.emit('error', { message: 'The kitchen you\'re trying to join is full!'})
                        console.log("Kitchen is full")
                    }
                }
            })

            socket.on('disconnect', function() {
                if(socket.kitchen !== null){
                    socket.leave(socket.kitchen.id)
                }
                if(socket.user !== null){
                    const indexInUsers = users.findIndex($0 => $0.authID == socket.user.authID)
                    users.splice(indexInUsers, 1)
                }
            })

            socket.on('leave', function() {
                if(socket.kitchen !== null){
                    socket.leave(socket.kitchen.id)
                }
                if(socket.user !== null){
                    const indexInUsers = users.findIndex($0 => $0.authID == socket.user.authID)
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
            //     // Once updated, send to the chatroom
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