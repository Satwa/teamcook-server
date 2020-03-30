export default class Kitchen {
    constructor(id, users, recipe){
        this.id = id
        this.users = [...users]
        this.recipe = recipe
    }

    // TODO: fetch recipe
}