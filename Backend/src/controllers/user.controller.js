import User from '../models/user.model.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import otpGenerator from 'otp-generator';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import { uploadToCloudinary } from '../config/cloudinary.js';

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findOne({ _id: userId });
        if (!user) {
            throw new ApiError(404, 'User not found');
        }
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();
        // console.log({ accessToken, refreshToken });
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, error.message);
    }
};

// Define schema and model for OTP
const otpSchema = new mongoose.Schema({
    email: String,
    otp: String,
    createdAt: { type: Date, expires: '5m', default: Date.now }
});

const OTP = mongoose.model('OTP', otpSchema);

const generateOTP = async (req, res) =>{
    const { email } = req.body;

    if (!email) {
        return ApiResponse.error(res, {
            statusCode: 400,
            message: 'Email is required',
            error: 'Please provide an email address'
        });
    }

    const otp = otpGenerator.generate(6, {
        digits: true,
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false,
    });

    try {
        await OTP.create({ email, otp });

        // Send OTP via email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        const response = await transporter.sendMail({
            from: process.env.EMAIL,
            to: email,
            subject: 'OTP Verification',
            text: `Your OTP for verification for Absens is: ${otp}`,
        });

        if (response.rejected.length > 0) {
            return ApiResponse.error(res, {
                statusCode: 500,
                message: 'Failed to send OTP',
                error: 'Email delivery failed'
            });
        }

        return ApiResponse.success(res, {
            statusCode: 200,
            message: 'OTP sent successfully',
            data: { email }
        });

    } catch (error) {
        console.error(error);
        return ApiResponse.error(res, {
            statusCode: 500,
            message: 'Error sending OTP',
            error: error.message
        });
    }
}

const verifyOtp = async (req, res) => {
    const { email, otp } = req.body;

    try {
        const otpRecord = await OTP.findOne({ email, otp }).exec();
        // console.log(otpRecord)

        if (otpRecord) {
            return ApiResponse.success(res, {
                statusCode: 200,
                message: 'OTP verified successfully',
                data: { verified: true }
            });
        } else {
            return ApiResponse.error(res, {
                statusCode: 400,
                message: 'Invalid OTP',
                error: 'The OTP you entered is incorrect or has expired'
            });
        }
    } catch (error) {
        console.error(error);
        return ApiResponse.error(res, {
            statusCode: 500,
            message: 'Error verifying OTP',
            error: error.message
        });
    }
}

const getUsers = asyncHandler(async (req, res) => {
    const users = await User.find().select('-password -refreshToken');
    if (!users) {
        throw new ApiError(404, 'No users found');
    }
    return res.status(200).json(new ApiResponse(200, 'Users found', users));
});

const registerUser = async (req, res) => {
    // Destructure form data from req.body
    const { password, email, fullname, gender } = req.body;

    // Simple validation
    if (!password || !email) {
        throw new ApiError(400, 'Password and email are required');
    }

    try {
        // Check for existing user
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new ApiError(409, 'User already exists');
        }

        // Extract username from email (everything before the '@')
        const extractedUsername = email.split('@')[0];

        // Ensure gender value matches the schema's enum
        const formattedGender = gender
            ? gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase()
            : 'Others';

        // Create new user, using the extracted username
        const user = await User.create({
            username: extractedUsername, // Use extracted username from email
            password,
            email,
            fullname: fullname || '',
            gender: formattedGender,
        });

        if (!user) {
            throw new Error('User creation returned null or undefined');
        }

        await user.populate('reportedCases missingCases');

        // Generate tokens using the helper function
        const { accessToken, refreshToken } =
            await generateAccessAndRefreshToken(user._id);

        // Prepare user data for response (omit sensitive info)
        const userData = {
            _id: user._id,
            username: user.username,
            email: user.email,
            gender: user.gender,
            fullname: user.fullname,
            createdAt: user.createdAt,
            avatar: user.avatar,
            reportedCases: user.reportedCases,  // now contains full SightingReport docs
            missingCases: user.missingCases,    // now contains full MissingPerson docs
        };

        // Return a successful response including tokens
        return ApiResponse.success(res, {
            statusCode: 201,
            message: 'Registration successful',
            data: {
                user: userData,
                accessToken,
                refreshToken,
            },
        });
    } catch (error) {
        return ApiResponse.error(res, {
            statusCode: 500,
            message: error.message,
            data: {},
        });
    }
};

const loginUser = asyncHandler(async (req, res) => {
    try {
        const { password, email } = req.body;

        // Validate input
        if (!email) {
            return ApiResponse.error(res, {
                statusCode: 400,
                message: 'Email is required',
                error: 'Please provide an email address'
            });
        }

        if (!password) {
            return ApiResponse.error(res, {
                statusCode: 400,
                message: 'Password is required',
                error: 'Please provide a password'
            });
        }

        const extractedUsername = email.split('@')[0];
        const username = extractedUsername;

        // Find user
        const user = await User.findOne({
            $or: [{ username }, { email }],
        });

        // User not found - return 404
        if (!user) {
            return ApiResponse.error(res, {
                statusCode: 404,
                message: 'User not found',
                error: 'No account exists with this email address'
            });
        }

        // Check password
        const isMatch = await user.isPasswordCorrect(password);

        // Password doesn't match - return 401
        if (!isMatch) {
            return ApiResponse.error(res, {
                statusCode: 401,
                message: 'Incorrect password',
                error: 'The password you entered is incorrect'
            });
        }

        // Generate tokens
        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
            user._id,
        );

        // Save the refresh token on the user model
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        // Retrieve the user data without sensitive information
        const newUser = await User.findById(user._id)
            .select('-password')
            .populate('reportedCases missingCases');

        // Error retrieving user data
        if (!newUser) {
            return ApiResponse.error(res, {
                statusCode: 500,
                message: 'Error logging in user',
                error: 'Failed to retrieve user data after authentication'
            });
        }

        // Cookie options (adjust secure flag for local testing)
        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
        };

        // Set cookies and return the response
        res.cookie('refreshToken', refreshToken, options)
           .cookie('accessToken', accessToken, options);

        return ApiResponse.success(res, {
            statusCode: 200,
            message: 'User logged in successfully',
            data: { user: newUser, accessToken, refreshToken },
        });
    } catch (error) {
        console.error("Login error:", error);
        return ApiResponse.error(res, {
            statusCode: 500,
            message: 'An error occurred during login',
            error: error.message
        });
    }
});

import jwt from 'jsonwebtoken';

const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(401, 'Unauthorized');
  }

  // Verify the refresh token
  try {
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    // If verification fails, the refresh token is expired or invalid.
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    throw new ApiError(401, 'Session expired. Please log in again.');
  }

  // Find the user associated with the provided refresh token.
  const user = await User.findOne({ refreshToken });
  if (!user) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    throw new ApiError(401, 'Session expired. Please log in again.');
  }

  // Generate new tokens - both access and refresh tokens
  // This extends the session with each refresh
  const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
    await generateAccessAndRefreshToken(user._id);

  // Set the new tokens as cookies
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  };

  res.cookie('accessToken', newAccessToken, options);
  res.cookie('refreshToken', newRefreshToken, options);

  // Retrieve the updated user data (without sensitive info)
  const newUser = await User.findById(user._id).select('-password');
  if (!newUser) {
    throw new ApiError(500, 'Error refreshing token');
  }

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Token refreshed successfully',
    data: {
      user: newUser,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    },
  });
});


const logOutUser = asyncHandler(async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.user) {
            throw new ApiError(401, 'Unauthorized');
        }

        // Clear refresh token in database
        await User.findByIdAndUpdate(
            req.user._id,
            {
                $set: {
                    refreshToken: '',
                },
            },
            {
                new: true,
                select: '-password',
            },
        );

        // Cookie options for clearing cookies
        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
            path: '/',
        };

        // Clear cookies and send success response
        return res
            .status(200)
            .clearCookie('accessToken', options)
            .clearCookie('refreshToken', options)
            .json(new ApiResponse(200, {}, 'User logged out successfully'));
    } catch (error) {
        console.error('Logout error:', error);
        return ApiResponse.error(res, {
            statusCode: error.statusCode || 500,
            message: 'Error during logout',
            error: error.message
        });
    }
});

const updateUserProfile = asyncHandler(async (req, res) => {
    try {
        const { fullname, email, gender } = req.body;

        if (!req.user) {
            throw new ApiError(401, 'Unauthorized access');
        }

        // Validate inputs
        if (!fullname || !email) {
            throw new ApiError(400, 'Full name and email are required');
        }

        // Format gender to match enum values
        const formattedGender = gender
            ? gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase()
            : 'Others';

        // Check if email is being changed and if it's already in use
        if (email !== req.user.email) {
            const existingUser = await User.findOne({ email, _id: { $ne: req.user._id } });
            if (existingUser) {
                throw new ApiError(409, 'Email is already in use');
            }
        }

        // Update user
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            {
                $set: {
                    fullname,
                    email,
                    gender: formattedGender
                }
            },
            { new: true }
        ).select('-password -refreshToken');

        if (!updatedUser) {
            throw new ApiError(404, 'User not found');
        }

        return ApiResponse.success(res, {
            statusCode: 200,
            message: 'Profile updated successfully',
            data: updatedUser
        });
    } catch (error) {
        if (error instanceof ApiError) {
            return ApiResponse.error(res, {
                statusCode: error.statusCode,
                message: error.message,
                error: error.message
            });
        }

        return ApiResponse.error(res, {
            statusCode: 500,
            message: 'Error updating profile',
            error: error.message
        });
    }
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    try {
        if (!req.user) {
            throw new ApiError(401, 'Unauthorized access');
        }

        if (!req.file) {
            throw new ApiError(400, 'Avatar image is required');
        }

        // Upload image to Cloudinary
        const avatarUrl = await uploadToCloudinary(
            req.file.buffer,
            req.file.mimetype.split('/')[1]
        );

        if (!avatarUrl) {
            throw new ApiError(500, 'Error uploading avatar');
        }

        // Update user with new avatar URL
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            {
                $set: {
                    avatar: avatarUrl
                }
            },
            { new: true }
        ).select('-password -refreshToken');

        if (!updatedUser) {
            throw new ApiError(404, 'User not found');
        }

        return ApiResponse.success(res, {
            statusCode: 200,
            message: 'Avatar updated successfully',
            data: updatedUser
        });
    } catch (error) {
        if (error instanceof ApiError) {
            return ApiResponse.error(res, {
                statusCode: error.statusCode,
                message: error.message,
                error: error.message
            });
        }

        return ApiResponse.error(res, {
            statusCode: 500,
            message: 'Error updating avatar',
            error: error.message
        });
    }
});

// Get user profile with populated data
const getUserProfile = asyncHandler(async (req, res) => {
    try {
        if (!req.user) {
            throw new ApiError(401, 'Unauthorized access');
        }

        // Fetch user with populated reportedCases and missingCases
        const user = await User.findById(req.user._id)
            .select('-password -refreshToken')
            .populate('reportedCases missingCases');

        if (!user) {
            throw new ApiError(404, 'User not found');
        }

        return ApiResponse.success(res, {
            statusCode: 200,
            message: 'User profile fetched successfully',
            data: user
        });
    } catch (error) {
        if (error instanceof ApiError) {
            return ApiResponse.error(res, {
                statusCode: error.statusCode,
                message: error.message,
                error: error.message
            });
        }

        return ApiResponse.error(res, {
            statusCode: 500,
            message: 'Error fetching user profile',
            error: error.message
        });
    }
});

export {
    getUsers,
    registerUser,
    loginUser,
    logOutUser,
    refreshToken,
    generateOTP,
    verifyOtp,
    updateUserProfile,
    updateUserAvatar,
    getUserProfile,
};
