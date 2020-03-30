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
    
        this.Friend = this.connection.define("friends", {
            user1: Sequelize.STRING,
            user2: Sequelize.STRING,
            status: {
                type: Sequelize.STRING,
                defaultValue: '00'
            }
        })
    
        this.Room = this.connection.define("rooms", {
            recipe: Sequelize.STRING
        })

        this.RoomUser = this.connection.define("rooms_users", {
            room_id: Sequelize.STRING, 
            user_id: Sequelize.STRING
        })

        this.Message = this.connection.define("rooms_messages", {
            room_id: Sequelize.STRING,
            sender_id: Sequelize.STRING,
            message: Sequelize.STRING
        })
    
        // this.User.hasMany(this.Friend, { foreignKey: 'authID' })
        this.Room.hasMany(this.RoomUser, { foreignKey: 'room_id' })
        this.RoomUser.hasOne(this.User, { foreignKey: 'user_id' })
        this.RoomUser.belongsTo(this.Room, { foreignKey: 'room_id' })
        this.Friend.belongsTo(this.User, {foreignKey: "user1", as: "friend_1"})
        this.Friend.belongsTo(this.User, {foreignKey: "user2", as: "friend_2"})
        this.Message.belongsTo(this.User, {foreignKey: "sender_id"})
        this.Message.belongsTo(this.Room, {foreignKey: "room_id"})
    
        this.User.sync()
        this.Friend.sync()
        this.Room.sync()
        this.RoomUser.sync()
        this.Message.sync()
    }
}

SequelizeManager.prototype.useless = () => {
    return null
}

module.exports = SequelizeManager