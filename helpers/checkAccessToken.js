const { DateTime } = require("luxon");
const axios = require("axios");
const SpotifyUrl = require("../config/SpotifyUrl");
const User = require("../models/User");

module.exports = async function checkAccessToken(user_id, expiry_period_mins) {
  const subject = await User.findById(user_id);
  if (!subject) {
    throw new Error("check token: user not found");
  }

  if (
    DateTime.local().toString() >
    DateTime.fromJSDate(subject.token_expiry)
      .minus({
        minutes: expiry_period_mins
      })
      .toString()
  ) {
    const params = new URLSearchParams();

    const auth = Buffer.from(
      `${process.env.SPOTIFY_ID}:${process.env.SPOTIFY_SECRET}`
    ).toString("base64");

    let config = {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${auth}`
      }
    };

    params.append("grant_type", "refresh_token");
    params.append("refresh_token", subject.refresh_token);

    const spotifyRes = await axios.post(SpotifyUrl.AUTH, params, config);

    const { access_token, refresh_token, expires_in } = spotifyRes.data;

    subject.token_expiry = DateTime.local()
      .plus({ seconds: expires_in })
      .toISO();
    if (refresh_token) subject.refresh_token = refresh_token;
    subject.access_token = access_token;
    subject.save();
    return access_token;
  }

  return subject.access_token;
};
