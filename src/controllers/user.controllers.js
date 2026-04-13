// Import required modules

import { asyncHandler } from "../utils/asyncHandler.js"; // auto try-catch wrapper
import { apiError } from "../utils/apiError.js"; // custom error handler
import { User } from "../models/user.models.js"; // user model
import { uploadOnCloudinary } from "../utils/cloudinary.js"; // image upload
import { ApiResponse } from "../utils/ApiResponse.js"; // response format
import jwt from "jsonwebtoken"; // token verify


// 🔐 Generate Access + Refresh Token
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        // find user by id
        const user = await User.findById(userId)

        // generate tokens using schema methods
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        // save refresh token in DB
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        // return both tokens
        return { accessToken, refreshToken }

    } catch (error) {
        throw new apiError(500, "Error while generating tokens")
    }
}


// 📝 Register User
const registerUser = asyncHandler(async (req, res) => {

    // get data from frontend
    const { fullname, email, username, password } = req.body

    // check empty fields
    if ([fullname, email, username, password].some((field) =>
        field?.trim() === "")) {
        throw new apiError(400, "All fields are required")
    }

    // validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new apiError(400, "Invalid email format");
    }

    // check existing user
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new apiError(409, "User already exists")
    }

    // get avatar path
    const avatarLocalPath = req.files?.avatar[0]?.path;

    // get cover image if exists
    let coverImageLocalPath;
    if (req.files?.coverImage?.length > 0) {
        coverImageLocalPath = req.files.coverImage[0]?.path;
    }

    if (!avatarLocalPath) {
        throw new apiError(406, "Avatar is required")
    }

    // upload images
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new apiError(404, "Avatar upload failed")
    }

    // create user
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // remove sensitive fields
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new apiError(500, "User creation failed")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})


// 🔑 Login User
const loginUser = asyncHandler(async (req, res) => {

    const { email, username, password } = req.body

    // require username or email
    if (!username && !email) {
        throw new apiError(400, "username or email is required")
    }

    // find user
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new apiError(400, "User does not exist")
    }

    // check password
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new apiError(401, "Invalid credentials")
    }

    // generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    // remove sensitive fields
    const loggedInUser = await User.findById(user._id)
        .select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, {
                user: loggedInUser,
                accessToken,
                refreshToken
            }, "User Logged in successfully")
        )
})


// 🚪 Logout User
const logoutUser = asyncHandler(async (req, res) => {

    // remove refresh token from DB
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        { new: true }
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


// 🔄 Refresh Token
const refreshAccessToken = asyncHandler(async (req, res) => {

    const incomingRefershToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefershToken) {
        throw new apiError(402, "Unauthorized request")
    }

    try {
        // verify refresh token
        const decodedToken = jwt.verify(
            incomingRefershToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new apiError(401, "Invalid refresh token")
        }

        // check token match with DB
        if (incomingRefershToken !== user?.refreshToken) {
            throw new apiError(401, "Refresh token expired or used")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        // ❗ FIX: correct destructuring (function returns refreshToken not newRefreshToken)
        const { accessToken, refreshToken: newRefreshToken } =
            await generateAccessAndRefreshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options) // ❗ FIX: correct cookie name
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access Token Refreshed"
                )
            )
    } catch (error) {
        throw new apiError(401, "Invalid Refresh token")
    }
})


// 🔒 Change Password
const changeCurrentPassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword } = req.body

    // ❗ FIX: store user in variable
    const user = await User.findById(req.user?._id)

    // ❗ FIX: use user (not User model)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new apiError(402, "Incorrect old Password")
    }

    // ❗ FIX: update password on user instance
    user.password = newPassword

    // ❗ FIX: save user instance (not User model)
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed Successfully"))
})


// 👤 Get Current User
const getCurrentUser = asyncHandler(async (req, res) => {

    // ❗ FIX: correct response format
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "current user fetched successfully"))
})


// ✏️ Update Account
const updateAccountDetails = asyncHandler(async (req, res) => {

    const { fullname, email } = req.body

    if (!fullname || !email) {
        throw new apiError(401, "all fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        // ❗ FIX: send updated user in response
        .json(new ApiResponse(200, user, "Account details updated Successfully"))
})


// 🖼️ Update Avatar
const updateUserAvatar = asyncHandler(async (req, res) => { // ❗ FIX: added req,res

    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new apiError(402, "avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new apiError(401, "Error while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "avatar Image uploaded successfully")
        )
})


// 🖼️ Update Cover Image
const updateUserCoverImage = asyncHandler(async (req, res) => { // ❗ FIX: added req,res

    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new apiError(402, "Cover Image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new apiError(401, "Error while uploading Cover Image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Cover Image uploaded successfully")
        )
})





const getUserChannelProfile = asyncHandler(async (req, res) => {

    const { username } = req.params

    if (!username?.trim) {
        throw new apiError(402, "Username is missing ")

    }

    const channel = User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        }, {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        }, {
            $addFields: {
                subscribersCount: {

                    $size: "$subscribers"
                },
                subscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "subscribers.subscriber"] },
                        then: true,
                        false: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                isSubscribedToCount: 1,
                subscribedToCount: 1,
                avatar: 1,
                coverImage: 1,
                email: 1

            }
        }


    ])




    if (!channel?.length) {
        throw new apiError(401, "channel does not exist")
    }
    return res
        .status(200)
        .json(new ApiResponse(200, channel[0], "User channel fetched successfully"))

})


const getWatchHistory = asyncHandler(async (req, res) => {


    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.types.objectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "Videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                owner:{
                    $first:"$owner"
                }
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(
        200,user[0].watchHistory,"Watch history get fetched successfully"
    ))


})




// export all controllers
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}