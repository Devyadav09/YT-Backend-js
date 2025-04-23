import mongoose, {Schema} from "mongoose"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"


const UserSchema = new Schema (
    
    {
        username: {
            type : String,
            required : true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true            // the index is used because to make the field searchable 
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullname:{
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        avatar:{
            type: String,        
            required: true,
        },
        coverImage:{
            type: String,
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        password: {
            type: String,
            required: true,
        },
        refreshToken: {
            type: String,
        }


    },
    {
        timestamps: true
    }

)


// this is pre hook in the model middleware to save the encrypt password 

UserSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password,10)
    next()
})


//  make the custom method to check the password is correct or not it return the True/False

UserSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password,this.password)
}

// make the custom method for the get the ACCESS TOKEN

UserSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id : this._id,
            email : this.email,
            username : this.username,
            fullname : this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn : process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}


// make the custom method for the get the refresh token

UserSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id : this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn : REFRESH_TOKEN_EXPIRY
        }
    )
}


export const User = mongoose.model("User",UserSchema)
