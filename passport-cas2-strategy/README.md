# passport-cas

A CAS2 authentication strategy for [PassportJS](http://www.passportjs.org/) authentication middleware. This code was written based on the code in the [passport-cas](https://github.com/sadne/passport-cas) module and has been adapted specifically for Harvard Library.

## Install

    $ npm install @harvard-library/passport-cas2-strategy

#### Configure Strategy

    const passport = require('passport');
    const Cas2Strategy = require('@harvard-library/passport-cas2-strategy').Strategy;

    passport.use(new Cas2Strategy({
      ssoBaseUrl: process.env.CAS_SSO_BASE_URL,
      ssoLoginUrl: process.env.CAS_SSO_LOGIN_URL,
      validateEndpoint: process.env.CAS_VALIDATE_ENDPOINT,
      appServiceUrl: process.env.CAS_APP_SERVICE_URL
    }, (user, done) => {

        let email, eppn;

        // Check if all required user object properites were returned by the CAS server
        if (!user || !user.mail) {
          done(`Missing required user properties from the authentication server.`);
          return null;
        } else {
          email = user.mail;
        }

        // Check if email address exists in database here...

        console.log(`Authentication completed successfully ${email}`);

        // Return user object properties
        const payload = {
          EmailAddress: email,
        };

        done(null, payload);
        return null;

      }

    ));

#### Authenticate Requests

    // GET: '/cas_login'
    exports.casLogin = function(req, res, next) {

      passport.authenticate('cas2', function (err, user, info) {
        // Authentication strategy callback
        console.log(`passport.authenticate ${user} ${info}`);

        // Check error
        if (err) {
          console.error(err);
          return res.status(500).json(err);
        }

        /* AUTHENTICATION FAILED */
        // Check if user empty
        if (!user) {
          const message = info ? info : `Authentication failed`;
          // Render server side unauthorized page with error message
          return res.status(401).render('unauthorized', {
            error: true,
            errorMsg: message
          });
        }

        /* AUTHENTICATION SUCCESS */

        // Create session or generate JWT token here...

        // Redirect
        return res.redirect(200, '/');

      })(req, res, next);

    }

## CAS 2.0 configuration

### ssoBaseUrl
* CAS server base URL
* e.g. https://www.example.com

### ssoLoginUrl
* CAS server login url
* e.g. https://www.example.com/cas/login

### validateEndpoint
* CAS validation endpoint (this will be appended to ssoBaseUrl)
* e.g. /cas/serviceValidate

### appServiceUrl
* Application URL
* CAS server must be configured to allow the application service url
* After successful authentication, browser is redirected back to this url
* e.g. https://exampleapp.com/login

## License

[The MIT License](http://opensource.org/licenses/MIT)