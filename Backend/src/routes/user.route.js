import { Router } from 'express';
import {
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
} from '../controllers/user.controller.js';
import upload from '../middlewares/upload.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.route('/').get((req, res) => {
    res.send('Hello World!');
});
router.route('/users').post(verifyToken, getUsers);

router.route('/register').post(registerUser);

router.route('/login').post(loginUser);

router.route('/logout').post(verifyToken, logOutUser);

router.route('/refresh_token').post(refreshToken);

router.route('/isAuthenticated').get(verifyToken, (req, res) => {
    if (!req.user) {
        return res
            .status(401)
            .json({ success: false, message: 'User is not authenticated' });
    }

    return res
        .status(200)
        .json({ success: true, message: 'User is authenticated' });
});

router.route('/get-otp').post(generateOTP);
router.route('/verify-otp').post(verifyOtp);

// Profile routes
router.route('/profile').get(verifyToken, getUserProfile);
router.route('/update-profile').put(verifyToken, updateUserProfile);
router.route('/update-avatar').put(verifyToken, upload.single('avatar'), updateUserAvatar);

export default router;
