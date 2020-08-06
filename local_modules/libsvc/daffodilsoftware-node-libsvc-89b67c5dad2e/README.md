# libsvc


```

INFO:   name: libsvc
        version: 1.0.0
        depends on: lodash, bluebird, cron, tv4, winston, body-parser, error-stack-parser

NODE:   Nodejs version 6.3.0 or greater.

TESTS:  npm test: 120 passing (1s)

```

# About
 
> With libsvc in place, writing a simple web service is as simple as placing "Route" (HTTP request handler) files in a directory.

libsvc is a set of utilities that when used correctly, alleviates the common boilerplate code that is required on top of `expressjs`.

## Installation

It can be downloaded as an archive file and kept with rest of project code.

1. [Download archive file](https://bitbucket.org/daffodilsoftware/node-libsvc/get/master.tar.gz) and place it as `libsvc.tar.gz` in `local_modules` directory of project.

2. Add as a local npm dependency: `npm install ./local_modules/libsvc.tar.gz  --save`

## Overview

![Architecture](https://bitbucket.org/daffodilsoftware/node-libsvc/downloads/architecture.png)

## Simple Usage

Project file structure:

```

webServiceDir
| routes // Route files go here
|    | handleLoginRequest.js
|
| startup // Startup files go here
|    | runAtStart.js
|
| schedule // Schedule files go here
|    | runEveryHour.js
|
| app.js // application file

```

Typical *app.js:* (Promises style)

``` javascript

const libsvc = require('libsvc');

const app = express();

libsvc.boot(__dirname, app)
        .then((app) => app.listen(8080))
        .catch((err) => throw err);

```

Alternatively, (callback style)

``` javascript

const libsvc = require('libsvc');

const app = express();

libsvc.boot(__dirname, app).asCallback((err,app) => {
    if(err){
        throw err;
    }else{
        app.listen(8080);
    }
});

```

----

## Custom boot options

``` javascript

libsvc.boot(rootDir, app, options)

```

The optional third parameter (`options`) of `libsvc.boot()` may contain:

1. `routesDir` - path of custom routes directory, relative to service root directory. Default is `routes`.
2. `startupDir` - path of custom startup directory, relative to service root directory. Default is `startup`.
3. `scheduleDir` - path of custom schedule directory, relative to service root directory. Default is `schedule`.
4. `configDir` - path of custom config directory, relative to service root directory. Default is `config`.
                 Use `null` to disable initialization of [libsvc.getConfig()](#getconfig) functionality.
5. `preMountHook` - if defined, this function is called with each Route, before Route is mounted. Default is `undefined`.

----

## Route

``` javascript

new Route(method, path, options)

```

Routes are placed in `routes` directory (or the directory specified by `routesDir` in boot options).
Routes in this directory are automatically mounted on service boot.

A Route is defined with an HTTP method , a route path and a chain of middleware functions that execute one after the other.
See [`expressjs` documentation](http://expressjs.com/en/4x/api.html) to learn  about request handlers and middleware chains.  

#### Middleware

``` javascript

function(request, response, next)

```

Middleware functions are provided to route's `use()` method. It supports chained method calls.
This helps divide route functionality in discrete processing steps.

Example (using promises style):

``` javascript

const libsvc = require('libsvc');
const Route = libsvc.Route;
const cmw = require('./commonMiddleware');

// define a "GET:/cars/:carId" route and export it
const getCarById = new Route('get','/cars/:carId');
module.exports = getCarById;

// first step: some common middleware function
getCarById.use(cmw);

// next step: find the requested car
getCarById.use( (req,res,next) => {
    Car.findById({_id:req.params.carId})
        .then( (car) => {
            res.locals.car = car;
            next();
    }).catch(next);
})

// next step: get dealers for that car make
getCarById.use( (req,res,next) => {
    Dealers.find({make:res.locals.car.make})
        .then((dealers) => {
            res.locals.car.dealers = dealers;
            next();
        }).catch(next);
})

// next step: we have everything we need, send response
getCarById.use((req,res,next) => {
    res.json(res.locals.car.toJSON());
});

```

#### Validation

Route also support enforcing JSON schema validation of inputs.

Methods `validateBody()`, `validateQuery()` and `validateParams()`
accept JSON Schema to validate request body, url query and path paramerters respectively.

See [`tv4` documentation](https://github.com/geraintluff/tv4) for more details about JSON schema validation.  

Example:

``` javascript

const libsvc = require('libsvc');
const Route = libsvc.Route;

const createCar = new Route('post','/cars');
module.exports = createCar;

// validate request body
createCar.validateBody({
    type:'object',
    properties:{
        'name':{type:'string'},
        'year':{type:'number', min:2000 },
        'soldOn':{type:'string', format:'date'}
    },
    required:['name']
})

// next step: create a car 
createCar.use((req,res,next) => {
    Car.create(req.body)
        .then((car) => {
            res.json(car.toJSON());
        }).catch(next);
})

```

Additional formats can be also enabled to be used in Route validation by calling `addFormat()` on `Route` constructor/class. 
See [documentation of `tv4.addFormat()`](https://github.com/geraintluff/tv4#addformatformat-validationfunction) for more info.

``` javascript

/** before all other code **/

const Route = require('libsvc').Route;

// Either
Route.addFormat('decimal-digits', (data, schema) => {
    return typeof data === 'string' && !/^[0-9]+$/.test(data) ? null : 'must be string of decimal digits';
});

// Or
Route.addFormat({
    'my-format': function () {...},
    'other-format': function () {...}
});

```

There are some extra formats already built in:

1. `date` : anything parse-able to a valid Date Object
2. `nonEmptyOrBlank` :  string with something to read. i.e not empty or blank
3. `numberString` : string parse-able to a number
4. `booleanString` : true or false string
5. `email` : email address


#### JSON body parsing

A Route automatically parses JSON body if request has content type of `application/json`. 
This can be disabled by passing extra options to Route constructor. Also, JSON parsing options can be provided. 
See [`body-parser.json()` documentation](https://www.npmjs.com/package/body-parser) for options.   

Options parameter may contain:

1. `parseJson` : enable auto parsing body of requests with json content type. Default is true.
2. `parseOptions` : options specific to body-parser.json() module. Default is undefined.

Example (no auto parse):

``` javascript

const libsvc = require('libsvc');
const Route = libsvc.Route;

const options = {
    parseJson: false // request body will not be parsed even if of type `application/json`
}
const echo = new Route('post', '/echo', options);
module.exports = echo;

// parse body yourself
echo.use( (req, res, next) => {
    req.body = myCustomParser.parse(req);
});

```

Example: (limit JSON size):
    
``` javascript

const libsvc = require('libsvc');
const Route = libsvc.Route;

const options = {
    parseJson: true,
    parseOptions:{ limit:'10kb' } // only accept JSON upto 10kb in size
}
const limited = new Route('post', '/limited', options);
module.exports = limited;

```

#### Metadata

A Route instance can save custom metadata about it using `setMeta()` which is later accessible via Route's `meta` property.

Example:

``` javascript

const libsvc = require('libsvc');
const Route = libsvc.Route;

const getPosts = new Route('get', '/posts');

getPosts.setMeta({
    'isPublic' : true;
})

console.log(getPosts.meta); //-> {'isPublic': true}

// OR 

getPosts.setMeta({
    'permissions': ['getPosts'];
})

console.log(getPosts.meta); //-> {'permissions': ['Post.list']}

```

#### Pre-mount hook

The `options` parameter of `libsvc.boot(dir,app, options)` can contain a `preMountHook` function.
If provided, this function will be called with each `Route` instance that is going to be mounted 
from app's `routes` directory. Thus, using this hook one can  apply arbitrary pre-processing on 
routes before they are mounted on `app` instance.

Example:

``` javascript

const libsvc = require('libsvc');
const authCheck = require('./authCheck');
const app = express();

/**
 * If route metadata has protected flag, 
 * add an auth checking middleware before existing route middlewares
 */
function setupRouteAuth(route){
    if(route.meta & route.meta.protected){
        route.prepend(authCheck);
    }
}

// boot options
const options = {
    'preMountHook': setupRouteAuth
}

// boot
libsvc.boot(__dirname, app)
        .then(function(app){
            app.listen(8080);
        })
        .catch(function(err){
            throw err;
        });

```

-----

## Chain

A `Chain` is a sequence of expressjs style middleware functions with behavior similar to expressjs middleware stack.

Middleware functions can be added to end via `append()`, or start via `prepend()`.
Then, the function `Chain.asFn` represents all middlewares in chain as a single middleware function.

Example:

``` javascript

const libsvc = require('libsvc');
const Chain = libsvc.Chain;

// define a chain
const c = new Chain();

// add middleware
c.append((req,res,next) => {
    console.log('middleware 1', req, res);
    next();
});

// add another middleware
c.prepend((req,res,next) => {
    console.log('middleware 2', req, res);
    next();
});

// run chain as a single middleware fumction
c.asFn('myReq','myRes', (err) => {});

// OUTPUT:
// middleware 2 myReq myRes 
// middleware 1 myReq myRes 

```

Thus, this class can be used to compose a middleware function, from a sequence of different middleware functions.  

> Hint: `Route` **is** a `Chain` as its extends `Chain` class.

-----

## Startup

``` javascript

new Startup(taskFn, options)

```

Startup tasks are placed in `startup` directory (or the directory specified by `startupDir` in boot options).
Tasks in this directory are automatically run on service boot.

Each startup takes a task function of signature: `function(app,done){}`.
The first parameter passed to task function is express app instance.
The second parameter passed to task function is completion/done callback.
The task function is supposed to do its processing and call `done` callback when finished, passing any error to it as well.
Startup task has a priority 0 and a default default timeout (10 sec). This is configurable using `options` parameter. 

 The options parameter can contain:

 1. `priority` : can be increased to make tasks run prior to others. default is 0.
 2. `timeout`: task function must complete (call done) within this millisecond limit. default is 10000 ms. 

Example:

``` javascript

const libsvc = require('libsvc');
const Startup = libsvc.Startup;

function runAtBoot(app, done) {
    console.log("STARTUP!");
    done();
}

const options = { priority: 100 , timeout:20000 };

module.exports = new Startup(runAtBoot, options);

```

----

## Schedule

``` javascript

new Schedule(cronTime, jobFn, options)

```

Schedule jobs are placed in `schedule` directory (or the directory specified by `scheduleDir` in boot options).
Jobs in this directory are automatically run as per each job's schedule, as long as service runs.

Schedule takes a cron time (cron format String or a Date instance) and a job function with signature: `function(app){}`
The first parameter to job function is express app instance.
The job function is supposed to perform/trigger required processing. 

Options parameter may contain:

1. `timeZone` - set timezone for execution e.g. `America/Los_Angeles`. Default is system timezone.
2. `retry` - set false to stop scheduled if a job run fails. Default is true.

Example:

``` javascript

const libsvc = require('libsvc');
const Schedule = libsvc.Schedule;

function every5Sec(app) {
    console.log('SCHEDULE!');
}

const options = {
    timezone: 'UTC',
    retry: false
};

module.exports = new Schedule('*/5 * * * * *', every5Sec, options);

```

See [`cron` documentation](https://www.npmjs.com/package/cron) for cron time format.

----

## Errors
 
The `libsvc.boot()` setup automatically appends a *error handling middleware* to the app. 
So, any errors propagated down the middleware chain (for example, from routes) will be 
logged and returned to clients in a standard format.


### ApiError

``` javascript

const ApiError = require('libsvc').ApiError;

```

`ApiError` is provided as the standard type for throwing/propagating API level errors.
It adds some functionality over `Error` type that is useful when building web API's:

1. `withStatus()` : HTTP status to be sent via response for ApiError.
2. `withCode()` : API specific error `code` sent in response.
3. `withDetail()` : Arbitrary error `detail` sent in response.

Example middleware:

``` javascript

function keyCheck(req, res, next){
    if('mykey' === req.query['apiKey']){
        next();
    }else{
        next( new ApiError('No api key').withCode('UNAUTHORIZED').withStatus(401).withDetail('Unauthorized') );
    }
}
module.exports = keyCheck;

```

Example Route (Promises style):

``` javascript

const libsvc = require('libsvc'); 
const ApiError = libsvc.ApiError;
const Route = libsvc.Route;
const User = require('../models/User');

// define a signup route
const signup = new Route('post', '/signup');
module.exports = signup;

// validate request body
signup.validateBody({
    'type':'object',
    
    'properties': {
        'email': { type:'string', format:'email' },
        'password': { type:'string', format:'nonEmptyOrBlank' }
    },

    'required': [ 'email', 'password' ]
});

// ensure email is not already registered
signup.use( (req, res, next) => {
    User.getForEmail(req.body.email)
        .then((user) => {
        if(user){
            // already registered
            throw new ApiError('User exists')
                            .withStatus(403)
                            .withCode('ERR_EMAIL_EXISTS')
                            .withDetail('Email is already registered.');
        }else{
            // proceed
            return next();
        }  
        }).catch(next); // send errors to next()
});

// create new user
signup.use(function(req, res, next){
    User.create(req.body.email, req.body.password)
        .then( (user) => {
            // user created
            res.json(user.toJSON());
            return next();
        }).catch(next);
});

```

### Error handling

Errors propagated via `next()` from upstream middleware and are picked up by error handling middleware.

Error handling middleware automatically converts other error types to ApiError standard 
and clients receive a standard response:

``` javascript

{
    "isError": true,
    "code": "ERR_EMAIL_EXISTS"
    "detail": "Email is already registered."
}

```

A limited support to extract details of `mongoose.js` errors (specifically validation and duplicate index) is also supported.

All errors are logged to [`winston` module](https://github.com/winstonjs/winston). 
Hence it is recommended that app project uses `winston` for logging. 
It is then possible to re-route logs from console (default) to another `transport` if there is such need.

----

## getConfig

``` javascript

const libsvc = require('libsvc');
const getConfig = libsvc.getConfig;

```

`getConfig` is a utility function that provides application configuration from a set of JSON files from a `config` directory.

#### Auto Initialization

Typically, configuration data is loaded by default from `config` directory in app root by `libsvc.boot()`.

The config directory should contain a `default.json` file with default configuration for app. 
Environment specific config files which can override any parts of `default.json` can also be placed in config directory,

For Example, if a config directory contains files:

```

config
    |
    | default.json // {a: 1, b: 1}
    |
    | development.json // {b: 2}
    |
    | production.json // {b: 3}

```

then, if `NODE_ENV` environment variable is set to `development`:

``` javascript

getConfig(); // {a: 1, b: 2}

```

else, if `NODE_ENV` environment variable is set to `production`:

``` javascript

getConfig(); // {a: 1, b: 3}

```

and if no specific environment is set, just `default.json` is used:

``` javascript

getConfig(); // {a: 1, b: 1}

```

#### Accessing Config Values

Simply calling `getConfig()` will return entire configuration object.
To get a specific config value, the key path can be specified as arguments.

For example, if configuration structure is:

``` javascript

{
    "server":{
        "http":{
            "port":80
        },
        "https":{
            "port":443,
            "cert":"server.pem"
        }
    }
}

```

Then, configuration values can be obtained as:

``` javascript

// using keys separated by a .
getConfig('server.https.port'); // 443

// using keys as an Array
getConfig(['server', 'https', 'port']); // 443

// Using keys as arguments 
getConfig('server', 'https', 'port'); // 443

```

If a key path does not exists, `getConfig()` throws an Error. 
This is to discourage usage of undefined config values in application code. 

#### Immutable

All objects obtained from `getConfig()` are immutable. I.e. config values cannot be altered by application code. 
This is to discourage using app config as a shared state or temporary placeholder.

#### Custom Config Directory

A custom config directory path can be specified by passing `configDir` property in `options` parameter of `libsvc.boot()`

``` javascript

const libsvc = require('libsvc');
const path = require('path');

const app = express();

const options = {
    'configDir' : path.join(__dirname,'myConfig');
};

libsvc.boot(__dirname, app, options).asCallback((err,app) => {
    if(err){
        throw err;
    }else{
        app.listen(8080);
    }
});

```

#### Manual Initialization

It is also possible to disable automatic loading of config files during `libsvc.boot()`. 
For this, set `configDir` property of `options` parameter of `libsvc.boot()` to `null`.

To manually initialize, call `getConfig.init()` once before all other app code:

``` javascript

/** before all other code **/

const path = require('path');
const libsvc = require('libsvc');
const getConfig = libsvc.getConfig;

// path to configuration directory
const configDir = path.join(__dirname,'config'); 

// manual init
getConfig.init(configDir);

```

Additionaly, environment can be also specified:

``` javascript

// manual init with specific environment
getConfig.init(configDir, 'production');

```

----