import mongoose from "mongoose";

const hospitalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, default: "" },
    },
    capabilities: {
      trauma: { type: Boolean, default: false },
      cardiac: { type: Boolean, default: false },
      pediatric: { type: Boolean, default: false },
      neurology: { type: Boolean, default: false },
      icu: { type: Boolean, default: true },
    },
    level: {
      type: Number,
      min: 1,
      max: 5,
    },
    capacity: {
      erBeds: { type: Number, default: 20 },
      icuBeds: { type: Number, default: 6 },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Hospital", hospitalSchema);
