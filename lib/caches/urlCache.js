var events = require('events');
var eventEmitter = new events.EventEmitter();

function urlCache()
{
    var pendingRequests = new Array();
    var cacheObject = new Array();

    this.reserve = function( _key ) {
        pendingRequests[_key] = 1;
    }

    this.unreserve = function( _key ) {
        delete pendingRequests[_key];
    }

    this.isReserved = function( _key ) {
        return pendingRequests[_key];
    }


    /*****************************************
     *   Add - Add an item to the cache
     *****************************************/
    this.add = function( _key, _item )
    {
        if(!cacheObject[_key])
        {
            var _expires = new Date();
            _expires += (1000*60*60); //+1 hour
//            _expires = _expires.getTime() + (1000*10); //+10 seconds
            cacheObject[_key] = {
                data: _item,
                expires: _expires
            };
        }
    }

    /*****************************************
     *   Retrieve - Get an item from the cache
     *****************************************/
    this.retrieve = function( _key )
    {
        var response = null;
        var co = cacheObject[_key];
        if(co) {
            var now = new Date().getTime();
            if(co.expires < now) {
                //Expired
                this.remove(_key);
            }
            response = co.data;
        }

        return response;
    }

    /*****************************************
     *   Remove - Remove an item from the cache
     *****************************************/
    this.remove = function( _key )
    {
        if(cacheObject[_key])
        {
            delete cacheObject[_key];
        }
    }

    /*****************************************
     *   Clear - Clear the cache
     *****************************************/
    this.clear = function()
    {
        cacheObject = new Array();
    }


    /*****************************************
     *   GetCache - Return the entire cache
     *****************************************/
    this.getCache = function()
    {
        return cacheObject;
    }


    this.generateCacheKey = function( http_options )
    {
        return [http_options.host,http_options.path].join("/");
    }
}

module.exports = urlCache;