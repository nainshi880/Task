import User from "../models/User.js";

class AuthRepository {

  async createUser(data) {

    return await User.create(data);

  }

  async findByEmail(email) {
 
    return await User.findOne({
      email,
    }).select("+password");

  }

  async findById(id) {

    return await User.findById(id);

  }

  async updateUser(id,data){

return await User.findByIdAndUpdate(

id,

data,

{
new:true,
runValidators:true
}

);

}

async saveResetToken(userId, token, expiry) {

    return await User.findByIdAndUpdate(
        userId,
        {
            resetPasswordToken: token,
            resetPasswordExpires: expiry,
        },
        {
            new: true,
        }
    );

}


async findByResetToken(hashedToken) {

    return await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: {
            $gt: Date.now(),
        },
    }).select("+password");

}

async clearResetToken(userId) {

    return await User.findByIdAndUpdate(
        userId,
        {
            resetPasswordToken: undefined,
            resetPasswordExpires: undefined,
        },
        {
            new: true,
        }
    );

}

async saveVerificationToken(userId, token, expiry) {

    return await User.findByIdAndUpdate(
        userId,
        {
            emailVerificationToken: token,
            emailVerificationExpires: expiry,
        },
        {
            new: true,
        }
    );

}

async findByVerificationToken(token) {

    return await User.findOne({
        emailVerificationToken: token,
        emailVerificationExpires: {
            $gt: Date.now(),
        },
    });

}

async incrementTokenVersion(userId) {
    return await User.findByIdAndUpdate(
        userId,
        { $inc: { tokenVersion: 1 } },
        { new: true }
    );
}

}

export default new AuthRepository();