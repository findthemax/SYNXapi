const mongoose = require("mongoose");
const mongooseUniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const roomSchema = new Schema(
  {
    playlist_uri: {
      type: String,
      required: true
    },
    playlist_name: {
      type: String,
      required: true
    },
    tracks: [
      {
        type: String
      }
    ],
    host: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    host_name: {
      type: String,
      required: true
    },
    host_uri: {
      type: String,
      required: true
    },
    host_image_url: {
      type: String
    },
    host_playing: {
      type: Boolean,
      default: false
    },
    album_cover_url: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true,
    minimize: false
  }
);

roomSchema.plugin(mongooseUniqueValidator);

roomSchema.options.toObject = {
  transform: function(doc, ret, options) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
};

roomSchema.options.toJSON = {
  transform: function(doc, ret, options) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
};

const Room = mongoose.model("Room", roomSchema);

module.exports = Room;
