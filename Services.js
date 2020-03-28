const { Sequelize, Op } = require('sequelize')
const SequelizeManager = require('./classes/SequelizeManager')
const sequelize = new SequelizeManager()

exports.assignHuggerToHuggy = async (user_data) => { // TODO: Don't reach maxchild
    if(user_data.type == "huggy"){
        try {
            const huggers = await sequelize.User.findAll({ where: { type: "hugger", authorized: 1 } })
            const chats   = await sequelize.Chat.findAll()

            let pHuggers = [] // list of huggers' id with maxchild (potentialHuggers)
            let chat_ids = []
    
            for(const chat of chats){ // list all chat ids
                chat_ids.push(chat.user1 + "_" + chat.user2)
            }
    
            for(const hugger of huggers){
                pHuggers.push({
                    authID: hugger.authID,
                    appearance: chat_ids.filter($0 => $0.includes(hugger.authID)).length
                })
            }
    
            pHuggers.sort((a, b) => a.appearance > b.appearance) // sort huggers to have the least handling one first
            
            sequelize.Chat.build({
                user1: pHuggers[0].authID,
                user2: user_data.authID,
            })
            .save()
            .then((data) => {
                console.log("[DEBUG] New huggy now linked to a hugger")
            })
        }catch(err) {
            console.error(err)
        }
    }
}