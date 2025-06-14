import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";



const generateAccessTokenAndRefreshToken = async (userId)=> {

    try{

    const user = await User.findById(userId)
    const accessToken = await user.generateAccessToken()
    const refreshToken = await user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return {accessToken, refreshToken}

    }catch(error){
        throw new ApiError(500,"something went wrong while generating referesh and access token")
    }

}


const registerUser = asyncHandler(async (req,res)=> {
 
    const {username, email, fullname, password} = req.body;

    if([username, email, fullname, password].some((field)=>field?.trim()===""))
    {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({ $or: [{username},{email}]})

    if(existedUser){
        throw new ApiError(409, "user with email or username already existed")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        username: username.toLowerCase(),
        email,
        password
    })

    const userCreated = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!userCreated){
        throw new ApiError(500, "Internal Server Error Please Try Again")
    }

    return res.status(201).json(
        new ApiResponse(200, userCreated, "User Register Successfully")
    )

})


const loginUser = asyncHandler( async (req,res)=> {

    const {email, username, password} = req.body

    if(!email && !username){
        throw new ApiError(400,"email or username is required")
    }

    const user = await User.findOne({
        $or:[{email},{username}]
    })

    if(!user){
        throw new ApiError(404, "This Username or Email does not exist. Please try with correct one")
    }

    const isPasswordValid = user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials")
    }

    const {refreshToken, accessToken} = await generateAccessTokenAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user : loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )

})


const logoutUser = asyncHandler(async (req,res)=> {
    User.findByIdAndUpdate(

        req.user._id,
        {
            $unset:{
                refreshToken: 1  // this removes field from documents
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res 
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))

})


const refereshAccessToken = asyncHandler(async (req,res)=> {

    const incomingRefreshToken = req.cookie?.refreshToken || req.body?.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorised Request") 
    }

    try {
        
        const decodeToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    
        const user = User.findById(decodeToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid Refersh Token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh Token is Experied")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, NewRefreshToken} = await generateAccessTokenAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", NewRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: NewRefreshToken},
                "Access Token Refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }
})


const changeCurrentPassword = asyncHandler(async (req,res)=>{

    const {oldPassword, newPassword} = req.body

    const user = await User.findById(user.req._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid Password")
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false })

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password change successfully"))

})


const getCurrentUser = asyncHandler(async (req,res)=>{
    return res
    .status(200)
    .json( new ApiResponse(
        200,
        req.user,
        "user fetch successfully"
    ))
})


const updateAccountDetails = asyncHandler(async (req,res)=>{
    const {email, fullname, username} = req.body

    if(!(email || fullname || username)){
        throw new ApiError(400,"Feilds are required")
    }

    if(username){
        const existingUsername = await User.findOneAndDelete({username})

        if(existingUsername && existingUsername._id !== req.user._id){
            throw new ApiError(400,"This username is already taken. Please try something new.")
        }
    }

    const updatedFields = {}
    if(email) updatedFields.email = email
    if(username) updatedFields.username = username
    if(fullname) updatedFields.fullname = fullname

    const user = User.findByIdAndUpdate(
        req.user._id,
        { $set: updatedFields },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account Details updated successfully"))
})


const updateUserAvatar = asyncHandler(async(req,res)=>{

    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw ApiError(400,"Avatar local path is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw ApiError(400,"Error while uploading the Avatar file")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:  avatar.url
            }
        },
        {new:true}
    ).select('-password')

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Avatar Image update successfully"))
})


export {

    registerUser,
    loginUser,
    logoutUser,
    refereshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    
    }
