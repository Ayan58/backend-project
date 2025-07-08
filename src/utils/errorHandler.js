class ApiError extends Error {
    constructor (
        statuscode,
        msg="error!!!",
        errors= [],
    ){
        super(msg)
        this.statuscode= statuscode
        this.data= null
        this.msg= msg
        this.errors= errors
        this.success= false

    }
}


export {ApiError}