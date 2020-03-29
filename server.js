require('dotenv').config()
const Hapi      = require("hapi")
const Boom      = require("boom")
const hapiJWT   = require("hapi-auth-jwt2")
const { Op }    = require('sequelize')
const SequelizeManager = require('./classes/SequelizeManager')
const sequelize     = new SequelizeManager()
const firebaseAdmin = require("firebase-admin")
const Services      = require("./Services")

firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(require("./teamcookapp-firebase-adminsdk-wy5fr-7d862ab83c.json")),
})

const server = new Hapi.Server()

server.connection({
    port: process.env.PORT,
    routes: {
        cors: false
    }
})


server.register([
    require('./hapi-firebase-auth'),
    {
        register: require('./live'),
        options: {
            firebaseAdmin: firebaseAdmin
        }
    }
], (err) => {
    if(err) throw err
    server.auth.strategy('firebase', 'firebase', { firebaseAdmin })

    server.route({
        method: 'GET',
        path: '/auth',
        config: {
            auth: 'firebase'
        },
        handler: (req, reply) => {
            reply({ text: "Authentication OK." })
        }
    })

    server.route({
        method: 'POST',
        path: '/user',
        config: {
            auth: {
                strategy: 'firebase',
                mode: 'optional'
            }
        },
        handler: (req, reply) => {
            const data = req.payload

            sequelize.User.build(data)
                .save()
                .then((res) => {
                    // Services.assignHuggerToHuggy(data)
                    reply(true)
                })
                .catch((err) => console.log(err))
        }
    })

    server.route({
        method: 'GET',
        path: '/check/username/{username}',
        handler: async (req, reply) => {
            const user = await sequelize.User.findOne({ where: { username: req.params.username } })

            reply(user === null)
        }
    })

    server.route({
        method: 'GET',
        path: '/user/exists/{id}',
        config: {
            auth: 'firebase'
        },
        handler: async (req, reply) => {
            const user = await sequelize.User.findOne({ where: { authID: req.params.id } })

            const res = {}
            res[req.params.id] = !!user
            console.log(res)
            reply(res)
        }
    })

    server.route({
        method: 'GET',
        path: '/user/me',
        config: {
            auth: 'firebase'
        },
        handler: async (req, reply) => {
            const user = await sequelize.User.findOne({ where: { authID: req.auth.credentials.user_id } })
            reply(JSON.stringify(user))
        }
    })

    server.route({
        method: 'GET',
        path: '/user/{id}',
        config: {
            auth: 'firebase'
        },
        handler: async (req, reply) => {
            try{
                // Check if requester has access to requested by looking for chat relation
                    // If true, link is proved so we grant access to profile
                const chatExists = await sequelize.Chat.findOne({ 
                    where: { 
                        [Op.or]: [
                            {
                                [Op.and]: [
                                    { user1: req.auth.credentials.user_id }, 
                                    { user2: req.params.id }
                                ]
                            },
                            {
                                [Op.and]: [
                                    { user2: req.auth.credentials.user_id },
                                    { user1: req.params.id },
                                ]
                            }
                        ]
                    } 
                })
                if(chatExists){ // TODO: query by authID only
                    const user = await sequelize.User.findOne({ where: { [Op.or]: [{ authID: req.params.id }, { id: req.params.id }] } })
                    reply(JSON.stringify(user)) // TODO: This is not secure, some fields should not be shared publicly
                }else{
                    reply(Boom.unauthorized())
                }
            }catch(err){
                console.log(err)
                reply(Boom.internal())
            }
        }
    })

    server.route({
        method: 'POST',
        path: '/user/edit',
        config: {
            auth: 'firebase'
        },
        handler: (req, reply) => {
            // TODO
        }
    })

    server.start(() => console.log("Server up and running on port " + process.env.PORT))
})


/*

SOLID API:
  - /edit
    - Update and send to Firebase

LIVE API:
 - Mood update
    - emit when huggy
    - subscribe and receive when hugger
 - Chat
    - subscribe to rooms
    - update accordingly
    - save in database
    - save in memcache

///

Microservices :
 - Push Notifications
 - Firebase Storage

 - quickActions Triggerer (text analysis)
 - chatbot
*/

// Services.assignHuggerToHuggy({ type: "huggy", authID: "I6aQREjHKINZlkF8ljGmEIB2bv73"})