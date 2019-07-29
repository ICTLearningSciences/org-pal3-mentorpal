/*! cmi5.js 2.0.1 2018-01-17T13:25:59-0600 */
/*! http://mths.be/punycode v1.2.3 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports;
	var freeModule = typeof module == 'object' && module &&
		module.exports == freeExports && module;
	var freeGlobal = typeof global == 'object' && global;
	if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^ -~]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /\x2E|\u3002|\uFF0E|\uFF61/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		while (length--) {
			array[length] = fn(array[length]);
		}
		return array;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings.
	 * @private
	 * @param {String} domain The domain name.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		return map(string.split(regexSeparators), fn).join('.');
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <http://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * http://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    length,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols to a Punycode string of ASCII-only
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name to Unicode. Only the
	 * Punycoded parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it on a string that has already been converted to
	 * Unicode.
	 * @memberOf punycode
	 * @param {String} domain The Punycode domain name to convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(domain) {
		return mapDomain(domain, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name to Punycode. Only the
	 * non-ASCII parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it with a domain that's already in ASCII.
	 * @memberOf punycode
	 * @param {String} domain The domain name to convert, as a Unicode string.
	 * @returns {String} The Punycode representation of the given domain name.
	 */
	function toASCII(domain) {
		return mapDomain(domain, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.2.3',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <http://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define(function() {
			return punycode;
		});
	}	else if (freeExports && !freeExports.nodeType) {
		if (freeModule) { // in Node.js or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else { // in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else { // in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

/*!
 * URI.js - Mutating URLs
 *
 * Version: 1.14.2
 *
 * Author: Rodney Rehm
 * Web: http://medialize.github.io/URI.js/
 *
 * Licensed under
 *   MIT License http://www.opensource.org/licenses/mit-license
 *   GPL v3 http://opensource.org/licenses/GPL-3.0
 *
 */
(function (root, factory) {
  'use strict';
  // https://github.com/umdjs/umd/blob/master/returnExports.js
  if (typeof exports === 'object') {
    // Node
    module.exports = factory(require('./punycode'), require('./IPv6'), require('./SecondLevelDomains'));
  } else if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['./punycode', './IPv6', './SecondLevelDomains'], factory);
  } else {
    // Browser globals (root is window)
    root.URI = factory(root.punycode, root.IPv6, root.SecondLevelDomains, root);
  }
}(this, function (punycode, IPv6, SLD, root) {
  'use strict';
  /*global location, escape, unescape */
  // FIXME: v2.0.0 renamce non-camelCase properties to uppercase
  /*jshint camelcase: false */

  // save current URI variable, if any
  var _URI = root && root.URI;

  function URI(url, base) {
    // Allow instantiation without the 'new' keyword
    if (!(this instanceof URI)) {
      return new URI(url, base);
    }

    if (url === undefined) {
      if (arguments.length) {
        throw new TypeError('undefined is not a valid argument for URI');
      }

      if (typeof location !== 'undefined') {
        url = location.href + '';
      } else {
        url = '';
      }
    }

    this.href(url);

    // resolve to base according to http://dvcs.w3.org/hg/url/raw-file/tip/Overview.html#constructor
    if (base !== undefined) {
      return this.absoluteTo(base);
    }

    return this;
  }

  URI.version = '1.14.2';

  var p = URI.prototype;
  var hasOwn = Object.prototype.hasOwnProperty;

  function escapeRegEx(string) {
    // https://github.com/medialize/URI.js/commit/85ac21783c11f8ccab06106dba9735a31a86924d#commitcomment-821963
    return string.replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
  }

  function getType(value) {
    // IE8 doesn't return [Object Undefined] but [Object Object] for undefined value
    if (value === undefined) {
      return 'Undefined';
    }

    return String(Object.prototype.toString.call(value)).slice(8, -1);
  }

  function isArray(obj) {
    return getType(obj) === 'Array';
  }

  function filterArrayValues(data, value) {
    var lookup = {};
    var i, length;

    if (isArray(value)) {
      for (i = 0, length = value.length; i < length; i++) {
        lookup[value[i]] = true;
      }
    } else {
      lookup[value] = true;
    }

    for (i = 0, length = data.length; i < length; i++) {
      if (lookup[data[i]] !== undefined) {
        data.splice(i, 1);
        length--;
        i--;
      }
    }

    return data;
  }

  function arrayContains(list, value) {
    var i, length;

    // value may be string, number, array, regexp
    if (isArray(value)) {
      // Note: this can be optimized to O(n) (instead of current O(m * n))
      for (i = 0, length = value.length; i < length; i++) {
        if (!arrayContains(list, value[i])) {
          return false;
        }
      }

      return true;
    }

    var _type = getType(value);
    for (i = 0, length = list.length; i < length; i++) {
      if (_type === 'RegExp') {
        if (typeof list[i] === 'string' && list[i].match(value)) {
          return true;
        }
      } else if (list[i] === value) {
        return true;
      }
    }

    return false;
  }

  function arraysEqual(one, two) {
    if (!isArray(one) || !isArray(two)) {
      return false;
    }

    // arrays can't be equal if they have different amount of content
    if (one.length !== two.length) {
      return false;
    }

    one.sort();
    two.sort();

    for (var i = 0, l = one.length; i < l; i++) {
      if (one[i] !== two[i]) {
        return false;
      }
    }

    return true;
  }

  URI._parts = function() {
    return {
      protocol: null,
      username: null,
      password: null,
      hostname: null,
      urn: null,
      port: null,
      path: null,
      query: null,
      fragment: null,
      // state
      duplicateQueryParameters: URI.duplicateQueryParameters,
      escapeQuerySpace: URI.escapeQuerySpace
    };
  };
  // state: allow duplicate query parameters (a=1&a=1)
  URI.duplicateQueryParameters = false;
  // state: replaces + with %20 (space in query strings)
  URI.escapeQuerySpace = true;
  // static properties
  URI.protocol_expression = /^[a-z][a-z0-9.+-]*$/i;
  URI.idn_expression = /[^a-z0-9\.-]/i;
  URI.punycode_expression = /(xn--)/i;
  // well, 333.444.555.666 matches, but it sure ain't no IPv4 - do we care?
  URI.ip4_expression = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  // credits to Rich Brown
  // source: http://forums.intermapper.com/viewtopic.php?p=1096#1096
  // specification: http://www.ietf.org/rfc/rfc4291.txt
  URI.ip6_expression = /^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/;
  // expression used is "gruber revised" (@gruber v2) determined to be the
  // best solution in a regex-golf we did a couple of ages ago at
  // * http://mathiasbynens.be/demo/url-regex
  // * http://rodneyrehm.de/t/url-regex.html
  URI.find_uri_expression = /\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»]))/ig;
  URI.findUri = {
    // valid "scheme://" or "www."
    start: /\b(?:([a-z][a-z0-9.+-]*:\/\/)|www\.)/gi,
    // everything up to the next whitespace
    end: /[\s\r\n]|$/,
    // trim trailing punctuation captured by end RegExp
    trim: /[`!()\[\]{};:'".,<>?«»]+$/
  };
  // http://www.iana.org/assignments/uri-schemes.html
  // http://en.wikipedia.org/wiki/List_of_TCP_and_UDP_port_numbers#Well-known_ports
  URI.defaultPorts = {
    http: '80',
    https: '443',
    ftp: '21',
    gopher: '70',
    ws: '80',
    wss: '443'
  };
  // allowed hostname characters according to RFC 3986
  // ALPHA DIGIT "-" "." "_" "~" "!" "$" "&" "'" "(" ")" "*" "+" "," ";" "=" %encoded
  // I've never seen a (non-IDN) hostname other than: ALPHA DIGIT . -
  URI.invalid_hostname_characters = /[^a-zA-Z0-9\.-]/;
  // map DOM Elements to their URI attribute
  URI.domAttributes = {
    'a': 'href',
    'blockquote': 'cite',
    'link': 'href',
    'base': 'href',
    'script': 'src',
    'form': 'action',
    'img': 'src',
    'area': 'href',
    'iframe': 'src',
    'embed': 'src',
    'source': 'src',
    'track': 'src',
    'input': 'src', // but only if type="image"
    'audio': 'src',
    'video': 'src'
  };
  URI.getDomAttribute = function(node) {
    if (!node || !node.nodeName) {
      return undefined;
    }

    var nodeName = node.nodeName.toLowerCase();
    // <input> should only expose src for type="image"
    if (nodeName === 'input' && node.type !== 'image') {
      return undefined;
    }

    return URI.domAttributes[nodeName];
  };

  function escapeForDumbFirefox36(value) {
    // https://github.com/medialize/URI.js/issues/91
    return escape(value);
  }

  // encoding / decoding according to RFC3986
  function strictEncodeURIComponent(string) {
    // see https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/encodeURIComponent
    return encodeURIComponent(string)
      .replace(/[!'()*]/g, escapeForDumbFirefox36)
      .replace(/\*/g, '%2A');
  }

  // Drawn from https://www.ietf.org/rfc/rfc3987.txt
  function _isIriCodePoint(point) {
    // Unless otherwise noted, all these hex ranges are defined in RFC 3987 under the
    // ucschar portion of the grammar.
    return (
        point === 0x00002d || point === 0x0002E || // -, .
        point === 0x00005F || point === 0x0007E || // _, ~
        (point >= 0x000030 && point < 0x000040) || // ASCII Digits
        (point >= 0x000041 && point < 0x00005B) || // ASCII Uppercase
        (point >= 0x000061 && point < 0x00007B) || // ASCII Lowercase
        (point >= 0x0000A0 && point < 0x00D800) ||
        (point >= 0x00E000 && point < 0x00F8FF) || // iprivate
        (point >= 0x00F900 && point < 0x00FDD0) ||
        (point >= 0x00FDF0 && point < 0x00FFF0) ||
        (point >= 0x010000 && point < 0x01FFFE) ||
        (point >= 0x020000 && point < 0x02FFFE) ||
        (point >= 0x030000 && point < 0x03FFFE) ||
        (point >= 0x040000 && point < 0x04FFFE) ||
        (point >= 0x050000 && point < 0x05FFFE) ||
        (point >= 0x060000 && point < 0x06FFFE) ||
        (point >= 0x070000 && point < 0x07FFFE) ||
        (point >= 0x080000 && point < 0x08FFFE) ||
        (point >= 0x090000 && point < 0x09FFFE) ||
        (point >= 0x0A0000 && point < 0x0AFFFE) ||
        (point >= 0x0B0000 && point < 0x0BFFFE) ||
        (point >= 0x0C0000 && point < 0x0CFFFE) ||
        (point >= 0x0D0000 && point < 0x0DFFFE) ||
        (point >= 0x0E0000 && point < 0x0EFFFE) ||
        (point >= 0x0F0000 && point < 0x0FFFFE) || // iprivate
        (point >= 0x100000 && point < 0x10FFFE)    // iprivate
      );
  }

  // IRIs are "unicode" (i.e., they use UTF-8 for %-encoding) URIs, but with a far greater range of
  // non-ASCII characters that are allowed. Note that ISO-8859 IRIs are an impossibility; ISO-8859
  // cannot represent the full range of unicode characters.
  function encodeIRIComponent(string) {
    var inputCodePoints = punycode.ucs2.decode(string);
    var output = '';
    for (var i = 0; i < inputCodePoints.length; i++) {
      var codePoint = inputCodePoints[i];
      if (_isIriCodePoint(codePoint)) {
        output += punycode.ucs2.encode([codePoint]);
      } else {
        var asString = punycode.ucs2.encode([codePoint]);
        output += strictEncodeURIComponent(asString);
      }
    }
    return output;
  }

  function recodeIRIHostname(string) {
    if (URI.punycode_expression.test(string))
    {
      string = punycode.toUnicode(string);
    }
    return encodeIRIComponent(string);
  }

  URI._defaultRecodeHostname = punycode ? punycode.toASCII : function(string) { return string; };
  URI.iso8859 = function() {
    URI.recodeHostname = URI._defaultRecodeHostname;
    URI.encode = escape;
    URI.decode = unescape;
  };
  URI.unicode = function() {
    URI.recodeHostname = URI._defaultRecodeHostname;
    URI.encode = strictEncodeURIComponent;
    URI.decode = decodeURIComponent;
  };
  URI.iri = function() {
    URI.recodeHostname = recodeIRIHostname;
    URI.encode = encodeIRIComponent;
    URI.decode = decodeURIComponent;
  };
  // By default, start in unicode mode.
  URI.unicode();
  URI.characters = {
    pathname: {
      encode: {
        // RFC3986 2.1: For consistency, URI producers and normalizers should
        // use uppercase hexadecimal digits for all percent-encodings.
        expression: /%(24|26|2B|2C|3B|3D|3A|40)/ig,
        map: {
          // -._~!'()*
          '%24': '$',
          '%26': '&',
          '%2B': '+',
          '%2C': ',',
          '%3B': ';',
          '%3D': '=',
          '%3A': ':',
          '%40': '@'
        }
      },
      decode: {
        expression: /[\/\?#]/g,
        map: {
          '/': '%2F',
          '?': '%3F',
          '#': '%23'
        }
      }
    },
    reserved: {
      encode: {
        // RFC3986 2.1: For consistency, URI producers and normalizers should
        // use uppercase hexadecimal digits for all percent-encodings.
        expression: /%(21|23|24|26|27|28|29|2A|2B|2C|2F|3A|3B|3D|3F|40|5B|5D)/ig,
        map: {
          // gen-delims
          '%3A': ':',
          '%2F': '/',
          '%3F': '?',
          '%23': '#',
          '%5B': '[',
          '%5D': ']',
          '%40': '@',
          // sub-delims
          '%21': '!',
          '%24': '$',
          '%26': '&',
          '%27': '\'',
          '%28': '(',
          '%29': ')',
          '%2A': '*',
          '%2B': '+',
          '%2C': ',',
          '%3B': ';',
          '%3D': '='
        }
      }
    },
    urnpath: {
      // The characters under `encode` are the characters called out by RFC 2141 as being acceptable
      // for usage in a URN. RFC2141 also calls out "-", ".", and "_" as acceptable characters, but
      // these aren't encoded by encodeURIComponent, so we don't have to call them out here. Also
      // note that the colon character is not featured in the encoding map; this is because URI.js
      // gives the colons in URNs semantic meaning as the delimiters of path segements, and so it
      // should not appear unencoded in a segment itself.
      // See also the note above about RFC3986 and capitalalized hex digits.
      encode: {
        expression: /%(21|24|27|28|29|2A|2B|2C|3B|3D|40)/ig,
        map: {
          '%21': '!',
          '%24': '$',
          '%27': '\'',
          '%28': '(',
          '%29': ')',
          '%2A': '*',
          '%2B': '+',
          '%2C': ',',
          '%3B': ';',
          '%3D': '=',
          '%40': '@'
        }
      },
      // These characters are the characters called out by RFC2141 as "reserved" characters that
      // should never appear in a URN, plus the colon character (see note above).
      decode: {
        expression: /[\/\?#:]/g,
        map: {
          '/': '%2F',
          '?': '%3F',
          '#': '%23',
          ':': '%3A'
        }
      }
    }
  };
  URI.encodeQuery = function(string, escapeQuerySpace) {
    var escaped = URI.encode(string + '');
    if (escapeQuerySpace === undefined) {
      escapeQuerySpace = URI.escapeQuerySpace;
    }

    return escapeQuerySpace ? escaped.replace(/%20/g, '+') : escaped;
  };
  URI.decodeQuery = function(string, escapeQuerySpace) {
    string += '';
    if (escapeQuerySpace === undefined) {
      escapeQuerySpace = URI.escapeQuerySpace;
    }

    try {
      return URI.decode(escapeQuerySpace ? string.replace(/\+/g, '%20') : string);
    } catch(e) {
      // we're not going to mess with weird encodings,
      // give up and return the undecoded original string
      // see https://github.com/medialize/URI.js/issues/87
      // see https://github.com/medialize/URI.js/issues/92
      return string;
    }
  };
  // generate encode/decode path functions
  var _parts = {'encode':'encode', 'decode':'decode'};
  var _part;
  var generateAccessor = function(_group, _part) {
    return function(string) {
      try {
        return URI[_part](string + '').replace(URI.characters[_group][_part].expression, function(c) {
          return URI.characters[_group][_part].map[c];
        });
      } catch (e) {
        // we're not going to mess with weird encodings,
        // give up and return the undecoded original string
        // see https://github.com/medialize/URI.js/issues/87
        // see https://github.com/medialize/URI.js/issues/92
        return string;
      }
    };
  };

  for (_part in _parts) {
    URI[_part + 'PathSegment'] = generateAccessor('pathname', _parts[_part]);
    URI[_part + 'UrnPathSegment'] = generateAccessor('urnpath', _parts[_part]);
  }

  var generateSegmentedPathFunction = function(_sep, _codingFuncName, _innerCodingFuncName) {
    return function(string) {
      // Why pass in names of functions, rather than the function objects themselves? The
      // definitions of some functions (but in particular, URI.decode) will occasionally change due
      // to URI.js having ISO8859 and Unicode modes. Passing in the name and getting it will ensure
      // that the functions we use here are "fresh".
      var actualCodingFunc;
      if (!_innerCodingFuncName) {
        actualCodingFunc = URI[_codingFuncName];
      } else {
        actualCodingFunc = function(string) {
          return URI[_codingFuncName](URI[_innerCodingFuncName](string));
        };
      }

      var segments = (string + '').split(_sep);

      for (var i = 0, length = segments.length; i < length; i++) {
        segments[i] = actualCodingFunc(segments[i]);
      }

      return segments.join(_sep);
    };
  };

  // This takes place outside the above loop because we don't want, e.g., encodeUrnPath functions.
  URI.decodePath = generateSegmentedPathFunction('/', 'decodePathSegment');
  URI.decodeUrnPath = generateSegmentedPathFunction(':', 'decodeUrnPathSegment');
  URI.recodePath = generateSegmentedPathFunction('/', 'encodePathSegment', 'decode');
  URI.recodeUrnPath = generateSegmentedPathFunction(':', 'encodeUrnPathSegment', 'decode');

  URI.encodeReserved = generateAccessor('reserved', 'encode');

  URI.parse = function(string, parts) {
    var pos;
    if (!parts) {
      parts = {};
    }
    // [protocol"://"[username[":"password]"@"]hostname[":"port]"/"?][path]["?"querystring]["#"fragment]

    // extract fragment
    pos = string.indexOf('#');
    if (pos > -1) {
      // escaping?
      parts.fragment = string.substring(pos + 1) || null;
      string = string.substring(0, pos);
    }

    // extract query
    pos = string.indexOf('?');
    if (pos > -1) {
      // escaping?
      parts.query = string.substring(pos + 1) || null;
      string = string.substring(0, pos);
    }

    // extract protocol
    if (string.substring(0, 2) === '//') {
      // relative-scheme
      parts.protocol = null;
      string = string.substring(2);
      // extract "user:pass@host:port"
      string = URI.parseAuthority(string, parts);
    } else {
      pos = string.indexOf(':');
      if (pos > -1) {
        parts.protocol = string.substring(0, pos) || null;
        if (parts.protocol && !parts.protocol.match(URI.protocol_expression)) {
          // : may be within the path
          parts.protocol = undefined;
        } else if (string.substring(pos + 1, pos + 3) === '//') {
          string = string.substring(pos + 3);

          // extract "user:pass@host:port"
          string = URI.parseAuthority(string, parts);
        } else {
          string = string.substring(pos + 1);
          parts.urn = true;
        }
      }
    }

    // what's left must be the path
    parts.path = string;

    // and we're done
    return parts;
  };
  URI.parseHost = function(string, parts) {
    // extract host:port
    var pos = string.indexOf('/');
    var bracketPos;
    var t;

    if (pos === -1) {
      pos = string.length;
    }

    if (string.charAt(0) === '[') {
      // IPv6 host - http://tools.ietf.org/html/draft-ietf-6man-text-addr-representation-04#section-6
      // I claim most client software breaks on IPv6 anyways. To simplify things, URI only accepts
      // IPv6+port in the format [2001:db8::1]:80 (for the time being)
      bracketPos = string.indexOf(']');
      parts.hostname = string.substring(1, bracketPos) || null;
      parts.port = string.substring(bracketPos + 2, pos) || null;
      if (parts.port === '/') {
        parts.port = null;
      }
    } else {
      var firstColon = string.indexOf(':');
      var firstSlash = string.indexOf('/');
      var nextColon = string.indexOf(':', firstColon + 1);
      if (nextColon !== -1 && (firstSlash === -1 || nextColon < firstSlash)) {
        // IPv6 host contains multiple colons - but no port
        // this notation is actually not allowed by RFC 3986, but we're a liberal parser
        parts.hostname = string.substring(0, pos) || null;
        parts.port = null;
      } else {
        t = string.substring(0, pos).split(':');
        parts.hostname = t[0] || null;
        parts.port = t[1] || null;
      }
    }

    if (parts.hostname && string.substring(pos).charAt(0) !== '/') {
      pos++;
      string = '/' + string;
    }

    return string.substring(pos) || '/';
  };
  URI.parseAuthority = function(string, parts) {
    string = URI.parseUserinfo(string, parts);
    return URI.parseHost(string, parts);
  };
  URI.parseUserinfo = function(string, parts) {
    // extract username:password
    var firstSlash = string.indexOf('/');
    var pos = string.lastIndexOf('@', firstSlash > -1 ? firstSlash : string.length - 1);
    var t;

    // authority@ must come before /path
    if (pos > -1 && (firstSlash === -1 || pos < firstSlash)) {
      t = string.substring(0, pos).split(':');
      parts.username = t[0] ? URI.decode(t[0]) : null;
      t.shift();
      parts.password = t[0] ? URI.decode(t.join(':')) : null;
      string = string.substring(pos + 1);
    } else {
      parts.username = null;
      parts.password = null;
    }

    return string;
  };
  URI.parseQuery = function(string, escapeQuerySpace) {
    if (!string) {
      return {};
    }

    // throw out the funky business - "?"[name"="value"&"]+
    string = string.replace(/&+/g, '&').replace(/^\?*&*|&+$/g, '');

    if (!string) {
      return {};
    }

    var items = {};
    var splits = string.split('&');
    var length = splits.length;
    var v, name, value;

    for (var i = 0; i < length; i++) {
      v = splits[i].split('=');
      name = URI.decodeQuery(v.shift(), escapeQuerySpace);
      // no "=" is null according to http://dvcs.w3.org/hg/url/raw-file/tip/Overview.html#collect-url-parameters
      value = v.length ? URI.decodeQuery(v.join('='), escapeQuerySpace) : null;

      if (hasOwn.call(items, name)) {
        if (typeof items[name] === 'string') {
          items[name] = [items[name]];
        }

        items[name].push(value);
      } else {
        items[name] = value;
      }
    }

    return items;
  };

  URI.build = function(parts) {
    var t = '';

    if (parts.protocol) {
      t += parts.protocol + ':';
    }

    if (!parts.urn && (t || parts.hostname)) {
      t += '//';
    }

    t += (URI.buildAuthority(parts) || '');

    if (typeof parts.path === 'string') {
      if (parts.path.charAt(0) !== '/' && typeof parts.hostname === 'string') {
        t += '/';
      }

      t += parts.path;
    }

    if (typeof parts.query === 'string' && parts.query) {
      t += '?' + parts.query;
    }

    if (typeof parts.fragment === 'string' && parts.fragment) {
      t += '#' + parts.fragment;
    }
    return t;
  };
  URI.buildHost = function(parts) {
    var t = '';

    if (!parts.hostname) {
      return '';
    } else if (URI.ip6_expression.test(parts.hostname)) {
      t += '[' + parts.hostname + ']';
    } else {
      t += parts.hostname;
    }

    if (parts.port) {
      t += ':' + parts.port;
    }

    return t;
  };
  URI.buildAuthority = function(parts) {
    return URI.buildUserinfo(parts) + URI.buildHost(parts);
  };
  URI.buildUserinfo = function(parts) {
    var t = '';

    if (parts.username) {
      t += URI.encode(parts.username);

      if (parts.password) {
        t += ':' + URI.encode(parts.password);
      }

      t += '@';
    }

    return t;
  };
  URI.buildQuery = function(data, duplicateQueryParameters, escapeQuerySpace) {
    // according to http://tools.ietf.org/html/rfc3986 or http://labs.apache.org/webarch/uri/rfc/rfc3986.html
    // being »-._~!$&'()*+,;=:@/?« %HEX and alnum are allowed
    // the RFC explicitly states ?/foo being a valid use case, no mention of parameter syntax!
    // URI.js treats the query string as being application/x-www-form-urlencoded
    // see http://www.w3.org/TR/REC-html40/interact/forms.html#form-content-type

    var t = '';
    var unique, key, i, length;
    for (key in data) {
      if (hasOwn.call(data, key) && key) {
        if (isArray(data[key])) {
          unique = {};
          for (i = 0, length = data[key].length; i < length; i++) {
            if (data[key][i] !== undefined && unique[data[key][i] + ''] === undefined) {
              t += '&' + URI.buildQueryParameter(key, data[key][i], escapeQuerySpace);
              if (duplicateQueryParameters !== true) {
                unique[data[key][i] + ''] = true;
              }
            }
          }
        } else if (data[key] !== undefined) {
          t += '&' + URI.buildQueryParameter(key, data[key], escapeQuerySpace);
        }
      }
    }

    return t.substring(1);
  };
  URI.buildQueryParameter = function(name, value, escapeQuerySpace) {
    // http://www.w3.org/TR/REC-html40/interact/forms.html#form-content-type -- application/x-www-form-urlencoded
    // don't append "=" for null values, according to http://dvcs.w3.org/hg/url/raw-file/tip/Overview.html#url-parameter-serialization
    return URI.encodeQuery(name, escapeQuerySpace) + (value !== null ? '=' + URI.encodeQuery(value, escapeQuerySpace) : '');
  };

  URI.addQuery = function(data, name, value) {
    if (typeof name === 'object') {
      for (var key in name) {
        if (hasOwn.call(name, key)) {
          URI.addQuery(data, key, name[key]);
        }
      }
    } else if (typeof name === 'string') {
      if (data[name] === undefined) {
        data[name] = value;
        return;
      } else if (typeof data[name] === 'string') {
        data[name] = [data[name]];
      }

      if (!isArray(value)) {
        value = [value];
      }

      data[name] = (data[name] || []).concat(value);
    } else {
      throw new TypeError('URI.addQuery() accepts an object, string as the name parameter');
    }
  };
  URI.removeQuery = function(data, name, value) {
    var i, length, key;

    if (isArray(name)) {
      for (i = 0, length = name.length; i < length; i++) {
        data[name[i]] = undefined;
      }
    } else if (typeof name === 'object') {
      for (key in name) {
        if (hasOwn.call(name, key)) {
          URI.removeQuery(data, key, name[key]);
        }
      }
    } else if (typeof name === 'string') {
      if (value !== undefined) {
        if (data[name] === value) {
          data[name] = undefined;
        } else if (isArray(data[name])) {
          data[name] = filterArrayValues(data[name], value);
        }
      } else {
        data[name] = undefined;
      }
    } else {
      throw new TypeError('URI.removeQuery() accepts an object, string as the first parameter');
    }
  };
  URI.hasQuery = function(data, name, value, withinArray) {
    if (typeof name === 'object') {
      for (var key in name) {
        if (hasOwn.call(name, key)) {
          if (!URI.hasQuery(data, key, name[key])) {
            return false;
          }
        }
      }

      return true;
    } else if (typeof name !== 'string') {
      throw new TypeError('URI.hasQuery() accepts an object, string as the name parameter');
    }

    switch (getType(value)) {
      case 'Undefined':
        // true if exists (but may be empty)
        return name in data; // data[name] !== undefined;

      case 'Boolean':
        // true if exists and non-empty
        var _booly = Boolean(isArray(data[name]) ? data[name].length : data[name]);
        return value === _booly;

      case 'Function':
        // allow complex comparison
        return !!value(data[name], name, data);

      case 'Array':
        if (!isArray(data[name])) {
          return false;
        }

        var op = withinArray ? arrayContains : arraysEqual;
        return op(data[name], value);

      case 'RegExp':
        if (!isArray(data[name])) {
          return Boolean(data[name] && data[name].match(value));
        }

        if (!withinArray) {
          return false;
        }

        return arrayContains(data[name], value);

      case 'Number':
        value = String(value);
        /* falls through */
      case 'String':
        if (!isArray(data[name])) {
          return data[name] === value;
        }

        if (!withinArray) {
          return false;
        }

        return arrayContains(data[name], value);

      default:
        throw new TypeError('URI.hasQuery() accepts undefined, boolean, string, number, RegExp, Function as the value parameter');
    }
  };


  URI.commonPath = function(one, two) {
    var length = Math.min(one.length, two.length);
    var pos;

    // find first non-matching character
    for (pos = 0; pos < length; pos++) {
      if (one.charAt(pos) !== two.charAt(pos)) {
        pos--;
        break;
      }
    }

    if (pos < 1) {
      return one.charAt(0) === two.charAt(0) && one.charAt(0) === '/' ? '/' : '';
    }

    // revert to last /
    if (one.charAt(pos) !== '/' || two.charAt(pos) !== '/') {
      pos = one.substring(0, pos).lastIndexOf('/');
    }

    return one.substring(0, pos + 1);
  };

  URI.withinString = function(string, callback, options) {
    options || (options = {});
    var _start = options.start || URI.findUri.start;
    var _end = options.end || URI.findUri.end;
    var _trim = options.trim || URI.findUri.trim;
    var _attributeOpen = /[a-z0-9-]=["']?$/i;

    _start.lastIndex = 0;
    while (true) {
      var match = _start.exec(string);
      if (!match) {
        break;
      }

      var start = match.index;
      if (options.ignoreHtml) {
        // attribut(e=["']?$)
        var attributeOpen = string.slice(Math.max(start - 3, 0), start);
        if (attributeOpen && _attributeOpen.test(attributeOpen)) {
          continue;
        }
      }

      var end = start + string.slice(start).search(_end);
      var slice = string.slice(start, end).replace(_trim, '');
      if (options.ignore && options.ignore.test(slice)) {
        continue;
      }

      end = start + slice.length;
      var result = callback(slice, start, end, string);
      string = string.slice(0, start) + result + string.slice(end);
      _start.lastIndex = start + result.length;
    }

    _start.lastIndex = 0;
    return string;
  };

  URI.ensureValidHostname = function(v) {
    // Theoretically URIs allow percent-encoding in Hostnames (according to RFC 3986)
    // they are not part of DNS and therefore ignored by URI.js

    if (v.match(URI.invalid_hostname_characters)) {
      // test punycode
      if (!punycode) {
        throw new TypeError('Hostname "' + v + '" contains characters other than [A-Z0-9.-] and Punycode.js is not available');
      }

      if (punycode.toASCII(v).match(URI.invalid_hostname_characters)) {
        throw new TypeError('Hostname "' + v + '" contains characters other than [A-Z0-9.-]');
      }
    }
  };

  // noConflict
  URI.noConflict = function(removeAll) {
    if (removeAll) {
      var unconflicted = {
        URI: this.noConflict()
      };

      if (root.URITemplate && typeof root.URITemplate.noConflict === 'function') {
        unconflicted.URITemplate = root.URITemplate.noConflict();
      }

      if (root.IPv6 && typeof root.IPv6.noConflict === 'function') {
        unconflicted.IPv6 = root.IPv6.noConflict();
      }

      if (root.SecondLevelDomains && typeof root.SecondLevelDomains.noConflict === 'function') {
        unconflicted.SecondLevelDomains = root.SecondLevelDomains.noConflict();
      }

      return unconflicted;
    } else if (root.URI === this) {
      root.URI = _URI;
    }

    return this;
  };

  p.build = function(deferBuild) {
    if (deferBuild === true) {
      this._deferred_build = true;
    } else if (deferBuild === undefined || this._deferred_build) {
      this._string = URI.build(this._parts);
      this._deferred_build = false;
    }

    return this;
  };

  p.clone = function() {
    return new URI(this);
  };

  p.valueOf = p.toString = function() {
    return this.build(false)._string;
  };


  function generateSimpleAccessor(_part){
    return function(v, build) {
      if (v === undefined) {
        return this._parts[_part] || '';
      } else {
        this._parts[_part] = v || null;
        this.build(!build);
        return this;
      }
    };
  }

  function generatePrefixAccessor(_part, _key){
    return function(v, build) {
      if (v === undefined) {
        return this._parts[_part] || '';
      } else {
        if (v !== null) {
          v = v + '';
          if (v.charAt(0) === _key) {
            v = v.substring(1);
          }
        }

        this._parts[_part] = v;
        this.build(!build);
        return this;
      }
    };
  }

  p.protocol = generateSimpleAccessor('protocol');
  p.username = generateSimpleAccessor('username');
  p.password = generateSimpleAccessor('password');
  p.hostname = generateSimpleAccessor('hostname');
  p.port = generateSimpleAccessor('port');
  p.query = generatePrefixAccessor('query', '?');
  p.fragment = generatePrefixAccessor('fragment', '#');

  p.search = function(v, build) {
    var t = this.query(v, build);
    return typeof t === 'string' && t.length ? ('?' + t) : t;
  };
  p.hash = function(v, build) {
    var t = this.fragment(v, build);
    return typeof t === 'string' && t.length ? ('#' + t) : t;
  };

  p.pathname = function(v, build) {
    if (v === undefined || v === true) {
      var res = this._parts.path || (this._parts.hostname ? '/' : '');
      return v ? (this._parts.urn ? URI.decodeUrnPath : URI.decodePath)(res) : res;
    } else {
      if (this._parts.urn) {
        this._parts.path = v ? URI.recodeUrnPath(v) : '';
      } else {
        this._parts.path = v ? URI.recodePath(v) : '/';
      }
      this.build(!build);
      return this;
    }
  };
  p.path = p.pathname;
  p.href = function(href, build) {
    var key;

    if (href === undefined) {
      return this.toString();
    }

    this._string = '';
    this._parts = URI._parts();

    var _URI = href instanceof URI;
    var _object = typeof href === 'object' && (href.hostname || href.path || href.pathname);
    if (href.nodeName) {
      var attribute = URI.getDomAttribute(href);
      href = href[attribute] || '';
      _object = false;
    }

    // window.location is reported to be an object, but it's not the sort
    // of object we're looking for:
    // * location.protocol ends with a colon
    // * location.query != object.search
    // * location.hash != object.fragment
    // simply serializing the unknown object should do the trick
    // (for location, not for everything...)
    if (!_URI && _object && href.pathname !== undefined) {
      href = href.toString();
    }

    if (typeof href === 'string' || href instanceof String) {
      this._parts = URI.parse(String(href), this._parts);
    } else if (_URI || _object) {
      var src = _URI ? href._parts : href;
      for (key in src) {
        if (hasOwn.call(this._parts, key)) {
          this._parts[key] = src[key];
        }
      }
    } else {
      throw new TypeError('invalid input');
    }

    this.build(!build);
    return this;
  };

  // identification accessors
  p.is = function(what) {
    var ip = false;
    var ip4 = false;
    var ip6 = false;
    var name = false;
    var sld = false;
    var idn = false;
    var punycode = false;
    var relative = !this._parts.urn;

    if (this._parts.hostname) {
      relative = false;
      ip4 = URI.ip4_expression.test(this._parts.hostname);
      ip6 = URI.ip6_expression.test(this._parts.hostname);
      ip = ip4 || ip6;
      name = !ip;
      sld = name && SLD && SLD.has(this._parts.hostname);
      idn = name && URI.idn_expression.test(this._parts.hostname);
      punycode = name && URI.punycode_expression.test(this._parts.hostname);
    }

    switch (what.toLowerCase()) {
      case 'relative':
        return relative;

      case 'absolute':
        return !relative;

      // hostname identification
      case 'domain':
      case 'name':
        return name;

      case 'sld':
        return sld;

      case 'ip':
        return ip;

      case 'ip4':
      case 'ipv4':
      case 'inet4':
        return ip4;

      case 'ip6':
      case 'ipv6':
      case 'inet6':
        return ip6;

      case 'idn':
        return idn;

      case 'url':
        return !this._parts.urn;

      case 'urn':
        return !!this._parts.urn;

      case 'punycode':
        return punycode;
    }

    return null;
  };

  // component specific input validation
  var _protocol = p.protocol;
  var _port = p.port;
  var _hostname = p.hostname;

  p.protocol = function(v, build) {
    if (v !== undefined) {
      if (v) {
        // accept trailing ://
        v = v.replace(/:(\/\/)?$/, '');

        if (!v.match(URI.protocol_expression)) {
          throw new TypeError('Protocol "' + v + '" contains characters other than [A-Z0-9.+-] or doesn\'t start with [A-Z]');
        }
      }
    }
    return _protocol.call(this, v, build);
  };
  p.scheme = p.protocol;
  p.port = function(v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }

    if (v !== undefined) {
      if (v === 0) {
        v = null;
      }

      if (v) {
        v += '';
        if (v.charAt(0) === ':') {
          v = v.substring(1);
        }

        if (v.match(/[^0-9]/)) {
          throw new TypeError('Port "' + v + '" contains characters other than [0-9]');
        }
      }
    }
    return _port.call(this, v, build);
  };
  p.hostname = function(v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }

    if (v !== undefined) {
      var x = {};
      URI.parseHost(v, x);
      v = x.hostname;
    }
    return _hostname.call(this, v, build);
  };

  // compound accessors
  p.host = function(v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }

    if (v === undefined) {
      return this._parts.hostname ? URI.buildHost(this._parts) : '';
    } else {
      URI.parseHost(v, this._parts);
      this.build(!build);
      return this;
    }
  };
  p.authority = function(v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }

    if (v === undefined) {
      return this._parts.hostname ? URI.buildAuthority(this._parts) : '';
    } else {
      URI.parseAuthority(v, this._parts);
      this.build(!build);
      return this;
    }
  };
  p.userinfo = function(v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }

    if (v === undefined) {
      if (!this._parts.username) {
        return '';
      }

      var t = URI.buildUserinfo(this._parts);
      return t.substring(0, t.length -1);
    } else {
      if (v[v.length-1] !== '@') {
        v += '@';
      }

      URI.parseUserinfo(v, this._parts);
      this.build(!build);
      return this;
    }
  };
  p.resource = function(v, build) {
    var parts;

    if (v === undefined) {
      return this.path() + this.search() + this.hash();
    }

    parts = URI.parse(v);
    this._parts.path = parts.path;
    this._parts.query = parts.query;
    this._parts.fragment = parts.fragment;
    this.build(!build);
    return this;
  };

  // fraction accessors
  p.subdomain = function(v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }

    // convenience, return "www" from "www.example.org"
    if (v === undefined) {
      if (!this._parts.hostname || this.is('IP')) {
        return '';
      }

      // grab domain and add another segment
      var end = this._parts.hostname.length - this.domain().length - 1;
      return this._parts.hostname.substring(0, end) || '';
    } else {
      var e = this._parts.hostname.length - this.domain().length;
      var sub = this._parts.hostname.substring(0, e);
      var replace = new RegExp('^' + escapeRegEx(sub));

      if (v && v.charAt(v.length - 1) !== '.') {
        v += '.';
      }

      if (v) {
        URI.ensureValidHostname(v);
      }

      this._parts.hostname = this._parts.hostname.replace(replace, v);
      this.build(!build);
      return this;
    }
  };
  p.domain = function(v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }

    if (typeof v === 'boolean') {
      build = v;
      v = undefined;
    }

    // convenience, return "example.org" from "www.example.org"
    if (v === undefined) {
      if (!this._parts.hostname || this.is('IP')) {
        return '';
      }

      // if hostname consists of 1 or 2 segments, it must be the domain
      var t = this._parts.hostname.match(/\./g);
      if (t && t.length < 2) {
        return this._parts.hostname;
      }

      // grab tld and add another segment
      var end = this._parts.hostname.length - this.tld(build).length - 1;
      end = this._parts.hostname.lastIndexOf('.', end -1) + 1;
      return this._parts.hostname.substring(end) || '';
    } else {
      if (!v) {
        throw new TypeError('cannot set domain empty');
      }

      URI.ensureValidHostname(v);

      if (!this._parts.hostname || this.is('IP')) {
        this._parts.hostname = v;
      } else {
        var replace = new RegExp(escapeRegEx(this.domain()) + '$');
        this._parts.hostname = this._parts.hostname.replace(replace, v);
      }

      this.build(!build);
      return this;
    }
  };
  p.tld = function(v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }

    if (typeof v === 'boolean') {
      build = v;
      v = undefined;
    }

    // return "org" from "www.example.org"
    if (v === undefined) {
      if (!this._parts.hostname || this.is('IP')) {
        return '';
      }

      var pos = this._parts.hostname.lastIndexOf('.');
      var tld = this._parts.hostname.substring(pos + 1);

      if (build !== true && SLD && SLD.list[tld.toLowerCase()]) {
        return SLD.get(this._parts.hostname) || tld;
      }

      return tld;
    } else {
      var replace;

      if (!v) {
        throw new TypeError('cannot set TLD empty');
      } else if (v.match(/[^a-zA-Z0-9-]/)) {
        if (SLD && SLD.is(v)) {
          replace = new RegExp(escapeRegEx(this.tld()) + '$');
          this._parts.hostname = this._parts.hostname.replace(replace, v);
        } else {
          throw new TypeError('TLD "' + v + '" contains characters other than [A-Z0-9]');
        }
      } else if (!this._parts.hostname || this.is('IP')) {
        throw new ReferenceError('cannot set TLD on non-domain host');
      } else {
        replace = new RegExp(escapeRegEx(this.tld()) + '$');
        this._parts.hostname = this._parts.hostname.replace(replace, v);
      }

      this.build(!build);
      return this;
    }
  };
  p.directory = function(v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }

    if (v === undefined || v === true) {
      if (!this._parts.path && !this._parts.hostname) {
        return '';
      }

      if (this._parts.path === '/') {
        return '/';
      }

      var end = this._parts.path.length - this.filename().length - 1;
      var res = this._parts.path.substring(0, end) || (this._parts.hostname ? '/' : '');

      return v ? URI.decodePath(res) : res;

    } else {
      var e = this._parts.path.length - this.filename().length;
      var directory = this._parts.path.substring(0, e);
      var replace = new RegExp('^' + escapeRegEx(directory));

      // fully qualifier directories begin with a slash
      if (!this.is('relative')) {
        if (!v) {
          v = '/';
        }

        if (v.charAt(0) !== '/') {
          v = '/' + v;
        }
      }

      // directories always end with a slash
      if (v && v.charAt(v.length - 1) !== '/') {
        v += '/';
      }

      v = URI.recodePath(v);
      this._parts.path = this._parts.path.replace(replace, v);
      this.build(!build);
      return this;
    }
  };
  p.filename = function(v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }

    if (v === undefined || v === true) {
      if (!this._parts.path || this._parts.path === '/') {
        return '';
      }

      var pos = this._parts.path.lastIndexOf('/');
      var res = this._parts.path.substring(pos+1);

      return v ? URI.decodePathSegment(res) : res;
    } else {
      var mutatedDirectory = false;

      if (v.charAt(0) === '/') {
        v = v.substring(1);
      }

      if (v.match(/\.?\//)) {
        mutatedDirectory = true;
      }

      var replace = new RegExp(escapeRegEx(this.filename()) + '$');
      v = URI.recodePath(v);
      this._parts.path = this._parts.path.replace(replace, v);

      if (mutatedDirectory) {
        this.normalizePath(build);
      } else {
        this.build(!build);
      }

      return this;
    }
  };
  p.suffix = function(v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }

    if (v === undefined || v === true) {
      if (!this._parts.path || this._parts.path === '/') {
        return '';
      }

      var filename = this.filename();
      var pos = filename.lastIndexOf('.');
      var s, res;

      if (pos === -1) {
        return '';
      }

      // suffix may only contain alnum characters (yup, I made this up.)
      s = filename.substring(pos+1);
      res = (/^[a-z0-9%]+$/i).test(s) ? s : '';
      return v ? URI.decodePathSegment(res) : res;
    } else {
      if (v.charAt(0) === '.') {
        v = v.substring(1);
      }

      var suffix = this.suffix();
      var replace;

      if (!suffix) {
        if (!v) {
          return this;
        }

        this._parts.path += '.' + URI.recodePath(v);
      } else if (!v) {
        replace = new RegExp(escapeRegEx('.' + suffix) + '$');
      } else {
        replace = new RegExp(escapeRegEx(suffix) + '$');
      }

      if (replace) {
        v = URI.recodePath(v);
        this._parts.path = this._parts.path.replace(replace, v);
      }

      this.build(!build);
      return this;
    }
  };
  p.segment = function(segment, v, build) {
    var separator = this._parts.urn ? ':' : '/';
    var path = this.path();
    var absolute = path.substring(0, 1) === '/';
    var segments = path.split(separator);

    if (segment !== undefined && typeof segment !== 'number') {
      build = v;
      v = segment;
      segment = undefined;
    }

    if (segment !== undefined && typeof segment !== 'number') {
      throw new Error('Bad segment "' + segment + '", must be 0-based integer');
    }

    if (absolute) {
      segments.shift();
    }

    if (segment < 0) {
      // allow negative indexes to address from the end
      segment = Math.max(segments.length + segment, 0);
    }

    if (v === undefined) {
      /*jshint laxbreak: true */
      return segment === undefined
        ? segments
        : segments[segment];
      /*jshint laxbreak: false */
    } else if (segment === null || segments[segment] === undefined) {
      if (isArray(v)) {
        segments = [];
        // collapse empty elements within array
        for (var i=0, l=v.length; i < l; i++) {
          if (!v[i].length && (!segments.length || !segments[segments.length -1].length)) {
            continue;
          }

          if (segments.length && !segments[segments.length -1].length) {
            segments.pop();
          }

          segments.push(v[i]);
        }
      } else if (v || typeof v === 'string') {
        if (segments[segments.length -1] === '') {
          // empty trailing elements have to be overwritten
          // to prevent results such as /foo//bar
          segments[segments.length -1] = v;
        } else {
          segments.push(v);
        }
      }
    } else {
      if (v) {
        segments[segment] = v;
      } else {
        segments.splice(segment, 1);
      }
    }

    if (absolute) {
      segments.unshift('');
    }

    return this.path(segments.join(separator), build);
  };
  p.segmentCoded = function(segment, v, build) {
    var segments, i, l;

    if (typeof segment !== 'number') {
      build = v;
      v = segment;
      segment = undefined;
    }

    if (v === undefined) {
      segments = this.segment(segment, v, build);
      if (!isArray(segments)) {
        segments = segments !== undefined ? URI.decode(segments) : undefined;
      } else {
        for (i = 0, l = segments.length; i < l; i++) {
          segments[i] = URI.decode(segments[i]);
        }
      }

      return segments;
    }

    if (!isArray(v)) {
      v = (typeof v === 'string' || v instanceof String) ? URI.encode(v) : v;
    } else {
      for (i = 0, l = v.length; i < l; i++) {
        v[i] = URI.decode(v[i]);
      }
    }

    return this.segment(segment, v, build);
  };

  // mutating query string
  var q = p.query;
  p.query = function(v, build) {
    if (v === true) {
      return URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);
    } else if (typeof v === 'function') {
      var data = URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);
      var result = v.call(this, data);
      this._parts.query = URI.buildQuery(result || data, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
      this.build(!build);
      return this;
    } else if (v !== undefined && typeof v !== 'string') {
      this._parts.query = URI.buildQuery(v, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
      this.build(!build);
      return this;
    } else {
      return q.call(this, v, build);
    }
  };
  p.setQuery = function(name, value, build) {
    var data = URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);

    if (typeof name === 'string' || name instanceof String) {
      data[name] = value !== undefined ? value : null;
    } else if (typeof name === 'object') {
      for (var key in name) {
        if (hasOwn.call(name, key)) {
          data[key] = name[key];
        }
      }
    } else {
      throw new TypeError('URI.addQuery() accepts an object, string as the name parameter');
    }

    this._parts.query = URI.buildQuery(data, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
    if (typeof name !== 'string') {
      build = value;
    }

    this.build(!build);
    return this;
  };
  p.addQuery = function(name, value, build) {
    var data = URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);
    URI.addQuery(data, name, value === undefined ? null : value);
    this._parts.query = URI.buildQuery(data, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
    if (typeof name !== 'string') {
      build = value;
    }

    this.build(!build);
    return this;
  };
  p.removeQuery = function(name, value, build) {
    var data = URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);
    URI.removeQuery(data, name, value);
    this._parts.query = URI.buildQuery(data, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
    if (typeof name !== 'string') {
      build = value;
    }

    this.build(!build);
    return this;
  };
  p.hasQuery = function(name, value, withinArray) {
    var data = URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);
    return URI.hasQuery(data, name, value, withinArray);
  };
  p.setSearch = p.setQuery;
  p.addSearch = p.addQuery;
  p.removeSearch = p.removeQuery;
  p.hasSearch = p.hasQuery;

  // sanitizing URLs
  p.normalize = function() {
    if (this._parts.urn) {
      return this
        .normalizeProtocol(false)
        .normalizePath(false)
        .normalizeQuery(false)
        .normalizeFragment(false)
        .build();
    }

    return this
      .normalizeProtocol(false)
      .normalizeHostname(false)
      .normalizePort(false)
      .normalizePath(false)
      .normalizeQuery(false)
      .normalizeFragment(false)
      .build();
  };
  p.normalizeProtocol = function(build) {
    if (typeof this._parts.protocol === 'string') {
      this._parts.protocol = this._parts.protocol.toLowerCase();
      this.build(!build);
    }

    return this;
  };
  p.normalizeHostname = function(build) {
    if (this._parts.hostname) {
      // If this is an international domain name, or if it was an IDN before it was punycoded
      if (this.is('IDN') || this.is('punycode')) {
        this._parts.hostname = URI.recodeHostname(this._parts.hostname);
      } else if (this.is('IPv6') && IPv6) {
        this._parts.hostname = IPv6.best(this._parts.hostname);
      }

      this._parts.hostname = this._parts.hostname.toLowerCase();
      this.build(!build);
    }

    return this;
  };
  p.normalizePort = function(build) {
    // remove port of it's the protocol's default
    if (typeof this._parts.protocol === 'string' && this._parts.port === URI.defaultPorts[this._parts.protocol]) {
      this._parts.port = null;
      this.build(!build);
    }

    return this;
  };
  p.normalizePath = function(build) {
    var _path = this._parts.path;
    if (!_path) {
      return this;
    }

    if (this._parts.urn) {
      this._parts.path = URI.recodeUrnPath(this._parts.path);
      this.build(!build);
      return this;
    }

    if (this._parts.path === '/') {
      return this;
    }

    var _was_relative;
    var _leadingParents = '';
    var _parent, _pos;

    // handle relative paths
    if (_path.charAt(0) !== '/') {
      _was_relative = true;
      _path = '/' + _path;
    }

    // resolve simples
    _path = _path
      .replace(/(\/(\.\/)+)|(\/\.$)/g, '/')
      .replace(/\/{2,}/g, '/');

    // remember leading parents
    if (_was_relative) {
      _leadingParents = _path.substring(1).match(/^(\.\.\/)+/) || '';
      if (_leadingParents) {
        _leadingParents = _leadingParents[0];
      }
    }

    // resolve parents
    while (true) {
      _parent = _path.indexOf('/..');
      if (_parent === -1) {
        // no more ../ to resolve
        break;
      } else if (_parent === 0) {
        // top level cannot be relative, skip it
        _path = _path.substring(3);
        continue;
      }

      _pos = _path.substring(0, _parent).lastIndexOf('/');
      if (_pos === -1) {
        _pos = _parent;
      }
      _path = _path.substring(0, _pos) + _path.substring(_parent + 3);
    }

    // revert to relative
    if (_was_relative && this.is('relative')) {
      _path = _leadingParents + _path.substring(1);
    }

    _path = URI.recodePath(_path);
    this._parts.path = _path;
    this.build(!build);
    return this;
  };
  p.normalizePathname = p.normalizePath;
  p.normalizeQuery = function(build) {
    if (typeof this._parts.query === 'string') {
      if (!this._parts.query.length) {
        this._parts.query = null;
      } else {
        this.query(URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace));
      }

      this.build(!build);
    }

    return this;
  };
  p.normalizeFragment = function(build) {
    if (!this._parts.fragment) {
      this._parts.fragment = null;
      this.build(!build);
    }

    return this;
  };
  p.normalizeSearch = p.normalizeQuery;
  p.normalizeHash = p.normalizeFragment;

  function _generateNormalizer(hostnameRecoder, encoder, decoder) {
    return function() {
      var r = URI.recodeHostname
      var e = URI.encode;
      var d = URI.decode;

      URI.encode = encoder;
      URI.decode = decoder;
      try {
        this.normalize();
      } finally {
        URI.recodeHostname = r;
        URI.encode = e;
        URI.decode = d;
      }
      return this;
    };
  }

  // expect unicode input, iso8859 output
  p.iso8859 = _generateNormalizer(URI._defaultRecodeHostname, escape, decodeURIComponent);
  // expect iso8859 input, unicode output
  p.unicode = _generateNormalizer(URI._defaultRecodeHostname, strictEncodeURIComponent, unescape);
  // expect unicode input, IRI output
  p.iri = _generateNormalizer(recodeIRIHostname, encodeIRIComponent, decodeURIComponent);

  p.readable = function() {
    var uri = this.clone();
    // removing username, password, because they shouldn't be displayed according to RFC 3986
    uri.username('').password('').normalize();
    var t = '';
    if (uri._parts.protocol) {
      t += uri._parts.protocol + (uri._parts.urn ? ':' : '://');
    }

    if (uri._parts.hostname) {
      if (uri.is('punycode') && punycode) {
        t += punycode.toUnicode(uri._parts.hostname);
        if (uri._parts.port) {
          t += ':' + uri._parts.port;
        }
      } else {
        t += uri.host();
      }
    }

    if (uri._parts.hostname && uri._parts.path && uri._parts.path.charAt(0) !== '/') {
      t += '/';
    }

    t += uri.path(true);
    if (uri._parts.query) {
      var q = '';
      for (var i = 0, qp = uri._parts.query.split('&'), l = qp.length; i < l; i++) {
        var kv = (qp[i] || '').split('=');
        q += '&' + URI.decodeQuery(kv[0], this._parts.escapeQuerySpace)
          .replace(/&/g, '%26');

        if (kv[1] !== undefined) {
          q += '=' + URI.decodeQuery(kv[1], this._parts.escapeQuerySpace)
            .replace(/&/g, '%26');
        }
      }
      t += '?' + q.substring(1);
    }

    t += URI.decodeQuery(uri.hash(), true);
    return t;
  };

  // resolving relative and absolute URLs
  p.absoluteTo = function(base) {
    var resolved = this.clone();
    var properties = ['protocol', 'username', 'password', 'hostname', 'port'];
    var basedir, i, p;

    if (this._parts.urn) {
      throw new Error('URNs do not have any generally defined hierarchical components');
    }

    if (!(base instanceof URI)) {
      base = new URI(base);
    }

    if (!resolved._parts.protocol) {
      resolved._parts.protocol = base._parts.protocol;
    }

    if (this._parts.hostname) {
      return resolved;
    }

    for (i = 0; (p = properties[i]); i++) {
      resolved._parts[p] = base._parts[p];
    }

    if (!resolved._parts.path) {
      resolved._parts.path = base._parts.path;
      if (!resolved._parts.query) {
        resolved._parts.query = base._parts.query;
      }
    } else if (resolved._parts.path.substring(-2) === '..') {
      resolved._parts.path += '/';
    }

    if (resolved.path().charAt(0) !== '/') {
      basedir = base.directory();
      resolved._parts.path = (basedir ? (basedir + '/') : '') + resolved._parts.path;
      resolved.normalizePath();
    }

    resolved.build();
    return resolved;
  };
  p.relativeTo = function(base) {
    var relative = this.clone().normalize();
    var relativeParts, baseParts, common, relativePath, basePath;

    if (relative._parts.urn) {
      throw new Error('URNs do not have any generally defined hierarchical components');
    }

    base = new URI(base).normalize();
    relativeParts = relative._parts;
    baseParts = base._parts;
    relativePath = relative.path();
    basePath = base.path();

    if (relativePath.charAt(0) !== '/') {
      throw new Error('URI is already relative');
    }

    if (basePath.charAt(0) !== '/') {
      throw new Error('Cannot calculate a URI relative to another relative URI');
    }

    if (relativeParts.protocol === baseParts.protocol) {
      relativeParts.protocol = null;
    }

    if (relativeParts.username !== baseParts.username || relativeParts.password !== baseParts.password) {
      return relative.build();
    }

    if (relativeParts.protocol !== null || relativeParts.username !== null || relativeParts.password !== null) {
      return relative.build();
    }

    if (relativeParts.hostname === baseParts.hostname && relativeParts.port === baseParts.port) {
      relativeParts.hostname = null;
      relativeParts.port = null;
    } else {
      return relative.build();
    }

    if (relativePath === basePath) {
      relativeParts.path = '';
      return relative.build();
    }

    // determine common sub path
    common = URI.commonPath(relative.path(), base.path());

    // If the paths have nothing in common, return a relative URL with the absolute path.
    if (!common) {
      return relative.build();
    }

    var parents = baseParts.path
      .substring(common.length)
      .replace(/[^\/]*$/, '')
      .replace(/.*?\//g, '../');

    relativeParts.path = parents + relativeParts.path.substring(common.length);

    return relative.build();
  };

  // comparing URIs
  p.equals = function(uri) {
    var one = this.clone();
    var two = new URI(uri);
    var one_map = {};
    var two_map = {};
    var checked = {};
    var one_query, two_query, key;

    one.normalize();
    two.normalize();

    // exact match
    if (one.toString() === two.toString()) {
      return true;
    }

    // extract query string
    one_query = one.query();
    two_query = two.query();
    one.query('');
    two.query('');

    // definitely not equal if not even non-query parts match
    if (one.toString() !== two.toString()) {
      return false;
    }

    // query parameters have the same length, even if they're permuted
    if (one_query.length !== two_query.length) {
      return false;
    }

    one_map = URI.parseQuery(one_query, this._parts.escapeQuerySpace);
    two_map = URI.parseQuery(two_query, this._parts.escapeQuerySpace);

    for (key in one_map) {
      if (hasOwn.call(one_map, key)) {
        if (!isArray(one_map[key])) {
          if (one_map[key] !== two_map[key]) {
            return false;
          }
        } else if (!arraysEqual(one_map[key], two_map[key])) {
          return false;
        }

        checked[key] = true;
      }
    }

    for (key in two_map) {
      if (hasOwn.call(two_map, key)) {
        if (!checked[key]) {
          // two contains a parameter not present in one
          return false;
        }
      }
    }

    return true;
  };

  // state
  p.duplicateQueryParameters = function(v) {
    this._parts.duplicateQueryParameters = !!v;
    return this;
  };

  p.escapeQuerySpace = function(v) {
    this._parts.escapeQuerySpace = !!v;
    return this;
  };

  return URI;
}));

"0.50.0";
/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
var CryptoJS=CryptoJS||function(e,m){var p={},j=p.lib={},l=function(){},f=j.Base={extend:function(a){l.prototype=this;var c=new l;a&&c.mixIn(a);c.hasOwnProperty("init")||(c.init=function(){c.$super.init.apply(this,arguments)});c.init.prototype=c;c.$super=this;return c},create:function(){var a=this.extend();a.init.apply(a,arguments);return a},init:function(){},mixIn:function(a){for(var c in a)a.hasOwnProperty(c)&&(this[c]=a[c]);a.hasOwnProperty("toString")&&(this.toString=a.toString)},clone:function(){return this.init.prototype.extend(this)}},
n=j.WordArray=f.extend({init:function(a,c){a=this.words=a||[];this.sigBytes=c!=m?c:4*a.length},toString:function(a){return(a||h).stringify(this)},concat:function(a){var c=this.words,q=a.words,d=this.sigBytes;a=a.sigBytes;this.clamp();if(d%4)for(var b=0;b<a;b++)c[d+b>>>2]|=(q[b>>>2]>>>24-8*(b%4)&255)<<24-8*((d+b)%4);else if(65535<q.length)for(b=0;b<a;b+=4)c[d+b>>>2]=q[b>>>2];else c.push.apply(c,q);this.sigBytes+=a;return this},clamp:function(){var a=this.words,c=this.sigBytes;a[c>>>2]&=4294967295<<
32-8*(c%4);a.length=e.ceil(c/4)},clone:function(){var a=f.clone.call(this);a.words=this.words.slice(0);return a},random:function(a){for(var c=[],b=0;b<a;b+=4)c.push(4294967296*e.random()|0);return new n.init(c,a)}}),b=p.enc={},h=b.Hex={stringify:function(a){var c=a.words;a=a.sigBytes;for(var b=[],d=0;d<a;d++){var f=c[d>>>2]>>>24-8*(d%4)&255;b.push((f>>>4).toString(16));b.push((f&15).toString(16))}return b.join("")},parse:function(a){for(var c=a.length,b=[],d=0;d<c;d+=2)b[d>>>3]|=parseInt(a.substr(d,
2),16)<<24-4*(d%8);return new n.init(b,c/2)}},g=b.Latin1={stringify:function(a){var c=a.words;a=a.sigBytes;for(var b=[],d=0;d<a;d++)b.push(String.fromCharCode(c[d>>>2]>>>24-8*(d%4)&255));return b.join("")},parse:function(a){for(var c=a.length,b=[],d=0;d<c;d++)b[d>>>2]|=(a.charCodeAt(d)&255)<<24-8*(d%4);return new n.init(b,c)}},r=b.Utf8={stringify:function(a){try{return decodeURIComponent(escape(g.stringify(a)))}catch(c){throw Error("Malformed UTF-8 data");}},parse:function(a){return g.parse(unescape(encodeURIComponent(a)))}},
k=j.BufferedBlockAlgorithm=f.extend({reset:function(){this._data=new n.init;this._nDataBytes=0},_append:function(a){"string"==typeof a&&(a=r.parse(a));this._data.concat(a);this._nDataBytes+=a.sigBytes},_process:function(a){var c=this._data,b=c.words,d=c.sigBytes,f=this.blockSize,h=d/(4*f),h=a?e.ceil(h):e.max((h|0)-this._minBufferSize,0);a=h*f;d=e.min(4*a,d);if(a){for(var g=0;g<a;g+=f)this._doProcessBlock(b,g);g=b.splice(0,a);c.sigBytes-=d}return new n.init(g,d)},clone:function(){var a=f.clone.call(this);
a._data=this._data.clone();return a},_minBufferSize:0});j.Hasher=k.extend({cfg:f.extend(),init:function(a){this.cfg=this.cfg.extend(a);this.reset()},reset:function(){k.reset.call(this);this._doReset()},update:function(a){this._append(a);this._process();return this},finalize:function(a){a&&this._append(a);return this._doFinalize()},blockSize:16,_createHelper:function(a){return function(c,b){return(new a.init(b)).finalize(c)}},_createHmacHelper:function(a){return function(b,f){return(new s.HMAC.init(a,
f)).finalize(b)}}});var s=p.algo={};return p}(Math);
(function(){var e=CryptoJS,m=e.lib,p=m.WordArray,j=m.Hasher,l=[],m=e.algo.SHA1=j.extend({_doReset:function(){this._hash=new p.init([1732584193,4023233417,2562383102,271733878,3285377520])},_doProcessBlock:function(f,n){for(var b=this._hash.words,h=b[0],g=b[1],e=b[2],k=b[3],j=b[4],a=0;80>a;a++){if(16>a)l[a]=f[n+a]|0;else{var c=l[a-3]^l[a-8]^l[a-14]^l[a-16];l[a]=c<<1|c>>>31}c=(h<<5|h>>>27)+j+l[a];c=20>a?c+((g&e|~g&k)+1518500249):40>a?c+((g^e^k)+1859775393):60>a?c+((g&e|g&k|e&k)-1894007588):c+((g^e^
k)-899497514);j=k;k=e;e=g<<30|g>>>2;g=h;h=c}b[0]=b[0]+h|0;b[1]=b[1]+g|0;b[2]=b[2]+e|0;b[3]=b[3]+k|0;b[4]=b[4]+j|0},_doFinalize:function(){var f=this._data,e=f.words,b=8*this._nDataBytes,h=8*f.sigBytes;e[h>>>5]|=128<<24-h%32;e[(h+64>>>9<<4)+14]=Math.floor(b/4294967296);e[(h+64>>>9<<4)+15]=b;f.sigBytes=4*e.length;this._process();return this._hash},clone:function(){var e=j.clone.call(this);e._hash=this._hash.clone();return e}});e.SHA1=j._createHelper(m);e.HmacSHA1=j._createHmacHelper(m)})();

/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
var CryptoJS=CryptoJS||function(h,s){var f={},t=f.lib={},g=function(){},j=t.Base={extend:function(a){g.prototype=this;var c=new g;a&&c.mixIn(a);c.hasOwnProperty("init")||(c.init=function(){c.$super.init.apply(this,arguments)});c.init.prototype=c;c.$super=this;return c},create:function(){var a=this.extend();a.init.apply(a,arguments);return a},init:function(){},mixIn:function(a){for(var c in a)a.hasOwnProperty(c)&&(this[c]=a[c]);a.hasOwnProperty("toString")&&(this.toString=a.toString)},clone:function(){return this.init.prototype.extend(this)}},
q=t.WordArray=j.extend({init:function(a,c){a=this.words=a||[];this.sigBytes=c!=s?c:4*a.length},toString:function(a){return(a||u).stringify(this)},concat:function(a){var c=this.words,d=a.words,b=this.sigBytes;a=a.sigBytes;this.clamp();if(b%4)for(var e=0;e<a;e++)c[b+e>>>2]|=(d[e>>>2]>>>24-8*(e%4)&255)<<24-8*((b+e)%4);else if(65535<d.length)for(e=0;e<a;e+=4)c[b+e>>>2]=d[e>>>2];else c.push.apply(c,d);this.sigBytes+=a;return this},clamp:function(){var a=this.words,c=this.sigBytes;a[c>>>2]&=4294967295<<
32-8*(c%4);a.length=h.ceil(c/4)},clone:function(){var a=j.clone.call(this);a.words=this.words.slice(0);return a},random:function(a){for(var c=[],d=0;d<a;d+=4)c.push(4294967296*h.random()|0);return new q.init(c,a)}}),v=f.enc={},u=v.Hex={stringify:function(a){var c=a.words;a=a.sigBytes;for(var d=[],b=0;b<a;b++){var e=c[b>>>2]>>>24-8*(b%4)&255;d.push((e>>>4).toString(16));d.push((e&15).toString(16))}return d.join("")},parse:function(a){for(var c=a.length,d=[],b=0;b<c;b+=2)d[b>>>3]|=parseInt(a.substr(b,
2),16)<<24-4*(b%8);return new q.init(d,c/2)}},k=v.Latin1={stringify:function(a){var c=a.words;a=a.sigBytes;for(var d=[],b=0;b<a;b++)d.push(String.fromCharCode(c[b>>>2]>>>24-8*(b%4)&255));return d.join("")},parse:function(a){for(var c=a.length,d=[],b=0;b<c;b++)d[b>>>2]|=(a.charCodeAt(b)&255)<<24-8*(b%4);return new q.init(d,c)}},l=v.Utf8={stringify:function(a){try{return decodeURIComponent(escape(k.stringify(a)))}catch(c){throw Error("Malformed UTF-8 data");}},parse:function(a){return k.parse(unescape(encodeURIComponent(a)))}},
x=t.BufferedBlockAlgorithm=j.extend({reset:function(){this._data=new q.init;this._nDataBytes=0},_append:function(a){"string"==typeof a&&(a=l.parse(a));this._data.concat(a);this._nDataBytes+=a.sigBytes},_process:function(a){var c=this._data,d=c.words,b=c.sigBytes,e=this.blockSize,f=b/(4*e),f=a?h.ceil(f):h.max((f|0)-this._minBufferSize,0);a=f*e;b=h.min(4*a,b);if(a){for(var m=0;m<a;m+=e)this._doProcessBlock(d,m);m=d.splice(0,a);c.sigBytes-=b}return new q.init(m,b)},clone:function(){var a=j.clone.call(this);
a._data=this._data.clone();return a},_minBufferSize:0});t.Hasher=x.extend({cfg:j.extend(),init:function(a){this.cfg=this.cfg.extend(a);this.reset()},reset:function(){x.reset.call(this);this._doReset()},update:function(a){this._append(a);this._process();return this},finalize:function(a){a&&this._append(a);return this._doFinalize()},blockSize:16,_createHelper:function(a){return function(c,d){return(new a.init(d)).finalize(c)}},_createHmacHelper:function(a){return function(c,d){return(new w.HMAC.init(a,
d)).finalize(c)}}});var w=f.algo={};return f}(Math);
(function(h){for(var s=CryptoJS,f=s.lib,t=f.WordArray,g=f.Hasher,f=s.algo,j=[],q=[],v=function(a){return 4294967296*(a-(a|0))|0},u=2,k=0;64>k;){var l;a:{l=u;for(var x=h.sqrt(l),w=2;w<=x;w++)if(!(l%w)){l=!1;break a}l=!0}l&&(8>k&&(j[k]=v(h.pow(u,0.5))),q[k]=v(h.pow(u,1/3)),k++);u++}var a=[],f=f.SHA256=g.extend({_doReset:function(){this._hash=new t.init(j.slice(0))},_doProcessBlock:function(c,d){for(var b=this._hash.words,e=b[0],f=b[1],m=b[2],h=b[3],p=b[4],j=b[5],k=b[6],l=b[7],n=0;64>n;n++){if(16>n)a[n]=
c[d+n]|0;else{var r=a[n-15],g=a[n-2];a[n]=((r<<25|r>>>7)^(r<<14|r>>>18)^r>>>3)+a[n-7]+((g<<15|g>>>17)^(g<<13|g>>>19)^g>>>10)+a[n-16]}r=l+((p<<26|p>>>6)^(p<<21|p>>>11)^(p<<7|p>>>25))+(p&j^~p&k)+q[n]+a[n];g=((e<<30|e>>>2)^(e<<19|e>>>13)^(e<<10|e>>>22))+(e&f^e&m^f&m);l=k;k=j;j=p;p=h+r|0;h=m;m=f;f=e;e=r+g|0}b[0]=b[0]+e|0;b[1]=b[1]+f|0;b[2]=b[2]+m|0;b[3]=b[3]+h|0;b[4]=b[4]+p|0;b[5]=b[5]+j|0;b[6]=b[6]+k|0;b[7]=b[7]+l|0},_doFinalize:function(){var a=this._data,d=a.words,b=8*this._nDataBytes,e=8*a.sigBytes;
d[e>>>5]|=128<<24-e%32;d[(e+64>>>9<<4)+14]=h.floor(b/4294967296);d[(e+64>>>9<<4)+15]=b;a.sigBytes=4*d.length;this._process();return this._hash},clone:function(){var a=g.clone.call(this);a._hash=this._hash.clone();return a}});s.SHA256=g._createHelper(f);s.HmacSHA256=g._createHmacHelper(f)})(Math);

/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
(function () {
    // Shortcuts
    var C = CryptoJS;
    var C_lib = C.lib;
    var WordArray = C_lib.WordArray;
    var C_enc = C.enc;

    /**
     * Base64 encoding strategy.
     */
    var Base64 = C_enc.Base64 = {
        /**
         * Converts a word array to a Base64 string.
         *
         * @param {WordArray} wordArray The word array.
         *
         * @return {string} The Base64 string.
         *
         * @static
         *
         * @example
         *
         *     var base64String = CryptoJS.enc.Base64.stringify(wordArray);
         */
        stringify: function (wordArray) {
            // Shortcuts
            var words = wordArray.words;
            var sigBytes = wordArray.sigBytes;
            var map = this._map;

            // Clamp excess bits
            wordArray.clamp();

            // Convert
            var base64Chars = [];
            for (var i = 0; i < sigBytes; i += 3) {
                var byte1 = (words[i >>> 2]       >>> (24 - (i % 4) * 8))       & 0xff;
                var byte2 = (words[(i + 1) >>> 2] >>> (24 - ((i + 1) % 4) * 8)) & 0xff;
                var byte3 = (words[(i + 2) >>> 2] >>> (24 - ((i + 2) % 4) * 8)) & 0xff;

                var triplet = (byte1 << 16) | (byte2 << 8) | byte3;

                for (var j = 0; (j < 4) && (i + j * 0.75 < sigBytes); j++) {
                    base64Chars.push(map.charAt((triplet >>> (6 * (3 - j))) & 0x3f));
                }
            }

            // Add padding
            var paddingChar = map.charAt(64);
            if (paddingChar) {
                while (base64Chars.length % 4) {
                    base64Chars.push(paddingChar);
                }
            }

            return base64Chars.join('');
        },

        /**
         * Converts a Base64 string to a word array.
         *
         * @param {string} base64Str The Base64 string.
         *
         * @return {WordArray} The word array.
         *
         * @static
         *
         * @example
         *
         *     var wordArray = CryptoJS.enc.Base64.parse(base64String);
         */
        parse: function (base64Str) {
            // Shortcuts
            var base64StrLength = base64Str.length;
            var map = this._map;

            // Ignore padding
            var paddingChar = map.charAt(64);
            if (paddingChar) {
                var paddingIndex = base64Str.indexOf(paddingChar);
                if (paddingIndex != -1) {
                    base64StrLength = paddingIndex;
                }
            }

            // Convert
            var words = [];
            var nBytes = 0;
            for (var i = 0; i < base64StrLength; i++) {
                if (i % 4) {
                    var bits1 = map.indexOf(base64Str.charAt(i - 1)) << ((i % 4) * 2);
                    var bits2 = map.indexOf(base64Str.charAt(i)) >>> (6 - (i % 4) * 2);
                    words[nBytes >>> 2] |= (bits1 | bits2) << (24 - (nBytes % 4) * 8);
                    nBytes++;
                }
            }

            return WordArray.create(words, nBytes);
        },

        _map: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
    };
}());

/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
(function () {
    // Check if typed arrays are supported
    if (typeof ArrayBuffer != 'function') {
        return;
    }

    // Shortcuts
    var C = CryptoJS;
    var C_lib = C.lib;
    var WordArray = C_lib.WordArray;

    // Reference original init
    var superInit = WordArray.init;

    // Augment WordArray.init to handle typed arrays
    var subInit = WordArray.init = function (typedArray) {
        // Convert buffers to uint8
        if (typedArray instanceof ArrayBuffer) {
            typedArray = new Uint8Array(typedArray);
        }

        // Convert other array views to uint8
        if (
            typedArray instanceof Int8Array ||
            typedArray instanceof Uint8ClampedArray ||
            typedArray instanceof Int16Array ||
            typedArray instanceof Uint16Array ||
            typedArray instanceof Int32Array ||
            typedArray instanceof Uint32Array ||
            typedArray instanceof Float32Array ||
            typedArray instanceof Float64Array
        ) {
            typedArray = new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
        }

        // Handle Uint8Array
        if (typedArray instanceof Uint8Array) {
            // Shortcut
            var typedArrayByteLength = typedArray.byteLength;

            // Extract bytes
            var words = [];
            for (var i = 0; i < typedArrayByteLength; i++) {
                words[i >>> 2] |= typedArray[i] << (24 - (i % 4) * 8);
            }

            // Initialize this word array
            superInit.call(this, words, typedArrayByteLength);
        } else {
            // Else call normal init
            superInit.apply(this, arguments);
        }
    };

    subInit.prototype = WordArray;
}());

/*!
    Copyright 2012 Rustici Software

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/**
TinCan client library

TODO:

* Add statement queueing

@module TinCan
**/
var TinCan;

(function () {
    "use strict";
    var _reservedQSParams = {
        //
        // these are TC spec reserved words that may end up in queries to the endpoint
        //
        statementId:       true,
        voidedStatementId: true,
        verb:              true,
        object:            true,
        registration:      true,
        context:           true,
        actor:             true,
        since:             true,
        until:             true,
        limit:             true,
        authoritative:     true,
        sparse:            true,
        instructor:        true,
        ascending:         true,
        continueToken:     true,
        agent:             true,
        activityId:        true,
        stateId:           true,
        profileId:         true,

        //
        // these are suggested by the LMS launch spec addition that TinCanJS consumes
        //
        activity_platform: true,
        grouping:          true,
        "Accept-Language": true
    };

    /**
    @class TinCan
    @constructor
    @param {Object} [options] Configuration used to initialize.
        @param {String} [options.url] URL for determining launch provided
            configuration options
        @param {Array} [options.recordStores] list of pre-configured LRSes
        @param {Object|TinCan.Agent} [options.actor] default actor
        @param {Object|TinCan.Activity} [options.activity] default activity
        @param {String} [options.registration] default registration
        @param {Object|TinCan.Context} [options.context] default context
    **/
    TinCan = function (cfg) {
        this.log("constructor");

        /**
        @property recordStores
        @type Array
        */
        this.recordStores = [];

        /**
        Default actor used when preparing statements that
        don't yet have an actor set, and for saving state, etc.

        @property actor
        @type Object
        */
        this.actor = null;

        /**
        Default activity, may be used as a statement 'target'
        or incorporated into 'context'

        @property activity
        @type Object
        */
        this.activity = null;

        /**
        Default registration, included in default context when
        provided, otherwise used in statement queries

        @property registration
        @type String
        */
        this.registration = null;

        /**
        Default context used when preparing statements that
        don't yet have a context set, or mixed in when one
        has been provided, properties do NOT override on mixing

        @property context
        @type Object
        */
        this.context = null;

        this.init(cfg);
    };

    TinCan.prototype = {
        LOG_SRC: "TinCan",

        /**
        Safe version of logging, only displays when .DEBUG is true, and console.log
        is available

        @method log
        @param {String} msg Message to output
        */
        log: function (msg, src) {
            /* globals console */
            if (TinCan.DEBUG && typeof console !== "undefined" && console.log) {
                src = src || this.LOG_SRC || "TinCan";

                console.log("TinCan." + src + ": " + msg);
            }
        },

        /**
        @method init
        @param {Object} [options] Configuration used to initialize (see TinCan constructor).
        */
        init: function (cfg) {
            this.log("init");
            var i;

            cfg = cfg || {};

            if (cfg.hasOwnProperty("url") && cfg.url !== "") {
                this._initFromQueryString(cfg.url);
            }

            if (cfg.hasOwnProperty("recordStores") && cfg.recordStores !== undefined) {
                for (i = 0; i < cfg.recordStores.length; i += 1) {
                    this.addRecordStore(cfg.recordStores[i]);
                }
            }
            if (cfg.hasOwnProperty("activity")) {
                if (cfg.activity instanceof TinCan.Activity) {
                    this.activity = cfg.activity;
                }
                else {
                    this.activity = new TinCan.Activity (cfg.activity);
                }
            }
            if (cfg.hasOwnProperty("actor")) {
                if (cfg.actor instanceof TinCan.Agent) {
                    this.actor = cfg.actor;
                }
                else {
                    this.actor = new TinCan.Agent (cfg.actor);
                }
            }
            if (cfg.hasOwnProperty("context")) {
                if (cfg.context instanceof TinCan.Context) {
                    this.context = cfg.context;
                }
                else {
                    this.context = new TinCan.Context (cfg.context);
                }
            }
            if (cfg.hasOwnProperty("registration")) {
                this.registration = cfg.registration;
            }
        },

        /**
        @method _initFromQueryString
        @param {String} url
        @private
        */
        _initFromQueryString: function (url) {
            this.log("_initFromQueryString");

            var i,
                prop,
                qsParams = TinCan.Utils.parseURL(url).params,
                lrsProps = ["endpoint", "auth"],
                lrsCfg = {},
                contextCfg,
                extended = null
            ;

            if (qsParams.hasOwnProperty("actor")) {
                this.log("_initFromQueryString - found actor: " + qsParams.actor);
                try {
                    this.actor = TinCan.Agent.fromJSON(qsParams.actor);
                    delete qsParams.actor;
                }
                catch (ex) {
                    this.log("_initFromQueryString - failed to set actor: " + ex);
                }
            }

            if (qsParams.hasOwnProperty("activity_id")) {
                this.activity = new TinCan.Activity (
                    {
                        id: qsParams.activity_id
                    }
                );
                delete qsParams.activity_id;
            }

            if (
                qsParams.hasOwnProperty("activity_platform") ||
                qsParams.hasOwnProperty("registration") ||
                qsParams.hasOwnProperty("grouping")
            ) {
                contextCfg = {};

                if (qsParams.hasOwnProperty("activity_platform")) {
                    contextCfg.platform = qsParams.activity_platform;
                    delete qsParams.activity_platform;
                }
                if (qsParams.hasOwnProperty("registration")) {
                    //
                    // stored in two locations cause we always want it in the default
                    // context, but we also want to be able to get to it for Statement
                    // queries
                    //
                    contextCfg.registration = this.registration = qsParams.registration;
                    delete qsParams.registration;
                }
                if (qsParams.hasOwnProperty("grouping")) {
                    contextCfg.contextActivities = {};
                    contextCfg.contextActivities.grouping = qsParams.grouping;
                    delete qsParams.grouping;
                }

                this.context = new TinCan.Context (contextCfg);
            }

            //
            // order matters here, process the URL provided LRS last because it gets
            // all the remaining parameters so that they get passed through
            //
            if (qsParams.hasOwnProperty("endpoint")) {
                for (i = 0; i < lrsProps.length; i += 1) {
                    prop = lrsProps[i];
                    if (qsParams.hasOwnProperty(prop)) {
                        lrsCfg[prop] = qsParams[prop];
                        delete qsParams[prop];
                    }
                }

                // remove our reserved params so they don't end up  in the extended object
                for (i in qsParams) {
                    if (qsParams.hasOwnProperty(i)) {
                        if (_reservedQSParams.hasOwnProperty(i)) {
                            delete qsParams[i];
                        } else {
                            extended = extended || {};
                            extended[i] = qsParams[i];
                        }
                    }
                }
                if (extended !== null) {
                    lrsCfg.extended = extended;
                }

                lrsCfg.allowFail = false;

                this.addRecordStore(lrsCfg);
            }
        },

        /**
        @method addRecordStore
        @param {Object} Configuration data

         * TODO:
         * check endpoint for trailing '/'
         * check for unique endpoints
        */
        addRecordStore: function (cfg) {
            this.log("addRecordStore");
            var lrs;
            if (cfg instanceof TinCan.LRS) {
                lrs = cfg;
            }
            else {
                lrs = new TinCan.LRS (cfg);
            }
            this.recordStores.push(lrs);
        },

        /**
        @method prepareStatement
        @param {Object|TinCan.Statement} Base statement properties or
            pre-created TinCan.Statement instance
        @return {TinCan.Statement}
        */
        prepareStatement: function (stmt) {
            this.log("prepareStatement");
            if (! (stmt instanceof TinCan.Statement)) {
                stmt = new TinCan.Statement (stmt);
            }

            if (stmt.actor === null && this.actor !== null) {
                stmt.actor = this.actor;
            }
            if (stmt.target === null && this.activity !== null) {
                stmt.target = this.activity;
            }

            if (this.context !== null) {
                if (stmt.context === null) {
                    stmt.context = this.context;
                }
                else {
                    if (stmt.context.registration === null) {
                        stmt.context.registration = this.context.registration;
                    }
                    if (stmt.context.platform === null) {
                        stmt.context.platform = this.context.platform;
                    }

                    if (this.context.contextActivities !== null) {
                        if (stmt.context.contextActivities === null) {
                            stmt.context.contextActivities = this.context.contextActivities;
                        }
                        else {
                            if (this.context.contextActivities.grouping !== null && stmt.context.contextActivities.grouping === null) {
                                stmt.context.contextActivities.grouping = this.context.contextActivities.grouping;
                            }
                            if (this.context.contextActivities.parent !== null && stmt.context.contextActivities.parent === null) {
                                stmt.context.contextActivities.parent = this.context.contextActivities.parent;
                            }
                            if (this.context.contextActivities.other !== null && stmt.context.contextActivities.other === null) {
                                stmt.context.contextActivities.other = this.context.contextActivities.other;
                            }
                        }
                    }
                }
            }

            return stmt;
        },

        /**
        Calls saveStatement on each configured LRS, provide callback to make it asynchronous

        @method sendStatement
        @param {TinCan.Statement|Object} statement Send statement to LRS
        @param {Function} [callback] Callback function to execute on completion
        */
        sendStatement: function (stmt, callback) {
            this.log("sendStatement");

            // would prefer to use .bind instead of 'self'
            var self = this,
                lrs,
                statement = this.prepareStatement(stmt),
                rsCount = this.recordStores.length,
                i,
                results = [],
                callbackWrapper,
                callbackResults = []
            ;

            if (rsCount > 0) {
                /*
                   if there is a callback that is a function then we need
                   to wrap that function with a function that becomes
                   the new callback that reduces a closure count of the
                   requests that don't have allowFail set to true and
                   when that number hits zero then the original callback
                   is executed
                */
                if (typeof callback === "function") {
                    callbackWrapper = function (err, xhr) {
                        var args;

                        self.log("sendStatement - callbackWrapper: " + rsCount);
                        if (rsCount > 1) {
                            rsCount -= 1;
                            callbackResults.push(
                                {
                                    err: err,
                                    xhr: xhr
                                }
                            );
                        }
                        else if (rsCount === 1) {
                            callbackResults.push(
                                {
                                    err: err,
                                    xhr: xhr
                                }
                            );
                            args = [
                                callbackResults,
                                statement
                            ];
                            callback.apply(this, args);
                        }
                        else {
                            self.log("sendStatement - unexpected record store count: " + rsCount);
                        }
                    };
                }

                for (i = 0; i < rsCount; i += 1) {
                    lrs = this.recordStores[i];

                    results.push(
                        lrs.saveStatement(statement, { callback: callbackWrapper })
                    );
                }
            }
            else {
                this.log("[warning] sendStatement: No LRSs added yet (statement not sent)");
                if (typeof callback === "function") {
                    callback.apply(this, [ null, statement ]);
                }
            }

            return {
                statement: statement,
                results: results
            };
        },

        /**
        Calls retrieveStatement on the first LRS, provide callback to make it asynchronous

        @method getStatement
        @param {String} [stmtId] Statement ID to get
        @param {Function} [callback] Callback function to execute on completion
        @param {Object} [cfg] Configuration data
            @param {Object} [params] Query parameters
                @param {Boolean} [attachments] Include attachments in multipart response or don't (defualt: false)
        @return {Array|Result} Array of results, or single result

        TODO: make TinCan track statements it has seen in a local cache to be returned easily
        */
        getStatement: function (stmtId, callback, cfg) {
            this.log("getStatement");

            var lrs;

            cfg = cfg || {};
            cfg.params = cfg.params || {};

            if (this.recordStores.length > 0) {
                //
                // for statements (for now) we only need to read from the first LRS
                // in the future it may make sense to get all from all LRSes and
                // compare to remove duplicates or allow inspection of them for differences?
                //
                // TODO: make this the first non-allowFail LRS but for now it should
                // be good enough to make it the first since we know the LMS provided
                // LRS is the first
                //
                lrs = this.recordStores[0];

                return lrs.retrieveStatement(stmtId, { callback: callback, params: cfg.params });
            }

            this.log("[warning] getStatement: No LRSs added yet (statement not retrieved)");
        },

        /**
        Creates a statement used for voiding the passed statement/statement ID and calls
        send statement with the voiding statement.

        @method voidStatement
        @param {TinCan.Statement|String} statement Statement or statement ID to void
        @param {Function} [callback] Callback function to execute on completion
        @param {Object} [options] Options used to build voiding statement
            @param {TinCan.Agent} [options.actor] Agent to be used as 'actor' in voiding statement
        */
        voidStatement: function (stmt, callback, options) {
            this.log("voidStatement");

            // would prefer to use .bind instead of 'self'
            var self = this,
                lrs,
                actor,
                voidingStatement,
                rsCount = this.recordStores.length,
                i,
                results = [],
                callbackWrapper,
                callbackResults = []
            ;

            if (stmt instanceof TinCan.Statement) {
                stmt = stmt.id;
            }

            if (typeof options.actor !== "undefined") {
                actor = options.actor;
            }
            else if (this.actor !== null) {
                actor = this.actor;
            }

            voidingStatement = new TinCan.Statement(
                {
                    actor: actor,
                    verb: {
                        id: "http://adlnet.gov/expapi/verbs/voided"
                    },
                    target: {
                        objectType: "StatementRef",
                        id: stmt
                    }
                }
            );

            if (rsCount > 0) {
                /*
                   if there is a callback that is a function then we need
                   to wrap that function with a function that becomes
                   the new callback that reduces a closure count of the
                   requests that don't have allowFail set to true and
                   when that number hits zero then the original callback
                   is executed
                */
                if (typeof callback === "function") {
                    callbackWrapper = function (err, xhr) {
                        var args;

                        self.log("voidStatement - callbackWrapper: " + rsCount);
                        if (rsCount > 1) {
                            rsCount -= 1;
                            callbackResults.push(
                                {
                                    err: err,
                                    xhr: xhr
                                }
                            );
                        }
                        else if (rsCount === 1) {
                            callbackResults.push(
                                {
                                    err: err,
                                    xhr: xhr
                                }
                            );
                            args = [
                                callbackResults,
                                voidingStatement
                            ];
                            callback.apply(this, args);
                        }
                        else {
                            self.log("voidStatement - unexpected record store count: " + rsCount);
                        }
                    };
                }

                for (i = 0; i < rsCount; i += 1) {
                    lrs = this.recordStores[i];

                    results.push(
                        lrs.saveStatement(voidingStatement, { callback: callbackWrapper })
                    );
                }
            }
            else {
                this.log("[warning] voidStatement: No LRSs added yet (statement not sent)");
                if (typeof callback === "function") {
                    callback.apply(this, [ null, voidingStatement ]);
                }
            }

            return {
                statement: voidingStatement,
                results: results
            };
        },

        /**
        Calls retrieveVoidedStatement on the first LRS, provide callback to make it asynchronous

        @method getVoidedStatement
        @param {String} statement Statement ID to get
        @param {Function} [callback] Callback function to execute on completion
        @return {Array|Result} Array of results, or single result

        TODO: make TinCan track voided statements it has seen in a local cache to be returned easily
        */
        getVoidedStatement: function (stmtId, callback) {
            this.log("getVoidedStatement");

            var lrs;

            if (this.recordStores.length > 0) {
                //
                // for statements (for now) we only need to read from the first LRS
                // in the future it may make sense to get all from all LRSes and
                // compare to remove duplicates or allow inspection of them for differences?
                //
                // TODO: make this the first non-allowFail LRS but for now it should
                // be good enough to make it the first since we know the LMS provided
                // LRS is the first
                //
                lrs = this.recordStores[0];

                return lrs.retrieveVoidedStatement(stmtId, { callback: callback });
            }

            this.log("[warning] getVoidedStatement: No LRSs added yet (statement not retrieved)");
        },

        /**
        Calls saveStatements with list of prepared statements

        @method sendStatements
        @param {Array} Array of statements to send
        @param {Function} Callback function to execute on completion
        */
        sendStatements: function (stmts, callback) {
            this.log("sendStatements");
            var self = this,
                lrs,
                statements = [],
                rsCount = this.recordStores.length,
                i,
                results = [],
                callbackWrapper,
                callbackResults = []
            ;
            if (stmts.length === 0) {
                if (typeof callback === "function") {
                    callback.apply(this, [ null, statements ]);
                }
            }
            else {
                for (i = 0; i < stmts.length; i += 1) {
                    statements.push(
                        this.prepareStatement(stmts[i])
                    );
                }

                if (rsCount > 0) {
                    /*
                       if there is a callback that is a function then we need
                       to wrap that function with a function that becomes
                       the new callback that reduces a closure count of the
                       requests that don't have allowFail set to true and
                       when that number hits zero then the original callback
                       is executed
                    */

                    if (typeof callback === "function") {
                        callbackWrapper = function (err, xhr) {
                            var args;

                            self.log("sendStatements - callbackWrapper: " + rsCount);
                            if (rsCount > 1) {
                                rsCount -= 1;
                                callbackResults.push(
                                    {
                                        err: err,
                                        xhr: xhr
                                    }
                                );
                            }
                            else if (rsCount === 1) {
                                callbackResults.push(
                                    {
                                        err: err,
                                        xhr: xhr
                                    }
                                );
                                args = [
                                    callbackResults,
                                    statements
                                ];
                                callback.apply(this, args);
                            }
                            else {
                                self.log("sendStatements - unexpected record store count: " + rsCount);
                            }
                        };
                    }

                    for (i = 0; i < rsCount; i += 1) {
                        lrs = this.recordStores[i];

                        results.push(
                            lrs.saveStatements(statements, { callback: callbackWrapper })
                        );
                    }
                }
                else {
                    this.log("[warning] sendStatements: No LRSs added yet (statements not sent)");
                    if (typeof callback === "function") {
                        callback.apply(this, [ null, statements ]);
                    }
                }
            }

            return {
                statements: statements,
                results: results
            };
        },

        /**
        @method getStatements
        @param {Object} [cfg] Configuration for request
            @param {Boolean} [cfg.sendActor] Include default actor in query params
            @param {Boolean} [cfg.sendActivity] Include default activity in query params
            @param {Object} [cfg.params] Parameters used to filter.
                            These are the same as those accepted by the
                            <a href="TinCan.LRS.html#method_queryStatements">LRS.queryStatements</a>
                            method.

            @param {Function} [cfg.callback] Function to run at completion

        TODO: support multiple LRSs and flag to use single
        */
        getStatements: function (cfg) {
            this.log("getStatements");
            var queryCfg = {},
                lrs,
                params
            ;
            if (this.recordStores.length > 0) {
                //
                // for get (for now) we only get from one (as they should be the same)
                // but it may make sense to long term try to merge statements, perhaps
                // by using statementId as unique
                //
                // TODO: make this the first non-allowFail LRS but for now it should
                // be good enough to make it the first since we know the LMS provided
                // LRS is the first
                //
                lrs = this.recordStores[0];

                cfg = cfg || {};

                // TODO: need a clone function?
                params = cfg.params || {};

                if (cfg.sendActor && this.actor !== null) {
                    if (lrs.version === "0.9" || lrs.version === "0.95") {
                        params.actor = this.actor;
                    }
                    else {
                        params.agent = this.actor;
                    }
                }
                if (cfg.sendActivity && this.activity !== null) {
                    if (lrs.version === "0.9" || lrs.version === "0.95") {
                        params.target = this.activity;
                    }
                    else {
                        params.activity = this.activity;
                    }
                }
                if (typeof params.registration === "undefined" && this.registration !== null) {
                    params.registration = this.registration;
                }

                queryCfg = {
                    params: params
                };
                if (typeof cfg.callback !== "undefined") {
                    queryCfg.callback = cfg.callback;
                }

                return lrs.queryStatements(queryCfg);
            }

            this.log("[warning] getStatements: No LRSs added yet (statements not read)");
        },

        /**
        @method getState
        @param {String} key Key to retrieve from the state
        @param {Object} [cfg] Configuration for request
            @param {Object} [cfg.agent] Agent used in query,
                defaults to 'actor' property if empty
            @param {Object} [cfg.activity] Activity used in query,
                defaults to 'activity' property if empty
            @param {Object} [cfg.registration] Registration used in query,
                defaults to 'registration' property if empty
            @param {Function} [cfg.callback] Function to run with state
        */
        getState: function (key, cfg) {
            this.log("getState");
            var queryCfg,
                lrs
            ;

            if (this.recordStores.length > 0) {
                //
                // for state (for now) we are only going to store to the first LRS
                // so only get from there too
                //
                // TODO: make this the first non-allowFail LRS but for now it should
                // be good enough to make it the first since we know the LMS provided
                // LRS is the first
                //
                lrs = this.recordStores[0];

                cfg = cfg || {};

                queryCfg = {
                    agent: (typeof cfg.agent !== "undefined" ? cfg.agent : this.actor),
                    activity: (typeof cfg.activity !== "undefined" ? cfg.activity : this.activity)
                };
                if (typeof cfg.registration !== "undefined") {
                    queryCfg.registration = cfg.registration;
                }
                else if (this.registration !== null) {
                    queryCfg.registration = this.registration;
                }
                if (typeof cfg.callback !== "undefined") {
                    queryCfg.callback = cfg.callback;
                }

                return lrs.retrieveState(key, queryCfg);
            }

            this.log("[warning] getState: No LRSs added yet (state not retrieved)");
        },

        /**
        @method setState
        @param {String} key Key to store into the state
        @param {String|Object} val Value to store into the state, objects will be stringified to JSON
        @param {Object} [cfg] Configuration for request
            @param {Object} [cfg.agent] Agent used in query,
                defaults to 'actor' property if empty
            @param {Object} [cfg.activity] Activity used in query,
                defaults to 'activity' property if empty
            @param {Object} [cfg.registration] Registration used in query,
                defaults to 'registration' property if empty
            @param {String} [cfg.lastSHA1] SHA1 of the previously seen existing state
            @param {String} [cfg.contentType] Content-Type to specify in headers
            @param {Boolean} [cfg.overwriteJSON] If the Content-Type is JSON, should a PUT be used?
            @param {Function} [cfg.callback] Function to run with state
        */
        setState: function (key, val, cfg) {
            this.log("setState");
            var queryCfg,
                lrs
            ;

            if (this.recordStores.length > 0) {
                //
                // for state (for now) we are only going to store to the first LRS
                // so only get from there too
                //
                // TODO: make this the first non-allowFail LRS but for now it should
                // be good enough to make it the first since we know the LMS provided
                // LRS is the first
                //
                lrs = this.recordStores[0];

                cfg = cfg || {};

                queryCfg = {
                    agent: (typeof cfg.agent !== "undefined" ? cfg.agent : this.actor),
                    activity: (typeof cfg.activity !== "undefined" ? cfg.activity : this.activity)
                };
                if (typeof cfg.registration !== "undefined") {
                    queryCfg.registration = cfg.registration;
                }
                else if (this.registration !== null) {
                    queryCfg.registration = this.registration;
                }
                if (typeof cfg.lastSHA1 !== "undefined") {
                    queryCfg.lastSHA1 = cfg.lastSHA1;
                }
                if (typeof cfg.contentType !== "undefined") {
                    queryCfg.contentType = cfg.contentType;
                    if ((typeof cfg.overwriteJSON !== "undefined") && (! cfg.overwriteJSON) && (TinCan.Utils.isApplicationJSON(cfg.contentType))) {
                        queryCfg.method = "POST";
                    }
                }
                if (typeof cfg.callback !== "undefined") {
                    queryCfg.callback = cfg.callback;
                }

                return lrs.saveState(key, val, queryCfg);
            }

            this.log("[warning] setState: No LRSs added yet (state not saved)");
        },

        /**
        @method deleteState
        @param {String|null} key Key to remove from the state, or null to clear all
        @param {Object} [cfg] Configuration for request
            @param {Object} [cfg.agent] Agent used in query,
                defaults to 'actor' property if empty
            @param {Object} [cfg.activity] Activity used in query,
                defaults to 'activity' property if empty
            @param {Object} [cfg.registration] Registration used in query,
                defaults to 'registration' property if empty
            @param {Function} [cfg.callback] Function to run with state
        */
        deleteState: function (key, cfg) {
            this.log("deleteState");
            var queryCfg,
                lrs
            ;

            if (this.recordStores.length > 0) {
                //
                // for state (for now) we are only going to store to the first LRS
                // so only get from there too
                //
                // TODO: make this the first non-allowFail LRS but for now it should
                // be good enough to make it the first since we know the LMS provided
                // LRS is the first
                //
                lrs = this.recordStores[0];

                cfg = cfg || {};

                queryCfg = {
                    agent: (typeof cfg.agent !== "undefined" ? cfg.agent : this.actor),
                    activity: (typeof cfg.activity !== "undefined" ? cfg.activity : this.activity)
                };
                if (typeof cfg.registration !== "undefined") {
                    queryCfg.registration = cfg.registration;
                }
                else if (this.registration !== null) {
                    queryCfg.registration = this.registration;
                }
                if (typeof cfg.callback !== "undefined") {
                    queryCfg.callback = cfg.callback;
                }

                return lrs.dropState(key, queryCfg);
            }

            this.log("[warning] deleteState: No LRSs added yet (state not deleted)");
        },

        /**
        @method getActivityProfile
        @param {String} key Key to retrieve from the profile
        @param {Object} [cfg] Configuration for request
            @param {Object} [cfg.activity] Activity used in query,
                defaults to 'activity' property if empty
            @param {Function} [cfg.callback] Function to run with activity profile
        */
        getActivityProfile: function (key, cfg) {
            this.log("getActivityProfile");
            var queryCfg,
                lrs
            ;

            if (this.recordStores.length > 0) {
                //
                // for activity profiles (for now) we are only going to store to the first LRS
                // so only get from there too
                //
                // TODO: make this the first non-allowFail LRS but for now it should
                // be good enough to make it the first since we know the LMS provided
                // LRS is the first
                //
                lrs = this.recordStores[0];

                cfg = cfg || {};

                queryCfg = {
                    activity: (typeof cfg.activity !== "undefined" ? cfg.activity : this.activity)
                };
                if (typeof cfg.callback !== "undefined") {
                    queryCfg.callback = cfg.callback;
                }

                return lrs.retrieveActivityProfile(key, queryCfg);
            }

            this.log("[warning] getActivityProfile: No LRSs added yet (activity profile not retrieved)");
        },

        /**
        @method setActivityProfile
        @param {String} key Key to store into the activity profile
        @param {String|Object} val Value to store into the activity profile, objects will be stringified to JSON
        @param {Object} [cfg] Configuration for request
            @param {Object} [cfg.activity] Activity used in query,
                defaults to 'activity' property if empty
            @param {String} [cfg.lastSHA1] SHA1 of the previously seen existing profile
            @param {String} [cfg.contentType] Content-Type to specify in headers
            @param {Boolean} [cfg.overwriteJSON] If the Content-Type is JSON, should a PUT be used?
            @param {Function} [cfg.callback] Function to run with activity profile
        */
        setActivityProfile: function (key, val, cfg) {
            this.log("setActivityProfile");
            var queryCfg,
                lrs
            ;

            if (this.recordStores.length > 0) {
                //
                // for activity profile (for now) we are only going to store to the first LRS
                // so only get from there too
                //
                // TODO: make this the first non-allowFail LRS but for now it should
                // be good enough to make it the first since we know the LMS provided
                // LRS is the first
                //
                lrs = this.recordStores[0];

                cfg = cfg || {};

                queryCfg = {
                    activity: (typeof cfg.activity !== "undefined" ? cfg.activity : this.activity)
                };
                if (typeof cfg.callback !== "undefined") {
                    queryCfg.callback = cfg.callback;
                }
                if (typeof cfg.lastSHA1 !== "undefined") {
                    queryCfg.lastSHA1 = cfg.lastSHA1;
                }
                if (typeof cfg.contentType !== "undefined") {
                    queryCfg.contentType = cfg.contentType;
                    if ((typeof cfg.overwriteJSON !== "undefined") && (! cfg.overwriteJSON) && (TinCan.Utils.isApplicationJSON(cfg.contentType))) {
                        queryCfg.method = "POST";
                    }
                }

                return lrs.saveActivityProfile(key, val, queryCfg);
            }

            this.log("[warning] setActivityProfile: No LRSs added yet (activity profile not saved)");
        },

        /**
        @method deleteActivityProfile
        @param {String|null} key Key to remove from the activity profile, or null to clear all
        @param {Object} [cfg] Configuration for request
            @param {Object} [cfg.activity] Activity used in query,
                defaults to 'activity' property if empty
            @param {Function} [cfg.callback] Function to run with activity profile
        */
        deleteActivityProfile: function (key, cfg) {
            this.log("deleteActivityProfile");
            var queryCfg,
                lrs
            ;

            if (this.recordStores.length > 0) {
                //
                // for activity profile (for now) we are only going to store to the first LRS
                // so only get from there too
                //
                // TODO: make this the first non-allowFail LRS but for now it should
                // be good enough to make it the first since we know the LMS provided
                // LRS is the first
                //
                lrs = this.recordStores[0];

                cfg = cfg || {};

                queryCfg = {
                    activity: (typeof cfg.activity !== "undefined" ? cfg.activity : this.activity)
                };
                if (typeof cfg.callback !== "undefined") {
                    queryCfg.callback = cfg.callback;
                }

                return lrs.dropActivityProfile(key, queryCfg);
            }

            this.log("[warning] deleteActivityProfile: No LRSs added yet (activity profile not deleted)");
        },

        /**
        @method getAgentProfile
        @param {String} key Key to retrieve from the profile
        @param {Object} [cfg] Configuration for request
            @param {Object} [cfg.agent] Agent used in query,
                defaults to 'actor' property if empty
            @param {Function} [cfg.callback] Function to run with agent profile
        */
        getAgentProfile: function (key, cfg) {
            this.log("getAgentProfile");
            var queryCfg,
                lrs
            ;

            if (this.recordStores.length > 0) {
                //
                // for agent profiles (for now) we are only going to store to the first LRS
                // so only get from there too
                //
                // TODO: make this the first non-allowFail LRS but for now it should
                // be good enough to make it the first since we know the LMS provided
                // LRS is the first
                //
                lrs = this.recordStores[0];

                cfg = cfg || {};

                queryCfg = {
                    agent: (typeof cfg.agent !== "undefined" ? cfg.agent : this.actor)
                };
                if (typeof cfg.callback !== "undefined") {
                    queryCfg.callback = cfg.callback;
                }

                return lrs.retrieveAgentProfile(key, queryCfg);
            }

            this.log("[warning] getAgentProfile: No LRSs added yet (agent profile not retrieved)");
        },

        /**
        @method setAgentProfile
        @param {String} key Key to store into the agent profile
        @param {String|Object} val Value to store into the agent profile, objects will be stringified to JSON
        @param {Object} [cfg] Configuration for request
            @param {Object} [cfg.agent] Agent used in query,
                defaults to 'actor' property if empty
            @param {String} [cfg.lastSHA1] SHA1 of the previously seen existing profile
            @param {String} [cfg.contentType] Content-Type to specify in headers
            @param {Boolean} [cfg.overwriteJSON] If the Content-Type is JSON, should a PUT be used?
            @param {Function} [cfg.callback] Function to run with agent profile
        */
        setAgentProfile: function (key, val, cfg) {
            this.log("setAgentProfile");
            var queryCfg,
                lrs
            ;

            if (this.recordStores.length > 0) {
                //
                // for agent profile (for now) we are only going to store to the first LRS
                // so only get from there too
                //
                // TODO: make this the first non-allowFail LRS but for now it should
                // be good enough to make it the first since we know the LMS provided
                // LRS is the first
                //
                lrs = this.recordStores[0];

                cfg = cfg || {};

                queryCfg = {
                    agent: (typeof cfg.agent !== "undefined" ? cfg.agent : this.actor)
                };
                if (typeof cfg.callback !== "undefined") {
                    queryCfg.callback = cfg.callback;
                }
                if (typeof cfg.lastSHA1 !== "undefined") {
                    queryCfg.lastSHA1 = cfg.lastSHA1;
                }
                if (typeof cfg.contentType !== "undefined") {
                    queryCfg.contentType = cfg.contentType;
                    if ((typeof cfg.overwriteJSON !== "undefined") && (! cfg.overwriteJSON) && (TinCan.Utils.isApplicationJSON(cfg.contentType))) {
                        queryCfg.method = "POST";
                    }
                }

                return lrs.saveAgentProfile(key, val, queryCfg);
            }

            this.log("[warning] setAgentProfile: No LRSs added yet (agent profile not saved)");
        },

        /**
        @method deleteAgentProfile
        @param {String|null} key Key to remove from the agent profile, or null to clear all
        @param {Object} [cfg] Configuration for request
            @param {Object} [cfg.agent] Agent used in query,
                defaults to 'actor' property if empty
            @param {Function} [cfg.callback] Function to run with agent profile
        */
        deleteAgentProfile: function (key, cfg) {
            this.log("deleteAgentProfile");
            var queryCfg,
                lrs
            ;

            if (this.recordStores.length > 0) {
                //
                // for agent profile (for now) we are only going to store to the first LRS
                // so only get from there too
                //
                // TODO: make this the first non-allowFail LRS but for now it should
                // be good enough to make it the first since we know the LMS provided
                // LRS is the first
                //
                lrs = this.recordStores[0];

                cfg = cfg || {};

                queryCfg = {
                    agent: (typeof cfg.agent !== "undefined" ? cfg.agent : this.actor)
                };
                if (typeof cfg.callback !== "undefined") {
                    queryCfg.callback = cfg.callback;
                }

                return lrs.dropAgentProfile(key, queryCfg);
            }

            this.log("[warning] deleteAgentProfile: No LRSs added yet (agent profile not deleted)");
        }
    };

    /**
    @property DEBUG
    @static
    @default false
    */
    TinCan.DEBUG = false;

    /**
    Turn on debug logging

    @method enableDebug
    @static
    */
    TinCan.enableDebug = function () {
        TinCan.DEBUG = true;
    };

    /**
    Turn off debug logging

    @method disableDebug
    @static
    */
    TinCan.disableDebug = function () {
        TinCan.DEBUG = false;
    };

    /**
    @method versions
    @return {Array} Array of supported version numbers
    @static
    */
    TinCan.versions = function () {
        // newest first so we can use the first as the default
        return [
            "1.0.2",
            "1.0.1",
            "1.0.0",
            "0.95",
            "0.9"
        ];
    };

    /*global module*/
    // Support the CommonJS method for exporting our single global
    if (typeof module === "object") {
        module.exports = TinCan;
    }
}());

/*
    Copyright 2012 Rustici Software

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/**
TinCan client library

@module TinCan
@submodule TinCan.Utils
**/
(function () {
    "use strict";

    /**
    @class TinCan.Utils
    */
    TinCan.Utils = {
        defaultEncoding: "utf8",

        /**
        Generates a UUIDv4 compliant string that should be reasonably unique

        @method getUUID
        @return {String} UUID
        @static

        Excerpt from: http://www.broofa.com/Tools/Math.uuid.js (v1.4)
        http://www.broofa.com
        mailto:robert@broofa.com
        Copyright (c) 2010 Robert Kieffer
        Dual licensed under the MIT and GPL licenses.
        */
        getUUID: function () {
            /*jslint bitwise: true, eqeq: true */
            return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
                /[xy]/g,
                function (c) {
                    var r = Math.random() * 16|0, v = c == "x" ? r : (r&0x3|0x8);
                    return v.toString(16);
                }
            );
        },

        /**
        @method getISODateString
        @static
        @param {Date} date Date to stringify
        @return {String} ISO date String
        */
        getISODateString: function (d) {
            function pad (val, n) {
                var padder,
                    tempVal;
                if (typeof val === "undefined" || val === null) {
                    val = 0;
                }
                if (typeof n === "undefined" || n === null) {
                    n = 2;
                }
                padder = Math.pow(10, n-1);
                tempVal = val.toString();

                while (val < padder && padder > 1) {
                    tempVal = "0" + tempVal;
                    padder = padder / 10;
                }

                return tempVal;
            }

            return d.getUTCFullYear() + "-" +
                pad(d.getUTCMonth() + 1) + "-" +
                pad(d.getUTCDate()) + "T" +
                pad(d.getUTCHours()) + ":" +
                pad(d.getUTCMinutes()) + ":" +
                pad(d.getUTCSeconds()) + "." +
                pad(d.getUTCMilliseconds(), 3) + "Z";
        },

        /**
        @method convertISO8601DurationToMilliseconds
        @static
        @param {String} ISO8601Duration Duration in ISO8601 format
        @return {Int} Duration in milliseconds

        Note: does not handle input strings with years, months and days
        */
        convertISO8601DurationToMilliseconds: function (ISO8601Duration) {
            var isValueNegative = (ISO8601Duration.indexOf("-") >= 0),
                indexOfT = ISO8601Duration.indexOf("T"),
                indexOfH = ISO8601Duration.indexOf("H"),
                indexOfM = ISO8601Duration.indexOf("M"),
                indexOfS = ISO8601Duration.indexOf("S"),
                hours,
                minutes,
                seconds,
                durationInMilliseconds;

            if ((indexOfT === -1) || ((indexOfM !== -1) && (indexOfM < indexOfT)) || (ISO8601Duration.indexOf("D") !== -1) || (ISO8601Duration.indexOf("Y") !== -1)) {
                throw new Error("ISO 8601 timestamps including years, months and/or days are not currently supported");
            }

            if (indexOfH === -1) {
                indexOfH = indexOfT;
                hours = 0;
            }
            else {
                hours = parseInt(ISO8601Duration.slice(indexOfT + 1, indexOfH), 10);
            }

            if (indexOfM === -1) {
                indexOfM = indexOfT;
                minutes = 0;
            }
            else {
                minutes = parseInt(ISO8601Duration.slice(indexOfH + 1, indexOfM), 10);
            }

            seconds = parseFloat(ISO8601Duration.slice(indexOfM + 1, indexOfS));

            durationInMilliseconds = parseInt((((((hours * 60) + minutes) * 60) + seconds) * 1000), 10);
            if (isNaN(durationInMilliseconds)){
                durationInMilliseconds = 0;
            }
            if (isValueNegative) {
                durationInMilliseconds = durationInMilliseconds * -1;
            }

            return durationInMilliseconds;
        },

        /**
        @method convertMillisecondsToISO8601Duration
        @static
        @param {Int} inputMilliseconds Duration in milliseconds
        @return {String} Duration in ISO8601 format
        */
        convertMillisecondsToISO8601Duration: function (inputMilliseconds) {
            var hours,
                minutes,
                seconds,
                i_inputMilliseconds = parseInt(inputMilliseconds, 10),
                i_inputCentiseconds,
                inputIsNegative = "",
                rtnStr = "";

            //round to nearest 0.01 seconds
            i_inputCentiseconds = Math.round(i_inputMilliseconds / 10);

            if (i_inputCentiseconds < 0) {
                inputIsNegative = "-";
                i_inputCentiseconds = i_inputCentiseconds * -1;
            }

            hours = parseInt(((i_inputCentiseconds) / 360000), 10);
            minutes = parseInt((((i_inputCentiseconds) % 360000) / 6000), 10);
            seconds = (((i_inputCentiseconds) % 360000) % 6000) / 100;

            rtnStr = inputIsNegative + "PT";
            if (hours > 0) {
                rtnStr += hours + "H";
            }

            if (minutes > 0) {
                rtnStr += minutes + "M";
            }

            rtnStr += seconds + "S";

            return rtnStr;
        },

        /**
        @method getSHA1String
        @static
        @param {String} str Content to hash
        @return {String} SHA1 for contents
        */
        getSHA1String: function (str) {
            /*global CryptoJS*/

            return CryptoJS.SHA1(str).toString(CryptoJS.enc.Hex);
        },

        /**
        @method getSHA256String
        @static
        @param {ArrayBuffer|String} content Content to hash
        @return {String} SHA256 for contents
        */
        getSHA256String: function (content) {
            /*global CryptoJS*/

            if (Object.prototype.toString.call(content) === "[object ArrayBuffer]") {
                content = CryptoJS.lib.WordArray.create(content);
            }
            return CryptoJS.SHA256(content).toString(CryptoJS.enc.Hex);
        },

        /**
        @method getBase64String
        @static
        @param {String} str Content to encode
        @return {String} Base64 encoded contents
        */
        getBase64String: function (str) {
            /*global CryptoJS*/

            return CryptoJS.enc.Base64.stringify(
                CryptoJS.enc.Latin1.parse(str)
            );
        },

        /**
        Intended to be inherited by objects with properties that store
        display values in a language based "dictionary"

        @method getLangDictionaryValue
        @param {String} prop Property name storing the dictionary
        @param {String} [lang] Language to return
        @return {String}
        */
        getLangDictionaryValue: function (prop, lang) {
            var langDict = this[prop],
                key;

            if (typeof lang !== "undefined" && typeof langDict[lang] !== "undefined") {
                return langDict[lang];
            }
            if (typeof langDict.und !== "undefined") {
                return langDict.und;
            }
            if (typeof langDict["en-US"] !== "undefined") {
                return langDict["en-US"];
            }
            for (key in langDict) {
                if (langDict.hasOwnProperty(key)) {
                    return langDict[key];
                }
            }

            return "";
        },

        /**
        @method parseURL
        @param {String} url
        @param {Object} [options]
            @param {Boolean} [options.allowRelative] Option to allow relative URLs
        @return {Object} Object of values
        @private
        */
        parseURL: function (url, cfg) {
            //
            // see http://stackoverflow.com/a/21553982
            // and http://stackoverflow.com/a/2880929
            //
            var isRelative = url.charAt(0) === "/",
                _reURLInformation = [
                    "(/[^?#]*)", // pathname
                    "(\\?[^#]*|)", // search
                    "(#.*|)$" // hash
                ],
                reURLInformation,
                match,
                result,
                paramMatch,
                pl     = /\+/g,  // Regex for replacing addition symbol with a space
                search = /([^&=]+)=?([^&]*)/g,
                decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); };

            cfg = cfg || {};

            //
            // this method in an earlier version supported relative URLs, mostly to provide
            // support to the `LRS.moreStatements` method, that functionality was removed and
            // subsequently restored but with the addition of the option for allowing relative
            // URLs to be accepted which is the reason for the "helpful" exception message here
            //
            if (! isRelative) {
                //
                // not relative so make sure they have a scheme, host, etc.
                //
                _reURLInformation.unshift(
                    "^(https?:)//", // scheme
                    "(([^:/?#]*)(?::([0-9]+))?)" // host (hostname and port)
                );

                //
                // our regex requires there to be a '/' for the detection of the start
                // of the path, we can detect a '/' using indexOf beyond the part of the
                // scheme, since we've restricted scheme to 'http' or 'https' and because
                // a hostname is guaranteed to be there we can detect beyond the '://'
                // based on position, then tack on a trailing '/' because it can't be
                // part of the path
                //
                if (url.indexOf("/", 8) === -1) {
                    url = url + "/";
                }
            }
            else {
                //
                // relative so make sure they allow that explicitly
                //
                if (typeof cfg.allowRelative === "undefined" || ! cfg.allowRelative) {
                    throw new Error("Refusing to parse relative URL without 'allowRelative' option");
                }
            }

            reURLInformation = new RegExp(_reURLInformation.join(""));
            match = url.match(reURLInformation);
            if (match === null) {
                throw new Error("Unable to parse URL regular expression did not match: '" + url + "'");
            }

            // 'path' is for backwards compatibility
            if (isRelative) {
                result = {
                    protocol: null,
                    host: null,
                    hostname: null,
                    port: null,
                    path: null,
                    pathname: match[1],
                    search: match[2],
                    hash: match[3],
                    params: {}
                };

                result.path = result.pathname;
            }
            else {
                result = {
                    protocol: match[1],
                    host: match[2],
                    hostname: match[3],
                    port: match[4],
                    pathname: match[5],
                    search: match[6],
                    hash: match[7],
                    params: {}
                };

                result.path = result.protocol + "//" + result.host + result.pathname;
            }

            if (result.search !== "") {
                // extra parens to let jshint know this is an expression
                while ((paramMatch = search.exec(result.search.substring(1)))) {
                    result.params[decode(paramMatch[1])] = decode(paramMatch[2]);
                }
            }

            return result;
        },

        /**
        @method getServerRoot
        @param {String} absoluteUrl
        @return {String} server root of url
        @private
        */
        getServerRoot: function (absoluteUrl) {
            var urlParts = absoluteUrl.split("/");
            return urlParts[0] + "//" + urlParts[2];
        },

        /**
        @method getContentTypeFromHeader
        @static
        @param {String} header Content-Type header value
        @return {String} Primary value from Content-Type
        */
        getContentTypeFromHeader: function (header) {
            return (String(header).split(";"))[0];
        },

        /**
        @method isApplicationJSON
        @static
        @param {String} header Content-Type header value
        @return {Boolean} whether "application/json" was matched
        */
        isApplicationJSON: function (header) {
            return TinCan.Utils.getContentTypeFromHeader(header).toLowerCase().indexOf("application/json") === 0;
        },

        /**
        @method stringToArrayBuffer
        @static
        @param {String} content String of content to convert to an ArrayBuffer
        @param {String} [encoding] Encoding to use for conversion
        @return {ArrayBuffer} Converted content
        */
        stringToArrayBuffer: function () {
            TinCan.prototype.log("stringToArrayBuffer not overloaded - no environment loaded?");
        },

        /**
        @method stringFromArrayBuffer
        @static
        @param {ArrayBuffer} content ArrayBuffer of content to convert to a String
        @param {String} [encoding] Encoding to use for conversion
        @return {String} Converted content
        */
        stringFromArrayBuffer: function () {
            TinCan.prototype.log("stringFromArrayBuffer not overloaded - no environment loaded?");
        }
    };
}());

/*
    Copyright 2012-2013 Rustici Software

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/**
TinCan client library

@module TinCan
@submodule TinCan.LRS
**/
(function () {
    "use strict";
    /**
    @class TinCan.LRS
    @constructor
    */
    var LRS = TinCan.LRS = function (cfg) {
        this.log("constructor");

        /**
        @property endpoint
        @type String
        */
        this.endpoint = null;

        /**
        @property version
        @type String
        */
        this.version = null;

        /**
        @property auth
        @type String
        */
        this.auth = null;

        /**
        @property allowFail
        @type Boolean
        @default true
        */
        this.allowFail = true;

        /**
        @property extended
        @type Object
        */
        this.extended = null;

        this.init(cfg);
    };
    LRS.prototype = {
        /**
        @property LOG_SRC
        */
        LOG_SRC: "LRS",

        /**
        @method log
        */
        log: TinCan.prototype.log,

        /**
        @method init
        */
        init: function (cfg) {
            this.log("init");

            var versions = TinCan.versions(),
                versionMatch = false,
                i
            ;

            cfg = cfg || {};

            if (cfg.hasOwnProperty("alertOnRequestFailure")) {
                this.log("'alertOnRequestFailure' is deprecated (alerts have been removed) no need to set it now");
            }

            if (! cfg.hasOwnProperty("endpoint") || cfg.endpoint === null || cfg.endpoint === "") {
                this.log("[error] LRS invalid: no endpoint");
                throw {
                    code: 3,
                    mesg: "LRS invalid: no endpoint"
                };
            }

            this.endpoint = String(cfg.endpoint);
            if (this.endpoint.slice(-1) !== "/") {
                this.log("adding trailing slash to endpoint");
                this.endpoint += "/";
            }

            if (cfg.hasOwnProperty("allowFail")) {
                this.allowFail = cfg.allowFail;
            }

            if (cfg.hasOwnProperty("auth")) {
                this.auth = cfg.auth;
            }
            else if (cfg.hasOwnProperty("username") && cfg.hasOwnProperty("password")) {
                this.auth = "Basic " + TinCan.Utils.getBase64String(cfg.username + ":" + cfg.password);
            }

            if (cfg.hasOwnProperty("extended")) {
                this.extended = cfg.extended;
            }

            //
            // provide a hook method that environments can override
            // to handle anything necessary in the initialization
            // process that is customized to them, such as cross domain
            // setup in browsers, default implementation is empty
            //
            // this hook must run prior to version detection so that
            // request handling can be set up before requesting the
            // LRS version via the /about resource
            //
            this._initByEnvironment(cfg);

            if (typeof cfg.version !== "undefined") {
                this.log("version: " + cfg.version);
                for (i = 0; i < versions.length; i += 1) {
                    if (versions[i] === cfg.version) {
                        versionMatch = true;
                        break;
                    }
                }
                if (! versionMatch) {
                    this.log("[error] LRS invalid: version not supported (" + cfg.version + ")");
                    throw {
                        code: 5,
                        mesg: "LRS invalid: version not supported (" + cfg.version + ")"
                    };
                }
                this.version = cfg.version;
            }
            else {
                //
                // assume max supported when not specified,
                // TODO: add detection of LRS from call to endpoint
                //
                this.version = versions[0];
            }
        },

        /**
        Creates and returns a boundary for separating parts in
        requests where the statement has an attachment

        @method _getBoundary
        @private
        */
        _getBoundary: function () {
            return TinCan.Utils.getUUID().replace(/-/g, "");
        },

        /**
        Method should be overloaded by an environment to do per
        environment specifics such that the LRS can make a call
        to set the version if not provided

        @method _initByEnvironment
        @private
        */
        _initByEnvironment: function () {
            this.log("_initByEnvironment not overloaded - no environment loaded?");
        },

        /**
        Method should be overloaded by an environment to do per
        environment specifics for sending requests to the LRS

        @method _makeRequest
        @private
        */
        _makeRequest: function () {
            this.log("_makeRequest not overloaded - no environment loaded?");
        },

        /**
        Method should be overloaded by an environment to do per
        environment specifics for building multipart request data

        @method _getMultipartRequestData
        @private
        */
        _getMultipartRequestData: function () {
            this.log("_getMultipartRequestData not overloaded - no environment loaded?");
        },

        /**
        Method is overloaded by the browser environment in order to test converting an
        HTTP request that is greater than a defined length

        @method _IEModeConversion
        @private
        */
        _IEModeConversion: function () {
            this.log("_IEModeConversion not overloaded - browser environment not loaded.");
        },

        _processGetStatementResult: function (xhr, params) {
            var boundary,
                parsedResponse,
                statement,
                attachmentMap = {},
                i;

            if (! params.attachments) {
                return TinCan.Statement.fromJSON(xhr.responseText);
            }

            boundary = xhr.getResponseHeader("Content-Type").split("boundary=")[1];

            parsedResponse = this._parseMultipart(boundary, xhr.response);
            statement = JSON.parse(parsedResponse[0].body);
            for (i = 1; i < parsedResponse.length; i += 1) {
                attachmentMap[parsedResponse[i].headers["X-Experience-API-Hash"]] = parsedResponse[i].body;
            }

            this._assignAttachmentContent([statement], attachmentMap);

            return new TinCan.Statement(statement);
        },

        /**
        Method used to send a request via browser objects to the LRS

        @method sendRequest
        @param {Object} cfg Configuration for request
            @param {String} cfg.url URL portion to add to endpoint
            @param {String} [cfg.method] GET, PUT, POST, etc.
            @param {Object} [cfg.params] Parameters to set on the querystring
            @param {String|ArrayBuffer} [cfg.data] Body content as a String or ArrayBuffer
            @param {Object} [cfg.headers] Additional headers to set in the request
            @param {Function} [cfg.callback] Function to run at completion
                @param {String|Null} cfg.callback.err If an error occurred, this parameter will contain the HTTP status code.
                    If the operation succeeded, err will be null.
                @param {Object} cfg.callback.xhr XHR object
            @param {Boolean} [cfg.ignore404] Whether 404 status codes should be considered an error
            @param {Boolean} [cfg.expectMultipart] Whether to expect the response to be a multipart response
        @return {Object} XHR if called in a synchronous way (in other words no callback)
        */
        sendRequest: function (cfg) {
            this.log("sendRequest");
            var fullUrl = this.endpoint + cfg.url,
                headers = {},
                prop
            ;

            // respect absolute URLs passed in
            if (cfg.url.indexOf("http") === 0) {
                fullUrl = cfg.url;
            }

            // add extended LMS-specified values to the params
            if (this.extended !== null) {
                cfg.params = cfg.params || {};

                for (prop in this.extended) {
                    if (this.extended.hasOwnProperty(prop)) {
                        // don't overwrite cfg.params values that have already been added to the request with our extended params
                        if (! cfg.params.hasOwnProperty(prop)) {
                            if (this.extended[prop] !== null) {
                                cfg.params[prop] = this.extended[prop];
                            }
                        }
                    }
                }
            }

            // consolidate headers
            headers.Authorization = this.auth;
            if (this.version !== "0.9") {
                headers["X-Experience-API-Version"] = this.version;
            }

            for (prop in cfg.headers) {
                if (cfg.headers.hasOwnProperty(prop)) {
                    headers[prop] = cfg.headers[prop];
                }
            }

            return this._makeRequest(fullUrl, headers, cfg);
        },

        /**
        Method used to determine the LRS version

        @method about
        @param {Object} cfg Configuration object for the about request
            @param {Function} [cfg.callback] Callback to execute upon receiving a response
            @param {Object} [cfg.params] this is needed, but can be empty
        @return {Object} About which holds the version, or asyncrhonously calls a specified callback
        */
        about: function (cfg) {
            this.log("about");
            var requestCfg,
                requestResult,
                callbackWrapper;

            cfg = cfg || {};

            requestCfg = {
                url: "about",
                method: "GET",
                params: {}
            };
            if (typeof cfg.callback !== "undefined") {
                callbackWrapper = function (err, xhr) {
                    var result = xhr;

                    if (err === null) {
                        result = TinCan.About.fromJSON(xhr.responseText);
                    }

                    cfg.callback(err, result);
                };
                requestCfg.callback = callbackWrapper;
            }

            requestResult = this.sendRequest(requestCfg);

            if (callbackWrapper) {
                return;
            }

            if (requestResult.err === null) {
                requestResult.xhr = TinCan.About.fromJSON(requestResult.xhr.responseText);
            }
            return requestResult;
        },

        /**
        Save a statement, when used from a browser sends to the endpoint using the RESTful interface.
        Use a callback to make the call asynchronous.

        @method saveStatement
        @param {TinCan.Statement} statement to send
        @param {Object} [cfg] Configuration used when saving
            @param {Function} [cfg.callback] Callback to execute on completion
        */
        saveStatement: function (stmt, cfg) {
            this.log("saveStatement");
            var requestCfg = {
                    url: "statements",
                    headers: {}
                },
                versionedStatement,
                requestAttachments = [],
                boundary,
                i;

            cfg = cfg || {};

            try {
                versionedStatement = stmt.asVersion( this.version );
            }
            catch (ex) {
                if (this.allowFail) {
                    this.log("[warning] statement could not be serialized in version (" + this.version + "): " + ex);
                    if (typeof cfg.callback !== "undefined") {
                        cfg.callback(null, null);
                        return;
                    }
                    return {
                        err: null,
                        xhr: null
                    };
                }

                this.log("[error] statement could not be serialized in version (" + this.version + "): " + ex);
                if (typeof cfg.callback !== "undefined") {
                    cfg.callback(ex, null);
                    return;
                }
                return {
                    err: ex,
                    xhr: null
                };
            }

            if (versionedStatement.hasOwnProperty("attachments") && stmt.hasAttachmentWithContent()) {
                boundary = this._getBoundary();

                requestCfg.headers["Content-Type"] = "multipart/mixed; boundary=" + boundary;

                for (i = 0; i < stmt.attachments.length; i += 1) {
                    if (stmt.attachments[i].content !== null) {
                        requestAttachments.push(stmt.attachments[i]);
                    }
                }

                try {
                    requestCfg.data = this._getMultipartRequestData(boundary, versionedStatement, requestAttachments);
                }
                catch (ex) {
                    if (this.allowFail) {
                        this.log("[warning] multipart request data could not be created (attachments probably not supported): " + ex);
                        if (typeof cfg.callback !== "undefined") {
                            cfg.callback(null, null);
                            return;
                        }
                        return {
                            err: null,
                            xhr: null
                        };
                    }

                    this.log("[error] multipart request data could not be created (attachments probably not supported): " + ex);
                    if (typeof cfg.callback !== "undefined") {
                        cfg.callback(ex, null);
                        return;
                    }
                    return {
                        err: ex,
                        xhr: null
                    };
                }
            }
            else {
                requestCfg.headers["Content-Type"] = "application/json";
                requestCfg.data = JSON.stringify(versionedStatement);
            }
            if (stmt.id !== null) {
                requestCfg.method = "PUT";
                requestCfg.params = {
                    statementId: stmt.id
                };
            }
            else {
                requestCfg.method = "POST";
            }

            if (typeof cfg.callback !== "undefined") {
                requestCfg.callback = cfg.callback;
            }

            return this.sendRequest(requestCfg);
        },

        /**
        Retrieve a statement, when used from a browser sends to the endpoint using the RESTful interface.

        @method retrieveStatement
        @param {String} ID of statement to retrieve
        @param {Object} [cfg] Configuration options
            @param {Object} [cfg.params] Query parameters
                @param {Boolean} [cfg.params.attachments] Include attachments in multipart response or don't (default: false)
            @param {Function} [cfg.callback] Callback to execute on completion
        @return {TinCan.Statement} Statement retrieved
        */
        retrieveStatement: function (stmtId, cfg) {
            this.log("retrieveStatement");
            var requestCfg,
                requestResult,
                callbackWrapper,
                lrs = this;

            cfg = cfg || {};
            cfg.params = cfg.params || {};

            requestCfg = {
                url: "statements",
                method: "GET",
                params: {
                    statementId: stmtId
                }
            };
            if (cfg.params.attachments) {
                requestCfg.params.attachments = true;
                requestCfg.expectMultipart = true;
            }
            if (typeof cfg.callback !== "undefined") {
                callbackWrapper = function (err, xhr) {
                    var result = xhr;

                    if (err === null) {
                        result = lrs._processGetStatementResult(xhr, cfg.params);
                    }

                    cfg.callback(err, result);
                };
                requestCfg.callback = callbackWrapper;
            }

            requestResult = this.sendRequest(requestCfg);
            if (! callbackWrapper) {
                requestResult.statement = null;
                if (requestResult.err === null) {
                    requestResult.statement = lrs._processGetStatementResult(requestResult.xhr, cfg.params);
                }
            }

            return requestResult;
        },

        /**
        Retrieve a voided statement, when used from a browser sends to the endpoint using the RESTful interface.

        @method retrieveVoidedStatement
        @param {String} ID of voided statement to retrieve
        @param {Object} [cfg] Configuration options
            @param {Object} [cfg.params] Query parameters
                @param {Boolean} [cfg.params.attachments] Include attachments in multipart response or don't (default: false)
            @param {Function} [cfg.callback] Callback to execute on completion
        @return {TinCan.Statement} Statement retrieved
        */
        retrieveVoidedStatement: function (stmtId, cfg) {
            this.log("retrieveVoidedStatement");
            var requestCfg,
                requestResult,
                callbackWrapper,
                lrs = this;

            cfg = cfg || {};
            cfg.params = cfg.params || {};

            requestCfg = {
                url: "statements",
                method: "GET",
                params: {}
            };
            if (this.version === "0.9" || this.version === "0.95") {
                requestCfg.params.statementId = stmtId;
            }
            else {
                requestCfg.params.voidedStatementId = stmtId;
                if (cfg.params.attachments) {
                    requestCfg.params.attachments = true;
                    requestCfg.expectMultipart = true;
                }
            }

            if (typeof cfg.callback !== "undefined") {
                callbackWrapper = function (err, xhr) {
                    var result = xhr;

                    if (err === null) {
                        result = lrs._processGetStatementResult(xhr, cfg.params);
                    }

                    cfg.callback(err, result);
                };
                requestCfg.callback = callbackWrapper;
            }

            requestResult = this.sendRequest(requestCfg);
            if (! callbackWrapper) {
                requestResult.statement = null;
                if (requestResult.err === null) {
                    requestResult.statement = lrs._processGetStatementResult(requestResult.xhr, cfg.params);
                }
            }

            return requestResult;
        },

        /**
        Save a set of statements, when used from a browser sends to the endpoint using the RESTful interface.
        Use a callback to make the call asynchronous.

        @method saveStatements
        @param {Array} Array of statements or objects convertable to statements
        @param {Object} [cfg] Configuration used when saving
            @param {Function} [cfg.callback] Callback to execute on completion
        */
        saveStatements: function (stmts, cfg) {
            this.log("saveStatements");
            var requestCfg = {
                    url: "statements",
                    method: "POST",
                    headers: {}
                },
                versionedStatement,
                versionedStatements = [],
                requestAttachments = [],
                boundary,
                i,
                j;

            cfg = cfg || {};

            if (stmts.length === 0) {
                if (typeof cfg.callback !== "undefined") {
                    cfg.callback(new Error("no statements"), null);
                    return;
                }
                return {
                    err: new Error("no statements"),
                    xhr: null
                };
            }

            for (i = 0; i < stmts.length; i += 1) {
                try {
                    versionedStatement = stmts[i].asVersion( this.version );
                }
                catch (ex) {
                    if (this.allowFail) {
                        this.log("[warning] statement could not be serialized in version (" + this.version + "): " + ex);
                        if (typeof cfg.callback !== "undefined") {
                            cfg.callback(null, null);
                            return;
                        }
                        return {
                            err: null,
                            xhr: null
                        };
                    }

                    this.log("[error] statement could not be serialized in version (" + this.version + "): " + ex);
                    if (typeof cfg.callback !== "undefined") {
                        cfg.callback(ex, null);
                        return;
                    }
                    return {
                        err: ex,
                        xhr: null
                    };
                }

                if (stmts[i].hasAttachmentWithContent()) {
                    for (j = 0; j < stmts[i].attachments.length; j += 1) {
                        if (stmts[i].attachments[j].content !== null) {
                            requestAttachments.push(stmts[i].attachments[j]);
                        }
                    }
                }

                versionedStatements.push(versionedStatement);
            }

            if (requestAttachments.length !== 0) {
                boundary = this._getBoundary();

                requestCfg.headers["Content-Type"] = "multipart/mixed; boundary=" + boundary;

                try {
                    requestCfg.data = this._getMultipartRequestData(boundary, versionedStatements, requestAttachments);
                }
                catch (ex) {
                    if (this.allowFail) {
                        this.log("[warning] multipart request data could not be created (attachments probably not supported): " + ex);
                        if (typeof cfg.callback !== "undefined") {
                            cfg.callback(null, null);
                            return;
                        }
                        return {
                            err: null,
                            xhr: null
                        };
                    }

                    this.log("[error] multipart request data could not be created (attachments probably not supported): " + ex);
                    if (typeof cfg.callback !== "undefined") {
                        cfg.callback(ex, null);
                        return;
                    }
                    return {
                        err: ex,
                        xhr: null
                    };
                }
            }
            else {
                requestCfg.headers["Content-Type"] = "application/json";
                requestCfg.data = JSON.stringify(versionedStatements);
            }

            if (typeof cfg.callback !== "undefined") {
                requestCfg.callback = cfg.callback;
            }

            return this.sendRequest(requestCfg);
        },

        /**
        Fetch a set of statements, when used from a browser sends to the endpoint using the
        RESTful interface.  Use a callback to make the call asynchronous.

        @method queryStatements
        @param {Object} [cfg] Configuration used to query
            @param {Object} [cfg.params] Query parameters
                @param {TinCan.Agent|TinCan.Group} [cfg.params.agent] Agent matches 'actor' or 'object'
                @param {TinCan.Verb|String} [cfg.params.verb] Verb (or verb ID) to query on
                @param {TinCan.Activity|String} [cfg.params.activity] Activity (or activity ID) to query on
                @param {String} [cfg.params.registration] Registration UUID
                @param {Boolean} [cfg.params.related_activities] Match related activities
                @param {Boolean} [cfg.params.related_agents] Match related agents
                @param {String} [cfg.params.since] Match statements stored since specified timestamp
                @param {String} [cfg.params.until] Match statements stored at or before specified timestamp
                @param {Integer} [cfg.params.limit] Number of results to retrieve
                @param {String} [cfg.params.format] One of "ids", "exact", "canonical" (default: "exact")
                @param {Boolean} [cfg.params.ascending] Return results in ascending order of stored time

                @param {TinCan.Agent} [cfg.params.actor] (Removed in 1.0.0, use 'agent' instead) Agent matches 'actor'
                @param {TinCan.Activity|TinCan.Agent|TinCan.Statement} [cfg.params.target] (Removed in 1.0.0, use 'activity' or 'agent' instead) Activity, Agent, or Statement matches 'object'
                @param {TinCan.Agent} [cfg.params.instructor] (Removed in 1.0.0, use 'agent' + 'related_agents' instead) Agent matches 'context:instructor'
                @param {Boolean} [cfg.params.context] (Removed in 1.0.0, use 'activity' instead) When filtering on target, include statements with matching context
                @param {Boolean} [cfg.params.authoritative] (Removed in 1.0.0) Get authoritative results
                @param {Boolean} [cfg.params.sparse] (Removed in 1.0.0, use 'format' instead) Get sparse results

            @param {Function} [cfg.callback] Callback to execute on completion
                @param {String|null} cfg.callback.err Error status or null if succcess
                @param {TinCan.StatementsResult|XHR} cfg.callback.response Receives a StatementsResult argument
        @return {Object} Request result
        */
        queryStatements: function (cfg) {
            this.log("queryStatements");
            var requestCfg,
                requestResult,
                callbackWrapper,
                lrs = this;

            cfg = cfg || {};
            cfg.params = cfg.params || {};

            //
            // if they misconfigured (possibly due to version mismatches) the
            // query then don't try to send a request at all, rather than give
            // them invalid results
            //
            try {
                requestCfg = this._queryStatementsRequestCfg(cfg);

                if (cfg.params.attachments) {
                    requestCfg.expectMultipart = true;
                }
            }
            catch (ex) {
                this.log("[error] Query statements failed - " + ex);
                if (typeof cfg.callback !== "undefined") {
                    cfg.callback(ex, {});
                }

                return {
                    err: ex,
                    statementsResult: null
                };
            }

            if (typeof cfg.callback !== "undefined") {
                callbackWrapper = function (err, xhr) {
                    var result = xhr,
                        parsedResponse,
                        boundary,
                        statements,
                        attachmentMap = {},
                        i;

                    if (err === null) {
                        if (! cfg.params.attachments) {
                            result = TinCan.StatementsResult.fromJSON(xhr.responseText);
                        }
                        else {
                            boundary = xhr.getResponseHeader("Content-Type").split("boundary=")[1];

                            parsedResponse = lrs._parseMultipart(boundary, xhr.response);
                            statements = JSON.parse(parsedResponse[0].body);
                            for (i = 1; i < parsedResponse.length; i += 1) {
                                attachmentMap[parsedResponse[i].headers["X-Experience-API-Hash"]] = parsedResponse[i].body;
                            }

                            lrs._assignAttachmentContent(statements.statements, attachmentMap);
                            result = new TinCan.StatementsResult({ statements: statements.statements });

                            for (i = 0; i < result.statements.length; i += 1) {
                                if (! (result.statements[i] instanceof TinCan.Statement)) {
                                    result.statements[i] = new TinCan.Statement(result.statements[i]);
                                }
                            }
                        }
                    }

                    cfg.callback(err, result);
                };
                requestCfg.callback = callbackWrapper;
            }

            requestResult = this.sendRequest(requestCfg);
            requestResult.config = requestCfg;

            if (! callbackWrapper) {
                requestResult.statementsResult = null;
                if (requestResult.err === null) {
                    requestResult.statementsResult = TinCan.StatementsResult.fromJSON(requestResult.xhr.responseText);
                }
            }

            return requestResult;
        },

        /**
        Build a request config object that can be passed to sendRequest() to make a query request

        @method _queryStatementsRequestCfg
        @private
        @param {Object} [cfg] See configuration for {{#crossLink "TinCan.LRS/queryStatements"}}{{/crossLink}}
        @return {Object} Request configuration object
        */
        _queryStatementsRequestCfg: function (cfg) {
            this.log("_queryStatementsRequestCfg");
            var params = {},
                returnCfg = {
                    url: "statements",
                    method: "GET",
                    params: params
                },
                jsonProps = [
                    "agent",
                    "actor",
                    "object",
                    "instructor"
                ],
                idProps = [
                    "verb",
                    "activity"
                ],
                valProps = [
                    "registration",
                    "context",
                    "since",
                    "until",
                    "limit",
                    "authoritative",
                    "sparse",
                    "ascending",
                    "related_activities",
                    "related_agents",
                    "format",
                    "attachments"
                ],
                i,
                prop,
                //
                // list of parameters that are supported in all versions (supported by
                // this library) of the spec
                //
                universal = {
                    verb: true,
                    registration: true,
                    since: true,
                    until: true,
                    limit: true,
                    ascending: true
                },
                //
                // future proofing here, "supported" is an object so that
                // in the future we can support a "deprecated" list to
                // throw warnings, hopefully the spec uses deprecation phases
                // for the removal of these things
                //
                compatibility = {
                    "0.9": {
                        supported: {
                            actor: true,
                            instructor: true,
                            target: true,
                            object: true,
                            context: true,
                            authoritative: true,
                            sparse: true
                        }
                    },
                    "1.0.0": {
                        supported: {
                            agent: true,
                            activity: true,
                            related_activities: true,
                            related_agents: true,
                            format: true,
                            attachments: true
                        }
                    }
                };

            compatibility["0.95"] = compatibility["0.9"];
            compatibility["1.0.1"] = compatibility["1.0.0"];
            compatibility["1.0.2"] = compatibility["1.0.0"];

            if (cfg.params.hasOwnProperty("target")) {
                cfg.params.object = cfg.params.target;
            }

            //
            // check compatibility tables, either the configured parameter is in
            // the universal list or the specific version, if not then throw an
            // error which at least for .queryStatements will prevent the request
            // and potentially alert the user
            //
            for (prop in cfg.params) {
                if (cfg.params.hasOwnProperty(prop)) {
                    if (typeof universal[prop] === "undefined" && typeof compatibility[this.version].supported[prop] === "undefined") {
                        throw "Unrecognized query parameter configured: " + prop;
                    }
                }
            }

            //
            // getting here means that all parameters are valid for this version
            // to make handling the output formats easier
            //

            for (i = 0; i < jsonProps.length; i += 1) {
                if (typeof cfg.params[jsonProps[i]] !== "undefined") {
                    params[jsonProps[i]] = JSON.stringify(cfg.params[jsonProps[i]].asVersion(this.version));
                }
            }

            for (i = 0; i < idProps.length; i += 1) {
                if (typeof cfg.params[idProps[i]] !== "undefined") {
                    if (typeof cfg.params[idProps[i]].id === "undefined") {
                        params[idProps[i]] = cfg.params[idProps[i]];
                    }
                    else {
                        params[idProps[i]] = cfg.params[idProps[i]].id;
                    }
                }
            }

            for (i = 0; i < valProps.length; i += 1) {
                if (typeof cfg.params[valProps[i]] !== "undefined" && cfg.params[valProps[i]] !== null) {
                    params[valProps[i]] = cfg.params[valProps[i]];
                }
            }

            return returnCfg;
        },

        /**
        Assigns attachment content to the correct attachment to create a StatementsResult object that is sent
        to the callback of queryStatements()

        @method _assignAttachmentContent
        @private
        @param {Array} [stmts] Array of TinCan.Statement JSON objects
        @param {Object} [attachmentMap] Map of the content to place into its attachment
        @return {Array} Array of TinCan.Statement JSON objects with correctly assigned attachment content
        */
        _assignAttachmentContent: function (stmts, attachmentMap) {
            var i,
                j;

            for (i = 0; i < stmts.length; i += 1) {
                if (stmts[i].hasOwnProperty("attachments") && stmts[i].attachments !== null) {
                    for (j = 0; j < stmts[i].attachments.length; j += 1) {
                        if (attachmentMap.hasOwnProperty(stmts[i].attachments[j].sha2)) {
                            stmts[i].attachments[j].content = attachmentMap[stmts[i].attachments[j].sha2];
                        }
                    }
                }
            }
        },

        /**
        Parses the different sections of a multipart/mixed response

        @method _parseMultipart
        @private
        @param {String} [boundary] Boundary used to mark off the sections of the response
        @param {ArrayBuffer} [response] Body of the response
        @return {Array} Array of objects containing the parsed headers and body of each part
        */
        _parseMultipart: function (boundary, response) {
            /* global Uint8Array */
            var __boundary = "--" + boundary,
                byteArray,
                bodyEncodedInString,
                fullBodyEnd,
                sliceStart,
                sliceEnd,
                headerStart,
                headerEnd,
                bodyStart,
                bodyEnd,
                headers,
                body,
                parts = [],
                CRLF = 2;

            //
            // treating the reponse as a stream of bytes and assuming that headers
            // and related mime boundaries are all US-ASCII (which is a safe assumption)
            // allows us to treat the whole response as a string when looking for offsets
            // but then slice on the raw array buffer
            //
            byteArray = new Uint8Array(response);
            bodyEncodedInString = this.__uint8ToString(byteArray);

            fullBodyEnd = bodyEncodedInString.indexOf(__boundary + "--");

            sliceStart = bodyEncodedInString.indexOf(__boundary);
            while (sliceStart !== -1) {
                sliceEnd = bodyEncodedInString.indexOf(__boundary, sliceStart + __boundary.length);

                headerStart = sliceStart + __boundary.length + CRLF;
                headerEnd = bodyEncodedInString.indexOf("\r\n\r\n", sliceStart);
                bodyStart = headerEnd + CRLF + CRLF;
                bodyEnd = sliceEnd - 2;

                headers = this._parseHeaders(
                    this.__uint8ToString(
                        new Uint8Array( response.slice(headerStart, headerEnd) )
                    )
                );
                body = response.slice(bodyStart, bodyEnd);

                //
                // we know the first slice is the statement, and we know it is a string in UTF-8 (spec requirement)
                //
                if (parts.length === 0) {
                    body = TinCan.Utils.stringFromArrayBuffer(body);
                }

                parts.push(
                    {
                        headers: headers,
                        body: body
                    }
                );

                if (sliceEnd === fullBodyEnd) {
                    sliceStart = -1;
                }
                else {
                    sliceStart = sliceEnd;
                }
            }

            return parts;
        },

        //
        // implemented as a function to avoid 'RangeError: Maximum call stack size exceeded'
        // when calling .fromCharCode on the full byteArray which results in a too long
        // argument list for large arrays
        //
        __uint8ToString: function (byteArray) {
            var result = "",
                len = byteArray.byteLength,
                i;

            for (i = 0; i < len; i += 1) {
                result += String.fromCharCode(byteArray[i]);
            }
            return result;
        },

        /**
        Parses the headers of a multipart/mixed response section

        @method _parseHeaders
        @private
        @param {String} [rawHeaders] String containing all the headers
        @return {Object} Map of the headers
        */
        _parseHeaders: function (rawHeaders) {
            var headers = {},
                headerList,
                key,
                h,
                i;

            headerList = rawHeaders.split("\n");
            for (i = 0; i < headerList.length; i += 1) {
                h = headerList[i].split(":", 2);

                if (h[1] !== null) {
                    headers[h[0]] = h[1].replace(/^\s+|\s+$/g, "");

                    key = h[0];
                }
                else {
                    if (h[0].substring(0, 1) === "\t") {
                        headers[h[0]] = h[1].replace(/^\s+|\s+$/g, "");
                    }
                }
            }

            return headers;
        },

        /**
        Fetch more statements from a previous query, when used from a browser sends to the endpoint using the
        RESTful interface.  Use a callback to make the call asynchronous.

        @method moreStatements
        @param {Object} [cfg] Configuration used to query
            @param {String} [cfg.url] More URL
            @param {Function} [cfg.callback] Callback to execute on completion
                @param {String|null} cfg.callback.err Error status or null if succcess
                @param {TinCan.StatementsResult|XHR} cfg.callback.response Receives a StatementsResult argument
        @return {Object} Request result
        */
        moreStatements: function (cfg) {
            this.log("moreStatements: " + cfg.url);
            var requestCfg,
                requestResult,
                callbackWrapper,
                parsedURL,
                serverRoot;

            cfg = cfg || {};

            // to support our interface (to support IE) we need to break apart
            // the more URL query params so that the request can be made properly later
            parsedURL = TinCan.Utils.parseURL(cfg.url, { allowRelative: true });

            // Respect a more URL that is relative to either the server root
            // or endpoint (though only the former is allowed in the spec)
            serverRoot = TinCan.Utils.getServerRoot(this.endpoint);
            if (parsedURL.path.indexOf("/statements") === 0){
                parsedURL.path = this.endpoint.replace(serverRoot, "") + parsedURL.path;
                this.log("converting non-standard more URL to " + parsedURL.path);
            }

            // The more relative URL might not start with a slash, add it if not
            if (parsedURL.path.indexOf("/") !== 0) {
                parsedURL.path = "/" + parsedURL.path;
            }

            requestCfg = {
                method: "GET",
                // For arbitrary more URLs to work, we need to make the URL absolute here
                url: serverRoot + parsedURL.path,
                params: parsedURL.params
            };
            if (typeof cfg.callback !== "undefined") {
                callbackWrapper = function (err, xhr) {
                    var result = xhr;

                    if (err === null) {
                        result = TinCan.StatementsResult.fromJSON(xhr.responseText);
                    }

                    cfg.callback(err, result);
                };
                requestCfg.callback = callbackWrapper;
            }

            requestResult = this.sendRequest(requestCfg);
            requestResult.config = requestCfg;

            if (! callbackWrapper) {
                requestResult.statementsResult = null;
                if (requestResult.err === null) {
                    requestResult.statementsResult = TinCan.StatementsResult.fromJSON(requestResult.xhr.responseText);
                }
            }

            return requestResult;
        },

        /**
        Retrieve a state value, when used from a browser sends to the endpoint using the RESTful interface.

        @method retrieveState
        @param {String} key Key of state to retrieve
        @param {Object} cfg Configuration options
            @param {TinCan.Activity} cfg.activity Activity in document identifier
            @param {TinCan.Agent} cfg.agent Agent in document identifier
            @param {String} [cfg.registration] Registration
            @param {Function} [cfg.callback] Callback to execute on completion
                @param {Object|Null} cfg.callback.error
                @param {TinCan.State|null} cfg.callback.result null if state is 404
            @param {Object} [cfg.requestHeaders] Object containing additional headers to add to request
        @return {TinCan.State|Object} TinCan.State retrieved when synchronous, or result from sendRequest
        */
        retrieveState: function (key, cfg) {
            this.log("retrieveState");
            var requestParams = {},
                requestCfg = {},
                requestResult,
                callbackWrapper,
                requestHeaders,
                self = this;

            requestHeaders = cfg.requestHeaders || {};

            requestParams = {
                stateId: key,
                activityId: cfg.activity.id
            };
            if (this.version === "0.9") {
                requestParams.actor = JSON.stringify(cfg.agent.asVersion(this.version));
            }
            else {
                requestParams.agent = JSON.stringify(cfg.agent.asVersion(this.version));
            }
            if ((typeof cfg.registration !== "undefined") && (cfg.registration !== null)) {
                if (this.version === "0.9") {
                    requestParams.registrationId = cfg.registration;
                }
                else {
                    requestParams.registration = cfg.registration;
                }
            }

            requestCfg = {
                url: "activities/state",
                method: "GET",
                params: requestParams,
                ignore404: true,
                headers: requestHeaders
            };

            if (typeof cfg.callback !== "undefined") {
                callbackWrapper = function (err, xhr) {
                    var result = xhr;

                    if (err === null) {
                        if (xhr.status === 404) {
                            result = null;
                        }
                        else {
                            result = new TinCan.State(
                                {
                                    id: key,
                                    contents: xhr.responseText
                                }
                            );
                            if (typeof xhr.getResponseHeader !== "undefined" && xhr.getResponseHeader("ETag") !== null && xhr.getResponseHeader("ETag") !== "") {
                                result.etag = xhr.getResponseHeader("ETag");
                            }
                            else {
                                //
                                // either XHR didn't have getResponseHeader (probably cause it is an IE
                                // XDomainRequest object which doesn't) or not populated by LRS so create
                                // the hash ourselves
                                //
                                // the LRS is responsible for quoting the Etag value so we need to mimic
                                // that behavior here as well
                                //
                                result.etag = "\"" + TinCan.Utils.getSHA1String(xhr.responseText) + "\"";
                            }

                            if (typeof xhr.contentType !== "undefined") {
                                // most likely an XDomainRequest which has .contentType,
                                // for the ones that it supports
                                result.contentType = xhr.contentType;
                            }
                            else if (typeof xhr.getResponseHeader !== "undefined" && xhr.getResponseHeader("Content-Type") !== null && xhr.getResponseHeader("Content-Type") !== "") {
                                result.contentType = xhr.getResponseHeader("Content-Type");
                            }

                            if (TinCan.Utils.isApplicationJSON(result.contentType)) {
                                try {
                                    result.contents = JSON.parse(result.contents);
                                } catch (ex) {
                                    self.log("retrieveState - failed to deserialize JSON: " + ex);
                                }
                            }
                        }
                    }

                    cfg.callback(err, result);
                };
                requestCfg.callback = callbackWrapper;
            }

            requestResult = this.sendRequest(requestCfg);
            if (! callbackWrapper) {
                requestResult.state = null;
                if (requestResult.err === null && requestResult.xhr.status !== 404) {
                    requestResult.state = new TinCan.State(
                        {
                            id: key,
                            contents: requestResult.xhr.responseText
                        }
                    );
                    if (typeof requestResult.xhr.getResponseHeader !== "undefined" && requestResult.xhr.getResponseHeader("ETag") !== null && requestResult.xhr.getResponseHeader("ETag") !== "") {
                        requestResult.state.etag = requestResult.xhr.getResponseHeader("ETag");
                    }
                    else {
                        //
                        // either XHR didn't have getResponseHeader (probably cause it is an IE
                        // XDomainRequest object which doesn't) or not populated by LRS so create
                        // the hash ourselves
                        //
                        // the LRS is responsible for quoting the Etag value so we need to mimic
                        // that behavior here as well
                        //
                        requestResult.state.etag = "\"" + TinCan.Utils.getSHA1String(requestResult.xhr.responseText) + "\"";
                    }
                    if (typeof requestResult.xhr.contentType !== "undefined") {
                        // most likely an XDomainRequest which has .contentType
                        // for the ones that it supports
                        requestResult.state.contentType = requestResult.xhr.contentType;
                    }
                    else if (typeof requestResult.xhr.getResponseHeader !== "undefined" && requestResult.xhr.getResponseHeader("Content-Type") !== null && requestResult.xhr.getResponseHeader("Content-Type") !== "") {
                        requestResult.state.contentType = requestResult.xhr.getResponseHeader("Content-Type");
                    }
                    if (TinCan.Utils.isApplicationJSON(requestResult.state.contentType)) {
                        try {
                            requestResult.state.contents = JSON.parse(requestResult.state.contents);
                        } catch (ex) {
                            this.log("retrieveState - failed to deserialize JSON: " + ex);
                        }
                    }
                }
            }

            return requestResult;
        },

        /**
        Retrieve the list of IDs for a state, when used from a browser sends to the endpoint using the RESTful interface.

        @method retrieveStateIds
        @param {Object} cfg Configuration options
            @param {TinCan.Activity} cfg.activity Activity in document identifier
            @param {TinCan.Agent} cfg.agent Agent in document identifier
            @param {String} [cfg.registration] Registration
            @param {Function} [cfg.callback] Callback to execute on completion
            @param {String} [cfg.since] Match activity profiles saved since given timestamp
            @param {Object} [cfg.requestHeaders] Optional object containing additional headers to add to request
        @return {Object} requestResult Request result
        */
        retrieveStateIds: function (cfg) {
            this.log("retrieveStateIds");
            var requestParams = {},
                requestCfg,
                requestHeaders,
                requestResult,
                callbackWrapper;

            cfg = cfg || {};
            requestHeaders = cfg.requestHeaders || {};

            requestParams.activityId = cfg.activity.id;
            if (this.version === "0.9") {
                requestParams.actor = JSON.stringify(cfg.agent.asVersion(this.version));
            }
            else {
                requestParams.agent = JSON.stringify(cfg.agent.asVersion(this.version));
            }
            if ((typeof cfg.registration !== "undefined") && (cfg.registration !== null)) {
                if (this.version === "0.9") {
                    requestParams.registrationId = cfg.registration;
                }
                else {
                    requestParams.registration = cfg.registration;
                }
            }

            requestCfg = {
                url: "activities/state",
                method: "GET",
                params: requestParams,
                headers: requestHeaders,
                ignore404: true
            };
            if (typeof cfg.callback !== "undefined") {
                callbackWrapper = function (err, xhr) {
                    var result = xhr;

                    if (err !== null) {
                        cfg.callback(err, result);
                        return;
                    }

                    if (xhr.status === 404) {
                        result = [];
                    }
                    else {
                        try {
                            result = JSON.parse(xhr.responseText);
                        }
                        catch (ex) {
                            err = "Response JSON parse error: " + ex;
                        }
                    }

                    cfg.callback(err, result);
                };
                requestCfg.callback = callbackWrapper;
            }
            if (typeof cfg.since !== "undefined") {
                requestCfg.params.since = cfg.since;
            }

            requestResult = this.sendRequest(requestCfg);
            if (! callbackWrapper) {
                requestResult.profileIds = null;
                if (requestResult.err !== null) {
                    return requestResult;
                }

                if (requestResult.xhr.status === 404) {
                    requestResult.profileIds = [];
                }
                else {
                    try {
                        requestResult.profileIds = JSON.parse(requestResult.xhr.responseText);
                    }
                    catch (ex) {
                        requestResult.err = "retrieveStateIds - JSON parse error: " + ex;
                    }
                }
            }
            return requestResult;
        },

        /**
        Save a state value, when used from a browser sends to the endpoint using the RESTful interface.

        @method saveState
        @param {String} key Key of state to save
        @param val Value to be stored
        @param {Object} cfg Configuration options
            @param {TinCan.Activity} cfg.activity Activity in document identifier
            @param {TinCan.Agent} cfg.agent Agent in document identifier
            @param {String} [cfg.registration] Registration
            @param {String} [cfg.lastSHA1] SHA1 of the previously seen existing state
            @param {String} [cfg.contentType] Content-Type to specify in headers (defaults to 'application/octet-stream')
            @param {String} [cfg.method] Method to use. Default: PUT
            @param {Function} [cfg.callback] Callback to execute on completion
            @param {Object} [cfg.requestHeaders] Optional object containing additional headers to add to request
        */
        saveState: function (key, val, cfg) {
            this.log("saveState");
            var requestParams,
                requestCfg,
                requestHeaders;

            requestHeaders = cfg.requestHeaders || {};

            if (typeof cfg.contentType === "undefined") {
                cfg.contentType = "application/octet-stream";
            }
            requestHeaders["Content-Type"] = cfg.contentType;

            if (typeof val === "object" && TinCan.Utils.isApplicationJSON(cfg.contentType)) {
                val = JSON.stringify(val);
            }

            if (typeof cfg.method === "undefined" || cfg.method !== "POST") {
                cfg.method = "PUT";
            }

            requestParams = {
                stateId: key,
                activityId: cfg.activity.id
            };
            if (this.version === "0.9") {
                requestParams.actor = JSON.stringify(cfg.agent.asVersion(this.version));
            }
            else {
                requestParams.agent = JSON.stringify(cfg.agent.asVersion(this.version));
            }
            if ((typeof cfg.registration !== "undefined") && (cfg.registration !== null)) {
                if (this.version === "0.9") {
                    requestParams.registrationId = cfg.registration;
                }
                else {
                    requestParams.registration = cfg.registration;
                }
            }

            requestCfg = {
                url: "activities/state",
                method: cfg.method,
                params: requestParams,
                data: val,
                headers: requestHeaders
            };

            if (typeof cfg.callback !== "undefined") {
                requestCfg.callback = cfg.callback;
            }
            if (typeof cfg.lastSHA1 !== "undefined" && cfg.lastSHA1 !== null) {
                requestCfg.headers["If-Match"] = cfg.lastSHA1;
            }

            return this.sendRequest(requestCfg);
        },

        /**
        Drop a state value or all of the state, when used from a browser sends to the endpoint using the RESTful interface.

        @method dropState
        @param {String|null} key Key of state to delete, or null for all
        @param {Object} cfg Configuration options
            @param {TinCan.Activity} cfg.activity Activity in document identifier
            @param {TinCan.Agent} cfg.agent Agent in document identifier
            @param {String} [cfg.registration] Registration
            @param {Function} [cfg.callback] Callback to execute on completion
            @param {Object} [cfg.requestHeaders] Optional object containing additional headers to add to request
        */
        dropState: function (key, cfg) {
            this.log("dropState");
            var requestParams,
                requestCfg,
                requestHeaders;

            requestHeaders = cfg.requestHeaders || {};

            requestParams = {
                activityId: cfg.activity.id
            };
            if (this.version === "0.9") {
                requestParams.actor = JSON.stringify(cfg.agent.asVersion(this.version));
            }
            else {
                requestParams.agent = JSON.stringify(cfg.agent.asVersion(this.version));
            }
            if (key !== null) {
                requestParams.stateId = key;
            }
            if ((typeof cfg.registration !== "undefined") && (cfg.registration !== null)) {
                if (this.version === "0.9") {
                    requestParams.registrationId = cfg.registration;
                }
                else {
                    requestParams.registration = cfg.registration;
                }
            }

            requestCfg = {
                url: "activities/state",
                method: "DELETE",
                params: requestParams,
                headers: requestHeaders
            };

            if (typeof cfg.callback !== "undefined") {
                requestCfg.callback = cfg.callback;
            }

            return this.sendRequest(requestCfg);
        },

        /**
        Retrieve an activity, when used from a browser sends to the endpoint using the RESTful interface.

        @method retrieveActivity
        @param {String} activityId id of the Activity to retrieve
        @param {Object} cfg Configuration options
            @param {Function} [cfg.callback] Callback to execute on completion
            @param {Object} [cfg.requestHeaders] Optional object containing additional headers to add to request
        @return {Object} Value retrieved
        */
        retrieveActivity: function (activityId, cfg) {
            this.log("retrieveActivity");
            var requestCfg = {},
                requestResult,
                callbackWrapper,
                requestHeaders;

            requestHeaders = cfg.requestHeaders || {};

            requestCfg = {
                url: "activities",
                method: "GET",
                params: {
                    activityId: activityId
                },
                ignore404: true,
                headers: requestHeaders
            };

            if (typeof cfg.callback !== "undefined") {
                callbackWrapper = function (err, xhr) {
                    var result = xhr;

                    if (err === null) {
                        //
                        // a 404 really shouldn't happen because the LRS can dynamically
                        // build the response based on what has been passed to it, but
                        // don't have the client fail in the condition that it does, because
                        // we can do the same thing
                        //
                        if (xhr.status === 404) {
                            result = new TinCan.Activity(
                                {
                                    id: activityId
                                }
                            );
                        }
                        else {
                            result = TinCan.Activity.fromJSON(xhr.responseText);
                        }
                    }

                    cfg.callback(err, result);
                };
                requestCfg.callback = callbackWrapper;
            }

            requestResult = this.sendRequest(requestCfg);
            if (! callbackWrapper) {
                requestResult.activity = null;
                if (requestResult.err === null) {
                    if (requestResult.xhr.status === 404) {
                        requestResult.activity = new TinCan.Activity(
                            {
                                id: activityId
                            }
                        );
                    }
                    else {
                        requestResult.activity = TinCan.Activity.fromJSON(requestResult.xhr.responseText);
                    }
                }
            }

            return requestResult;
        },

        /**
        Retrieve an activity profile value, when used from a browser sends to the endpoint using the RESTful interface.

        @method retrieveActivityProfile
        @param {String} key Key of activity profile to retrieve
        @param {Object} cfg Configuration options
            @param {TinCan.Activity} cfg.activity Activity in document identifier
            @param {Function} [cfg.callback] Callback to execute on completion
            @param {Object} [cfg.requestHeaders] Optional object containing additional headers to add to request
        @return {Object} Value retrieved
        */
        retrieveActivityProfile: function (key, cfg) {
            this.log("retrieveActivityProfile");
            var requestCfg = {},
                requestResult,
                callbackWrapper,
                requestHeaders,
                self = this;

            requestHeaders = cfg.requestHeaders || {};

            requestCfg = {
                url: "activities/profile",
                method: "GET",
                params: {
                    profileId: key,
                    activityId: cfg.activity.id
                },
                ignore404: true,
                headers: requestHeaders
            };

            if (typeof cfg.callback !== "undefined") {
                callbackWrapper = function (err, xhr) {
                    var result = xhr;

                    if (err === null) {
                        if (xhr.status === 404) {
                            result = null;
                        }
                        else {
                            result = new TinCan.ActivityProfile(
                                {
                                    id: key,
                                    activity: cfg.activity,
                                    contents: xhr.responseText
                                }
                            );
                            if (typeof xhr.getResponseHeader !== "undefined" && xhr.getResponseHeader("ETag") !== null && xhr.getResponseHeader("ETag") !== "") {
                                result.etag = xhr.getResponseHeader("ETag");
                            }
                            else {
                                //
                                // either XHR didn't have getResponseHeader (probably cause it is an IE
                                // XDomainRequest object which doesn't) or not populated by LRS so create
                                // the hash ourselves
                                //
                                // the LRS is responsible for quoting the Etag value so we need to mimic
                                // that behavior here as well
                                //
                                result.etag = "\"" + TinCan.Utils.getSHA1String(xhr.responseText) + "\"";
                            }
                            if (typeof xhr.contentType !== "undefined") {
                                // most likely an XDomainRequest which has .contentType
                                // for the ones that it supports
                                result.contentType = xhr.contentType;
                            }
                            else if (typeof xhr.getResponseHeader !== "undefined" && xhr.getResponseHeader("Content-Type") !== null && xhr.getResponseHeader("Content-Type") !== "") {
                                result.contentType = xhr.getResponseHeader("Content-Type");
                            }
                            if (TinCan.Utils.isApplicationJSON(result.contentType)) {
                                try {
                                    result.contents = JSON.parse(result.contents);
                                } catch (ex) {
                                    self.log("retrieveActivityProfile - failed to deserialize JSON: " + ex);
                                }
                            }
                        }
                    }

                    cfg.callback(err, result);
                };
                requestCfg.callback = callbackWrapper;
            }

            requestResult = this.sendRequest(requestCfg);
            if (! callbackWrapper) {
                requestResult.profile = null;
                if (requestResult.err === null && requestResult.xhr.status !== 404) {
                    requestResult.profile = new TinCan.ActivityProfile(
                        {
                            id: key,
                            activity: cfg.activity,
                            contents: requestResult.xhr.responseText
                        }
                    );
                    if (typeof requestResult.xhr.getResponseHeader !== "undefined" && requestResult.xhr.getResponseHeader("ETag") !== null && requestResult.xhr.getResponseHeader("ETag") !== "") {
                        requestResult.profile.etag = requestResult.xhr.getResponseHeader("ETag");
                    }
                    else {
                        //
                        // either XHR didn't have getResponseHeader (probably cause it is an IE
                        // XDomainRequest object which doesn't) or not populated by LRS so create
                        // the hash ourselves
                        //
                        // the LRS is responsible for quoting the Etag value so we need to mimic
                        // that behavior here as well
                        //
                        requestResult.profile.etag = "\"" + TinCan.Utils.getSHA1String(requestResult.xhr.responseText) + "\"";
                    }
                    if (typeof requestResult.xhr.contentType !== "undefined") {
                        // most likely an XDomainRequest which has .contentType
                        // for the ones that it supports
                        requestResult.profile.contentType = requestResult.xhr.contentType;
                    }
                    else if (typeof requestResult.xhr.getResponseHeader !== "undefined" && requestResult.xhr.getResponseHeader("Content-Type") !== null && requestResult.xhr.getResponseHeader("Content-Type") !== "") {
                        requestResult.profile.contentType = requestResult.xhr.getResponseHeader("Content-Type");
                    }
                    if (TinCan.Utils.isApplicationJSON(requestResult.profile.contentType)) {
                        try {
                            requestResult.profile.contents = JSON.parse(requestResult.profile.contents);
                        } catch (ex) {
                            this.log("retrieveActivityProfile - failed to deserialize JSON: " + ex);
                        }
                    }
                }
            }

            return requestResult;
        },

        /**
        Retrieve the list of IDs for an activity profile, when used from a browser sends to the endpoint using the RESTful interface.

        @method retrieveActivityProfileIds
        @param {Object} cfg Configuration options
            @param {TinCan.Activity} cfg.activity Activity in document identifier
            @param {Function} [cfg.callback] Callback to execute on completion
            @param {String} [cfg.since] Match activity profiles saved since given timestamp
            @param {Object} [cfg.requestHeaders] Optional object containing additional headers to add to request
        @return {Array} List of ids for this Activity profile
        */
        retrieveActivityProfileIds: function (cfg) {
            this.log("retrieveActivityProfileIds");
            var requestCfg,
                requestHeaders,
                requestResult,
                callbackWrapper;

            cfg = cfg || {};
            requestHeaders = cfg.requestHeaders || {};

            requestCfg = {
                url: "activities/profile",
                method: "GET",
                params: {
                    activityId: cfg.activity.id
                },
                headers: requestHeaders,
                ignore404: true
            };
            if (typeof cfg.callback !== "undefined") {
                callbackWrapper = function (err, xhr) {
                    var result = xhr;

                    if (err !== null) {
                        cfg.callback(err, result);
                        return;
                    }

                    if (xhr.status === 404) {
                        result = [];
                    }
                    else {
                        try {
                            result = JSON.parse(xhr.responseText);
                        }
                        catch (ex) {
                            err = "Response JSON parse error: " + ex;
                        }
                    }

                    cfg.callback(err, result);
                };
                requestCfg.callback = callbackWrapper;
            }
            if (typeof cfg.since !== "undefined") {
                requestCfg.params.since = cfg.since;
            }

            requestResult = this.sendRequest(requestCfg);
            if (! callbackWrapper) {
                requestResult.profileIds = null;
                if (requestResult.err !== null) {
                    return requestResult;
                }

                if (requestResult.xhr.status === 404) {
                    requestResult.profileIds = [];
                }
                else {
                    try {
                        requestResult.profileIds = JSON.parse(requestResult.xhr.responseText);
                    }
                    catch (ex) {
                        requestResult.err = "retrieveActivityProfileIds - JSON parse error: " + ex;
                    }
                }
            }
            return requestResult;
        },

        /**
        Save an activity profile value, when used from a browser sends to the endpoint using the RESTful interface.

        @method saveActivityProfile
        @param {String} key Key of activity profile to retrieve
        @param val Value to be stored
        @param {Object} cfg Configuration options
            @param {TinCan.Activity} cfg.activity Activity in document identifier
            @param {String} [cfg.lastSHA1] SHA1 of the previously seen existing profile
            @param {String} [cfg.contentType] Content-Type to specify in headers (defaults to 'application/octet-stream')
            @param {String} [cfg.method] Method to use. Default: PUT
            @param {Function} [cfg.callback] Callback to execute on completion
            @param {Object} [cfg.requestHeaders] Optional object containing additional headers to add to request
        */
        saveActivityProfile: function (key, val, cfg) {
            this.log("saveActivityProfile");
            var requestCfg,
                requestHeaders;

            requestHeaders = cfg.requestHeaders || {};

            if (typeof cfg.contentType === "undefined") {
                cfg.contentType = "application/octet-stream";
            }
            requestHeaders["Content-Type"] = cfg.contentType;

            if (typeof cfg.method === "undefined" || cfg.method !== "POST") {
                cfg.method = "PUT";
            }

            if (typeof val === "object" && TinCan.Utils.isApplicationJSON(cfg.contentType)) {
                val = JSON.stringify(val);
            }

            requestCfg = {
                url: "activities/profile",
                method: cfg.method,
                params: {
                    profileId: key,
                    activityId: cfg.activity.id
                },
                data: val,
                headers: requestHeaders
            };

            if (typeof cfg.callback !== "undefined") {
                requestCfg.callback = cfg.callback;
            }
            if (typeof cfg.lastSHA1 !== "undefined" && cfg.lastSHA1 !== null) {
                requestCfg.headers["If-Match"] = cfg.lastSHA1;
            }
            else {
                requestCfg.headers["If-None-Match"] = "*";
            }

            return this.sendRequest(requestCfg);
        },

        /**
        Drop an activity profile value, when used from a browser sends to the endpoint using the RESTful interface. Full activity profile
        delete is not supported by the spec.

        @method dropActivityProfile
        @param {String|null} key Key of activity profile to delete
        @param {Object} cfg Configuration options
            @param {TinCan.Activity} cfg.activity Activity in document identifier
            @param {Function} [cfg.callback] Callback to execute on completion
            @param {Object} [cfg.requestHeaders] Optional object containing additional headers to add to request
        */
        dropActivityProfile: function (key, cfg) {
            this.log("dropActivityProfile");
            var requestParams,
                requestCfg,
                requestHeaders;

            requestHeaders = cfg.requestHeaders || {};

            requestParams = {
                profileId: key,
                activityId: cfg.activity.id
            };

            requestCfg = {
                url: "activities/profile",
                method: "DELETE",
                params: requestParams,
                headers: requestHeaders
            };

            if (typeof cfg.callback !== "undefined") {
                requestCfg.callback = cfg.callback;
            }

            return this.sendRequest(requestCfg);
        },

        /**
        Retrieve an agent profile value, when used from a browser sends to the endpoint using the RESTful interface.

        @method retrieveAgentProfile
        @param {String} key Key of agent profile to retrieve
        @param {Object} cfg Configuration options
            @param {TinCan.Agent} cfg.agent Agent in document identifier
            @param {Function} [cfg.callback] Callback to execute on completion
            @param {Object} [cfg.requestHeaders] Optional object containing additional headers to add to request
        @return {Object} Value retrieved
        */
        retrieveAgentProfile: function (key, cfg) {
            this.log("retrieveAgentProfile");
            var requestCfg = {},
                requestResult,
                callbackWrapper,
                requestHeaders,
                self = this;

            requestHeaders = cfg.requestHeaders || {};

            requestCfg = {
                method: "GET",
                params: {
                    profileId: key
                },
                ignore404: true,
                headers: requestHeaders
            };

            if (this.version === "0.9") {
                requestCfg.url = "actors/profile";
                requestCfg.params.actor = JSON.stringify(cfg.agent.asVersion(this.version));
            }
            else {
                requestCfg.url = "agents/profile";
                requestCfg.params.agent = JSON.stringify(cfg.agent.asVersion(this.version));
            }
            if (typeof cfg.callback !== "undefined") {
                callbackWrapper = function (err, xhr) {
                    var result = xhr;

                    if (err === null) {
                        if (xhr.status === 404) {
                            result = null;
                        }
                        else {
                            result = new TinCan.AgentProfile(
                                {
                                    id: key,
                                    agent: cfg.agent,
                                    contents: xhr.responseText
                                }
                            );
                            if (typeof xhr.getResponseHeader !== "undefined" && xhr.getResponseHeader("ETag") !== null && xhr.getResponseHeader("ETag") !== "") {
                                result.etag = xhr.getResponseHeader("ETag");
                            }
                            else {
                                //
                                // either XHR didn't have getResponseHeader (probably cause it is an IE
                                // XDomainRequest object which doesn't) or not populated by LRS so create
                                // the hash ourselves
                                //
                                // the LRS is responsible for quoting the Etag value so we need to mimic
                                // that behavior here as well
                                //
                                result.etag = "\"" + TinCan.Utils.getSHA1String(xhr.responseText) + "\"";
                            }
                            if (typeof xhr.contentType !== "undefined") {
                                // most likely an XDomainRequest which has .contentType
                                // for the ones that it supports
                                result.contentType = xhr.contentType;
                            }
                            else if (typeof xhr.getResponseHeader !== "undefined" && xhr.getResponseHeader("Content-Type") !== null && xhr.getResponseHeader("Content-Type") !== "") {
                                result.contentType = xhr.getResponseHeader("Content-Type");
                            }
                            if (TinCan.Utils.isApplicationJSON(result.contentType)) {
                                try {
                                    result.contents = JSON.parse(result.contents);
                                } catch (ex) {
                                    self.log("retrieveAgentProfile - failed to deserialize JSON: " + ex);
                                }
                            }
                        }
                    }

                    cfg.callback(err, result);
                };
                requestCfg.callback = callbackWrapper;
            }

            requestResult = this.sendRequest(requestCfg);
            if (! callbackWrapper) {
                requestResult.profile = null;
                if (requestResult.err === null && requestResult.xhr.status !== 404) {
                    requestResult.profile = new TinCan.AgentProfile(
                        {
                            id: key,
                            agent: cfg.agent,
                            contents: requestResult.xhr.responseText
                        }
                    );
                    if (typeof requestResult.xhr.getResponseHeader !== "undefined" && requestResult.xhr.getResponseHeader("ETag") !== null && requestResult.xhr.getResponseHeader("ETag") !== "") {
                        requestResult.profile.etag = requestResult.xhr.getResponseHeader("ETag");
                    }
                    else {
                        //
                        // either XHR didn't have getResponseHeader (probably cause it is an IE
                        // XDomainRequest object which doesn't) or not populated by LRS so create
                        // the hash ourselves
                        //
                        // the LRS is responsible for quoting the Etag value so we need to mimic
                        // that behavior here as well
                        //
                        requestResult.profile.etag = "\"" + TinCan.Utils.getSHA1String(requestResult.xhr.responseText) + "\"";
                    }
                    if (typeof requestResult.xhr.contentType !== "undefined") {
                        // most likely an XDomainRequest which has .contentType
                        // for the ones that it supports
                        requestResult.profile.contentType = requestResult.xhr.contentType;
                    }
                    else if (typeof requestResult.xhr.getResponseHeader !== "undefined" && requestResult.xhr.getResponseHeader("Content-Type") !== null && requestResult.xhr.getResponseHeader("Content-Type") !== "") {
                        requestResult.profile.contentType = requestResult.xhr.getResponseHeader("Content-Type");
                    }
                    if (TinCan.Utils.isApplicationJSON(requestResult.profile.contentType)) {
                        try {
                            requestResult.profile.contents = JSON.parse(requestResult.profile.contents);
                        } catch (ex) {
                            this.log("retrieveAgentProfile - failed to deserialize JSON: " + ex);
                        }
                    }
                }
            }

            return requestResult;
        },

        /**
        Retrieve the list of profileIds for an agent profile, when used from a browser sends to the endpoint using the RESTful interface.

        @method retrieveAgentProfileIds
        @param {Object} cfg Configuration options
            @param {TinCan.Agent} cfg.agent Agent in document identifier
            @param {Function} [cfg.callback] Callback to execute on completion
            @param {String} [cfg.since] Match activity profiles saved since given timestamp
            @param {Object} [cfg.requestHeaders] Optional object containing additional headers to add to request
        @return {Array} List of profileIds for this Agent

        */
        retrieveAgentProfileIds: function (cfg) {
            this.log("retrieveAgentProfileIds");
            var requestParams = {},
                requestCfg,
                requestHeaders,
                requestResult,
                callbackWrapper;

            cfg = cfg || {};
            requestHeaders = cfg.requestHeaders || {};

            requestCfg = {
                method: "GET",
                params: requestParams,
                headers: requestHeaders,
                ignore404: true
            };

            if (this.version === "0.9") {
                requestCfg.url = "actors/profile";
                requestParams.actor = JSON.stringify(cfg.agent.asVersion(this.version));
            }
            else {
                requestCfg.url = "agents/profile";
                requestParams.agent = JSON.stringify(cfg.agent.asVersion(this.version));
            }
            if (typeof cfg.callback !== "undefined") {
                callbackWrapper = function (err, xhr) {
                    var result = xhr;

                    if (err !== null) {
                        cfg.callback(err, result);
                        return;
                    }

                    if (xhr.status === 404) {
                        result = [];
                    }
                    else {
                        try {
                            result = JSON.parse(xhr.responseText);
                        }
                        catch (ex) {
                            err = "Response JSON parse error: " + ex;
                        }
                    }

                    cfg.callback(err, result);
                };
                requestCfg.callback = callbackWrapper;
            }
            if (typeof cfg.since !== "undefined") {
                requestCfg.params.since = cfg.since;
            }

            requestResult = this.sendRequest(requestCfg);
            if (! callbackWrapper) {
                requestResult.profileIds = null;
                if (requestResult.err !== null) {
                    return requestResult;
                }

                if (requestResult.xhr.status === 404) {
                    requestResult.profileIds = [];
                }
                else {
                    try {
                        requestResult.profileIds = JSON.parse(requestResult.xhr.responseText);
                    }
                    catch (ex) {
                        requestResult.err = "retrieveAgentProfileIds - JSON parse error: " + ex;
                    }
                }
            }
            return requestResult;
        },

        /**
        Save an agent profile value, when used from a browser sends to the endpoint using the RESTful interface.

        @method saveAgentProfile
        @param {String} key Key of agent profile to retrieve
        @param val Value to be stored
        @param {Object} cfg Configuration options
            @param {TinCan.Agent} cfg.agent Agent in document identifier
            @param {String} [cfg.lastSHA1] SHA1 of the previously seen existing profile
            @param {String} [cfg.contentType] Content-Type to specify in headers (defaults to 'application/octet-stream')
            @param {String} [cfg.method] Method to use. Default: PUT
            @param {Function} [cfg.callback] Callback to execute on completion
            @param {Object} [cfg.requestHeaders] Optional object containing additional headers to add to request
        */
        saveAgentProfile: function (key, val, cfg) {
            this.log("saveAgentProfile");
            var requestCfg,
                requestHeaders;

            requestHeaders = cfg.requestHeaders || {};

            if (typeof cfg.contentType === "undefined") {
                cfg.contentType = "application/octet-stream";
            }
            requestHeaders["Content-Type"] = cfg.contentType;

            if (typeof cfg.method === "undefined" || cfg.method !== "POST") {
                cfg.method = "PUT";
            }

            if (typeof val === "object" && TinCan.Utils.isApplicationJSON(cfg.contentType)) {
                val = JSON.stringify(val);
            }

            requestCfg = {
                method: cfg.method,
                params: {
                    profileId: key
                },
                data: val,
                headers: requestHeaders
            };

            if (this.version === "0.9") {
                requestCfg.url = "actors/profile";
                requestCfg.params.actor = JSON.stringify(cfg.agent.asVersion(this.version));
            }
            else {
                requestCfg.url = "agents/profile";
                requestCfg.params.agent = JSON.stringify(cfg.agent.asVersion(this.version));
            }
            if (typeof cfg.callback !== "undefined") {
                requestCfg.callback = cfg.callback;
            }
            if (typeof cfg.lastSHA1 !== "undefined" && cfg.lastSHA1 !== null) {
                requestCfg.headers["If-Match"] = cfg.lastSHA1;
            }
            else {
                requestCfg.headers["If-None-Match"] = "*";
            }

            return this.sendRequest(requestCfg);
        },

        /**
        Drop an agent profile value, when used from a browser sends to the endpoint using the RESTful interface. Full agent profile
        delete is not supported by the spec.

        @method dropAgentProfile
        @param {String|null} key Key of agent profile to delete
        @param {Object} cfg Configuration options
            @param {TinCan.Agent} cfg.agent Agent in document identifier
            @param {Function} [cfg.callback] Callback to execute on completion
            @param {Object} [cfg.requestHeaders] Optional object containing additional headers to add to request
        */
        dropAgentProfile: function (key, cfg) {
            this.log("dropAgentProfile");
            var requestParams,
                requestCfg,
                requestHeaders;

            requestHeaders = cfg.requestHeaders || {};

            requestParams = {
                profileId: key
            };
            requestCfg = {
                method: "DELETE",
                params: requestParams,
                headers: requestHeaders
            };

            if (this.version === "0.9") {
                requestCfg.url = "actors/profile";
                requestParams.actor = JSON.stringify(cfg.agent.asVersion(this.version));
            }
            else {
                requestCfg.url = "agents/profile";
                requestParams.agent = JSON.stringify(cfg.agent.asVersion(this.version));
            }
            if (typeof cfg.callback !== "undefined") {
                requestCfg.callback = cfg.callback;
            }

            return this.sendRequest(requestCfg);
        }
    };

    /**
    Allows client code to determine whether their environment supports synchronous xhr handling
    @static this is a static property, set by the environment
    */
    LRS.syncEnabled = null;
}());

/*
    Copyright 2012 Rustici Software

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/**
TinCan client library

@module TinCan
@submodule TinCan.AgentAccount
**/
(function () {
    "use strict";

    /**
    @class TinCan.AgentAccount
    @constructor
    */
    var AgentAccount = TinCan.AgentAccount = function (cfg) {
        this.log("constructor");

        /**
        @property homePage
        @type String
        */
        this.homePage = null;

        /**
        @property name
        @type String
        */
        this.name = null;

        this.init(cfg);
    };
    AgentAccount.prototype = {
        /**
        @property LOG_SRC
        */
        LOG_SRC: "AgentAccount",

        /**
        @method log
        */
        log: TinCan.prototype.log,

        /**
        @method init
        @param {Object} [options] Configuration used to initialize
        */
        init: function (cfg) {
            this.log("init");
            var i,
                directProps = [
                    "name",
                    "homePage"
                ];

            cfg = cfg || {};

            // handle .9 name changes
            if (typeof cfg.accountServiceHomePage !== "undefined") {
                cfg.homePage = cfg.accountServiceHomePage;
            }
            if (typeof cfg.accountName !== "undefined") {
                cfg.name = cfg.accountName;
            }

            for (i = 0; i < directProps.length; i += 1) {
                if (cfg.hasOwnProperty(directProps[i]) && cfg[directProps[i]] !== null) {
                    this[directProps[i]] = cfg[directProps[i]];
                }
            }
        },

        toString: function () {
            this.log("toString");
            var result = "";

            if (this.name !== null || this.homePage !== null) {
                result += this.name !== null ? this.name : "-";
                result += ":";
                result += this.homePage !== null ? this.homePage : "-";
            }
            else {
                result = "AgentAccount: unidentified";
            }

            return result;
        },

        /**
        @method asVersion
        @param {String} [version] Version to return (defaults to newest supported)
        */
        asVersion: function (version) {
            this.log("asVersion: " + version);
            var result = {};

            version = version || TinCan.versions()[0];

            if (version === "0.9") {
                result.accountName = this.name;
                result.accountServiceHomePage = this.homePage;
            } else {
                result.name = this.name;
                result.homePage = this.homePage;
            }

            return result;
        }
    };

    /**
    @method fromJSON
    @return {Object} AgentAccount
    @static
    */
    AgentAccount.fromJSON = function (acctJSON) {
        AgentAccount.prototype.log("fromJSON");
        var _acct = JSON.parse(acctJSON);

        return new AgentAccount(_acct);
    };
}());

/*
    Copyright 2012 Rustici Software

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/**
TinCan client library

@module TinCan
@submodule TinCan.Agent
**/
(function () {
    "use strict";

    /**
    @class TinCan.Agent
    @constructor
    */
    var Agent = TinCan.Agent = function (cfg) {
        this.log("constructor");

        /**
        @property name
        @type String
        */
        this.name = null;

        /**
        @property mbox
        @type String
        */
        this.mbox = null;

        /**
        @property mbox_sha1sum
        @type String
        */
        this.mbox_sha1sum = null;

        /**
        @property openid
        @type String
        */
        this.openid = null;

        /**
        @property account
        @type TinCan.AgentAccount
        */
        this.account = null;

        /**
        @property degraded
        @type Boolean
        @default false
        */
        this.degraded = false;

        this.init(cfg);
    };
    Agent.prototype = {
        /**
        @property objectType
        @type String
        @default Agent
        */
        objectType: "Agent",

        /**
        @property LOG_SRC
        */
        LOG_SRC: "Agent",

        /**
        @method log
        */
        log: TinCan.prototype.log,

        /**
        @method init
        @param {Object} [options] Configuration used to initialize
        */
        init: function (cfg) {
            this.log("init");
            var i,
                directProps = [
                    "name",
                    "mbox",
                    "mbox_sha1sum",
                    "openid"
                ],
                val
            ;

            cfg = cfg || {};

            // handle .9 split names and array properties into single interface
            if (typeof cfg.lastName !== "undefined" || typeof cfg.firstName !== "undefined") {
                cfg.name = "";
                if (typeof cfg.firstName !== "undefined" && cfg.firstName.length > 0) {
                    cfg.name = cfg.firstName[0];
                    if (cfg.firstName.length > 1) {
                        this.degraded = true;
                    }
                }

                if (cfg.name !== "") {
                    cfg.name += " ";
                }

                if (typeof cfg.lastName !== "undefined" && cfg.lastName.length > 0) {
                    cfg.name += cfg.lastName[0];
                    if (cfg.lastName.length > 1) {
                        this.degraded = true;
                    }
                }
            } else if (typeof cfg.familyName !== "undefined" || typeof cfg.givenName !== "undefined") {
                cfg.name = "";
                if (typeof cfg.givenName !== "undefined" && cfg.givenName.length > 0) {
                    cfg.name = cfg.givenName[0];
                    if (cfg.givenName.length > 1) {
                        this.degraded = true;
                    }
                }

                if (cfg.name !== "") {
                    cfg.name += " ";
                }

                if (typeof cfg.familyName !== "undefined" && cfg.familyName.length > 0) {
                    cfg.name += cfg.familyName[0];
                    if (cfg.familyName.length > 1) {
                        this.degraded = true;
                    }
                }
            }

            if (typeof cfg.name === "object" && cfg.name !== null) {
                if (cfg.name.length > 1) {
                    this.degraded = true;
                }
                cfg.name = cfg.name[0];
            }
            if (typeof cfg.mbox === "object" && cfg.mbox !== null) {
                if (cfg.mbox.length > 1) {
                    this.degraded = true;
                }
                cfg.mbox = cfg.mbox[0];
            }
            if (typeof cfg.mbox_sha1sum === "object" && cfg.mbox_sha1sum !== null) {
                if (cfg.mbox_sha1sum.length > 1) {
                    this.degraded = true;
                }
                cfg.mbox_sha1sum = cfg.mbox_sha1sum[0];
            }
            if (typeof cfg.openid === "object" && cfg.openid !== null) {
                if (cfg.openid.length > 1) {
                    this.degraded = true;
                }
                cfg.openid = cfg.openid[0];
            }
            if (typeof cfg.account === "object" && cfg.account !== null && typeof cfg.account.homePage === "undefined" && typeof cfg.account.name === "undefined") {
                if (cfg.account.length === 0) {
                    delete cfg.account;
                }
                else {
                    if (cfg.account.length > 1) {
                        this.degraded = true;
                    }
                    cfg.account = cfg.account[0];
                }
            }

            if (cfg.hasOwnProperty("account")) {
                if (cfg.account instanceof TinCan.AgentAccount) {
                    this.account = cfg.account;
                }
                else {
                    this.account = new TinCan.AgentAccount (cfg.account);
                }
            }

            for (i = 0; i < directProps.length; i += 1) {
                if (cfg.hasOwnProperty(directProps[i]) && cfg[directProps[i]] !== null) {
                    val = cfg[directProps[i]];
                    if (directProps[i] === "mbox" && val.indexOf("mailto:") === -1) {
                        val = "mailto:" + val;
                    }
                    this[directProps[i]] = val;
                }
            }
        },

        toString: function () {
            this.log("toString");

            if (this.name !== null) {
                return this.name;
            }
            if (this.mbox !== null) {
                return this.mbox.replace("mailto:", "");
            }
            if (this.mbox_sha1sum !== null) {
                return this.mbox_sha1sum;
            }
            if (this.openid !== null) {
                return this.openid;
            }
            if (this.account !== null) {
                return this.account.toString();
            }

            return this.objectType + ": unidentified";
        },

        /**
        While a TinCan.Agent instance can store more than one inverse functional identifier
        this method will always only output one to be compliant with the statement sending
        specification. Order of preference is: mbox, mbox_sha1sum, openid, account

        @method asVersion
        @param {String} [version] Version to return (defaults to newest supported)
        */
        asVersion: function (version) {
            this.log("asVersion: " + version);
            var result = {
                objectType: this.objectType
            };

            version = version || TinCan.versions()[0];

            if (version === "0.9") {
                if (this.mbox !== null) {
                    result.mbox = [ this.mbox ];
                }
                else if (this.mbox_sha1sum !== null) {
                    result.mbox_sha1sum = [ this.mbox_sha1sum ];
                }
                else if (this.openid !== null) {
                    result.openid = [ this.openid ];
                }
                else if (this.account !== null) {
                    result.account = [ this.account.asVersion(version) ];
                }

                if (this.name !== null) {
                    result.name = [ this.name ];
                }
            } else {
                if (this.mbox !== null) {
                    result.mbox = this.mbox;
                }
                else if (this.mbox_sha1sum !== null) {
                    result.mbox_sha1sum = this.mbox_sha1sum;
                }
                else if (this.openid !== null) {
                    result.openid = this.openid;
                }
                else if (this.account !== null) {
                    result.account = this.account.asVersion(version);
                }

                if (this.name !== null) {
                    result.name = this.name;
                }
            }

            return result;
        }
    };

    /**
    @method fromJSON
    @return {Object} Agent
    @static
    */
    Agent.fromJSON = function (agentJSON) {
        Agent.prototype.log("fromJSON");
        var _agent = JSON.parse(agentJSON);

        return new Agent(_agent);
    };
}());

/*
    Copyright 2012 Rustici Software

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/**
TinCan client library

@module TinCan
@submodule TinCan.Group
**/
(function () {
    "use strict";

    /**
    @class TinCan.Group
    @constructor
    */
    var Group = TinCan.Group = function (cfg) {
        this.log("constructor");

        /**
        @property name
        @type String
        */
        this.name = null;

        /**
        @property mbox
        @type String
        */
        this.mbox = null;

        /**
        @property mbox_sha1sum
        @type String
        */
        this.mbox_sha1sum = null;

        /**
        @property openid
        @type String
        */
        this.openid = null;

        /**
        @property account
        @type TinCan.AgentAccount
        */
        this.account = null;

        /**
        @property member
        @type Array
        */
        this.member = [];

        this.init(cfg);
    };
    Group.prototype = {
        /**
        @property objectType
        @type String
        @default "Group"
        @static
        */
        objectType: "Group",

        /**
        @property LOG_SRC
        */
        LOG_SRC: "Group",

        /**
        @method log
        */
        log: TinCan.prototype.log,

        /**
        @method init
        @param {Object} [options] Configuration used to initialize
        */
        init: function (cfg) {
            this.log("init");
            var i;

            cfg = cfg || {};

            TinCan.Agent.prototype.init.call(this, cfg);

            if (typeof cfg.member !== "undefined") {
                for (i = 0; i < cfg.member.length; i += 1) {
                    if (cfg.member[i] instanceof TinCan.Agent) {
                        this.member.push(cfg.member[i]);
                    }
                    else {
                        this.member.push(new TinCan.Agent (cfg.member[i]));
                    }
                }
            }
        },

        toString: function (lang) {
            this.log("toString");

            var result = TinCan.Agent.prototype.toString.call(this, lang);
            if (result !== this.objectType + ": unidentified") {
                result = this.objectType + ": " + result;
            }

            return result;
        },

        /**
        @method asVersion
        @param {String} [version] Version to return (defaults to newest supported)
        */
        asVersion: function (version) {
            this.log("asVersion: " + version);
            var result,
                i
            ;

            version = version || TinCan.versions()[0];

            result = TinCan.Agent.prototype.asVersion.call(this, version);

            if (this.member.length > 0) {
                result.member = [];
                for (i = 0; i < this.member.length; i += 1) {
                    result.member.push(this.member[i].asVersion(version));
                }
            }

            return result;
        }
    };

    /**
    @method fromJSON
    @return {Object} Group
    @static
    */
    Group.fromJSON = function (groupJSON) {
        Group.prototype.log("fromJSON");
        var _group = JSON.parse(groupJSON);

        return new Group(_group);
    };
}());

/*
    Copyright 2012 Rustici Software

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/**
TinCan client library

@module TinCan
@submodule TinCan.Verb
*/
(function () {
    "use strict";

    //
    // this represents the full set of verb values that were
    // allowed by the .9 spec version, if an object is created with one of
    // the short forms it will be upconverted to the matching long form,
    // for local storage and use and if an object is needed in .9 version
    // consequently down converted
    //
    // hopefully this list will never grow (or change) and only the exact
    // ADL compatible URLs should be matched
    //
    var _downConvertMap = {
        "http://adlnet.gov/expapi/verbs/experienced": "experienced",
        "http://adlnet.gov/expapi/verbs/attended":    "attended",
        "http://adlnet.gov/expapi/verbs/attempted":   "attempted",
        "http://adlnet.gov/expapi/verbs/completed":   "completed",
        "http://adlnet.gov/expapi/verbs/passed":      "passed",
        "http://adlnet.gov/expapi/verbs/failed":      "failed",
        "http://adlnet.gov/expapi/verbs/answered":    "answered",
        "http://adlnet.gov/expapi/verbs/interacted":  "interacted",
        "http://adlnet.gov/expapi/verbs/imported":    "imported",
        "http://adlnet.gov/expapi/verbs/created":     "created",
        "http://adlnet.gov/expapi/verbs/shared":      "shared",
        "http://adlnet.gov/expapi/verbs/voided":      "voided"
    },

    /**
    @class TinCan.Verb
    @constructor
    */
    Verb = TinCan.Verb = function (cfg) {
        this.log("constructor");

        /**
        @property id
        @type String
        */
        this.id = null;

        /**
        @property display
        @type Object
        */
        this.display = null;

        this.init(cfg);
    };
    Verb.prototype = {
        /**
        @property LOG_SRC
        */
        LOG_SRC: "Verb",

        /**
        @method log
        */
        log: TinCan.prototype.log,

        /**
        @method init
        @param {Object} [options] Configuration used to initialize
        */
        init: function (cfg) {
            this.log("init");
            var i,
                directProps = [
                    "id",
                    "display"
                ],
                prop
            ;

            if (typeof cfg === "string") {
                this.id = cfg;
                this.display = {
                    und: this.id
                };

                //If simple string like "attempted" was passed in (0.9 verbs),
                //upconvert the ID to the 0.95 ADL version
                for (prop in _downConvertMap) {
                    if (_downConvertMap.hasOwnProperty(prop) && _downConvertMap[prop] === cfg) {
                        this.id = prop;
                        break;
                    }
                }
            }
            else {
                cfg = cfg || {};

                for (i = 0; i < directProps.length; i += 1) {
                    if (cfg.hasOwnProperty(directProps[i]) && cfg[directProps[i]] !== null) {
                        this[directProps[i]] = cfg[directProps[i]];
                    }
                }

                if (this.display === null && typeof _downConvertMap[this.id] !== "undefined") {
                    this.display = {
                        "und": _downConvertMap[this.id]
                    };
                }
            }
        },

        /**
        @method toString
        @return {String} String representation of the verb
        */
        toString: function (lang) {
            this.log("toString");

            if (this.display !== null) {
                return this.getLangDictionaryValue("display", lang);
            }

            return this.id;
        },

        /**
        @method asVersion
        @param {String} [version] Version to return (defaults to newest supported)
        */
        asVersion: function (version) {
            this.log("asVersion");
            var result;

            version = version || TinCan.versions()[0];

            if (version === "0.9") {
                result = _downConvertMap[this.id];
            }
            else {
                result = {
                    id: this.id
                };
                if (this.display !== null) {
                    result.display = this.display;
                }
            }

            return result;
        },

        /**
        See {{#crossLink "TinCan.Utils/getLangDictionaryValue"}}{{/crossLink}}

        @method getLangDictionaryValue
        */
        getLangDictionaryValue: TinCan.Utils.getLangDictionaryValue
    };

    /**
    @method fromJSON
    @param {String} verbJSON String of JSON representing the verb
    @return {Object} Verb
    @static
    */
    Verb.fromJSON = function (verbJSON) {
        Verb.prototype.log("fromJSON");
        var _verb = JSON.parse(verbJSON);

        return new Verb(_verb);
    };
}());

/*
    Copyright 2012 Rustici Software

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/**
TinCan client library

@module TinCan
@submodule TinCan.Result
**/
(function () {
    "use strict";

    /**
    @class TinCan.Result
    @constructor
    */
    var Result = TinCan.Result = function (cfg) {
        this.log("constructor");

        /**
        @property score
        @type TinCan.Score|null
        */
        this.score = null;

        /**
        @property success
        @type Boolean|null
        */
        this.success = null;

        /**
        @property completion
        @type Boolean|null
        */
        this.completion = null;

        /**
        @property duration
        @type String|null
        */
        this.duration = null;

        /**
        @property response
        @type String|null
        */
        this.response = null;

        /**
        @property extensions
        @type Object|null
        */
        this.extensions = null;

        this.init(cfg);
    };
    Result.prototype = {
        /**
        @property LOG_SRC
        */
        LOG_SRC: "Result",

        /**
        @method log
        */
        log: TinCan.prototype.log,

        /**
        @method init
        @param {Object} [options] Configuration used to initialize
        */
        init: function (cfg) {
            this.log("init");

            var i,
                directProps = [
                    "completion",
                    "duration",
                    "extensions",
                    "response",
                    "success"
                ]
            ;

            cfg = cfg || {};

            if (cfg.hasOwnProperty("score") && cfg.score !== null) {
                if (cfg.score instanceof TinCan.Score) {
                    this.score = cfg.score;
                }
                else {
                    this.score = new TinCan.Score (cfg.score);
                }
            }

            for (i = 0; i < directProps.length; i += 1) {
                if (cfg.hasOwnProperty(directProps[i]) && cfg[directProps[i]] !== null) {
                    this[directProps[i]] = cfg[directProps[i]];
                }
            }

            // 0.9 used a string, store it internally as a bool
            if (this.completion === "Completed") {
                this.completion = true;
            }
        },

        /**
        @method asVersion
        @param {String} [version] Version to return (defaults to newest supported)
        */
        asVersion: function (version) {
            this.log("asVersion");
            var result = {},
                optionalDirectProps = [
                    "success",
                    "duration",
                    "response",
                    "extensions"
                ],
                optionalObjProps = [
                    "score"
                ],
                i;

            version = version || TinCan.versions()[0];

            for (i = 0; i < optionalDirectProps.length; i += 1) {
                if (this[optionalDirectProps[i]] !== null) {
                    result[optionalDirectProps[i]] = this[optionalDirectProps[i]];
                }
            }
            for (i = 0; i < optionalObjProps.length; i += 1) {
                if (this[optionalObjProps[i]] !== null) {
                    result[optionalObjProps[i]] = this[optionalObjProps[i]].asVersion(version);
                }
            }
            if (this.completion !== null) {
                if (version === "0.9") {
                    if (this.completion) {
                        result.completion = "Completed";
                    }
                }
                else {
                    result.completion = this.completion;
                }
            }

            return result;
        }
    };

    /**
    @method fromJSON
    @return {Object} Result
    @static
    */
    Result.fromJSON = function (resultJSON) {
        Result.prototype.log("fromJSON");
        var _result = JSON.parse(resultJSON);

        return new Result(_result);
    };
}());

/*
    Copyright 2012 Rustici Software

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/**
TinCan client library

@module TinCan
@submodule TinCan.Score
**/
(function () {
    "use strict";

    /**
    @class TinCan.Score
    @constructor
    */
    var Score = TinCan.Score = function (cfg) {
        this.log("constructor");

        /**
        @property scaled
        @type String
        */
        this.scaled = null;

        /**
        @property raw
        @type String
        */
        this.raw = null;

        /**
        @property min
        @type String
        */
        this.min = null;

        /**
        @property max
        @type String
        */
        this.max = null;

        this.init(cfg);
    };
    Score.prototype = {
        /**
        @property LOG_SRC
        */
        LOG_SRC: "Score",

        /**
        @method log
        */
        log: TinCan.prototype.log,

        /**
        @method init
        @param {Object} [options] Configuration used to initialize
        */
        init: function (cfg) {
            this.log("init");

            var i,
                directProps = [
                    "scaled",
                    "raw",
                    "min",
                    "max"
                ]
            ;

            cfg = cfg || {};

            for (i = 0; i < directProps.length; i += 1) {
                if (cfg.hasOwnProperty(directProps[i]) && cfg[directProps[i]] !== null) {
                    this[directProps[i]] = cfg[directProps[i]];
                }
            }
        },

        /**
        @method asVersion
        @param {String} [version] Version to return (defaults to newest supported)
        */
        asVersion: function (version) {
            this.log("asVersion");
            var result = {},
                optionalDirectProps = [
                    "scaled",
                    "raw",
                    "min",
                    "max"
                ],
                i;

            version = version || TinCan.versions()[0];

            for (i = 0; i < optionalDirectProps.length; i += 1) {
                if (this[optionalDirectProps[i]] !== null) {
                    result[optionalDirectProps[i]] = this[optionalDirectProps[i]];
                }
            }

            return result;
        }
    };

    /**
    @method fromJSON
    @return {Object} Score
    @static
    */
    Score.fromJSON = function (scoreJSON) {
        Score.prototype.log("fromJSON");
        var _score = JSON.parse(scoreJSON);

        return new Score(_score);
    };
}());

/*
    Copyright 2012 Rustici Software

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/**
TinCan client library

@module TinCan
@submodule TinCan.InteractionComponent
**/
(function () {
    "use strict";

    /**
    @class TinCan.InteractionComponent
    @constructor
    */
    var InteractionComponent = TinCan.InteractionComponent = function (cfg) {
        this.log("constructor");

        /**
        @property id
        @type String
        */
        this.id = null;

        /**
        @property description
        @type Object
        */
        this.description = null;

        this.init(cfg);
    };
    InteractionComponent.prototype = {
        /**
        @property LOG_SRC
        */
        LOG_SRC: "InteractionComponent",

        /**
        @method log
        */
        log: TinCan.prototype.log,

        /**
        @method init
        @param {Object} [options] Configuration used to initialize
        */
        init: function (cfg) {
            this.log("init");
            var i,
                directProps = [
                    "id",
                    "description"
                ]
            ;

            cfg = cfg || {};

            for (i = 0; i < directProps.length; i += 1) {
                if (cfg.hasOwnProperty(directProps[i]) && cfg[directProps[i]] !== null) {
                    this[directProps[i]] = cfg[directProps[i]];
                }
            }
        },

        /**
        @method asVersion
        @param {String} [version] Version to return (defaults to newest supported)
        */
        asVersion: function (version) {
            this.log("asVersion");
            var result = {
                    id: this.id
                },
                optionalDirectProps = [
                    "description"
                ],
                i,
                prop;

            version = version || TinCan.versions()[0];

            for (i = 0; i < optionalDirectProps.length; i += 1) {
                prop = optionalDirectProps[i];
                if (this[prop] !== null) {
                    result[prop] = this[prop];
                }
            }

            return result;
        },

        /**
        See {{#crossLink "TinCan.Utils/getLangDictionaryValue"}}{{/crossLink}}

        @method getLangDictionaryValue
        */
        getLangDictionaryValue: TinCan.Utils.getLangDictionaryValue
    };

    /**
    @method fromJSON
    @return {Object} InteractionComponent
    @static
    */
    InteractionComponent.fromJSON = function (icJSON) {
        InteractionComponent.prototype.log("fromJSON");
        var _ic = JSON.parse(icJSON);

        return new InteractionComponent(_ic);
    };
}());

/*
    Copyright 2012 Rustici Software

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/**
TinCan client library

@module TinCan
@submodule TinCan.ActivityDefinition
**/
(function () {
    "use strict";

    //
    // this represents the full set of activity definition types that were
    // allowed by the .9 spec version, if an object is created with one of
    // the short forms it will be upconverted to the matching long form,
    // for local storage and use and if an object is needed in .9 version
    // consequently down converted
    //
    // hopefully this list will never grow (or change) and only the exact
    // ADL compatible URLs should be matched
    //
    var _downConvertMap = {
        "http://adlnet.gov/expapi/activities/course": "course",
        "http://adlnet.gov/expapi/activities/module": "module",
        "http://adlnet.gov/expapi/activities/meeting": "meeting",
        "http://adlnet.gov/expapi/activities/media": "media",
        "http://adlnet.gov/expapi/activities/performance": "performance",
        "http://adlnet.gov/expapi/activities/simulation": "simulation",
        "http://adlnet.gov/expapi/activities/assessment": "assessment",
        "http://adlnet.gov/expapi/activities/interaction": "interaction",
        "http://adlnet.gov/expapi/activities/cmi.interaction": "cmi.interaction",
        "http://adlnet.gov/expapi/activities/question": "question",
        "http://adlnet.gov/expapi/activities/objective": "objective",
        "http://adlnet.gov/expapi/activities/link": "link"
    },

    /**
    @class TinCan.ActivityDefinition
    @constructor
    */
    ActivityDefinition = TinCan.ActivityDefinition = function (cfg) {
        this.log("constructor");

        /**
        @property name
        @type Object
        */
        this.name = null;

        /**
        @property description
        @type Object
        */
        this.description = null;

        /**
        @property type
        @type String
        */
        this.type = null;

        /**
        @property moreInfo
        @type String
        */
        this.moreInfo = null;

        /**
        @property extensions
        @type Object
        */
        this.extensions = null;

        /**
        @property interactionType
        @type String
        */
        this.interactionType = null;

        /**
        @property correctResponsesPattern
        @type Array
        */
        this.correctResponsesPattern = null;

        /**
        @property choices
        @type Array
        */
        this.choices = null;

        /**
        @property scale
        @type Array
        */
        this.scale = null;

        /**
        @property source
        @type Array
        */
        this.source = null;

        /**
        @property target
        @type Array
        */
        this.target = null;

        /**
        @property steps
        @type Array
        */
        this.steps = null;

        this.init(cfg);
    };
    ActivityDefinition.prototype = {
        /**
        @property LOG_SRC
        */
        LOG_SRC: "ActivityDefinition",

        /**
        @method log
        */
        log: TinCan.prototype.log,

        /**
        @method init
        @param {Object} [options] Configuration used to initialize
        */
        init: function (cfg) {
            this.log("init");

            var i,
                j,
                prop,
                directProps = [
                    "name",
                    "description",
                    "moreInfo",
                    "extensions",
                    "correctResponsesPattern"
                ],
                interactionComponentProps = []
            ;

            cfg = cfg || {};

            if (cfg.hasOwnProperty("type") && cfg.type !== null) {
                // TODO: verify type is URI?
                for (prop in _downConvertMap) {
                    if (_downConvertMap.hasOwnProperty(prop) && _downConvertMap[prop] === cfg.type) {
                        cfg.type = _downConvertMap[prop];
                    }
                }
                this.type = cfg.type;
            }

            if (cfg.hasOwnProperty("interactionType") && cfg.interactionType !== null) {
                // TODO: verify interaction type in acceptable set?
                this.interactionType = cfg.interactionType;
                if (cfg.interactionType === "choice" || cfg.interactionType === "sequencing") {
                    interactionComponentProps.push("choices");
                }
                else if (cfg.interactionType === "likert") {
                    interactionComponentProps.push("scale");
                }
                else if (cfg.interactionType === "matching") {
                    interactionComponentProps.push("source");
                    interactionComponentProps.push("target");
                }
                else if (cfg.interactionType === "performance") {
                    interactionComponentProps.push("steps");
                }

                if (interactionComponentProps.length > 0) {
                    for (i = 0; i < interactionComponentProps.length; i += 1) {
                        prop = interactionComponentProps[i];
                        if (cfg.hasOwnProperty(prop) && cfg[prop] !== null) {
                            this[prop] = [];
                            for (j = 0; j < cfg[prop].length; j += 1) {
                                if (cfg[prop][j] instanceof TinCan.InteractionComponent) {
                                    this[prop].push(cfg[prop][j]);
                                } else {
                                    this[prop].push(
                                        new TinCan.InteractionComponent (
                                            cfg[prop][j]
                                        )
                                    );
                                }
                            }
                        }
                    }
                }
            }

            for (i = 0; i < directProps.length; i += 1) {
                if (cfg.hasOwnProperty(directProps[i]) && cfg[directProps[i]] !== null) {
                    this[directProps[i]] = cfg[directProps[i]];
                }
            }
        },

        /**
        @method toString
        @return {String} String representation of the definition
        */
        toString: function (lang) {
            this.log("toString");

            if (this.name !== null) {
                return this.getLangDictionaryValue("name", lang);
            }

            if (this.description !== null) {
                return this.getLangDictionaryValue("description", lang);
            }

            return "";
        },

        /**
        @method asVersion
        @param {String} [version] Version to return (defaults to newest supported)
        */
        asVersion: function (version) {
            this.log("asVersion");
            var result = {},
                directProps = [
                    "name",
                    "description",
                    "interactionType",
                    "correctResponsesPattern",
                    "extensions"
                ],
                interactionComponentProps = [
                    "choices",
                    "scale",
                    "source",
                    "target",
                    "steps"
                ],
                i,
                j,
                prop
            ;

            version = version || TinCan.versions()[0];

            if (this.type !== null) {
                if (version === "0.9") {
                    result.type = _downConvertMap[this.type];
                }
                else {
                    result.type = this.type;
                }
            }

            for (i = 0; i < directProps.length; i += 1) {
                prop = directProps[i];
                if (this[prop] !== null) {
                    result[prop] = this[prop];
                }
            }

            for (i = 0; i < interactionComponentProps.length; i += 1) {
                prop = interactionComponentProps[i];
                if (this[prop] !== null) {
                    result[prop] = [];
                    for (j = 0; j < this[prop].length; j += 1) {
                        result[prop].push(
                            this[prop][j].asVersion(version)
                        );
                    }
                }
            }

            if (version.indexOf("0.9") !== 0) {
                if (this.moreInfo !== null) {
                    result.moreInfo = this.moreInfo;
                }
            }

            return result;
        },

        /**
        See {{#crossLink "TinCan.Utils/getLangDictionaryValue"}}{{/crossLink}}

        @method getLangDictionaryValue
        */
        getLangDictionaryValue: TinCan.Utils.getLangDictionaryValue
    };

    /**
    @method fromJSON
    @return {Object} ActivityDefinition
    @static
    */
    ActivityDefinition.fromJSON = function (definitionJSON) {
        ActivityDefinition.prototype.log("fromJSON");
        var _definition = JSON.parse(definitionJSON);

        return new ActivityDefinition(_definition);
    };
}());

/*
    Copyright 2012 Rustici Software

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/**
TinCan client library

@module TinCan
@submodule TinCan.Activity
**/
(function () {
    "use strict";

    /**
    @class TinCan.Activity
    @constructor
    */
    var Activity = TinCan.Activity = function (cfg) {
        this.log("constructor");

        /**
        @property objectType
        @type String
        @default Activity
        */
        this.objectType = "Activity";

        /**
        @property id
        @type String
        */
        this.id = null;

        /**
        @property definition
        @type TinCan.ActivityDefinition
        */
        this.definition = null;

        this.init(cfg);
    };
    Activity.prototype = {
        /**
        @property LOG_SRC
        */
        LOG_SRC: "Activity",

        /**
        @method log
        */
        log: TinCan.prototype.log,

        /**
        @method init
        @param {Object} [options] Configuration used to initialize
        */
        init: function (cfg) {
            this.log("init");

            var i,
                directProps = [
                    "id"
                ]
            ;

            cfg = cfg || {};

            if (cfg.hasOwnProperty("definition")) {
                if (cfg.definition instanceof TinCan.ActivityDefinition) {
                    this.definition = cfg.definition;
                } else {
                    this.definition = new TinCan.ActivityDefinition (cfg.definition);
                }
            }

            for (i = 0; i < directProps.length; i += 1) {
                if (cfg.hasOwnProperty(directProps[i]) && cfg[directProps[i]] !== null) {
                    this[directProps[i]] = cfg[directProps[i]];
                }
            }
        },

        /**
        @method toString
        @return {String} String representation of the activity
        */
        toString: function (lang) {
            this.log("toString");
            var defString = "";

            if (this.definition !== null) {
                defString = this.definition.toString(lang);
                if (defString !== "") {
                    return defString;
                }
            }

            if (this.id !== null) {
                return this.id;
            }

            return "Activity: unidentified";
        },

        /**
        @method asVersion
        @param {String} [version] Version to return (defaults to newest supported)
        */
        asVersion: function (version) {
            this.log("asVersion");
            var result = {
                id: this.id,
                objectType: this.objectType
            };

            version = version || TinCan.versions()[0];

            if (this.definition !== null) {
                result.definition = this.definition.asVersion(version);
            }

            return result;
        }
    };

    /**
    @method fromJSON
    @return {Object} Activity
    @static
    */
    Activity.fromJSON = function (activityJSON) {
        Activity.prototype.log("fromJSON");
        var _activity = JSON.parse(activityJSON);

        return new Activity(_activity);
    };
}());

/*
    Copyright 2013 Rustici Software

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/**
TinCan client library

@module TinCan
@submodule TinCan.ContextActivities
**/
(function () {
    "use strict";

    /**
    @class TinCan.ContextActivities
    @constructor
    */
    var ContextActivities = TinCan.ContextActivities = function (cfg) {
        this.log("constructor");

        /**
        @property category
        @type Array
        */
        this.category = null;

        /**
        @property parent
        @type Array
        */
        this.parent = null;

        /**
        @property grouping
        @type Array
        */
        this.grouping = null;

        /**
        @property other
        @type Array
        */
        this.other = null;

        this.init(cfg);
    };
    ContextActivities.prototype = {
        /**
        @property LOG_SRC
        */
        LOG_SRC: "ContextActivities",

        /**
        @method log
        */
        log: TinCan.prototype.log,

        /**
        @method init
        @param {Object} [options] Configuration used to initialize
        */
        init: function (cfg) {
            this.log("init");

            var i,
                j,
                objProps = [
                    "category",
                    "parent",
                    "grouping",
                    "other"
                ],
                prop,
                val
            ;

            cfg = cfg || {};

            for (i = 0; i < objProps.length; i += 1) {
                prop = objProps[i];
                if (cfg.hasOwnProperty(prop) && cfg[prop] !== null) {
                    if (Object.prototype.toString.call(cfg[prop]) === "[object Array]") {
                        for (j = 0; j < cfg[prop].length; j += 1) {
                            this.add(prop, cfg[prop][j]);
                        }
                    }
                    else {
                        val = cfg[prop];

                        this.add(prop, val);
                    }
                }
            }
        },

        /**
        @method add
        @param String key Property to add value to one of "category", "parent", "grouping", "other"
        @return Number index where the value was added
        */
        add: function (key, val) {
            if (key !== "category" && key !== "parent" && key !== "grouping" && key !== "other") {
                return;
            }

            if (this[key] === null) {
                this[key] = [];
            }

            if (! (val instanceof TinCan.Activity)) {
                val = typeof val === "string" ? { id: val } : val;
                val = new TinCan.Activity (val);
            }

            this[key].push(val);

            return this[key].length - 1;
        },

        /**
        @method asVersion
        @param {String} [version] Version to return (defaults to newest supported)
        */
        asVersion: function (version) {
            this.log("asVersion");
            var result = {},
                optionalObjProps = [
                    "parent",
                    "grouping",
                    "other"
                ],
                i,
                j;

            version = version || TinCan.versions()[0];

            for (i = 0; i < optionalObjProps.length; i += 1) {
                if (this[optionalObjProps[i]] !== null && this[optionalObjProps[i]].length > 0) {
                    if (version === "0.9" || version === "0.95") {
                        if (this[optionalObjProps[i]].length > 1) {
                            // TODO: exception?
                            this.log("[warning] version does not support multiple values in: " + optionalObjProps[i]);
                        }

                        result[optionalObjProps[i]] = this[optionalObjProps[i]][0].asVersion(version);
                    }
                    else {
                        result[optionalObjProps[i]] = [];
                        for (j = 0; j < this[optionalObjProps[i]].length; j += 1) {
                            result[optionalObjProps[i]].push(
                                this[optionalObjProps[i]][j].asVersion(version)
                            );
                        }
                    }
                }
            }
            if (this.category !== null && this.category.length > 0) {
                if (version === "0.9" || version === "0.95") {
                    this.log("[error] version does not support the 'category' property: " + version);
                    throw new Error(version + " does not support the 'category' property");
                }
                else {
                    result.category = [];
                    for (i = 0; i < this.category.length; i += 1) {
                        result.category.push(this.category[i].asVersion(version));
                    }
                }
            }

            return result;
        }
    };

    /**
    @method fromJSON
    @return {Object} ContextActivities
    @static
    */
    ContextActivities.fromJSON = function (contextActivitiesJSON) {
        ContextActivities.prototype.log("fromJSON");
        var _contextActivities = JSON.parse(contextActivitiesJSON);

        return new ContextActivities(_contextActivities);
    };
}());

/*
    Copyright 2012 Rustici Software

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/**
TinCan client library

@module TinCan
@submodule TinCan.Context
**/
(function () {
    "use strict";

    /**
    @class TinCan.Context
    @constructor
    */
    var Context = TinCan.Context = function (cfg) {
        this.log("constructor");

        /**
        @property registration
        @type String|null
        */
        this.registration = null;

        /**
        @property instructor
        @type TinCan.Agent|TinCan.Group|null
        */
        this.instructor = null;

        /**
        @property team
        @type TinCan.Agent|TinCan.Group|null
        */
        this.team = null;

        /**
        @property contextActivities
        @type ContextActivities|null
        */
        this.contextActivities = null;

        /**
        @property revision
        @type String|null
        */
        this.revision = null;

        /**
        @property platform
        @type Object|null
        */
        this.platform = null;

        /**
        @property language
        @type String|null
        */
        this.language = null;

        /**
        @property statement
        @type StatementRef|null
        */
        this.statement = null;

        /**
        @property extensions
        @type String
        */
        this.extensions = null;

        this.init(cfg);
    };
    Context.prototype = {
        /**
        @property LOG_SRC
        */
        LOG_SRC: "Context",

        /**
        @method log
        */
        log: TinCan.prototype.log,

        /**
        @method init
        @param {Object} [options] Configuration used to initialize
        */
        init: function (cfg) {
            this.log("init");

            var i,
                directProps = [
                    "registration",
                    "revision",
                    "platform",
                    "language",
                    "extensions"
                ],
                agentGroupProps = [
                    "instructor",
                    "team"
                ],
                prop,
                val
            ;

            cfg = cfg || {};

            for (i = 0; i < directProps.length; i += 1) {
                prop = directProps[i];
                if (cfg.hasOwnProperty(prop) && cfg[prop] !== null) {
                    this[prop] = cfg[prop];
                }
            }
            for (i = 0; i < agentGroupProps.length; i += 1) {
                prop = agentGroupProps[i];
                if (cfg.hasOwnProperty(prop) && cfg[prop] !== null) {
                    val = cfg[prop];

                    if (typeof val.objectType === "undefined" || val.objectType === "Person") {
                        val.objectType = "Agent";
                    }

                    if (val.objectType === "Agent" && ! (val instanceof TinCan.Agent)) {
                        val = new TinCan.Agent (val);
                    } else if (val.objectType === "Group" && ! (val instanceof TinCan.Group)) {
                        val = new TinCan.Group (val);
                    }

                    this[prop] = val;
                }
            }

            if (cfg.hasOwnProperty("contextActivities") && cfg.contextActivities !== null) {
                if (cfg.contextActivities instanceof TinCan.ContextActivities) {
                    this.contextActivities = cfg.contextActivities;
                }
                else {
                    this.contextActivities = new TinCan.ContextActivities(cfg.contextActivities);
                }
            }

            if (cfg.hasOwnProperty("statement") && cfg.statement !== null) {
                if (cfg.statement instanceof TinCan.StatementRef) {
                    this.statement = cfg.statement;
                }
                else if (cfg.statement instanceof TinCan.SubStatement) {
                    this.statement = cfg.statement;
                }
                else if (cfg.statement.objectType === "StatementRef") {
                    this.statement = new TinCan.StatementRef(cfg.statement);
                }
                else if (cfg.statement.objectType === "SubStatement") {
                    this.statement = new TinCan.SubStatement(cfg.statement);
                }
                else {
                    this.log("Unable to parse statement.context.statement property.");
                }
            }
        },

        /**
        @method asVersion
        @param {String} [version] Version to return (defaults to newest supported)
        */
        asVersion: function (version) {
            this.log("asVersion");
            var result = {},
                optionalDirectProps = [
                    "registration",
                    "revision",
                    "platform",
                    "language",
                    "extensions"
                ],
                optionalObjProps = [
                    "instructor",
                    "team",
                    "contextActivities",
                    "statement"
                ],
                i;

            version = version || TinCan.versions()[0];

            if (this.statement instanceof TinCan.SubStatement && version !== "0.9" && version !== "0.95") {
                this.log("[error] version does not support SubStatements in the 'statement' property: " + version);
                throw new Error(version + " does not support SubStatements in the 'statement' property");
            }

            for (i = 0; i < optionalDirectProps.length; i += 1) {
                if (this[optionalDirectProps[i]] !== null) {
                    result[optionalDirectProps[i]] = this[optionalDirectProps[i]];
                }
            }
            for (i = 0; i < optionalObjProps.length; i += 1) {
                if (this[optionalObjProps[i]] !== null) {
                    result[optionalObjProps[i]] = this[optionalObjProps[i]].asVersion(version);
                }
            }

            return result;
        }
    };

    /**
    @method fromJSON
    @return {Object} Context
    @static
    */
    Context.fromJSON = function (contextJSON) {
        Context.prototype.log("fromJSON");
        var _context = JSON.parse(contextJSON);

        return new Context(_context);
    };
}());

/*
    Copyright 2012 Rustici Software

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/**
TinCan client library

@module TinCan
@submodule TinCan.StatementRef
**/
(function () {
    "use strict";

    /**
    @class TinCan.StatementRef
    @constructor
    @param {Object} [cfg] Configuration used to initialize.
        @param {Object} [cfg.id] ID of statement to reference
    **/
    var StatementRef = TinCan.StatementRef = function (cfg) {
        this.log("constructor");

        /**
        @property id
        @type String
        */
        this.id = null;

        this.init(cfg);
    };

    StatementRef.prototype = {
        /**
        @property objectType
        @type String
        @default Agent
        */
        objectType: "StatementRef",

        /**
        @property LOG_SRC
        */
        LOG_SRC: "StatementRef",

        /**
        @method log
        */
        log: TinCan.prototype.log,

        /**
        @method init
        @param {Object} [options] Configuration used to initialize (see constructor)
        */
        init: function (cfg) {
            this.log("init");
            var i,
                directProps = [
                    "id"
                ];

            cfg = cfg || {};

            for (i = 0; i < directProps.length; i += 1) {
                if (cfg.hasOwnProperty(directProps[i]) && cfg[directProps[i]] !== null) {
                    this[directProps[i]] = cfg[directProps[i]];
                }
            }
        },

        /**
        @method toString
        @return {String} String representation of the statement
        */
        toString: function () {
            this.log("toString");
            return this.id;
        },

        /**
        @method asVersion
        @param {String} [version] Version to return (defaults to newest supported)
        */
        asVersion: function (version) {
            this.log("asVersion");
            var result = {
                objectType: this.objectType,
                id: this.id
            };

            if (version === "0.9") {
                result.objectType = "Statement";
            }

            return result;
        }
    };

    /**
    @method fromJSON
    @return {Object} StatementRef
    @static
    */
    StatementRef.fromJSON = function (stRefJSON) {
        StatementRef.prototype.log("fromJSON");
        var _stRef = JSON.parse(stRefJSON);

        return new StatementRef(_stRef);
    };
}());

/*
    Copyright 2012 Rustici Software

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/**
TinCan client library

@module TinCan
@submodule TinCan.SubStatement
**/
(function () {
    "use strict";

    /**
    @class TinCan.SubStatement
    @constructor
    @param {Object} [cfg] Configuration used to initialize.
        @param {TinCan.Agent} [cfg.actor] Actor of statement
        @param {TinCan.Verb} [cfg.verb] Verb of statement
        @param {TinCan.Activity|TinCan.Agent} [cfg.object] Alias for 'target'
        @param {TinCan.Activity|TinCan.Agent} [cfg.target] Object of statement
        @param {TinCan.Result} [cfg.result] Statement Result
        @param {TinCan.Context} [cfg.context] Statement Context
    **/
    var SubStatement = TinCan.SubStatement = function (cfg) {
        this.log("constructor");

        /**
        @property actor
        @type Object
        */
        this.actor = null;

        /**
        @property verb
        @type Object
        */
        this.verb = null;

        /**
        @property target
        @type Object
        */
        this.target = null;

        /**
        @property result
        @type Object
        */
        this.result = null;

        /**
        @property context
        @type Object
        */
        this.context = null;

        /**
        @property timestamp
        @type Date
        */
        this.timestamp = null;

        this.init(cfg);
    };

    SubStatement.prototype = {
        /**
        @property objectType
        @type String
        @default Agent
        */
        objectType: "SubStatement",

        /**
        @property LOG_SRC
        */
        LOG_SRC: "SubStatement",

        /**
        @method log
        */
        log: TinCan.prototype.log,

        /**
        @method init
        @param {Object} [options] Configuration used to initialize (see constructor)
        */
        init: function (cfg) {
            this.log("init");
            var i,
                directProps = [
                    "timestamp"
                ];

            cfg = cfg || {};

            if (cfg.hasOwnProperty("object")) {
                cfg.target = cfg.object;
            }

            if (cfg.hasOwnProperty("actor")) {
                if (typeof cfg.actor.objectType === "undefined" || cfg.actor.objectType === "Person") {
                    cfg.actor.objectType = "Agent";
                }

                if (cfg.actor.objectType === "Agent") {
                    if (cfg.actor instanceof TinCan.Agent) {
                        this.actor = cfg.actor;
                    } else {
                        this.actor = new TinCan.Agent (cfg.actor);
                    }
                } else if (cfg.actor.objectType === "Group") {
                    if (cfg.actor instanceof TinCan.Group) {
                        this.actor = cfg.actor;
                    } else {
                        this.actor = new TinCan.Group (cfg.actor);
                    }
                }
            }
            if (cfg.hasOwnProperty("verb")) {
                if (cfg.verb instanceof TinCan.Verb) {
                    this.verb = cfg.verb;
                } else {
                    this.verb = new TinCan.Verb (cfg.verb);
                }
            }
            if (cfg.hasOwnProperty("target")) {
                if (cfg.target instanceof TinCan.Activity ||
                    cfg.target instanceof TinCan.Agent ||
                    cfg.target instanceof TinCan.Group ||
                    cfg.target instanceof TinCan.SubStatement ||
                    cfg.target instanceof TinCan.StatementRef
                ) {
                    this.target = cfg.target;
                } else {
                    if (typeof cfg.target.objectType === "undefined") {
                        cfg.target.objectType = "Activity";
                    }

                    if (cfg.target.objectType === "Activity") {
                        this.target = new TinCan.Activity (cfg.target);
                    } else if (cfg.target.objectType === "Agent") {
                        this.target = new TinCan.Agent (cfg.target);
                    } else if (cfg.target.objectType === "Group") {
                        this.target = new TinCan.Group (cfg.target);
                    } else if (cfg.target.objectType === "SubStatement") {
                        this.target = new TinCan.SubStatement (cfg.target);
                    } else if (cfg.target.objectType === "StatementRef") {
                        this.target = new TinCan.StatementRef (cfg.target);
                    } else {
                        this.log("Unrecognized target type: " + cfg.target.objectType);
                    }
                }
            }
            if (cfg.hasOwnProperty("result")) {
                if (cfg.result instanceof TinCan.Result) {
                    this.result = cfg.result;
                } else {
                    this.result = new TinCan.Result (cfg.result);
                }
            }
            if (cfg.hasOwnProperty("context")) {
                if (cfg.context instanceof TinCan.Context) {
                    this.context = cfg.context;
                } else {
                    this.context = new TinCan.Context (cfg.context);
                }
            }

            for (i = 0; i < directProps.length; i += 1) {
                if (cfg.hasOwnProperty(directProps[i]) && cfg[directProps[i]] !== null) {
                    this[directProps[i]] = cfg[directProps[i]];
                }
            }
        },

        /**
        @method toString
        @return {String} String representation of the statement
        */
        toString: function (lang) {
            this.log("toString");
            return (this.actor !== null ? this.actor.toString(lang) : "") +
                    " " +
                    (this.verb !== null ? this.verb.toString(lang) : "") +
                    " " +
                    (this.target !== null ? this.target.toString(lang) : "");
        },

        /**
        @method asVersion
        @param {String} [version] Version to return (defaults to newest supported)
        */
        asVersion: function (version) {
            this.log("asVersion");
            var result,
                optionalDirectProps = [
                    "timestamp"
                ],
                optionalObjProps = [
                    "actor",
                    "verb",
                    "result",
                    "context"
                ],
                i;

            result = {
                objectType: this.objectType
            };
            version = version || TinCan.versions()[0];

            for (i = 0; i < optionalDirectProps.length; i += 1) {
                if (this[optionalDirectProps[i]] !== null) {
                    result[optionalDirectProps[i]] = this[optionalDirectProps[i]];
                }
            }
            for (i = 0; i < optionalObjProps.length; i += 1) {
                if (this[optionalObjProps[i]] !== null) {
                    result[optionalObjProps[i]] = this[optionalObjProps[i]].asVersion(version);
                }
            }
            if (this.target !== null) {
                result.object = this.target.asVersion(version);
            }

            if (version === "0.9") {
                result.objectType = "Statement";
            }

            return result;
        }
    };

    /**
    @method fromJSON
    @return {Object} SubStatement
    @static
    */
    SubStatement.fromJSON = function (subStJSON) {
        SubStatement.prototype.log("fromJSON");
        var _subSt = JSON.parse(subStJSON);

        return new SubStatement(_subSt);
    };
}());

/*
    Copyright 2012-3 Rustici Software

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/**
TinCan client library

@module TinCan
@submodule TinCan.Statement
**/
(function () {
    "use strict";

    /**
    @class TinCan.Statement
    @constructor
    @param {Object} [cfg] Values to set in properties
        @param {String} [cfg.id] Statement ID (UUID)
        @param {TinCan.Agent} [cfg.actor] Actor of statement
        @param {TinCan.Verb} [cfg.verb] Verb of statement
        @param {TinCan.Activity|TinCan.Agent|TinCan.Group|TinCan.StatementRef|TinCan.SubStatement} [cfg.object] Alias for 'target'
        @param {TinCan.Activity|TinCan.Agent|TinCan.Group|TinCan.StatementRef|TinCan.SubStatement} [cfg.target] Object of statement
        @param {TinCan.Result} [cfg.result] Statement Result
        @param {TinCan.Context} [cfg.context] Statement Context
        @param {TinCan.Agent} [cfg.authority] Statement Authority
        @param {TinCan.Attachment} [cfg.attachments] Statement Attachments
        @param {String} [cfg.timestamp] ISO8601 Date/time value
        @param {String} [cfg.stored] ISO8601 Date/time value
        @param {String} [cfg.version] Version of the statement (post 0.95)
    @param {Object} [initCfg] Configuration of initialization process
        @param {Integer} [initCfg.storeOriginal] Whether to store a JSON stringified version
            of the original options object, pass number of spaces used for indent
        @param {Boolean} [initCfg.doStamp] Whether to automatically set the 'id' and 'timestamp'
            properties (default: true)
    **/
    var Statement = TinCan.Statement = function (cfg, initCfg) {
        this.log("constructor");

        // check for true value for API backwards compat
        if (typeof initCfg === "number") {
            initCfg = {
                storeOriginal: initCfg
            };
        } else {
            initCfg = initCfg || {};
        }
        if (typeof initCfg.storeOriginal === "undefined") {
            initCfg.storeOriginal = null;
        }
        if (typeof initCfg.doStamp === "undefined") {
            initCfg.doStamp = true;
        }

        /**
        @property id
        @type String
        */
        this.id = null;

        /**
        @property actor
        @type TinCan.Agent|TinCan.Group|null
        */
        this.actor = null;

        /**
        @property verb
        @type TinCan.Verb|null
        */
        this.verb = null;

        /**
        @property target
        @type TinCan.Activity|TinCan.Agent|TinCan.Group|TinCan.StatementRef|TinCan.SubStatement|null
        */
        this.target = null;

        /**
        @property result
        @type Object
        */
        this.result = null;

        /**
        @property context
        @type Object
        */
        this.context = null;

        /**
        @property timestamp
        @type String
        */
        this.timestamp = null;

        /**
        @property stored
        @type String
        */
        this.stored = null;

        /**
        @property authority
        @type TinCan.Agent|null
        */
        this.authority = null;

        /**
        @property attachments
        @type Array of TinCan.Attachment
        */
        this.attachments = null;

        /**
        @property version
        @type String
        */
        this.version = null;

        /**
        @property degraded
        @type Boolean
        @default false
        */
        this.degraded = false;

        /**
        @property voided
        @type Boolean
        @default null
        @deprecated
        */
        this.voided = null;

        /**
        @property inProgress
        @type Boolean
        @deprecated
        */
        this.inProgress = null;

        /**
        @property originalJSON
        @type String
        */
        this.originalJSON = null;

        this.init(cfg, initCfg);
    };

    Statement.prototype = {
        /**
        @property LOG_SRC
        */
        LOG_SRC: "Statement",

        /**
        @method log
        */
        log: TinCan.prototype.log,

        /**
        @method init
        @param {Object} [properties] Configuration used to set properties (see constructor)
        @param {Object} [cfg] Configuration used to initialize (see constructor)
        */
        init: function (cfg, initCfg) {
            this.log("init");
            var i,
                directProps = [
                    "id",
                    "stored",
                    "timestamp",
                    "version",
                    "inProgress",
                    "voided"
                ];

            cfg = cfg || {};

            if (initCfg.storeOriginal) {
                this.originalJSON = JSON.stringify(cfg, null, initCfg.storeOriginal);
            }

            if (cfg.hasOwnProperty("object")) {
                cfg.target = cfg.object;
            }

            if (cfg.hasOwnProperty("actor")) {
                if (typeof cfg.actor.objectType === "undefined" || cfg.actor.objectType === "Person") {
                    cfg.actor.objectType = "Agent";
                }

                if (cfg.actor.objectType === "Agent") {
                    if (cfg.actor instanceof TinCan.Agent) {
                        this.actor = cfg.actor;
                    } else {
                        this.actor = new TinCan.Agent (cfg.actor);
                    }
                } else if (cfg.actor.objectType === "Group") {
                    if (cfg.actor instanceof TinCan.Group) {
                        this.actor = cfg.actor;
                    } else {
                        this.actor = new TinCan.Group (cfg.actor);
                    }
                }
            }
            if (cfg.hasOwnProperty("authority")) {
                if (typeof cfg.authority.objectType === "undefined" || cfg.authority.objectType === "Person") {
                    cfg.authority.objectType = "Agent";
                }

                if (cfg.authority.objectType === "Agent") {
                    if (cfg.authority instanceof TinCan.Agent) {
                        this.authority = cfg.authority;
                    } else {
                        this.authority = new TinCan.Agent (cfg.authority);
                    }
                } else if (cfg.authority.objectType === "Group") {
                    if (cfg.actor instanceof TinCan.Group) {
                        this.authority = cfg.authority;
                    } else {
                        this.authority = new TinCan.Group (cfg.authority);
                    }
                }
            }
            if (cfg.hasOwnProperty("verb")) {
                if (cfg.verb instanceof TinCan.Verb) {
                    this.verb = cfg.verb;
                } else {
                    this.verb = new TinCan.Verb (cfg.verb);
                }
            }
            if (cfg.hasOwnProperty("target")) {
                if (cfg.target instanceof TinCan.Activity ||
                    cfg.target instanceof TinCan.Agent ||
                    cfg.target instanceof TinCan.Group ||
                    cfg.target instanceof TinCan.SubStatement ||
                    cfg.target instanceof TinCan.StatementRef
                ) {
                    this.target = cfg.target;
                } else {
                    if (typeof cfg.target.objectType === "undefined") {
                        cfg.target.objectType = "Activity";
                    }

                    if (cfg.target.objectType === "Activity") {
                        this.target = new TinCan.Activity (cfg.target);
                    } else if (cfg.target.objectType === "Agent") {
                        this.target = new TinCan.Agent (cfg.target);
                    } else if (cfg.target.objectType === "Group") {
                        this.target = new TinCan.Group (cfg.target);
                    } else if (cfg.target.objectType === "SubStatement") {
                        this.target = new TinCan.SubStatement (cfg.target);
                    } else if (cfg.target.objectType === "StatementRef") {
                        this.target = new TinCan.StatementRef (cfg.target);
                    } else {
                        this.log("Unrecognized target type: " + cfg.target.objectType);
                    }
                }
            }
            if (cfg.hasOwnProperty("result")) {
                if (cfg.result instanceof TinCan.Result) {
                    this.result = cfg.result;
                } else {
                    this.result = new TinCan.Result (cfg.result);
                }
            }
            if (cfg.hasOwnProperty("context")) {
                if (cfg.context instanceof TinCan.Context) {
                    this.context = cfg.context;
                } else {
                    this.context = new TinCan.Context (cfg.context);
                }
            }
            if (cfg.hasOwnProperty("attachments") && cfg.attachments !== null) {
                this.attachments = [];
                for (i = 0; i < cfg.attachments.length; i += 1) {
                    if (! (cfg.attachments[i] instanceof TinCan.Attachment)) {
                        this.attachments.push(new TinCan.Attachment (cfg.attachments[i]));
                    }
                    else {
                        this.attachments.push(cfg.attachments[i]);
                    }
                }
            }

            for (i = 0; i < directProps.length; i += 1) {
                if (cfg.hasOwnProperty(directProps[i]) && cfg[directProps[i]] !== null) {
                    this[directProps[i]] = cfg[directProps[i]];
                }
            }

            if (initCfg.doStamp) {
                this.stamp();
            }
        },

        /**
        @method toString
        @return {String} String representation of the statement
        */
        toString: function (lang) {
            this.log("toString");
            return (this.actor !== null ? this.actor.toString(lang) : "") +
                    " " +
                    (this.verb !== null ? this.verb.toString(lang) : "") +
                    " " +
                    (this.target !== null ? this.target.toString(lang) : "");
        },

        /**
        @method asVersion
        @param {String} [version] Version to return (defaults to newest supported)
        */
        asVersion: function (version) {
            this.log("asVersion");
            var result = {},
                optionalDirectProps = [
                    "id",
                    "timestamp"
                ],
                optionalObjProps = [
                    "actor",
                    "verb",
                    "result",
                    "context",
                    "authority"
                ],
                i;

            version = version || TinCan.versions()[0];

            for (i = 0; i < optionalDirectProps.length; i += 1) {
                if (this[optionalDirectProps[i]] !== null) {
                    result[optionalDirectProps[i]] = this[optionalDirectProps[i]];
                }
            }
            for (i = 0; i < optionalObjProps.length; i += 1) {
                if (this[optionalObjProps[i]] !== null) {
                    result[optionalObjProps[i]] = this[optionalObjProps[i]].asVersion(version);
                }
            }
            if (this.target !== null) {
                result.object = this.target.asVersion(version);
            }

            if (version === "0.9" || version === "0.95") {
                if (this.voided !== null) {
                    result.voided = this.voided;
                }
            }
            if (version === "0.9" && this.inProgress !== null) {
                result.inProgress = this.inProgress;
            }
            if (this.attachments !== null) {
                if (! (version === "0.9" || version === "0.95")) {
                    result.attachments = [];
                    for (i = 0; i < this.attachments.length; i += 1) {
                        if (this.attachments[i] instanceof TinCan.Attachment) {
                            result.attachments.push(this.attachments[i].asVersion(version));
                        }
                        else {
                            result.attachments.push(new TinCan.Attachment(this.attachments[i]).asVersion(version));
                        }
                    }
                }
            }

            return result;
        },

        /**
        Sets 'id' and 'timestamp' properties if not already set

        @method stamp
        */
        stamp: function () {
            this.log("stamp");
            if (this.id === null) {
                this.id = TinCan.Utils.getUUID();
            }
            if (this.timestamp === null) {
                this.timestamp = TinCan.Utils.getISODateString(new Date());
            }
        },

        /**
        Checks if the Statement has at least one attachment with content

        @method hasAttachmentsWithContent
        */
        hasAttachmentWithContent: function () {
            this.log("hasAttachmentWithContent");
            var i;

            if (this.attachments === null) {
                return false;
            }

            for (i = 0; i < this.attachments.length; i += 1) {
                if (this.attachments[i].content !== null) {
                    return true;
                }
            }

            return false;
        }
    };

    /**
    @method fromJSON
    @return {Object} Statement
    @static
    */
    Statement.fromJSON = function (stJSON) {
        Statement.prototype.log("fromJSON");
        var _st = JSON.parse(stJSON);

        return new Statement(_st);
    };
}());

/*
    Copyright 2012 Rustici Software

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/**
TinCan client library

@module TinCan
@submodule TinCan.StatementsResult
**/
(function () {
    "use strict";

    /**
    @class TinCan.StatementsResult
    @constructor
    @param {Object} options Configuration used to initialize.
        @param {Array} options.statements Actor of statement
        @param {String} options.more URL to fetch more data
    **/
    var StatementsResult = TinCan.StatementsResult = function (cfg) {
        this.log("constructor");

        /**
        @property statements
        @type Array
        */
        this.statements = null;

        /**
        @property more
        @type String
        */
        this.more = null;

        this.init(cfg);
    };

    StatementsResult.prototype = {
        /**
        @property LOG_SRC
        */
        LOG_SRC: "StatementsResult",

        /**
        @method log
        */
        log: TinCan.prototype.log,

        /**
        @method init
        @param {Object} [options] Configuration used to initialize
        */
        init: function (cfg) {
            this.log("init");

            cfg = cfg || {};

            if (cfg.hasOwnProperty("statements")) {
                this.statements = cfg.statements;
            }
            if (cfg.hasOwnProperty("more")) {
                this.more = cfg.more;
            }
        }
    };

    /**
    @method fromJSON
    @return {Object} Agent
    @static
    */
    StatementsResult.fromJSON = function (resultJSON) {
        StatementsResult.prototype.log("fromJSON");
        var _result,
            stmts = [],
            stmt,
            i
        ;

        try {
            _result = JSON.parse(resultJSON);
        } catch (parseError) {
            StatementsResult.prototype.log("fromJSON - JSON.parse error: " + parseError);
        }

        if (_result) {
            for (i = 0; i < _result.statements.length; i += 1) {
                try {
                    stmt = new TinCan.Statement (_result.statements[i], 4);
                } catch (error) {
                    StatementsResult.prototype.log("fromJSON - statement instantiation failed: " + error + " (" + JSON.stringify(_result.statements[i]) + ")");

                    stmt = new TinCan.Statement (
                        {
                            id: _result.statements[i].id
                        },
                        4
                    );
                }

                stmts.push(stmt);
            }
            _result.statements = stmts;
        }

        return new StatementsResult (_result);
    };
}());

/*
    Copyright 2012 Rustici Software

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/**
TinCan client library

@module TinCan
@submodule TinCan.State
**/
(function () {
    "use strict";

    /**
    @class TinCan.State
    @constructor
    */
    var State = TinCan.State = function (cfg) {
        this.log("constructor");

        /**
        @property id
        @type String
        */
        this.id = null;

        /**
        @property updated
        @type Boolean
        */
        this.updated = null;

        /**
        @property contents
        @type String
        */
        this.contents = null;

        /**
        @property etag
        @type String
        */
        this.etag = null;

        /**
        @property contentType
        @type String
        */
        this.contentType = null;

        this.init(cfg);
    };
    State.prototype = {
        /**
        @property LOG_SRC
        */
        LOG_SRC: "State",

        /**
        @method log
        */
        log: TinCan.prototype.log,

        /**
        @method init
        @param {Object} [options] Configuration used to initialize
        */
        init: function (cfg) {
            this.log("init");
            var i,
                directProps = [
                    "id",
                    "contents",
                    "etag",
                    "contentType"
                ];

            cfg = cfg || {};

            for (i = 0; i < directProps.length; i += 1) {
                if (cfg.hasOwnProperty(directProps[i]) && cfg[directProps[i]] !== null) {
                    this[directProps[i]] = cfg[directProps[i]];
                }
            }

            this.updated = false;
        }
    };

    /**
    @method fromJSON
    @return {Object} State
    @static
    */
    State.fromJSON = function (stateJSON) {
        State.prototype.log("fromJSON");
        var _state = JSON.parse(stateJSON);

        return new State(_state);
    };
}());

/*
    Copyright 2012 Rustici Software

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/**
TinCan client library

@module TinCan
@submodule TinCan.ActivityProfile
**/
(function () {
    "use strict";

    /**
    @class TinCan.ActivityProfile
    @constructor
    */
    var ActivityProfile = TinCan.ActivityProfile = function (cfg) {
        this.log("constructor");

        /**
        @property id
        @type String
        */
        this.id = null;

        /**
        @property activity
        @type TinCan.Activity
        */
        this.activity = null;

        /**
        @property updated
        @type String
        */
        this.updated = null;

        /**
        @property contents
        @type String
        */
        this.contents = null;

        /**
        SHA1 of contents as provided by the server during last fetch,
        this should be passed through to saveActivityProfile

        @property etag
        @type String
        */
        this.etag = null;

        /**
        @property contentType
        @type String
        */
        this.contentType = null;

        this.init(cfg);
    };
    ActivityProfile.prototype = {
        /**
        @property LOG_SRC
        */
        LOG_SRC: "ActivityProfile",

        /**
        @method log
        */
        log: TinCan.prototype.log,

        /**
        @method init
        @param {Object} [options] Configuration used to initialize
        */
        init: function (cfg) {
            this.log("init");
            var i,
                directProps = [
                    "id",
                    "contents",
                    "etag",
                    "contentType"
                ];

            cfg = cfg || {};

            if (cfg.hasOwnProperty("activity")) {
                if (cfg.activity instanceof TinCan.Activity) {
                    this.activity = cfg.activity;
                }
                else {
                    this.activity = new TinCan.Activity (cfg.activity);
                }
            }

            for (i = 0; i < directProps.length; i += 1) {
                if (cfg.hasOwnProperty(directProps[i]) && cfg[directProps[i]] !== null) {
                    this[directProps[i]] = cfg[directProps[i]];
                }
            }

            this.updated = false;
        }
    };

    /**
    @method fromJSON
    @return {Object} ActivityProfile
    @static
    */
    ActivityProfile.fromJSON = function (stateJSON) {
        ActivityProfile.prototype.log("fromJSON");
        var _state = JSON.parse(stateJSON);

        return new ActivityProfile(_state);
    };
}());

/*
    Copyright 2013 Rustici Software

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/**
TinCan client library

@module TinCan
@submodule TinCan.AgentProfile
**/
(function () {
    "use strict";

    /**
    @class TinCan.AgentProfile
    @constructor
    */
    var AgentProfile = TinCan.AgentProfile = function (cfg) {
        this.log("constructor");

        /**
        @property id
        @type String
        */
        this.id = null;

        /**
        @property agent
        @type TinCan.Agent
        */
        this.agent = null;

        /**
        @property updated
        @type String
        */
        this.updated = null;

        /**
        @property contents
        @type String
        */
        this.contents = null;

        /**
        SHA1 of contents as provided by the server during last fetch,
        this should be passed through to saveAgentProfile

        @property etag
        @type String
        */
        this.etag = null;

        /**
        @property contentType
        @type String
        */
        this.contentType = null;

        this.init(cfg);
    };
    AgentProfile.prototype = {
        /**
        @property LOG_SRC
        */
        LOG_SRC: "AgentProfile",

        /**
        @method log
        */
        log: TinCan.prototype.log,

        /**
        @method init
        @param {Object} [options] Configuration used to initialize
        */
        init: function (cfg) {
            this.log("init");
            var i,
                directProps = [
                    "id",
                    "contents",
                    "etag",
                    "contentType"
                ];

            cfg = cfg || {};

            if (cfg.hasOwnProperty("agent")) {
                if (cfg.agent instanceof TinCan.Agent) {
                    this.agent = cfg.agent;
                }
                else {
                    this.agent = new TinCan.Agent (cfg.agent);
                }
            }

            for (i = 0; i < directProps.length; i += 1) {
                if (cfg.hasOwnProperty(directProps[i]) && cfg[directProps[i]] !== null) {
                    this[directProps[i]] = cfg[directProps[i]];
                }
            }

            this.updated = false;
        }
    };

    /**
    @method fromJSON
    @return {Object} AgentProfile
    @static
    */
    AgentProfile.fromJSON = function (stateJSON) {
        AgentProfile.prototype.log("fromJSON");
        var _state = JSON.parse(stateJSON);

        return new AgentProfile(_state);
    };
}());

/*
    Copyright 2014 Rustici Software

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/**
TinCan client library

@module TinCan
@submodule TinCan.About
**/
(function () {
    "use strict";

    /**
    @class TinCan.About
    @constructor
    */
    var About = TinCan.About = function (cfg) {
        this.log("constructor");

        /**
        @property version
        @type {String[]}
        */
        this.version = null;

        this.init(cfg);
    };
    About.prototype = {
        /**
        @property LOG_SRC
        */
        LOG_SRC: "About",

        /**
        @method log
        */
        log: TinCan.prototype.log,

        /**
        @method init
        @param {Object} [options] Configuration used to initialize
        */
        init: function (cfg) {
            this.log("init");
            var i,
                directProps = [
                    "version"
                ];

            cfg = cfg || {};

            for (i = 0; i < directProps.length; i += 1) {
                if (cfg.hasOwnProperty(directProps[i]) && cfg[directProps[i]] !== null) {
                    this[directProps[i]] = cfg[directProps[i]];
                }
            }
        }
    };

    /**
    @method fromJSON
    @return {Object} About
    @static
    */
    About.fromJSON = function (aboutJSON) {
        About.prototype.log("fromJSON");
        var _about = JSON.parse(aboutJSON);

        return new About(_about);
    };
}());

/*
    Copyright 2016 Rustici Software

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/**
TinCan client library

@module TinCan
@submodule TinCan.Attachment
**/
(function () {
    "use strict";

    /**
    @class TinCan.Attachment
    @constructor
    */
    var Attachment = TinCan.Attachment = function (cfg) {
        this.log("constructor");

        /**
        @property usageType
        @type String
        */
        this.usageType = null;

        /**
        @property display
        @type Object
        */
        this.display = null;

        /**
        @property contentType
        @type String
        */
        this.contentType = null;

        /**
        @property length
        @type int
        */
        this.length = null;

        /**
        @property sha2
        @type String
        */
        this.sha2 = null;

        /**
        @property description
        @type Object
        */
        this.description = null;

        /**
        @property fileUrl
        @type String
        */
        this.fileUrl = null;

        /**
        @property content
        @type ArrayBuffer
        */
        this.content = null;

        this.init(cfg);
    };
    Attachment.prototype = {
        /**
        @property LOG_SRC
        */
        LOG_SRC: "Attachment",

        /**
        @method log
        */
        log: TinCan.prototype.log,

        /**
        @method init
        @param {Object} [options] Configuration used to initialize
        */
        init: function (cfg) {
            this.log("init");
            var i,
                directProps = [
                    "contentType",
                    "length",
                    "sha2",
                    "usageType",
                    "display",
                    "description",
                    "fileUrl"
                ]
            ;

            cfg = cfg || {};

            for (i = 0; i < directProps.length; i += 1) {
                if (cfg.hasOwnProperty(directProps[i]) && cfg[directProps[i]] !== null) {
                    this[directProps[i]] = cfg[directProps[i]];
                }
            }

            if (cfg.hasOwnProperty("content") && cfg.content !== null) {
                if (typeof cfg.content === "string") {
                    this.setContentFromString(cfg.content);
                }
                else {
                    this.setContent(cfg.content);
                }
            }
        },

        /**
        @method asVersion
        @param {String} [version] Version to return (defaults to newest supported)
        */
        asVersion: function (version) {
            this.log("asVersion");
            var result;

            version = version || TinCan.versions()[0];

            if (version === "0.9" || version === "0.95") {
                result = null;
            }
            else {
                result = {
                    contentType: this.contentType,
                    display: this.display,
                    length: this.length,
                    sha2: this.sha2,
                    usageType: this.usageType
                };

                if (this.fileUrl !== null) {
                    result.fileUrl = this.fileUrl;
                }
                if (this.description !== null) {
                    result.description = this.description;
                }
            }

            return result;
        },

        /**
        See {{#crossLink "TinCan.Utils/getLangDictionaryValue"}}{{/crossLink}}

        @method getLangDictionaryValue
        */
        getLangDictionaryValue: TinCan.Utils.getLangDictionaryValue,

        /**
        @method setContent
        @param {ArrayBuffer} content Sets content from ArrayBuffer
        */
        setContent: function (content) {
            this.content = content;
            this.length = content.byteLength;
            this.sha2 = TinCan.Utils.getSHA256String(content);
        },

        /**
        @method setContentFromString
        @param {String} content Sets the content property of the attachment from a string
        */
        setContentFromString: function (content) {
            var _content = content;

            _content = TinCan.Utils.stringToArrayBuffer(content);

            this.setContent(_content);
        },

        /**
        @method getContentAsString
        @return {String} Value of content property as a string
        */
        getContentAsString: function () {
            return TinCan.Utils.stringFromArrayBuffer(this.content);
        }
    };

    /**
    @method fromJSON
    @return {Object} Attachment
    @static
    */
    Attachment.fromJSON = function (attachmentJSON) {
        Attachment.prototype.log("fromJSON");
        var _attachment = JSON.parse(attachmentJSON);

        return new Attachment(_attachment);
    };

    Attachment._defaultEncoding = "utf-8";
}());

/*
    Copyright 2012-2013 Rustici Software

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/**
TinCan client library

@module TinCan
@submodule TinCan.Environment.Browser
**/
(function () {
    /* globals window, XMLHttpRequest, XDomainRequest, Blob */
    "use strict";
    var LOG_SRC = "Environment.Browser",
        requestComplete,
        __IEModeConversion,
        nativeRequest,
        xdrRequest,
        __createJSONSegment,
        __createAttachmentSegment,
        __delay,
        env = {},
        log = TinCan.prototype.log;

    if (typeof window === "undefined") {
        log("'window' not defined", LOG_SRC);
        return;
    }

    /* Shims for browsers not supporting our needs, mainly IE */

    //
    // Make JSON safe for IE6
    // https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/JSON#Browser_compatibility
    //
    if (!window.JSON) {
        window.JSON = {
            parse: function (sJSON) {
                /*jslint evil: true */
                return eval("(" + sJSON + ")");
            },
            stringify: function (vContent) {
                var sOutput = "",
                    nId,
                    sProp
                ;
                if (vContent instanceof Object) {
                    if (vContent.constructor === Array) {
                        for (nId = 0; nId < vContent.length; nId += 1) {
                            sOutput += this.stringify(vContent[nId]) + ",";
                        }
                        return "[" + sOutput.substr(0, sOutput.length - 1) + "]";
                    }
                    if (vContent.toString !== Object.prototype.toString) { return "\"" + vContent.toString().replace(/"/g, "\\$&") + "\""; }
                    for (sProp in vContent) {
                        if (vContent.hasOwnProperty(sProp)) {
                            sOutput += "\"" + sProp.replace(/"/g, "\\$&") + "\":" + this.stringify(vContent[sProp]) + ",";
                        }
                    }
                    return "{" + sOutput.substr(0, sOutput.length - 1) + "}";
                }
                return typeof vContent === "string" ? "\"" + vContent.replace(/"/g, "\\$&") + "\"" : String(vContent);
            }
        };
    }

    //
    // Make Date.now safe for IE < 9
    // https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Date/now
    //
    if (!Date.now) {
        Date.now = function () {
            return +(new Date ());
        };
    }

    //
    // Add .forEach implementation for supporting our string encoding polyfill
    // imported from js-polyfills to avoid bringing in the whole es5 shim
    // for now, a rewrite probably moves all shims out of the main build or at
    // least Environment file and leverages more of them
    //

    // ES5 15.4.4.18 Array.prototype.forEach ( callbackfn [ , thisArg ] )
    // From https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/forEach
    if (!Array.prototype.forEach) {
      /* jshint freeze:false,bitwise:false */
      Array.prototype.forEach = function (fun /*, thisp */) {
        if (this === void 0 || this === null) { throw new TypeError(); }

        var t = Object(this);
        var len = t.length >>> 0;
        if (typeof fun !== "function") { throw new TypeError(); }

        var thisp = arguments[1], i;
        for (i = 0; i < len; i += 1) {
          if (i in t) {
            fun.call(thisp, t[i], i, t);
          }
        }
      };
    }

    /* Detect CORS and XDR support */
    env.hasCORS = false;
    env.useXDR = false;

    if (typeof XMLHttpRequest !== "undefined" && typeof (new XMLHttpRequest()).withCredentials !== "undefined") {
        env.hasCORS = true;
    }
    else if (typeof XDomainRequest !== "undefined") {
        env.hasCORS = true;
        env.useXDR = true;
    }

    // TODO: should we have our own internal "Request" object
    //       that replaces the need for "control"?

    //
    // Setup request callback
    //
    requestComplete = function (xhr, cfg, control) {
        log("requestComplete: " + control.finished + ", xhr.status: " + xhr.status, LOG_SRC);
        var requestCompleteResult,
            notFoundOk,
            httpStatus;

        //
        // XDomainRequest doesn't give us a way to get the status,
        // so allow passing in a forged one
        //
        if (typeof xhr.status === "undefined") {
            httpStatus = control.fakeStatus;
        }
        else {
            //
            // older versions of IE don't properly handle 204 status codes
            // so correct when receiving a 1223 to be 204 locally
            // http://stackoverflow.com/questions/10046972/msie-returns-status-code-of-1223-for-ajax-request
            //
            httpStatus = (xhr.status === 1223) ? 204 : xhr.status;
        }

        if (! control.finished) {
            // may be in sync or async mode, using XMLHttpRequest or IE XDomainRequest, onreadystatechange or
            // onload or both might fire depending upon browser, just covering all bases with event hooks and
            // using 'finished' flag to avoid triggering events multiple times
            control.finished = true;

            notFoundOk = (cfg.ignore404 && httpStatus === 404);
            if ((httpStatus >= 200 && httpStatus < 400) || notFoundOk) {
                if (cfg.callback) {
                    cfg.callback(null, xhr);
                }
                else {
                    requestCompleteResult = {
                        err: null,
                        xhr: xhr
                    };
                    return requestCompleteResult;
                }
            }
            else {
                requestCompleteResult = {
                    err: httpStatus,
                    xhr: xhr
                };
                if (httpStatus === 0) {
                    log("[warning] There was a problem communicating with the Learning Record Store. Aborted, offline, or invalid CORS endpoint (" + httpStatus + ")", LOG_SRC);
                }
                else {
                    log("[warning] There was a problem communicating with the Learning Record Store. (" + httpStatus + " | " + xhr.responseText+ ")", LOG_SRC);
                }
                if (cfg.callback) {
                    cfg.callback(httpStatus, xhr);
                }
                return requestCompleteResult;
            }
        }
        else {
            return requestCompleteResult;
        }
    };

    //
    // Converts an HTTP request cfg of above a set length (//MAX_REQUEST_LENGTH) to a post
    // request cfg, with the original request as the form data.
    //
    __IEModeConversion = function (fullUrl, headers, pairs, cfg) {
        var prop;

        // 'pairs' already holds the original cfg params, now needs headers and data
        // from the original cfg to add as the form data to the POST request
        for (prop in headers) {
            if (headers.hasOwnProperty(prop)) {
                pairs.push(prop + "=" + encodeURIComponent(headers[prop]));
            }
        }

        if (typeof cfg.data !== "undefined") {
            pairs.push("content=" + encodeURIComponent(cfg.data));
        }

        // the Authorization and xAPI version headers need to still be present, but
        // the content type must exist and be of type application/x-www-form-urlencoded
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        fullUrl += "?method=" + cfg.method;
        cfg.method = "POST";
        cfg.params = {};
        if (pairs.length > 0) {
            cfg.data = pairs.join("&");
        }
        return fullUrl;
    };

    //
    // one of the two of these is stuffed into the LRS' instance
    // as ._makeRequest
    //
    nativeRequest = function (fullUrl, headers, cfg) {
        /*global ActiveXObject*/
        log("sendRequest using XMLHttpRequest", LOG_SRC);
        var self = this,
            xhr,
            prop,
            pairs = [],
            data,
            control = {
                finished: false,
                fakeStatus: null
            },
            async = typeof cfg.callback !== "undefined",
            fullRequest = fullUrl,
            err,
            MAX_REQUEST_LENGTH = 2048
        ;
        log("sendRequest using XMLHttpRequest - async: " + async, LOG_SRC);

        for (prop in cfg.params) {
            if (cfg.params.hasOwnProperty(prop)) {
                pairs.push(prop + "=" + encodeURIComponent(cfg.params[prop]));
            }
        }

        if (pairs.length > 0) {
            fullRequest += "?" + pairs.join("&");
        }

        if (fullRequest.length >= MAX_REQUEST_LENGTH) {
            if (typeof cfg.method === "undefined") {
                err = new Error("method must not be undefined for an IE Mode Request conversion");
                if (typeof cfg.callback !== "undefined") {
                    cfg.callback(err, null);
                }
                return {
                    err: err,
                    xhr: null
                };
            }

            fullUrl = __IEModeConversion(fullUrl, headers, pairs, cfg);
        }
        else {
            fullUrl = fullRequest;
        }

        if (typeof XMLHttpRequest !== "undefined") {
            xhr = new XMLHttpRequest();
        }
        else {
            //
            // IE6 implements XMLHttpRequest through ActiveX control
            // http://blogs.msdn.com/b/ie/archive/2006/01/23/516393.aspx
            //
            xhr = new ActiveXObject("Microsoft.XMLHTTP");

            if (cfg.expectMultipart) {
                err = new Error("Attachment support not available");
                if (typeof cfg.callback !== "undefined") {
                    cfg.callback(err, null);
                }
                return {
                    err: err,
                    xhr: null
                };
            }
        }

        xhr.open(cfg.method, fullUrl, async);

        //
        // setting the .responseType before .open was causing IE to fail
        // with a StateError, so moved it to here
        //
        if (cfg.expectMultipart) {
            xhr.responseType = "arraybuffer";
        }

        for (prop in headers) {
            if (headers.hasOwnProperty(prop)) {
                xhr.setRequestHeader(prop, headers[prop]);
            }
        }

        data = cfg.data;

        if (async) {
            xhr.onreadystatechange = function () {
                log("xhr.onreadystatechange - xhr.readyState: " + xhr.readyState, LOG_SRC);
                if (xhr.readyState === 4) {
                    requestComplete.call(self, xhr, cfg, control);
                }
            };
        }

        //
        // research indicates that IE is known to just throw exceptions
        // on .send and it seems everyone pretty much just ignores them
        // including jQuery (https://github.com/jquery/jquery/blob/1.10.2/src/ajax.js#L549
        // https://github.com/jquery/jquery/blob/1.10.2/src/ajax/xhr.js#L97)
        //
        try {
            xhr.send(data);
        }
        catch (ex) {
            log("sendRequest caught send exception: " + ex, LOG_SRC);
        }

        if (async) {
            //
            // for async requests give them the XHR object directly
            // as the return value, the actual stuff they should be
            // caring about is params to the callback, for sync
            // requests they got the return value above
            //
            return xhr;
        }

        return requestComplete.call(this, xhr, cfg, control);
    };
    xdrRequest = function (fullUrl, headers, cfg) {
        log("sendRequest using XDomainRequest", LOG_SRC);
        var self = this,
            xhr,
            pairs = [],
            data,
            prop,
            until,
            control = {
                finished: false,
                fakeStatus: null
            },
            err;

        if (cfg.expectMultipart) {
            err = new Error("Attachment support not available");
            if (typeof cfg.callback !== "undefined") {
                cfg.callback(err, null);
            }
            return {
                err: err,
                xhr: null
            };
        }

        // method has to go on querystring, and nothing else,
        // and the actual method is then always POST
        fullUrl += "?method=" + cfg.method;

        // params end up in the body
        for (prop in cfg.params) {
            if (cfg.params.hasOwnProperty(prop)) {
                pairs.push(prop + "=" + encodeURIComponent(cfg.params[prop]));
            }
        }

        // headers go into form data
        for (prop in headers) {
            if (headers.hasOwnProperty(prop)) {
                pairs.push(prop + "=" + encodeURIComponent(headers[prop]));
            }
        }

        // the original data is repackaged as "content" form var
        if (typeof cfg.data !== "undefined") {
            pairs.push("content=" + encodeURIComponent(cfg.data));
        }

        data = pairs.join("&");

        xhr = new XDomainRequest ();
        xhr.open("POST", fullUrl);

        if (! cfg.callback) {
            xhr.onload = function () {
                control.fakeStatus = 200;
            };
            xhr.onerror = function () {
                control.fakeStatus = 400;
            };
            xhr.ontimeout = function () {
                control.fakeStatus = 0;
            };
        }
        else {
            xhr.onload = function () {
                control.fakeStatus = 200;
                requestComplete.call(self, xhr, cfg, control);
            };
            xhr.onerror = function () {
                control.fakeStatus = 400;
                requestComplete.call(self, xhr, cfg, control);
            };
            xhr.ontimeout = function () {
                control.fakeStatus = 0;
                requestComplete.call(self, xhr, cfg, control);
            };
        }

        // IE likes to randomly abort requests when some handlers
        // aren't defined, so define them with no-ops, see:
        //
        // http://cypressnorth.com/programming/internet-explorer-aborting-ajax-requests-fixed/
        // http://social.msdn.microsoft.com/Forums/ie/en-US/30ef3add-767c-4436-b8a9-f1ca19b4812e/ie9-rtm-xdomainrequest-issued-requests-may-abort-if-all-event-handlers-not-specified
        //
        xhr.onprogress = function () {};
        xhr.timeout = 0;

        //
        // research indicates that IE is known to just throw exceptions
        // on .send and it seems everyone pretty much just ignores them
        // including jQuery (https://github.com/jquery/jquery/blob/1.10.2/src/ajax.js#L549
        // https://github.com/jquery/jquery/blob/1.10.2/src/ajax/xhr.js#L97)
        //
        try {
            xhr.send(data);
        }
        catch (ex) {
            log("sendRequest caught send exception: " + ex, LOG_SRC);
        }

        if (! cfg.callback) {
            // synchronous call in IE, with no synchronous mode available
            until = 10000 + Date.now();
            log("sendRequest - until: " + until + ", finished: " + control.finished, LOG_SRC);

            while (Date.now() < until && control.fakeStatus === null) {
                //log("calling __delay", LOG_SRC);
                __delay();
            }
            return requestComplete.call(self, xhr, cfg, control);
        }

        //
        // for async requests give them the XHR object directly
        // as the return value, the actual stuff they should be
        // caring about is params to the callback, for sync
        // requests they got the return value above
        //
        return xhr;
    };

    //
    // Override LRS' init method to set up our request handling
    // capabilities
    //
    TinCan.LRS.prototype._initByEnvironment = function (cfg) {
        /*jslint regexp: true, laxbreak: true */
        /* globals location */
        log("_initByEnvironment", LOG_SRC);
        var urlParts,
            schemeMatches,
            locationPort,
            isXD
        ;

        cfg = cfg || {};

        //
        // default to native request mode
        //
        this._makeRequest = nativeRequest;

        //
        // overload LRS ._IEModeConversion to be able to test this method,
        // which only applies in a browser setting
        //
        this._IEModeConversion = __IEModeConversion;

        urlParts = this.endpoint.toLowerCase().match(/([A-Za-z]+:)\/\/([^:\/]+):?(\d+)?(\/.*)?$/);
        if (urlParts === null) {
            log("[error] LRS invalid: failed to divide URL parts", LOG_SRC);
            throw {
                code: 4,
                mesg: "LRS invalid: failed to divide URL parts"
            };
        }

        //
        // determine whether this is a cross domain request,
        // whether our browser has CORS support at all, and then
        // if it does then if we are in IE with XDR only check that
        // the schemes match to see if we should be able to talk to
        // the LRS
        //
        locationPort = location.port;
        schemeMatches = location.protocol.toLowerCase() === urlParts[1];

        //
        // normalize the location.port cause it appears to be "" when 80/443
        // but our endpoint may have provided it
        //
        if (locationPort === "") {
            locationPort = (location.protocol.toLowerCase() === "http:" ? "80" : (location.protocol.toLowerCase() === "https:" ? "443" : ""));
        }

        isXD = (
            // is same scheme?
            ! schemeMatches

            // is same host?
            || location.hostname.toLowerCase() !== urlParts[2]

            // is same port?
            || locationPort !== (
                (urlParts[3] !== null && typeof urlParts[3] !== "undefined" && urlParts[3] !== "") ? urlParts[3] : (urlParts[1] === "http:" ? "80" : (urlParts[1] === "https:" ? "443" : ""))
            )
        );
        if (isXD) {
            if (env.hasCORS) {
                if (env.useXDR && schemeMatches) {
                    this._makeRequest = xdrRequest;
                }
                else if (env.useXDR && ! schemeMatches) {
                    if (cfg.allowFail) {
                        log("[warning] LRS invalid: cross domain request for differing scheme in IE with XDR (allowed to fail)", LOG_SRC);
                    }
                    else {
                        log("[error] LRS invalid: cross domain request for differing scheme in IE with XDR", LOG_SRC);
                        throw {
                            code: 2,
                            mesg: "LRS invalid: cross domain request for differing scheme in IE with XDR"
                        };
                    }
                }
            }
            else {
                if (cfg.allowFail) {
                    log("[warning] LRS invalid: cross domain requests not supported in this browser (allowed to fail)", LOG_SRC);
                }
                else {
                    log("[error] LRS invalid: cross domain requests not supported in this browser", LOG_SRC);
                    throw {
                        code: 1,
                        mesg: "LRS invalid: cross domain requests not supported in this browser"
                    };
                }
            }
        }
    };

    /**
    Non-environment safe method used to create a delay to give impression
    of synchronous response (for IE, shocker)

    @method __delay
    @private
    */
    __delay = function () {
        //
        // use a synchronous request to the current location to allow the browser
        // to yield to the asynchronous request's events but still block in the
        // outer loop to make it seem synchronous to the end user
        //
        // removing this made the while loop too tight to allow the asynchronous
        // events through to get handled so that the response was correctly handled
        //
        var xhr = new XMLHttpRequest (),
            url = window.location + "?forcenocache=" + TinCan.Utils.getUUID()
        ;
        xhr.open("GET", url, false);
        xhr.send(null);
    };

    //
    // Synchronous xhr handling is accepted in the browser environment
    //
    TinCan.LRS.syncEnabled = true;

    TinCan.LRS.prototype._getMultipartRequestData = function (boundary, jsonContent, requestAttachments) {
        var parts = [],
            i;

        parts.push(
            __createJSONSegment(
                boundary,
                jsonContent
            )
        );
        for (i = 0; i < requestAttachments.length; i += 1) {
            if (requestAttachments[i].content !== null) {
                parts.push(
                    __createAttachmentSegment(
                        boundary,
                        requestAttachments[i].content,
                        requestAttachments[i].sha2,
                        requestAttachments[i].contentType
                    )
                );
            }
        }
        parts.push("\r\n--" + boundary + "--\r\n");

        return new Blob(parts);
    };

    __createJSONSegment = function (boundary, jsonContent) {
        var content = [
                "--" + boundary,
                "Content-Type: application/json",
                "",
                JSON.stringify(jsonContent)
            ].join("\r\n");

        content += "\r\n";

        return content;
    };

    __createAttachmentSegment = function (boundary, content, sha2, contentType) {
        var blobParts = [],
            header = [
                "--" + boundary,
                "Content-Type: " + contentType,
                "Content-Transfer-Encoding: binary",
                "X-Experience-API-Hash: " + sha2
            ].join("\r\n");

        header += "\r\n\r\n";

        blobParts.push(header);
        blobParts.push(content);

        return new Blob(blobParts);
    };

    TinCan.Utils.stringToArrayBuffer = function (content, encoding) {
        /* global TextEncoder */
        var encoder;

        if (! encoding) {
            encoding = TinCan.Utils.defaultEncoding;
        }

        encoder = new TextEncoder(encoding);

        return encoder.encode(content).buffer;
    };

    TinCan.Utils.stringFromArrayBuffer = function (content, encoding) {
        /* global TextDecoder */
        var decoder;

        if (! encoding) {
            encoding = TinCan.Utils.defaultEncoding;
        }

        decoder = new TextDecoder(encoding);

        return decoder.decode(content);
    };
}());

/*
 Copyright (c) 2010, Linden Research, Inc.
 Copyright (c) 2014, Joshua Bell

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 $/LicenseInfo$
 */

// Original can be found at:
//   https://bitbucket.org/lindenlab/llsd
// Modifications by Joshua Bell inexorabletash@gmail.com
//   https://github.com/inexorabletash/polyfill

// ES3/ES5 implementation of the Krhonos Typed Array Specification
//   Ref: http://www.khronos.org/registry/typedarray/specs/latest/
//   Date: 2011-02-01
//
// Variations:
//  * Allows typed_array.get/set() as alias for subscripts (typed_array[])
//  * Gradually migrating structure from Khronos spec to ES2015 spec
//
// Caveats:
//  * Beyond 10000 or so entries, polyfilled array accessors (ta[0],
//    etc) become memory-prohibitive, so array creation will fail. Set
//    self.TYPED_ARRAY_POLYFILL_NO_ARRAY_ACCESSORS=true to disable
//    creation of accessors. Your code will need to use the
//    non-standard get()/set() instead, and will need to add those to
//    native arrays for interop.
(function(global) {
  'use strict';
  var undefined = (void 0); // Paranoia

  // Beyond this value, index getters/setters (i.e. array[0], array[1]) are so slow to
  // create, and consume so much memory, that the browser appears frozen.
  var MAX_ARRAY_LENGTH = 1e5;

  // Approximations of internal ECMAScript conversion functions
  function Type(v) {
    switch(typeof v) {
    case 'undefined': return 'undefined';
    case 'boolean': return 'boolean';
    case 'number': return 'number';
    case 'string': return 'string';
    default: return v === null ? 'null' : 'object';
    }
  }

  // Class returns internal [[Class]] property, used to avoid cross-frame instanceof issues:
  function Class(v) { return Object.prototype.toString.call(v).replace(/^\[object *|\]$/g, ''); }
  function IsCallable(o) { return typeof o === 'function'; }
  function ToObject(v) {
    if (v === null || v === undefined) throw TypeError();
    return Object(v);
  }
  function ToInt32(v) { return v >> 0; }
  function ToUint32(v) { return v >>> 0; }

  // Snapshot intrinsics
  var LN2 = Math.LN2,
      abs = Math.abs,
      floor = Math.floor,
      log = Math.log,
      max = Math.max,
      min = Math.min,
      pow = Math.pow,
      round = Math.round;

  // emulate ES5 getter/setter API using legacy APIs
  // http://blogs.msdn.com/b/ie/archive/2010/09/07/transitioning-existing-code-to-the-es5-getter-setter-apis.aspx
  // (second clause tests for Object.defineProperty() in IE<9 that only supports extending DOM prototypes, but
  // note that IE<9 does not support __defineGetter__ or __defineSetter__ so it just renders the method harmless)

  (function() {
    var orig = Object.defineProperty;
    var dom_only = !(function(){try{return Object.defineProperty({},'x',{});}catch(_){return false;}}());

    if (!orig || dom_only) {
      Object.defineProperty = function (o, prop, desc) {
        // In IE8 try built-in implementation for defining properties on DOM prototypes.
        if (orig)
          try { return orig(o, prop, desc); } catch (_) {}
        if (o !== Object(o))
          throw TypeError('Object.defineProperty called on non-object');
        if (Object.prototype.__defineGetter__ && ('get' in desc))
          Object.prototype.__defineGetter__.call(o, prop, desc.get);
        if (Object.prototype.__defineSetter__ && ('set' in desc))
          Object.prototype.__defineSetter__.call(o, prop, desc.set);
        if ('value' in desc)
          o[prop] = desc.value;
        return o;
      };
    }
  }());

  // ES5: Make obj[index] an alias for obj._getter(index)/obj._setter(index, value)
  // for index in 0 ... obj.length
  function makeArrayAccessors(obj) {
    if ('TYPED_ARRAY_POLYFILL_NO_ARRAY_ACCESSORS' in global)
      return;

    if (obj.length > MAX_ARRAY_LENGTH) throw RangeError('Array too large for polyfill');

    function makeArrayAccessor(index) {
      Object.defineProperty(obj, index, {
        'get': function() { return obj._getter(index); },
        'set': function(v) { obj._setter(index, v); },
        enumerable: true,
        configurable: false
      });
    }

    var i;
    for (i = 0; i < obj.length; i += 1) {
      makeArrayAccessor(i);
    }
  }

  // Internal conversion functions:
  //    pack<Type>()   - take a number (interpreted as Type), output a byte array
  //    unpack<Type>() - take a byte array, output a Type-like number

  function as_signed(value, bits) { var s = 32 - bits; return (value << s) >> s; }
  function as_unsigned(value, bits) { var s = 32 - bits; return (value << s) >>> s; }

  function packI8(n) { return [n & 0xff]; }
  function unpackI8(bytes) { return as_signed(bytes[0], 8); }

  function packU8(n) { return [n & 0xff]; }
  function unpackU8(bytes) { return as_unsigned(bytes[0], 8); }

  function packU8Clamped(n) { n = round(Number(n)); return [n < 0 ? 0 : n > 0xff ? 0xff : n & 0xff]; }

  function packI16(n) { return [n & 0xff, (n >> 8) & 0xff]; }
  function unpackI16(bytes) { return as_signed(bytes[1] << 8 | bytes[0], 16); }

  function packU16(n) { return [n & 0xff, (n >> 8) & 0xff]; }
  function unpackU16(bytes) { return as_unsigned(bytes[1] << 8 | bytes[0], 16); }

  function packI32(n) { return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]; }
  function unpackI32(bytes) { return as_signed(bytes[3] << 24 | bytes[2] << 16 | bytes[1] << 8 | bytes[0], 32); }

  function packU32(n) { return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]; }
  function unpackU32(bytes) { return as_unsigned(bytes[3] << 24 | bytes[2] << 16 | bytes[1] << 8 | bytes[0], 32); }

  function packIEEE754(v, ebits, fbits) {

    var bias = (1 << (ebits - 1)) - 1;

    function roundToEven(n) {
      var w = floor(n), f = n - w;
      if (f < 0.5)
        return w;
      if (f > 0.5)
        return w + 1;
      return w % 2 ? w + 1 : w;
    }

    // Compute sign, exponent, fraction
    var s, e, f;
    if (v !== v) {
      // NaN
      // http://dev.w3.org/2006/webapi/WebIDL/#es-type-mapping
      e = (1 << ebits) - 1; f = pow(2, fbits - 1); s = 0;
    } else if (v === Infinity || v === -Infinity) {
      e = (1 << ebits) - 1; f = 0; s = (v < 0) ? 1 : 0;
    } else if (v === 0) {
      e = 0; f = 0; s = (1 / v === -Infinity) ? 1 : 0;
    } else {
      s = v < 0;
      v = abs(v);

      if (v >= pow(2, 1 - bias)) {
        // Normalized
        e = min(floor(log(v) / LN2), 1023);
        var significand = v / pow(2, e);
        if (significand < 1) {
          e -= 1;
          significand *= 2;
        }
        if (significand >= 2) {
          e += 1;
          significand /= 2;
        }
        var d = pow(2, fbits);
        f = roundToEven(significand * d) - d;
        e += bias;
        if (f / d >= 1) {
          e += 1;
          f = 0;
        }
        if (e > 2 * bias) {
          // Overflow
          e = (1 << ebits) - 1;
          f = 0;
        }
      } else {
        // Denormalized
        e = 0;
        f = roundToEven(v / pow(2, 1 - bias - fbits));
      }
    }

    // Pack sign, exponent, fraction
    var bits = [], i;
    for (i = fbits; i; i -= 1) { bits.push(f % 2 ? 1 : 0); f = floor(f / 2); }
    for (i = ebits; i; i -= 1) { bits.push(e % 2 ? 1 : 0); e = floor(e / 2); }
    bits.push(s ? 1 : 0);
    bits.reverse();
    var str = bits.join('');

    // Bits to bytes
    var bytes = [];
    while (str.length) {
      bytes.unshift(parseInt(str.substring(0, 8), 2));
      str = str.substring(8);
    }
    return bytes;
  }

  function unpackIEEE754(bytes, ebits, fbits) {
    // Bytes to bits
    var bits = [], i, j, b, str,
        bias, s, e, f;

    for (i = 0; i < bytes.length; ++i) {
      b = bytes[i];
      for (j = 8; j; j -= 1) {
        bits.push(b % 2 ? 1 : 0); b = b >> 1;
      }
    }
    bits.reverse();
    str = bits.join('');

    // Unpack sign, exponent, fraction
    bias = (1 << (ebits - 1)) - 1;
    s = parseInt(str.substring(0, 1), 2) ? -1 : 1;
    e = parseInt(str.substring(1, 1 + ebits), 2);
    f = parseInt(str.substring(1 + ebits), 2);

    // Produce number
    if (e === (1 << ebits) - 1) {
      return f !== 0 ? NaN : s * Infinity;
    } else if (e > 0) {
      // Normalized
      return s * pow(2, e - bias) * (1 + f / pow(2, fbits));
    } else if (f !== 0) {
      // Denormalized
      return s * pow(2, -(bias - 1)) * (f / pow(2, fbits));
    } else {
      return s < 0 ? -0 : 0;
    }
  }

  function unpackF64(b) { return unpackIEEE754(b, 11, 52); }
  function packF64(v) { return packIEEE754(v, 11, 52); }
  function unpackF32(b) { return unpackIEEE754(b, 8, 23); }
  function packF32(v) { return packIEEE754(v, 8, 23); }

  //
  // 3 The ArrayBuffer Type
  //

  (function() {

    function ArrayBuffer(length) {
      length = ToInt32(length);
      if (length < 0) throw RangeError('ArrayBuffer size is not a small enough positive integer.');
      Object.defineProperty(this, 'byteLength', {value: length});
      Object.defineProperty(this, '_bytes', {value: Array(length)});

      for (var i = 0; i < length; i += 1)
        this._bytes[i] = 0;
    }

    global.ArrayBuffer = global.ArrayBuffer || ArrayBuffer;

    //
    // 5 The Typed Array View Types
    //

    function $TypedArray$() {

      // %TypedArray% ( length )
      if (!arguments.length || typeof arguments[0] !== 'object') {
        return (function(length) {
          length = ToInt32(length);
          if (length < 0) throw RangeError('length is not a small enough positive integer.');
          Object.defineProperty(this, 'length', {value: length});
          Object.defineProperty(this, 'byteLength', {value: length * this.BYTES_PER_ELEMENT});
          Object.defineProperty(this, 'buffer', {value: new ArrayBuffer(this.byteLength)});
          Object.defineProperty(this, 'byteOffset', {value: 0});

         }).apply(this, arguments);
      }

      // %TypedArray% ( typedArray )
      if (arguments.length >= 1 &&
          Type(arguments[0]) === 'object' &&
          arguments[0] instanceof $TypedArray$) {
        return (function(typedArray){
          if (this.constructor !== typedArray.constructor) throw TypeError();

          var byteLength = typedArray.length * this.BYTES_PER_ELEMENT;
          Object.defineProperty(this, 'buffer', {value: new ArrayBuffer(byteLength)});
          Object.defineProperty(this, 'byteLength', {value: byteLength});
          Object.defineProperty(this, 'byteOffset', {value: 0});
          Object.defineProperty(this, 'length', {value: typedArray.length});

          for (var i = 0; i < this.length; i += 1)
            this._setter(i, typedArray._getter(i));

        }).apply(this, arguments);
      }

      // %TypedArray% ( array )
      if (arguments.length >= 1 &&
          Type(arguments[0]) === 'object' &&
          !(arguments[0] instanceof $TypedArray$) &&
          !(arguments[0] instanceof ArrayBuffer || Class(arguments[0]) === 'ArrayBuffer')) {
        return (function(array) {

          var byteLength = array.length * this.BYTES_PER_ELEMENT;
          Object.defineProperty(this, 'buffer', {value: new ArrayBuffer(byteLength)});
          Object.defineProperty(this, 'byteLength', {value: byteLength});
          Object.defineProperty(this, 'byteOffset', {value: 0});
          Object.defineProperty(this, 'length', {value: array.length});

          for (var i = 0; i < this.length; i += 1) {
            var s = array[i];
            this._setter(i, Number(s));
          }
        }).apply(this, arguments);
      }

      // %TypedArray% ( buffer, byteOffset=0, length=undefined )
      if (arguments.length >= 1 &&
          Type(arguments[0]) === 'object' &&
          (arguments[0] instanceof ArrayBuffer || Class(arguments[0]) === 'ArrayBuffer')) {
        return (function(buffer, byteOffset, length) {

          byteOffset = ToUint32(byteOffset);
          if (byteOffset > buffer.byteLength)
            throw RangeError('byteOffset out of range');

          // The given byteOffset must be a multiple of the element
          // size of the specific type, otherwise an exception is raised.
          if (byteOffset % this.BYTES_PER_ELEMENT)
            throw RangeError('buffer length minus the byteOffset is not a multiple of the element size.');

          if (length === undefined) {
            var byteLength = buffer.byteLength - byteOffset;
            if (byteLength % this.BYTES_PER_ELEMENT)
              throw RangeError('length of buffer minus byteOffset not a multiple of the element size');
            length = byteLength / this.BYTES_PER_ELEMENT;

          } else {
            length = ToUint32(length);
            byteLength = length * this.BYTES_PER_ELEMENT;
          }

          if ((byteOffset + byteLength) > buffer.byteLength)
            throw RangeError('byteOffset and length reference an area beyond the end of the buffer');

          Object.defineProperty(this, 'buffer', {value: buffer});
          Object.defineProperty(this, 'byteLength', {value: byteLength});
          Object.defineProperty(this, 'byteOffset', {value: byteOffset});
          Object.defineProperty(this, 'length', {value: length});

        }).apply(this, arguments);
      }

      // %TypedArray% ( all other argument combinations )
      throw TypeError();
    }

    // Properties of the %TypedArray Instrinsic Object

    // %TypedArray%.from ( source , mapfn=undefined, thisArg=undefined )
    Object.defineProperty($TypedArray$, 'from', {value: function(iterable) {
      return new this(iterable);
    }});

    // %TypedArray%.of ( ...items )
    Object.defineProperty($TypedArray$, 'of', {value: function(/*...items*/) {
      return new this(arguments);
    }});

    // %TypedArray%.prototype
    var $TypedArrayPrototype$ = {};
    $TypedArray$.prototype = $TypedArrayPrototype$;

    // WebIDL: getter type (unsigned long index);
    Object.defineProperty($TypedArray$.prototype, '_getter', {value: function(index) {
      if (arguments.length < 1) throw SyntaxError('Not enough arguments');

      index = ToUint32(index);
      if (index >= this.length)
        return undefined;

      var bytes = [], i, o;
      for (i = 0, o = this.byteOffset + index * this.BYTES_PER_ELEMENT;
           i < this.BYTES_PER_ELEMENT;
           i += 1, o += 1) {
        bytes.push(this.buffer._bytes[o]);
      }
      return this._unpack(bytes);
    }});

    // NONSTANDARD: convenience alias for getter: type get(unsigned long index);
    Object.defineProperty($TypedArray$.prototype, 'get', {value: $TypedArray$.prototype._getter});

    // WebIDL: setter void (unsigned long index, type value);
    Object.defineProperty($TypedArray$.prototype, '_setter', {value: function(index, value) {
      if (arguments.length < 2) throw SyntaxError('Not enough arguments');

      index = ToUint32(index);
      if (index >= this.length)
        return;

      var bytes = this._pack(value), i, o;
      for (i = 0, o = this.byteOffset + index * this.BYTES_PER_ELEMENT;
           i < this.BYTES_PER_ELEMENT;
           i += 1, o += 1) {
        this.buffer._bytes[o] = bytes[i];
      }
    }});

    // get %TypedArray%.prototype.buffer
    // get %TypedArray%.prototype.byteLength
    // get %TypedArray%.prototype.byteOffset
    // -- applied directly to the object in the constructor

    // %TypedArray%.prototype.constructor
    Object.defineProperty($TypedArray$.prototype, 'constructor', {value: $TypedArray$});

    // %TypedArray%.prototype.copyWithin (target, start, end = this.length )
    Object.defineProperty($TypedArray$.prototype, 'copyWithin', {value: function(target, start) {
      var end = arguments[2];

      var o = ToObject(this);
      var lenVal = o.length;
      var len = ToUint32(lenVal);
      len = max(len, 0);
      var relativeTarget = ToInt32(target);
      var to;
      if (relativeTarget < 0)
        to = max(len + relativeTarget, 0);
      else
        to = min(relativeTarget, len);
      var relativeStart = ToInt32(start);
      var from;
      if (relativeStart < 0)
        from = max(len + relativeStart, 0);
      else
        from = min(relativeStart, len);
      var relativeEnd;
      if (end === undefined)
        relativeEnd = len;
      else
        relativeEnd = ToInt32(end);
      var final;
      if (relativeEnd < 0)
        final = max(len + relativeEnd, 0);
      else
        final = min(relativeEnd, len);
      var count = min(final - from, len - to);
      var direction;
      if (from < to && to < from + count) {
        direction = -1;
        from = from + count - 1;
        to = to + count - 1;
      } else {
        direction = 1;
      }
      while (count > 0) {
        o._setter(to, o._getter(from));
        from = from + direction;
        to = to + direction;
        count = count - 1;
      }
      return o;
    }});

    // %TypedArray%.prototype.entries ( )
    // -- defined in es6.js to shim browsers w/ native TypedArrays

    // %TypedArray%.prototype.every ( callbackfn, thisArg = undefined )
    Object.defineProperty($TypedArray$.prototype, 'every', {value: function(callbackfn) {
      if (this === undefined || this === null) throw TypeError();
      var t = Object(this);
      var len = ToUint32(t.length);
      if (!IsCallable(callbackfn)) throw TypeError();
      var thisArg = arguments[1];
      for (var i = 0; i < len; i++) {
        if (!callbackfn.call(thisArg, t._getter(i), i, t))
          return false;
      }
      return true;
    }});

    // %TypedArray%.prototype.fill (value, start = 0, end = this.length )
    Object.defineProperty($TypedArray$.prototype, 'fill', {value: function(value) {
      var start = arguments[1],
          end = arguments[2];

      var o = ToObject(this);
      var lenVal = o.length;
      var len = ToUint32(lenVal);
      len = max(len, 0);
      var relativeStart = ToInt32(start);
      var k;
      if (relativeStart < 0)
        k = max((len + relativeStart), 0);
      else
        k = min(relativeStart, len);
      var relativeEnd;
      if (end === undefined)
        relativeEnd = len;
      else
        relativeEnd = ToInt32(end);
      var final;
      if (relativeEnd < 0)
        final = max((len + relativeEnd), 0);
      else
        final = min(relativeEnd, len);
      while (k < final) {
        o._setter(k, value);
        k += 1;
      }
      return o;
    }});

    // %TypedArray%.prototype.filter ( callbackfn, thisArg = undefined )
    Object.defineProperty($TypedArray$.prototype, 'filter', {value: function(callbackfn) {
      if (this === undefined || this === null) throw TypeError();
      var t = Object(this);
      var len = ToUint32(t.length);
      if (!IsCallable(callbackfn)) throw TypeError();
      var res = [];
      var thisp = arguments[1];
      for (var i = 0; i < len; i++) {
        var val = t._getter(i); // in case fun mutates this
        if (callbackfn.call(thisp, val, i, t))
          res.push(val);
      }
      return new this.constructor(res);
    }});

    // %TypedArray%.prototype.find (predicate, thisArg = undefined)
    Object.defineProperty($TypedArray$.prototype, 'find', {value: function(predicate) {
      var o = ToObject(this);
      var lenValue = o.length;
      var len = ToUint32(lenValue);
      if (!IsCallable(predicate)) throw TypeError();
      var t = arguments.length > 1 ? arguments[1] : undefined;
      var k = 0;
      while (k < len) {
        var kValue = o._getter(k);
        var testResult = predicate.call(t, kValue, k, o);
        if (Boolean(testResult))
          return kValue;
        ++k;
      }
      return undefined;
    }});

    // %TypedArray%.prototype.findIndex ( predicate, thisArg = undefined )
    Object.defineProperty($TypedArray$.prototype, 'findIndex', {value: function(predicate) {
      var o = ToObject(this);
      var lenValue = o.length;
      var len = ToUint32(lenValue);
      if (!IsCallable(predicate)) throw TypeError();
      var t = arguments.length > 1 ? arguments[1] : undefined;
      var k = 0;
      while (k < len) {
        var kValue = o._getter(k);
        var testResult = predicate.call(t, kValue, k, o);
        if (Boolean(testResult))
          return k;
        ++k;
      }
      return -1;
    }});

    // %TypedArray%.prototype.forEach ( callbackfn, thisArg = undefined )
    Object.defineProperty($TypedArray$.prototype, 'forEach', {value: function(callbackfn) {
      if (this === undefined || this === null) throw TypeError();
      var t = Object(this);
      var len = ToUint32(t.length);
      if (!IsCallable(callbackfn)) throw TypeError();
      var thisp = arguments[1];
      for (var i = 0; i < len; i++)
        callbackfn.call(thisp, t._getter(i), i, t);
    }});

    // %TypedArray%.prototype.indexOf (searchElement, fromIndex = 0 )
    Object.defineProperty($TypedArray$.prototype, 'indexOf', {value: function(searchElement) {
      if (this === undefined || this === null) throw TypeError();
      var t = Object(this);
      var len = ToUint32(t.length);
      if (len === 0) return -1;
      var n = 0;
      if (arguments.length > 0) {
        n = Number(arguments[1]);
        if (n !== n) {
          n = 0;
        } else if (n !== 0 && n !== (1 / 0) && n !== -(1 / 0)) {
          n = (n > 0 || -1) * floor(abs(n));
        }
      }
      if (n >= len) return -1;
      var k = n >= 0 ? n : max(len - abs(n), 0);
      for (; k < len; k++) {
        if (t._getter(k) === searchElement) {
          return k;
        }
      }
      return -1;
    }});

    // %TypedArray%.prototype.join ( separator )
    Object.defineProperty($TypedArray$.prototype, 'join', {value: function(separator) {
      if (this === undefined || this === null) throw TypeError();
      var t = Object(this);
      var len = ToUint32(t.length);
      var tmp = Array(len);
      for (var i = 0; i < len; ++i)
        tmp[i] = t._getter(i);
      return tmp.join(separator === undefined ? ',' : separator); // Hack for IE7
    }});

    // %TypedArray%.prototype.keys ( )
    // -- defined in es6.js to shim browsers w/ native TypedArrays

    // %TypedArray%.prototype.lastIndexOf ( searchElement, fromIndex = this.length-1 )
    Object.defineProperty($TypedArray$.prototype, 'lastIndexOf', {value: function(searchElement) {
      if (this === undefined || this === null) throw TypeError();
      var t = Object(this);
      var len = ToUint32(t.length);
      if (len === 0) return -1;
      var n = len;
      if (arguments.length > 1) {
        n = Number(arguments[1]);
        if (n !== n) {
          n = 0;
        } else if (n !== 0 && n !== (1 / 0) && n !== -(1 / 0)) {
          n = (n > 0 || -1) * floor(abs(n));
        }
      }
      var k = n >= 0 ? min(n, len - 1) : len - abs(n);
      for (; k >= 0; k--) {
        if (t._getter(k) === searchElement)
          return k;
      }
      return -1;
    }});

    // get %TypedArray%.prototype.length
    // -- applied directly to the object in the constructor

    // %TypedArray%.prototype.map ( callbackfn, thisArg = undefined )
    Object.defineProperty($TypedArray$.prototype, 'map', {value: function(callbackfn) {
      if (this === undefined || this === null) throw TypeError();
      var t = Object(this);
      var len = ToUint32(t.length);
      if (!IsCallable(callbackfn)) throw TypeError();
      var res = []; res.length = len;
      var thisp = arguments[1];
      for (var i = 0; i < len; i++)
        res[i] = callbackfn.call(thisp, t._getter(i), i, t);
      return new this.constructor(res);
    }});

    // %TypedArray%.prototype.reduce ( callbackfn [, initialValue] )
    Object.defineProperty($TypedArray$.prototype, 'reduce', {value: function(callbackfn) {
      if (this === undefined || this === null) throw TypeError();
      var t = Object(this);
      var len = ToUint32(t.length);
      if (!IsCallable(callbackfn)) throw TypeError();
      // no value to return if no initial value and an empty array
      if (len === 0 && arguments.length === 1) throw TypeError();
      var k = 0;
      var accumulator;
      if (arguments.length >= 2) {
        accumulator = arguments[1];
      } else {
        accumulator = t._getter(k++);
      }
      while (k < len) {
        accumulator = callbackfn.call(undefined, accumulator, t._getter(k), k, t);
        k++;
      }
      return accumulator;
    }});

    // %TypedArray%.prototype.reduceRight ( callbackfn [, initialValue] )
    Object.defineProperty($TypedArray$.prototype, 'reduceRight', {value: function(callbackfn) {
      if (this === undefined || this === null) throw TypeError();
      var t = Object(this);
      var len = ToUint32(t.length);
      if (!IsCallable(callbackfn)) throw TypeError();
      // no value to return if no initial value, empty array
      if (len === 0 && arguments.length === 1) throw TypeError();
      var k = len - 1;
      var accumulator;
      if (arguments.length >= 2) {
        accumulator = arguments[1];
      } else {
        accumulator = t._getter(k--);
      }
      while (k >= 0) {
        accumulator = callbackfn.call(undefined, accumulator, t._getter(k), k, t);
        k--;
      }
      return accumulator;
    }});

    // %TypedArray%.prototype.reverse ( )
    Object.defineProperty($TypedArray$.prototype, 'reverse', {value: function() {
      if (this === undefined || this === null) throw TypeError();
      var t = Object(this);
      var len = ToUint32(t.length);
      var half = floor(len / 2);
      for (var i = 0, j = len - 1; i < half; ++i, --j) {
        var tmp = t._getter(i);
        t._setter(i, t._getter(j));
        t._setter(j, tmp);
      }
      return t;
    }});

    // %TypedArray%.prototype.set(array, offset = 0 )
    // %TypedArray%.prototype.set(typedArray, offset = 0 )
    // WebIDL: void set(TypedArray array, optional unsigned long offset);
    // WebIDL: void set(sequence<type> array, optional unsigned long offset);
    Object.defineProperty($TypedArray$.prototype, 'set', {value: function(index, value) {
      if (arguments.length < 1) throw SyntaxError('Not enough arguments');
      var array, sequence, offset, len,
          i, s, d,
          byteOffset, byteLength, tmp;

      if (typeof arguments[0] === 'object' && arguments[0].constructor === this.constructor) {
        // void set(TypedArray array, optional unsigned long offset);
        array = arguments[0];
        offset = ToUint32(arguments[1]);

        if (offset + array.length > this.length) {
          throw RangeError('Offset plus length of array is out of range');
        }

        byteOffset = this.byteOffset + offset * this.BYTES_PER_ELEMENT;
        byteLength = array.length * this.BYTES_PER_ELEMENT;

        if (array.buffer === this.buffer) {
          tmp = [];
          for (i = 0, s = array.byteOffset; i < byteLength; i += 1, s += 1) {
            tmp[i] = array.buffer._bytes[s];
          }
          for (i = 0, d = byteOffset; i < byteLength; i += 1, d += 1) {
            this.buffer._bytes[d] = tmp[i];
          }
        } else {
          for (i = 0, s = array.byteOffset, d = byteOffset;
               i < byteLength; i += 1, s += 1, d += 1) {
            this.buffer._bytes[d] = array.buffer._bytes[s];
          }
        }
      } else if (typeof arguments[0] === 'object' && typeof arguments[0].length !== 'undefined') {
        // void set(sequence<type> array, optional unsigned long offset);
        sequence = arguments[0];
        len = ToUint32(sequence.length);
        offset = ToUint32(arguments[1]);

        if (offset + len > this.length) {
          throw RangeError('Offset plus length of array is out of range');
        }

        for (i = 0; i < len; i += 1) {
          s = sequence[i];
          this._setter(offset + i, Number(s));
        }
      } else {
        throw TypeError('Unexpected argument type(s)');
      }
    }});

    // %TypedArray%.prototype.slice ( start, end )
    Object.defineProperty($TypedArray$.prototype, 'slice', {value: function(start, end) {
      var o = ToObject(this);
      var lenVal = o.length;
      var len = ToUint32(lenVal);
      var relativeStart = ToInt32(start);
      var k = (relativeStart < 0) ? max(len + relativeStart, 0) : min(relativeStart, len);
      var relativeEnd = (end === undefined) ? len : ToInt32(end);
      var final = (relativeEnd < 0) ? max(len + relativeEnd, 0) : min(relativeEnd, len);
      var count = final - k;
      var c = o.constructor;
      var a = new c(count);
      var n = 0;
      while (k < final) {
        var kValue = o._getter(k);
        a._setter(n, kValue);
        ++k;
        ++n;
      }
      return a;
    }});

    // %TypedArray%.prototype.some ( callbackfn, thisArg = undefined )
    Object.defineProperty($TypedArray$.prototype, 'some', {value: function(callbackfn) {
      if (this === undefined || this === null) throw TypeError();
      var t = Object(this);
      var len = ToUint32(t.length);
      if (!IsCallable(callbackfn)) throw TypeError();
      var thisp = arguments[1];
      for (var i = 0; i < len; i++) {
        if (callbackfn.call(thisp, t._getter(i), i, t)) {
          return true;
        }
      }
      return false;
    }});

    // %TypedArray%.prototype.sort ( comparefn )
    Object.defineProperty($TypedArray$.prototype, 'sort', {value: function(comparefn) {
      if (this === undefined || this === null) throw TypeError();
      var t = Object(this);
      var len = ToUint32(t.length);
      var tmp = Array(len);
      for (var i = 0; i < len; ++i)
        tmp[i] = t._getter(i);
      if (comparefn) tmp.sort(comparefn); else tmp.sort(); // Hack for IE8/9
      for (i = 0; i < len; ++i)
        t._setter(i, tmp[i]);
      return t;
    }});

    // %TypedArray%.prototype.subarray(begin = 0, end = this.length )
    // WebIDL: TypedArray subarray(long begin, optional long end);
    Object.defineProperty($TypedArray$.prototype, 'subarray', {value: function(start, end) {
      function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }

      start = ToInt32(start);
      end = ToInt32(end);

      if (arguments.length < 1) { start = 0; }
      if (arguments.length < 2) { end = this.length; }

      if (start < 0) { start = this.length + start; }
      if (end < 0) { end = this.length + end; }

      start = clamp(start, 0, this.length);
      end = clamp(end, 0, this.length);

      var len = end - start;
      if (len < 0) {
        len = 0;
      }

      return new this.constructor(
        this.buffer, this.byteOffset + start * this.BYTES_PER_ELEMENT, len);
    }});

    // %TypedArray%.prototype.toLocaleString ( )
    // %TypedArray%.prototype.toString ( )
    // %TypedArray%.prototype.values ( )
    // %TypedArray%.prototype [ @@iterator ] ( )
    // get %TypedArray%.prototype [ @@toStringTag ]
    // -- defined in es6.js to shim browsers w/ native TypedArrays

    function makeTypedArray(elementSize, pack, unpack) {
      // Each TypedArray type requires a distinct constructor instance with
      // identical logic, which this produces.
      var TypedArray = function() {
        Object.defineProperty(this, 'constructor', {value: TypedArray});
        $TypedArray$.apply(this, arguments);
        makeArrayAccessors(this);
      };
      if ('__proto__' in TypedArray) {
        TypedArray.__proto__ = $TypedArray$;
      } else {
        TypedArray.from = $TypedArray$.from;
        TypedArray.of = $TypedArray$.of;
      }

      TypedArray.BYTES_PER_ELEMENT = elementSize;

      var TypedArrayPrototype = function() {};
      TypedArrayPrototype.prototype = $TypedArrayPrototype$;

      TypedArray.prototype = new TypedArrayPrototype();

      Object.defineProperty(TypedArray.prototype, 'BYTES_PER_ELEMENT', {value: elementSize});
      Object.defineProperty(TypedArray.prototype, '_pack', {value: pack});
      Object.defineProperty(TypedArray.prototype, '_unpack', {value: unpack});

      return TypedArray;
    }

    var Int8Array = makeTypedArray(1, packI8, unpackI8);
    var Uint8Array = makeTypedArray(1, packU8, unpackU8);
    var Uint8ClampedArray = makeTypedArray(1, packU8Clamped, unpackU8);
    var Int16Array = makeTypedArray(2, packI16, unpackI16);
    var Uint16Array = makeTypedArray(2, packU16, unpackU16);
    var Int32Array = makeTypedArray(4, packI32, unpackI32);
    var Uint32Array = makeTypedArray(4, packU32, unpackU32);
    var Float32Array = makeTypedArray(4, packF32, unpackF32);
    var Float64Array = makeTypedArray(8, packF64, unpackF64);

    global.Int8Array = global.Int8Array || Int8Array;
    global.Uint8Array = global.Uint8Array || Uint8Array;
    global.Uint8ClampedArray = global.Uint8ClampedArray || Uint8ClampedArray;
    global.Int16Array = global.Int16Array || Int16Array;
    global.Uint16Array = global.Uint16Array || Uint16Array;
    global.Int32Array = global.Int32Array || Int32Array;
    global.Uint32Array = global.Uint32Array || Uint32Array;
    global.Float32Array = global.Float32Array || Float32Array;
    global.Float64Array = global.Float64Array || Float64Array;
  }());

  //
  // 6 The DataView View Type
  //

  (function() {
    function r(array, index) {
      return IsCallable(array.get) ? array.get(index) : array[index];
    }

    var IS_BIG_ENDIAN = (function() {
      var u16array = new Uint16Array([0x1234]),
          u8array = new Uint8Array(u16array.buffer);
      return r(u8array, 0) === 0x12;
    }());

    // DataView(buffer, byteOffset=0, byteLength=undefined)
    // WebIDL: Constructor(ArrayBuffer buffer,
    //                     optional unsigned long byteOffset,
    //                     optional unsigned long byteLength)
    function DataView(buffer, byteOffset, byteLength) {
      if (!(buffer instanceof ArrayBuffer || Class(buffer) === 'ArrayBuffer')) throw TypeError();

      byteOffset = ToUint32(byteOffset);
      if (byteOffset > buffer.byteLength)
        throw RangeError('byteOffset out of range');

      if (byteLength === undefined)
        byteLength = buffer.byteLength - byteOffset;
      else
        byteLength = ToUint32(byteLength);

      if ((byteOffset + byteLength) > buffer.byteLength)
        throw RangeError('byteOffset and length reference an area beyond the end of the buffer');

      Object.defineProperty(this, 'buffer', {value: buffer});
      Object.defineProperty(this, 'byteLength', {value: byteLength});
      Object.defineProperty(this, 'byteOffset', {value: byteOffset});
    };

    // get DataView.prototype.buffer
    // get DataView.prototype.byteLength
    // get DataView.prototype.byteOffset
    // -- applied directly to instances by the constructor

    function makeGetter(arrayType) {
      return function GetViewValue(byteOffset, littleEndian) {
        byteOffset = ToUint32(byteOffset);

        if (byteOffset + arrayType.BYTES_PER_ELEMENT > this.byteLength)
          throw RangeError('Array index out of range');

        byteOffset += this.byteOffset;

        var uint8Array = new Uint8Array(this.buffer, byteOffset, arrayType.BYTES_PER_ELEMENT),
            bytes = [];
        for (var i = 0; i < arrayType.BYTES_PER_ELEMENT; i += 1)
          bytes.push(r(uint8Array, i));

        if (Boolean(littleEndian) === Boolean(IS_BIG_ENDIAN))
          bytes.reverse();

        return r(new arrayType(new Uint8Array(bytes).buffer), 0);
      };
    }

    Object.defineProperty(DataView.prototype, 'getUint8', {value: makeGetter(Uint8Array)});
    Object.defineProperty(DataView.prototype, 'getInt8', {value: makeGetter(Int8Array)});
    Object.defineProperty(DataView.prototype, 'getUint16', {value: makeGetter(Uint16Array)});
    Object.defineProperty(DataView.prototype, 'getInt16', {value: makeGetter(Int16Array)});
    Object.defineProperty(DataView.prototype, 'getUint32', {value: makeGetter(Uint32Array)});
    Object.defineProperty(DataView.prototype, 'getInt32', {value: makeGetter(Int32Array)});
    Object.defineProperty(DataView.prototype, 'getFloat32', {value: makeGetter(Float32Array)});
    Object.defineProperty(DataView.prototype, 'getFloat64', {value: makeGetter(Float64Array)});

    function makeSetter(arrayType) {
      return function SetViewValue(byteOffset, value, littleEndian) {
        byteOffset = ToUint32(byteOffset);
        if (byteOffset + arrayType.BYTES_PER_ELEMENT > this.byteLength)
          throw RangeError('Array index out of range');

        // Get bytes
        var typeArray = new arrayType([value]),
            byteArray = new Uint8Array(typeArray.buffer),
            bytes = [], i, byteView;

        for (i = 0; i < arrayType.BYTES_PER_ELEMENT; i += 1)
          bytes.push(r(byteArray, i));

        // Flip if necessary
        if (Boolean(littleEndian) === Boolean(IS_BIG_ENDIAN))
          bytes.reverse();

        // Write them
        byteView = new Uint8Array(this.buffer, byteOffset, arrayType.BYTES_PER_ELEMENT);
        byteView.set(bytes);
      };
    }

    Object.defineProperty(DataView.prototype, 'setUint8', {value: makeSetter(Uint8Array)});
    Object.defineProperty(DataView.prototype, 'setInt8', {value: makeSetter(Int8Array)});
    Object.defineProperty(DataView.prototype, 'setUint16', {value: makeSetter(Uint16Array)});
    Object.defineProperty(DataView.prototype, 'setInt16', {value: makeSetter(Int16Array)});
    Object.defineProperty(DataView.prototype, 'setUint32', {value: makeSetter(Uint32Array)});
    Object.defineProperty(DataView.prototype, 'setInt32', {value: makeSetter(Int32Array)});
    Object.defineProperty(DataView.prototype, 'setFloat32', {value: makeSetter(Float32Array)});
    Object.defineProperty(DataView.prototype, 'setFloat64', {value: makeSetter(Float64Array)});

    global.DataView = global.DataView || DataView;

  }());

}(self));

// https://github.com/ttaubert/node-arraybuffer-slice
// (c) 2014 Tim Taubert <tim@timtaubert.de>
// arraybuffer-slice may be freely distributed under the MIT license.

(function (undefined) {
  "use strict";

  function clamp(val, length) {
    val = (val|0) || 0;

    if (val < 0) {
      return Math.max(val + length, 0);
    }

    return Math.min(val, length);
  }

  if (!ArrayBuffer.prototype.slice) {
    ArrayBuffer.prototype.slice = function (from, to) {
      var length = this.byteLength;
      var begin = clamp(from, length);
      var end = length;

      if (to !== undefined) {
        end = clamp(to, length);
      }

      if (begin > end) {
        return new ArrayBuffer(0);
      }

      var num = end - begin;
      var target = new ArrayBuffer(num);
      var targetArray = new Uint8Array(target);

      var sourceArray = new Uint8Array(this, begin, num);
      targetArray.set(sourceArray);

      return target;
    };
  }
})();

// This is free and unencumbered software released into the public domain.
// See LICENSE.md for more information.

// If we're in node require encoding-indexes and attach it to the global.
/**
 * @fileoverview Global |this| required for resolving indexes in node.
 * @suppress {globalThis}
 */
if (typeof module !== "undefined" && module.exports) {
  this["encoding-indexes"] =
    require("./encoding-indexes.js")["encoding-indexes"];
}

(function(global) {
  'use strict';

  //
  // Utilities
  //

  /**
   * @param {number} a The number to test.
   * @param {number} min The minimum value in the range, inclusive.
   * @param {number} max The maximum value in the range, inclusive.
   * @return {boolean} True if a >= min and a <= max.
   */
  function inRange(a, min, max) {
    return min <= a && a <= max;
  }

  /**
   * @param {!Array.<*>} array The array to check.
   * @param {*} item The item to look for in the array.
   * @return {boolean} True if the item appears in the array.
   */
  function includes(array, item) {
    return array.indexOf(item) !== -1;
  }

  var floor = Math.floor;

  /**
   * @param {*} o
   * @return {Object}
   */
  function ToDictionary(o) {
    if (o === undefined) return {};
    if (o === Object(o)) return o;
    throw TypeError('Could not convert argument to dictionary');
  }

  /**
   * @param {string} string Input string of UTF-16 code units.
   * @return {!Array.<number>} Code points.
   */
  function stringToCodePoints(string) {
    // https://heycam.github.io/webidl/#dfn-obtain-unicode

    // 1. Let S be the DOMString value.
    var s = String(string);

    // 2. Let n be the length of S.
    var n = s.length;

    // 3. Initialize i to 0.
    var i = 0;

    // 4. Initialize U to be an empty sequence of Unicode characters.
    var u = [];

    // 5. While i < n:
    while (i < n) {

      // 1. Let c be the code unit in S at index i.
      var c = s.charCodeAt(i);

      // 2. Depending on the value of c:

      // c < 0xD800 or c > 0xDFFF
      if (c < 0xD800 || c > 0xDFFF) {
        // Append to U the Unicode character with code point c.
        u.push(c);
      }

      // 0xDC00 ≤ c ≤ 0xDFFF
      else if (0xDC00 <= c && c <= 0xDFFF) {
        // Append to U a U+FFFD REPLACEMENT CHARACTER.
        u.push(0xFFFD);
      }

      // 0xD800 ≤ c ≤ 0xDBFF
      else if (0xD800 <= c && c <= 0xDBFF) {
        // 1. If i = n−1, then append to U a U+FFFD REPLACEMENT
        // CHARACTER.
        if (i === n - 1) {
          u.push(0xFFFD);
        }
        // 2. Otherwise, i < n−1:
        else {
          // 1. Let d be the code unit in S at index i+1.
          var d = string.charCodeAt(i + 1);

          // 2. If 0xDC00 ≤ d ≤ 0xDFFF, then:
          if (0xDC00 <= d && d <= 0xDFFF) {
            // 1. Let a be c & 0x3FF.
            var a = c & 0x3FF;

            // 2. Let b be d & 0x3FF.
            var b = d & 0x3FF;

            // 3. Append to U the Unicode character with code point
            // 2^16+2^10*a+b.
            u.push(0x10000 + (a << 10) + b);

            // 4. Set i to i+1.
            i += 1;
          }

          // 3. Otherwise, d < 0xDC00 or d > 0xDFFF. Append to U a
          // U+FFFD REPLACEMENT CHARACTER.
          else  {
            u.push(0xFFFD);
          }
        }
      }

      // 3. Set i to i+1.
      i += 1;
    }

    // 6. Return U.
    return u;
  }

  /**
   * @param {!Array.<number>} code_points Array of code points.
   * @return {string} string String of UTF-16 code units.
   */
  function codePointsToString(code_points) {
    var s = '';
    for (var i = 0; i < code_points.length; ++i) {
      var cp = code_points[i];
      if (cp <= 0xFFFF) {
        s += String.fromCharCode(cp);
      } else {
        cp -= 0x10000;
        s += String.fromCharCode((cp >> 10) + 0xD800,
                                 (cp & 0x3FF) + 0xDC00);
      }
    }
    return s;
  }


  //
  // Implementation of Encoding specification
  // https://encoding.spec.whatwg.org/
  //

  //
  // 4. Terminology
  //

  /**
   * An ASCII byte is a byte in the range 0x00 to 0x7F, inclusive.
   * @param {number} a The number to test.
   * @return {boolean} True if a is in the range 0x00 to 0x7F, inclusive.
   */
  function isASCIIByte(a) {
    return 0x00 <= a && a <= 0x7F;
  }

  /**
   * An ASCII code point is a code point in the range U+0000 to
   * U+007F, inclusive.
   */
  var isASCIICodePoint = isASCIIByte;


  /**
   * End-of-stream is a special token that signifies no more tokens
   * are in the stream.
   * @const
   */ var end_of_stream = -1;

  /**
   * A stream represents an ordered sequence of tokens.
   *
   * @constructor
   * @param {!(Array.<number>|Uint8Array)} tokens Array of tokens that provide
   * the stream.
   */
  function Stream(tokens) {
    /** @type {!Array.<number>} */
    this.tokens = [].slice.call(tokens);
    // Reversed as push/pop is more efficient than shift/unshift.
    this.tokens.reverse();
  }

  Stream.prototype = {
    /**
     * @return {boolean} True if end-of-stream has been hit.
     */
    endOfStream: function() {
      return !this.tokens.length;
    },

    /**
     * When a token is read from a stream, the first token in the
     * stream must be returned and subsequently removed, and
     * end-of-stream must be returned otherwise.
     *
     * @return {number} Get the next token from the stream, or
     * end_of_stream.
     */
     read: function() {
      if (!this.tokens.length)
        return end_of_stream;
       return this.tokens.pop();
     },

    /**
     * When one or more tokens are prepended to a stream, those tokens
     * must be inserted, in given order, before the first token in the
     * stream.
     *
     * @param {(number|!Array.<number>)} token The token(s) to prepend to the
     * stream.
     */
    prepend: function(token) {
      if (Array.isArray(token)) {
        var tokens = /**@type {!Array.<number>}*/(token);
        while (tokens.length)
          this.tokens.push(tokens.pop());
      } else {
        this.tokens.push(token);
      }
    },

    /**
     * When one or more tokens are pushed to a stream, those tokens
     * must be inserted, in given order, after the last token in the
     * stream.
     *
     * @param {(number|!Array.<number>)} token The tokens(s) to push to the
     * stream.
     */
    push: function(token) {
      if (Array.isArray(token)) {
        var tokens = /**@type {!Array.<number>}*/(token);
        while (tokens.length)
          this.tokens.unshift(tokens.shift());
      } else {
        this.tokens.unshift(token);
      }
    }
  };

  //
  // 5. Encodings
  //

  // 5.1 Encoders and decoders

  /** @const */
  var finished = -1;

  /**
   * @param {boolean} fatal If true, decoding errors raise an exception.
   * @param {number=} opt_code_point Override the standard fallback code point.
   * @return {number} The code point to insert on a decoding error.
   */
  function decoderError(fatal, opt_code_point) {
    if (fatal)
      throw TypeError('Decoder error');
    return opt_code_point || 0xFFFD;
  }

  /**
   * @param {number} code_point The code point that could not be encoded.
   * @return {number} Always throws, no value is actually returned.
   */
  function encoderError(code_point) {
    throw TypeError('The code point ' + code_point + ' could not be encoded.');
  }

  /** @interface */
  function Decoder() {}
  Decoder.prototype = {
    /**
     * @param {Stream} stream The stream of bytes being decoded.
     * @param {number} bite The next byte read from the stream.
     * @return {?(number|!Array.<number>)} The next code point(s)
     *     decoded, or null if not enough data exists in the input
     *     stream to decode a complete code point, or |finished|.
     */
    handler: function(stream, bite) {}
  };

  /** @interface */
  function Encoder() {}
  Encoder.prototype = {
    /**
     * @param {Stream} stream The stream of code points being encoded.
     * @param {number} code_point Next code point read from the stream.
     * @return {(number|!Array.<number>)} Byte(s) to emit, or |finished|.
     */
    handler: function(stream, code_point) {}
  };

  // 5.2 Names and labels

  // TODO: Define @typedef for Encoding: {name:string,labels:Array.<string>}
  // https://github.com/google/closure-compiler/issues/247

  /**
   * @param {string} label The encoding label.
   * @return {?{name:string,labels:Array.<string>}}
   */
  function getEncoding(label) {
    // 1. Remove any leading and trailing ASCII whitespace from label.
    label = String(label).trim().toLowerCase();

    // 2. If label is an ASCII case-insensitive match for any of the
    // labels listed in the table below, return the corresponding
    // encoding, and failure otherwise.
    if (Object.prototype.hasOwnProperty.call(label_to_encoding, label)) {
      return label_to_encoding[label];
    }
    return null;
  }

  /**
   * Encodings table: https://encoding.spec.whatwg.org/encodings.json
   * @const
   * @type {!Array.<{
   *          heading: string,
   *          encodings: Array.<{name:string,labels:Array.<string>}>
   *        }>}
   */
  var encodings = [
    {
      "encodings": [
        {
          "labels": [
            "unicode-1-1-utf-8",
            "utf-8",
            "utf8"
          ],
          "name": "UTF-8"
        }
      ],
      "heading": "The Encoding"
    },
    {
      "encodings": [
        {
          "labels": [
            "866",
            "cp866",
            "csibm866",
            "ibm866"
          ],
          "name": "IBM866"
        },
        {
          "labels": [
            "csisolatin2",
            "iso-8859-2",
            "iso-ir-101",
            "iso8859-2",
            "iso88592",
            "iso_8859-2",
            "iso_8859-2:1987",
            "l2",
            "latin2"
          ],
          "name": "ISO-8859-2"
        },
        {
          "labels": [
            "csisolatin3",
            "iso-8859-3",
            "iso-ir-109",
            "iso8859-3",
            "iso88593",
            "iso_8859-3",
            "iso_8859-3:1988",
            "l3",
            "latin3"
          ],
          "name": "ISO-8859-3"
        },
        {
          "labels": [
            "csisolatin4",
            "iso-8859-4",
            "iso-ir-110",
            "iso8859-4",
            "iso88594",
            "iso_8859-4",
            "iso_8859-4:1988",
            "l4",
            "latin4"
          ],
          "name": "ISO-8859-4"
        },
        {
          "labels": [
            "csisolatincyrillic",
            "cyrillic",
            "iso-8859-5",
            "iso-ir-144",
            "iso8859-5",
            "iso88595",
            "iso_8859-5",
            "iso_8859-5:1988"
          ],
          "name": "ISO-8859-5"
        },
        {
          "labels": [
            "arabic",
            "asmo-708",
            "csiso88596e",
            "csiso88596i",
            "csisolatinarabic",
            "ecma-114",
            "iso-8859-6",
            "iso-8859-6-e",
            "iso-8859-6-i",
            "iso-ir-127",
            "iso8859-6",
            "iso88596",
            "iso_8859-6",
            "iso_8859-6:1987"
          ],
          "name": "ISO-8859-6"
        },
        {
          "labels": [
            "csisolatingreek",
            "ecma-118",
            "elot_928",
            "greek",
            "greek8",
            "iso-8859-7",
            "iso-ir-126",
            "iso8859-7",
            "iso88597",
            "iso_8859-7",
            "iso_8859-7:1987",
            "sun_eu_greek"
          ],
          "name": "ISO-8859-7"
        },
        {
          "labels": [
            "csiso88598e",
            "csisolatinhebrew",
            "hebrew",
            "iso-8859-8",
            "iso-8859-8-e",
            "iso-ir-138",
            "iso8859-8",
            "iso88598",
            "iso_8859-8",
            "iso_8859-8:1988",
            "visual"
          ],
          "name": "ISO-8859-8"
        },
        {
          "labels": [
            "csiso88598i",
            "iso-8859-8-i",
            "logical"
          ],
          "name": "ISO-8859-8-I"
        },
        {
          "labels": [
            "csisolatin6",
            "iso-8859-10",
            "iso-ir-157",
            "iso8859-10",
            "iso885910",
            "l6",
            "latin6"
          ],
          "name": "ISO-8859-10"
        },
        {
          "labels": [
            "iso-8859-13",
            "iso8859-13",
            "iso885913"
          ],
          "name": "ISO-8859-13"
        },
        {
          "labels": [
            "iso-8859-14",
            "iso8859-14",
            "iso885914"
          ],
          "name": "ISO-8859-14"
        },
        {
          "labels": [
            "csisolatin9",
            "iso-8859-15",
            "iso8859-15",
            "iso885915",
            "iso_8859-15",
            "l9"
          ],
          "name": "ISO-8859-15"
        },
        {
          "labels": [
            "iso-8859-16"
          ],
          "name": "ISO-8859-16"
        },
        {
          "labels": [
            "cskoi8r",
            "koi",
            "koi8",
            "koi8-r",
            "koi8_r"
          ],
          "name": "KOI8-R"
        },
        {
          "labels": [
            "koi8-ru",
            "koi8-u"
          ],
          "name": "KOI8-U"
        },
        {
          "labels": [
            "csmacintosh",
            "mac",
            "macintosh",
            "x-mac-roman"
          ],
          "name": "macintosh"
        },
        {
          "labels": [
            "dos-874",
            "iso-8859-11",
            "iso8859-11",
            "iso885911",
            "tis-620",
            "windows-874"
          ],
          "name": "windows-874"
        },
        {
          "labels": [
            "cp1250",
            "windows-1250",
            "x-cp1250"
          ],
          "name": "windows-1250"
        },
        {
          "labels": [
            "cp1251",
            "windows-1251",
            "x-cp1251"
          ],
          "name": "windows-1251"
        },
        {
          "labels": [
            "ansi_x3.4-1968",
            "ascii",
            "cp1252",
            "cp819",
            "csisolatin1",
            "ibm819",
            "iso-8859-1",
            "iso-ir-100",
            "iso8859-1",
            "iso88591",
            "iso_8859-1",
            "iso_8859-1:1987",
            "l1",
            "latin1",
            "us-ascii",
            "windows-1252",
            "x-cp1252"
          ],
          "name": "windows-1252"
        },
        {
          "labels": [
            "cp1253",
            "windows-1253",
            "x-cp1253"
          ],
          "name": "windows-1253"
        },
        {
          "labels": [
            "cp1254",
            "csisolatin5",
            "iso-8859-9",
            "iso-ir-148",
            "iso8859-9",
            "iso88599",
            "iso_8859-9",
            "iso_8859-9:1989",
            "l5",
            "latin5",
            "windows-1254",
            "x-cp1254"
          ],
          "name": "windows-1254"
        },
        {
          "labels": [
            "cp1255",
            "windows-1255",
            "x-cp1255"
          ],
          "name": "windows-1255"
        },
        {
          "labels": [
            "cp1256",
            "windows-1256",
            "x-cp1256"
          ],
          "name": "windows-1256"
        },
        {
          "labels": [
            "cp1257",
            "windows-1257",
            "x-cp1257"
          ],
          "name": "windows-1257"
        },
        {
          "labels": [
            "cp1258",
            "windows-1258",
            "x-cp1258"
          ],
          "name": "windows-1258"
        },
        {
          "labels": [
            "x-mac-cyrillic",
            "x-mac-ukrainian"
          ],
          "name": "x-mac-cyrillic"
        }
      ],
      "heading": "Legacy single-byte encodings"
    },
    {
      "encodings": [
        {
          "labels": [
            "chinese",
            "csgb2312",
            "csiso58gb231280",
            "gb2312",
            "gb_2312",
            "gb_2312-80",
            "gbk",
            "iso-ir-58",
            "x-gbk"
          ],
          "name": "GBK"
        },
        {
          "labels": [
            "gb18030"
          ],
          "name": "gb18030"
        }
      ],
      "heading": "Legacy multi-byte Chinese (simplified) encodings"
    },
    {
      "encodings": [
        {
          "labels": [
            "big5",
            "big5-hkscs",
            "cn-big5",
            "csbig5",
            "x-x-big5"
          ],
          "name": "Big5"
        }
      ],
      "heading": "Legacy multi-byte Chinese (traditional) encodings"
    },
    {
      "encodings": [
        {
          "labels": [
            "cseucpkdfmtjapanese",
            "euc-jp",
            "x-euc-jp"
          ],
          "name": "EUC-JP"
        },
        {
          "labels": [
            "csiso2022jp",
            "iso-2022-jp"
          ],
          "name": "ISO-2022-JP"
        },
        {
          "labels": [
            "csshiftjis",
            "ms932",
            "ms_kanji",
            "shift-jis",
            "shift_jis",
            "sjis",
            "windows-31j",
            "x-sjis"
          ],
          "name": "Shift_JIS"
        }
      ],
      "heading": "Legacy multi-byte Japanese encodings"
    },
    {
      "encodings": [
        {
          "labels": [
            "cseuckr",
            "csksc56011987",
            "euc-kr",
            "iso-ir-149",
            "korean",
            "ks_c_5601-1987",
            "ks_c_5601-1989",
            "ksc5601",
            "ksc_5601",
            "windows-949"
          ],
          "name": "EUC-KR"
        }
      ],
      "heading": "Legacy multi-byte Korean encodings"
    },
    {
      "encodings": [
        {
          "labels": [
            "csiso2022kr",
            "hz-gb-2312",
            "iso-2022-cn",
            "iso-2022-cn-ext",
            "iso-2022-kr"
          ],
          "name": "replacement"
        },
        {
          "labels": [
            "utf-16be"
          ],
          "name": "UTF-16BE"
        },
        {
          "labels": [
            "utf-16",
            "utf-16le"
          ],
          "name": "UTF-16LE"
        },
        {
          "labels": [
            "x-user-defined"
          ],
          "name": "x-user-defined"
        }
      ],
      "heading": "Legacy miscellaneous encodings"
    }
  ];

  // Label to encoding registry.
  /** @type {Object.<string,{name:string,labels:Array.<string>}>} */
  var label_to_encoding = {};
  encodings.forEach(function(category) {
    category.encodings.forEach(function(encoding) {
      encoding.labels.forEach(function(label) {
        label_to_encoding[label] = encoding;
      });
    });
  });

  // Registry of of encoder/decoder factories, by encoding name.
  /** @type {Object.<string, function({fatal:boolean}): Encoder>} */
  var encoders = {};
  /** @type {Object.<string, function({fatal:boolean}): Decoder>} */
  var decoders = {};

  //
  // 6. Indexes
  //

  /**
   * @param {number} pointer The |pointer| to search for.
   * @param {(!Array.<?number>|undefined)} index The |index| to search within.
   * @return {?number} The code point corresponding to |pointer| in |index|,
   *     or null if |code point| is not in |index|.
   */
  function indexCodePointFor(pointer, index) {
    if (!index) return null;
    return index[pointer] || null;
  }

  /**
   * @param {number} code_point The |code point| to search for.
   * @param {!Array.<?number>} index The |index| to search within.
   * @return {?number} The first pointer corresponding to |code point| in
   *     |index|, or null if |code point| is not in |index|.
   */
  function indexPointerFor(code_point, index) {
    var pointer = index.indexOf(code_point);
    return pointer === -1 ? null : pointer;
  }

  /**
   * @param {string} name Name of the index.
   * @return {(!Array.<number>|!Array.<Array.<number>>)}
   *  */
  function index(name) {
    if (!('encoding-indexes' in global)) {
      throw Error("Indexes missing." +
                  " Did you forget to include encoding-indexes.js?");
    }
    return global['encoding-indexes'][name];
  }

  /**
   * @param {number} pointer The |pointer| to search for in the gb18030 index.
   * @return {?number} The code point corresponding to |pointer| in |index|,
   *     or null if |code point| is not in the gb18030 index.
   */
  function indexGB18030RangesCodePointFor(pointer) {
    // 1. If pointer is greater than 39419 and less than 189000, or
    // pointer is greater than 1237575, return null.
    if ((pointer > 39419 && pointer < 189000) || (pointer > 1237575))
      return null;

    // 2. If pointer is 7457, return code point U+E7C7.
    if (pointer === 7457) return 0xE7C7;

    // 3. Let offset be the last pointer in index gb18030 ranges that
    // is equal to or less than pointer and let code point offset be
    // its corresponding code point.
    var offset = 0;
    var code_point_offset = 0;
    var idx = index('gb18030');
    var i;
    for (i = 0; i < idx.length; ++i) {
      /** @type {!Array.<number>} */
      var entry = idx[i];
      if (entry[0] <= pointer) {
        offset = entry[0];
        code_point_offset = entry[1];
      } else {
        break;
      }
    }

    // 4. Return a code point whose value is code point offset +
    // pointer − offset.
    return code_point_offset + pointer - offset;
  }

  /**
   * @param {number} code_point The |code point| to locate in the gb18030 index.
   * @return {number} The first pointer corresponding to |code point| in the
   *     gb18030 index.
   */
  function indexGB18030RangesPointerFor(code_point) {
    // 1. If code point is U+E7C7, return pointer 7457.
    if (code_point === 0xE7C7) return 7457;

    // 2. Let offset be the last code point in index gb18030 ranges
    // that is equal to or less than code point and let pointer offset
    // be its corresponding pointer.
    var offset = 0;
    var pointer_offset = 0;
    var idx = index('gb18030');
    var i;
    for (i = 0; i < idx.length; ++i) {
      /** @type {!Array.<number>} */
      var entry = idx[i];
      if (entry[1] <= code_point) {
        offset = entry[1];
        pointer_offset = entry[0];
      } else {
        break;
      }
    }

    // 3. Return a pointer whose value is pointer offset + code point
    // − offset.
    return pointer_offset + code_point - offset;
  }

  /**
   * @param {number} code_point The |code_point| to search for in the shift_jis
   *     index.
   * @return {?number} The code point corresponding to |pointer| in |index|,
   *     or null if |code point| is not in the shift_jis index.
   */
  function indexShiftJISPointerFor(code_point) {
    // 1. Let index be index jis0208 excluding all pointers in the
    // range 8272 to 8835.
    var pointer = indexPointerFor(code_point, index('jis0208'));
    if (pointer === null || inRange(pointer, 8272, 8835))
      return null;

    // 2. Return the index pointer for code point in index.
    return pointer;
  }

  /**
   * @param {number} code_point The |code_point| to search for in the big5
   *     index.
   * @return {?number} The code point corresponding to |pointer| in |index|,
   *     or null if |code point| is not in the big5 index.
   */
  function indexBig5PointerFor(code_point) {

    // 1. Let index be index big5.
    var index_ = index('big5');

    // 2. If code point is U+2550, U+255E, U+2561, U+256A, U+5341, or
    // U+5345, return the last pointer corresponding to code point in
    // index.
    if (code_point === 0x2550 || code_point === 0x255E ||
        code_point === 0x2561 || code_point === 0x256A ||
        code_point === 0x5341 || code_point === 0x5345) {
      return index_.lastIndexOf(code_point);
    }

    // 3. Return the index pointer for code point in index.
    return indexPointerFor(code_point, index_);
  }

  //
  // 8. API
  //

  /** @const */ var DEFAULT_ENCODING = 'utf-8';

  // 8.1 Interface TextDecoder

  /**
   * @constructor
   * @param {string=} label The label of the encoding;
   *     defaults to 'utf-8'.
   * @param {Object=} options
   */
  function TextDecoder(label, options) {
    // Web IDL conventions
    if (!(this instanceof TextDecoder))
      throw TypeError('Called as a function. Did you forget \'new\'?');
    label = label !== undefined ? String(label) : DEFAULT_ENCODING;
    options = ToDictionary(options);

    // A TextDecoder object has an associated encoding, decoder,
    // stream, ignore BOM flag (initially unset), BOM seen flag
    // (initially unset), error mode (initially replacement), and do
    // not flush flag (initially unset).

    /** @private */
    this._encoding = null;
    /** @private @type {?Decoder} */
    this._decoder = null;
    /** @private @type {boolean} */
    this._ignoreBOM = false;
    /** @private @type {boolean} */
    this._BOMseen = false;
    /** @private @type {string} */
    this._error_mode = 'replacement';
    /** @private @type {boolean} */
    this._do_not_flush = false;


    // 1. Let encoding be the result of getting an encoding from
    // label.
    var encoding = getEncoding(label);

    // 2. If encoding is failure or replacement, throw a RangeError.
    if (encoding === null || encoding.name === 'replacement')
      throw RangeError('Unknown encoding: ' + label);
    if (!decoders[encoding.name]) {
      throw Error('Decoder not present.' +
                  ' Did you forget to include encoding-indexes.js?');
    }

    // 3. Let dec be a new TextDecoder object.
    var dec = this;

    // 4. Set dec's encoding to encoding.
    dec._encoding = encoding;

    // 5. If options's fatal member is true, set dec's error mode to
    // fatal.
    if (Boolean(options['fatal']))
      dec._error_mode = 'fatal';

    // 6. If options's ignoreBOM member is true, set dec's ignore BOM
    // flag.
    if (Boolean(options['ignoreBOM']))
      dec._ignoreBOM = true;

    // For pre-ES5 runtimes:
    if (!Object.defineProperty) {
      this.encoding = dec._encoding.name.toLowerCase();
      this.fatal = dec._error_mode === 'fatal';
      this.ignoreBOM = dec._ignoreBOM;
    }

    // 7. Return dec.
    return dec;
  }

  if (Object.defineProperty) {
    // The encoding attribute's getter must return encoding's name.
    Object.defineProperty(TextDecoder.prototype, 'encoding', {
      /** @this {TextDecoder} */
      get: function() { return this._encoding.name.toLowerCase(); }
    });

    // The fatal attribute's getter must return true if error mode
    // is fatal, and false otherwise.
    Object.defineProperty(TextDecoder.prototype, 'fatal', {
      /** @this {TextDecoder} */
      get: function() { return this._error_mode === 'fatal'; }
    });

    // The ignoreBOM attribute's getter must return true if ignore
    // BOM flag is set, and false otherwise.
    Object.defineProperty(TextDecoder.prototype, 'ignoreBOM', {
      /** @this {TextDecoder} */
      get: function() { return this._ignoreBOM; }
    });
  }

  /**
   * @param {BufferSource=} input The buffer of bytes to decode.
   * @param {Object=} options
   * @return {string} The decoded string.
   */
  TextDecoder.prototype.decode = function decode(input, options) {
    var bytes;
    if (typeof input === 'object' && input instanceof ArrayBuffer) {
      bytes = new Uint8Array(input);
    } else if (typeof input === 'object' && 'buffer' in input &&
               input.buffer instanceof ArrayBuffer) {
      bytes = new Uint8Array(input.buffer,
                             input.byteOffset,
                             input.byteLength);
    } else {
      bytes = new Uint8Array(0);
    }

    options = ToDictionary(options);

    // 1. If the do not flush flag is unset, set decoder to a new
    // encoding's decoder, set stream to a new stream, and unset the
    // BOM seen flag.
    if (!this._do_not_flush) {
      this._decoder = decoders[this._encoding.name]({
        fatal: this._error_mode === 'fatal'});
      this._BOMseen = false;
    }

    // 2. If options's stream is true, set the do not flush flag, and
    // unset the do not flush flag otherwise.
    this._do_not_flush = Boolean(options['stream']);

    // 3. If input is given, push a copy of input to stream.
    // TODO: Align with spec algorithm - maintain stream on instance.
    var input_stream = new Stream(bytes);

    // 4. Let output be a new stream.
    var output = [];

    /** @type {?(number|!Array.<number>)} */
    var result;

    // 5. While true:
    while (true) {
      // 1. Let token be the result of reading from stream.
      var token = input_stream.read();

      // 2. If token is end-of-stream and the do not flush flag is
      // set, return output, serialized.
      // TODO: Align with spec algorithm.
      if (token === end_of_stream)
        break;

      // 3. Otherwise, run these subsubsteps:

      // 1. Let result be the result of processing token for decoder,
      // stream, output, and error mode.
      result = this._decoder.handler(input_stream, token);

      // 2. If result is finished, return output, serialized.
      if (result === finished)
        break;

      if (result !== null) {
        if (Array.isArray(result))
          output.push.apply(output, /**@type {!Array.<number>}*/(result));
        else
          output.push(result);
      }

      // 3. Otherwise, if result is error, throw a TypeError.
      // (Thrown in handler)

      // 4. Otherwise, do nothing.
    }
    // TODO: Align with spec algorithm.
    if (!this._do_not_flush) {
      do {
        result = this._decoder.handler(input_stream, input_stream.read());
        if (result === finished)
          break;
        if (result === null)
          continue;
        if (Array.isArray(result))
          output.push.apply(output, /**@type {!Array.<number>}*/(result));
        else
          output.push(result);
      } while (!input_stream.endOfStream());
      this._decoder = null;
    }

    // A TextDecoder object also has an associated serialize stream
    // algorithm...
    /**
     * @param {!Array.<number>} stream
     * @return {string}
     * @this {TextDecoder}
     */
    function serializeStream(stream) {
      // 1. Let token be the result of reading from stream.
      // (Done in-place on array, rather than as a stream)

      // 2. If encoding is UTF-8, UTF-16BE, or UTF-16LE, and ignore
      // BOM flag and BOM seen flag are unset, run these subsubsteps:
      if (includes(['UTF-8', 'UTF-16LE', 'UTF-16BE'], this._encoding.name) &&
          !this._ignoreBOM && !this._BOMseen) {
        if (stream.length > 0 && stream[0] === 0xFEFF) {
          // 1. If token is U+FEFF, set BOM seen flag.
          this._BOMseen = true;
          stream.shift();
        } else if (stream.length > 0) {
          // 2. Otherwise, if token is not end-of-stream, set BOM seen
          // flag and append token to stream.
          this._BOMseen = true;
        } else {
          // 3. Otherwise, if token is not end-of-stream, append token
          // to output.
          // (no-op)
        }
      }
      // 4. Otherwise, return output.
      return codePointsToString(stream);
    }

    return serializeStream.call(this, output);
  };

  // 8.2 Interface TextEncoder

  /**
   * @constructor
   * @param {string=} label The label of the encoding. NONSTANDARD.
   * @param {Object=} options NONSTANDARD.
   */
  function TextEncoder(label, options) {
    // Web IDL conventions
    if (!(this instanceof TextEncoder))
      throw TypeError('Called as a function. Did you forget \'new\'?');
    options = ToDictionary(options);

    // A TextEncoder object has an associated encoding and encoder.

    /** @private */
    this._encoding = null;
    /** @private @type {?Encoder} */
    this._encoder = null;

    // Non-standard
    /** @private @type {boolean} */
    this._do_not_flush = false;
    /** @private @type {string} */
    this._fatal = Boolean(options['fatal']) ? 'fatal' : 'replacement';

    // 1. Let enc be a new TextEncoder object.
    var enc = this;

    // 2. Set enc's encoding to UTF-8's encoder.
    if (Boolean(options['NONSTANDARD_allowLegacyEncoding'])) {
      // NONSTANDARD behavior.
      label = label !== undefined ? String(label) : DEFAULT_ENCODING;
      var encoding = getEncoding(label);
      if (encoding === null || encoding.name === 'replacement')
        throw RangeError('Unknown encoding: ' + label);
      if (!encoders[encoding.name]) {
        throw Error('Encoder not present.' +
                    ' Did you forget to include encoding-indexes.js?');
      }
      enc._encoding = encoding;
    } else {
      // Standard behavior.
      enc._encoding = getEncoding('utf-8');

      if (label !== undefined && 'console' in global) {
        console.warn('TextEncoder constructor called with encoding label, '
                     + 'which is ignored.');
      }
    }

    // For pre-ES5 runtimes:
    if (!Object.defineProperty)
      this.encoding = enc._encoding.name.toLowerCase();

    // 3. Return enc.
    return enc;
  }

  if (Object.defineProperty) {
    // The encoding attribute's getter must return encoding's name.
    Object.defineProperty(TextEncoder.prototype, 'encoding', {
      /** @this {TextEncoder} */
      get: function() { return this._encoding.name.toLowerCase(); }
    });
  }

  /**
   * @param {string=} opt_string The string to encode.
   * @param {Object=} options
   * @return {!Uint8Array} Encoded bytes, as a Uint8Array.
   */
  TextEncoder.prototype.encode = function encode(opt_string, options) {
    opt_string = opt_string ? String(opt_string) : '';
    options = ToDictionary(options);

    // NOTE: This option is nonstandard. None of the encodings
    // permitted for encoding (i.e. UTF-8, UTF-16) are stateful when
    // the input is a USVString so streaming is not necessary.
    if (!this._do_not_flush)
      this._encoder = encoders[this._encoding.name]({
        fatal: this._fatal === 'fatal'});
    this._do_not_flush = Boolean(options['stream']);

    // 1. Convert input to a stream.
    var input = new Stream(stringToCodePoints(opt_string));

    // 2. Let output be a new stream
    var output = [];

    /** @type {?(number|!Array.<number>)} */
    var result;
    // 3. While true, run these substeps:
    while (true) {
      // 1. Let token be the result of reading from input.
      var token = input.read();
      if (token === end_of_stream)
        break;
      // 2. Let result be the result of processing token for encoder,
      // input, output.
      result = this._encoder.handler(input, token);
      if (result === finished)
        break;
      if (Array.isArray(result))
        output.push.apply(output, /**@type {!Array.<number>}*/(result));
      else
        output.push(result);
    }
    // TODO: Align with spec algorithm.
    if (!this._do_not_flush) {
      while (true) {
        result = this._encoder.handler(input, input.read());
        if (result === finished)
          break;
        if (Array.isArray(result))
          output.push.apply(output, /**@type {!Array.<number>}*/(result));
        else
          output.push(result);
      }
      this._encoder = null;
    }
    // 3. If result is finished, convert output into a byte sequence,
    // and then return a Uint8Array object wrapping an ArrayBuffer
    // containing output.
    return new Uint8Array(output);
  };


  //
  // 9. The encoding
  //

  // 9.1 utf-8

  // 9.1.1 utf-8 decoder
  /**
   * @constructor
   * @implements {Decoder}
   * @param {{fatal: boolean}} options
   */
  function UTF8Decoder(options) {
    var fatal = options.fatal;

    // utf-8's decoder's has an associated utf-8 code point, utf-8
    // bytes seen, and utf-8 bytes needed (all initially 0), a utf-8
    // lower boundary (initially 0x80), and a utf-8 upper boundary
    // (initially 0xBF).
    var /** @type {number} */ utf8_code_point = 0,
        /** @type {number} */ utf8_bytes_seen = 0,
        /** @type {number} */ utf8_bytes_needed = 0,
        /** @type {number} */ utf8_lower_boundary = 0x80,
        /** @type {number} */ utf8_upper_boundary = 0xBF;

    /**
     * @param {Stream} stream The stream of bytes being decoded.
     * @param {number} bite The next byte read from the stream.
     * @return {?(number|!Array.<number>)} The next code point(s)
     *     decoded, or null if not enough data exists in the input
     *     stream to decode a complete code point.
     */
    this.handler = function(stream, bite) {
      // 1. If byte is end-of-stream and utf-8 bytes needed is not 0,
      // set utf-8 bytes needed to 0 and return error.
      if (bite === end_of_stream && utf8_bytes_needed !== 0) {
        utf8_bytes_needed = 0;
        return decoderError(fatal);
      }

      // 2. If byte is end-of-stream, return finished.
      if (bite === end_of_stream)
        return finished;

      // 3. If utf-8 bytes needed is 0, based on byte:
      if (utf8_bytes_needed === 0) {

        // 0x00 to 0x7F
        if (inRange(bite, 0x00, 0x7F)) {
          // Return a code point whose value is byte.
          return bite;
        }

        // 0xC2 to 0xDF
        if (inRange(bite, 0xC2, 0xDF)) {
          // Set utf-8 bytes needed to 1 and utf-8 code point to byte
          // − 0xC0.
          utf8_bytes_needed = 1;
          utf8_code_point = bite - 0xC0;
        }

        // 0xE0 to 0xEF
        else if (inRange(bite, 0xE0, 0xEF)) {
          // 1. If byte is 0xE0, set utf-8 lower boundary to 0xA0.
          if (bite === 0xE0)
            utf8_lower_boundary = 0xA0;
          // 2. If byte is 0xED, set utf-8 upper boundary to 0x9F.
          if (bite === 0xED)
            utf8_upper_boundary = 0x9F;
          // 3. Set utf-8 bytes needed to 2 and utf-8 code point to
          // byte − 0xE0.
          utf8_bytes_needed = 2;
          utf8_code_point = bite - 0xE0;
        }

        // 0xF0 to 0xF4
        else if (inRange(bite, 0xF0, 0xF4)) {
          // 1. If byte is 0xF0, set utf-8 lower boundary to 0x90.
          if (bite === 0xF0)
            utf8_lower_boundary = 0x90;
          // 2. If byte is 0xF4, set utf-8 upper boundary to 0x8F.
          if (bite === 0xF4)
            utf8_upper_boundary = 0x8F;
          // 3. Set utf-8 bytes needed to 3 and utf-8 code point to
          // byte − 0xF0.
          utf8_bytes_needed = 3;
          utf8_code_point = bite - 0xF0;
        }

        // Otherwise
        else {
          // Return error.
          return decoderError(fatal);
        }

        // Then (byte is in the range 0xC2 to 0xF4, inclusive) set
        // utf-8 code point to utf-8 code point << (6 × utf-8 bytes
        // needed) and return continue.
        utf8_code_point = utf8_code_point << (6 * utf8_bytes_needed);
        return null;
      }

      // 4. If byte is not in the range utf-8 lower boundary to utf-8
      // upper boundary, inclusive, run these substeps:
      if (!inRange(bite, utf8_lower_boundary, utf8_upper_boundary)) {

        // 1. Set utf-8 code point, utf-8 bytes needed, and utf-8
        // bytes seen to 0, set utf-8 lower boundary to 0x80, and set
        // utf-8 upper boundary to 0xBF.
        utf8_code_point = utf8_bytes_needed = utf8_bytes_seen = 0;
        utf8_lower_boundary = 0x80;
        utf8_upper_boundary = 0xBF;

        // 2. Prepend byte to stream.
        stream.prepend(bite);

        // 3. Return error.
        return decoderError(fatal);
      }

      // 5. Set utf-8 lower boundary to 0x80 and utf-8 upper boundary
      // to 0xBF.
      utf8_lower_boundary = 0x80;
      utf8_upper_boundary = 0xBF;

      // 6. Increase utf-8 bytes seen by one and set utf-8 code point
      // to utf-8 code point + (byte − 0x80) << (6 × (utf-8 bytes
      // needed − utf-8 bytes seen)).
      utf8_bytes_seen += 1;
      utf8_code_point += (bite - 0x80) << (6 * (utf8_bytes_needed -
                                                utf8_bytes_seen));

      // 7. If utf-8 bytes seen is not equal to utf-8 bytes needed,
      // continue.
      if (utf8_bytes_seen !== utf8_bytes_needed)
        return null;

      // 8. Let code point be utf-8 code point.
      var code_point = utf8_code_point;

      // 9. Set utf-8 code point, utf-8 bytes needed, and utf-8 bytes
      // seen to 0.
      utf8_code_point = utf8_bytes_needed = utf8_bytes_seen = 0;

      // 10. Return a code point whose value is code point.
      return code_point;
    };
  }

  // 9.1.2 utf-8 encoder
  /**
   * @constructor
   * @implements {Encoder}
   * @param {{fatal: boolean}} options
   */
  function UTF8Encoder(options) {
    var fatal = options.fatal;
    /**
     * @param {Stream} stream Input stream.
     * @param {number} code_point Next code point read from the stream.
     * @return {(number|!Array.<number>)} Byte(s) to emit.
     */
    this.handler = function(stream, code_point) {
      // 1. If code point is end-of-stream, return finished.
      if (code_point === end_of_stream)
        return finished;

      // 2. If code point is in the range U+0000 to U+007F, return a
      // byte whose value is code point.
      if (inRange(code_point, 0x0000, 0x007f))
        return code_point;

      // 3. Set count and offset based on the range code point is in:
      var count, offset;
      // U+0080 to U+07FF, inclusive:
      if (inRange(code_point, 0x0080, 0x07FF)) {
        // 1 and 0xC0
        count = 1;
        offset = 0xC0;
      }
      // U+0800 to U+FFFF, inclusive:
      else if (inRange(code_point, 0x0800, 0xFFFF)) {
        // 2 and 0xE0
        count = 2;
        offset = 0xE0;
      }
      // U+10000 to U+10FFFF, inclusive:
      else if (inRange(code_point, 0x10000, 0x10FFFF)) {
        // 3 and 0xF0
        count = 3;
        offset = 0xF0;
      }

      // 4.Let bytes be a byte sequence whose first byte is (code
      // point >> (6 × count)) + offset.
      var bytes = [(code_point >> (6 * count)) + offset];

      // 5. Run these substeps while count is greater than 0:
      while (count > 0) {

        // 1. Set temp to code point >> (6 × (count − 1)).
        var temp = code_point >> (6 * (count - 1));

        // 2. Append to bytes 0x80 | (temp & 0x3F).
        bytes.push(0x80 | (temp & 0x3F));

        // 3. Decrease count by one.
        count -= 1;
      }

      // 6. Return bytes bytes, in order.
      return bytes;
    };
  }

  /** @param {{fatal: boolean}} options */
  encoders['UTF-8'] = function(options) {
    return new UTF8Encoder(options);
  };
  /** @param {{fatal: boolean}} options */
  decoders['UTF-8'] = function(options) {
    return new UTF8Decoder(options);
  };

  //
  // 10. Legacy single-byte encodings
  //

  // 10.1 single-byte decoder
  /**
   * @constructor
   * @implements {Decoder}
   * @param {!Array.<number>} index The encoding index.
   * @param {{fatal: boolean}} options
   */
  function SingleByteDecoder(index, options) {
    var fatal = options.fatal;
    /**
     * @param {Stream} stream The stream of bytes being decoded.
     * @param {number} bite The next byte read from the stream.
     * @return {?(number|!Array.<number>)} The next code point(s)
     *     decoded, or null if not enough data exists in the input
     *     stream to decode a complete code point.
     */
    this.handler = function(stream, bite) {
      // 1. If byte is end-of-stream, return finished.
      if (bite === end_of_stream)
        return finished;

      // 2. If byte is an ASCII byte, return a code point whose value
      // is byte.
      if (isASCIIByte(bite))
        return bite;

      // 3. Let code point be the index code point for byte − 0x80 in
      // index single-byte.
      var code_point = index[bite - 0x80];

      // 4. If code point is null, return error.
      if (code_point === null)
        return decoderError(fatal);

      // 5. Return a code point whose value is code point.
      return code_point;
    };
  }

  // 10.2 single-byte encoder
  /**
   * @constructor
   * @implements {Encoder}
   * @param {!Array.<?number>} index The encoding index.
   * @param {{fatal: boolean}} options
   */
  function SingleByteEncoder(index, options) {
    var fatal = options.fatal;
    /**
     * @param {Stream} stream Input stream.
     * @param {number} code_point Next code point read from the stream.
     * @return {(number|!Array.<number>)} Byte(s) to emit.
     */
    this.handler = function(stream, code_point) {
      // 1. If code point is end-of-stream, return finished.
      if (code_point === end_of_stream)
        return finished;

      // 2. If code point is an ASCII code point, return a byte whose
      // value is code point.
      if (isASCIICodePoint(code_point))
        return code_point;

      // 3. Let pointer be the index pointer for code point in index
      // single-byte.
      var pointer = indexPointerFor(code_point, index);

      // 4. If pointer is null, return error with code point.
      if (pointer === null)
        encoderError(code_point);

      // 5. Return a byte whose value is pointer + 0x80.
      return pointer + 0x80;
    };
  }

  (function() {
    if (!('encoding-indexes' in global))
      return;
    encodings.forEach(function(category) {
      if (category.heading !== 'Legacy single-byte encodings')
        return;
      category.encodings.forEach(function(encoding) {
        var name = encoding.name;
        var idx = index(name.toLowerCase());
        /** @param {{fatal: boolean}} options */
        decoders[name] = function(options) {
          return new SingleByteDecoder(idx, options);
        };
        /** @param {{fatal: boolean}} options */
        encoders[name] = function(options) {
          return new SingleByteEncoder(idx, options);
        };
      });
    });
  }());

  //
  // 11. Legacy multi-byte Chinese (simplified) encodings
  //

  // 11.1 gbk

  // 11.1.1 gbk decoder
  // gbk's decoder is gb18030's decoder.
  /** @param {{fatal: boolean}} options */
  decoders['GBK'] = function(options) {
    return new GB18030Decoder(options);
  };

  // 11.1.2 gbk encoder
  // gbk's encoder is gb18030's encoder with its gbk flag set.
  /** @param {{fatal: boolean}} options */
  encoders['GBK'] = function(options) {
    return new GB18030Encoder(options, true);
  };

  // 11.2 gb18030

  // 11.2.1 gb18030 decoder
  /**
   * @constructor
   * @implements {Decoder}
   * @param {{fatal: boolean}} options
   */
  function GB18030Decoder(options) {
    var fatal = options.fatal;
    // gb18030's decoder has an associated gb18030 first, gb18030
    // second, and gb18030 third (all initially 0x00).
    var /** @type {number} */ gb18030_first = 0x00,
        /** @type {number} */ gb18030_second = 0x00,
        /** @type {number} */ gb18030_third = 0x00;
    /**
     * @param {Stream} stream The stream of bytes being decoded.
     * @param {number} bite The next byte read from the stream.
     * @return {?(number|!Array.<number>)} The next code point(s)
     *     decoded, or null if not enough data exists in the input
     *     stream to decode a complete code point.
     */
    this.handler = function(stream, bite) {
      // 1. If byte is end-of-stream and gb18030 first, gb18030
      // second, and gb18030 third are 0x00, return finished.
      if (bite === end_of_stream && gb18030_first === 0x00 &&
          gb18030_second === 0x00 && gb18030_third === 0x00) {
        return finished;
      }
      // 2. If byte is end-of-stream, and gb18030 first, gb18030
      // second, or gb18030 third is not 0x00, set gb18030 first,
      // gb18030 second, and gb18030 third to 0x00, and return error.
      if (bite === end_of_stream &&
          (gb18030_first !== 0x00 || gb18030_second !== 0x00 ||
           gb18030_third !== 0x00)) {
        gb18030_first = 0x00;
        gb18030_second = 0x00;
        gb18030_third = 0x00;
        decoderError(fatal);
      }
      var code_point;
      // 3. If gb18030 third is not 0x00, run these substeps:
      if (gb18030_third !== 0x00) {
        // 1. Let code point be null.
        code_point = null;
        // 2. If byte is in the range 0x30 to 0x39, set code point to
        // the index gb18030 ranges code point for (((gb18030 first −
        // 0x81) × 10 + gb18030 second − 0x30) × 126 + gb18030 third −
        // 0x81) × 10 + byte − 0x30.
        if (inRange(bite, 0x30, 0x39)) {
          code_point = indexGB18030RangesCodePointFor(
              (((gb18030_first - 0x81) * 10 + (gb18030_second - 0x30)) * 126 +
               (gb18030_third - 0x81)) * 10 + bite - 0x30);
        }

        // 3. Let buffer be a byte sequence consisting of gb18030
        // second, gb18030 third, and byte, in order.
        var buffer = [gb18030_second, gb18030_third, bite];

        // 4. Set gb18030 first, gb18030 second, and gb18030 third to
        // 0x00.
        gb18030_first = 0x00;
        gb18030_second = 0x00;
        gb18030_third = 0x00;

        // 5. If code point is null, prepend buffer to stream and
        // return error.
        if (code_point === null) {
          stream.prepend(buffer);
          return decoderError(fatal);
        }

        // 6. Return a code point whose value is code point.
        return code_point;
      }

      // 4. If gb18030 second is not 0x00, run these substeps:
      if (gb18030_second !== 0x00) {

        // 1. If byte is in the range 0x81 to 0xFE, set gb18030 third
        // to byte and return continue.
        if (inRange(bite, 0x81, 0xFE)) {
          gb18030_third = bite;
          return null;
        }

        // 2. Prepend gb18030 second followed by byte to stream, set
        // gb18030 first and gb18030 second to 0x00, and return error.
        stream.prepend([gb18030_second, bite]);
        gb18030_first = 0x00;
        gb18030_second = 0x00;
        return decoderError(fatal);
      }

      // 5. If gb18030 first is not 0x00, run these substeps:
      if (gb18030_first !== 0x00) {

        // 1. If byte is in the range 0x30 to 0x39, set gb18030 second
        // to byte and return continue.
        if (inRange(bite, 0x30, 0x39)) {
          gb18030_second = bite;
          return null;
        }

        // 2. Let lead be gb18030 first, let pointer be null, and set
        // gb18030 first to 0x00.
        var lead = gb18030_first;
        var pointer = null;
        gb18030_first = 0x00;

        // 3. Let offset be 0x40 if byte is less than 0x7F and 0x41
        // otherwise.
        var offset = bite < 0x7F ? 0x40 : 0x41;

        // 4. If byte is in the range 0x40 to 0x7E or 0x80 to 0xFE,
        // set pointer to (lead − 0x81) × 190 + (byte − offset).
        if (inRange(bite, 0x40, 0x7E) || inRange(bite, 0x80, 0xFE))
          pointer = (lead - 0x81) * 190 + (bite - offset);

        // 5. Let code point be null if pointer is null and the index
        // code point for pointer in index gb18030 otherwise.
        code_point = pointer === null ? null :
            indexCodePointFor(pointer, index('gb18030'));

        // 6. If code point is null and byte is an ASCII byte, prepend
        // byte to stream.
        if (code_point === null && isASCIIByte(bite))
          stream.prepend(bite);

        // 7. If code point is null, return error.
        if (code_point === null)
          return decoderError(fatal);

        // 8. Return a code point whose value is code point.
        return code_point;
      }

      // 6. If byte is an ASCII byte, return a code point whose value
      // is byte.
      if (isASCIIByte(bite))
        return bite;

      // 7. If byte is 0x80, return code point U+20AC.
      if (bite === 0x80)
        return 0x20AC;

      // 8. If byte is in the range 0x81 to 0xFE, set gb18030 first to
      // byte and return continue.
      if (inRange(bite, 0x81, 0xFE)) {
        gb18030_first = bite;
        return null;
      }

      // 9. Return error.
      return decoderError(fatal);
    };
  }

  // 11.2.2 gb18030 encoder
  /**
   * @constructor
   * @implements {Encoder}
   * @param {{fatal: boolean}} options
   * @param {boolean=} gbk_flag
   */
  function GB18030Encoder(options, gbk_flag) {
    var fatal = options.fatal;
    // gb18030's decoder has an associated gbk flag (initially unset).
    /**
     * @param {Stream} stream Input stream.
     * @param {number} code_point Next code point read from the stream.
     * @return {(number|!Array.<number>)} Byte(s) to emit.
     */
    this.handler = function(stream, code_point) {
      // 1. If code point is end-of-stream, return finished.
      if (code_point === end_of_stream)
        return finished;

      // 2. If code point is an ASCII code point, return a byte whose
      // value is code point.
      if (isASCIICodePoint(code_point))
        return code_point;

      // 3. If code point is U+E5E5, return error with code point.
      if (code_point === 0xE5E5)
        return encoderError(code_point);

      // 4. If the gbk flag is set and code point is U+20AC, return
      // byte 0x80.
      if (gbk_flag && code_point === 0x20AC)
        return 0x80;

      // 5. Let pointer be the index pointer for code point in index
      // gb18030.
      var pointer = indexPointerFor(code_point, index('gb18030'));

      // 6. If pointer is not null, run these substeps:
      if (pointer !== null) {

        // 1. Let lead be floor(pointer / 190) + 0x81.
        var lead = floor(pointer / 190) + 0x81;

        // 2. Let trail be pointer % 190.
        var trail = pointer % 190;

        // 3. Let offset be 0x40 if trail is less than 0x3F and 0x41 otherwise.
        var offset = trail < 0x3F ? 0x40 : 0x41;

        // 4. Return two bytes whose values are lead and trail + offset.
        return [lead, trail + offset];
      }

      // 7. If gbk flag is set, return error with code point.
      if (gbk_flag)
        return encoderError(code_point);

      // 8. Set pointer to the index gb18030 ranges pointer for code
      // point.
      pointer = indexGB18030RangesPointerFor(code_point);

      // 9. Let byte1 be floor(pointer / 10 / 126 / 10).
      var byte1 = floor(pointer / 10 / 126 / 10);

      // 10. Set pointer to pointer − byte1 × 10 × 126 × 10.
      pointer = pointer - byte1 * 10 * 126 * 10;

      // 11. Let byte2 be floor(pointer / 10 / 126).
      var byte2 = floor(pointer / 10 / 126);

      // 12. Set pointer to pointer − byte2 × 10 × 126.
      pointer = pointer - byte2 * 10 * 126;

      // 13. Let byte3 be floor(pointer / 10).
      var byte3 = floor(pointer / 10);

      // 14. Let byte4 be pointer − byte3 × 10.
      var byte4 = pointer - byte3 * 10;

      // 15. Return four bytes whose values are byte1 + 0x81, byte2 +
      // 0x30, byte3 + 0x81, byte4 + 0x30.
      return [byte1 + 0x81,
              byte2 + 0x30,
              byte3 + 0x81,
              byte4 + 0x30];
    };
  }

  /** @param {{fatal: boolean}} options */
  encoders['gb18030'] = function(options) {
    return new GB18030Encoder(options);
  };
  /** @param {{fatal: boolean}} options */
  decoders['gb18030'] = function(options) {
    return new GB18030Decoder(options);
  };


  //
  // 12. Legacy multi-byte Chinese (traditional) encodings
  //

  // 12.1 big5

  // 12.1.1 big5 decoder
  /**
   * @constructor
   * @implements {Decoder}
   * @param {{fatal: boolean}} options
   */
  function Big5Decoder(options) {
    var fatal = options.fatal;
    // big5's decoder has an associated big5 lead (initially 0x00).
    var /** @type {number} */ big5_lead = 0x00;

    /**
     * @param {Stream} stream The stream of bytes being decoded.
     * @param {number} bite The next byte read from the stream.
     * @return {?(number|!Array.<number>)} The next code point(s)
     *     decoded, or null if not enough data exists in the input
     *     stream to decode a complete code point.
     */
    this.handler = function(stream, bite) {
      // 1. If byte is end-of-stream and big5 lead is not 0x00, set
      // big5 lead to 0x00 and return error.
      if (bite === end_of_stream && big5_lead !== 0x00) {
        big5_lead = 0x00;
        return decoderError(fatal);
      }

      // 2. If byte is end-of-stream and big5 lead is 0x00, return
      // finished.
      if (bite === end_of_stream && big5_lead === 0x00)
        return finished;

      // 3. If big5 lead is not 0x00, let lead be big5 lead, let
      // pointer be null, set big5 lead to 0x00, and then run these
      // substeps:
      if (big5_lead !== 0x00) {
        var lead = big5_lead;
        var pointer = null;
        big5_lead = 0x00;

        // 1. Let offset be 0x40 if byte is less than 0x7F and 0x62
        // otherwise.
        var offset = bite < 0x7F ? 0x40 : 0x62;

        // 2. If byte is in the range 0x40 to 0x7E or 0xA1 to 0xFE,
        // set pointer to (lead − 0x81) × 157 + (byte − offset).
        if (inRange(bite, 0x40, 0x7E) || inRange(bite, 0xA1, 0xFE))
          pointer = (lead - 0x81) * 157 + (bite - offset);

        // 3. If there is a row in the table below whose first column
        // is pointer, return the two code points listed in its second
        // column
        // Pointer | Code points
        // --------+--------------
        // 1133    | U+00CA U+0304
        // 1135    | U+00CA U+030C
        // 1164    | U+00EA U+0304
        // 1166    | U+00EA U+030C
        switch (pointer) {
          case 1133: return [0x00CA, 0x0304];
          case 1135: return [0x00CA, 0x030C];
          case 1164: return [0x00EA, 0x0304];
          case 1166: return [0x00EA, 0x030C];
        }

        // 4. Let code point be null if pointer is null and the index
        // code point for pointer in index big5 otherwise.
        var code_point = (pointer === null) ? null :
            indexCodePointFor(pointer, index('big5'));

        // 5. If code point is null and byte is an ASCII byte, prepend
        // byte to stream.
        if (code_point === null && isASCIIByte(bite))
          stream.prepend(bite);

        // 6. If code point is null, return error.
        if (code_point === null)
          return decoderError(fatal);

        // 7. Return a code point whose value is code point.
        return code_point;
      }

      // 4. If byte is an ASCII byte, return a code point whose value
      // is byte.
      if (isASCIIByte(bite))
        return bite;

      // 5. If byte is in the range 0x81 to 0xFE, set big5 lead to
      // byte and return continue.
      if (inRange(bite, 0x81, 0xFE)) {
        big5_lead = bite;
        return null;
      }

      // 6. Return error.
      return decoderError(fatal);
    };
  }

  // 12.1.2 big5 encoder
  /**
   * @constructor
   * @implements {Encoder}
   * @param {{fatal: boolean}} options
   */
  function Big5Encoder(options) {
    var fatal = options.fatal;
    /**
     * @param {Stream} stream Input stream.
     * @param {number} code_point Next code point read from the stream.
     * @return {(number|!Array.<number>)} Byte(s) to emit.
     */
    this.handler = function(stream, code_point) {
      // 1. If code point is end-of-stream, return finished.
      if (code_point === end_of_stream)
        return finished;

      // 2. If code point is an ASCII code point, return a byte whose
      // value is code point.
      if (isASCIICodePoint(code_point))
        return code_point;

      // 3. Let pointer be the index big5 pointer for code point.
      var pointer = indexBig5PointerFor(code_point);

      // 4. If pointer is null, return error with code point.
      if (pointer === null)
        return encoderError(code_point);

      // 5. Let lead be floor(pointer / 157) + 0x81.
      var lead = floor(pointer / 157) + 0x81;

      // 6. If lead is less than 0xA1, return error with code point.
      if (lead < 0xA1)
        return encoderError(code_point);

      // 7. Let trail be pointer % 157.
      var trail = pointer % 157;

      // 8. Let offset be 0x40 if trail is less than 0x3F and 0x62
      // otherwise.
      var offset = trail < 0x3F ? 0x40 : 0x62;

      // Return two bytes whose values are lead and trail + offset.
      return [lead, trail + offset];
    };
  }

  /** @param {{fatal: boolean}} options */
  encoders['Big5'] = function(options) {
    return new Big5Encoder(options);
  };
  /** @param {{fatal: boolean}} options */
  decoders['Big5'] = function(options) {
    return new Big5Decoder(options);
  };


  //
  // 13. Legacy multi-byte Japanese encodings
  //

  // 13.1 euc-jp

  // 13.1.1 euc-jp decoder
  /**
   * @constructor
   * @implements {Decoder}
   * @param {{fatal: boolean}} options
   */
  function EUCJPDecoder(options) {
    var fatal = options.fatal;

    // euc-jp's decoder has an associated euc-jp jis0212 flag
    // (initially unset) and euc-jp lead (initially 0x00).
    var /** @type {boolean} */ eucjp_jis0212_flag = false,
        /** @type {number} */ eucjp_lead = 0x00;

    /**
     * @param {Stream} stream The stream of bytes being decoded.
     * @param {number} bite The next byte read from the stream.
     * @return {?(number|!Array.<number>)} The next code point(s)
     *     decoded, or null if not enough data exists in the input
     *     stream to decode a complete code point.
     */
    this.handler = function(stream, bite) {
      // 1. If byte is end-of-stream and euc-jp lead is not 0x00, set
      // euc-jp lead to 0x00, and return error.
      if (bite === end_of_stream && eucjp_lead !== 0x00) {
        eucjp_lead = 0x00;
        return decoderError(fatal);
      }

      // 2. If byte is end-of-stream and euc-jp lead is 0x00, return
      // finished.
      if (bite === end_of_stream && eucjp_lead === 0x00)
        return finished;

      // 3. If euc-jp lead is 0x8E and byte is in the range 0xA1 to
      // 0xDF, set euc-jp lead to 0x00 and return a code point whose
      // value is 0xFF61 + byte − 0xA1.
      if (eucjp_lead === 0x8E && inRange(bite, 0xA1, 0xDF)) {
        eucjp_lead = 0x00;
        return 0xFF61 + bite - 0xA1;
      }

      // 4. If euc-jp lead is 0x8F and byte is in the range 0xA1 to
      // 0xFE, set the euc-jp jis0212 flag, set euc-jp lead to byte,
      // and return continue.
      if (eucjp_lead === 0x8F && inRange(bite, 0xA1, 0xFE)) {
        eucjp_jis0212_flag = true;
        eucjp_lead = bite;
        return null;
      }

      // 5. If euc-jp lead is not 0x00, let lead be euc-jp lead, set
      // euc-jp lead to 0x00, and run these substeps:
      if (eucjp_lead !== 0x00) {
        var lead = eucjp_lead;
        eucjp_lead = 0x00;

        // 1. Let code point be null.
        var code_point = null;

        // 2. If lead and byte are both in the range 0xA1 to 0xFE, set
        // code point to the index code point for (lead − 0xA1) × 94 +
        // byte − 0xA1 in index jis0208 if the euc-jp jis0212 flag is
        // unset and in index jis0212 otherwise.
        if (inRange(lead, 0xA1, 0xFE) && inRange(bite, 0xA1, 0xFE)) {
          code_point = indexCodePointFor(
            (lead - 0xA1) * 94 + (bite - 0xA1),
            index(!eucjp_jis0212_flag ? 'jis0208' : 'jis0212'));
        }

        // 3. Unset the euc-jp jis0212 flag.
        eucjp_jis0212_flag = false;

        // 4. If byte is not in the range 0xA1 to 0xFE, prepend byte
        // to stream.
        if (!inRange(bite, 0xA1, 0xFE))
          stream.prepend(bite);

        // 5. If code point is null, return error.
        if (code_point === null)
          return decoderError(fatal);

        // 6. Return a code point whose value is code point.
        return code_point;
      }

      // 6. If byte is an ASCII byte, return a code point whose value
      // is byte.
      if (isASCIIByte(bite))
        return bite;

      // 7. If byte is 0x8E, 0x8F, or in the range 0xA1 to 0xFE, set
      // euc-jp lead to byte and return continue.
      if (bite === 0x8E || bite === 0x8F || inRange(bite, 0xA1, 0xFE)) {
        eucjp_lead = bite;
        return null;
      }

      // 8. Return error.
      return decoderError(fatal);
    };
  }

  // 13.1.2 euc-jp encoder
  /**
   * @constructor
   * @implements {Encoder}
   * @param {{fatal: boolean}} options
   */
  function EUCJPEncoder(options) {
    var fatal = options.fatal;
    /**
     * @param {Stream} stream Input stream.
     * @param {number} code_point Next code point read from the stream.
     * @return {(number|!Array.<number>)} Byte(s) to emit.
     */
    this.handler = function(stream, code_point) {
      // 1. If code point is end-of-stream, return finished.
      if (code_point === end_of_stream)
        return finished;

      // 2. If code point is an ASCII code point, return a byte whose
      // value is code point.
      if (isASCIICodePoint(code_point))
        return code_point;

      // 3. If code point is U+00A5, return byte 0x5C.
      if (code_point === 0x00A5)
        return 0x5C;

      // 4. If code point is U+203E, return byte 0x7E.
      if (code_point === 0x203E)
        return 0x7E;

      // 5. If code point is in the range U+FF61 to U+FF9F, return two
      // bytes whose values are 0x8E and code point − 0xFF61 + 0xA1.
      if (inRange(code_point, 0xFF61, 0xFF9F))
        return [0x8E, code_point - 0xFF61 + 0xA1];

      // 6. If code point is U+2212, set it to U+FF0D.
      if (code_point === 0x2212)
        code_point = 0xFF0D;

      // 7. Let pointer be the index pointer for code point in index
      // jis0208.
      var pointer = indexPointerFor(code_point, index('jis0208'));

      // 8. If pointer is null, return error with code point.
      if (pointer === null)
        return encoderError(code_point);

      // 9. Let lead be floor(pointer / 94) + 0xA1.
      var lead = floor(pointer / 94) + 0xA1;

      // 10. Let trail be pointer % 94 + 0xA1.
      var trail = pointer % 94 + 0xA1;

      // 11. Return two bytes whose values are lead and trail.
      return [lead, trail];
    };
  }

  /** @param {{fatal: boolean}} options */
  encoders['EUC-JP'] = function(options) {
    return new EUCJPEncoder(options);
  };
  /** @param {{fatal: boolean}} options */
  decoders['EUC-JP'] = function(options) {
    return new EUCJPDecoder(options);
  };

  // 13.2 iso-2022-jp

  // 13.2.1 iso-2022-jp decoder
  /**
   * @constructor
   * @implements {Decoder}
   * @param {{fatal: boolean}} options
   */
  function ISO2022JPDecoder(options) {
    var fatal = options.fatal;
    /** @enum */
    var states = {
      ASCII: 0,
      Roman: 1,
      Katakana: 2,
      LeadByte: 3,
      TrailByte: 4,
      EscapeStart: 5,
      Escape: 6
    };
    // iso-2022-jp's decoder has an associated iso-2022-jp decoder
    // state (initially ASCII), iso-2022-jp decoder output state
    // (initially ASCII), iso-2022-jp lead (initially 0x00), and
    // iso-2022-jp output flag (initially unset).
    var /** @type {number} */ iso2022jp_decoder_state = states.ASCII,
        /** @type {number} */ iso2022jp_decoder_output_state = states.ASCII,
        /** @type {number} */ iso2022jp_lead = 0x00,
        /** @type {boolean} */ iso2022jp_output_flag = false;
    /**
     * @param {Stream} stream The stream of bytes being decoded.
     * @param {number} bite The next byte read from the stream.
     * @return {?(number|!Array.<number>)} The next code point(s)
     *     decoded, or null if not enough data exists in the input
     *     stream to decode a complete code point.
     */
    this.handler = function(stream, bite) {
      // switching on iso-2022-jp decoder state:
      switch (iso2022jp_decoder_state) {
      default:
      case states.ASCII:
        // ASCII
        // Based on byte:

        // 0x1B
        if (bite === 0x1B) {
          // Set iso-2022-jp decoder state to escape start and return
          // continue.
          iso2022jp_decoder_state = states.EscapeStart;
          return null;
        }

        // 0x00 to 0x7F, excluding 0x0E, 0x0F, and 0x1B
        if (inRange(bite, 0x00, 0x7F) && bite !== 0x0E
            && bite !== 0x0F && bite !== 0x1B) {
          // Unset the iso-2022-jp output flag and return a code point
          // whose value is byte.
          iso2022jp_output_flag = false;
          return bite;
        }

        // end-of-stream
        if (bite === end_of_stream) {
          // Return finished.
          return finished;
        }

        // Otherwise
        // Unset the iso-2022-jp output flag and return error.
        iso2022jp_output_flag = false;
        return decoderError(fatal);

      case states.Roman:
        // Roman
        // Based on byte:

        // 0x1B
        if (bite === 0x1B) {
          // Set iso-2022-jp decoder state to escape start and return
          // continue.
          iso2022jp_decoder_state = states.EscapeStart;
          return null;
        }

        // 0x5C
        if (bite === 0x5C) {
          // Unset the iso-2022-jp output flag and return code point
          // U+00A5.
          iso2022jp_output_flag = false;
          return 0x00A5;
        }

        // 0x7E
        if (bite === 0x7E) {
          // Unset the iso-2022-jp output flag and return code point
          // U+203E.
          iso2022jp_output_flag = false;
          return 0x203E;
        }

        // 0x00 to 0x7F, excluding 0x0E, 0x0F, 0x1B, 0x5C, and 0x7E
        if (inRange(bite, 0x00, 0x7F) && bite !== 0x0E && bite !== 0x0F
            && bite !== 0x1B && bite !== 0x5C && bite !== 0x7E) {
          // Unset the iso-2022-jp output flag and return a code point
          // whose value is byte.
          iso2022jp_output_flag = false;
          return bite;
        }

        // end-of-stream
        if (bite === end_of_stream) {
          // Return finished.
          return finished;
        }

        // Otherwise
        // Unset the iso-2022-jp output flag and return error.
        iso2022jp_output_flag = false;
        return decoderError(fatal);

      case states.Katakana:
        // Katakana
        // Based on byte:

        // 0x1B
        if (bite === 0x1B) {
          // Set iso-2022-jp decoder state to escape start and return
          // continue.
          iso2022jp_decoder_state = states.EscapeStart;
          return null;
        }

        // 0x21 to 0x5F
        if (inRange(bite, 0x21, 0x5F)) {
          // Unset the iso-2022-jp output flag and return a code point
          // whose value is 0xFF61 + byte − 0x21.
          iso2022jp_output_flag = false;
          return 0xFF61 + bite - 0x21;
        }

        // end-of-stream
        if (bite === end_of_stream) {
          // Return finished.
          return finished;
        }

        // Otherwise
        // Unset the iso-2022-jp output flag and return error.
        iso2022jp_output_flag = false;
        return decoderError(fatal);

      case states.LeadByte:
        // Lead byte
        // Based on byte:

        // 0x1B
        if (bite === 0x1B) {
          // Set iso-2022-jp decoder state to escape start and return
          // continue.
          iso2022jp_decoder_state = states.EscapeStart;
          return null;
        }

        // 0x21 to 0x7E
        if (inRange(bite, 0x21, 0x7E)) {
          // Unset the iso-2022-jp output flag, set iso-2022-jp lead
          // to byte, iso-2022-jp decoder state to trail byte, and
          // return continue.
          iso2022jp_output_flag = false;
          iso2022jp_lead = bite;
          iso2022jp_decoder_state = states.TrailByte;
          return null;
        }

        // end-of-stream
        if (bite === end_of_stream) {
          // Return finished.
          return finished;
        }

        // Otherwise
        // Unset the iso-2022-jp output flag and return error.
        iso2022jp_output_flag = false;
        return decoderError(fatal);

      case states.TrailByte:
        // Trail byte
        // Based on byte:

        // 0x1B
        if (bite === 0x1B) {
          // Set iso-2022-jp decoder state to escape start and return
          // continue.
          iso2022jp_decoder_state = states.EscapeStart;
          return decoderError(fatal);
        }

        // 0x21 to 0x7E
        if (inRange(bite, 0x21, 0x7E)) {
          // 1. Set the iso-2022-jp decoder state to lead byte.
          iso2022jp_decoder_state = states.LeadByte;

          // 2. Let pointer be (iso-2022-jp lead − 0x21) × 94 + byte − 0x21.
          var pointer = (iso2022jp_lead - 0x21) * 94 + bite - 0x21;

          // 3. Let code point be the index code point for pointer in
          // index jis0208.
          var code_point = indexCodePointFor(pointer, index('jis0208'));

          // 4. If code point is null, return error.
          if (code_point === null)
            return decoderError(fatal);

          // 5. Return a code point whose value is code point.
          return code_point;
        }

        // end-of-stream
        if (bite === end_of_stream) {
          // Set the iso-2022-jp decoder state to lead byte, prepend
          // byte to stream, and return error.
          iso2022jp_decoder_state = states.LeadByte;
          stream.prepend(bite);
          return decoderError(fatal);
        }

        // Otherwise
        // Set iso-2022-jp decoder state to lead byte and return
        // error.
        iso2022jp_decoder_state = states.LeadByte;
        return decoderError(fatal);

      case states.EscapeStart:
        // Escape start

        // 1. If byte is either 0x24 or 0x28, set iso-2022-jp lead to
        // byte, iso-2022-jp decoder state to escape, and return
        // continue.
        if (bite === 0x24 || bite === 0x28) {
          iso2022jp_lead = bite;
          iso2022jp_decoder_state = states.Escape;
          return null;
        }

        // 2. Prepend byte to stream.
        stream.prepend(bite);

        // 3. Unset the iso-2022-jp output flag, set iso-2022-jp
        // decoder state to iso-2022-jp decoder output state, and
        // return error.
        iso2022jp_output_flag = false;
        iso2022jp_decoder_state = iso2022jp_decoder_output_state;
        return decoderError(fatal);

      case states.Escape:
        // Escape

        // 1. Let lead be iso-2022-jp lead and set iso-2022-jp lead to
        // 0x00.
        var lead = iso2022jp_lead;
        iso2022jp_lead = 0x00;

        // 2. Let state be null.
        var state = null;

        // 3. If lead is 0x28 and byte is 0x42, set state to ASCII.
        if (lead === 0x28 && bite === 0x42)
          state = states.ASCII;

        // 4. If lead is 0x28 and byte is 0x4A, set state to Roman.
        if (lead === 0x28 && bite === 0x4A)
          state = states.Roman;

        // 5. If lead is 0x28 and byte is 0x49, set state to Katakana.
        if (lead === 0x28 && bite === 0x49)
          state = states.Katakana;

        // 6. If lead is 0x24 and byte is either 0x40 or 0x42, set
        // state to lead byte.
        if (lead === 0x24 && (bite === 0x40 || bite === 0x42))
          state = states.LeadByte;

        // 7. If state is non-null, run these substeps:
        if (state !== null) {
          // 1. Set iso-2022-jp decoder state and iso-2022-jp decoder
          // output state to states.
          iso2022jp_decoder_state = iso2022jp_decoder_state = state;

          // 2. Let output flag be the iso-2022-jp output flag.
          var output_flag = iso2022jp_output_flag;

          // 3. Set the iso-2022-jp output flag.
          iso2022jp_output_flag = true;

          // 4. Return continue, if output flag is unset, and error
          // otherwise.
          return !output_flag ? null : decoderError(fatal);
        }

        // 8. Prepend lead and byte to stream.
        stream.prepend([lead, bite]);

        // 9. Unset the iso-2022-jp output flag, set iso-2022-jp
        // decoder state to iso-2022-jp decoder output state and
        // return error.
        iso2022jp_output_flag = false;
        iso2022jp_decoder_state = iso2022jp_decoder_output_state;
        return decoderError(fatal);
      }
    };
  }

  // 13.2.2 iso-2022-jp encoder
  /**
   * @constructor
   * @implements {Encoder}
   * @param {{fatal: boolean}} options
   */
  function ISO2022JPEncoder(options) {
    var fatal = options.fatal;
    // iso-2022-jp's encoder has an associated iso-2022-jp encoder
    // state which is one of ASCII, Roman, and jis0208 (initially
    // ASCII).
    /** @enum */
    var states = {
      ASCII: 0,
      Roman: 1,
      jis0208: 2
    };
    var /** @type {number} */ iso2022jp_state = states.ASCII;
    /**
     * @param {Stream} stream Input stream.
     * @param {number} code_point Next code point read from the stream.
     * @return {(number|!Array.<number>)} Byte(s) to emit.
     */
    this.handler = function(stream, code_point) {
      // 1. If code point is end-of-stream and iso-2022-jp encoder
      // state is not ASCII, prepend code point to stream, set
      // iso-2022-jp encoder state to ASCII, and return three bytes
      // 0x1B 0x28 0x42.
      if (code_point === end_of_stream &&
          iso2022jp_state !== states.ASCII) {
        stream.prepend(code_point);
        iso2022jp_state = states.ASCII;
        return [0x1B, 0x28, 0x42];
      }

      // 2. If code point is end-of-stream and iso-2022-jp encoder
      // state is ASCII, return finished.
      if (code_point === end_of_stream && iso2022jp_state === states.ASCII)
        return finished;

      // 3. If ISO-2022-JP encoder state is ASCII or Roman, and code
      // point is U+000E, U+000F, or U+001B, return error with U+FFFD.
      if ((iso2022jp_state === states.ASCII ||
           iso2022jp_state === states.Roman) &&
          (code_point === 0x000E || code_point === 0x000F ||
           code_point === 0x001B)) {
        return encoderError(0xFFFD);
      }

      // 4. If iso-2022-jp encoder state is ASCII and code point is an
      // ASCII code point, return a byte whose value is code point.
      if (iso2022jp_state === states.ASCII &&
          isASCIICodePoint(code_point))
        return code_point;

      // 5. If iso-2022-jp encoder state is Roman and code point is an
      // ASCII code point, excluding U+005C and U+007E, or is U+00A5
      // or U+203E, run these substeps:
      if (iso2022jp_state === states.Roman &&
          ((isASCIICodePoint(code_point) &&
           code_point !== 0x005C && code_point !== 0x007E) ||
          (code_point == 0x00A5 || code_point == 0x203E))) {

        // 1. If code point is an ASCII code point, return a byte
        // whose value is code point.
        if (isASCIICodePoint(code_point))
          return code_point;

        // 2. If code point is U+00A5, return byte 0x5C.
        if (code_point === 0x00A5)
          return 0x5C;

        // 3. If code point is U+203E, return byte 0x7E.
        if (code_point === 0x203E)
          return 0x7E;
      }

      // 6. If code point is an ASCII code point, and iso-2022-jp
      // encoder state is not ASCII, prepend code point to stream, set
      // iso-2022-jp encoder state to ASCII, and return three bytes
      // 0x1B 0x28 0x42.
      if (isASCIICodePoint(code_point) &&
          iso2022jp_state !== states.ASCII) {
        stream.prepend(code_point);
        iso2022jp_state = states.ASCII;
        return [0x1B, 0x28, 0x42];
      }

      // 7. If code point is either U+00A5 or U+203E, and iso-2022-jp
      // encoder state is not Roman, prepend code point to stream, set
      // iso-2022-jp encoder state to Roman, and return three bytes
      // 0x1B 0x28 0x4A.
      if ((code_point === 0x00A5 || code_point === 0x203E) &&
          iso2022jp_state !== states.Roman) {
        stream.prepend(code_point);
        iso2022jp_state = states.Roman;
        return [0x1B, 0x28, 0x4A];
      }

      // 8. If code point is U+2212, set it to U+FF0D.
      if (code_point === 0x2212)
        code_point = 0xFF0D;

      // 9. Let pointer be the index pointer for code point in index
      // jis0208.
      var pointer = indexPointerFor(code_point, index('jis0208'));

      // 10. If pointer is null, return error with code point.
      if (pointer === null)
        return encoderError(code_point);

      // 11. If iso-2022-jp encoder state is not jis0208, prepend code
      // point to stream, set iso-2022-jp encoder state to jis0208,
      // and return three bytes 0x1B 0x24 0x42.
      if (iso2022jp_state !== states.jis0208) {
        stream.prepend(code_point);
        iso2022jp_state = states.jis0208;
        return [0x1B, 0x24, 0x42];
      }

      // 12. Let lead be floor(pointer / 94) + 0x21.
      var lead = floor(pointer / 94) + 0x21;

      // 13. Let trail be pointer % 94 + 0x21.
      var trail = pointer % 94 + 0x21;

      // 14. Return two bytes whose values are lead and trail.
      return [lead, trail];
    };
  }

  /** @param {{fatal: boolean}} options */
  encoders['ISO-2022-JP'] = function(options) {
    return new ISO2022JPEncoder(options);
  };
  /** @param {{fatal: boolean}} options */
  decoders['ISO-2022-JP'] = function(options) {
    return new ISO2022JPDecoder(options);
  };

  // 13.3 shift_jis

  // 13.3.1 shift_jis decoder
  /**
   * @constructor
   * @implements {Decoder}
   * @param {{fatal: boolean}} options
   */
  function ShiftJISDecoder(options) {
    var fatal = options.fatal;
    // shift_jis's decoder has an associated shift_jis lead (initially
    // 0x00).
    var /** @type {number} */ shiftjis_lead = 0x00;
    /**
     * @param {Stream} stream The stream of bytes being decoded.
     * @param {number} bite The next byte read from the stream.
     * @return {?(number|!Array.<number>)} The next code point(s)
     *     decoded, or null if not enough data exists in the input
     *     stream to decode a complete code point.
     */
    this.handler = function(stream, bite) {
      // 1. If byte is end-of-stream and shift_jis lead is not 0x00,
      // set shift_jis lead to 0x00 and return error.
      if (bite === end_of_stream && shiftjis_lead !== 0x00) {
        shiftjis_lead = 0x00;
        return decoderError(fatal);
      }

      // 2. If byte is end-of-stream and shift_jis lead is 0x00,
      // return finished.
      if (bite === end_of_stream && shiftjis_lead === 0x00)
        return finished;

      // 3. If shift_jis lead is not 0x00, let lead be shift_jis lead,
      // let pointer be null, set shift_jis lead to 0x00, and then run
      // these substeps:
      if (shiftjis_lead !== 0x00) {
        var lead = shiftjis_lead;
        var pointer = null;
        shiftjis_lead = 0x00;

        // 1. Let offset be 0x40, if byte is less than 0x7F, and 0x41
        // otherwise.
        var offset = (bite < 0x7F) ? 0x40 : 0x41;

        // 2. Let lead offset be 0x81, if lead is less than 0xA0, and
        // 0xC1 otherwise.
        var lead_offset = (lead < 0xA0) ? 0x81 : 0xC1;

        // 3. If byte is in the range 0x40 to 0x7E or 0x80 to 0xFC,
        // set pointer to (lead − lead offset) × 188 + byte − offset.
        if (inRange(bite, 0x40, 0x7E) || inRange(bite, 0x80, 0xFC))
          pointer = (lead - lead_offset) * 188 + bite - offset;

        // 4. Let code point be null, if pointer is null, and the
        // index code point for pointer in index jis0208 otherwise.
        var code_point = (pointer === null) ? null :
              indexCodePointFor(pointer, index('jis0208'));

        // 5. If code point is null and pointer is in the range 8836
        // to 10528, return a code point whose value is 0xE000 +
        // pointer − 8836.
        if (code_point === null && pointer !== null &&
            inRange(pointer, 8836, 10528))
          return 0xE000 + pointer - 8836;

        // 6. If code point is null and byte is an ASCII byte, prepend
        // byte to stream.
        if (code_point === null && isASCIIByte(bite))
          stream.prepend(bite);

        // 7. If code point is null, return error.
        if (code_point === null)
          return decoderError(fatal);

        // 8. Return a code point whose value is code point.
        return code_point;
      }

      // 4. If byte is an ASCII byte or 0x80, return a code point
      // whose value is byte.
      if (isASCIIByte(bite) || bite === 0x80)
        return bite;

      // 5. If byte is in the range 0xA1 to 0xDF, return a code point
      // whose value is 0xFF61 + byte − 0xA1.
      if (inRange(bite, 0xA1, 0xDF))
        return 0xFF61 + bite - 0xA1;

      // 6. If byte is in the range 0x81 to 0x9F or 0xE0 to 0xFC, set
      // shift_jis lead to byte and return continue.
      if (inRange(bite, 0x81, 0x9F) || inRange(bite, 0xE0, 0xFC)) {
        shiftjis_lead = bite;
        return null;
      }

      // 7. Return error.
      return decoderError(fatal);
    };
  }

  // 13.3.2 shift_jis encoder
  /**
   * @constructor
   * @implements {Encoder}
   * @param {{fatal: boolean}} options
   */
  function ShiftJISEncoder(options) {
    var fatal = options.fatal;
    /**
     * @param {Stream} stream Input stream.
     * @param {number} code_point Next code point read from the stream.
     * @return {(number|!Array.<number>)} Byte(s) to emit.
     */
    this.handler = function(stream, code_point) {
      // 1. If code point is end-of-stream, return finished.
      if (code_point === end_of_stream)
        return finished;

      // 2. If code point is an ASCII code point or U+0080, return a
      // byte whose value is code point.
      if (isASCIICodePoint(code_point) || code_point === 0x0080)
        return code_point;

      // 3. If code point is U+00A5, return byte 0x5C.
      if (code_point === 0x00A5)
        return 0x5C;

      // 4. If code point is U+203E, return byte 0x7E.
      if (code_point === 0x203E)
        return 0x7E;

      // 5. If code point is in the range U+FF61 to U+FF9F, return a
      // byte whose value is code point − 0xFF61 + 0xA1.
      if (inRange(code_point, 0xFF61, 0xFF9F))
        return code_point - 0xFF61 + 0xA1;

      // 6. If code point is U+2212, set it to U+FF0D.
      if (code_point === 0x2212)
        code_point = 0xFF0D;

      // 7. Let pointer be the index shift_jis pointer for code point.
      var pointer = indexShiftJISPointerFor(code_point);

      // 8. If pointer is null, return error with code point.
      if (pointer === null)
        return encoderError(code_point);

      // 9. Let lead be floor(pointer / 188).
      var lead = floor(pointer / 188);

      // 10. Let lead offset be 0x81, if lead is less than 0x1F, and
      // 0xC1 otherwise.
      var lead_offset = (lead < 0x1F) ? 0x81 : 0xC1;

      // 11. Let trail be pointer % 188.
      var trail = pointer % 188;

      // 12. Let offset be 0x40, if trail is less than 0x3F, and 0x41
      // otherwise.
      var offset = (trail < 0x3F) ? 0x40 : 0x41;

      // 13. Return two bytes whose values are lead + lead offset and
      // trail + offset.
      return [lead + lead_offset, trail + offset];
    };
  }

  /** @param {{fatal: boolean}} options */
  encoders['Shift_JIS'] = function(options) {
    return new ShiftJISEncoder(options);
  };
  /** @param {{fatal: boolean}} options */
  decoders['Shift_JIS'] = function(options) {
    return new ShiftJISDecoder(options);
  };

  //
  // 14. Legacy multi-byte Korean encodings
  //

  // 14.1 euc-kr

  // 14.1.1 euc-kr decoder
  /**
   * @constructor
   * @implements {Decoder}
   * @param {{fatal: boolean}} options
   */
  function EUCKRDecoder(options) {
    var fatal = options.fatal;

    // euc-kr's decoder has an associated euc-kr lead (initially 0x00).
    var /** @type {number} */ euckr_lead = 0x00;
    /**
     * @param {Stream} stream The stream of bytes being decoded.
     * @param {number} bite The next byte read from the stream.
     * @return {?(number|!Array.<number>)} The next code point(s)
     *     decoded, or null if not enough data exists in the input
     *     stream to decode a complete code point.
     */
    this.handler = function(stream, bite) {
      // 1. If byte is end-of-stream and euc-kr lead is not 0x00, set
      // euc-kr lead to 0x00 and return error.
      if (bite === end_of_stream && euckr_lead !== 0) {
        euckr_lead = 0x00;
        return decoderError(fatal);
      }

      // 2. If byte is end-of-stream and euc-kr lead is 0x00, return
      // finished.
      if (bite === end_of_stream && euckr_lead === 0)
        return finished;

      // 3. If euc-kr lead is not 0x00, let lead be euc-kr lead, let
      // pointer be null, set euc-kr lead to 0x00, and then run these
      // substeps:
      if (euckr_lead !== 0x00) {
        var lead = euckr_lead;
        var pointer = null;
        euckr_lead = 0x00;

        // 1. If byte is in the range 0x41 to 0xFE, set pointer to
        // (lead − 0x81) × 190 + (byte − 0x41).
        if (inRange(bite, 0x41, 0xFE))
          pointer = (lead - 0x81) * 190 + (bite - 0x41);

        // 2. Let code point be null, if pointer is null, and the
        // index code point for pointer in index euc-kr otherwise.
        var code_point = (pointer === null)
              ? null : indexCodePointFor(pointer, index('euc-kr'));

        // 3. If code point is null and byte is an ASCII byte, prepend
        // byte to stream.
        if (pointer === null && isASCIIByte(bite))
          stream.prepend(bite);

        // 4. If code point is null, return error.
        if (code_point === null)
          return decoderError(fatal);

        // 5. Return a code point whose value is code point.
        return code_point;
      }

      // 4. If byte is an ASCII byte, return a code point whose value
      // is byte.
      if (isASCIIByte(bite))
        return bite;

      // 5. If byte is in the range 0x81 to 0xFE, set euc-kr lead to
      // byte and return continue.
      if (inRange(bite, 0x81, 0xFE)) {
        euckr_lead = bite;
        return null;
      }

      // 6. Return error.
      return decoderError(fatal);
    };
  }

  // 14.1.2 euc-kr encoder
  /**
   * @constructor
   * @implements {Encoder}
   * @param {{fatal: boolean}} options
   */
  function EUCKREncoder(options) {
    var fatal = options.fatal;
    /**
     * @param {Stream} stream Input stream.
     * @param {number} code_point Next code point read from the stream.
     * @return {(number|!Array.<number>)} Byte(s) to emit.
     */
    this.handler = function(stream, code_point) {
      // 1. If code point is end-of-stream, return finished.
      if (code_point === end_of_stream)
        return finished;

      // 2. If code point is an ASCII code point, return a byte whose
      // value is code point.
      if (isASCIICodePoint(code_point))
        return code_point;

      // 3. Let pointer be the index pointer for code point in index
      // euc-kr.
      var pointer = indexPointerFor(code_point, index('euc-kr'));

      // 4. If pointer is null, return error with code point.
      if (pointer === null)
        return encoderError(code_point);

      // 5. Let lead be floor(pointer / 190) + 0x81.
      var lead = floor(pointer / 190) + 0x81;

      // 6. Let trail be pointer % 190 + 0x41.
      var trail = (pointer % 190) + 0x41;

      // 7. Return two bytes whose values are lead and trail.
      return [lead, trail];
    };
  }

  /** @param {{fatal: boolean}} options */
  encoders['EUC-KR'] = function(options) {
    return new EUCKREncoder(options);
  };
  /** @param {{fatal: boolean}} options */
  decoders['EUC-KR'] = function(options) {
    return new EUCKRDecoder(options);
  };


  //
  // 15. Legacy miscellaneous encodings
  //

  // 15.1 replacement

  // Not needed - API throws RangeError

  // 15.2 Common infrastructure for utf-16be and utf-16le

  /**
   * @param {number} code_unit
   * @param {boolean} utf16be
   * @return {!Array.<number>} bytes
   */
  function convertCodeUnitToBytes(code_unit, utf16be) {
    // 1. Let byte1 be code unit >> 8.
    var byte1 = code_unit >> 8;

    // 2. Let byte2 be code unit & 0x00FF.
    var byte2 = code_unit & 0x00FF;

    // 3. Then return the bytes in order:
        // utf-16be flag is set: byte1, then byte2.
    if (utf16be)
      return [byte1, byte2];
    // utf-16be flag is unset: byte2, then byte1.
    return [byte2, byte1];
  }

  // 15.2.1 shared utf-16 decoder
  /**
   * @constructor
   * @implements {Decoder}
   * @param {boolean} utf16_be True if big-endian, false if little-endian.
   * @param {{fatal: boolean}} options
   */
  function UTF16Decoder(utf16_be, options) {
    var fatal = options.fatal;
    var /** @type {?number} */ utf16_lead_byte = null,
        /** @type {?number} */ utf16_lead_surrogate = null;
    /**
     * @param {Stream} stream The stream of bytes being decoded.
     * @param {number} bite The next byte read from the stream.
     * @return {?(number|!Array.<number>)} The next code point(s)
     *     decoded, or null if not enough data exists in the input
     *     stream to decode a complete code point.
     */
    this.handler = function(stream, bite) {
      // 1. If byte is end-of-stream and either utf-16 lead byte or
      // utf-16 lead surrogate is not null, set utf-16 lead byte and
      // utf-16 lead surrogate to null, and return error.
      if (bite === end_of_stream && (utf16_lead_byte !== null ||
                                utf16_lead_surrogate !== null)) {
        return decoderError(fatal);
      }

      // 2. If byte is end-of-stream and utf-16 lead byte and utf-16
      // lead surrogate are null, return finished.
      if (bite === end_of_stream && utf16_lead_byte === null &&
          utf16_lead_surrogate === null) {
        return finished;
      }

      // 3. If utf-16 lead byte is null, set utf-16 lead byte to byte
      // and return continue.
      if (utf16_lead_byte === null) {
        utf16_lead_byte = bite;
        return null;
      }

      // 4. Let code unit be the result of:
      var code_unit;
      if (utf16_be) {
        // utf-16be decoder flag is set
        //   (utf-16 lead byte << 8) + byte.
        code_unit = (utf16_lead_byte << 8) + bite;
      } else {
        // utf-16be decoder flag is unset
        //   (byte << 8) + utf-16 lead byte.
        code_unit = (bite << 8) + utf16_lead_byte;
      }
      // Then set utf-16 lead byte to null.
      utf16_lead_byte = null;

      // 5. If utf-16 lead surrogate is not null, let lead surrogate
      // be utf-16 lead surrogate, set utf-16 lead surrogate to null,
      // and then run these substeps:
      if (utf16_lead_surrogate !== null) {
        var lead_surrogate = utf16_lead_surrogate;
        utf16_lead_surrogate = null;

        // 1. If code unit is in the range U+DC00 to U+DFFF, return a
        // code point whose value is 0x10000 + ((lead surrogate −
        // 0xD800) << 10) + (code unit − 0xDC00).
        if (inRange(code_unit, 0xDC00, 0xDFFF)) {
          return 0x10000 + (lead_surrogate - 0xD800) * 0x400 +
              (code_unit - 0xDC00);
        }

        // 2. Prepend the sequence resulting of converting code unit
        // to bytes using utf-16be decoder flag to stream and return
        // error.
        stream.prepend(convertCodeUnitToBytes(code_unit, utf16_be));
        return decoderError(fatal);
      }

      // 6. If code unit is in the range U+D800 to U+DBFF, set utf-16
      // lead surrogate to code unit and return continue.
      if (inRange(code_unit, 0xD800, 0xDBFF)) {
        utf16_lead_surrogate = code_unit;
        return null;
      }

      // 7. If code unit is in the range U+DC00 to U+DFFF, return
      // error.
      if (inRange(code_unit, 0xDC00, 0xDFFF))
        return decoderError(fatal);

      // 8. Return code point code unit.
      return code_unit;
    };
  }

  // 15.2.2 shared utf-16 encoder
  /**
   * @constructor
   * @implements {Encoder}
   * @param {boolean} utf16_be True if big-endian, false if little-endian.
   * @param {{fatal: boolean}} options
   */
  function UTF16Encoder(utf16_be, options) {
    var fatal = options.fatal;
    /**
     * @param {Stream} stream Input stream.
     * @param {number} code_point Next code point read from the stream.
     * @return {(number|!Array.<number>)} Byte(s) to emit.
     */
    this.handler = function(stream, code_point) {
      // 1. If code point is end-of-stream, return finished.
      if (code_point === end_of_stream)
        return finished;

      // 2. If code point is in the range U+0000 to U+FFFF, return the
      // sequence resulting of converting code point to bytes using
      // utf-16be encoder flag.
      if (inRange(code_point, 0x0000, 0xFFFF))
        return convertCodeUnitToBytes(code_point, utf16_be);

      // 3. Let lead be ((code point − 0x10000) >> 10) + 0xD800,
      // converted to bytes using utf-16be encoder flag.
      var lead = convertCodeUnitToBytes(
        ((code_point - 0x10000) >> 10) + 0xD800, utf16_be);

      // 4. Let trail be ((code point − 0x10000) & 0x3FF) + 0xDC00,
      // converted to bytes using utf-16be encoder flag.
      var trail = convertCodeUnitToBytes(
        ((code_point - 0x10000) & 0x3FF) + 0xDC00, utf16_be);

      // 5. Return a byte sequence of lead followed by trail.
      return lead.concat(trail);
    };
  }

  // 15.3 utf-16be
  // 15.3.1 utf-16be decoder
  /** @param {{fatal: boolean}} options */
  encoders['UTF-16BE'] = function(options) {
    return new UTF16Encoder(true, options);
  };
  // 15.3.2 utf-16be encoder
  /** @param {{fatal: boolean}} options */
  decoders['UTF-16BE'] = function(options) {
    return new UTF16Decoder(true, options);
  };

  // 15.4 utf-16le
  // 15.4.1 utf-16le decoder
  /** @param {{fatal: boolean}} options */
  encoders['UTF-16LE'] = function(options) {
    return new UTF16Encoder(false, options);
  };
  // 15.4.2 utf-16le encoder
  /** @param {{fatal: boolean}} options */
  decoders['UTF-16LE'] = function(options) {
    return new UTF16Decoder(false, options);
  };

  // 15.5 x-user-defined

  // 15.5.1 x-user-defined decoder
  /**
   * @constructor
   * @implements {Decoder}
   * @param {{fatal: boolean}} options
   */
  function XUserDefinedDecoder(options) {
    var fatal = options.fatal;
    /**
     * @param {Stream} stream The stream of bytes being decoded.
     * @param {number} bite The next byte read from the stream.
     * @return {?(number|!Array.<number>)} The next code point(s)
     *     decoded, or null if not enough data exists in the input
     *     stream to decode a complete code point.
     */
    this.handler = function(stream, bite) {
      // 1. If byte is end-of-stream, return finished.
      if (bite === end_of_stream)
        return finished;

      // 2. If byte is an ASCII byte, return a code point whose value
      // is byte.
      if (isASCIIByte(bite))
        return bite;

      // 3. Return a code point whose value is 0xF780 + byte − 0x80.
      return 0xF780 + bite - 0x80;
    };
  }

  // 15.5.2 x-user-defined encoder
  /**
   * @constructor
   * @implements {Encoder}
   * @param {{fatal: boolean}} options
   */
  function XUserDefinedEncoder(options) {
    var fatal = options.fatal;
    /**
     * @param {Stream} stream Input stream.
     * @param {number} code_point Next code point read from the stream.
     * @return {(number|!Array.<number>)} Byte(s) to emit.
     */
    this.handler = function(stream, code_point) {
      // 1.If code point is end-of-stream, return finished.
      if (code_point === end_of_stream)
        return finished;

      // 2. If code point is an ASCII code point, return a byte whose
      // value is code point.
      if (isASCIICodePoint(code_point))
        return code_point;

      // 3. If code point is in the range U+F780 to U+F7FF, return a
      // byte whose value is code point − 0xF780 + 0x80.
      if (inRange(code_point, 0xF780, 0xF7FF))
        return code_point - 0xF780 + 0x80;

      // 4. Return error with code point.
      return encoderError(code_point);
    };
  }

  /** @param {{fatal: boolean}} options */
  encoders['x-user-defined'] = function(options) {
    return new XUserDefinedEncoder(options);
  };
  /** @param {{fatal: boolean}} options */
  decoders['x-user-defined'] = function(options) {
    return new XUserDefinedDecoder(options);
  };

  if (!global['TextEncoder'])
    global['TextEncoder'] = TextEncoder;
  if (!global['TextDecoder'])
    global['TextDecoder'] = TextDecoder;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      TextEncoder: global['TextEncoder'],
      TextDecoder: global['TextDecoder'],
      EncodingIndexes: global["encoding-indexes"]
    };
  }
}(this));

/*
    Copyright 2017 Rustici Software

    See the LICENSE.md, you may not use this file except in compliance with the License.

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/**
cmi5.js AU runtime library

@module Cmi5
*/
var Cmi5;

(function () {
    "use strict";
    var THIS_LIBRARY = {
            // set by the build step
            VERSION: "2.0.1",
            NAME: "cmi5.js",
            DESCRIPTION: "A JavaScript library implementing the cmi5 specification for AUs during runtime."
        },
        nativeRequest,
        xdrRequest,
        requestComplete,
        __delay,
        env = {},
        STATE_LMS_LAUNCHDATA = "LMS.LaunchData",
        LAUNCH_MODE_NORMAL = "Normal",
        AGENT_PROFILE_LEARNER_PREFS = "cmi5LearnerPreferences",
        CATEGORY_ACTIVITY_CMI5 = new TinCan.Activity(
            {
                id: "https://w3id.org/xapi/cmi5/context/categories/cmi5"
            }
        ),
        CATEGORY_ACTIVITY_MOVEON = new TinCan.Activity(
            {
                id: "https://w3id.org/xapi/cmi5/context/categories/moveon"
            }
        ),
        OTHER_ACTIVITY_CMI5JS = new TinCan.Activity(
            {
                id: "http://id.tincanapi.com/activity/software/" + THIS_LIBRARY.NAME + "/" + THIS_LIBRARY.VERSION,
                definition: {
                    name: {
                        und: THIS_LIBRARY.NAME + " (" + THIS_LIBRARY.VERSION + ")"
                    },
                    description: {
                        "en": THIS_LIBRARY.DESCRIPTION
                    },
                    type: "http://id.tincanapi.com/activitytype/source"
                }
            }
        ),
        EXTENSION_SESSION_ID = "https://w3id.org/xapi/cmi5/context/extensions/sessionid",
        EXTENSION_MASTERY_SCORE = "https://w3id.org/xapi/cmi5/context/extensions/masteryscore",
        VERB_INITIALIZED_ID = "http://adlnet.gov/expapi/verbs/initialized",
        VERB_TERMINATED_ID = "http://adlnet.gov/expapi/verbs/terminated",
        VERB_COMPLETED_ID = "http://adlnet.gov/expapi/verbs/completed",
        VERB_PASSED_ID = "http://adlnet.gov/expapi/verbs/passed",
        VERB_FAILED_ID = "http://adlnet.gov/expapi/verbs/failed",
        verbDisplay = {},
        launchParameters = [
            "endpoint",
            "fetch",
            "actor",
            "activityId",
            "registration"
        ],
        isInteger;

    // polyfill for Number.isInteger from MDN
    isInteger = function (value) {
        return typeof value === "number" && isFinite(value) && Math.floor(value) === value;
    };

    verbDisplay[VERB_INITIALIZED_ID] = {
        "en": "initialized"
    };
    verbDisplay[VERB_TERMINATED_ID] = {
        "en": "terminated"
    };

    //
    // Detect CORS and XDR support
    //
    env.hasCORS = false;
    env.useXDR = false;

    if (typeof XMLHttpRequest !== "undefined" && typeof (new XMLHttpRequest()).withCredentials !== "undefined") {
        env.hasCORS = true;
    }
    else if (typeof XDomainRequest !== "undefined") {
        env.hasCORS = true;
        env.useXDR = true;
    }

    /**
        Top level interface constructor.

        It is highly recommended to use asynchronous calls to methods supporting a callback.

        @class Cmi5
        @constructor
        @param {String} [launchString] AU Launch URL providing configuration options
        @throws {Error} Invalid launch string
    */
    Cmi5 = function (launchString) {
        this.log("constructor", launchString);
        var url,
            cfg,
            i;

        if (typeof launchString !== "undefined") {
            url = new URI(launchString);
            cfg = url.search(true);

            for (i = 0; i < launchParameters.length; i += 1) {
                if (typeof cfg[launchParameters[i]] === "undefined" || cfg[launchParameters[i]] === "") {
                    throw new Error("Invalid launch string missing or empty parameter: " + launchParameters[i]);
                }
            }

            this.setFetch(cfg.fetch);
            this.setLRS(cfg.endpoint);
            this.setActor(cfg.actor);
            this.setActivity(cfg.activityId);
            this.setRegistration(cfg.registration);
        }
    };

    /**
        Version of this library

        @property VERSION
        @static
        @type String
    */
    Cmi5.VERSION = THIS_LIBRARY.VERSION;

    /**
        Whether or not to enable debug logging

        @property DEBUG
        @static
        @type Boolean
        @default false
    */
    Cmi5.DEBUG = false;

    Cmi5.prototype = {
        _fetch: null,
        _endpoint: null,
        _actor: null,
        _registration: null,
        _activity: null,

        _lrs: null,
        _fetchRequest: null,
        _fetchContent: null,
        _lmsLaunchData: null,
        _contextTemplate: null,
        _learnerPrefs: null,
        _isActive: false,
        _initialized: null,
        _passed: null,
        _failed: null,
        _completed: null,
        _terminated: null,
        _durationStart: null,
        _progress: null,
        _includeSourceActivity: true,

        /**
            Method to call to start the AU runtime

            This is a simplified "boot" sequence for the AU that will call the individual parts of the start up sequence that would otherwise need to be called in order sequentially.

            @method start
            @param {Function} callback Function to call on error or success
            @param {Object} [events] Functions to run at specific execution points
                @param {Function} [events.postFetch] Function to run after retrieving fetchUrl result
                @param {Function} [events.launchData] Function to run after retrieving launch data
                @param {Function} [events.learnerPrefs] Function to run after retrieving learner preferences
                @param {Function} [events.initializeStatement] Function to run after saving initialization statement
        */
        start: function (callback, events) {
            this.log("start");
            var self = this;

            events = events || {};

            self.postFetch(
                function (err) {
                    var prefix = "Failed to start AU - ";

                    if (typeof events.postFetch !== "undefined") {
                        events.postFetch.apply(this, arguments);
                    }
                    if (err !== null) {
                        callback(new Error(prefix + " POST to fetch: " + err));
                        return;
                    }

                    self.loadLMSLaunchData(
                        function (err) {
                            if (typeof events.launchData !== "undefined") {
                                events.launchData.apply(this, arguments);
                            }
                            if (err !== null) {
                                callback(new Error(prefix + " load LMS LaunchData: " + err));
                                return;
                            }

                            self.loadLearnerPrefs(
                                function (err) {
                                    if (typeof events.learnerPrefs !== "undefined") {
                                        events.learnerPrefs.apply(this, arguments);
                                    }
                                    if (err !== null) {
                                        callback(new Error(prefix + " load learner preferences: " + err));
                                        return;
                                    }

                                    self.initialize(
                                        function (err) {
                                            if (typeof events.initializeStatement !== "undefined") {
                                                events.initializeStatement.apply(this, arguments);
                                            }
                                            if (err !== null) {
                                                callback(new Error(prefix + " send initialized statement: " + err));
                                                return;
                                            }

                                            callback(null);
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        },

        /**
            Method to POST to the fetchUrl to retrieve the LRS credentials

            `setFetch` has to be called first and is called by the constructor if the launch string was provided to it.

            @method postFetch
            @param {Function} [callback] Function to call on error or success
        */
        postFetch: function (callback) {
            this.log("postFetch");
            var self = this,
                cbWrapper;

            if (this._fetch === null) {
                callback(new Error("Can't POST to fetch URL without setFetch"));
                return;
            }

            if (callback) {
                cbWrapper = function (err, xhr) {
                    self.log("postFetch::cbWrapper");
                    self.log("postFetch::cbWrapper", err);
                    self.log("postFetch::cbWrapper", xhr);
                    var parsed,
                        responseContent = xhr.responseText,
                        responseContentType;

                    if (err !== null) {
                        if (err === 0) {
                            err = "Aborted, offline, or invalid CORS endpoint";
                        }
                        else if (/^\d+$/.test(err)) {
                            if (typeof xhr.getResponseHeader !== "undefined") {
                                responseContentType = xhr.getResponseHeader("Content-Type");
                            }
                            else if (typeof xhr.contentType !== "undefined") {
                                responseContentType = xhr.contentType;
                            }
                            if (TinCan.Utils.isApplicationJSON(responseContentType)) {
                                try {
                                    parsed = JSON.parse(responseContent);

                                    if (typeof parsed["error-text"] !== "undefined") {
                                        err = parsed["error-text"] + " (" + parsed["error-code"] + ")";
                                    }
                                    else {
                                        err = "Failed to detect 'error-text' property in JSON error response";
                                    }
                                }
                                catch (ex) {
                                    err = "Failed to parse JSON error response: " + ex;
                                }
                            }
                            else {
                                err = xhr.responseText;
                            }
                        }
                        else {
                            err = xhr.responseText;
                        }
                        callback(new Error(err), xhr, parsed);
                        return;
                    }

                    try {
                        parsed = JSON.parse(responseContent);
                    }
                    catch (ex) {
                        self.log("postFetch::cbWrapper - failed to parse JSON response: " + ex);
                        callback(new Error("Post fetch response malformed: failed to parse JSON response (" + ex + ")"), xhr);
                        return;
                    }

                    if (parsed === null || typeof parsed !== "object" || typeof parsed["auth-token"] === "undefined") {
                        self.log("postFetch::cbWrapper - failed to access 'auth-token' property");
                        callback(new Error("Post fetch response malformed: failed to access 'auth-token' in (" + responseContent + ")"), xhr, parsed);
                        return;
                    }

                    self._fetchContent = parsed;
                    self._lrs.auth = "Basic " + parsed["auth-token"];

                    callback(err, xhr, parsed);
                };
            }

            return this._fetchRequest(
                this._fetch,
                {
                    method: "POST"
                },
                cbWrapper
            );
        },

        /**
            Method to load the LMS.LaunchData state document populated by the LMS

            Fetch data has to have already been loaded, in order to have LRS credential.

            @method loadLMSLaunchData
            @param {Function} callback Function to call on error or success
        */
        loadLMSLaunchData: function (callback) {
            this.log("loadLMSLaunchData");

            var self = this;

            if (this._fetchContent === null) {
                callback(new Error("Can't retrieve LMS Launch Data without successful postFetch"));
                return;
            }

            this._lrs.retrieveState(
                STATE_LMS_LAUNCHDATA,
                {
                    activity: this._activity,
                    agent: this._actor,
                    registration: this._registration,
                    callback: function (err, result) {
                        if (err !== null) {
                            callback(new Error("Failed to retrieve " + STATE_LMS_LAUNCHDATA + " State: " + err), result);
                            return;
                        }

                        //
                        // a missing state isn't an error as far as TinCanJS is concerned, but
                        // getting a 404 on the LMS LaunchData is a problem in cmi5 so fail here
                        // in that case (which is when result is null)
                        //
                        if (result === null) {
                            callback(new Error(STATE_LMS_LAUNCHDATA + " State not found"), result);
                            return;
                        }

                        self._lmsLaunchData = result.contents;

                        //
                        // store a stringified version of the context template for cheap
                        // cloning when we go to prepare it later for use in statements
                        //
                        self._contextTemplate = JSON.stringify(self._lmsLaunchData.contextTemplate);

                        callback(null, result);
                    }
                }
            );
        },

        /**
            Method to load learner prefs agent profile document possibly populated by the LMS

            @method loadLearnerPrefs
            @param {Function} callback Function to call on error or success
        */
        loadLearnerPrefs: function (callback) {
            this.log("loadLearnerPrefs");
            var self = this;

            if (this._lmsLaunchData === null) {
                callback(new Error("Can't retrieve Learner Preferences without successful loadLMSLaunchData"));
                return;
            }

            this._lrs.retrieveAgentProfile(
                AGENT_PROFILE_LEARNER_PREFS,
                {
                    agent: this._actor,
                    callback: function (err, result) {
                        if (err !== null) {
                            callback(new Error("Failed to retrieve " + AGENT_PROFILE_LEARNER_PREFS + " Agent Profile" + err), result);
                            return;
                        }

                        //
                        // result is null when the profile 404s which is not an error,
                        // just means it hasn't been set to anything
                        //
                        if (result !== null) {
                            self._learnerPrefs = result;
                        }
                        else {
                            //
                            // store an empty object locally to be able to distinguish a non-set
                            // preference document vs a non-fetched preference document
                            //
                            self._learnerPrefs = new TinCan.AgentProfile(
                                {
                                    id: AGENT_PROFILE_LEARNER_PREFS,
                                    contentType: "application/json",
                                    contents: {}
                                }
                            );
                        }

                        callback(null, result);
                    }
                }
            );
        },

        /**
            Method to save learner prefs to agent profile document in LRS

            @method saveLearnerPrefs
            @param {Function} [callback] Function to call on error or success
        */
        saveLearnerPrefs: function (callback) {
            this.log("saveLearnerPrefs");
            var self = this,
                result,
                cbWrapper;

            if (this._learnerPrefs === null) {
                result = new Error("Can't save Learner Preferences without first loading them");
                if (callback) {
                    callback(result);
                    return;
                }
                return result;
            }

            if (callback) {
                cbWrapper = function (err, result) {
                    self.log("saveLearnerPrefs - saveAgentProfile callback", err, result);
                    if (err !== null) {
                        callback(new Error("Failed to save " + AGENT_PROFILE_LEARNER_PREFS + " Agent Profile: " + err), result);
                        return;
                    }

                    self._learnerPrefs.etag = TinCan.Utils.getSHA1String(
                        (typeof self._learnerPrefs.contents === "object" && TinCan.Utils.isApplicationJSON(self._learnerPrefs.contentType))
                            ? JSON.stringify(self._learnerPrefs.contents)
                            : self._learnerPrefs.contents
                    );

                    callback(null, result);
                };
            }

            result = this._lrs.saveAgentProfile(
                AGENT_PROFILE_LEARNER_PREFS,
                this._learnerPrefs.contents,
                {
                    agent: this._actor,
                    lastSHA1: this._learnerPrefs.etag,
                    contentType: this._learnerPrefs.contentType,
                    callback: cbWrapper
                }
            );
            if (cbWrapper) {
                return;
            }

            if (result.err !== null) {
                return new Error("Failed to save " + AGENT_PROFILE_LEARNER_PREFS + " Agent Profile: " + result.err);
            }

            self._learnerPrefs.etag = TinCan.Utils.getSHA1String(
                (typeof self._learnerPrefs.contents === "object" && TinCan.Utils.isApplicationJSON(self._learnerPrefs.contentType))
                    ? JSON.stringify(self._learnerPrefs.contents)
                    : self._learnerPrefs.contents
            );

            return;
        },

        /**
            Finalize initialization process by sending initialized statement, starting duration tracker, and marking AU active

            @method initialize
            @param {Function} [callback] Function to call on error or success
            @throws {Error} <ul><li>Learner prefs not loaded</li><li>AU already initialized</li></ul>
        */
        initialize: function (callback) {
            this.log("initialize");
            var st,
                err,
                callbackWrapper,
                result;

            if (this._learnerPrefs === null) {
                err = new Error("Can't send initialized statement without successful loadLearnerPrefs");
                if (callback) {
                    callback(err);
                    return;
                }

                throw err;
            }

            if (this._initialized) {
                this.log("initialize - already initialized");

                err = new Error("AU already initialized");
                if (callback) {
                    callback(err);
                    return;
                }

                throw err;
            }

            st = this.initializedStatement();

            if (callback) {
                callbackWrapper = function (err) {
                    this.log("initialize - callbackWrapper: " + err);
                    if (err === null) {
                        this._initialized = true;
                        this._isActive = true;
                        this._durationStart = new Date().getTime();
                    }

                    callback.apply(this, arguments);
                }.bind(this);
            }

            result = this.sendStatement(st, callbackWrapper);
            this.log("initialize - result: ", result);

            if (! callback && result.response.err === null) {
                this._initialized = true;
                this._isActive = true;
                this._durationStart = new Date().getTime();
            }

            return result;
        },

        /**
            Method to indicate session termination should occur, sends terminated statement, marks AU inactive

            @method terminate
            @param {Function} [callback] Function to call on error or success
            @throws {Error} <ul><li>AU not initialized</li><li>AU already terminated</li></ul>
        */
        terminate: function (callback) {
            this.log("terminate");
            var st,
                err,
                callbackWrapper,
                result;

            if (! this._initialized) {
                this.log("terminate - not initialized");

                err = new Error("AU not initialized");
                if (callback) {
                    callback(err);
                    return;
                }

                throw err;
            }

            if (this._terminated) {
                this.log("terminate - already terminated");

                err = new Error("AU already terminated");
                if (callback) {
                    callback(err);
                    return;
                }

                throw err;
            }

            st = this.terminatedStatement();

            if (callback) {
                callbackWrapper = function (err) {
                    this.log("terminate - callbackWrapper: " + err);
                    if (err === null) {
                        this._terminated = true;
                        this._isActive = false;
                    }

                    callback.apply(this, arguments);
                }.bind(this);
            }

            result = this.sendStatement(st, callbackWrapper);
            this.log("terminate - result: ", result);

            if (! callback && result.response.err === null) {
                this._terminated = true;
                this._isActive = false;
            }

            return result;
        },

        /**
            Method to indicate learner has completed the AU, sends completed statement

            @method completed
            @param {Object} [extensions] [optional] Extensions object to be included in statement result (see `passedStatement`)
            @param {Function} [callback] Function to call on error or success
            @throws {Error} <ul><li>AU not active</li><li>AU not in normal launch mode</li><li>AU already completed</li></ul>
        */
        completed: function (extensions, callback) {
            this.log("completed");
            if(typeof(extensions) === 'function') {
                callback = extensions
                extensions = undefined
            }
            var st,
                err,
                callbackWrapper,
                result;

            if (! this.isActive()) {
                this.log("completed - not active");
                err = new Error("AU not active");

                if (callback) {
                    callback(err);
                    return;
                }

                throw err;
            }

            if (this.getLaunchMode() !== LAUNCH_MODE_NORMAL) {
                this.log("completed - non-Normal launch mode: ", this.getLaunchMode());
                err = new Error("AU not in Normal launch mode");

                if (callback) {
                    callback(err);
                    return;
                }

                throw err;
            }

            if (this._completed) {
                this.log("completed - already completed");
                err = new Error("AU already completed");

                if (callback) {
                    callback(err);
                    return;
                }

                throw err;
            }

            st = this.completedStatement(extensions);

            if (callback) {
                callbackWrapper = function (err) {
                    this.log("completed - callbackWrapper: " + err);
                    if (err === null) {
                        this.setProgress(null);
                        this._completed = true;
                    }

                    callback.apply(this, arguments);
                }.bind(this);
            }

            result = this.sendStatement(st, callbackWrapper);
            this.log("completed - result: ", result);

            if (! callback && result.response.err === null) {
                this.setProgress(null);
                this._completed = true;
            }

            return result;
        },

        /**
            Method to indicate learner has passed the AU, sends passed statement with optional score

            @method passed
            @param {Object} [score] Score to be included in statement (see `passedStatement`)
            @param {Object} [extenstions] [optional] Extensions object to be included in statement result (see `passedStatement`)
            @param {Function} [callback] Function to call on error or success
            @throws {Error} <ul><li>AU not active,</li><li>AU not in normal launch mode,</li><li>AU already passed,</li><li>Failed to create passed statement (usually because of malformed score)</li></ul>
        */
        passed: function (score, extensions, callback) {
            this.log("passed");
            if(typeof(extensions) === 'function') {
                callback = extensions
                extensions = undefined
            }

            var st,
                err,
                callbackWrapper,
                result;

            if (! this.isActive()) {
                this.log("passed - not active");
                err = new Error("AU not active");

                if (callback) {
                    callback(err);
                    return;
                }

                throw err;
            }

            if (this.getLaunchMode() !== LAUNCH_MODE_NORMAL) {
                this.log("passed - non-Normal launch mode: ", this.getLaunchMode());
                err = new Error("AU not in Normal launch mode");

                if (callback) {
                    callback(err);
                    return;
                }

                throw err;
            }

            if (this._passed !== null) {
                this.log("passed - already passed");
                err = new Error("AU already passed");

                if (callback) {
                    callback(err);
                    return;
                }

                throw err;
            }

            try {
                st = this.passedStatement(score, extensions);
            }
            catch (ex) {
                this.log("passed - failed to create passed statement: " + ex);
                if (callback) {
                    callback("Failed to create passed statement - " + ex);
                    return;
                }

                throw ex;
            }

            if (callback) {
                callbackWrapper = function (err) {
                    this.log("passed - callbackWrapper: " + err);
                    if (err === null) {
                        this._passed = true;
                    }

                    callback.apply(this, arguments);
                }.bind(this);
            }

            result = this.sendStatement(st, callbackWrapper);
            this.log("passed - result: ", result);

            if (! callback && result.response.err === null) {
                this._passed = true;
            }

            return result;
        },

        /**
            Method to indicate learner has failed the AU, sends failed statement with optional score

            @method failed
            @param {Object} [score] Score to be included in statement (see `failedStatement`)
            @param {Function} [callback] Function to call on error or success
            @throws {Error} <ul><li>AU not active</li><li>AU not in normal launch mode</li><li>AU already passed/failed</li><li>Failed to create failed statement (usually because of malformed score)</li></ul>
        */
        failed: function (score, extensions, callback) {
            this.log(`failed score=${score}: ${JSON.stringify(extensions)}`);
            if(typeof(extensions) === 'function') {
                callback = extensions
                extensions = undefined
            }
            var st,
                err,
                callbackWrapper,
                result;

            if (! this.isActive()) {
                this.log("failed - not active");
                err = new Error("AU not active");

                if (callback) {
                    callback(err);
                    return;
                }

                throw err;
            }

            if (this.getLaunchMode() !== LAUNCH_MODE_NORMAL) {
                this.log("failed - non-Normal launch mode: ", this.getLaunchMode());
                err = new Error("AU not in Normal launch mode");

                if (callback) {
                    callback(err);
                    return;
                }

                throw err;
            }

            if (this._failed !== null || this._passed !== null) {
                this.log("failed - already passed/failed");
                err = new Error("AU already passed/failed");

                if (callback) {
                    callback(err);
                    return;
                }

                throw err;
            }

            try {
                st = this.failedStatement(score, extensions);
                this.log(`failed statment=${JSON.stringify(st)}`)
            }
            catch (ex) {
                this.log("failed - failed to create failed statement: " + ex);
                if (callback) {
                    callback("Failed to create failed statement - " + ex);
                    return;
                }

                throw ex;
            }

            if (callback) {
                callbackWrapper = function (err) {
                    this.log("failed - callbackWrapper: " + err);
                    if (err === null) {
                        this._failed = true;
                    }

                    callback.apply(this, arguments);
                }.bind(this);
            }

            result = this.sendStatement(st, callbackWrapper);
            this.log("failed - result: ", result);

            if (! callback && result.response.err === null) {
                this._failed = true;
            }

            return result;
        },

        /**
            Method indicating whether the AU is currently active, has been initialized and not terminated

            @method isActive
            @return {Boolean} Active flag
        */
        isActive: function () {
            this.log("isActive");
            return this._isActive;
        },

        /**
            Safe version of logging, only displays when .DEBUG is true, and console.log
            is available

            See `console.log` for parameters.

            @method log
        */
        log: function () {
            /* eslint-disable no-console */
            if (Cmi5.DEBUG && typeof console !== "undefined" && console.log) {
                arguments[0] = "cmi5.js:" + arguments[0];
                console.log.apply(console, arguments);
            }
            /* eslint-enable no-console */
        },

        /**
            Switch on/off whether a source activity is included in statements by default

            Default: on

            @method includeSourceActivity
            @param {Boolean} val true is include, false is exclude
        */
        includeSourceActivity: function (val) {
            this._includeSourceActivity = val ? true : false;
        },

        /**
            Retrieve the launch method as provided in the LMS launch data

            @method getLaunchMethod
            @throws {Error} LMS launch data has not been loaded
            @return {String} launch method
        */
        getLaunchMethod: function () {
            this.log("getLaunchMethod");
            if (this._lmsLaunchData === null) {
                throw new Error("Can't determine launchMethod until LMS LaunchData has been loaded");
            }

            return this._lmsLaunchData.launchMethod;
        },

        /**
            Retrieve the launch mode as provided in the LMS launch data

            @method getLaunchMode
            @throws {Error} LMS launch data has not been loaded
            @return {String} launch mode
        */
        getLaunchMode: function () {
            this.log("getLaunchMode");
            if (this._lmsLaunchData === null) {
                throw new Error("Can't determine launchMode until LMS LaunchData has been loaded");
            }

            return this._lmsLaunchData.launchMode;
        },

        /**
            Retrieve the launch parameters when provided by the AU and in the launch data

            @method getLaunchParameters
            @throws {Error} LMS launch data has not been loaded
            @return {String|null} launch parameters when exist or null
        */
        getLaunchParameters: function () {
            this.log("getLaunchParameters");
            var result = null;

            if (this._lmsLaunchData === null) {
                throw new Error("Can't determine LaunchParameters until LMS LaunchData has been loaded");
            }

            if (typeof this._lmsLaunchData.launchParameters !== "undefined") {
                result = this._lmsLaunchData.launchParameters;
            }

            return result;
        },

        /**
            Retrieve the session id

            @method getSessionId
            @throws {Error} LMS launch data has not been loaded
            @return {String} session id
        */
        getSessionId: function () {
            this.log("getSessionId");
            if (this._lmsLaunchData === null) {
                throw new Error("Can't determine session id until LMS LaunchData has been loaded");
            }

            return this._lmsLaunchData.contextTemplate.extensions[EXTENSION_SESSION_ID];
        },

        /**
            Retrieve the moveOn value

            @method getMoveOn
            @throws {Error} LMS launch data has not been loaded
            @return {String} moveOn value
        */
        getMoveOn: function () {
            this.log("getMoveOn");
            if (this._lmsLaunchData === null) {
                throw new Error("Can't determine moveOn until LMS LaunchData has been loaded");
            }

            return this._lmsLaunchData.moveOn;
        },

        /**
            Retrieve the mastery score as provided in LMS launch data

            @method getMasteryScore
            @throws {Error} LMS launch data has not been loaded
            @return {String|null} mastery score or null
        */
        getMasteryScore: function () {
            this.log("getMasteryScore");
            var result = null;

            if (this._lmsLaunchData === null) {
                throw new Error("Can't determine masteryScore until LMS LaunchData has been loaded");
            }

            if (typeof this._lmsLaunchData.masteryScore !== "undefined") {
                result = this._lmsLaunchData.masteryScore;
            }

            return result;
        },

        /**
            Retrieve the return URL as provided in LMS launch data

            @method getReturnURL
            @throws {Error} LMS launch data has not been loaded
            @return {String|null} mastery score or null
        */
        getReturnURL: function () {
            this.log("getReturnURL");
            var result = null;

            if (this._lmsLaunchData === null) {
                throw new Error("Can't determine returnURL until LMS LaunchData has been loaded");
            }

            if (typeof this._lmsLaunchData.returnURL !== "undefined") {
                result = this._lmsLaunchData.returnURL;
            }

            return result;
        },

        /**
            Retrieve the entitlement key as provided in LMS launch data

            @method getEntitlementKey
            @throws {Error} LMS launch data has not been loaded
            @return {String|null} entitlement key
        */
        getEntitlementKey: function () {
            this.log("getEntitlementKey");
            var result = null;

            if (this._lmsLaunchData === null) {
                throw new Error("Can't determine entitlementKey until LMS LaunchData has been loaded");
            }

            if (typeof this._lmsLaunchData.entitlementKey !== "undefined") {
                if (typeof this._lmsLaunchData.entitlementKey.alternate !== "undefined") {
                    result = this._lmsLaunchData.entitlementKey.alternate;
                }
                else if (typeof this._lmsLaunchData.entitlementKey.courseStructure !== "undefined") {
                    result = this._lmsLaunchData.entitlementKey.courseStructure;
                }
            }

            return result;
        },

        /**
            Retrieve the language preference as provided in learner preferences

            @method getLanguagePreference
            @throws {Error} Learner preference data has not been loaded
            @return {String|null} language preference
        */
        getLanguagePreference: function () {
            this.log("getLanguagePreference");
            var result = null;

            if (this._learnerPrefs === null) {
                throw new Error("Can't determine language preference until learner preferences have been loaded");
            }

            if (typeof this._learnerPrefs.contents.languagePreference !== "undefined") {
                result = this._learnerPrefs.contents.languagePreference;
            }

            return result;
        },

        /**
            Locally set the learner's language preference

            @method setLanguagePreference
            @param {String} pref language preference code (use `""` to unset)
            @throws {Error} Learner preference data has not been loaded
        */
        setLanguagePreference: function (pref) {
            this.log("setLanguagePreference");

            if (this._learnerPrefs === null) {
                throw new Error("Can't set language preference until learner preferences have been loaded");
            }

            if (pref === "") {
                pref = null;
            }

            this._learnerPrefs.contents.languagePreference = pref;

            return;
        },

        /**
            Retrieve the audio preference as provided in learner preferences

            @method getAudioPreference
            @throws {Error} Learner preference data has not been loaded
            @return {String|null} audio preference
        */
        getAudioPreference: function () {
            this.log("getAudioPreference");
            var result = null;

            if (this._learnerPrefs === null) {
                throw new Error("Can't determine audio preference until learner preferences have been loaded");
            }

            if (typeof this._learnerPrefs.contents.audioPreference !== "undefined") {
                result = this._learnerPrefs.contents.audioPreference;
            }

            return result;
        },

        /**
            Locally set the learner's audio preference

            @method setAudioPreference
            @param {String} pref "on", "off", or `null`
            @throws {Error} Learner preference data has not been loaded
        */
        setAudioPreference: function (pref) {
            this.log("setAudioPreference");

            if (this._learnerPrefs === null) {
                throw new Error("Can't set audio preference until learner preferences have been loaded");
            }

            if (pref !== "on" && pref !== "off" && pref !== null) {
                throw new Error("Unrecognized value for audio preference: " + pref);
            }

            this._learnerPrefs.contents.audioPreference = pref;

            return;
        },

        /**
            Get the duration of this session so far

            @method getDuration
            @return {Number} Number of milliseconds
        */
        getDuration: function () {
            this.log("getDuration");

            return (new Date().getTime() - this._durationStart);
        },

        /**
            Locally set the progress towards completion

            @method setProgress
            @param {Integer} progress progress as a percentage between 0 and 100
            @throws {Error} <ul><li>Not an integer</li><li>Less than zero or greater than 100</li></ul>
        */
        setProgress: function (progress) {
            this.log("setProgress: ", progress);

            if (progress !== null) {
                if (! isInteger(progress)) {
                    throw new Error("Invalid progress measure (not an integer): " + progress);
                }
                if (progress < 0 || progress > 100) {
                    throw new Error("Invalid progress measure must be greater than or equal to 0 and less than or equal to 100: " + progress);
                }
            }
            this._progress = progress;
        },

        /**
            Get progress

            @method getProgress
            @return {Integer|null} Integer value of locally set progress measure or null when not set
        */
        getProgress: function () {
            this.log("getProgress");
            return this._progress;
        },

        /**
            Set the fetch URL, called by the `Cmi5` constructor when provided a launch URL

            @method setFetch
            @param {String} fetchURL fetchURL as provided by the LMS in the launch string
        */
        setFetch: function (fetchURL) {
            this.log("setFetch: ", fetchURL);
            var urlParts,
                schemeMatches,
                locationPort,
                isXD;

            this._fetch = fetchURL;

            //
            // default to native request mode
            //
            this._fetchRequest = nativeRequest;

            // TODO: swap this for uri.js

            urlParts = fetchURL.toLowerCase().match(/([A-Za-z]+:)\/\/([^:\/]+):?(\d+)?(\/.*)?$/);
            if (urlParts === null) {
                throw new Error("URL invalid: failed to divide URL parts");
            }

            //
            // determine whether this is a cross domain request,
            // whether our browser has CORS support at all, and then
            // if it does then if we are in IE with XDR only check that
            // the schemes match to see if we should be able to talk to
            // the other side
            //
            locationPort = location.port;
            schemeMatches = location.protocol.toLowerCase() === urlParts[1];

            //
            // normalize the location.port cause it appears to be "" when 80/443
            // but our endpoint may have provided it
            //
            if (locationPort === "") {
                locationPort = (location.protocol.toLowerCase() === "http:" ? "80" : (location.protocol.toLowerCase() === "https:" ? "443" : ""));
            }

            isXD = (

                // is same scheme?
                ! schemeMatches

                // is same host?
                || location.hostname.toLowerCase() !== urlParts[2]

                // is same port?
                || locationPort !== (
                    (urlParts[3] !== null && typeof urlParts[3] !== "undefined" && urlParts[3] !== "")
                        ? urlParts[3]
                        : (urlParts[1] === "http:" ? "80" : (urlParts[1] === "https:" ? "443" : "")
                    )
                )
            );
            if (isXD) {
                if (env.hasCORS) {
                    if (env.useXDR && schemeMatches) {
                        this._fetchRequest = xdrRequest;
                    }
                    else if (env.useXDR && ! schemeMatches) {
                        this.log("[error] URL invalid: cross domain request for differing scheme in IE with XDR");
                        throw new Error("URL invalid: cross domain request for differing scheme in IE with XDR");
                    }
                }
                else {
                    this.log("[error] URL invalid: cross domain requests not supported in this browser");
                    throw new Error("URL invalid: cross domain requests not supported in this browser");
                }
            }
        },

        /**
            Retrieve the fetch URL

            @method getFetch
            @return {String} the previous set fetch URL
        */
        getFetch: function () {
            return this._fetch;
        },

        /**
            Initialize the LRS to a `TinCan.LRS` object or update the existing object which will be used for all xAPI communications

            Called by the `Cmi5` constructor when provided a launch URL.

            @method setLRS
            @param {String} endpoint LRS location
            @param {String} auth Authentication token value
        */
        setLRS: function (endpoint, auth) {
            this.log("setLRS: ", endpoint, auth);
            if (this._lrs !== null) {
                if ((typeof auth === "undefined" && endpoint === null) || endpoint !== null) {
                    this._endpoint = this._lrs.endpoint = endpoint;
                }
                if (typeof auth !== "undefined" && auth !== null) {
                    this._lrs.auth = auth;
                }
            }
            else {
                this._lrs = new TinCan.LRS(
                    {
                        endpoint: endpoint,
                        auth: auth,
                        allowFail: false
                    }
                );
            }
        },

        /**
            Retrieve the `TinCan.LRS` object

            @method getLRS
            @return {TinCan.LRS} LRS object
        */
        getLRS: function () {
            return this._lrs;
        },

        /**
            Initialize the actor using a `TinCan.Agent` that will represent the learner

            Called by the `Cmi5` constructor when provided a launch URL.

            @method setActor
            @param {String|TinCan.Agent} agent Pre-constructed Agent or string of JSON used to construct Agent
            @throws {Error} <ul><li>Invalid actor, missing account IFI</li><li>Invalid account IFI</li></ul>
        */
        setActor: function (agent) {
            if (! (agent instanceof TinCan.Agent)) {
                agent = TinCan.Agent.fromJSON(agent);
            }

						if(agent.openid !== null) {
							this._actor = agent;
							return;
						}

            //
            // don't generally want to do too much validation as the LMS
            // should be giving us valid information, *but* in this case
            // users need to be able to count on the type of object being
            // returned
            //
            if ((agent.account === null) || (! (agent.account instanceof TinCan.AgentAccount))) {
                throw new Error("Invalid actor: missing or invalid account");
            }
            else if (agent.account.name === null) {
                throw new Error("Invalid actor: name is null");
            }
            else if (agent.account.name === "") {
                throw new Error("Invalid actor: name is empty");
            }
            else if (agent.account.homePage === null) {
                throw new Error("Invalid actor: homePage is null");
            }
            else if (agent.account.homePage === "") {
                throw new Error("Invalid actor: homePage is empty");
            }

            this._actor = agent;
        },

        /**
            Retrieve the `TinCan.Agent` object representing the learner

            @method getActor
            @return {TinCan.Agent} Learner's Agent
        */
        getActor: function () {
            return this._actor;
        },

        /**
            Initialize the root object representing the AU

            Called by the `Cmi5` constructor when provided a launch URL.

            @method setActivity
            @param {String|TinCan.Activity} activity Pre-constructed Activity or string id used to construct Activity
            @throws {Error} <ul><li>Invalid activity, null id</li><li>Invalid activity, empty string id</li></ul>
        */
        setActivity: function (activity) {
            if (! (activity instanceof TinCan.Activity)) {
                activity = new TinCan.Activity(
                    {
                        id: activity
                    }
                );
            }

            if (activity.id === null) {
                throw new Error("Invalid activity: id is null");
            }
            else if (activity.id === "") {
                throw new Error("Invalid activity: id is empty");
            }

            this._activity = activity;
        },

        /**
            Retrieve the `TinCan.Activity` that is the root object representing the AU

            @method getActivity
            @return {TinCan.Activity} Root Activity
        */
        getActivity: function () {
            return this._activity;
        },

        /**
            Set the registration value

            Called by the `Cmi5` constructor when provided a launch URL.

            @method setRegistration
            @param {String} registration UUID representing the registration
            @throws {Error} <ul><li>Invalid registration, null</li><li>Invalid registration, empty string</li></ul>
        */
        setRegistration: function (registration) {
            if (registration === null) {
                throw new Error("Invalid registration: null");
            }
            else if (registration === "") {
                throw new Error("Invalid registration: empty");
            }

            this._registration = registration;
        },

        /**
            Retrieve the registration associated with the session

            @method getRegistration
            @return {String} Registration
        */
        getRegistration: function () {
            return this._registration;
        },

        /**
            Validate a Score object's properties

            @method validateScore
            @param {TinCan.Score|Object} score Score object to validate
            @throws {Error} <ul><li>Null or missing score argument</li><li>Non-integer min or max value (when provided)</li><li>Non-number, negative, or greater than 1 scaled value (when provided)</li><li>Non-integer, missing or invalid min/max, raw value (when provided)</li></ul>
            @return {Boolean} true for passing, otherwise exception is thrown
        */
        validateScore: function (score) {
            if(!isNaN(Number(score)) && score >= 0 && score <= 1.0) {
                return { scaled: score }
            }
            if (typeof score === "undefined" || score === null) {
                throw new Error("cannot validate score (score not provided): " + score);
            }

            if (typeof score.min !== "undefined") {
                if (! isInteger(score.min)) {
                    throw new Error("score.min is not an integer");
                }
            }
            if (typeof score.max !== "undefined") {
                if (! isInteger(score.max)) {
                    throw new Error("score.max is not an integer");
                }
            }

            if (typeof score.scaled !== "undefined") {
                if (! /^(\-|\+)?[01]+(\.[0-9]+)?$/.test(score.scaled)) {
                    throw new Error("scaled score not a recognized number: " + score.scaled);
                }

                if (score.scaled < 0) {
                    throw new Error("scaled score must be greater than or equal to 0");
                }
                if (score.scaled > 1) {
                    throw new Error("scaled score must be less than or equal to 1");
                }
            }

            if (typeof score.raw !== "undefined") {
                if (! isInteger(score.raw)) {
                    throw new Error("score.raw is not an integer");
                }
                if (typeof score.min === "undefined") {
                    throw new Error("minimum score must be provided when including a raw score");
                }
                if (typeof score.max === "undefined") {
                    throw new Error("maximum score must be provided when including a raw score");
                }
                if (score.raw < score.min) {
                    throw new Error("raw score must be greater than or equal to minimum score");
                }
                if (score.raw > score.max) {
                    throw new Error("raw score must be less than or equal to maximum score");
                }
            }

            return score;
        },

        /**
            Prepare a cmi5 "allowed" statement including the actor, verb, object, and context

            Used to construct a cmi5 "allowed" statement with all relevant information that can then be optionally added to prior to sending.

            @method prepareStatement
            @param {String} verbId Verb identifier combined with other cmi5 pre-determined information (must be IRI)
            @return {TinCan.Statement} Statement
        */
        prepareStatement: function (verbId) {
            //
            // the specification allows for statements that are 'cmi5 allowed'
            // as oppposed to 'cmi5 defined' to be sent by the AU, so give the
            // AU the ability to get a prepared statement with a populated context
            // based on the template but without the category having been added
            //
            var stCfg = {
                    actor: this._actor,
                    verb: {
                        id: verbId
                    },
                    target: this._activity,
                    context: this._prepareContext()
                },
                progress = this.getProgress();

            if (typeof verbDisplay[verbId] !== "undefined") {
                stCfg.verb.display = verbDisplay[verbId];
            }

            if (verbId !== VERB_COMPLETED_ID && progress !== null) {
                stCfg.result = {
                    extensions: {
                        "https://w3id.org/xapi/cmi5/result/extensions/progress": progress
                    }
                };
            }

            return new TinCan.Statement(stCfg);
        },

        /**
            Store provided statement in the configured LRS

            @method sendStatement
            @param {TinCan.Statement} st Statement to be stored
            @param {Function} [callback] Function to run on success/failure of statement save
        */
        sendStatement: function (st, callback) {
            var cbWrapper,
                result;

            if (callback) {
                cbWrapper = function (err, result) {
                    if (err !== null) {
                        callback(new Error(err), result);
                        return;
                    }

                    callback(err, result, st);
                };
            }

            result = this._lrs.saveStatement(
                st,
                {
                    callback: cbWrapper
                }
            );
            if (! callback) {
                return {
                    response: result,
                    statement: st
                };
            }
        },

        /*
         * The ...Statement methods are provided for users that want to implement
         * a queueing like mechansim or something similar where they are expected
         * to abide by the AU restrictions on what statements can be sent, etc. on
         * their own.
         *
         * (Such as in SCORM Driver which was the impetus for adding them.)
        */

        /**
            Advanced Usage: retrieve prepared "initialized" statement

            Statement methods are provided for users that want to implement
            a queueing like mechansim or something similar where they are expected
            to abide by the AU restrictions on what statements can be sent, etc. on
            their own.

            @method initializedStatement
            @return {TinCan.Statement} Initialized statement
        */
        initializedStatement: function () {
            this.log("initializedStatement");
            return this._prepareStatement(VERB_INITIALIZED_ID);
        },

        /**
            Advanced Usage: retrieve prepared "terminated" statement

            Statement methods are provided for users that want to implement
            a queueing like mechansim or something similar where they are expected
            to abide by the AU restrictions on what statements can be sent, etc. on
            their own.

            @method terminatedStatement
            @return {TinCan.Statement} Terminated statement
        */
        terminatedStatement: function () {
            this.log("terminatedStatement");
            var st = this._prepareStatement(VERB_TERMINATED_ID);

            st.result = st.result || new TinCan.Result();
            st.result.duration = TinCan.Utils.convertMillisecondsToISO8601Duration(this.getDuration());

            return st;
        },

        /**
            Advanced Usage: retrieve prepared "passed" statement

            Statement methods are provided for users that want to implement
            a queueing like mechansim or something similar where they are expected
            to abide by the AU restrictions on what statements can be sent, etc. on
            their own.

            @method passedStatement
            @param {Object} [score] Object to be used as the score, must meet masteryScore requirements, etc.
            @param {Object} [extensions] [optional] Object to added to result.extensions
            @return {TinCan.Statement} Passed statement
        */
        passedStatement: function (score, extensions) {
            this.log("passedStatement");
            var st = this._prepareStatement(VERB_PASSED_ID),
                masteryScore;

            st.result = st.result || new TinCan.Result();
            st.result.success = true;
            st.result.duration = TinCan.Utils.convertMillisecondsToISO8601Duration(this.getDuration());
            st.result.extensions = extensions;

            if (score) {
                try {
                    score = this.validateScore(score);
                }
                catch (ex) {
                    throw new Error("Invalid score - " + ex);
                }

                masteryScore = this.getMasteryScore();
                if (masteryScore !== null && typeof score.scaled !== "undefined") {
                    if (score.scaled < masteryScore) {
                        throw new Error("Invalid score - scaled score does not meet or exceed mastery score (" + score.scaled + " < " + masteryScore + ")");
                    }

                    st.context.extensions = st.context.extensions || {};
                    st.context.extensions[EXTENSION_MASTERY_SCORE] = masteryScore;
                }

                st.result.score = new TinCan.Score(score);
            }

            st.context.contextActivities.category.push(CATEGORY_ACTIVITY_MOVEON);

            return st;
        },

        /**
            Advanced Usage: retrieve prepared "failed" statement

            Statement methods are provided for users that want to implement
            a queueing like mechansim or something similar where they are expected
            to abide by the AU restrictions on what statements can be sent, etc. on
            their own.

            @method failedStatement
            @param {Object} [score] Object to be used as the score, must meet masteryScore requirements, etc.
            @param {Object} [extensions] [optional] Object to added to result.extensions
            @return {TinCan.Statement} Failed statement
        */
        failedStatement: function (score, extensions) {
            this.log("failedStatement");
            var st = this._prepareStatement(VERB_FAILED_ID),
                masteryScore;

            st.result = st.result || new TinCan.Result();
            st.result.success = false;
            st.result.duration = TinCan.Utils.convertMillisecondsToISO8601Duration(this.getDuration());
            st.result.extensions = extensions;

            if (score) {
                try {
                    score = this.validateScore(score);
                }
                catch (ex) {
                    throw new Error("Invalid score - " + ex);
                }

                masteryScore = this.getMasteryScore();
                if (masteryScore !== null && typeof score.scaled !== "undefined") {
                    if (score.scaled >= masteryScore) {
                        throw new Error("Invalid score - scaled score exceeds mastery score (" + score.scaled + " >= " + masteryScore + ")");
                    }

                    st.context.extensions = st.context.extensions || {};
                    st.context.extensions[EXTENSION_MASTERY_SCORE] = masteryScore;
                }

                st.result.score = new TinCan.Score(score);
            }

            st.context.contextActivities.category.push(CATEGORY_ACTIVITY_MOVEON);

            return st;
        },

        /**
            Advanced Usage: retrieve prepared "completed" statement

            Statement methods are provided for users that want to implement
            a queueing like mechansim or something similar where they are expected
            to abide by the AU restrictions on what statements can be sent, etc. on
            their own.

            @method completedStatement
            @param {Object} [extensions] [optional] Object to added to result.extensions
            @return {TinCan.Statement} Completed statement
        */
        completedStatement: function (extensions) {
            this.log("completedStatement");
            var st = this._prepareStatement(VERB_COMPLETED_ID);

            st.result = st.result || new TinCan.Result();
            st.result.completion = true;
            st.result.duration = TinCan.Utils.convertMillisecondsToISO8601Duration(this.getDuration());
            st.result.extensions = extensions;

            st.context.contextActivities.category.push(CATEGORY_ACTIVITY_MOVEON);

            return st;
        },

        /**
            @method _prepareContext
            @private
        */
        _prepareContext: function () {
            //
            // deserializing a string version of the template is slower
            // but gives us cheap cloning capability so that we don't
            // alter the template itself
            //
            var context = JSON.parse(this._contextTemplate);

            context.registration = this._registration;

            if (this._includeSourceActivity) {
                context.contextActivities = context.contextActivities || new TinCan.ContextActivities();
                context.contextActivities.other = context.contextActivities.other || [];
                context.contextActivities.other.push(OTHER_ACTIVITY_CMI5JS);
            }

            return context;
        },

        /**
            @method _prepareStatement
            @private
        */
        _prepareStatement: function (verbId) {
            //
            // statements sent by this lib are "cmi5 defined" statements meaning
            // they have the context category value added
            //
            var st = this.prepareStatement(verbId);

            st.context.contextActivities = st.context.contextActivities || new TinCan.ContextActivities();
            st.context.contextActivities.category = st.context.contextActivities.category || [];
            st.context.contextActivities.category.push(CATEGORY_ACTIVITY_CMI5);

            return st;
        }
    };

    /**
        Turn on debug logging

        @method enableDebug
        @static
        @param {Boolean} [includeTinCan] Whether to enable debug logging from TinCanJS
    */
    Cmi5.enableDebug = function (includeTinCan) {
        Cmi5.DEBUG = true;

        if (includeTinCan) {
            TinCan.enableDebug();
        }
    };

    /**
        Turn off debug logging

        @method disableDebug
        @static
        @param {Boolean} [includeTinCan] Whether to disable debug logging from TinCanJS
    */
    Cmi5.disableDebug = function (includeTinCan) {
        Cmi5.DEBUG = false;

        if (includeTinCan) {
            TinCan.disableDebug();
        }
    };

    //
    // Setup request callback
    //
    requestComplete = function (xhr, cfg, control, callback) {
        this.log("requestComplete: " + control.finished + ", xhr.status: " + xhr.status);
        var requestCompleteResult,
            notFoundOk,
            httpStatus;

        //
        // XDomainRequest doesn't give us a way to get the status,
        // so allow passing in a forged one
        //
        if (typeof xhr.status === "undefined") {
            httpStatus = control.fakeStatus;
        }
        else {
            //
            // older versions of IE don't properly handle 204 status codes
            // so correct when receiving a 1223 to be 204 locally
            // http://stackoverflow.com/questions/10046972/msie-returns-status-code-of-1223-for-ajax-request
            //
            httpStatus = (xhr.status === 1223) ? 204 : xhr.status;
        }

        if (! control.finished) {
            // may be in sync or async mode, using XMLHttpRequest or IE XDomainRequest, onreadystatechange or
            // onload or both might fire depending upon browser, just covering all bases with event hooks and
            // using 'finished' flag to avoid triggering events multiple times
            control.finished = true;

            notFoundOk = (cfg.ignore404 && httpStatus === 404);
            if ((httpStatus >= 200 && httpStatus < 400) || notFoundOk) {
                if (callback) {
                    callback(null, xhr);
                }
                else {
                    requestCompleteResult = {
                        err: null,
                        xhr: xhr
                    };
                    return requestCompleteResult;
                }
            }
            else {
                requestCompleteResult = {
                    err: httpStatus,
                    xhr: xhr
                };
                if (httpStatus === 0) {
                    this.log("[warning] There was a problem communicating with the server. Aborted, offline, or invalid CORS endpoint (" + httpStatus + ")");
                }
                else {
                    this.log("[warning] There was a problem communicating with the server. (" + httpStatus + " | " + xhr.responseText + ")");
                }
                if (callback) {
                    callback(httpStatus, xhr);
                }
                return requestCompleteResult;
            }
        }
        else {
            return requestCompleteResult;
        }
    };

    //
    // one of the two of these is stuffed into the Cmi5 instance where a
    // request is needed which is fetch at the moment
    //
    nativeRequest = function (fullUrl, cfg, callback) {
        this.log("sendRequest using XMLHttpRequest");
        var self = this,
            xhr,
            prop,
            pairs = [],
            data,
            control = {
                finished: false,
                fakeStatus: null
            },
            async,
            fullRequest = fullUrl;

        this.log("sendRequest using XMLHttpRequest - async: " + async);

        cfg = cfg || {};
        cfg.params = cfg.params || {};
        cfg.headers = cfg.headers || {};

        async = typeof callback !== "undefined";

        for (prop in cfg.params) {
            if (cfg.params.hasOwnProperty(prop)) {
                pairs.push(prop + "=" + encodeURIComponent(cfg.params[prop]));
            }
        }
        if (pairs.length > 0) {
            fullRequest += "?" + pairs.join("&");
        }

        xhr = new XMLHttpRequest();

        xhr.open(cfg.method, fullRequest, async);
        for (prop in cfg.headers) {
            if (cfg.headers.hasOwnProperty(prop)) {
                xhr.setRequestHeader(prop, cfg.headers[prop]);
            }
        }

        if (typeof cfg.data !== "undefined") {
            cfg.data += "";
        }
        data = cfg.data;

        if (async) {
            xhr.onreadystatechange = function () {
                self.log("xhr.onreadystatechange - xhr.readyState: " + xhr.readyState);
                if (xhr.readyState === 4) {
                    requestComplete.call(self, xhr, cfg, control, callback);
                }
            };
        }

        //
        // research indicates that IE is known to just throw exceptions
        // on .send and it seems everyone pretty much just ignores them
        // including jQuery (https://github.com/jquery/jquery/blob/1.10.2/src/ajax.js#L549
        // https://github.com/jquery/jquery/blob/1.10.2/src/ajax/xhr.js#L97)
        //
        try {
            xhr.send(data);
        }
        catch (ex) {
            this.log("sendRequest caught send exception: " + ex);
        }

        if (async) {
            return;
        }

        return requestComplete.call(this, xhr, cfg, control);
    };
    xdrRequest = function (fullUrl, cfg, callback) {
        this.log("sendRequest using XDomainRequest");
        var self = this,
            xhr,
            pairs = [],
            data,
            prop,
            until,
            control = {
                finished: false,
                fakeStatus: null
            },
            err;

        cfg = cfg || {};
        cfg.params = cfg.params || {};
        cfg.headers = cfg.headers || {};

        if (typeof cfg.headers["Content-Type"] !== "undefined" && cfg.headers["Content-Type"] !== "application/json") {
            err = new Error("Unsupported content type for IE Mode request");
            if (callback) {
                callback(err, null);
                return null;
            }
            return {
                err: err,
                xhr: null
            };
        }

        for (prop in cfg.params) {
            if (cfg.params.hasOwnProperty(prop)) {
                pairs.push(prop + "=" + encodeURIComponent(cfg.params[prop]));
            }
        }

        if (pairs.length > 0) {
            fullUrl += "?" + pairs.join("&");
        }

        xhr = new XDomainRequest();
        xhr.open("POST", fullUrl);

        if (! callback) {
            xhr.onload = function () {
                control.fakeStatus = 200;
            };
            xhr.onerror = function () {
                control.fakeStatus = 400;
            };
            xhr.ontimeout = function () {
                control.fakeStatus = 0;
            };
        }
        else {
            xhr.onload = function () {
                control.fakeStatus = 200;
                requestComplete.call(self, xhr, cfg, control, callback);
            };
            xhr.onerror = function () {
                control.fakeStatus = 400;
                requestComplete.call(self, xhr, cfg, control, callback);
            };
            xhr.ontimeout = function () {
                control.fakeStatus = 0;
                requestComplete.call(self, xhr, cfg, control, callback);
            };
        }

        //
        // IE likes to randomly abort requests when some handlers
        // aren't defined, so define them with no-ops, see:
        //
        // http://cypressnorth.com/programming/internet-explorer-aborting-ajax-requests-fixed/
        // http://social.msdn.microsoft.com/Forums/ie/en-US/30ef3add-767c-4436-b8a9-f1ca19b4812e/ie9-rtm-xdomainrequest-issued-requests-may-abort-if-all-event-handlers-not-specified
        //
        xhr.onprogress = function () {};
        xhr.timeout = 0;

        //
        // research indicates that IE is known to just throw exceptions
        // on .send and it seems everyone pretty much just ignores them
        // including jQuery (https://github.com/jquery/jquery/blob/1.10.2/src/ajax.js#L549
        // https://github.com/jquery/jquery/blob/1.10.2/src/ajax/xhr.js#L97)
        //
        try {
            xhr.send(data);
        }
        catch (ex) {
            this.log("sendRequest caught send exception: " + ex);
        }

        if (! callback) {
            // synchronous call in IE, with no synchronous mode available
            until = 10000 + Date.now();
            this.log("sendRequest - until: " + until + ", finished: " + control.finished);

            while (Date.now() < until && control.fakeStatus === null) {
                __delay();
            }
            return requestComplete.call(self, xhr, cfg, control);
        }

        return;
    };

    /**
        Non-environment safe method used to create a delay to give impression
        of synchronous response (for IE, shocker)

        @method __delay
        @private
    */
    __delay = function () {
        //
        // use a synchronous request to the current location to allow the browser
        // to yield to the asynchronous request's events but still block in the
        // outer loop to make it seem synchronous to the end user
        //
        // removing this made the while loop too tight to allow the asynchronous
        // events through to get handled so that the response was correctly handled
        //
        var xhr = new XMLHttpRequest(),
            url = window.location + "?forcenocache=" + TinCan.Utils.getUUID();

        xhr.open("GET", url, false);
        xhr.send(null);
    };
}());
