import { response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js"
import { User } from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse} from "../utils/ApiResponse.js"

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

    console.log("email:", email)

    if ([fullname, email, username, password].some((field) =>
        field?.trim() === "")) {
        throw new apiError(400, "All fields are required")
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        throw new apiError(400, "Invalid email format");
    }

    const existedUser = User.findOne({


        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new apiError(409, "User with  this username and email has been already existed. ")



    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new apiError(406,"avatar is required")
  }

 const avatar =  await uploadOnCloudinary(avatarLocalPath)
  const coverImage =  await uploadOnCloudinary(coverImageLocalPath)

   if(!avatar){
    throw new apiError(404,"avatar file is required")
   }


  const user = await  User.create({
      fullname,
      avatar:avatar.url,
      coverImage:coverImage?.url || "",
      email,
      password,
      username:username.toLowerCase()
  })


  const createdUser =  await User.findById(user._id).select(
   
    "-password -refreshToken"
)

if(!createdUser){
    throw new apiError(500,"something went wronf while registering the user  ")
}



 return res.status(201).json(

    new ApiResponse(200,createdUser,"User registered successfullly")
 )




})

export { registerUser }
