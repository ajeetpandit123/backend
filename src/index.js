
import dotenv from "dotenv"
import connectDB from "./db/dbConnect.js";

dotenv.config({
    path:"./env"
})

connectDB()
