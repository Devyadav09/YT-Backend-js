class ApiResponce {

    constructor(
        statuscode,
        data,
        message = "success"
    ){
        this.statuscode = statuscode
        this.data = data
        this.statuscode = statuscode < 400

    }
}

export {ApiResponce}