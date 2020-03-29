require('dotenv').config()
const { Op }    = require('sequelize')
const SequelizeManager = require('./classes/SequelizeManager')
const sequelize = new SequelizeManager()

exports.register = function (server, options, next) {
    let io = require('socket.io')(server.listener)

    const firebaseAdmin = options.firebaseAdmin

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
            const chatrooms = await sequelize.Chat.findAll({
                attributes: ["id"],
                where: {
                    [Op.or]: [
                        { user1: socket.decoded.user_id },
                        { user2: socket.decoded.user_id },
                    ]
                },
                order: [[sequelize.Message, "createdAt", "desc"]],
                include: [sequelize.Message, { model: sequelize.User, as: "hugger" }, { model: sequelize.User, as: "huggy" }]
            })
            
            socket.user = user
            socket.chatrooms = chatrooms
            for(const chatroom of chatrooms){ // Attach socket to every chatrooms it belongs to
                socket.join("chatroom" + chatroom.id)
            }

            socket.on('moodUpdate', (data) => {
                // console.log(socket)
                socket.user.update({
                    picture: data.picture
                })
                // Once updated, send to the chatroom
                io.to("chatroom" + socket.chatrooms[0].id).emit("moodUpdated", { room: "chatroom" + socket.chatrooms[0].id, picture: data.picture })
            })

            socket.on("chatList", () => {
                // Hugger here, we need to send them the accurate data
                socket.emit("chatListData", chatrooms.map($0 => $0.dataValues))
            })

            socket.on("sendMessage", (data) => {
                Message
                    .build({
                        message: data.message,
                        chat_id: data.room.replace("chatroom", ""),
                        sender_id: socket.decoded.user_id
                    })
                    .save()
                    .then((res) => {
                        io.sockets.to(data.room).emit("newMessage", {
                            id: res.id,
                            room: data.room,
                            message: data.message,
                            createdAt: data.createdAt
                        })
                    })
            })
        })

    next()
}

exports.register.attributes = {
    name: 'teamcook-live-api'
}

// TODO: Sockets are authenticated but we're not sure user has rights to send data to specific room