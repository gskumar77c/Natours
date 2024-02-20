/* eslint-disable arrow-body-style */
/* eslint-disable import/no-extraneous-dependencies */
const { promisify } = require('util');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
// const { decode } = require('punycode');
const Email = require('../utils/email');

const signToken = (id) =>
    jwt.sign({ id: id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });

const createAndSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);
    const cookieOptions = {
        expiresIn: new Date(
            Date.now() +
                process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
        ),
        httpOnly: true,
    };
    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
    res.cookie('jwt', token, cookieOptions);
    user.password = undefined;
    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user: user,
        },
    });
};
exports.signup = catchAsync(async (req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        passwordChangedAt: req.body.passwordChangedAt,
        role: req.body.role,
    });

    const url = `${req.protocol}://${req.get('host')}/me`;
    // console.log(url);
    await new Email(newUser, url).sendWelcome();

    createAndSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    // 1) check email and password exists.
    if (!email || !password) {
        return next(new AppError('must enter a email and password', 400));
    }

    // 2) check if user exists and password is correct
    const user = await User.findOne({ email: email }).select('+password');
    const isCorrectPassword = user
        ? await user.correctPassword(password, user.password)
        : undefined;
    if (!user || !isCorrectPassword)
        return next(new AppError('Incorrect email or password', 401));

    // 3) if everything is ok send jwt to client.
    createAndSendToken(user, 200, res);
});

exports.logout = (req, res) => {
    res.cookie('jwt', 'loggedout', {
        expiresIn: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });
    res.status(200).json({
        status: 'success',
    });
};

exports.checkLogedIn = catchAsync(async (req, res, next) => {
    let token;
    // 1) check the jwt token exists
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    if (!token) {
        return next(
            new AppError(
                `You are not logged in. Please login to get access.`,
                401,
            ),
        );
    }
    // 2) verifying the jwt token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) check if user exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser)
        return next(
            new AppError(`User belongs to this token does not exists`, 401),
        );

    // 4) check if user changed password after the token was issued.
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(
            new AppError(
                `User changed password recently. please login again`,
                401,
            ),
        );
    }

    req.user = currentUser;
    res.locals.user = currentUser;
    next();
});

// Only for rendered pages, no errors
exports.isLogginIn = async (req, res, next) => {
    if (req.cookies.jwt) {
        try {
            const decoded = await promisify(jwt.verify)(
                req.cookies.jwt,
                process.env.JWT_SECRET,
            );

            // 3) check if user exists
            const currentUser = await User.findById(decoded.id);
            if (!currentUser) return next();

            // 4) check if user changed password after the token was issued.
            if (currentUser.changedPasswordAfter(decoded.iat)) {
                return next();
            }

            // There is a logged in user
            res.locals.user = currentUser;
            // req.user = currentUser;
            return next();
        } catch (err) {
            return next();
        }
    }
    next();
};

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        // roles is an array
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError(
                    `You do not have permission to perform this action`,
                    403,
                ),
            );
        }
        next();
    };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
    // 1) get user based on email
    const user = await User.findOne({ email: req.body.email });
    if (!user)
        return next(new AppError('There is no user with the email', 404));

    // 2) generate the random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: true });

    // 3) send it to user's email
    try {
        const resetURL = `${req.protocol}://${req.get(
            'host',
        )}/api/v1/users/resetPassword/${resetToken}`;

        await new Email(user, resetURL).sendPasswordReset();
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: true });

        return next(
            new AppError('Error sending an email, please try agian later', 500),
        );
    }

    res.status(200).json({
        status: 'success',
        message: 'reset password link is sent to your email',
    });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    // 1) get user based on token
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });

    // 2) set the password if token is not expired
    if (!user)
        return next(new AppError('Token is invalid or has expired', 400));
    user.password = req.body.password;
    user.confirmPassword = req.body.confirmPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    // 3) Update the changed password
    // this is done in the userSchema middleware on saved documents

    // 4) Log the User in and send the jwt
    createAndSendToken(user, 200, res);
});

exports.changePassword = catchAsync(async (req, res, next) => {
    // 1) get the user
    const currentUser = await User.findById(req.user._id).select('+password');
    // 2) check if POSTed password is correct
    if (
        !req.body.password ||
        !req.body.currentPassword ||
        !req.body.confirmPassword
    )
        return next(
            new AppError('Please enter the current and new passwords', 400),
        );

    const { password, currentPassword, confirmPassword } = req.body;

    const isPasswordCorrect = await currentUser.correctPassword(
        currentPassword,
        currentUser.password,
    );
    if (!isPasswordCorrect) {
        return next(
            new AppError('Invalid password entered, please try again', 401),
        );
    }

    if (password === currentPassword)
        return next(
            new AppError(
                'New password can not be the same as the old password',
                400,
            ),
        );

    // 3) If so, update password
    currentUser.password = password;
    currentUser.confirmPassword = confirmPassword;
    currentUser.passwordChangedAt = Date.now();
    await currentUser.save();
    // 4) log user in and send the jwt
    createAndSendToken(currentUser, 200, res);
});
