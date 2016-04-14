/**
 *
 * config = {
 *  onTouchMove: function(){}, //the function will be call after touchMove occur
    onTouchEnd: function(){}, //the function will be call after touchEnd occur
    border:{
      width:window.screen.width, //touch区域的宽度限制
      height:window.screen.height //touch区域的高度限制
    }, //宽/高滚动区域外层将会被限制为这个值
    wrap:doc.body, //touch区域的外层，会被绑定touch事件
    direction: "horizontal" //要实现的滚动方向
 * }
 * var container = document.querySelector('#content');
 * var pageTouch = new TouchInit(container,config);  
 *
 */


;(function( window,$ ) {
  "use strict";

  // help the minifier
  var doc = document,
      win = window;

  // requestAnimationFrame polyfill
  (function() {
      var lastTime = 0;
      var vendors = ['ms', 'moz', 'webkit', 'o'];
      for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
          window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
          window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] 
                                     || window[vendors[x]+'CancelRequestAnimationFrame'];
      }
   
      if (!window.requestAnimationFrame)
          window.requestAnimationFrame = function(callback, element) {
              var currTime = new Date().getTime();
              var timeToCall = Math.max(0, 16 - (currTime - lastTime));
              var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
                timeToCall);
              lastTime = currTime + timeToCall;
              return id;
          };
   
      if (!window.cancelAnimationFrame)
          window.cancelAnimationFrame = function(id) {
              clearTimeout(id);
          };
  }());


  // tools
  function extend( destination, source ) {

    var property;

    for ( property in source ) {
      destination[property] = source[property];
    }

    return destination;

  }

  function proxy( fn, context ) {

    return function() {
      return fn.apply( context, Array.prototype.slice.call(arguments) );
    };

  }

  function addEventListener(container, event, callback) {
    if ($) {
      $(container).on(event, callback);
    } else {
      container.addEventListener(event, callback, false);
    }
  }

  function removeEventListener(container, event, callback) {
    if ($) {
      $(container).off(event, callback);
    } else {
      container.removeEventListener(event, callback, false);
    }
  }

  var  defaultConfig = {
    onTouchMove: function(){},
    onTouchEnd: function(){},
    border:{
      width:window.screen.width,
      height:window.screen.height
    }, //宽/高滚动区域外层将会被限制为这个值
    wrap:doc.body, //
    direction: "horizontal"
  },

  isTouch = 'ontouchstart' in win,

  startEvent = isTouch ? 'touchstart' : 'mousedown',
  moveEvent = isTouch ? 'touchmove' : 'mousemove',
  endEvent = isTouch ? 'touchend' : 'mouseup',

  supports = (function() {
    var div = doc.createElement('div'),
       vendors = 'Khtml Ms O Moz Webkit'.split(' '),
       len = vendors.length;

    return function( prop ) {
      if ( prop in div.style ) return true;

      prop = prop.replace(/^[a-z]/, function(val) {
         return val.toUpperCase();
      });

      while( len-- ) {
         if ( vendors[len] + prop in div.style ) {
            return true;
         }
      }
      return false;
    };
  })(),

  supportTransform = supports('transform');

  var TouchInit = function(container,config){
    var defaultCongigCopy = extend( {}, defaultConfig );

    this.config = extend(defaultCongigCopy, config);
    this.container = container;
    this.wrap = this.config.wrap;
    this.onTouchMove = proxy(this.config.onTouchMove, this);
    this.onTouchEnd = proxy(this.config.onTouchEnd, this);

    this._scroll = supportTransform ? this._scrollWithTransform : this._scrollWithoutTransform;

    this._onStart = proxy( this._onStart, this );
    this._onMove = proxy( this._onMove, this );
    this._onEnd = proxy( this._onEnd, this );
    this.scrollBorder  = { x: 0, y: 0 };//record the border
    this.wrapWidth = this.config.border.width;
    this.wrapHeight = this.config.border.height;

    this.init();
  }

  /**
   * Returns an object containing the coordinates for the event, normalising for touch / non-touch.
   * @param {Object} event
   * @returns {Object}
   */
  function getCoords(event) {
    // touch move and touch end have different touch data
    var touches = event.touches,
        data = touches && touches.length ? touches : event.changedTouches;

    return {
      x: isTouch ? data[0].pageX : event.pageX,
      y: isTouch ? data[0].pageY : event.pageY
    };
  }


  function setStyles( element, styles ) {

    var property,
        value;

    for ( property in styles ) {

      if ( styles.hasOwnProperty(property) ) {
        value = styles[property];

        switch ( property ) {
          case "height":
          case "width":
          case "marginLeft":
          case "marginTop":
            value += "px";
        }

        window.requestAnimationFrame(function(){
          element.style[property] = value;
        })  

      }

    }

    return element;

  }

  extend(TouchInit.prototype, {

        init: function(){

          addEventListener(this.container, startEvent, this._onStart);
          this.coordinates = {
            x:0,
            y:0
          }

          if(this.config.direction == 'horizontal'){
            this.wrap.style.width = this.config.border.width+'px';
          }else{
            this.wrap.style.height = this.config.border.height+'px';
          }
        },

        _onStart: function(event) {

          event = event.originalEvent || event;

          addEventListener(doc.body, moveEvent, this._onMove);
          addEventListener(doc.body, endEvent, this._onEnd);

          this.startCoords = getCoords(event); // for performance , store start coords

        },

        _onMove: function( event ) {
          var distance = {
            x: 0,
            y: 0
          };

          event = event.originalEvent || event;

          // ensure swiping with one touch and not pinching
          if ( event.touches && event.touches.length > 1 || event.scale && event.scale !== 1) return;

          event.preventDefault();

          distance = this._getDistance(event);
          this.coordinates = this._getCoordinate(distance.direction, distance.x, distance.y);
          this._scroll( this.coordinates );
           
          this.onTouchMove(); 
        },

        _onEnd: function( event ) {

          event = event.originalEvent || event;

          this.startCoords = { x: 0, y: 0 };

          this._resetScrollBorder();

          this._scroll( this.scrollBorder );
          
          // do what you want to do
          this.onTouchEnd();

          removeEventListener(doc.body, moveEvent, this._onMove);
          removeEventListener(doc.body, endEvent, this._onEnd);

        },

        _getDistance: function(event){
          var coords = getCoords(event),//touch coordinates
            x = coords.x - this.startCoords.x,// moved distance,
            y = coords.y - this.startCoords.y;

          var distanceData = {
            x: 0,
            y: 0
          };
          if ( this.config.direction === "horizontal" ) {
            distanceData.x = x;
            distanceData.direction = x > 0 ? "right" : "left";
          } else {
            distanceData.y = y;
            distanceData.direction = y > 0 ? "down" : "up";
          }

          return distanceData;//add direction
        },

        _getCoordinate: function(direction, x, y ) {
          var coordinates = {
            x: x,
            y: y
          };

          switch ( direction ) {

            case "right":
              if ( this.scrollBorder.x>=0 ) {
                coordinates.x = Math.round((x - this.scrollBorder.x) / 5 );
                return coordinates;
              }
              break;

            case "left":
              // scroll after right border,divide by 5 is to slow speed
              if ( this.container.offsetWidth - this.wrapWidth <= Math.abs(this.scrollBorder.x) ) {
                coordinates.x = Math.round( -(this.container.offsetWidth - this.wrapWidth) + x / 2 );
                return coordinates;
              }
              break;

            case "down":
              if ( this.scrollBorder.y >= 0 ) {
                coordinates.y = Math.round( (y - this.scrollBorder.y) / 5 );
                return coordinates;
              }
              break;

            case "up":// todo: 快速滑动会导致this.scrollBorder.y是上次的值，但是this.coordinates.y特别大，滚动太多
              if ( this.container.offsetHeight- this.wrapHeight <= Math.abs(this.scrollBorder.y) ) {
                coordinates.y = Math.round( -(this.container.offsetHeight - this.wrapHeight) + y / 5 );
                return coordinates;
              }
            break;
          }

          return {
            x: this.scrollBorder.x + x,
            y: this.scrollBorder.y + y
          };
        },

        _resetScrollBorder: function(){
          var coordinates = this.coordinates;

          if(coordinates.x>0){
            this.scrollBorder.x = 0;
          }else if (-coordinates.x >= this.container.offsetWidth - this.wrapWidth){
            this.scrollBorder.x = -(this.container.offsetWidth - this.wrapWidth);
          }else{
            this.scrollBorder.x = this.coordinates.x;
          }

          if(coordinates.y>0){
            this.scrollBorder.y = 0;
          }else if (-coordinates.y >= this.container.offsetHeight - this.wrapHeight){
            this.scrollBorder.y = -(this.container.offsetHeight - this.wrapHeight);
          }else{
            this.scrollBorder.y = this.coordinates.y;
          }
          
        },

        _scrollWithTransform: function ( coordinates ) {
          var style = this.config.direction == "horizontal"? "translateX(" + coordinates.x + "px)": "translateY(" + coordinates.y + "px)";

          setStyles( this.container, {
            "-webkit-transform": style,
            "-moz-transform": style,
            "-ms-transform": style,
            "-o-transform": style,
            "transform": style
          });

        },

        _scrollWithoutTransform: function( coordinates ) {
          var styles =  { "marginLeft": coordinates.x } ;

          setStyles(this.container, styles);
        }
  })

  window.TouchInit = TouchInit;

})(window,window.jQuery || window.Zepto)
