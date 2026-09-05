const axios = require('axios');
const config = require('../config');


class TokenManager {
  constructor() {
    this.token = null;
    this.expiresAtMs = 0;
    this.fintech = null; // { name, email, bankCode, bankName }
    this.inFlight = null; // dedupe concurrent refreshes
  }

  async getToken() {
    const bufferMs = 60 * 1000; // refresh 60s before actual expiry
    if (this.token && Date.now() < this.expiresAtMs - bufferMs) {
      return this.token;
    }

    if (!this.inFlight) {
      this.inFlight = this._login().finally(() => {
        this.inFlight = null;
      });
    }
    return this.inFlight;
  }

  async _login() {
    if (!config.nibss.apiKey || !config.nibss.apiSecret) {
      throw new Error(
        'FINTECH_API_KEY / FINTECH_API_SECRET are not set. Run `npm run onboard-fintech` first, ' +
          'then copy the returned apiKey/apiSecret into your .env file.'
      );
    }

    const response = await axios.post(`${config.nibss.baseUrl}/api/auth/token`, {
      apiKey: config.nibss.apiKey,
      apiSecret: config.nibss.apiSecret,
    });

    const { token, fintech } = response.data;
    this.token = token;
    this.fintech = fintech;

    
    const payload = decodeJwtPayload(token);
    this.expiresAtMs = payload?.exp ? payload.exp * 1000 : Date.now() + 55 * 60 * 1000;

    return this.token;
  }

  getBankInfo() {
    return this.fintech;
  }
}

function decodeJwtPayload(jwt) {
  try {
    const payloadSegment = jwt.split('.')[1];
    const json = Buffer.from(payloadSegment, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (err) {
    return null;
  }
}

module.exports = new TokenManager();
