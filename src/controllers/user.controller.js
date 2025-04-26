import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";



const registerUser = asyncHandler(async (req,res)=> {
 
    const {username, email, fullname, password} = req.body;

    if([username, email, fullname, password].some((field)=>field?.trim()===""))
    {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({ $or: [{username},{email}]})

    if(existedUser){
        throw new ApiError(409, "user with emial or username already existed")
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
        new ApiResponce(200, userCreated, "User Register Successfully")
    )

})


export {registerUser}