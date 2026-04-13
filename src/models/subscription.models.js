import mongoose, { mongo, Schema } from "mongoose";
import User from "./user.models.js"


const subscriptionSchema = new Schema({

     subscriber:{
         type:mongoose.Schema.Types.ObjectId,
         ref:"User",
         required:true

     },
     channel:{
         type:mongoose.Schema.Types.ObjectId,
         ref:"User",
         required:true
     }


}
    
    
    
    
    
    
    ,{timestamps:true})

export const subscription =  mongoose.model("subscription",subscriptionSchema)