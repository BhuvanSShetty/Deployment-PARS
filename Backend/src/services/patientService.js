import axios from "axios";
import Patient from "../models/patient.js";
import Incident from "../models/incident.js";
import { selectHospital } from "./hospitalService.js";

// 🔥 Risk Mapping
const mapRiskLevel = (level) => {
    if (level === 1 || level === 2) return "HIGH";
    if (level === 3) return "MEDIUM";
    return "LOW";
};

export const handleVitals = async (data) => {
    try {
        // ✅ Extract vitals safely
        const vitals = data.vitals;

        // 1. Call ML API with REAL VALUES
        let level = 3;
        let score = null;
        const mlBaseUrl = process.env.ML_BASE_URL || "http://localhost:8000";
        const sexValue = (data.sex || "").toLowerCase();
        const mlSex = sexValue.startsWith("m") ? "M" : sexValue.startsWith("f") ? "F" : "M";

        try {
            const mlResponse = await axios.post(
                `${mlBaseUrl}/predict`,
                {
                    age: data.age,
                    sex: mlSex,
                    systolic_bp: vitals.systolicBP,
                    diastolic_bp: vitals.diastolicBP,
                    heart_rate: vitals.heartRate,
                    respiratory_rate: vitals.respiratoryRate,
                    temperature: vitals.temperature,
                    spo2: vitals.spo2,
                    pain_score: vitals.painScore
                },
                { timeout: 3000 }
            );

            const predictedLevel = Number(mlResponse.data?.predicted_esi_level);
            if (Number.isFinite(predictedLevel)) {
                level = predictedLevel;
            }
        } catch (mlError) {
            console.warn("ML service unavailable, using default risk.");
        }

        // 2. Map Risk
        const category = mapRiskLevel(level);

        const incident = data.incidentId
            ? await Incident.findById(data.incidentId).populate("assignedAmbulance")
            : null;

        const hospitalSelection = incident
            ? await selectHospital({ incidentLocation: incident.location, riskLevel: level, limit: 3 })
            : null;

        const hospitalId = hospitalSelection?.hospital?._id || null;
        const ambulanceId = data.ambulanceId || incident?.assignedAmbulance?._id || null;

        // 3. Save to DB with proper schema structure
        const createdPatient = await Patient.create({
            name: data.name || incident?.patientName,
            age: data.age,
            sex: data.sex,
            knownConditions: data.knownConditions || {
                hypertension: false,
                diabetes: false,
                cardiacHistory: false
            },
            symptoms: data.symptoms || [],
            vitals: {
                systolicBP: vitals.systolicBP,
                diastolicBP: vitals.diastolicBP,
                heartRate: vitals.heartRate,
                respiratoryRate: vitals.respiratoryRate,
                temperature: vitals.temperature,
                painScore: vitals.painScore,
                spo2: vitals.spo2,
                recordedAt: new Date()
            },
            dataSource: data.dataSource || "manual",
            riskPrediction: {
                level,
                score,
                category
            },
            ambulance: ambulanceId,
            incident: incident?._id || null,
            hospital: hospitalId,
            paramedicNotes: data.paramedicNotes || "",
            alertSent: false
        });

        const patient = await Patient.findById(createdPatient._id)
            .populate("ambulance")
            .populate("hospital")
            .populate("incident");

        if (incident) {
            incident.patient = patient._id;
            if (hospitalId) {
                incident.assignedHospital = hospitalId;
            }
            if (hospitalSelection?.options?.length) {
                incident.hospitalOptions = hospitalSelection.options.map((option) => ({
                    hospital: option.hospital?._id,
                    distanceKm: option.distanceKm,
                    score: option.score,
                    reason: option.reason
                }));
            }
            incident.status = "transporting";
            await incident.save();
        }

        if (!patient.alertSent) {
            patient.alertSent = true;
            await patient.save();
        }

        return patient;

    } catch (error) {
        console.error("Error handling vitals:", error.message);
        throw error;
    }
};