'use strict'
require('dotenv').config()
const { Sequelize } = require('sequelize')

class SequelizeManager{
    constructor(){
        
        this.connection = new Sequelize(process.env.DATABASE_URL, {
            logging: process.env.DATABASE_SHOW_LOG === "true"
        })
    
        this.User = this.connection.define("users", {
            authID: {
                type: Sequelize.STRING, // ID given by Firebase when authenticating
                primaryKey: true
            },
            username: Sequelize.STRING,
            birthdate: Sequelize.BIGINT,
            displayname: Sequelize.STRING,
            picture: Sequelize.STRING,
            deviceToken: Sequelize.STRING
        })
    
        this.Chat = this.connection.define("chats", {
            user1: Sequelize.STRING,
            user2: Sequelize.STRING
        })
    
        this.Message = this.connection.define("messages", {
            message: Sequelize.STRING
        })
    
        this.Chat.belongsTo(this.User, {foreignKey: "user1", as: "hugger"})
        this.Chat.belongsTo(this.User, {foreignKey: "user2", as: "huggy"})
        this.Chat.hasMany(this.Message, {foreignKey: "chat_id"})
        this.Message.belongsTo(this.Chat, {foreignKey: "chat_id"})
        this.User.hasMany(this.Message, {foreignKey: "sender_id"})
        this.Message.belongsTo(this.User, {foreignKey: "sender_id"})
    
        this.User.sync()
        this.Chat.sync()
        this.Message.sync()
    }
}

SequelizeManager.prototype.useless = () => {
    return null
}

module.exports = SequelizeManager