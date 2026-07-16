import mongoose from "mongoose";
import bcrypt from "bcrypt";
import ROLES from "../constants/roles.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },

    phone: {
    type: String,
    trim: true,
    },

    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.CUSTOMER,
    },

    avatar: {
      type: String,
      default: null,
    },

    city: {
      type: String,
      default: "",
    },

    address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
   },

    isVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    resetPasswordToken: {
      type: String,
    },

    resetPasswordExpires: {
      type: Date,
    },

    emailVerificationToken: {
    type: String,
   },

     emailVerificationExpires: {
    type: Date,
   },

    lastLogin: {
      type: Date,
    },

    loginHistory: [
  {
    ip: {
      type: String,
    },

    userAgent: {
      type: String,
    },

    loginTime: {
      type: Date,
      default: Date.now,
    },

    failedLoginAttempts: {
    type: Number,
    default: 0,
    },

    accountLockedUntil: {
    type: Date,
     },

     profileCompleted: {
    type: Boolean,
    default: false,
    },

    availability: {
    type: Boolean,
    default: true,
   },

    rating: {
    type: Number,
    default: 5,
   },

    location: {

   type: {
type: String,
default:"Point"
},
coordinates:[Number]

}
  },
  ],
  },

  {
    timestamps: true,
  },

);

userSchema.pre("save", async function (next) {

  if (!this.isModified("password")) {
    return next();
  }

  this.password = await bcrypt.hash(
    this.password,
    10
  );

  next();

});

userSchema.methods.comparePassword =
async function(password){

return await bcrypt.compare(
password,
this.password
);

};

userSchema.methods.toJSON =
function(){

const user=this.toObject();

delete user.password;

delete user.resetPasswordToken;

delete user.resetPasswordExpires;

delete user.emailVerificationToken;

delete user.emailVerificationExpires;

return user;

};


const User = mongoose.model(
  "User",
  userSchema
);

export default User;