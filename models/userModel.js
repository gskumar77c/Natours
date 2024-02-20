const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        require: [true, 'Please enter a name!'],
    },
    email: {
        type: String,
        unique: true,
        lowercase: true,
        require: [true, 'Please enter a email'],
        validate: [validator.isEmail, 'Please provide a valid email'],
    },
    photo: {
        type: String,
        default: 'default.jpg',
    },
    role: {
        type: String,
        enum: ['user', 'guide', 'lead-guide', 'admin'],
        default: 'user',
    },
    password: {
        type: String,
        require: [true, 'Please enter a valid password'],
        minlength: [8, 'password must have atleast 8 chars'],
        select: false,
    },
    confirmPassword: {
        type: String,
        require: [true, 'Please enter the confirm password'],
        select: false,
        validate: {
            // This only works on CREATE and SAVE !!!
            validator: function (el) {
                return el === this.password;
            },
            message: 'Passwords are not the same',
        },
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false,
    },
});

userSchema.pre('save', async function (next) {
    // only encrypt the passwod if it is modified or new password.
    if (!this.isModified('password')) return next();

    // hash the password with the cost of 12
    this.password = await bcrypt.hash(this.password, 12);
    // don't save the confirm password in database ( delete it)
    this.confirmPassword = undefined;
    next();
});

userSchema.pre('save', function (next) {
    if (!this.isModified('password') || this.isNew) return next();
    this.passwordChangedAt = Date.now() - 1000;
    next();
});

userSchema.methods.correctPassword = async function (
    candidatePassword,
    userPassword,
) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (jwtTimeStamp) {
    if (this.passwordChangedAt) {
        const changedTimeStamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10,
        );
        return jwtTimeStamp < changedTimeStamp;
    }
    return false;
};

userSchema.pre(/^find/, function (next) {
    // this points to the current query
    this.find({ active: { $ne: false } });
    next();
});

userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // expires in 10 min ( specify in ms)
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    console.log({ resetToken }, this.passwordResetToken);
    return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
