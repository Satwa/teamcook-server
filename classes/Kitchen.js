class Kitchen {
    constructor(id, users, recipe){
        this.id = id
        this.users = [...users]
        this.recipe = recipe
        this.step = 0
    }

    // TODO: fetch recipe
}

module.exports = Kitchen