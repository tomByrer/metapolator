if(typeof Proxy === 'function')
    define('es6/Proxy', [], function() {return Proxy;});
else // typeof Proxy === 'object' => the old Proxy Proposal
    // mockup module, Proxy must be global
    // es6/Reflect patches it only
    define('es6/Proxy', ['es6/Reflect'], function(require) {return Proxy;});
