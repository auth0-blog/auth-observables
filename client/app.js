(function() {

  Rx.Observable.prototype.authenticate = function(credentials) {

    // We need a function to handle the fetch request for the JWT
    function getJwt(credentials) {

      if(credentials) {
        var formattedCreds = "username=" + credentials.username + "&password=" + credentials.password;

        // We need some config to specify that this is to be a POST request
        // We set the content type and put the passed-in credentials as the body
        var config = {
          method: 'POST',
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formattedCreds
        }

        return fetch(credentials.loginPath, config).then(function(data) {
          return data.json().then(function(jwt) {
            localStorage.setItem('id_token', jwt.id_token);
          });
        });        
      }
    }    

    return this.flatMap(function(credentials) {
      return Rx.Observable.fromPromise(getJwt(credentials));
    });
  }

  Rx.Observable.prototype.authenticated = function(route) {

    var jwt = localStorage.getItem('id_token');
    
    if(jwt != undefined && jwt != null) {
      return this.map(function() {
        return {
          route: route,
          jwt: jwt
        }
      });
    }
    else {
      return this.map(function() {
        return {
          route: route
        }
      });
    }
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
      return {
        loginPath: loginPath,
        username: username,
        password: password
      }
    })
    .authenticate(function(credentials) {
      return credentials;
    });

  // Here we want to map the endpoint for where we'll get our public quotes
  var quoteStream = quoteClickStream
    .map(function() {
      return {
        route: 'http://localhost:3001/api/random-quote'
      }
    });

  // We also need a separate stream for the secret quotes and in this
  // case we need to include the JWT from local storage
  var secretQuoteStream = secretQuoteClickStream
    .authenticated('http://localhost:3001/api/protected/random-quote');  

  // We need a response stream that handles the fetch operation
  var quoteResponseStream = quoteStream
    .flatMap(function(url) {
      return Rx.Observable.fromPromise(fetchQuote(url));
    })
    // Instead of setting up a separate stream for the secret quotes, we
    // can simply merge the secretQuoteStream in and apply the same flatMap
    .merge(secretQuoteStream
      .flatMap(function(data) {
        return Rx.Observable.fromPromise(fetchQuote(data));
      })
    );  

  // One fetch function will handle getting both the public and private quotes 
  function fetchQuote(data) {
    // We just need to check whether a JWT was sent in as part of the
    // config object. If it was, we'll include it as an Authorization header
    if(data.jwt) {
      var config = {
        headers: {
          "Authorization": "Bearer " + data.jwt
        }
      }
    }

    return fetch(data.route, config).then(function(data) {
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