import Cookies from 'js-cookie';
require('vent-dom/lib/vent.min.es5.js');
const debounce = require('./src/debounce');
const ScriptLoader = require('./src/ScriptLoader');
const { FB_DEFAULT_EVENTS } = require('./src/constants');
const DEBUG_SRC = 'granola-debug-script';
const LOCAL_CONFIG_FLAG = 'granola-use-local-config';
const VERBOSE = 'granola-verbose-logs';

const Logger = () => {
  const isVerbose = !!localStorage.getItem(VERBOSE);
  function log(message, arguments = {}) {
    isVerbose && console.log(`Granola: ${message}`, arguments);
  }

  function error(message, arguments = {}) {
    isVerbose && console.error(`Granola: ${message}`, arguments);
  }

  return { log, error };
}
const logger = Logger();

function Granola() {
  const integrationHandlers = {
    'fb': fbReportEvent
  }

  const directives = {}

  function init(customer, triggers = []) {
    if (triggers && triggers.length) {
      trackEvents(triggers)
    }

    loadSettings(customer, () => {
      if (!window.granolaSettings) return logger.error(`failed to load granolaSettings`);

      const {
        targets,
        settings
      } = granolaSettings;

      trackEvents(targets, settings)
    })
  }

  function formToJSON($form) {
    if (!$form) return {};
    const { elements } = $form;
    const json = [].reduce.call(elements, (data, element) => {
      data[element.name] = element.value;
      return data;
    }, {});
    return json;
  }

  function debugOn(src) {
    if (!src) throw new Error('full url for local script is missing');
    localStorage.setItem(DEBUG_SRC, src);
    window.location.reload();
  }

  function debugOff() {
    localStorage.removeItem(DEBUG_SRC);
  }

  function verbose() {
    localStorage.setItem(VERBOSE, 'on');
  }

  function useLocalConfig() {
    localStorage.setItem(LOCAL_CONFIG_FLAG, 'yes');
    window.location.reload();
  }

  function useProductionConfig() {
    localStorage.removeItem(LOCAL_CONFIG_FLAG);
    window.location.reload();
  }

  function trackEvents(targets, settings) {
    const wrappers = {};
    Object.keys(targets).forEach(selector => {
      const params = targets[selector];
      const {
        wrapper,
        listenTo = 'click',
        trackOnce = false,
      } = params;
      const on = trackOnce ? 'once' : 'on';

      // track element impression events
      if (listenTo === 'impression') {
        vent(wrapper || document)
          .on('scroll', debounce((e) => checkElementVisibility(e, selector, params), 250))
      }

      // track regular events
      if (wrapper) {
        wrappers[wrapper] = wrappers[wrapper] || vent(wrapper);
        wrappers[wrapper][on](listenTo, selector,
          (e) => handlerFactory(e, selector, params, settings));
        logger.log(`set listener for (${wrapper}).on(${listenTo}, ${selector})`, params)
      } else {
        vent(selector)[on](listenTo, (e) => handlerFactory(e, selector, params, settings));
        logger.log(`set listener for (${selector}).on(${listenTo})`, params)
      }
    })
  }

  function handlerFactory(event, selector, eventConfig, settings) {
    const { params, formSelector = null, method = 'track', eventName, integrations = {}, callback } = eventConfig;
    const { eventsDefaults, integrationsGlobal, integrationsByEvents } = settings;
    const integrationsGlobalToEventsGroup = integrationsByEvents[eventName] || {};
    const defaultIntegrations = Object.assign({}, integrationsGlobal, integrationsGlobalToEventsGroup || {});

    const defaults = eventsDefaults[eventName] || {};
    const $target = document.querySelector(selector);
    const isForm = formSelector && document.querySelector(formSelector);
    let allParams = params;
    if (isForm) {
      allParams = {
        eventName,
        ...defaults,
        ...params,
        ...formToJSON(document.querySelector(formSelector))
      }
    } else if ($target) {
      allParams = {
        eventName,
        ...defaults,
        ...params,
        ...$target.dataset,
        title: $target.innerText
      }
    }

    allParams = handleDirectives({
      $target, selector, eventName, currentPayload: allParams
    });

    // dataLayer propagation
    const eventNamePrefixed = `${settings.eventPrefix}-${eventName}`;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({event: eventNamePrefixed, ...allParams})

    // elastic and third-party propagation.
    switch(method) {
      case 'identify':
        window.analytics && analytics.identify(allParams);
        break;
      case 'track':
      default:
        window.analytics && analytics.track(eventName, allParams);
        // third-party propagation
        Object.keys(defaultIntegrations).forEach(integrationKey => {
          if (shouldPropagateTo(integrationKey, integrations, defaultIntegrations)) {
            const overrides = integrations[integrationKey] || {};
            const defaultIntParams = defaultIntegrations[integrationKey] || {};

            const params = { ...allParams, ...defaultIntParams, ...overrides };

            integrationHandlers[integrationKey] && integrationHandlers[integrationKey](params);

            if (!integrationHandlers[integrationKey]) {
              return logger.error(`handler for ${integrationKey} integration is not defined`);
            }
          }
        });

        break;
    }


    (typeof callback === 'function') && callback({ $target, selector, eventName, currentPayload: allParams })
  }

  function shouldPropagateTo(vendor, specific, global) {
    if (typeof specific[vendor] === 'boolean' || typeof specific[vendor] === 'object') {
      return !!specific[vendor];
    }

    return !!global[vendor];
  }

  function fbReportEvent(params = {}) {
    if (!window.fbq) return logger.error('fbq not defined');
    const { eventName } = params;
    const trackVerb = FB_DEFAULT_EVENTS.includes(eventName) ? 'track' : 'trackCustom';
    const {
      category: content_category,
      label: content_name,
      ...others
    } = params;

    const fbParams = { ...others, content_category, content_name };
    logger.log('fb pixel', { trackVerb, ...fbParams });
    fbq(trackVerb, eventName, fbParams);
  }

  //impressions
  function isElementInView(element) {
    const elementBoundingBox = element.getBoundingClientRect();
    const elementTopY = elementBoundingBox.top;
    const elementBottomY = elementBoundingBox.top + elementBoundingBox.height;
    return elementTopY >= 0 && elementBottomY <= Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
  }

  function checkElementVisibility(e, selector, params) {
    const elements = document.querySelectorAll(selector);
    for (let i = 0; i < elements.length; i++) {
      if (isElementInView(elements[i])) {
        vent(elements[i]).trigger('impression');
      }
    }
  }

  function loadSettings(customer, callback) {
    const isLocalConfig = !!localStorage.getItem('granola-use-local-config');
    const baseURL = isLocalConfig ? `http://localhost:5813` : `https://analytics.exacti.us`;
    const url = baseURL + `/configs/${customer}.js`;
    const loader = new ScriptLoader();
    loader.require([url], callback)
  }

  function registerDirective(directiveKey, handler) {
    directives[directiveKey] = handler;
  }

  function registerIntegration(integrationKey, handler) {
    integrationHandlers[integrationKey] = handler;
  }

  function handleDirectives({ $target, eventName, currentPayload, selector }) {
    Object.keys(currentPayload).forEach(paramKey => {
      const directiveParams = currentPayload[paramKey];
      if (typeof directiveParams === 'function') {
        currentPayload[paramKey] = directiveParams({ $target, eventName, currentPayload, selector })

      } else if (typeof directiveParams === 'object' && directiveParams.type) {
        if (!directives[directiveParams.type]) return logger.error(`directive of type ${directiveParams.type} does not exist`);

        currentPayload[paramKey] = directives[directiveParams.type]({ $target, selector, eventName, currentPayload, directiveParams });
      }
    })
    return currentPayload;
  }

  return {
    init,
    trackEvents,
    debugOn,
    debugOff,
    useLocalConfig,
    useProductionConfig,
    verbose,
    registerDirective,
    registerIntegration
  }
}
window.Cookies = Cookies;
window.Granola = Granola;
window.granola = new Granola();


window.granola.registerIntegration('hj', ({ eventName, label }) => {
  if(!window.hj) return logger.log('Hotjar integration is not set');
  hj('tagRecording', [eventName + ':' + (label || '')]);
})

// full list of available params:
// { $target, selector, eventName, currentPayload, directiveParams }
window.granola.registerDirective('cookie', ({ directiveParams }) => {
  const { key, value } = directiveParams;
  return Cookies.set(key, value);
})

window.granola.registerDirective('closest', ({ $target, selector, eventName, currentPayload, directiveParams }) => {
  const { targetSelector, parentSelector, extractor } = directiveParams;
  if (!targetSelector) throw Error('targeSelector is not defined');
  if (!parentSelector) throw Error('parentSelector is not defined');
  if (!extractor) throw Error('extractor is not defined');

  const $parent = $target.closest(parentSelector)
  if (!$parent) throw Error(`closest parent with selector ${parentSelector} can't be found`);

  const $targetOfExtractor = $parent.querySelector(targetSelector);
  if (!$targetOfExtractor) throw Error(`closest targetOfExtractor with selector ${targetSelector} can't be found`);

  if (typeof extractor === 'string') {
    switch(extractor) {
      case '$priceParser':
        const string = $targetOfExtractor.innerText.replace(/[^0-9.-]+/g, '');
        return parseInt(string, 10);

      case 'text':
        return $targetOfExtractor.innerText;

      default:
        throw Error(`Built in extractor with name ${extractor} is not defined`);
    }
  } else if (typeof extractor === 'function') {
    return extractor({ $target, eventName, currentPayload, directiveParams })
  }
})

