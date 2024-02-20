const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true });

router.use(authController.checkLogedIn);

router
    .route('/')
    .get(reviewController.getAllReviews)
    .post(
        authController.restrictTo('user'),
        reviewController.setTourAndUserIds,
        reviewController.createReview,
    );

router
    .route('/:id')
    .delete(
        authController.restrictTo('admin', 'user'),
        reviewController.deleteReview,
    )
    .patch(
        authController.restrictTo('admin', 'user'),
        reviewController.updateReview,
    )
    .get(reviewController.getReview);
module.exports = router;
