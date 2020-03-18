const passport = require('passport-strategy');
const util = require('util');
const qs = require('query-string');
const Url = require('url-parse');
const https = require('https');
const parseXmlString = require('xml2js').parseString;
const processors = require('xml2js/lib/processors');

/**
 * `Strategy` constructor.
 *
 * The cas2 strategy redirects the login request to a CAS server,
 * and after the user logs in the CAS server returns a ticket.
 * The strategy then passes the ticket with the service url
 * to the CAS server for validation,
 * parses the response and calls the `verify` callback with the results
 *
 *
 * Applications must supply a `verify` callback which accepts `user` object,
 * and then calls the `done` callback supplying a `user`,
 * which should be set to `false` if the credentials are not valid.
 * If an exception occurred, `err` should be set.
 *
 *
 * Options:
 *   - `ssoBaseUrl` SSO server Base URL e.g. https://www.exampleserver.com
 *   - `ssoLoginUrl` SSO server Login URL  e.g. https://www.exampleserver.com/cas/login
 *   - `validateEndpoint` SSO server Validate endpoint will be appended to the BaseURL automatically e.g. /cas/serviceValidate
 *   - `appServiceUrl` Application Service URL to be sent back to the CAS server during login and validation e.g. https://www.exampleapp.com/cas/login
 *
 *
 * @param {Object} options
 * @param {Function} verify
 * @api public
 */
function Strategy(options, verify) {

  if (typeof options == 'function') {
    verify = options;
    options = {};
  }

  if (!verify) { throw new TypeError('LocalStrategy requires a verify callback'); }

  // Set options
  this.ssoBaseUrl = options.ssoBaseUrl;
  this.ssoLoginUrl = options.ssoLoginUrl;
  this.validateEndpoint = options.validateEndpoint;
  this.appServiceUrl = options.appServiceUrl;

  // Call strategy
  passport.Strategy.call(this);

  this.name = 'cas2';
  this._verify = verify;
  this._passReqToCallback = options.passReqToCallback;

  const self = this;

  /**
   * Parse and validate the XML response from the CAS server
   */
  this._validate = function (req, data, verified) {

    // Initialize result
    let result;

    // Set XML parse options
    const xmlParseOpts = {
      'trim': true,
      'normalize': true,
      'explicitArray': false,
      'tagNameProcessors': [processors.normalize, processors.stripPrefix]
    };

    try {
      parseXmlString(data, xmlParseOpts, (error, result) => {

        if (error) {
          console.error(error);
          return verified(new Error(authError));
        }

        let user, authSuccess, authFailure, authError;

        // Check if authenticationsuccess element has a value
        authSuccess = result.serviceresponse && result.serviceresponse.authenticationsuccess ? true : false;
        // Check if authenticationfailure element has a value
        authFailure = result.serviceresponse && result.serviceresponse.authenticationfailure ? true : false;

        // Authentication success
        if (authSuccess && !authFailure) {
          // Extract user attributes
          user = result.serviceresponse.authenticationsuccess.attributes;

          // Verify callback
          if (self._passReqToCallback) {
            return self._verify(req, user, verified);
          } else {
            return self._verify(user, verified);
          }

        }

        // Authentication failed
        else if (authFailure) {
          // Extract auth failure value
          authError = result.serviceresponse.authenticationfailure;

          // Extract error code
          const errorCode = result.serviceresponse.authenticationfailure['$'].code;

          // Check error code
          if (errorCode === 'INVALID_TICKET') {
            return verified(null, false, { message: `Authentication timed out` });
          }

          return verified(null, false, { message: `Authentication failed` });

        }

        return verified(new Error());

      });
    } catch (err) {
      console.error(err);
      return verified(new Error(err));
    }

  }

}

/**
 * Inherit from `passport.Strategy`.
 */
util.inherits(Strategy, passport.Strategy);

/**
 * CAS 2.0
 *
 * @param {Object} req request object
 * @param {Object} options options passed in when calling authenticate
 */
Strategy.prototype.authenticate = function (req, options) {
  options = options || {};

  // Create the SSO login URL
  let loginUrl = new Url(this.ssoLoginUrl, true);
  // Add service url as a query parameter
  loginUrl.query.service = this.appServiceUrl;

  /**
   * Check if a ticket has been sent back from the CAS server,
   * if the user has not logged in yet, this parmater will be empty
   * After the user logs in, the CAS server will redirect back
   * to the application service url automatically,
   * providing the ticket in the request query `ticket` parameter
   */
  this.ticket = req.query['ticket'];

  // If no ticket is in the query parameter
  if (!this.ticket) {
    // Redirect to the cas login URL to get the ticket
    return this.redirect(loginUrl);
  }

  // Store a reference to this context
  const self = this;

  // Wrapper for verification callback
  const verified = function (err, user, info) {
    if (err) { return self.error(err); }
    if (!user) { return self.fail(info, 401); }
    self.success(user, info);
  }

  // Create the validation query string with ticket and service request parameters
  const validateQueryString = qs.stringify({
    service: this.appServiceUrl,
    ticket: this.ticket
  });

  // Generate the URL to send the service validation request
  const serviceValidateUrl = `${this.ssoBaseUrl}${this.validateEndpoint}?${validateQueryString}`;

  try {
    // Send a GET request to the service validation URL
    const request = https.get(serviceValidateUrl, (response) => {
      console.log(`STATUS: ${response.statusCode}`);
      console.log(`HEADERS: ${JSON.stringify(response.headers)}`);

      // Set encoding
      response.setEncoding('utf8');

      // Initialize variable to store data
      let rawData = '';

      // Capture each chunk of data in the response
      response.on('data', (chunk) => {
        // Append latest chunk to raw data
        rawData += chunk;
      });

      // All data has been received in the response
      response.on('end', () => {
        console.log(rawData);
        // Parse and validate the XML response
        return self._validate(req, rawData, verified);
      });

    });

    request.on('error', (err) => {
      return this.error(new Error(err));
    });

    request.end();

  } catch (e) {
    return this.error(new Error(e));
  }

};

exports.Strategy = Strategy;