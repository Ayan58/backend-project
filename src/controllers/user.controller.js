import {asyncH} from "../utils/asyncHandler.js";

const userRegister = asyncH(async (req, res) => {
    res.status(200).json({
        msg: "ok"
    })
})

export {userRegister}
