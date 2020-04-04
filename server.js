require('dotenv').config()
const Hapi      = require("hapi")
const Boom      = require("boom")
const hapiJWT   = require("hapi-auth-jwt2")
const { Op }    = require('sequelize')
const SequelizeManager = require('./classes/SequelizeManager')
const sequelize     = new SequelizeManager()
const firebaseAdmin = require("firebase-admin")
const Services      = require("./Services")
const spawn         = require("child_process").spawn
const recipeScraper = require("recipe-scraper")

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

    // Check user authentication
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

    // Create a new user
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

    // Check if a username is available
    server.route({
        method: 'GET',
        path: '/check/username/{username}',
        handler: async (req, reply) => {
            const user = await sequelize.User.findOne({ where: { username: req.params.username } })

            reply(user === null)
        }
    })

    // Check if user exists
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

    // Get authenticated user profile (TODO: fetch friends & rooms)
    server.route({
        method: 'GET',
        path: '/user/me',
        config: {
            auth: 'firebase'
        },
        handler: async (req, reply) => {
            try{
                const user = await sequelize.User.findOne({ 
                    where: { 
                        authID: req.auth.credentials.user_id 
                    }
                })
                reply(JSON.stringify(user))
            }catch(err) {
                console.log(err)
                reply(Boom.badImplementation())
            }
        }
    })
    // Get authenticated user friends
    server.route({
        method: 'GET',
        path: '/user/me/friends',
        config: {
            auth: 'firebase'
        },
        handler: async (req, reply) => {
            try{
                const friends = await sequelize.Friend.findAll({
                    where: {
                        [Op.or]: [
                            {
                                user1: req.auth.credentials.user_id
                            },
                            {
                                user2: req.auth.credentials.user_id
                            }
                        ]
                    },
                    include: [{model: sequelize.User, as: 'friend_1'}, {model: sequelize.User, as: 'friend_2'}]
                })
                reply(JSON.stringify(friends))
            }catch(err) {
                console.log(err)
                reply(Boom.badImplementation())
            }
        }
    })

    // Find user (search feature)
    server.route({
        method: 'POST',
        path: '/user/find',
        config: {
            auth: 'firebase'
        },
        handler: async (req, reply) => {
            const data = req.payload

            const users = await sequelize.User.findAll({ 
                where: { 
                    username: {
                        [Op.like]: `%${data.username}%`
                    }
                },
                attributes: ['authID', 'username', 'displayname', 'picture']
            })
            reply(JSON.stringify(users))
        }
    })



    // Request user friendship
    server.route({
        method: 'POST',
        path: '/user/friendrequest',
        config: {
            auth: 'firebase'
        },
        handler: async (req, reply) => {
            const data = req.payload
            /**
             * Payload:
             *  - user_id (requsted not requestee)
             *  - type [new, accept, decline, delete]
             */
            try{
                const friendship = await sequelize.Friend.findOne({
                    where: {
                        [Op.or]: [
                            {
                                [Op.and]: [
                                    { user1: req.auth.credentials.user_id }, 
                                    { user2: data.user_id }
                                ]
                            },
                            {
                                [Op.and]: [
                                    { user2: req.auth.credentials.user_id },
                                    { user1: data.user_id },
                                ]
                            }
                        ]
                    }
                })
    
                if(friendship){ // They're friend
                    if(data.type == "decline" || data.type == "remove"){
                        friendship.destroy()
                    }else if(data.type == "accept"){
                        friendship.update({
                            status: 1
                        })
                    }
                }else{ // They're not friend
                    // New request
                    if(data.type == "new"){
                        sequelize.Friend
                            .build({
                                user1: req.auth.credentials.user_id,
                                user2: data.user_id,
                                status: 0
                            })
                            .save()
                        // TODO: Send notification to the requested
                    }
                }
                reply(true)
            }catch(err){
                console.log(err)
                reply(Boom.badImplementation())
            }
        }
    })


    // Get specific user profile
    server.route({
        method: 'GET',
        path: '/user/{id}',
        config: {
            auth: 'firebase'
        },
        handler: async (req, reply) => {
            try{
                // return username & @
                const user = await sequelize.User.findOne({
                    where: {
                        [Op.or]: [
                            {authID: req.params.id}, 
                            {id: req.params.id}
                        ]
                    },
                    attributes: ['authID', 'username', 'displayname', 'picture'],
                    include: [sequelize.Friend, {model: User, as: "user1"}, {model: User, as: "user2"}]
                })

                reply(user)
            }catch(err){
                console.log(err)
                reply(Boom.internal())
            }
        }
    })

    // Change settings of authenticated user
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
    
    /**
     * 
     * RECIPE RELATED
     * 
     * ./crawlers/{allrecipes|marmiton}/crawler.py -l "keywords"
     * ./crawlers/{allrecipes|marmiton}/crawler.py -d [url]
     * ---------------------------------------------------------
     */
    server.route({
        method: 'POST',
        path: '/recipe/find',
        config: {
            auth: 'firebase'
        },
        handler: (req, reply) => {
            const data = req.payload
            const crawler = spawn('python3', [`./crawlers/${data.platform}/crawler.py`, "-l", data.arg])
            crawler.stdout.on('data', (data) => {
                // Do something with the data returned from python script
                reply(data)
            })

            crawler.stderr.on('data', (data) => {
                console.log("Error find recipe, dump args: " + JSON.stringify(req.payload))
                console.log(data.toString())
                reply([])
            })
        }
    })
    server.route({
        method: 'POST',
        path: '/recipe/details',
        config: {
            auth: 'firebase'
        },
        handler: (req, reply) => {
            const data = req.payload

            if(data.platform == "allrecipes"){
                recipeScraper(data.arg).then(_recipe => {
                    const recipe = _recipe
                    recipe.steps = _recipe.instructions
                    delete recipe.instructions
                    reply(recipe)
                }).catch(error => {
                    console.log(error)

                    reply([])
                })
            }else{
                const crawler = spawn('python3', [`./crawlers/${data.platform}/crawler.py`, "-d", data.arg])
                crawler.stdout.on('data', (data) => {
                    reply(data)
                })
    
                crawler.stderr.on('data', (data) => {
                    console.log("Error get recipe details, dump args: " + JSON.stringify(req.payload))
                    reply([])
                })
            }
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