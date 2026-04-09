import { response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"


const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }


    } catch (error) {
        throw new apiError(500, "something went wrong while generating refersh token and access token")
    }
}







const registerUser = asyncHandler(async (req, res) => {


    // get user details from frontend;
    // validation-not empty
    // check if user  already exist  exist:username
    //check  for images ,check for avatar 
    // upload them  to cloudinary ,avatar
    //create a  user object - create entry in db 
    // remove password and refresh token from response
    //  check for user creation 
    // return response 
    const { fullname, email, username, password } = req.body

    // console.log("email:", email)

    if ([fullname, email, username, password].some((field) =>
        field?.trim() === "")) {
        throw new apiError(400, "All fields are required")
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        throw new apiError(400, "Invalid email format");
    }

    const existedUser = await User.findOne({


        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new apiError(409, "User with  this username and email has been already existed. ")



    }

    // console.log(req.files);


    const avatarLocalPath = req.files?.avatar[0]?.path;
    //   const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {


        coverImageLocalPath = req.files.coverImage[0]?.path;


    }

    if (!avatarLocalPath) {
        throw new apiError(406, "avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new apiError(404, "avatar file is required")
    }


    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })


    const createdUser = await User.findById(user._id).select(

        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new apiError(500, "something went wronf while registering the user  ")
    }



    return res.status(201).json(

        new ApiResponse(200, createdUser, "User registered successfullly")
    )




})

const loginUser = asyncHandler(async (req, res) => {

    // req body  se data  leke aaw
    // username or email based login
    // find the user
    // password check 
    //access and refresh token 
    //send cookie
    // send success message that user login successfully

    const { email, username, password } = req.body

    if (!username || !email) {
        throw new apiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (!user) {
        throw new apiError(400, "User does not exist")
    }


    const isPasswordValid = await user.isPasswordCorrect(password)


    if (!isPasswordValid) {
        throw new apiError(401, "Invalid user credentials")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)


    const loggedInUser = await User.findById(user._id)

    select("-password -refreshToken")

    const options = {
        httpOnly:true,
        secure:true
    }


    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,{
            user:loggedInUser,accessToken,refreshToken
            
        },

        "User Logged in successfully"
    )
    )





})

const logoutUser  = asyncHandler(async(req,res)=>{

 await  User.findByIdAndUpdate(
    req.user._id,
    {
         $set:{
            refreshToken
         }
    },{
        new:true
    }
  )

  const options = {
    httpOnly:true,
    secure:true
  }

  return res
  .status(200)
  .clearCookie("accessToken",options)
  .clearCookie("refreshToken",options)
  .json(new ApiResponse(200, {}, "User logged Out"))



})

export { registerUser, loginUser, logoutUser }
