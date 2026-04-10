import mongoose from "mongoose";

const incidentSchema = new mongoose.Schema(
  {
    patientName: { type: String, trim: true },
    patientAge: { type: Number, min: 0, max: 120 },
    patientSex: { type: String, enum: ["Male", "Female", "Other"] },
    callerPhone: { type: String, trim: true },
    chiefComplaint: { type: String, required: true, trim: true },
    symptoms: { type: [String], default: [] },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, default: "" },
    },
    priority: {
      type: String,
      enum: ["HIGH", "MEDIUM", "LOW"],
      default: "MEDIUM",
    },
    ambulanceType: {
      type: String,
      enum: ["ALS", "BLS"],
      default: "BLS",
    },
    status: {
      type: String,
      enum: [
        "new",
        "dispatched",
        "en_route",
        "on_scene",
        "transporting",
        "at_hospital",
        "closed",
      ],
      default: "new",
    },
    assignedAmbulance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ambulance",
    },
    assignedHospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
    },
    hospitalOptions: [
      {
        hospital: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Hospital",
        },
        distanceKm: { type: Number },
        score: { type: Number },
        reason: { type: String },
      },
    ],
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
    },
    dispatcherNotes: { type: String, default: "" },
    etaMinutes: { type: Number },
    etaUpdatedAt: { type: Date },
    firstRespondersPinged: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FirstResponder",
      },
    ],
    firstResponderAssigned: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FirstResponder",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Incident", incidentSchema);
