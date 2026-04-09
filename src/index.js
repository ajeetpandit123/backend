
import dotenv from "dotenv"
import connectDB from "./db/dbConnect.js";
import { app } from "./app.js";

dotenv.config({
    path: "./env"
})

connectDB()
    .then(()=>{
         app.listen(process.env.PORT || 8000,()=>{
            console.log(`server is running on ${process.env.PORT}`);
            
         })
    })
    .catch(() => {
        console.log("mongodb connection failed");

    })


