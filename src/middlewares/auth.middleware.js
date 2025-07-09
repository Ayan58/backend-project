import { ApiError } from "../utils/errorHandler"
import { asyncH } from "../utils/asyncHandler.js"
import jwt from "jsonwebtoken"
import user from "../models/user.model.js"



export const verifyJWT = asyncH(async(req, res,next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
    
        if (!token){
            throw new ApiError(403,"token not found")
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const User=await user.findById(decodedToken?._id).select("-password -refreshToken") 
    
        if (!User){
            throw new ApiError(401,"invalid token")
        }
    
        req.User= User;
        next()
    } catch (error) {
        throw new ApiError(402,"invalid")
    }



}) 