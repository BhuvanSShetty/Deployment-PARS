import mongoose from "mongoose";

const firstResponderSchema = new mongoose.Schema(
  {
    responderId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["cardiologist", "paramedic", "nurse", "doctor", "bls_trained"],
      required: true,
    },
    skills: { type: [String], default: [] },
    carriesKit: { type: Boolean, default: false },
    currentLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    status: {
      type: String,
      enum: ["available", "responding", "off_duty", "do_not_disturb"],
      default: "available",
    },
    lastLocationUpdate: { type: Date, default: Date.now },
    casesResponded: { type: Number, default: 0 },
    averageResponseAcceptRate: { type: Number, default: 1.0 },
    fcmToken: { type: String }, // For push notifications (simulated)
  },
  { timestamps: true }
);

// 2dsphere index for quick geospatial queries
firstResponderSchema.index({ currentLocation: "2dsphere" });

export default mongoose.model("FirstResponder", firstResponderSchema);
