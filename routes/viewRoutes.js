const express = require('express');
const viewController = require('../controllers/viewController');
const authController = require('../controllers/authController');
const router = express.Router();

router.get('/me', authController.checkLogedIn, viewController.getAccount);

router.use(authController.isLogginIn);

router.get('/', viewController.getOverview);
router.get('/tour/:slug', viewController.getTour);
router.get('/login', viewController.getLoginForm);
router.get('/signup', viewController.getSignupForm);

router.post(
    '/submit-user-data',
    authController.checkLogedIn,
    viewController.updateUserData,
);

module.exports = router;
