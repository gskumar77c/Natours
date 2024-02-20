/* eslint-disable*/
const stripe = Stripe(
    'pk_test_51Ol8EuSBd6Sp7IszRIJAHF2DfjUsZosPbMOUlr1N1TzSotRAwBgghqYsvrqqmbjVoulbELVs6Ngaa7l9qIX9uj5N00EdXK0jTS',
);

const hideAlert = () => {
    const el = document.querySelector('.alert');
    if (el) el.parentElement.removeChild(el);
};

// type is success or error
const showAlert = (type, msg) => {
    hideAlert();
    const markup = `<div class="alert alert--${type}">${msg}</div>`;
    document.querySelector('body').insertAdjacentHTML('afterbegin', markup);
    window.setTimeout(hideAlert, 5000);
};

const login = async (email, password) => {
    try {
        const res = await axios({
            method: 'POST',
            url: 'http://127.0.0.1:3000/api/v1/users/login',
            data: {
                email,
                password,
            },
        });

        if (res.data.status === 'success') {
            showAlert('success', 'Logged in successfully');
            window.setTimeout(() => {
                location.assign('/');
            }, 1000);
        }
    } catch (err) {
        showAlert('error', err.response.data.message);
    }
};

const signup = async (name, email, password, confirmPassword) => {
    try {
        const res = await axios({
            method: 'POST',
            url: 'http://127.0.0.1:3000/api/v1/users/signup',
            data: {
                name,
                email,
                password,
                confirmPassword,
            },
        });

        if (res.data.status === 'success') {
            showAlert('success', 'Account created successfully');
            window.setTimeout(() => {
                location.assign('/');
            }, 1000);
        }
    } catch (err) {
        showAlert('error', err.response.data.message);
    }
};

const logout = async (email, password) => {
    try {
        const res = await axios({
            method: 'GET',
            url: 'http://127.0.0.1:3000/api/v1/users/logout',
        });
        if (res.data.status === 'success') location.reload(true);
    } catch (err) {
        showAlert('error', 'Logged out successfully');
    }
};

// type is either 'password' or 'data'
const updateSettings = async (data, type) => {
    try {
        const url =
            type === 'password'
                ? 'http://127.0.0.1:3000/api/v1/users/changePassword'
                : 'http://127.0.0.1:3000/api/v1/users/updateMe';
        const res = await axios({
            method: 'PATCH',
            url,
            data,
        });
        if (res.data.status === 'success') {
            showAlert('success', `${type.toUpperCase()} updated sucessfully`);
        }
    } catch (err) {
        showAlert('error', err.response.data.message);
    }
};

const bookTour = async (tourId) => {
    try {
        // 1) Get checkout session from api
        const url = `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`;
        const session = await axios({
            method: 'GET',
            url,
        });

        console.log(session.data.session.id);
        // 2) create checout form + charge credit card
        const res = await stripe.redirectToCheckout({
            sessionId: session.data.session.id,
        });
        console.log(res);
        console.log('completed ', session.data.session.id);
    } catch (err) {
        showAlert('error', err);
    }
};

// DOM elements
const loginForm = document.querySelector('.form--login');
const signupForm = document.querySelector('.form--signup');
const logoutBtn = document.querySelector('.nav__el--logout');
const userDataForm = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-password');
const bookBtn = document.getElementById('book-tour');

// DELEGATION
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        login(email, password);
    });
}

if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        document.querySelector('.btn--singup').textContent = 'Processing';
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword =
            document.getElementById('confirmPassword').value;
        await signup(name, email, password, confirmPassword);
        document.querySelector('.btn--singup').textContent = 'SignUp';
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
}

if (userDataForm) {
    userDataForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const name = document.getElementById('name').value;
        const photo = document.getElementById('photo').files[0];
        const form = new FormData();
        form.append('name', name);
        form.append('email', email);
        form.append('photo', photo);
        console.log(form);

        updateSettings(form, 'data');
    });
}

if (userPasswordForm) {
    userPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        document.querySelector('.btn--save-password').textContent =
            'Updating...';
        const currentPassword =
            document.getElementById('password-current').value;
        const password = document.getElementById('password').value;
        const confirmPassword =
            document.getElementById('password-confirm').value;
        await updateSettings(
            { currentPassword, password, confirmPassword },
            'password',
        );
        document.getElementById('password-current').value = '';
        document.getElementById('password').value = '';
        document.getElementById('password-confirm').value = '';
        document.querySelector('.btn--save-password').textContent =
            'Save password';
    });
}

if (bookBtn) {
    bookBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.target.textContent = 'Processing...';
        const { tourId } = e.target.dataset;
        await bookTour(tourId);
        e.target.textContent = 'Book tour now!';
    });
}
