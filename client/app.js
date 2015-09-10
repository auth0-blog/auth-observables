(function() {

  Rx.Observable.prototype.authenticate = function(config) {

    // We need a function to handle the fetch request for the JWT
    function getJwt(config) {

      var body;
      // Check the content type header and format the request data accordingly
      if(config.headers['Content-Type'] === 'application/json') {
        if(config.provider === 'Auth0') {
          body = JSON.stringify({
              client_id: config.client_id,
              username: config.username,
              password: config.password,
              connection: config.connection,
              grant_type: config.grant_type,
              scope: config.scope
            });          
        }
      }
      if(config.headers['Content-Type'] === 'application/x-www-form-urlencoded') {
        body = 'username=' + config.username + '&password=' + config.password;
      }

      // We need some config to specify that this is to be a POST request
      // We set the content type and put the passed-in credentials as the body
      var init = {
        method: config.method,
        headers: config.headers,
        body: body
      }

      return fetch(config.loginPath, init).then(function(data) {
        return data.json().then(function(jwt) {
          localStorage.setItem('id_token', jwt.id_token);
        });
      });        
    }

    return this.flatMap(function(credentials) {
      return Rx.Observable.fromPromise(getJwt(credentials));
    });    
  }

  Rx.Observable.prototype.authenticated = function(route) {

    var jwt = localStorage.getItem('id_token');
    
    // Return the JWT if it exists
    if(jwt != undefined && jwt != null) {
      return this.map(function() {
        return {
          route: route,
          jwt: jwt
        }
      });
    }
    // If there is no JWT, throw an error
    else return Rx.Observable.throw(new Error('No JWT in Local Storage!'));
  }

  // Selectors for our buttons
  var loginButton = document.querySelector('#login-button');  
  var quoteButton = document.querySelector('#quote-button');
  var secretQuoteButton = document.querySelector("#secret-quote-button");

  // We can create streams from click events on our buttons using
  // Rx's 'fromEvent' method
  var quoteClickStream = Rx.Observable.fromEvent(quoteButton, 'click');
  var secretQuoteClickStream = Rx.Observable.fromEvent(secretQuoteButton, 'click');
  var loginClickStream = Rx.Observable.fromEvent(loginButton, 'click');  
  
  // .map will create a new stream that is dependent on the first
  // and will project a value that we pass it. The login stream needs to
  // map a string that contains values from the username and password input boxes
  var loginStream = loginClickStream
    .map(function() {
      var loginPath = 'http://localhost:3001/sessions/create';
      var username = document.querySelector('#username').value;
      var password = document.querySelector('#password').value;
      var method = 'POST';
      var headers = { 'Content-Type':'application/x-www-form-urlencoded' };
      return {
        loginPath: loginPath,
        username: username,
        password: password,
        method: method,
        headers: headers
      }

      // var provider = 'Auth0';
      // var loginPath = 'https://samples.auth0.com/oauth/ro'
      // var client_id = 'BUIJSW9x60sIHBw8Kd9EmCbj8eDIFxDC';
      // var username = document.querySelector('#username').value;
      // var password = document.querySelector('#password').value;
      // var connection = 'Username-Password-Authentication';
      // var grant_type = 'password';
      // var scope = 'openid';
      // var headers = { 'Content-Type':'application/json' };
      // var method = 'POST';
      // return {
      //   provider: provider,
      //   loginPath: loginPath,
      //   client_id: client_id,
      //   connection: connection,
      //   grant_type: grant_type,
      //   scope: scope,
      //   username: username,
      //   password: password,
      //   method: method,
      //   headers: headers
      // }
    })
    .authenticate(function(config) {
      return config;
    });

  // Here we want to map the endpoint for where we'll get our public quotes
  var quoteStream = quoteClickStream
    .map(function() {
      return {
        route: 'http://localhost:3001/api/random-quote'
      }
    });

  // We need a separate stream for the secret quotes which
  // checks authentication
  var secretQuoteStream = secretQuoteClickStream
    .authenticated('http://localhost:3001/api/protected/random-quote');      

  // We need a response stream that handles the fetch operation
  var quoteResponseStream = quoteStream
    .flatMap(function(request) {
      return Rx.Observable.fromPromise(fetchQuote(request));
    })
    // Instead of setting up a separate stream for the secret quotes, we
    // can simply merge the secretQuoteStream in and apply the same flatMap
    .merge(secretQuoteStream
      .flatMap(function(request) {
        return Rx.Observable.fromPromise(fetchQuote(request));
      })
    );

  // One fetch function will handle getting both the public and private quotes 
  function fetchQuote(request) {
    // We just need to check whether a JWT was sent in as part of the
    // config object. If it was, we'll include it as an Authorization header
    if(request.jwt) {
      var config = {
        headers: {
          "Authorization": "Bearer " + request.jwt
        }
      }
    }

    return fetch(request.route, config).then(function(data) {
      return data.text().then(function(text) {
        return text;
      });
    });
  }

  // Finally, we need to subscribe to the streams to observe events as they happen.
  loginStream.subscribe();

  // We subscribe to the quoteResponseStream, listen
  // for quotes that get returned, and put them on the page
  quoteResponseStream.subscribe(function(text) {
    document.querySelector('.container h1').innerHTML = text;
  });

})();