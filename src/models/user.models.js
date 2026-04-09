import mongoose,{Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";





const userSchema = new Schema({
    

    username:{
        type:String,
        required:[true,"username is required"],
        unique:[true,"username has already taken"],
        lowercase:[true,"username must be in lowercase"],
        trim:true,
        index:true 
    },
     email:{
        type:String,
        required:[true,"email is required"],
        unique:[true,"email has already taken"],
        lowercase:[true,"email must be in lowercase"],
        trim:true,
        
    },
    fullname:{
        type:String,
        required:[true,"Fullname is required"],
        trim:true,
        index:true
        
    },
    avatar:{
        type:String, // claudinary url
         required:[true,"avatar is required"] 
        
        
    },
    coverImage:{
         type:String,

    },
    watchHistory:[
        {
            type:Schema.Types.ObjectId,
            ref:"video"
        }
    ],
    password:{
        type:String,
        required:[true,"password is required"],

    },
    refreshToken:{
         type:String,
    }

    

           
},
{timestamps:true}
)



userSchema.pre("save",async function (){
   
       if(!this.isModified("password")) 
        
        return;

        

    this.password =  await bcrypt.hash(this.password,10)
   


})


userSchema.methods.isPasswordCorrect = async function (password){
    return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken = function(){


   return  jwt.sign(
        {
            _id:this._id,
            email:this.email,
            username:this.username,
            fullname:this.fullname

        },
        process.env.ACCESS_TOKEN_SECRET,
        {
         expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        }
    )


}

userSchema.methods.generateRefreshToken = function(){


      return  jwt.sign(
        {
            _id:this._id,
           

        },
        process.env.REFRESH_TOKEN_SECRET,
        {
         expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )

}


export const User = mongoose.model("User",userSchema)