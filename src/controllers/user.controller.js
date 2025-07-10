import {asyncH} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/errorHandler.js";
import {user} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/file_up_cloud.js"
import {resHandler} from "../utils/responseHandler.js"
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async(userId) => {
    try {
        const User = await user.findById(userId)
        const accessToken = User.generateAccessToken()
        const refreshToken = User.generateRefreshToken()

        User.refreshToken= refreshToken
        await User.save ({validateBeforeSave: false})

        return {accessToken, refreshToken}
        
    } catch (error) {
        throw new ApiError(500, "something went wrong")
        
    }
}

const userRegister = asyncH(async (req, res) => {
    
    const {username, fullName, email, password} = req.body
    console.log("username:", username)

if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await user.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }


    const avatarLocalPath = req.files?.avatar[0]?.path;

    let coverImageLocalPath;

    if(req.files && Array.isArray(req.files.coverImage && req.files.coverImage.length>0)){
        coverImageLocalPath = req.files.coverImage[0].path

    }

    

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }
   

    const User = await user.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        username: username.toLowerCase()
    })

    const createdUser = await user.findById(User._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

        return res.status(201).json(
        new resHandler(200, createdUser, "User registered Successfully")
    )

} )



const loginUser = asyncH(async (req, res) => {

    const {email, username, password} = req.body

    if (!(username||email)){
        throw new ApiError(400, "Username or email is required. Please enter any one.")
    }

    const User = await user.findOne({
        $or: [{username}, {email}]
    })

    if (!User){
        throw new ApiError("user not exist")
    }

    const isPasswordValid = await User.isPasswordCorrect(password)

    if (!password){
        throw new ApiError(400, "invalid")
    }

    const {accessToken,refreshToken} = await

    generateAccessAndRefreshToken(User._id)


    const loggedInUser = await user.findById(User._id).
    select("-password -refreshToken")


    const options ={

        httpOnly: true,
        secure: true
    }


    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in successfully"
        )
    )

})



const logoutUser = asyncH(async (req, res) => {
    User.findByIdAndUpdate(
        req.User._id,{
            $set: {
                refreshToken: undefined
            }
        },{
            new: true
        }
    )

   const options ={

        httpOnly: true,
        secure: true
    }

    return res.status(200).clearCookie(accessToken, options).clearCookie(refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {},
            "User logged out successfully"
        )
    )








    

})

const refreshAccessToken = asyncH(async (req, res) => {
    
   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

   if (!incomingRefreshToken){
    throw new ApiError(401, "unauthorized request")
   }

 try {
      const decodedToken = jwt.verify(
       incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET
      )
   
      const User = user.findById(decodedToken?._id)
   
      if (!User){
       throw new ApiError(401, "invalid token")
      }
   
      if (incomingRefreshToken != User?.refreshAccessToken){
       throw new ApiError(401, "token expired")
   
      }
   
      const options = {
       httpOnly: true,
       secure: true
      }
   
      const {accessToken, refreshToken} = await generateAccessAndRefreshToken(User._id)
   
      return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options)
      .json(new ApiResponse(200, {accessToken, refreshToken: newRefreshToken}, "Access token refreshed"))
 } catch (error) {

    throw new ApiError(401, "invalid refresh token")
    
 }



})


const changeCurrentPassword = asyncH(async (req, res) => {
    const {oldPassword, newPassword} = req.body

    const User = await user.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect){
        throw new ApiError(400, "Invalid old password")
    }

    User.password = newPassword
    await User.save({validateBeforeSave: false})

    return res.status(200).json(new ApiResponse(200, {}, "password changed"))

    

})

const getCurrentUser = asyncH(async (req, res) => {
    return res.status(200).json(200, req.user, "current user fetchef successfully")
})

const updateAccountDetails = asyncH(async (req, res) => {
    const {fullName, email} = req.body
    if (!fullName||!email){
        throw new ApiError(400,"this is required")
    }

    const User = user.findByIdAndUpdate(
        req.User?._id,
        {
            $set:{
                fullName,
                email
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200).json(new ApiResponse(200, User, "updated successfully"))
})


const updateUserAvatar = asyncH(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath){
        throw new ApiError(400, "file missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url){
        throw new ApiError(400, "file uploadingn problem on avatar")
    }

    const User = await user.findByIdAndUpdate(req.user?._id,{
        $set:{
            avatar: avatar.url
        }
    },{new: true}).select("-password")
    return res.status(200).json(new ApiResponse(200, User, "avatar updated successfully"))
})




const updateUserCoverImage = asyncH(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath){
        throw new ApiError(400, "file missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url){
        throw new ApiError(400, "file uploadingn problem on coverImage")
    }

    const User = await user.findByIdAndUpdate(req.user?._id,{
        $set:{
            coverImage: coverImage.url
        }
    },{new: true}).select("-password")

    return res.status(200).json(new ApiResponse(200, User, "cover image updated successfully"))
})





export {userRegister, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser,
     updateAccountDetails, updateUserAvatar,updateUserCoverImage}
