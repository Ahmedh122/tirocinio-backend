const axios = require('axios');
const config = require('../../config/config.json');

class Bridge {
  /**
   * Send an HTTP request to an endpoint, based on a remote config.
   * @param {string} url: The URL to send the payload to.
   * @param {'get' | 'post'} method: The HTTP verb.
   * @param {Map<string, string>} headers: The HTTP headers to send.
   * @param {Map<string, string>} payload: The payload to send (query params on GET, body on POST).
   * @returns {Promise<import('axios').AxiosResponse>} The response from axios.
   */
  static async send(url, method, headers, payload) {
    url = this.sanitizeURL(url);
    const httpConfig = {
      url: url,
      method: method,
      headers: headers,
      params: method === 'get' ? payload : undefined,
      body: method === 'post' ? payload : undefined,
    };

    return axios(httpConfig);
  }

  /**
   * This method takes an url and sanitizes it.
   * If the URL does not define a hostname, it assumes 127.0.0.1:{port}.
   *
   * @param {string} url: The URL to sanitize.
   * @returns {string} The sanitized URL.
   */
  static sanitizeURL(url) {
    if (url.startsWith('"') && url.endsWith('"')) {
      url = url.slice(1, -1);
    }

    if (!url.startsWith('http')) {
      if (!url.startsWith('/')) {
        url = `/${url}`;
      }

      url = `http://127.0.0.1:${config.port_api}${url}`;
    }

    console.info('Request URL: %O', url);
    return url;
  }
}

module.exports = {
  Bridge: Bridge,
};
