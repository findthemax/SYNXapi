const express = require("express");
const router = express.Router();
const axios = require("axios");
const checkAccessToken = require("../helpers/checkAccessToken");

const { check, validationResult } = require("express-validator");

const auth = require("../middleware/auth");

//Models
const Room = require("../models/Room");

//Working out server lag
axios.interceptors.request.use(
  function(config) {
    config.metadata = { startTime: new Date() };
    return config;
  },
  function(error) {
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  function(response) {
    response.config.metadata.endTime = new Date();
    response.config.metadata.duration =
      response.config.metadata.endTime - response.config.metadata.startTime;
    return response;
  },
  function(error) {
    error.config.metadata.endTime = new Date();
    error.config.metadata.duration =
      error.config.metadata.endTime - error.config.metadata.startTime;
    return Promise.reject(error);
  }
);

//  @route  POST room/play
//  @desc   Play a track
//  @req    Room_id
//  access  Need a bearer token

router.post("/play", auth, async (req, res) => {
  try {
    let room = await Room.findById(req.user.room);

    if (!room) {
      req.user.room = null;
      //update the user in the app
      return res.status(404).json({
        errors: [
          {
            msg: "No room found",
            type: "server"
          }
        ]
      });
    }

    if (room.host.toString() !== req.user.id.toString()) {
      req.user.room = null;
      //update the user in the app
      return res.status(403).json({
        errors: [
          {
            msg: "You are not the host",
            type: "server"
          }
        ]
      });
    }

    let data = {
      state: false
    };

    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${req.user.access_token}`
    };
    await axios.put(
      "https://api.spotify.com/v1/me/player/shuffle?state=false",
      data,
      {
        headers
      }
    );

    data = {
      uris: room.tracks
    };

    await axios.put("https://api.spotify.com/v1/me/player/play", data, {
      headers
    });

    room.host_playing = true;
    await room.save();

    return res
      .status(200)
      .json({ room, access: { access_token: req.user.access_token } });
  } catch (err) {
    console.log("Play Error", err.message);
    // console.error("Error Info: ", err.response.data);
    res.status(500).send(`Server error`);
  }
});

//  @route  POST room/synx
//  @desc   synx a user
//  @req    synx_level
//  access  Need a bearer token

router.post(
  "/synx",
  [
    auth,
    [
      check("level")
        .optional()
        .isNumeric()
        .withMessage("please provide a synx level")
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.errors });
    }

    const { level } = req.body;

    try {
      let room = await Room.findById(req.user.room);

      if (!room) {
        req.user.room = null;
        //update the user in the app
        return res.status(404).json({
          errors: [
            {
              msg: "No room found",
              type: "server"
            }
          ]
        });
      }

      const hostAccessToken = await checkAccessToken(room.host, 5);

      let headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${hostAccessToken}`
      };

      const hostPlayback = await axios.get(
        "https://api.spotify.com/v1/me/player/",
        { headers }
      );

      const { is_playing, context, shuffle_state } = hostPlayback.data;

      if (shuffle_state) {
        //update the user in the app
        return res.status(404).json({
          errors: [
            {
              msg: "Host has shuffle on their spotify",
              type: "server"
            }
          ]
        });
      }

      let plTracks = [...room.tracks];

      const trackIndex = plTracks.indexOf(hostPlayback.data.item.uri);

      if (!is_playing || trackIndex === -1) {
        //handle the host not playing
        room.host_playing = false;
        await room.save();
      } else {
        //host is playing
        room.host_playing = true;
        const uris = plTracks.slice(trackIndex);

        headers = {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${req.user.access_token}`
        };

        // const timeQuan = 0;

        const synxLevel = level * 100;

        const data = {
          uris,
          position_ms: hostPlayback.data.progress_ms - synxLevel
        };

        await axios.put("https://api.spotify.com/v1/me/player/play", data, {
          headers
        });
      }

      return res
        .status(200)
        .json({ room, access: { access_token: req.user.access_token } });
    } catch (err) {
      console.log(err.message);
      console.error("Error Info: ", err.response.data);
      res.status(500).send(`Server error`);
    }
  }
);

module.exports = router;
