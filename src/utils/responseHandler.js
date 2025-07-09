class resHandler {
    constructor(statusCode, msg= "success", data){
        this.statusCode=statusCode
        this.msg=msg
        this.data=data
        this.success= statusCode
    }
}


export {resHandler}