var events = require('events');
var eventEmitter = new events.EventEmitter();

var _cacheManager = null;
CacheManager.getInstance = function()
{
    if(!_cacheManager)
    {
        _cacheManager = new CacheManager();
        _cacheManager.loadCachingStrategy("urlCache");
    }

    return _cacheManager;
}


function CacheManager()
{
    var cachingStrategy = null;
    eventEmitter.setMaxListeners(0);

    /*********************************************************************
     *   loadCachingStrategy - Creates a new caching strategy from a given
     *                         name.
     *                         - _strategyName - name of strategy to use.
     *********************************************************************/
    this.loadCachingStrategy = function( _strategyName )
    {
        var strategy = require('./caches/'+_strategyName+'.js');
        cachingStrategy = new strategy();
    }

    /*********************************************************************
     *   addItemToCache - Add an item to the cache
     *********************************************************************/
    this.addItemToCache = function( data, request )
    {
        var cacheKey = cachingStrategy.generateCacheKey( request );
        cachingStrategy.add( cacheKey, data );
        if(cachingStrategy.isReserved(cacheKey)) {
            cachingStrategy.unreserve(cacheKey);
        }
        eventEmitter.emit(cacheKey, data);
    }

    /*********************************************************************
     *   removeItemFromCache - Remove an item from the cache
     *********************************************************************/
    this.removeItemFromCache = function( request )
    {
        var cacheKey = cachingStrategy.generateCacheKey( request );
        cachingStrategy.remove( cacheKey );
    }


    this.reserveCacheSpace = function( request ) {
        var cacheKey = cachingStrategy.generateCacheKey( request );
        cachingStrategy.reserve(cacheKey);
    }

    this.unReserveCacheSpace = function( request ) {
        var cacheKey = cachingStrategy.generateCacheKey( request );
        cachingStrategy.unreserve(cacheKey);
    }

    /*********************************************************************
     *   getItemFromCache - Get an item from the cache
     *********************************************************************/
    this.getItemFromCache = function( request, callback )
    {
        var cacheKey = cachingStrategy.generateCacheKey( request );
        var cacheObject = cachingStrategy.retrieve( cacheKey );
        if(!cacheObject) {
            if(cachingStrategy.isReserved(cacheKey)) {
                eventEmitter.once(cacheKey, function(data){
                    callback(data);
                });
            }
            else {
                callback(null);
            }
        }
        else {
//            console.log("hit!");
            callback(cacheObject);
        }
    }

    /*********************************************************************
     *   getCache - Retrieve the entire cache
     *********************************************************************/
    this.getCache = function()
    {
        return cachingStrategy.getCache();
    }
}


module.exports = CacheManager.getInstance();