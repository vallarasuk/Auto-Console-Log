const vscode = require("vscode");
const https = require("https");

/**
 * ExtPay for VS Code
 * A port of ExtensionPay.com library for VS Code extensions.
 */
class ExtPay {
  constructor(extensionId) {
    this.extensionId = extensionId;
    this.host = "https://extensionpay.com";
    this.extensionUrl = `${this.host}/extension/${extensionId}`;
    this.context = null;
  }

  /**
   * Initialize storage context. Must be called in activate().
   * @param {vscode.ExtensionContext} context
   */
  startBackground(context) {
    this.context = context;
    // Initialize installed_at if not present
    const installedAt = this.context.globalState.get(
      "extensionpay_installed_at",
    );
    if (!installedAt) {
      this.context.globalState.update(
        "extensionpay_installed_at",
        new Date().toISOString(),
      );
    }
  }

  /**
   * Get user status.
   * @returns {Promise<{paid: boolean, paidAt: Date|null, installedAt: Date, trialStartedAt: Date|null}>}
   */
  async getUser() {
    if (!this.context) {
      throw new Error(
        "ExtPay: startBackground(context) must be called before using user data.",
      );
    }

    const apiKey = await this.getApiKey();
    if (!apiKey) {
      const installedAtStr = this.context.globalState.get(
        "extensionpay_installed_at",
      );
      return {
        paid: false,
        paidAt: null,
        installedAt: installedAtStr ? new Date(installedAtStr) : new Date(),
        trialStartedAt: null,
      };
    }

    // Fetch user from API
    try {
      const userData = await this.fetchUserFromApi(apiKey);
      await this.context.globalState.update("extensionpay_user", userData);
      return this.parseUser(userData);
    } catch (error) {
      // Fallback to cached user
      const cachedUser = this.context.globalState.get("extensionpay_user");
      if (cachedUser) {
        return this.parseUser(cachedUser);
      }
      throw error;
    }
  }

  async openPaymentPage() {
    const apiKey = await this.getApiKey();
    const url = `${this.extensionUrl}/choose-plan?api_key=${apiKey}`;
    vscode.env.openExternal(vscode.Uri.parse(url));
  }

  // --- Private Helpers ---

  async getApiKey() {
    let apiKey = this.context.globalState.get("extensionpay_api_key");
    if (!apiKey) {
      apiKey = await this.createKey();
      if (apiKey) {
        await this.context.globalState.update("extensionpay_api_key", apiKey);
      }
    }
    return apiKey;
  }

  async createKey() {
    const body = {};
    if (this.context.extensionMode === vscode.ExtensionMode.Development) {
      body.development = true;
    }

    return this.request("/api/new-key", "POST", body);
  }

  async fetchUserFromApi(apiKey) {
    return this.request(`/api/v2/user?api_key=${apiKey}`, "GET");
  }

  parseUser(userData) {
    const installedAtStr = this.context.globalState.get(
      "extensionpay_installed_at",
    );
    return {
      paid: userData.paid,
      paidAt: userData.paidAt ? new Date(userData.paidAt) : null,
      installedAt: installedAtStr ? new Date(installedAtStr) : new Date(),
      trialStartedAt: userData.trialStartedAt
        ? new Date(userData.trialStartedAt)
        : null,
    };
  }

  async request(path, method, body) {
    return new Promise((resolve, reject) => {
      const url = `${this.host}${path}`;
      const options = {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      };

      const req = https.request(url, options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve(data); // In case it's just a string, like api key sometimes? No, API usually returns JSON
            }
          } else {
            reject(
              new Error(`ExtPay Request Failed: ${res.statusCode} ${data}`),
            );
          }
        });
      });

      req.on("error", (e) => reject(e));

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }
}

module.exports = (id) => new ExtPay(id);
