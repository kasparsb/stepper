//var Bezier = require('./bezier1.js');
/**
 * See https://easings.net
 */
var Bezier = require('./bezier2.js');

var Stepper = function(config) {
    this.defaultBezierCurve = [0,0,1,1];
    this.precision = 10000000;
    this.progress = 0;
    this.current = 0;
    this.requestId = 0;
    this.inProgress = false;

    this.config = config;

    this.setConfig();
}

Stepper.prototype = {
    setConfig: function(overrideConfig) {
        this.duration = this.getConfig('duration', overrideConfig);
        this.easing = this.getConfig('bezierCurve', overrideConfig);
        this.stepCallback = this.getConfig('onStep', overrideConfig);
        this.doneCallback = this.getConfig('onDone', overrideConfig);
        this.forceStopCallback = this.getConfig('onForceStop', overrideConfig);
    },

    run: function(overrideConfig) {
        this.setConfig(overrideConfig);

        this.current = 0;

        this.start();
        this.step();
    },

    /**
     * Run from given progress
     */
    runFrom: function(progress, overrideConfig) {
        this.setConfig(overrideConfig);

        /**
         * Šeit ir svarīgs moments
         * Padotais progress ir tāds, kādu gribam
         * bet easing aprēķinātais progress esošajā progress ir savādāk, jo 
         * tas ir curve un tas nav lineārs
         * Tāpēc šeit atrodam kādam ir jābūt progresam pēc easing
         *
         * Update pēc kāda laika lietošanas
         * Tomēr škiet, ka to nemaz nevajag darīt, jo ja es gribu sākt no
         * 0.9 progresa un duration ir 1000ms, tad es gribu, lai animācija
         * ir 100ms gara. Ja pārrēķina progresu, tad animācijas garums ir 
         * garāks vai īsāks
         */
        //progress = this.findStartProgress(progress, 0.1, 0, 1);
        
        this.startTime = +new Date();
        // Simulējam startTime, tā lai tas būtu sācies pirms norādītā progress
        this.startTime -= (this.duration * progress);
        // Turpinām no padotā progress
        this.progress = progress;

        this.inProgress = true;

        this.step();
    },

    /**
     * Meklējam kādam ir jābūt progress, lai pēc easing.get tas būt tāds pats kā progress
     */
    // findStartProgress: function(progress, step, from, to, inceptionLevel) {

    //     if (typeof inceptionLevel == 'undefined') {
    //         inceptionLevel = 0;
    //     }
        
    //     var d = from, prevR = 0, prevD;

    //     while (d < to) {
    //         // Lai ir lielāka precizitāte
    //         if (inceptionLevel++ > 100) {
    //             return d;
    //         }

    //         r = this.easing.get(d);

    //         if (Math.round(progress*this.precision) == Math.round(r*this.precision)) {
    //             return d;
    //         }

    //         if (this.isBetween(progress, prevR, r)) {
    //             return this.findStartProgress(progress, step/10, prevD, d, inceptionLevel);
    //         }

    //         prevD = d;
    //         prevR = r;
    //         d += step;
    //     }

    //     return d;
    // },

    /**
     * Is a between x1 and x2
     */
    // isBetween: function(a, x1, x2) {
    //     if (x2 > x1) {
    //         return a > x1 && a < x2;
    //     }
    //     return a > x2 && a < x1;
    // },

    isRunning: function() {
        return this.inProgress;
    },

    /**
     * Piefiksējam sākuma laiku
     */
    start: function() {
        this.inProgress = true;
        this.startTime = +new Date();
        this.progress = 0;
    },

    /**
     * Pārtraucam stepping
     */
    stop: function() {
        cancelAnimationFrame(this.requestId);
        this.done();
    },

    /**
     * Pārtraucam animāciju un neizpildām done callback
     */
    forceStop: function() {
        cancelAnimationFrame(this.requestId);
        this.inProgress = false;
        if (this.forceStopCallback) {
            this.forceStopCallback();
        }
    },

    done: function() {
        this.inProgress = false;
        if (this.doneCallback) {
            this.doneCallback();
        }
    },

    step: function() {
        var mthis = this;

        mthis.trackProgress();

        if (this.current < this.startTime + this.duration) {

            this.stepCallback(this.progress);

            this.requestId = requestAnimationFrame(function(){
                mthis.step()
            });
        }
        else {
            this.stepCallback(1);

            this.done();
        }
    },

    trackProgress: function() {
        // Current time
        this.current = +new Date();

        var delta = this.current - this.startTime;

        // Animation progress in precents
        this.progress = this.easing.get(delta / this.duration);

        //this.progress = Math.round(this.progress*this.precision)/this.precision;
    },

    getEasing: function(bezierCurve) {
        if (!(bezierCurve && bezierCurve.length && bezierCurve.length == 4)) {
            bezierCurve = this.defaultBezierCurve;
        }
        return new Bezier(bezierCurve[0], bezierCurve[1], bezierCurve[2], bezierCurve[3]);
    },

    /**
     * Atgriežam config vērtību.
     * Katrai vērtībai pēc tās name tiek veiktas pārbaudes vai papildus apstrāde
     * @param secondaryConfig object Alternate override config vērtības
     */
    getConfig: function(name, secondaryConfig) {
        var r = this.getConfigValue(name, secondaryConfig);
        switch (name) {
            case 'bezierCurve':
                r = this.getEasing(r);
                break;
            case 'duration':
                r = parseInt(r, 10);
                r = isNaN(r) ? 200 : r;
                break;
            case 'onStep':
            case 'onDone':
            case 'onForceStop':
                r = typeof r == 'function' ? r : function(){}
        }
        
        return r;
    },

    getConfigValue: function(name, secondaryConfig) {
        // Pirmo meklējam sekundārajā konfigā
        if (secondaryConfig && typeof secondaryConfig[name] != 'undefined') {
            return secondaryConfig[name];
        }

        // Meklējam bāzes konfigā
        if (this.config && typeof this.config[name] != 'undefined') {
            return this.config[name];
        }

        return undefined;
    }
}

module.exports = Stepper;