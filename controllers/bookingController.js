const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require(`./../models/tourModel`);
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
    // 1) Get current Tour
    const tour = await Tour.findById(req.params.tourId);

    // 2) create checkout session
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        success_url: `${req.protocol}://${req.get('host')}/`,
        cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
        customer_email: req.user.email,
        client_reference_id: req.params.tourId,
        mode: 'payment',
        line_items: [
            {
                // name: `${tour.name} Tour`,
                price_data: {
                    currency: 'inr',
                    product_data: {
                        name: tour.summary,
                    },
                    unit_amount: tour.price * 100,
                },
                // description: tour.summary,
                // images: [
                //     `https://www.natours.dev/img/tours/${tour.imageCover}`,
                // ],
                // price: tour.price,
                // currency: 'usd',
                quantity: 1,
            },
        ],
    });

    // 3) create session as response
    res.status(200).json({
        status: 'success',
        session,
    });
    // res.redirect(303, session.url);
});
