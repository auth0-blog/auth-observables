(function() {

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
      var username = document.querySelector('#username').value;
      var password = document.querySelector('#password').value;
      return "username=" + username + "&password=" + password;
    });

  // We need a stream for getting the JWT from the server which will
  // require us to pass in credentials 
  var getJwtStream = loginStream
    // flatMap flattens the new stream such that we can get access
    // to JSON data returned from the fetch operation
    .flatMap(function(credentials) {
      // We can easily turn a promise into an observable with fromPromise
      return Rx.Observable.fromPromise(getJwt(credentials))
    });

  // Here we want to map the endpoint for where we'll get our public quotes
  var quoteStream = quoteClickStream
    .map({url: 'http://localhost:3001/api/random-quote'});

  // We also need a separate stream for the secret quotes and in this
  // case we need to include the JWT from local storage
  var secretQuoteStream = secretQuoteClickStream
    .map(function() {
      var jwt = localStorage.getItem('id_token');
      return {
        url: 'http://localhost:3001/api/protected/random-quote',
        jwt: jwt
      }
    });  

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

  // We need a function to handle the fetch request for the JWT
  function getJwt(credentials) {

    // We need some config to specify that this is to be a POST request
    // We set the content type and put the passed-in credentials as the body
    var config = {
      method: 'POST',
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: credentials
    }

    return fetch('http://localhost:3001/sessions/create', config).then(function(data) {
      return data.json().then(function(jwt) {
        return jwt;
      });
    });
  }

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

    return fetch(request.url, config).then(function(data) {
      return data.text().then(function(text) {
        return text;
      });
    });
  }
  
  // Finally, we need to subscribe to the streams to observe events as
  // they happen. We can observe the getJwtStream for returned JWTs and
  // set them in local storage
  getJwtStream.subscribe(function(jwt) {
    localStorage.setItem('id_token', jwt.id_token);
  });

  // We subscribe to the quoteResponseStream, listen
  // for quotes that get returned, and put them on the page
  quoteResponseStream.subscribe(function(text) {
    document.querySelector('.container h1').innerHTML = text;
  });

})();