const express = require('express');
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');
const reviewRouter = require('./reviewRoutes');

//const reviewController = require('../controllers/reviewController');

const router = express.Router();

// router.param('id', tourController.checkId);

router.use('/:tourId/reviews', reviewRouter);

router
    .route('/top-5-cheap')
    .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);
router
    .route('/monthly-plan/:year')
    .get(
        authController.checkLogedIn,
        authController.restrictTo('admin', 'lead-guide', 'guide'),
        tourController.getMontlyPlan,
    );

router
    .route('/')
    .get(tourController.getAllTours)
    .post(
        authController.checkLogedIn,
        authController.restrictTo('admin', 'lead-guide'),
        tourController.createTour,
    );
router
    .route('/:id')
    .get(tourController.getTour)
    .patch(
        authController.checkLogedIn,
        authController.restrictTo('admin', 'lead-guide'),
        tourController.uploadTourImages,
        tourController.resizeTourImages,
        tourController.updateTour,
    )
    .delete(
        authController.checkLogedIn,
        authController.restrictTo('admin', 'lead-guide'),
        tourController.deleteTour,
    );

router
    .route('/tours-within/:distance/center/:latlng/unit/:unit')
    .get(tourController.getToursWithIn);

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);
module.exports = router;
