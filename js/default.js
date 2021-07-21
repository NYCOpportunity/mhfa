var Default = (function () {
  'use strict';

  /**
   * The Simple Toggle class. This will toggle the class 'active' and 'hidden'
   * on target elements, determined by a click event on a selected link or
   * element. This will also toggle the aria-hidden attribute for targeted
   * elements to support screen readers. Target settings and other functionality
   * can be controlled through data attributes.
   *
   * This uses the .matches() method which will require a polyfill for IE
   * https://polyfill.io/v2/docs/features/#Element_prototype_matches
   *
   * @class
   */
  class Toggle {
    /**
     * @constructor
     *
     * @param  {Object}  s  Settings for this Toggle instance
     *
     * @return {Object}     The class
     */
    constructor(s) {
      // Create an object to store existing toggle listeners (if it doesn't exist)
      if (!window.hasOwnProperty(Toggle.callback))
        window[Toggle.callback] = [];

      s = (!s) ? {} : s;

      this.settings = {
        selector: (s.selector) ? s.selector : Toggle.selector,
        namespace: (s.namespace) ? s.namespace : Toggle.namespace,
        inactiveClass: (s.inactiveClass) ? s.inactiveClass : Toggle.inactiveClass,
        activeClass: (s.activeClass) ? s.activeClass : Toggle.activeClass,
        before: (s.before) ? s.before : false,
        after: (s.after) ? s.after : false,
        valid: (s.valid) ? s.valid : false,
        focusable: (s.hasOwnProperty('focusable')) ? s.focusable : true,
        jump: (s.hasOwnProperty('jump')) ? s.jump : true
      };

      // Store the element for potential use in callbacks
      this.element = (s.element) ? s.element : false;

      if (this.element) {
        this.element.addEventListener('click', (event) => {
          this.toggle(event);
        });
      } else {
        // If there isn't an existing instantiated toggle, add the event listener.
        if (!window[Toggle.callback].hasOwnProperty(this.settings.selector)) {
          let body = document.querySelector('body');

          for (let i = 0; i < Toggle.events.length; i++) {
            let tggleEvent = Toggle.events[i];

            body.addEventListener(tggleEvent, event => {
              if (!event.target.matches(this.settings.selector))
                return;

              this.event = event;

              let type = event.type.toUpperCase();

              if (
                this[event.type] &&
                Toggle.elements[type] &&
                Toggle.elements[type].includes(event.target.tagName)
              ) this[event.type](event);
            });
          }
        }
      }

      // Record that a toggle using this selector has been instantiated.
      // This prevents double toggling.
      window[Toggle.callback][this.settings.selector] = true;

      return this;
    }

    /**
     * Click event handler
     *
     * @param  {Event}  event  The original click event
     */
    click(event) {
      this.toggle(event);
    }

    /**
     * Input/select/textarea change event handler. Checks to see if the
     * event.target is valid then toggles accordingly.
     *
     * @param  {Event}  event  The original input change event
     */
    change(event) {
      let valid = event.target.checkValidity();

      if (valid && !this.isActive(event.target)) {
        this.toggle(event); // show
      } else if (!valid && this.isActive(event.target)) {
        this.toggle(event); // hide
      }
    }

    /**
     * Check to see if the toggle is active
     *
     * @param  {Object}  element  The toggle element (trigger)
     */
    isActive(element) {
      let active = false;

      if (this.settings.activeClass) {
        active = element.classList.contains(this.settings.activeClass);
      }

      // if () {
        // Toggle.elementAriaRoles
        // TODO: Add catch to see if element aria roles are toggled
      // }

      // if () {
        // Toggle.targetAriaRoles
        // TODO: Add catch to see if target aria roles are toggled
      // }

      return active;
    }

    /**
     * Get the target of the toggle element (trigger)
     *
     * @param  {Object}  el  The toggle element (trigger)
     */
    getTarget(element) {
      let target = false;

      /** Anchor Links */
      target = (element.hasAttribute('href')) ?
        document.querySelector(element.getAttribute('href')) : target;

      /** Toggle Controls */
      target = (element.hasAttribute('aria-controls')) ?
        document.querySelector(`#${element.getAttribute('aria-controls')}`) : target;

      return target;
    }

    /**
     * The toggle event proxy for getting and setting the element/s and target
     *
     * @param  {Object}  event  The main click event
     *
     * @return {Object}         The Toggle instance
     */
    toggle(event) {
      let element = event.target;
      let target = false;
      let focusable = [];

      event.preventDefault();

      target = this.getTarget(element);

      /** Focusable Children */
      focusable = (target) ?
        target.querySelectorAll(Toggle.elFocusable.join(', ')) : focusable;

      /** Main Functionality */
      if (!target) return this;
      this.elementToggle(element, target, focusable);

      /** Undo */
      if (element.dataset[`${this.settings.namespace}Undo`]) {
        const undo = document.querySelector(
          element.dataset[`${this.settings.namespace}Undo`]
        );

        undo.addEventListener('click', (event) => {
          event.preventDefault();
          this.elementToggle(element, target);
          undo.removeEventListener('click');
        });
      }

      return this;
    }

    /**
     * Get other toggles that might control the same element
     *
     * @param   {Object}    element  The toggling element
     *
     * @return  {NodeList}           List of other toggling elements
     *                               that control the target
     */
    getOthers(element) {
      let selector = false;

      if (element.hasAttribute('href')) {
        selector = `[href="${element.getAttribute('href')}"]`;
      } else if (element.hasAttribute('aria-controls')) {
        selector = `[aria-controls="${element.getAttribute('aria-controls')}"]`;
      }

      return (selector) ? document.querySelectorAll(selector) : [];
    }

    /**
     * Hide the Toggle Target's focusable children from focus.
     * If an element has the data-attribute `data-toggle-tabindex`
     * it will use that as the default tab index of the element.
     *
     * @param   {NodeList}  elements  List of focusable elements
     *
     * @return  {Object}              The Toggle Instance
     */
    toggleFocusable(elements) {
      elements.forEach(element => {
        let tabindex = element.getAttribute('tabindex');

        if (tabindex === '-1') {
          let dataDefault = element
            .getAttribute(`data-${Toggle.namespace}-tabindex`);

          if (dataDefault) {
            element.setAttribute('tabindex', dataDefault);
          } else {
            element.removeAttribute('tabindex');
          }
        } else {
          element.setAttribute('tabindex', '-1');
        }
      });

      return this;
    }

    /**
     * Jumps to Element visibly and shifts focus
     * to the element by setting the tabindex
     *
     * @param   {Object}  element  The Toggling Element
     * @param   {Object}  target   The Target Element
     *
     * @return  {Object}           The Toggle instance
     */
    jumpTo(element, target) {
      // Reset the history state. This will clear out
      // the hash when the target is toggled closed
      history.pushState('', '',
        window.location.pathname + window.location.search);

      // Focus if active
      if (target.classList.contains(this.settings.activeClass)) {
        window.location.hash = element.getAttribute('href');

        target.setAttribute('tabindex', '0');
        target.focus({preventScroll: true});
      } else {
        target.removeAttribute('tabindex');
      }

      return this;
    }

    /**
     * The main toggling method for attributes
     *
     * @param  {Object}    element    The Toggle element
     * @param  {Object}    target     The Target element to toggle active/hidden
     * @param  {NodeList}  focusable  Any focusable children in the target
     *
     * @return {Object}               The Toggle instance
     */
    elementToggle(element, target, focusable = []) {
      let i = 0;
      let attr = '';
      let value = '';

      /**
       * Store elements for potential use in callbacks
       */

      this.element = element;
      this.target = target;
      this.others = this.getOthers(element);
      this.focusable = focusable;

      /**
       * Validity method property that will cancel the toggle if it returns false
       */

      if (this.settings.valid && !this.settings.valid(this))
        return this;

      /**
       * Toggling before hook
       */

      if (this.settings.before)
        this.settings.before(this);

      /**
       * Toggle Element and Target classes
       */

      if (this.settings.activeClass) {
        this.element.classList.toggle(this.settings.activeClass);
        this.target.classList.toggle(this.settings.activeClass);

        // If there are other toggles that control the same element
        this.others.forEach(other => {
          if (other !== this.element)
            other.classList.toggle(this.settings.activeClass);
        });
      }

      if (this.settings.inactiveClass)
        target.classList.toggle(this.settings.inactiveClass);

      /**
       * Target Element Aria Attributes
       */

      for (i = 0; i < Toggle.targetAriaRoles.length; i++) {
        attr = Toggle.targetAriaRoles[i];
        value = this.target.getAttribute(attr);

        if (value != '' && value)
          this.target.setAttribute(attr, (value === 'true') ? 'false' : 'true');
      }

      /**
       * Toggle the target's focusable children tabindex
       */

      if (this.settings.focusable)
        this.toggleFocusable(this.focusable);

      /**
       * Jump to Target Element if Toggle Element is an anchor link
       */

      if (this.settings.jump && this.element.hasAttribute('href'))
        this.jumpTo(this.element, this.target);

      /**
       * Toggle Element (including multi toggles) Aria Attributes
       */

      for (i = 0; i < Toggle.elAriaRoles.length; i++) {
        attr = Toggle.elAriaRoles[i];
        value = this.element.getAttribute(attr);

        if (value != '' && value)
          this.element.setAttribute(attr, (value === 'true') ? 'false' : 'true');

        // If there are other toggles that control the same element
        this.others.forEach((other) => {
          if (other !== this.element && other.getAttribute(attr))
            other.setAttribute(attr, (value === 'true') ? 'false' : 'true');
        });
      }

      /**
       * Toggling complete hook
       */

      if (this.settings.after)
        this.settings.after(this);

      return this;
    }
  }

  /** @type  {String}  The main selector to add the toggling function to */
  Toggle.selector = '[data-js*="toggle"]';

  /** @type  {String}  The namespace for our data attribute settings */
  Toggle.namespace = 'toggle';

  /** @type  {String}  The hide class */
  Toggle.inactiveClass = 'hidden';

  /** @type  {String}  The active class */
  Toggle.activeClass = 'active';

  /** @type  {Array}  Aria roles to toggle true/false on the toggling element */
  Toggle.elAriaRoles = ['aria-pressed', 'aria-expanded'];

  /** @type  {Array}  Aria roles to toggle true/false on the target element */
  Toggle.targetAriaRoles = ['aria-hidden'];

  /** @type  {Array}  Focusable elements to hide within the hidden target element */
  Toggle.elFocusable = [
    'a', 'button', 'input', 'select', 'textarea', 'object', 'embed', 'form',
    'fieldset', 'legend', 'label', 'area', 'audio', 'video', 'iframe', 'svg',
    'details', 'table', '[tabindex]', '[contenteditable]', '[usemap]'
  ];

  /** @type  {Array}  Key attribute for storing toggles in the window */
  Toggle.callback = ['TogglesCallback'];

  /** @type  {Array}  Default events to to watch for toggling. Each must have a handler in the class and elements to look for in Toggle.elements */
  Toggle.events = ['click', 'change'];

  /** @type  {Array}  Elements to delegate to each event handler */
  Toggle.elements = {
    CLICK: ['A', 'BUTTON'],
    CHANGE: ['SELECT', 'INPUT', 'TEXTAREA']
  };

  /**
   * The Icon module
   * @class
   */
  class Icons {
    /**
     * @constructor
     * @param  {String} path The path of the icon file
     * @return {object} The class
     */
    constructor(path) {
      path = (path) ? path : Icons.path;

      fetch(path)
        .then((response) => {
          if (response.ok)
            return response.text();
          else
            // eslint-disable-next-line no-console
            console.dir(response);
        })
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.dir(error);
        })
        .then((data) => {
          const sprite = document.createElement('div');
          sprite.innerHTML = data;
          sprite.setAttribute('aria-hidden', true);
          sprite.setAttribute('style', 'display: none;');
          document.body.appendChild(sprite);
        });

      return this;
    }
  }

  /** @type {String} The path of the icon file */
  Icons.path = 'svg/icons.svg';

  /**
   * Maps change events from the Custom Translate element to the Google Translate
   * element. Observes the html lang attribute and switches stylesheets based on
   * the changed language (if the stylesheet exists).
   *
   * @class
   */
   class TranslateElement {
    /**
     * The Constructor
     *
     * @param   {Object}  element  The container of the Google Translate Element
     *
     * @return  {Object}  An instance of TranslateElement
     */
    constructor(element) {
      this.element = element;

      this.control = document.querySelector(TranslateElement.selectors.control);

      this.html = document.querySelector(TranslateElement.selectors.html);

      /**
       * Observe the HTML tag for language switching
       */
      new MutationObserver(mutations => {
        this.observer(mutations);
      }).observe(this.html, {
        attributes: true
      });

      /**
       * Listen for the change event on the select controller
       */
      this.control.addEventListener('change', event => {
        this.change(event);
      });

      return this;
    }

    /**
     * Prepend the language path to an internal link
     *
     * @param   {Object}  event  The link click event
     */
    click(event) {
      let origin = window.location.origin;
      let link = (event.target.matches('a'))
        ? event.target : event.target.closest('a');

      let lang = document.querySelector(TranslateElement.selectors.html)
        .getAttribute('lang');

      let slang = (lang === TranslateElement.maps['zh-hant'])
          ? 'zh-hant' : lang;

      let slink = link.href.replace(origin, `${origin}/${slang}`);
      let target = (link.target === '_blank') ? link.target : '_self';

      let samesite = link.href.includes(origin);
      let samepage = (link.pathname === window.location.pathname);

      if (samesite && !samepage) {
        event.preventDefault();

        window.open(slink, target);
      }
    }

    /**
     * The observer method for the HTML lang attribute;
     * 1. Update the select if the original language (English) is restored
     * 2. Set reading direction of the document
     * 3. Switch to the appropriate language stylesheet if it exists
     * 4. Add the click event for prepending the language path to internal link
     *
     * @param   {Array}  mutations  List of Mutations from MutationObserver
     */
    observer(mutations) {
      let langs = mutations.filter(m => m.attributeName === 'lang');
      let stylesheets = TranslateElement.stylesheets;

      if (langs.length) {
        let lang = langs[0].target.lang;

        // Update the select if the original language (English) is restored
        this.control.value = (TranslateElement.restore.includes(lang))
          ? 'restore' : lang;

        // Set reading direction of the document
        this.html.setAttribute('direction',
          (TranslateElement.rtl.includes(lang)) ? 'rtl' : 'ltr');

        // Switch to the appropriate language stylesheet if it exists
        let slang = (lang === TranslateElement.maps['zh-hant'])
          ? 'zh-hant' : lang;

        let stylesheet = stylesheets.filter(s => s.includes(`style-${slang}`));
        let latin = stylesheets.filter(s => s.includes('style-default'));
        let switched = (stylesheet.length) ? stylesheet[0] : latin[0];

        document.querySelector(TranslateElement.selectors.stylesheet)
          .setAttribute('href', switched);

        // Add the click event for prepending the language path to internal link
        document.querySelectorAll('a').forEach(link => {
          if (TranslateElement.restore.includes(lang)) {
            link.removeEventListener('click', this.click);
          } else {
            link.addEventListener('click', this.click);
          }
        });
      }
    }

    /**
     * The select change event mapping from custom element to google element
     *
     * @param   {Object}  event  The original change event of the custom element
     */
    change(event) {
      let select = this.element.querySelector('select');

      select.value = event.target.value;

      let change;

      if (typeof(Event) === 'function') {
        change = new Event('change');
      } else {
        change = document.createEvent('Event');
        change.initEvent('change', true, true);
      }

      select.dispatchEvent(change);
    }
  }

  /** Array of existing site stylesheets to switch */
  TranslateElement.stylesheets = window.STYLESHEETS;

  /** Right to left languages */
  TranslateElement.rtl = ['ar', 'ur'];

  /** Values that trigger the restore value change in the custom element */
  TranslateElement.restore = ['auto', 'en'];

  /** Google Translate element selector */
  TranslateElement.selector = '#js-google-translate';

  /** Collection of component selectors */
  TranslateElement.selectors = {
    control: '#js-google-translate-control',
    html: 'html',
    stylesheet: '#style-default-css'
  };

  /** Language mappings from the site to the Google Translate element */
  TranslateElement.maps = {
    'zh-hant': 'zh-CN'
  };

  /**
   * Static column module
   * Similar to the general sticky module but used specifically when one column
   * of a two-column layout is meant to be sticky
   * @module modules/staticColumn
   * @see modules/stickyNav
   */

  class StaticColumn {
    constructor() {
      this._settings = {
        selector: StaticColumn.selector,
      };

      const stickyContent = document.querySelectorAll(
        `.${this._settings.selector}`
      );
      /**
       * Calculates the window position and sets the appropriate class on the element
       * @param {object} stickyContentElem - DOM node that should be stickied
       */
      this.assignStickyFeature(stickyContent);
    }

    /**
     * Iterate over elemets containing the class 'js-static'.
     * On page load, screenResize and scroll events, calls StaticColumn.calcWindowPos function .
     * @param {elements} stickyContent Element in chich the sticky effect will be applied
     */

    assignStickyFeature(stickyContent) {
      if (stickyContent) {
        stickyContent.forEach(function(stickyContentElem) {
          StaticColumn.calcWindowPos(stickyContentElem);
          /**
           * Add event listener for 'scroll'.
           * @function
           * @param {object} event - The event object
           */
          window.addEventListener(
            'scroll',
            function() {
              StaticColumn.calcWindowPos(stickyContentElem);
            },
            false
          );

          /**
           * Add event listener for 'resize'.
           * @function
           * @param {object} event - The event object
           */
          window.addEventListener(
            'resize',
            function() {
              StaticColumn.calcWindowPos(stickyContentElem);
            },
            false
          );
        });
      }
    }
  }

  /**
   * depending on elements postion in the page add and remove classes
   * @param {element} stickyContentElem an element with the class name 'js-static'
   */

  StaticColumn.calcWindowPos = function(stickyContentElem) {
    let elemTop = stickyContentElem.parentElement.getBoundingClientRect().top;
    let isPastBottom =
      window.innerHeight -
        stickyContentElem.parentElement.clientHeight -
        stickyContentElem.parentElement.getBoundingClientRect().top >
      0;

    // Sets element to position absolute if not scrolled to yet.
    // Absolutely positioning only when necessary and not by default prevents flickering
    // when removing the "is-bottom" class on Chrome
    if (elemTop > 0) {
      stickyContentElem.classList.add(StaticColumn.notStickyClass);
    } else {
      stickyContentElem.classList.remove(StaticColumn.notStickyClass);
    }
    if (isPastBottom) {
      stickyContentElem.classList.add(StaticColumn.bottomClass);
    } else {
      stickyContentElem.classList.remove(StaticColumn.bottomClass);
    }
  };

  StaticColumn.selector = 'js-static';
  StaticColumn.notStickyClass = 'is-not-sticky';
  StaticColumn.bottomClass = 'is-bottom';

  class Animations {
    constructor() {
      this._settings = {
        selector: Animations.selector,
        controller: Animations.controller,
        speed: Animations.speed,
      };

      const rotating = document.querySelectorAll(this._settings.selector);
      var terms = [];

      // Iterate over the element and add their textContent in an array
      rotating.forEach(function(term) {
        if (term.innerText.trim() !== '') {
          terms.push(term.innerText);
        }
      });

      Animations.rotateTerms(
        terms,
        this._settings.controller,
        this._settings.speed
      );
    }
  }

  /**
   * Accepts array of string and creates rotating loop for the duration of the time provided as a speed argument.
   * After every rotation calles the Animation.fadeInout function
   * @param {array} terms array of strings
   * @param {data-js} control the animation controlling element class
   * @param {number} speed animation speeed
   */

  Animations.rotateTerms = function(terms, control, speed) {
    const controller = document.querySelector(control);

    controller.innerText = terms[0].trim();
    Animations.fadeInOut(controller);

    var i = 1;
    setInterval(function() {
      if (i == terms.length) {
        i = 0;
      }
      controller.innerText = terms[i].trim();
      Animations.fadeInOut(controller);

      i++;
    }, 3000);
  };

  /**
   * After evey rotation adds and removes animate.css classes to fade in and fade out the strings
   * @param {element} controller
   */
  Animations.fadeInOut = function(controller) {
    controller.classList.add('fadeIn');

    setTimeout(function() {
      controller.classList.add('fadeOut');
      controller.classList.remove('fadeIn');
    }, 2000);
  };

  Animations.speed = 1500;

  Animations.selector = '[data-js*="rotate-text"]';

  Animations.controller = '[data-js*="rotate-controller"]';

  class Default {
    constructor() {}

    toggle() {
      return new Toggle();
    }

    accordion() {
      return new Toggle({
        selector: '[data-js*="accordion"]',
        after: (toggle) => {
          toggle.element.parentNode.classList.toggle('is-expanded');
        },
      });
    }

    icons(path) {
      return new Icons(path);
    }

    staticColumn() {
      return new StaticColumn();
    }

    textRotation() {
      return new Animations();
    }

    translateElement() {
      new TranslateElement(document.querySelector(TranslateElement.selector));
    }
  }

  return Default;

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL0BueWNvcHBvcnR1bml0eS9wdHRybi1zY3JpcHRzL3NyYy90b2dnbGUvdG9nZ2xlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL0BueWNvcHBvcnR1bml0eS9wdHRybi1zY3JpcHRzL3NyYy9pY29ucy9pY29ucy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9Abnljb3Bwb3J0dW5pdHkvcHR0cm4tc2NyaXB0cy9zcmMvZ29vZ2xlLXRyYW5zbGF0ZS1lbGVtZW50L2dvb2dsZS10cmFuc2xhdGUtZWxlbWVudC5qcyIsIi4uLy4uL3NyYy9qcy9zdGF0aWNDb2x1bW4uanMiLCIuLi8uLi9zcmMvanMvdGV4dFJvdGF0aW9uLmpzIiwiLi4vLi4vc3JjL2pzL2RlZmF1bHQuanMiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFRoZSBTaW1wbGUgVG9nZ2xlIGNsYXNzLiBUaGlzIHdpbGwgdG9nZ2xlIHRoZSBjbGFzcyAnYWN0aXZlJyBhbmQgJ2hpZGRlbidcbiAqIG9uIHRhcmdldCBlbGVtZW50cywgZGV0ZXJtaW5lZCBieSBhIGNsaWNrIGV2ZW50IG9uIGEgc2VsZWN0ZWQgbGluayBvclxuICogZWxlbWVudC4gVGhpcyB3aWxsIGFsc28gdG9nZ2xlIHRoZSBhcmlhLWhpZGRlbiBhdHRyaWJ1dGUgZm9yIHRhcmdldGVkXG4gKiBlbGVtZW50cyB0byBzdXBwb3J0IHNjcmVlbiByZWFkZXJzLiBUYXJnZXQgc2V0dGluZ3MgYW5kIG90aGVyIGZ1bmN0aW9uYWxpdHlcbiAqIGNhbiBiZSBjb250cm9sbGVkIHRocm91Z2ggZGF0YSBhdHRyaWJ1dGVzLlxuICpcbiAqIFRoaXMgdXNlcyB0aGUgLm1hdGNoZXMoKSBtZXRob2Qgd2hpY2ggd2lsbCByZXF1aXJlIGEgcG9seWZpbGwgZm9yIElFXG4gKiBodHRwczovL3BvbHlmaWxsLmlvL3YyL2RvY3MvZmVhdHVyZXMvI0VsZW1lbnRfcHJvdG90eXBlX21hdGNoZXNcbiAqXG4gKiBAY2xhc3NcbiAqL1xuY2xhc3MgVG9nZ2xlIHtcbiAgLyoqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKlxuICAgKiBAcGFyYW0gIHtPYmplY3R9ICBzICBTZXR0aW5ncyBmb3IgdGhpcyBUb2dnbGUgaW5zdGFuY2VcbiAgICpcbiAgICogQHJldHVybiB7T2JqZWN0fSAgICAgVGhlIGNsYXNzXG4gICAqL1xuICBjb25zdHJ1Y3RvcihzKSB7XG4gICAgLy8gQ3JlYXRlIGFuIG9iamVjdCB0byBzdG9yZSBleGlzdGluZyB0b2dnbGUgbGlzdGVuZXJzIChpZiBpdCBkb2Vzbid0IGV4aXN0KVxuICAgIGlmICghd2luZG93Lmhhc093blByb3BlcnR5KFRvZ2dsZS5jYWxsYmFjaykpXG4gICAgICB3aW5kb3dbVG9nZ2xlLmNhbGxiYWNrXSA9IFtdO1xuXG4gICAgcyA9ICghcykgPyB7fSA6IHM7XG5cbiAgICB0aGlzLnNldHRpbmdzID0ge1xuICAgICAgc2VsZWN0b3I6IChzLnNlbGVjdG9yKSA/IHMuc2VsZWN0b3IgOiBUb2dnbGUuc2VsZWN0b3IsXG4gICAgICBuYW1lc3BhY2U6IChzLm5hbWVzcGFjZSkgPyBzLm5hbWVzcGFjZSA6IFRvZ2dsZS5uYW1lc3BhY2UsXG4gICAgICBpbmFjdGl2ZUNsYXNzOiAocy5pbmFjdGl2ZUNsYXNzKSA/IHMuaW5hY3RpdmVDbGFzcyA6IFRvZ2dsZS5pbmFjdGl2ZUNsYXNzLFxuICAgICAgYWN0aXZlQ2xhc3M6IChzLmFjdGl2ZUNsYXNzKSA/IHMuYWN0aXZlQ2xhc3MgOiBUb2dnbGUuYWN0aXZlQ2xhc3MsXG4gICAgICBiZWZvcmU6IChzLmJlZm9yZSkgPyBzLmJlZm9yZSA6IGZhbHNlLFxuICAgICAgYWZ0ZXI6IChzLmFmdGVyKSA/IHMuYWZ0ZXIgOiBmYWxzZSxcbiAgICAgIHZhbGlkOiAocy52YWxpZCkgPyBzLnZhbGlkIDogZmFsc2UsXG4gICAgICBmb2N1c2FibGU6IChzLmhhc093blByb3BlcnR5KCdmb2N1c2FibGUnKSkgPyBzLmZvY3VzYWJsZSA6IHRydWUsXG4gICAgICBqdW1wOiAocy5oYXNPd25Qcm9wZXJ0eSgnanVtcCcpKSA/IHMuanVtcCA6IHRydWVcbiAgICB9O1xuXG4gICAgLy8gU3RvcmUgdGhlIGVsZW1lbnQgZm9yIHBvdGVudGlhbCB1c2UgaW4gY2FsbGJhY2tzXG4gICAgdGhpcy5lbGVtZW50ID0gKHMuZWxlbWVudCkgPyBzLmVsZW1lbnQgOiBmYWxzZTtcblxuICAgIGlmICh0aGlzLmVsZW1lbnQpIHtcbiAgICAgIHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChldmVudCkgPT4ge1xuICAgICAgICB0aGlzLnRvZ2dsZShldmVudCk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgdGhlcmUgaXNuJ3QgYW4gZXhpc3RpbmcgaW5zdGFudGlhdGVkIHRvZ2dsZSwgYWRkIHRoZSBldmVudCBsaXN0ZW5lci5cbiAgICAgIGlmICghd2luZG93W1RvZ2dsZS5jYWxsYmFja10uaGFzT3duUHJvcGVydHkodGhpcy5zZXR0aW5ncy5zZWxlY3RvcikpIHtcbiAgICAgICAgbGV0IGJvZHkgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdib2R5Jyk7XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBUb2dnbGUuZXZlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgbGV0IHRnZ2xlRXZlbnQgPSBUb2dnbGUuZXZlbnRzW2ldO1xuXG4gICAgICAgICAgYm9keS5hZGRFdmVudExpc3RlbmVyKHRnZ2xlRXZlbnQsIGV2ZW50ID0+IHtcbiAgICAgICAgICAgIGlmICghZXZlbnQudGFyZ2V0Lm1hdGNoZXModGhpcy5zZXR0aW5ncy5zZWxlY3RvcikpXG4gICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgdGhpcy5ldmVudCA9IGV2ZW50O1xuXG4gICAgICAgICAgICBsZXQgdHlwZSA9IGV2ZW50LnR5cGUudG9VcHBlckNhc2UoKTtcblxuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICB0aGlzW2V2ZW50LnR5cGVdICYmXG4gICAgICAgICAgICAgIFRvZ2dsZS5lbGVtZW50c1t0eXBlXSAmJlxuICAgICAgICAgICAgICBUb2dnbGUuZWxlbWVudHNbdHlwZV0uaW5jbHVkZXMoZXZlbnQudGFyZ2V0LnRhZ05hbWUpXG4gICAgICAgICAgICApIHRoaXNbZXZlbnQudHlwZV0oZXZlbnQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gUmVjb3JkIHRoYXQgYSB0b2dnbGUgdXNpbmcgdGhpcyBzZWxlY3RvciBoYXMgYmVlbiBpbnN0YW50aWF0ZWQuXG4gICAgLy8gVGhpcyBwcmV2ZW50cyBkb3VibGUgdG9nZ2xpbmcuXG4gICAgd2luZG93W1RvZ2dsZS5jYWxsYmFja11bdGhpcy5zZXR0aW5ncy5zZWxlY3Rvcl0gPSB0cnVlO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogQ2xpY2sgZXZlbnQgaGFuZGxlclxuICAgKlxuICAgKiBAcGFyYW0gIHtFdmVudH0gIGV2ZW50ICBUaGUgb3JpZ2luYWwgY2xpY2sgZXZlbnRcbiAgICovXG4gIGNsaWNrKGV2ZW50KSB7XG4gICAgdGhpcy50b2dnbGUoZXZlbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIElucHV0L3NlbGVjdC90ZXh0YXJlYSBjaGFuZ2UgZXZlbnQgaGFuZGxlci4gQ2hlY2tzIHRvIHNlZSBpZiB0aGVcbiAgICogZXZlbnQudGFyZ2V0IGlzIHZhbGlkIHRoZW4gdG9nZ2xlcyBhY2NvcmRpbmdseS5cbiAgICpcbiAgICogQHBhcmFtICB7RXZlbnR9ICBldmVudCAgVGhlIG9yaWdpbmFsIGlucHV0IGNoYW5nZSBldmVudFxuICAgKi9cbiAgY2hhbmdlKGV2ZW50KSB7XG4gICAgbGV0IHZhbGlkID0gZXZlbnQudGFyZ2V0LmNoZWNrVmFsaWRpdHkoKTtcblxuICAgIGlmICh2YWxpZCAmJiAhdGhpcy5pc0FjdGl2ZShldmVudC50YXJnZXQpKSB7XG4gICAgICB0aGlzLnRvZ2dsZShldmVudCk7IC8vIHNob3dcbiAgICB9IGVsc2UgaWYgKCF2YWxpZCAmJiB0aGlzLmlzQWN0aXZlKGV2ZW50LnRhcmdldCkpIHtcbiAgICAgIHRoaXMudG9nZ2xlKGV2ZW50KTsgLy8gaGlkZVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayB0byBzZWUgaWYgdGhlIHRvZ2dsZSBpcyBhY3RpdmVcbiAgICpcbiAgICogQHBhcmFtICB7T2JqZWN0fSAgZWxlbWVudCAgVGhlIHRvZ2dsZSBlbGVtZW50ICh0cmlnZ2VyKVxuICAgKi9cbiAgaXNBY3RpdmUoZWxlbWVudCkge1xuICAgIGxldCBhY3RpdmUgPSBmYWxzZTtcblxuICAgIGlmICh0aGlzLnNldHRpbmdzLmFjdGl2ZUNsYXNzKSB7XG4gICAgICBhY3RpdmUgPSBlbGVtZW50LmNsYXNzTGlzdC5jb250YWlucyh0aGlzLnNldHRpbmdzLmFjdGl2ZUNsYXNzKVxuICAgIH1cblxuICAgIC8vIGlmICgpIHtcbiAgICAgIC8vIFRvZ2dsZS5lbGVtZW50QXJpYVJvbGVzXG4gICAgICAvLyBUT0RPOiBBZGQgY2F0Y2ggdG8gc2VlIGlmIGVsZW1lbnQgYXJpYSByb2xlcyBhcmUgdG9nZ2xlZFxuICAgIC8vIH1cblxuICAgIC8vIGlmICgpIHtcbiAgICAgIC8vIFRvZ2dsZS50YXJnZXRBcmlhUm9sZXNcbiAgICAgIC8vIFRPRE86IEFkZCBjYXRjaCB0byBzZWUgaWYgdGFyZ2V0IGFyaWEgcm9sZXMgYXJlIHRvZ2dsZWRcbiAgICAvLyB9XG5cbiAgICByZXR1cm4gYWN0aXZlO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgdGFyZ2V0IG9mIHRoZSB0b2dnbGUgZWxlbWVudCAodHJpZ2dlcilcbiAgICpcbiAgICogQHBhcmFtICB7T2JqZWN0fSAgZWwgIFRoZSB0b2dnbGUgZWxlbWVudCAodHJpZ2dlcilcbiAgICovXG4gIGdldFRhcmdldChlbGVtZW50KSB7XG4gICAgbGV0IHRhcmdldCA9IGZhbHNlO1xuXG4gICAgLyoqIEFuY2hvciBMaW5rcyAqL1xuICAgIHRhcmdldCA9IChlbGVtZW50Lmhhc0F0dHJpYnV0ZSgnaHJlZicpKSA/XG4gICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdocmVmJykpIDogdGFyZ2V0O1xuXG4gICAgLyoqIFRvZ2dsZSBDb250cm9scyAqL1xuICAgIHRhcmdldCA9IChlbGVtZW50Lmhhc0F0dHJpYnV0ZSgnYXJpYS1jb250cm9scycpKSA/XG4gICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGAjJHtlbGVtZW50LmdldEF0dHJpYnV0ZSgnYXJpYS1jb250cm9scycpfWApIDogdGFyZ2V0O1xuXG4gICAgcmV0dXJuIHRhcmdldDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgdG9nZ2xlIGV2ZW50IHByb3h5IGZvciBnZXR0aW5nIGFuZCBzZXR0aW5nIHRoZSBlbGVtZW50L3MgYW5kIHRhcmdldFxuICAgKlxuICAgKiBAcGFyYW0gIHtPYmplY3R9ICBldmVudCAgVGhlIG1haW4gY2xpY2sgZXZlbnRcbiAgICpcbiAgICogQHJldHVybiB7T2JqZWN0fSAgICAgICAgIFRoZSBUb2dnbGUgaW5zdGFuY2VcbiAgICovXG4gIHRvZ2dsZShldmVudCkge1xuICAgIGxldCBlbGVtZW50ID0gZXZlbnQudGFyZ2V0O1xuICAgIGxldCB0YXJnZXQgPSBmYWxzZTtcbiAgICBsZXQgZm9jdXNhYmxlID0gW107XG5cbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgdGFyZ2V0ID0gdGhpcy5nZXRUYXJnZXQoZWxlbWVudCk7XG5cbiAgICAvKiogRm9jdXNhYmxlIENoaWxkcmVuICovXG4gICAgZm9jdXNhYmxlID0gKHRhcmdldCkgP1xuICAgICAgdGFyZ2V0LnF1ZXJ5U2VsZWN0b3JBbGwoVG9nZ2xlLmVsRm9jdXNhYmxlLmpvaW4oJywgJykpIDogZm9jdXNhYmxlO1xuXG4gICAgLyoqIE1haW4gRnVuY3Rpb25hbGl0eSAqL1xuICAgIGlmICghdGFyZ2V0KSByZXR1cm4gdGhpcztcbiAgICB0aGlzLmVsZW1lbnRUb2dnbGUoZWxlbWVudCwgdGFyZ2V0LCBmb2N1c2FibGUpO1xuXG4gICAgLyoqIFVuZG8gKi9cbiAgICBpZiAoZWxlbWVudC5kYXRhc2V0W2Ake3RoaXMuc2V0dGluZ3MubmFtZXNwYWNlfVVuZG9gXSkge1xuICAgICAgY29uc3QgdW5kbyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXG4gICAgICAgIGVsZW1lbnQuZGF0YXNldFtgJHt0aGlzLnNldHRpbmdzLm5hbWVzcGFjZX1VbmRvYF1cbiAgICAgICk7XG5cbiAgICAgIHVuZG8uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdGhpcy5lbGVtZW50VG9nZ2xlKGVsZW1lbnQsIHRhcmdldCk7XG4gICAgICAgIHVuZG8ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBvdGhlciB0b2dnbGVzIHRoYXQgbWlnaHQgY29udHJvbCB0aGUgc2FtZSBlbGVtZW50XG4gICAqXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgIGVsZW1lbnQgIFRoZSB0b2dnbGluZyBlbGVtZW50XG4gICAqXG4gICAqIEByZXR1cm4gIHtOb2RlTGlzdH0gICAgICAgICAgIExpc3Qgb2Ygb3RoZXIgdG9nZ2xpbmcgZWxlbWVudHNcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdCBjb250cm9sIHRoZSB0YXJnZXRcbiAgICovXG4gIGdldE90aGVycyhlbGVtZW50KSB7XG4gICAgbGV0IHNlbGVjdG9yID0gZmFsc2U7XG5cbiAgICBpZiAoZWxlbWVudC5oYXNBdHRyaWJ1dGUoJ2hyZWYnKSkge1xuICAgICAgc2VsZWN0b3IgPSBgW2hyZWY9XCIke2VsZW1lbnQuZ2V0QXR0cmlidXRlKCdocmVmJyl9XCJdYDtcbiAgICB9IGVsc2UgaWYgKGVsZW1lbnQuaGFzQXR0cmlidXRlKCdhcmlhLWNvbnRyb2xzJykpIHtcbiAgICAgIHNlbGVjdG9yID0gYFthcmlhLWNvbnRyb2xzPVwiJHtlbGVtZW50LmdldEF0dHJpYnV0ZSgnYXJpYS1jb250cm9scycpfVwiXWA7XG4gICAgfVxuXG4gICAgcmV0dXJuIChzZWxlY3RvcikgPyBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSA6IFtdO1xuICB9XG5cbiAgLyoqXG4gICAqIEhpZGUgdGhlIFRvZ2dsZSBUYXJnZXQncyBmb2N1c2FibGUgY2hpbGRyZW4gZnJvbSBmb2N1cy5cbiAgICogSWYgYW4gZWxlbWVudCBoYXMgdGhlIGRhdGEtYXR0cmlidXRlIGBkYXRhLXRvZ2dsZS10YWJpbmRleGBcbiAgICogaXQgd2lsbCB1c2UgdGhhdCBhcyB0aGUgZGVmYXVsdCB0YWIgaW5kZXggb2YgdGhlIGVsZW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSAgIHtOb2RlTGlzdH0gIGVsZW1lbnRzICBMaXN0IG9mIGZvY3VzYWJsZSBlbGVtZW50c1xuICAgKlxuICAgKiBAcmV0dXJuICB7T2JqZWN0fSAgICAgICAgICAgICAgVGhlIFRvZ2dsZSBJbnN0YW5jZVxuICAgKi9cbiAgdG9nZ2xlRm9jdXNhYmxlKGVsZW1lbnRzKSB7XG4gICAgZWxlbWVudHMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgIGxldCB0YWJpbmRleCA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKCd0YWJpbmRleCcpO1xuXG4gICAgICBpZiAodGFiaW5kZXggPT09ICctMScpIHtcbiAgICAgICAgbGV0IGRhdGFEZWZhdWx0ID0gZWxlbWVudFxuICAgICAgICAgIC5nZXRBdHRyaWJ1dGUoYGRhdGEtJHtUb2dnbGUubmFtZXNwYWNlfS10YWJpbmRleGApO1xuXG4gICAgICAgIGlmIChkYXRhRGVmYXVsdCkge1xuICAgICAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKCd0YWJpbmRleCcsIGRhdGFEZWZhdWx0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlbGVtZW50LnJlbW92ZUF0dHJpYnV0ZSgndGFiaW5kZXgnKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ3RhYmluZGV4JywgJy0xJyk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBKdW1wcyB0byBFbGVtZW50IHZpc2libHkgYW5kIHNoaWZ0cyBmb2N1c1xuICAgKiB0byB0aGUgZWxlbWVudCBieSBzZXR0aW5nIHRoZSB0YWJpbmRleFxuICAgKlxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgZWxlbWVudCAgVGhlIFRvZ2dsaW5nIEVsZW1lbnRcbiAgICogQHBhcmFtICAge09iamVjdH0gIHRhcmdldCAgIFRoZSBUYXJnZXQgRWxlbWVudFxuICAgKlxuICAgKiBAcmV0dXJuICB7T2JqZWN0fSAgICAgICAgICAgVGhlIFRvZ2dsZSBpbnN0YW5jZVxuICAgKi9cbiAganVtcFRvKGVsZW1lbnQsIHRhcmdldCkge1xuICAgIC8vIFJlc2V0IHRoZSBoaXN0b3J5IHN0YXRlLiBUaGlzIHdpbGwgY2xlYXIgb3V0XG4gICAgLy8gdGhlIGhhc2ggd2hlbiB0aGUgdGFyZ2V0IGlzIHRvZ2dsZWQgY2xvc2VkXG4gICAgaGlzdG9yeS5wdXNoU3RhdGUoJycsICcnLFxuICAgICAgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lICsgd2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG5cbiAgICAvLyBGb2N1cyBpZiBhY3RpdmVcbiAgICBpZiAodGFyZ2V0LmNsYXNzTGlzdC5jb250YWlucyh0aGlzLnNldHRpbmdzLmFjdGl2ZUNsYXNzKSkge1xuICAgICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSBlbGVtZW50LmdldEF0dHJpYnV0ZSgnaHJlZicpO1xuXG4gICAgICB0YXJnZXQuc2V0QXR0cmlidXRlKCd0YWJpbmRleCcsICcwJyk7XG4gICAgICB0YXJnZXQuZm9jdXMoe3ByZXZlbnRTY3JvbGw6IHRydWV9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGFyZ2V0LnJlbW92ZUF0dHJpYnV0ZSgndGFiaW5kZXgnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgbWFpbiB0b2dnbGluZyBtZXRob2QgZm9yIGF0dHJpYnV0ZXNcbiAgICpcbiAgICogQHBhcmFtICB7T2JqZWN0fSAgICBlbGVtZW50ICAgIFRoZSBUb2dnbGUgZWxlbWVudFxuICAgKiBAcGFyYW0gIHtPYmplY3R9ICAgIHRhcmdldCAgICAgVGhlIFRhcmdldCBlbGVtZW50IHRvIHRvZ2dsZSBhY3RpdmUvaGlkZGVuXG4gICAqIEBwYXJhbSAge05vZGVMaXN0fSAgZm9jdXNhYmxlICBBbnkgZm9jdXNhYmxlIGNoaWxkcmVuIGluIHRoZSB0YXJnZXRcbiAgICpcbiAgICogQHJldHVybiB7T2JqZWN0fSAgICAgICAgICAgICAgIFRoZSBUb2dnbGUgaW5zdGFuY2VcbiAgICovXG4gIGVsZW1lbnRUb2dnbGUoZWxlbWVudCwgdGFyZ2V0LCBmb2N1c2FibGUgPSBbXSkge1xuICAgIGxldCBpID0gMDtcbiAgICBsZXQgYXR0ciA9ICcnO1xuICAgIGxldCB2YWx1ZSA9ICcnO1xuXG4gICAgLyoqXG4gICAgICogU3RvcmUgZWxlbWVudHMgZm9yIHBvdGVudGlhbCB1c2UgaW4gY2FsbGJhY2tzXG4gICAgICovXG5cbiAgICB0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMudGFyZ2V0ID0gdGFyZ2V0O1xuICAgIHRoaXMub3RoZXJzID0gdGhpcy5nZXRPdGhlcnMoZWxlbWVudCk7XG4gICAgdGhpcy5mb2N1c2FibGUgPSBmb2N1c2FibGU7XG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGl0eSBtZXRob2QgcHJvcGVydHkgdGhhdCB3aWxsIGNhbmNlbCB0aGUgdG9nZ2xlIGlmIGl0IHJldHVybnMgZmFsc2VcbiAgICAgKi9cblxuICAgIGlmICh0aGlzLnNldHRpbmdzLnZhbGlkICYmICF0aGlzLnNldHRpbmdzLnZhbGlkKHRoaXMpKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGluZyBiZWZvcmUgaG9va1xuICAgICAqL1xuXG4gICAgaWYgKHRoaXMuc2V0dGluZ3MuYmVmb3JlKVxuICAgICAgdGhpcy5zZXR0aW5ncy5iZWZvcmUodGhpcyk7XG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgRWxlbWVudCBhbmQgVGFyZ2V0IGNsYXNzZXNcbiAgICAgKi9cblxuICAgIGlmICh0aGlzLnNldHRpbmdzLmFjdGl2ZUNsYXNzKSB7XG4gICAgICB0aGlzLmVsZW1lbnQuY2xhc3NMaXN0LnRvZ2dsZSh0aGlzLnNldHRpbmdzLmFjdGl2ZUNsYXNzKTtcbiAgICAgIHRoaXMudGFyZ2V0LmNsYXNzTGlzdC50b2dnbGUodGhpcy5zZXR0aW5ncy5hY3RpdmVDbGFzcyk7XG5cbiAgICAgIC8vIElmIHRoZXJlIGFyZSBvdGhlciB0b2dnbGVzIHRoYXQgY29udHJvbCB0aGUgc2FtZSBlbGVtZW50XG4gICAgICB0aGlzLm90aGVycy5mb3JFYWNoKG90aGVyID0+IHtcbiAgICAgICAgaWYgKG90aGVyICE9PSB0aGlzLmVsZW1lbnQpXG4gICAgICAgICAgb3RoZXIuY2xhc3NMaXN0LnRvZ2dsZSh0aGlzLnNldHRpbmdzLmFjdGl2ZUNsYXNzKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnNldHRpbmdzLmluYWN0aXZlQ2xhc3MpXG4gICAgICB0YXJnZXQuY2xhc3NMaXN0LnRvZ2dsZSh0aGlzLnNldHRpbmdzLmluYWN0aXZlQ2xhc3MpO1xuXG4gICAgLyoqXG4gICAgICogVGFyZ2V0IEVsZW1lbnQgQXJpYSBBdHRyaWJ1dGVzXG4gICAgICovXG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgVG9nZ2xlLnRhcmdldEFyaWFSb2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgYXR0ciA9IFRvZ2dsZS50YXJnZXRBcmlhUm9sZXNbaV07XG4gICAgICB2YWx1ZSA9IHRoaXMudGFyZ2V0LmdldEF0dHJpYnV0ZShhdHRyKTtcblxuICAgICAgaWYgKHZhbHVlICE9ICcnICYmIHZhbHVlKVxuICAgICAgICB0aGlzLnRhcmdldC5zZXRBdHRyaWJ1dGUoYXR0ciwgKHZhbHVlID09PSAndHJ1ZScpID8gJ2ZhbHNlJyA6ICd0cnVlJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIHRoZSB0YXJnZXQncyBmb2N1c2FibGUgY2hpbGRyZW4gdGFiaW5kZXhcbiAgICAgKi9cblxuICAgIGlmICh0aGlzLnNldHRpbmdzLmZvY3VzYWJsZSlcbiAgICAgIHRoaXMudG9nZ2xlRm9jdXNhYmxlKHRoaXMuZm9jdXNhYmxlKTtcblxuICAgIC8qKlxuICAgICAqIEp1bXAgdG8gVGFyZ2V0IEVsZW1lbnQgaWYgVG9nZ2xlIEVsZW1lbnQgaXMgYW4gYW5jaG9yIGxpbmtcbiAgICAgKi9cblxuICAgIGlmICh0aGlzLnNldHRpbmdzLmp1bXAgJiYgdGhpcy5lbGVtZW50Lmhhc0F0dHJpYnV0ZSgnaHJlZicpKVxuICAgICAgdGhpcy5qdW1wVG8odGhpcy5lbGVtZW50LCB0aGlzLnRhcmdldCk7XG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgRWxlbWVudCAoaW5jbHVkaW5nIG11bHRpIHRvZ2dsZXMpIEFyaWEgQXR0cmlidXRlc1xuICAgICAqL1xuXG4gICAgZm9yIChpID0gMDsgaSA8IFRvZ2dsZS5lbEFyaWFSb2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgYXR0ciA9IFRvZ2dsZS5lbEFyaWFSb2xlc1tpXTtcbiAgICAgIHZhbHVlID0gdGhpcy5lbGVtZW50LmdldEF0dHJpYnV0ZShhdHRyKTtcblxuICAgICAgaWYgKHZhbHVlICE9ICcnICYmIHZhbHVlKVxuICAgICAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlKGF0dHIsICh2YWx1ZSA9PT0gJ3RydWUnKSA/ICdmYWxzZScgOiAndHJ1ZScpO1xuXG4gICAgICAvLyBJZiB0aGVyZSBhcmUgb3RoZXIgdG9nZ2xlcyB0aGF0IGNvbnRyb2wgdGhlIHNhbWUgZWxlbWVudFxuICAgICAgdGhpcy5vdGhlcnMuZm9yRWFjaCgob3RoZXIpID0+IHtcbiAgICAgICAgaWYgKG90aGVyICE9PSB0aGlzLmVsZW1lbnQgJiYgb3RoZXIuZ2V0QXR0cmlidXRlKGF0dHIpKVxuICAgICAgICAgIG90aGVyLnNldEF0dHJpYnV0ZShhdHRyLCAodmFsdWUgPT09ICd0cnVlJykgPyAnZmFsc2UnIDogJ3RydWUnKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRvZ2dsaW5nIGNvbXBsZXRlIGhvb2tcbiAgICAgKi9cblxuICAgIGlmICh0aGlzLnNldHRpbmdzLmFmdGVyKVxuICAgICAgdGhpcy5zZXR0aW5ncy5hZnRlcih0aGlzKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9XG59XG5cbi8qKiBAdHlwZSAge1N0cmluZ30gIFRoZSBtYWluIHNlbGVjdG9yIHRvIGFkZCB0aGUgdG9nZ2xpbmcgZnVuY3Rpb24gdG8gKi9cblRvZ2dsZS5zZWxlY3RvciA9ICdbZGF0YS1qcyo9XCJ0b2dnbGVcIl0nO1xuXG4vKiogQHR5cGUgIHtTdHJpbmd9ICBUaGUgbmFtZXNwYWNlIGZvciBvdXIgZGF0YSBhdHRyaWJ1dGUgc2V0dGluZ3MgKi9cblRvZ2dsZS5uYW1lc3BhY2UgPSAndG9nZ2xlJztcblxuLyoqIEB0eXBlICB7U3RyaW5nfSAgVGhlIGhpZGUgY2xhc3MgKi9cblRvZ2dsZS5pbmFjdGl2ZUNsYXNzID0gJ2hpZGRlbic7XG5cbi8qKiBAdHlwZSAge1N0cmluZ30gIFRoZSBhY3RpdmUgY2xhc3MgKi9cblRvZ2dsZS5hY3RpdmVDbGFzcyA9ICdhY3RpdmUnO1xuXG4vKiogQHR5cGUgIHtBcnJheX0gIEFyaWEgcm9sZXMgdG8gdG9nZ2xlIHRydWUvZmFsc2Ugb24gdGhlIHRvZ2dsaW5nIGVsZW1lbnQgKi9cblRvZ2dsZS5lbEFyaWFSb2xlcyA9IFsnYXJpYS1wcmVzc2VkJywgJ2FyaWEtZXhwYW5kZWQnXTtcblxuLyoqIEB0eXBlICB7QXJyYXl9ICBBcmlhIHJvbGVzIHRvIHRvZ2dsZSB0cnVlL2ZhbHNlIG9uIHRoZSB0YXJnZXQgZWxlbWVudCAqL1xuVG9nZ2xlLnRhcmdldEFyaWFSb2xlcyA9IFsnYXJpYS1oaWRkZW4nXTtcblxuLyoqIEB0eXBlICB7QXJyYXl9ICBGb2N1c2FibGUgZWxlbWVudHMgdG8gaGlkZSB3aXRoaW4gdGhlIGhpZGRlbiB0YXJnZXQgZWxlbWVudCAqL1xuVG9nZ2xlLmVsRm9jdXNhYmxlID0gW1xuICAnYScsICdidXR0b24nLCAnaW5wdXQnLCAnc2VsZWN0JywgJ3RleHRhcmVhJywgJ29iamVjdCcsICdlbWJlZCcsICdmb3JtJyxcbiAgJ2ZpZWxkc2V0JywgJ2xlZ2VuZCcsICdsYWJlbCcsICdhcmVhJywgJ2F1ZGlvJywgJ3ZpZGVvJywgJ2lmcmFtZScsICdzdmcnLFxuICAnZGV0YWlscycsICd0YWJsZScsICdbdGFiaW5kZXhdJywgJ1tjb250ZW50ZWRpdGFibGVdJywgJ1t1c2VtYXBdJ1xuXTtcblxuLyoqIEB0eXBlICB7QXJyYXl9ICBLZXkgYXR0cmlidXRlIGZvciBzdG9yaW5nIHRvZ2dsZXMgaW4gdGhlIHdpbmRvdyAqL1xuVG9nZ2xlLmNhbGxiYWNrID0gWydUb2dnbGVzQ2FsbGJhY2snXTtcblxuLyoqIEB0eXBlICB7QXJyYXl9ICBEZWZhdWx0IGV2ZW50cyB0byB0byB3YXRjaCBmb3IgdG9nZ2xpbmcuIEVhY2ggbXVzdCBoYXZlIGEgaGFuZGxlciBpbiB0aGUgY2xhc3MgYW5kIGVsZW1lbnRzIHRvIGxvb2sgZm9yIGluIFRvZ2dsZS5lbGVtZW50cyAqL1xuVG9nZ2xlLmV2ZW50cyA9IFsnY2xpY2snLCAnY2hhbmdlJ107XG5cbi8qKiBAdHlwZSAge0FycmF5fSAgRWxlbWVudHMgdG8gZGVsZWdhdGUgdG8gZWFjaCBldmVudCBoYW5kbGVyICovXG5Ub2dnbGUuZWxlbWVudHMgPSB7XG4gIENMSUNLOiBbJ0EnLCAnQlVUVE9OJ10sXG4gIENIQU5HRTogWydTRUxFQ1QnLCAnSU5QVVQnLCAnVEVYVEFSRUEnXVxufTtcblxuZXhwb3J0IGRlZmF1bHQgVG9nZ2xlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFRoZSBJY29uIG1vZHVsZVxuICogQGNsYXNzXG4gKi9cbmNsYXNzIEljb25zIHtcbiAgLyoqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IHBhdGggVGhlIHBhdGggb2YgdGhlIGljb24gZmlsZVxuICAgKiBAcmV0dXJuIHtvYmplY3R9IFRoZSBjbGFzc1xuICAgKi9cbiAgY29uc3RydWN0b3IocGF0aCkge1xuICAgIHBhdGggPSAocGF0aCkgPyBwYXRoIDogSWNvbnMucGF0aDtcblxuICAgIGZldGNoKHBhdGgpXG4gICAgICAudGhlbigocmVzcG9uc2UpID0+IHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLm9rKVxuICAgICAgICAgIHJldHVybiByZXNwb25zZS50ZXh0KCk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKVxuICAgICAgICAgICAgY29uc29sZS5kaXIocmVzcG9uc2UpO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpXG4gICAgICAgICAgY29uc29sZS5kaXIoZXJyb3IpO1xuICAgICAgfSlcbiAgICAgIC50aGVuKChkYXRhKSA9PiB7XG4gICAgICAgIGNvbnN0IHNwcml0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICBzcHJpdGUuaW5uZXJIVE1MID0gZGF0YTtcbiAgICAgICAgc3ByaXRlLnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCB0cnVlKTtcbiAgICAgICAgc3ByaXRlLnNldEF0dHJpYnV0ZSgnc3R5bGUnLCAnZGlzcGxheTogbm9uZTsnKTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzcHJpdGUpO1xuICAgICAgfSk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxufVxuXG4vKiogQHR5cGUge1N0cmluZ30gVGhlIHBhdGggb2YgdGhlIGljb24gZmlsZSAqL1xuSWNvbnMucGF0aCA9ICdzdmcvaWNvbnMuc3ZnJztcblxuZXhwb3J0IGRlZmF1bHQgSWNvbnM7XG4iLCIvKipcbiAqIE1hcHMgY2hhbmdlIGV2ZW50cyBmcm9tIHRoZSBDdXN0b20gVHJhbnNsYXRlIGVsZW1lbnQgdG8gdGhlIEdvb2dsZSBUcmFuc2xhdGVcbiAqIGVsZW1lbnQuIE9ic2VydmVzIHRoZSBodG1sIGxhbmcgYXR0cmlidXRlIGFuZCBzd2l0Y2hlcyBzdHlsZXNoZWV0cyBiYXNlZCBvblxuICogdGhlIGNoYW5nZWQgbGFuZ3VhZ2UgKGlmIHRoZSBzdHlsZXNoZWV0IGV4aXN0cykuXG4gKlxuICogQGNsYXNzXG4gKi9cbiBjbGFzcyBUcmFuc2xhdGVFbGVtZW50IHtcbiAgLyoqXG4gICAqIFRoZSBDb25zdHJ1Y3RvclxuICAgKlxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgZWxlbWVudCAgVGhlIGNvbnRhaW5lciBvZiB0aGUgR29vZ2xlIFRyYW5zbGF0ZSBFbGVtZW50XG4gICAqXG4gICAqIEByZXR1cm4gIHtPYmplY3R9ICBBbiBpbnN0YW5jZSBvZiBUcmFuc2xhdGVFbGVtZW50XG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50KSB7XG4gICAgdGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblxuICAgIHRoaXMuY29udHJvbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoVHJhbnNsYXRlRWxlbWVudC5zZWxlY3RvcnMuY29udHJvbCk7XG5cbiAgICB0aGlzLmh0bWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFRyYW5zbGF0ZUVsZW1lbnQuc2VsZWN0b3JzLmh0bWwpO1xuXG4gICAgLyoqXG4gICAgICogT2JzZXJ2ZSB0aGUgSFRNTCB0YWcgZm9yIGxhbmd1YWdlIHN3aXRjaGluZ1xuICAgICAqL1xuICAgIG5ldyBNdXRhdGlvbk9ic2VydmVyKG11dGF0aW9ucyA9PiB7XG4gICAgICB0aGlzLm9ic2VydmVyKG11dGF0aW9ucyk7XG4gICAgfSkub2JzZXJ2ZSh0aGlzLmh0bWwsIHtcbiAgICAgIGF0dHJpYnV0ZXM6IHRydWVcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIExpc3RlbiBmb3IgdGhlIGNoYW5nZSBldmVudCBvbiB0aGUgc2VsZWN0IGNvbnRyb2xsZXJcbiAgICAgKi9cbiAgICB0aGlzLmNvbnRyb2wuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZXZlbnQgPT4ge1xuICAgICAgdGhpcy5jaGFuZ2UoZXZlbnQpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogUHJlcGVuZCB0aGUgbGFuZ3VhZ2UgcGF0aCB0byBhbiBpbnRlcm5hbCBsaW5rXG4gICAqXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICBldmVudCAgVGhlIGxpbmsgY2xpY2sgZXZlbnRcbiAgICovXG4gIGNsaWNrKGV2ZW50KSB7XG4gICAgbGV0IG9yaWdpbiA9IHdpbmRvdy5sb2NhdGlvbi5vcmlnaW47XG4gICAgbGV0IGxpbmsgPSAoZXZlbnQudGFyZ2V0Lm1hdGNoZXMoJ2EnKSlcbiAgICAgID8gZXZlbnQudGFyZ2V0IDogZXZlbnQudGFyZ2V0LmNsb3Nlc3QoJ2EnKTtcblxuICAgIGxldCBsYW5nID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihUcmFuc2xhdGVFbGVtZW50LnNlbGVjdG9ycy5odG1sKVxuICAgICAgLmdldEF0dHJpYnV0ZSgnbGFuZycpO1xuXG4gICAgbGV0IHNsYW5nID0gKGxhbmcgPT09IFRyYW5zbGF0ZUVsZW1lbnQubWFwc1snemgtaGFudCddKVxuICAgICAgICA/ICd6aC1oYW50JyA6IGxhbmc7XG5cbiAgICBsZXQgc2xpbmsgPSBsaW5rLmhyZWYucmVwbGFjZShvcmlnaW4sIGAke29yaWdpbn0vJHtzbGFuZ31gKTtcbiAgICBsZXQgdGFyZ2V0ID0gKGxpbmsudGFyZ2V0ID09PSAnX2JsYW5rJykgPyBsaW5rLnRhcmdldCA6ICdfc2VsZic7XG5cbiAgICBsZXQgc2FtZXNpdGUgPSBsaW5rLmhyZWYuaW5jbHVkZXMob3JpZ2luKTtcbiAgICBsZXQgc2FtZXBhZ2UgPSAobGluay5wYXRobmFtZSA9PT0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lKTtcblxuICAgIGlmIChzYW1lc2l0ZSAmJiAhc2FtZXBhZ2UpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgIHdpbmRvdy5vcGVuKHNsaW5rLCB0YXJnZXQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgb2JzZXJ2ZXIgbWV0aG9kIGZvciB0aGUgSFRNTCBsYW5nIGF0dHJpYnV0ZTtcbiAgICogMS4gVXBkYXRlIHRoZSBzZWxlY3QgaWYgdGhlIG9yaWdpbmFsIGxhbmd1YWdlIChFbmdsaXNoKSBpcyByZXN0b3JlZFxuICAgKiAyLiBTZXQgcmVhZGluZyBkaXJlY3Rpb24gb2YgdGhlIGRvY3VtZW50XG4gICAqIDMuIFN3aXRjaCB0byB0aGUgYXBwcm9wcmlhdGUgbGFuZ3VhZ2Ugc3R5bGVzaGVldCBpZiBpdCBleGlzdHNcbiAgICogNC4gQWRkIHRoZSBjbGljayBldmVudCBmb3IgcHJlcGVuZGluZyB0aGUgbGFuZ3VhZ2UgcGF0aCB0byBpbnRlcm5hbCBsaW5rXG4gICAqXG4gICAqIEBwYXJhbSAgIHtBcnJheX0gIG11dGF0aW9ucyAgTGlzdCBvZiBNdXRhdGlvbnMgZnJvbSBNdXRhdGlvbk9ic2VydmVyXG4gICAqL1xuICBvYnNlcnZlcihtdXRhdGlvbnMpIHtcbiAgICBsZXQgbGFuZ3MgPSBtdXRhdGlvbnMuZmlsdGVyKG0gPT4gbS5hdHRyaWJ1dGVOYW1lID09PSAnbGFuZycpO1xuICAgIGxldCBzdHlsZXNoZWV0cyA9IFRyYW5zbGF0ZUVsZW1lbnQuc3R5bGVzaGVldHM7XG5cbiAgICBpZiAobGFuZ3MubGVuZ3RoKSB7XG4gICAgICBsZXQgbGFuZyA9IGxhbmdzWzBdLnRhcmdldC5sYW5nO1xuXG4gICAgICAvLyBVcGRhdGUgdGhlIHNlbGVjdCBpZiB0aGUgb3JpZ2luYWwgbGFuZ3VhZ2UgKEVuZ2xpc2gpIGlzIHJlc3RvcmVkXG4gICAgICB0aGlzLmNvbnRyb2wudmFsdWUgPSAoVHJhbnNsYXRlRWxlbWVudC5yZXN0b3JlLmluY2x1ZGVzKGxhbmcpKVxuICAgICAgICA/ICdyZXN0b3JlJyA6IGxhbmc7XG5cbiAgICAgIC8vIFNldCByZWFkaW5nIGRpcmVjdGlvbiBvZiB0aGUgZG9jdW1lbnRcbiAgICAgIHRoaXMuaHRtbC5zZXRBdHRyaWJ1dGUoJ2RpcmVjdGlvbicsXG4gICAgICAgIChUcmFuc2xhdGVFbGVtZW50LnJ0bC5pbmNsdWRlcyhsYW5nKSkgPyAncnRsJyA6ICdsdHInKTtcblxuICAgICAgLy8gU3dpdGNoIHRvIHRoZSBhcHByb3ByaWF0ZSBsYW5ndWFnZSBzdHlsZXNoZWV0IGlmIGl0IGV4aXN0c1xuICAgICAgbGV0IHNsYW5nID0gKGxhbmcgPT09IFRyYW5zbGF0ZUVsZW1lbnQubWFwc1snemgtaGFudCddKVxuICAgICAgICA/ICd6aC1oYW50JyA6IGxhbmc7XG5cbiAgICAgIGxldCBzdHlsZXNoZWV0ID0gc3R5bGVzaGVldHMuZmlsdGVyKHMgPT4gcy5pbmNsdWRlcyhgc3R5bGUtJHtzbGFuZ31gKSk7XG4gICAgICBsZXQgbGF0aW4gPSBzdHlsZXNoZWV0cy5maWx0ZXIocyA9PiBzLmluY2x1ZGVzKCdzdHlsZS1kZWZhdWx0JykpO1xuICAgICAgbGV0IHN3aXRjaGVkID0gKHN0eWxlc2hlZXQubGVuZ3RoKSA/IHN0eWxlc2hlZXRbMF0gOiBsYXRpblswXTtcblxuICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihUcmFuc2xhdGVFbGVtZW50LnNlbGVjdG9ycy5zdHlsZXNoZWV0KVxuICAgICAgICAuc2V0QXR0cmlidXRlKCdocmVmJywgc3dpdGNoZWQpO1xuXG4gICAgICAvLyBBZGQgdGhlIGNsaWNrIGV2ZW50IGZvciBwcmVwZW5kaW5nIHRoZSBsYW5ndWFnZSBwYXRoIHRvIGludGVybmFsIGxpbmtcbiAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2EnKS5mb3JFYWNoKGxpbmsgPT4ge1xuICAgICAgICBpZiAoVHJhbnNsYXRlRWxlbWVudC5yZXN0b3JlLmluY2x1ZGVzKGxhbmcpKSB7XG4gICAgICAgICAgbGluay5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuY2xpY2spO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxpbmsuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmNsaWNrKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBzZWxlY3QgY2hhbmdlIGV2ZW50IG1hcHBpbmcgZnJvbSBjdXN0b20gZWxlbWVudCB0byBnb29nbGUgZWxlbWVudFxuICAgKlxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgZXZlbnQgIFRoZSBvcmlnaW5hbCBjaGFuZ2UgZXZlbnQgb2YgdGhlIGN1c3RvbSBlbGVtZW50XG4gICAqL1xuICBjaGFuZ2UoZXZlbnQpIHtcbiAgICBsZXQgc2VsZWN0ID0gdGhpcy5lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ3NlbGVjdCcpO1xuXG4gICAgc2VsZWN0LnZhbHVlID0gZXZlbnQudGFyZ2V0LnZhbHVlO1xuXG4gICAgbGV0IGNoYW5nZTtcblxuICAgIGlmICh0eXBlb2YoRXZlbnQpID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjaGFuZ2UgPSBuZXcgRXZlbnQoJ2NoYW5nZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjaGFuZ2UgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcbiAgICAgIGNoYW5nZS5pbml0RXZlbnQoJ2NoYW5nZScsIHRydWUsIHRydWUpO1xuICAgIH1cblxuICAgIHNlbGVjdC5kaXNwYXRjaEV2ZW50KGNoYW5nZSk7XG4gIH1cbn1cblxuLyoqIEFycmF5IG9mIGV4aXN0aW5nIHNpdGUgc3R5bGVzaGVldHMgdG8gc3dpdGNoICovXG5UcmFuc2xhdGVFbGVtZW50LnN0eWxlc2hlZXRzID0gd2luZG93LlNUWUxFU0hFRVRTO1xuXG4vKiogUmlnaHQgdG8gbGVmdCBsYW5ndWFnZXMgKi9cblRyYW5zbGF0ZUVsZW1lbnQucnRsID0gWydhcicsICd1ciddO1xuXG4vKiogVmFsdWVzIHRoYXQgdHJpZ2dlciB0aGUgcmVzdG9yZSB2YWx1ZSBjaGFuZ2UgaW4gdGhlIGN1c3RvbSBlbGVtZW50ICovXG5UcmFuc2xhdGVFbGVtZW50LnJlc3RvcmUgPSBbJ2F1dG8nLCAnZW4nXTtcblxuLyoqIEdvb2dsZSBUcmFuc2xhdGUgZWxlbWVudCBzZWxlY3RvciAqL1xuVHJhbnNsYXRlRWxlbWVudC5zZWxlY3RvciA9ICcjanMtZ29vZ2xlLXRyYW5zbGF0ZSc7XG5cbi8qKiBDb2xsZWN0aW9uIG9mIGNvbXBvbmVudCBzZWxlY3RvcnMgKi9cblRyYW5zbGF0ZUVsZW1lbnQuc2VsZWN0b3JzID0ge1xuICBjb250cm9sOiAnI2pzLWdvb2dsZS10cmFuc2xhdGUtY29udHJvbCcsXG4gIGh0bWw6ICdodG1sJyxcbiAgc3R5bGVzaGVldDogJyNzdHlsZS1kZWZhdWx0LWNzcydcbn07XG5cbi8qKiBMYW5ndWFnZSBtYXBwaW5ncyBmcm9tIHRoZSBzaXRlIHRvIHRoZSBHb29nbGUgVHJhbnNsYXRlIGVsZW1lbnQgKi9cblRyYW5zbGF0ZUVsZW1lbnQubWFwcyA9IHtcbiAgJ3poLWhhbnQnOiAnemgtQ04nXG59O1xuXG5leHBvcnQgZGVmYXVsdCBUcmFuc2xhdGVFbGVtZW50O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFN0YXRpYyBjb2x1bW4gbW9kdWxlXG4gKiBTaW1pbGFyIHRvIHRoZSBnZW5lcmFsIHN0aWNreSBtb2R1bGUgYnV0IHVzZWQgc3BlY2lmaWNhbGx5IHdoZW4gb25lIGNvbHVtblxuICogb2YgYSB0d28tY29sdW1uIGxheW91dCBpcyBtZWFudCB0byBiZSBzdGlja3lcbiAqIEBtb2R1bGUgbW9kdWxlcy9zdGF0aWNDb2x1bW5cbiAqIEBzZWUgbW9kdWxlcy9zdGlja3lOYXZcbiAqL1xuXG5jbGFzcyBTdGF0aWNDb2x1bW4ge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLl9zZXR0aW5ncyA9IHtcbiAgICAgIHNlbGVjdG9yOiBTdGF0aWNDb2x1bW4uc2VsZWN0b3IsXG4gICAgfTtcblxuICAgIGNvbnN0IHN0aWNreUNvbnRlbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFxuICAgICAgYC4ke3RoaXMuX3NldHRpbmdzLnNlbGVjdG9yfWBcbiAgICApO1xuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIHdpbmRvdyBwb3NpdGlvbiBhbmQgc2V0cyB0aGUgYXBwcm9wcmlhdGUgY2xhc3Mgb24gdGhlIGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc3RpY2t5Q29udGVudEVsZW0gLSBET00gbm9kZSB0aGF0IHNob3VsZCBiZSBzdGlja2llZFxuICAgICAqL1xuICAgIHRoaXMuYXNzaWduU3RpY2t5RmVhdHVyZShzdGlja3lDb250ZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJdGVyYXRlIG92ZXIgZWxlbWV0cyBjb250YWluaW5nIHRoZSBjbGFzcyAnanMtc3RhdGljJy5cbiAgICogT24gcGFnZSBsb2FkLCBzY3JlZW5SZXNpemUgYW5kIHNjcm9sbCBldmVudHMsIGNhbGxzIFN0YXRpY0NvbHVtbi5jYWxjV2luZG93UG9zIGZ1bmN0aW9uIC5cbiAgICogQHBhcmFtIHtlbGVtZW50c30gc3RpY2t5Q29udGVudCBFbGVtZW50IGluIGNoaWNoIHRoZSBzdGlja3kgZWZmZWN0IHdpbGwgYmUgYXBwbGllZFxuICAgKi9cblxuICBhc3NpZ25TdGlja3lGZWF0dXJlKHN0aWNreUNvbnRlbnQpIHtcbiAgICBpZiAoc3RpY2t5Q29udGVudCkge1xuICAgICAgc3RpY2t5Q29udGVudC5mb3JFYWNoKGZ1bmN0aW9uKHN0aWNreUNvbnRlbnRFbGVtKSB7XG4gICAgICAgIFN0YXRpY0NvbHVtbi5jYWxjV2luZG93UG9zKHN0aWNreUNvbnRlbnRFbGVtKTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFkZCBldmVudCBsaXN0ZW5lciBmb3IgJ3Njcm9sbCcuXG4gICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgKiBAcGFyYW0ge29iamVjdH0gZXZlbnQgLSBUaGUgZXZlbnQgb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgICAgICAnc2Nyb2xsJyxcbiAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIFN0YXRpY0NvbHVtbi5jYWxjV2luZG93UG9zKHN0aWNreUNvbnRlbnRFbGVtKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGZhbHNlXG4gICAgICAgICk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFkZCBldmVudCBsaXN0ZW5lciBmb3IgJ3Jlc2l6ZScuXG4gICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgKiBAcGFyYW0ge29iamVjdH0gZXZlbnQgLSBUaGUgZXZlbnQgb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgICAgICAncmVzaXplJyxcbiAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIFN0YXRpY0NvbHVtbi5jYWxjV2luZG93UG9zKHN0aWNreUNvbnRlbnRFbGVtKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGZhbHNlXG4gICAgICAgICk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBkZXBlbmRpbmcgb24gZWxlbWVudHMgcG9zdGlvbiBpbiB0aGUgcGFnZSBhZGQgYW5kIHJlbW92ZSBjbGFzc2VzXG4gKiBAcGFyYW0ge2VsZW1lbnR9IHN0aWNreUNvbnRlbnRFbGVtIGFuIGVsZW1lbnQgd2l0aCB0aGUgY2xhc3MgbmFtZSAnanMtc3RhdGljJ1xuICovXG5cblN0YXRpY0NvbHVtbi5jYWxjV2luZG93UG9zID0gZnVuY3Rpb24oc3RpY2t5Q29udGVudEVsZW0pIHtcbiAgbGV0IGVsZW1Ub3AgPSBzdGlja3lDb250ZW50RWxlbS5wYXJlbnRFbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcDtcbiAgbGV0IGlzUGFzdEJvdHRvbSA9XG4gICAgd2luZG93LmlubmVySGVpZ2h0IC1cbiAgICAgIHN0aWNreUNvbnRlbnRFbGVtLnBhcmVudEVsZW1lbnQuY2xpZW50SGVpZ2h0IC1cbiAgICAgIHN0aWNreUNvbnRlbnRFbGVtLnBhcmVudEVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wID5cbiAgICAwO1xuXG4gIC8vIFNldHMgZWxlbWVudCB0byBwb3NpdGlvbiBhYnNvbHV0ZSBpZiBub3Qgc2Nyb2xsZWQgdG8geWV0LlxuICAvLyBBYnNvbHV0ZWx5IHBvc2l0aW9uaW5nIG9ubHkgd2hlbiBuZWNlc3NhcnkgYW5kIG5vdCBieSBkZWZhdWx0IHByZXZlbnRzIGZsaWNrZXJpbmdcbiAgLy8gd2hlbiByZW1vdmluZyB0aGUgXCJpcy1ib3R0b21cIiBjbGFzcyBvbiBDaHJvbWVcbiAgaWYgKGVsZW1Ub3AgPiAwKSB7XG4gICAgc3RpY2t5Q29udGVudEVsZW0uY2xhc3NMaXN0LmFkZChTdGF0aWNDb2x1bW4ubm90U3RpY2t5Q2xhc3MpO1xuICB9IGVsc2Uge1xuICAgIHN0aWNreUNvbnRlbnRFbGVtLmNsYXNzTGlzdC5yZW1vdmUoU3RhdGljQ29sdW1uLm5vdFN0aWNreUNsYXNzKTtcbiAgfVxuICBpZiAoaXNQYXN0Qm90dG9tKSB7XG4gICAgc3RpY2t5Q29udGVudEVsZW0uY2xhc3NMaXN0LmFkZChTdGF0aWNDb2x1bW4uYm90dG9tQ2xhc3MpO1xuICB9IGVsc2Uge1xuICAgIHN0aWNreUNvbnRlbnRFbGVtLmNsYXNzTGlzdC5yZW1vdmUoU3RhdGljQ29sdW1uLmJvdHRvbUNsYXNzKTtcbiAgfVxufTtcblxuU3RhdGljQ29sdW1uLnNlbGVjdG9yID0gJ2pzLXN0YXRpYyc7XG5TdGF0aWNDb2x1bW4ubm90U3RpY2t5Q2xhc3MgPSAnaXMtbm90LXN0aWNreSc7XG5TdGF0aWNDb2x1bW4uYm90dG9tQ2xhc3MgPSAnaXMtYm90dG9tJztcblxuZXhwb3J0IGRlZmF1bHQgU3RhdGljQ29sdW1uO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jbGFzcyBBbmltYXRpb25zIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5fc2V0dGluZ3MgPSB7XG4gICAgICBzZWxlY3RvcjogQW5pbWF0aW9ucy5zZWxlY3RvcixcbiAgICAgIGNvbnRyb2xsZXI6IEFuaW1hdGlvbnMuY29udHJvbGxlcixcbiAgICAgIHNwZWVkOiBBbmltYXRpb25zLnNwZWVkLFxuICAgIH07XG5cbiAgICBjb25zdCByb3RhdGluZyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwodGhpcy5fc2V0dGluZ3Muc2VsZWN0b3IpO1xuICAgIHZhciB0ZXJtcyA9IFtdO1xuXG4gICAgLy8gSXRlcmF0ZSBvdmVyIHRoZSBlbGVtZW50IGFuZCBhZGQgdGhlaXIgdGV4dENvbnRlbnQgaW4gYW4gYXJyYXlcbiAgICByb3RhdGluZy5mb3JFYWNoKGZ1bmN0aW9uKHRlcm0pIHtcbiAgICAgIGlmICh0ZXJtLmlubmVyVGV4dC50cmltKCkgIT09ICcnKSB7XG4gICAgICAgIHRlcm1zLnB1c2godGVybS5pbm5lclRleHQpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgQW5pbWF0aW9ucy5yb3RhdGVUZXJtcyhcbiAgICAgIHRlcm1zLFxuICAgICAgdGhpcy5fc2V0dGluZ3MuY29udHJvbGxlcixcbiAgICAgIHRoaXMuX3NldHRpbmdzLnNwZWVkXG4gICAgKTtcbiAgfVxufVxuXG4vKipcbiAqIEFjY2VwdHMgYXJyYXkgb2Ygc3RyaW5nIGFuZCBjcmVhdGVzIHJvdGF0aW5nIGxvb3AgZm9yIHRoZSBkdXJhdGlvbiBvZiB0aGUgdGltZSBwcm92aWRlZCBhcyBhIHNwZWVkIGFyZ3VtZW50LlxuICogQWZ0ZXIgZXZlcnkgcm90YXRpb24gY2FsbGVzIHRoZSBBbmltYXRpb24uZmFkZUlub3V0IGZ1bmN0aW9uXG4gKiBAcGFyYW0ge2FycmF5fSB0ZXJtcyBhcnJheSBvZiBzdHJpbmdzXG4gKiBAcGFyYW0ge2RhdGEtanN9IGNvbnRyb2wgdGhlIGFuaW1hdGlvbiBjb250cm9sbGluZyBlbGVtZW50IGNsYXNzXG4gKiBAcGFyYW0ge251bWJlcn0gc3BlZWQgYW5pbWF0aW9uIHNwZWVlZFxuICovXG5cbkFuaW1hdGlvbnMucm90YXRlVGVybXMgPSBmdW5jdGlvbih0ZXJtcywgY29udHJvbCwgc3BlZWQpIHtcbiAgY29uc3QgY29udHJvbGxlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoY29udHJvbCk7XG5cbiAgY29udHJvbGxlci5pbm5lclRleHQgPSB0ZXJtc1swXS50cmltKCk7XG4gIEFuaW1hdGlvbnMuZmFkZUluT3V0KGNvbnRyb2xsZXIpO1xuXG4gIHZhciBpID0gMTtcbiAgc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgaWYgKGkgPT0gdGVybXMubGVuZ3RoKSB7XG4gICAgICBpID0gMDtcbiAgICB9XG4gICAgY29udHJvbGxlci5pbm5lclRleHQgPSB0ZXJtc1tpXS50cmltKCk7XG4gICAgQW5pbWF0aW9ucy5mYWRlSW5PdXQoY29udHJvbGxlcik7XG5cbiAgICBpKys7XG4gIH0sIDMwMDApO1xufTtcblxuLyoqXG4gKiBBZnRlciBldmV5IHJvdGF0aW9uIGFkZHMgYW5kIHJlbW92ZXMgYW5pbWF0ZS5jc3MgY2xhc3NlcyB0byBmYWRlIGluIGFuZCBmYWRlIG91dCB0aGUgc3RyaW5nc1xuICogQHBhcmFtIHtlbGVtZW50fSBjb250cm9sbGVyXG4gKi9cbkFuaW1hdGlvbnMuZmFkZUluT3V0ID0gZnVuY3Rpb24oY29udHJvbGxlcikge1xuICBjb250cm9sbGVyLmNsYXNzTGlzdC5hZGQoJ2ZhZGVJbicpO1xuXG4gIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgY29udHJvbGxlci5jbGFzc0xpc3QuYWRkKCdmYWRlT3V0Jyk7XG4gICAgY29udHJvbGxlci5jbGFzc0xpc3QucmVtb3ZlKCdmYWRlSW4nKTtcbiAgfSwgMjAwMCk7XG59O1xuXG5BbmltYXRpb25zLnNwZWVkID0gMTUwMDtcblxuQW5pbWF0aW9ucy5zZWxlY3RvciA9ICdbZGF0YS1qcyo9XCJyb3RhdGUtdGV4dFwiXSc7XG5cbkFuaW1hdGlvbnMuY29udHJvbGxlciA9ICdbZGF0YS1qcyo9XCJyb3RhdGUtY29udHJvbGxlclwiXSc7XG5cbmV4cG9ydCBkZWZhdWx0IEFuaW1hdGlvbnM7XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBUb2dnbGUgZnJvbSAnQG55Y29wcG9ydHVuaXR5L3B0dHJuLXNjcmlwdHMvc3JjL3RvZ2dsZS90b2dnbGUnO1xuaW1wb3J0IEljb25zIGZyb20gJ0BueWNvcHBvcnR1bml0eS9wdHRybi1zY3JpcHRzL3NyYy9pY29ucy9pY29ucyc7XG5pbXBvcnQgVHJhbnNsYXRlRWxlbWVudCBmcm9tICdAbnljb3Bwb3J0dW5pdHkvcHR0cm4tc2NyaXB0cy9zcmMvZ29vZ2xlLXRyYW5zbGF0ZS1lbGVtZW50L2dvb2dsZS10cmFuc2xhdGUtZWxlbWVudCc7XG5pbXBvcnQgU3RhdGljQ29sdW1uIGZyb20gJy4vc3RhdGljQ29sdW1uJztcbmltcG9ydCBUZXh0Um90YXRpb24gZnJvbSAnLi90ZXh0Um90YXRpb24nO1xuXG5jbGFzcyBEZWZhdWx0IHtcbiAgY29uc3RydWN0b3IoKSB7fVxuXG4gIHRvZ2dsZSgpIHtcbiAgICByZXR1cm4gbmV3IFRvZ2dsZSgpO1xuICB9XG5cbiAgYWNjb3JkaW9uKCkge1xuICAgIHJldHVybiBuZXcgVG9nZ2xlKHtcbiAgICAgIHNlbGVjdG9yOiAnW2RhdGEtanMqPVwiYWNjb3JkaW9uXCJdJyxcbiAgICAgIGFmdGVyOiAodG9nZ2xlKSA9PiB7XG4gICAgICAgIHRvZ2dsZS5lbGVtZW50LnBhcmVudE5vZGUuY2xhc3NMaXN0LnRvZ2dsZSgnaXMtZXhwYW5kZWQnKTtcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICBpY29ucyhwYXRoKSB7XG4gICAgcmV0dXJuIG5ldyBJY29ucyhwYXRoKTtcbiAgfVxuXG4gIHN0YXRpY0NvbHVtbigpIHtcbiAgICByZXR1cm4gbmV3IFN0YXRpY0NvbHVtbigpO1xuICB9XG5cbiAgdGV4dFJvdGF0aW9uKCkge1xuICAgIHJldHVybiBuZXcgVGV4dFJvdGF0aW9uKCk7XG4gIH1cblxuICB0cmFuc2xhdGVFbGVtZW50KCkge1xuICAgIG5ldyBUcmFuc2xhdGVFbGVtZW50KGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoVHJhbnNsYXRlRWxlbWVudC5zZWxlY3RvcikpO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IERlZmF1bHQ7XG4iXSwibmFtZXMiOlsiVGV4dFJvdGF0aW9uIl0sIm1hcHBpbmdzIjoiOzs7RUFFQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNLE1BQU0sQ0FBQztFQUNiO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsRUFBRSxXQUFXLENBQUMsQ0FBQyxFQUFFO0VBQ2pCO0VBQ0EsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO0VBQy9DLE1BQU0sTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDbkM7RUFDQSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDdEI7RUFDQSxJQUFJLElBQUksQ0FBQyxRQUFRLEdBQUc7RUFDcEIsTUFBTSxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxJQUFJ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
