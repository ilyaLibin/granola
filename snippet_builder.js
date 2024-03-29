(function() {
  var granolaScript = localStorage.getItem('granola-debug-script') || 'https://analytics.exacti.us/granola.2.0.js'
  var Exactius = function () {}
  Exactius.prototype = {
    require: function (scripts, callback) {
      this.loadCount = 0;
      this.totalRequired = scripts.length;
      this.callback = callback;

      for (var i = 0; i < scripts.length; i++) {
        this.writeScript(scripts[i]);
      }
    },
    loaded: function (evt) {
      this.loadCount++;

      if (this.loadCount == this.totalRequired && typeof this.callback == 'function') this.callback.call();
    },
    writeScript: function (src) {
      var self = this;
      var s = document.createElement('script');
      s.type = "text/javascript";
      s.async = true;
      s.src = src;
      s.addEventListener('load', function (e) { self.loaded(e); }, false);
      var head = document.getElementsByTagName('head')[0];
      head.appendChild(s);
    }
  }

  new Exactius().require([
    granolaScript
  ],
    function () {
      window.granola = new Granola();
      granola.init('omaze_miami')
    });}
)()
