const express = require("express");
const router = express.Router();
const axios = require("axios");
const checkAccessToken = require("../helpers/checkAccessToken");

const { check, validationResult } = require("express-validator");

const SpotifyUrl = require("../config/SpotifyUrl");

const auth = require("../middleware/auth");

//Models
const Room = require("../models/Room");
const User = require("../models/User");

//  @route  POST room
//  @desc   Create a Room
//  @req
//  access  Need a bearer token

router.post(
  "/",
  [
    auth,
    [
      check("playlist_uri")
        .not()
        .isEmpty()
        .withMessage("Please provide a playlist"),
      check("shuffle")
        .not()
        .isEmpty()
        .withMessage("Please provide a shuffle state")
        .toBoolean()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.errors });
    }

    let { playlist_uri, shuffle } = req.body;

    try {
      const headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${req.user.access_token}`
      };

      const playlist_id = playlist_uri.replace("spotify:playlist:", "");

      const spotifyRes = await axios.get(
        `${SpotifyUrl.PLAYLIST}/${playlist_id}`,
        {
          headers
        }
      );

      const tracks = spotifyRes.data.tracks.items;
      let trackArray = tracks.map(track => track.track.uri);

      function shuffleArray(array) {
        var currentIndex = array.length,
          temporaryValue,
          randomIndex;

        // While there remain elements to shuffle...
        while (0 !== currentIndex) {
          // Pick a remaining element...
          randomIndex = Math.floor(Math.random() * currentIndex);
          currentIndex -= 1;

          // And swap it with the current element.
          temporaryValue = array[currentIndex];
          array[currentIndex] = array[randomIndex];
          array[randomIndex] = temporaryValue;
        }

        return array;
      }
      if (shuffle) {
        trackArray = shuffleArray(trackArray);
      }

      const room = new Room({
        playlist_uri,
        tracks: trackArray,
        host: req.user._id,
        host_uri: req.user.spotify_uri,
        playlist_name: spotifyRes.data.name,
        album_cover_url: spotifyRes.data.images[0].url,
        host_image_url: req.user.spotify_image,
        host_name: req.user.name
      });

      await room.save();
      req.user.room = room;
      req.user.save();

      return res
        .status(200)
        .json({
          user: req.user,
          access: { access_token: req.user.access_token }
        });
    } catch (err) {
      console.log(err.message);
      // console.error("Error Info: ", err.response.data);
      res.status(500).send(`Server error`);
    }
  }
);

//  @route  POST room/join
//  @desc   Join a room
//  @req
//  access  Need a bearer token

router.post(
  "/join",
  [
    auth,
    [
      check("room_id")
        .not()
        .isEmpty()
        .withMessage("Please provide a room")
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.errors });
    }

    const { room_id } = req.body;

    try {
      const room = await Room.findById(room_id);

      if (!room) {
        return res.status(404).json({
          errors: [
            {
              msg: "That room hasn't been found. Please try again",
              type: "server"
            }
          ]
        });
      }

      req.user.room = room;
      req.user.save();

      return res.status(200).json({
        user: req.user,
        access: { access_token: req.user.access_token }
      });
    } catch (err) {
      console.log(err.message);
      // console.error("Error Info: ", err.response.data);
      res.status(500).send(`Server error`);
    }
  }
);

//  @route  DELETE room
//  @desc   Leave a room
//  @req
//  access  Need a bearer token

router.delete("/", auth, async (req, res) => {
  try {
    const room = await Room.findById(req.user.room);

    if (room) {
      if (room.host.toString() === req.user._id.toString()) {
        //user is host
        const guests = await User.find({ room: room.id });
        await room.remove();
        await User.updateMany({ room: room.id }, { room: null });

        for (let index = 0; index < guests.length; index++) {
          const user = guests[index];
          const accessToken = await checkAccessToken(user._id, 1);
          const headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Bearer ${accessToken}`
          };

          const spotRes = await axios.get(
            "https://api.spotify.com/v1/me/player",
            {
              headers
            }
          );

          if (spotRes.data) {
            if (spotRes.data.is_playing) {
              await axios.put(
                "https://api.spotify.com/v1/me/player/pause",
                {},
                {
                  headers
                }
              );
            }
          }
        }
      } else {
        const headers = {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${req.user.access_token}`
        };

        const spotRes = await axios.get(
          "https://api.spotify.com/v1/me/player",
          {
            headers
          }
        );

        if (spotRes.data) {
          if (spotRes.data.is_playing) {
            await axios.put(
              "https://api.spotify.com/v1/me/player/pause",
              {},
              {
                headers
              }
            );
          }
        }
        req.user.room = null;
        req.user.save();
      }
    }

    return res.status(200).json({
      user: req.user,
      access: { access_token: req.user.access_token }
    });
  } catch (err) {
    console.log(err.message);
    // console.error("Error Info: ", err.response.data);
    res.status(500).send(`Server error`);
  }
});

//  @route  GET room
//  @desc   Get info for a Room - if user is not in the room it will reset their room on the user object
//  @req    Room_id
//  access  Need a bearer token

router.get("/", auth, async (req, res) => {
  try {
    return res.status(200).json({ user: req.user });
  } catch (err) {
    console.log(err.message);
    // console.error("Error Info: ", err.response.data);
    res.status(500).send(`Server error`);
  }
});
module.exports = router;
