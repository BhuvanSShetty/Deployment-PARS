import axios from "axios";
import Patient from "../models/patient.js";
import Incident from "../models/incident.js";
import { calculateDistanceKm, estimateEtaMinutes } from "../utils/geoUtils.js";

const ACTIVE_STATUSES = ["dispatched", "en_route", "on_scene", "transporting"];

const mapRiskLevel = (level) => {
  if (level === 1 || level === 2) return "HIGH";
  if (level === 3) return "MEDIUM";
  return "LOW";
};

const normalizeSex = (sex) => {
  const sexValue = (sex || "").toLowerCase();
  if (sexValue.startsWith("m")) return "M";
  if (sexValue.startsWith("f")) return "F";
  return "M";
};

export const recalculateRiskScores = async () => {
  const mlBaseUrl = process.env.ML_BASE_URL || "http://localhost:8000";

  const patients = await Patient.find({ incident: { $ne: null } })
    .populate({
      path: "incident",
      match: { status: { $in: ACTIVE_STATUSES } },
    })
    .lean();

  const activePatients = patients.filter((patient) => patient.incident);

  for (const patient of activePatients) {
    const vitals = patient.vitals || {};
    if (!vitals.systolicBP || !vitals.diastolicBP || !vitals.heartRate) {
      continue;
    }

    let level = patient.riskPrediction?.level || 3;
    let score = null;

    try {
      const mlResponse = await axios.post(
        `${mlBaseUrl}/predict`,
        {
          age: patient.age,
          sex: normalizeSex(patient.sex),
          systolic_bp: vitals.systolicBP,
          diastolic_bp: vitals.diastolicBP,
          heart_rate: vitals.heartRate,
          respiratory_rate: vitals.respiratoryRate,
          temperature: vitals.temperature,
          spo2: vitals.spo2,
          pain_score: vitals.painScore,
        },
        { timeout: 3000 }
      );

      const predictedLevel = Number(mlResponse.data?.predicted_esi_level);
      if (Number.isFinite(predictedLevel)) {
        level = predictedLevel;
      }
    } catch (error) {
      continue;
    }

    const category = mapRiskLevel(level);

    await Patient.updateOne(
      { _id: patient._id },
      {
        $set: {
          "riskPrediction.level": level,
          "riskPrediction.score": score,
          "riskPrediction.category": category,
        },
      }
    );
  }
};

export const updateIncidentEtas = async () => {
  const incidents = await Incident.find({
    status: { $in: ACTIVE_STATUSES },
    assignedAmbulance: { $ne: null },
    assignedHospital: { $ne: null },
  })
    .populate("assignedAmbulance")
    .populate("assignedHospital")
    .lean();

  for (const incident of incidents) {
    const ambulance = incident.assignedAmbulance;
    const hospital = incident.assignedHospital;

    if (!ambulance?.currentLocation?.lat || !ambulance?.currentLocation?.lng) {
      continue;
    }

    if (!hospital?.location?.lat || !hospital?.location?.lng) {
      continue;
    }

    const distance = calculateDistanceKm(
      ambulance.currentLocation.lat,
      ambulance.currentLocation.lng,
      hospital.location.lat,
      hospital.location.lng
    );

    const etaMinutes = estimateEtaMinutes(distance);

    await Incident.updateOne(
      { _id: incident._id },
      { $set: { etaMinutes, etaUpdatedAt: new Date() } }
    );
  }
};
