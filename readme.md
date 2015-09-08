# Authenticable Observables

This is the sample application for Auth0's tutorial on doing [authentication with observables](#). The app calls a NodeJS backend for public and private Chuck Norris quotes, all through the use of observables.

## Installation

1. Do `git submodule update --init` to pull the NodeJS API into the `server` directory
2. `cd` into `server` and do `npm install`
3. Run the Node server by doing `node server.js`
4. `cd` into `client` and serve app with a local web server
5. Navigate to the app in your browser

## Important Snippets

In this example app, we create streams for nearly everything. We also create new streams from others and project values using `map` and `flatMap`.

```js
var secretQuoteStream = secretQuoteClickStream
  .map(function() {
    var jwt = localStorage.getItem('id_token');
    return {
      url: 'http://localhost:3001/api/protected/random-quote',
      jwt: jwt
    }
  });
```
We use the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) for data retrieval and for `POST`ing credentials to get a JWT back.

```js
function getJwt(credentials) {

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
```

After all the streams are setup, we subscribe to them and observe the events that are emitted. We can do whatever we want with the emitted events, and for the case of the JWTs, we set them in local storage. For the retrieved quotes, we simply display them on the screen.

```js
getJwtStream.subscribe(function(jwt) {
  localStorage.setItem('id_token', jwt.id_token);
});

quoteResponseStream.subscribe(function(text) {
  document.querySelector('.container h1').innerHTML = text;
});
```

## License

MIT

## What is Auth0?

Auth0 helps you to:

* Add authentication with [multiple authentication sources](https://docs.auth0.com/identityproviders), either social like **Google, Facebook, Microsoft Account, LinkedIn, GitHub, Twitter, Box, Salesforce, amont others**, or enterprise identity systems like **Windows Azure AD, Google Apps, Active Directory, ADFS or any SAML Identity Provider**.
* Add authentication through more traditional **[username/password databases](https://docs.auth0.com/mysql-connection-tutorial)**.
* Add support for **[linking different user accounts](https://docs.auth0.com/link-accounts)** with the same user.
* Support for generating signed [Json Web Tokens](https://docs.auth0.com/jwt) to call your APIs and **flow the user identity** securely.
* Analytics of how, when and where users are logging in.
* Pull data from other sources and add it to the user profile, through [JavaScript rules](https://docs.auth0.com/rules).

## Create a Free Auth0 Account

1. Go to [Auth0](https://auth0.com) and click Sign Up.
2. Use Google, GitHub or Microsoft Account to login.